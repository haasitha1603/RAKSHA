import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { reportRateLimiter } from '../middleware/rateLimit.js';
import {
  createReportSchema,
  voteReportSchema,
  ReportRow,
} from '@raksha/shared';
import { classifyReportText } from '../engine/classify.js';
import { computeReportConfidence } from '../engine/reportConfidence.js';
import { emitToRoom } from '../sockets/index.js';
import { haversineDistance } from '../db/geo.js';

export const reportsRouter = Router();

function hashReporter(userId: string): string {
  return crypto.createHash('sha256').update(`${userId}:raksha_salt_2026`).digest('hex').substring(0, 16);
}

reportsRouter.get('/reports', (req: Request, res: Response) => {
  const category = req.query.category as string;
  const sinceDays = req.query.sinceDays ? parseInt(req.query.sinceDays as string) : 30;
  const cutoff = new Date(Date.now() - sinceDays * 86400000).toISOString();

  let query = `
    SELECT * FROM reports
    WHERE status != 'removed' AND status != 'expired' AND datetime(created_at) >= datetime(?)
  `;
  const params: any[] = [cutoff];

  if (category && category !== 'all') {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ` ORDER BY created_at DESC LIMIT 100`;

  const reports = db.prepare(query).all(...params);
  res.json({ reports });
});

reportsRouter.post('/reports/classify', (req: Request, res: Response) => {
  const text = (req.body.text as string) || '';
  const result = classifyReportText(text);
  res.json(result);
});

reportsRouter.post(
  '/reports',
  requireAuth,
  reportRateLimiter,
  validateBody(createReportSchema),
  (req: AuthRequest, res: Response) => {
    const { category, severity, text, lat, lng } = req.body;
    const user = req.user!;
    const reporterHash = hashReporter(user.id);
    const nowIso = new Date().toISOString();

    // Data minimisation: Round coordinates to 4 decimals (~11m resolution)
    const roundedLat = Number(lat.toFixed(4));
    const roundedLng = Number(lng.toFixed(4));

    // Duplicate suppression: no second report within 100m and 30min by the same user
    const thirtyMinAgo = new Date(Date.now() - 30 * 60000).toISOString();
    const recentReports = db.prepare(`
      SELECT lat, lng FROM reports
      WHERE reporter_hash = ? AND datetime(created_at) >= datetime(?)
    `).all(reporterHash, thirtyMinAgo) as Array<{ lat: number; lng: number }>;

    for (const r of recentReports) {
      if (haversineDistance(roundedLat, roundedLng, r.lat, r.lng) < 100) {
        res.status(429).json({
          error: {
            code: 'DUPLICATE_REPORT_SUPPRESSED',
            message: 'You have already submitted a report near this location in the last 30 minutes.',
          },
        });
        return;
      }
    }

    const reportId = `rep_${nanoid(10)}`;
    const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();

    const tempReport: ReportRow = {
      id: reportId,
      reporter_hash: reporterHash,
      category,
      severity,
      text: text.trim(),
      lat: roundedLat,
      lng: roundedLng,
      created_at: nowIso,
      expires_at: expiresAt,
      confirmations: 0,
      denials: 0,
      flags: 0,
      confidence: 0.25,
      status: 'unverified',
      is_demo: 0,
    };

    const initialConf = computeReportConfidence(tempReport);

    db.prepare(`
      INSERT INTO reports (
        id, reporter_hash, category, severity, text, lat, lng,
        created_at, expires_at, confirmations, denials, flags, confidence, status, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, 0)
    `).run(
      reportId,
      reporterHash,
      category,
      severity,
      text.trim(),
      roundedLat,
      roundedLng,
      nowIso,
      expiresAt,
      initialConf.confidence,
      initialConf.status
    );

    const created = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId);

    emitToRoom('reports', 'report:new', created);

    res.status(201).json({ report: created });
  }
);

reportsRouter.post(
  '/reports/:id/vote',
  requireAuth,
  validateBody(voteReportSchema),
  (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { vote } = req.body;
    const user = req.user!;
    const voterHash = hashReporter(user.id);
    const nowIso = new Date().toISOString();

    const report = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id) as ReportRow | undefined;
    if (!report) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
      return;
    }

    // Reporter cannot vote on own report
    if (report.reporter_hash === voterHash) {
      res.status(403).json({ error: { code: 'SELF_VOTE_BLOCKED', message: 'You cannot vote on your own report' } });
      return;
    }

    // Insert or replace vote
    const existingVote = db.prepare(`
      SELECT vote FROM report_votes WHERE report_id = ? AND voter_hash = ?
    `).get(id, voterHash) as { vote: string } | undefined;

    if (existingVote) {
      if (existingVote.vote === vote) {
        res.json({ success: true, message: 'Vote already recorded.' });
        return;
      }
      db.prepare(`UPDATE report_votes SET vote = ? WHERE report_id = ? AND voter_hash = ?`).run(vote, id, voterHash);
    } else {
      db.prepare(`
        INSERT INTO report_votes (id, report_id, voter_hash, vote, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(`vote_${nanoid(8)}`, id, voterHash, vote, nowIso);
    }

    // Recalculate totals
    const counts = db.prepare(`
      SELECT
        SUM(CASE WHEN vote = 'confirm' THEN 1 ELSE 0 END) as conf,
        SUM(CASE WHEN vote = 'deny' THEN 1 ELSE 0 END) as den
      FROM report_votes WHERE report_id = ?
    `).get(id) as any;

    report.confirmations = counts.conf || 0;
    report.denials = counts.den || 0;

    const confResult = computeReportConfidence(report);

    db.prepare(`
      UPDATE reports SET
        confirmations = ?, denials = ?, confidence = ?, status = ?
      WHERE id = ?
    `).run(report.confirmations, report.denials, confResult.confidence, confResult.status, id);

    res.json({
      success: true,
      confirmations: report.confirmations,
      denials: report.denials,
      confidence: confResult.confidence,
      status: confResult.status,
    });
  }
);

reportsRouter.post('/reports/:id/flag', requireAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const report = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id) as ReportRow | undefined;
  if (!report) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    return;
  }

  db.prepare(`UPDATE reports SET flags = flags + 1 WHERE id = ?`).run(id);
  report.flags += 1;

  const confResult = computeReportConfidence(report);
  db.prepare(`UPDATE reports SET confidence = ?, status = ? WHERE id = ?`).run(confResult.confidence, confResult.status, id);

  res.json({ success: true, flags: report.flags });
});
