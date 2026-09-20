import { db } from '../db/index.js';
import { haversineDistance } from '../db/geo.js';
import {
  ReportRow,
  ReportStatus,
  REPORT_HALF_LIVES_DAYS,
  REPORT_HARD_EXPIRY_HOURS,
} from '@raksha/shared';

export function computeReportConfidence(report: ReportRow): {
  confidence: number;
  status: ReportStatus;
  isExpired: boolean;
} {
  const base = 0.25;

  // Corroboration: distinct other reporters within 150m in last 7 days, same/related category
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const nearbyOtherReports = db.prepare(`
    SELECT DISTINCT reporter_hash, category, lat, lng FROM reports
    WHERE id != ? AND reporter_hash != ? AND datetime(created_at) >= datetime(?)
  `).all(report.id, report.reporter_hash, sevenDaysAgo) as Array<{
    reporter_hash: string;
    category: string;
    lat: number;
    lng: number;
  }>;

  const corroboratingCount = nearbyOtherReports.filter((r) => {
    const dist = haversineDistance(report.lat, report.lng, r.lat, r.lng);
    return dist <= 150 && (r.category === report.category || r.category === 'other');
  }).length;

  const corroboration = 0.15 * Math.min(4, corroboratingCount);

  // Votes
  const votes = 0.10 * Math.min(3, report.confirmations) - 0.20 * Math.min(3, report.denials);

  // Flag penalty
  const flagPenalty = 0.10 * Math.min(3, report.flags);

  // Raw score
  const raw = Math.max(0, Math.min(1, base + corroboration + votes - flagPenalty));

  // Exponential decay
  const ageMs = Math.max(0, Date.now() - new Date(report.created_at).getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const ageHours = ageMs / (1000 * 60 * 60);

  const halfLifeDays = REPORT_HALF_LIVES_DAYS[report.category] ?? 14;
  const decay = Math.exp(-ageDays / halfLifeDays);

  const confidence = Number((raw * decay).toFixed(3));

  // Hard expiry rules
  const hardExpiryHours = REPORT_HARD_EXPIRY_HOURS[report.category] ?? 720;
  const isExpired = ageHours >= hardExpiryHours || confidence < 0.08;

  let status: ReportStatus = 'unverified';
  if (isExpired) {
    status = 'expired';
  } else if (confidence >= 0.65) {
    status = 'verified';
  } else if (confidence >= 0.35) {
    status = 'likely';
  }

  return { confidence, status, isExpired };
}

export function recomputeAllReports(): void {
  const activeReports = db.prepare(`
    SELECT * FROM reports WHERE status NOT IN ('expired', 'removed')
  `).all() as ReportRow[];

  const updateStmt = db.prepare(`
    UPDATE reports SET confidence = ?, status = ? WHERE id = ?
  `);

  for (const rep of activeReports) {
    const result = computeReportConfidence(rep);
    updateStmt.run(result.confidence, result.status, rep.id);
  }
}
