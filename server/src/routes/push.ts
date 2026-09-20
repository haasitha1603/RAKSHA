import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { pushSubscribeSchema } from '@raksha/shared';

export const pushRouter = Router();

pushRouter.get('/push/public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: config.VAPID_PUBLIC_KEY || '' });
});

pushRouter.post(
  '/push/subscribe',
  requireAuth,
  validateBody(pushSubscribeSchema),
  async (req: AuthRequest, res: Response) => {
    const { endpoint, keys } = req.body;
    const user = req.user!;
    const nowIso = new Date().toISOString();

    await db.prepare(`
      INSERT INTO push_subscriptions (id, owner_type, owner_id, endpoint, keys_json, created_at)
      VALUES (?, 'user', ?, ?, ?, ?)
      ON CONFLICT (endpoint) DO UPDATE SET owner_type = EXCLUDED.owner_type,
        owner_id = EXCLUDED.owner_id, keys_json = EXCLUDED.keys_json, created_at = EXCLUDED.created_at
    `).run(`ps_${nanoid(8)}`, user.id, endpoint, JSON.stringify(keys), nowIso);

    res.json({ success: true });
  }
);

pushRouter.delete('/push/subscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;
  if (endpoint) {
    await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ? AND owner_id = ?`).run(endpoint, req.user!.id);
  }
  res.json({ success: true });
});
