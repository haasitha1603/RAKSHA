import { Router, Response } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createFakeCallSchema, FakeCallRow } from '@raksha/shared';

export const fakeCallsRouter = Router();

fakeCallsRouter.get('/fake-calls', requireAuth, async (req: AuthRequest, res: Response) => {
  const calls = await db.prepare(`
    SELECT * FROM fake_calls WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user!.id);
  res.json({ calls });
});

fakeCallsRouter.post(
  '/fake-calls',
  requireAuth,
  validateBody(createFakeCallSchema),
  async (req: AuthRequest, res: Response) => {
    const {
      callerName,
      callerNumber,
      avatarColor,
      ringtone,
      uiStyle,
      scriptJson,
      useRecording,
      scheduledFor,
      ringSeconds,
      notifyGuardian,
    } = req.body;

    const id = `fc_${nanoid(10)}`;
    const nowIso = new Date().toISOString();

    await db.prepare(`
      INSERT INTO fake_calls (
        id, user_id, caller_name, caller_number, avatar_color, ringtone,
        ui_style, script_json, use_recording, scheduled_for, ring_seconds,
        notify_guardian, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).run(
      id,
      req.user!.id,
      callerName.trim(),
      callerNumber.trim(),
      avatarColor || '#4338CA',
      ringtone || 'classic',
      uiStyle || 'classic',
      scriptJson,
      useRecording ? 1 : 0,
      scheduledFor,
      ringSeconds || 30,
      notifyGuardian ? 1 : 0,
      nowIso
    );

    const call = await db.prepare(`SELECT * FROM fake_calls WHERE id = ?`).get(id);
    res.status(201).json({ call });
  }
);

fakeCallsRouter.patch('/fake-calls/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const call = await db.prepare(`SELECT * FROM fake_calls WHERE id = ? AND user_id = ?`).get(req.params.id, req.user!.id);
  if (!call) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Fake call not found' } });
    return;
  }

  const { scheduledFor, callerName, callerNumber, ringtone, scriptJson } = req.body;

  await db.prepare(`
    UPDATE fake_calls SET
      scheduled_for = COALESCE(?, scheduled_for),
      caller_name = COALESCE(?, caller_name),
      caller_number = COALESCE(?, caller_number),
      ringtone = COALESCE(?, ringtone),
      script_json = COALESCE(?, script_json)
    WHERE id = ?
  `).run(scheduledFor ?? null, callerName ?? null, callerNumber ?? null, ringtone ?? null, scriptJson ?? null, req.params.id);

  res.json({ success: true });
});

fakeCallsRouter.delete('/fake-calls/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  await db.prepare(`DELETE FROM fake_calls WHERE id = ? AND user_id = ?`).run(req.params.id, req.user!.id);
  res.json({ success: true });
});

fakeCallsRouter.post('/fake-calls/:id/arm', requireAuth, async (req: AuthRequest, res: Response) => {
  const call = (await db.prepare(`
    SELECT * FROM fake_calls WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user!.id)) as FakeCallRow | undefined;

  if (!call) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Fake call not found' } });
    return;
  }

  await db.prepare(`UPDATE fake_calls SET status = 'armed' WHERE id = ?`).run(call.id);
  res.json({ success: true, status: 'armed' });
});

fakeCallsRouter.post('/fake-calls/:id/trigger-now', requireAuth, async (req: AuthRequest, res: Response) => {
  const call = (await db.prepare(`
    SELECT * FROM fake_calls WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user!.id)) as FakeCallRow | undefined;

  if (!call) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Fake call not found' } });
    return;
  }

  const inFiveSec = new Date(Date.now() + 5000).toISOString();
  await db.prepare(`UPDATE fake_calls SET status = 'armed', scheduled_for = ? WHERE id = ?`).run(inFiveSec, call.id);

  res.json({ success: true, ringingInSeconds: 5, scheduledFor: inFiveSec });
});

fakeCallsRouter.post('/fake-calls/:id/result', requireAuth, async (req: AuthRequest, res: Response) => {
  const { result } = req.body; // answered | declined | missed
  await db.prepare(`UPDATE fake_calls SET status = ? WHERE id = ? AND user_id = ?`).run(result, req.params.id, req.user!.id);
  res.json({ success: true });
});
