import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import {
  signupSchema,
  loginSchema,
  updateMeSchema,
  setPinsSchema,
  consentUpdateSchema,
  UserRow,
} from '@raksha/shared';

export const authRouter = Router();

function createSessionCookie(res: Response, userId: string) {
  const token = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('raksha_session', token, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

authRouter.post(
  '/auth/signup',
  authRateLimiter,
  validateBody(signupSchema),
  async (req: Request, res: Response) => {
    const { username, password, displayName, ageConfirmed18, consents } = req.body;

    const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
    if (existing) {
      res.status(409).json({
        error: { code: 'USERNAME_TAKEN', message: 'Username is already in use' },
      });
      return;
    }

    const userId = `usr_${nanoid(10)}`;
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);

    const defaultSettings = {
      sosActivationStyle: 'hold',
      discreetDefault: false,
      shakeEnabled: true,
      voiceEnabled: false,
      timingProfile: 'production',
      theme: 'auto',
      textSize: 'normal',
    };

    db.prepare(`
      INSERT INTO users (
        id, username, display_name, password_hash, age_confirmed_at, settings_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      username.toLowerCase().trim(),
      displayName.trim(),
      passwordHash,
      now,
      JSON.stringify(defaultSettings),
      now
    );

    // Record required consent
    db.prepare(`
      INSERT INTO consents (id, user_id, type, granted, policy_version, created_at)
      VALUES (?, ?, 'terms_privacy', 1, '1.0', ?)
    `).run(`c_${nanoid(8)}`, userId, now);

    createSessionCookie(res, userId);

    res.status(201).json({
      user: {
        id: userId,
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        hasSafetyPin: false,
        hasDuressPin: false,
        settings: defaultSettings,
      },
    });
  }
);

authRouter.post(
  '/auth/login',
  authRateLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username.toLowerCase().trim()) as
      | UserRow
      | undefined;

    if (!user) {
      res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
      });
      return;
    }

    createSessionCookie(res, user.id);

    let parsedSettings = {};
    try {
      parsedSettings = JSON.parse(user.settings_json);
    } catch {}

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        hasSafetyPin: Boolean(user.safety_pin_hash),
        hasDuressPin: Boolean(user.duress_pin_hash),
        settings: parsedSettings,
      },
    });
  }
);

authRouter.post('/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('raksha_session', { path: '/' });
  res.json({ success: true });
});

authRouter.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  let parsedSettings = {};
  try {
    parsedSettings = JSON.parse(user.settings_json);
  } catch {}

  const consents = db.prepare(`SELECT type, granted, policy_version, created_at FROM consents WHERE user_id = ?`).all(user.id);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      hasSafetyPin: Boolean(user.safety_pin_hash),
      hasDuressPin: Boolean(user.duress_pin_hash),
      falseAlarmCount: user.false_alarm_count,
      settings: parsedSettings,
      createdAt: user.created_at,
    },
    consents,
  });
});

authRouter.patch(
  '/me',
  requireAuth,
  validateBody(updateMeSchema),
  (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { displayName, settings } = req.body;

    if (displayName) {
      db.prepare(`UPDATE users SET display_name = ? WHERE id = ?`).run(displayName.trim(), user.id);
      user.display_name = displayName.trim();
    }

    if (settings) {
      let existingSettings = {};
      try {
        existingSettings = JSON.parse(user.settings_json);
      } catch {}
      const merged = { ...existingSettings, ...settings };
      db.prepare(`UPDATE users SET settings_json = ? WHERE id = ?`).run(JSON.stringify(merged), user.id);
      user.settings_json = JSON.stringify(merged);
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        hasSafetyPin: Boolean(user.safety_pin_hash),
        hasDuressPin: Boolean(user.duress_pin_hash),
        settings: JSON.parse(user.settings_json),
      },
    });
  }
);

authRouter.post(
  '/me/pins',
  requireAuth,
  validateBody(setPinsSchema),
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { safetyPin, duressPin } = req.body;

    const safetyHash = await bcrypt.hash(safetyPin, 10);
    const duressHash = await bcrypt.hash(duressPin, 10);

    db.prepare(`
      UPDATE users SET safety_pin_hash = ?, duress_pin_hash = ? WHERE id = ?
    `).run(safetyHash, duressHash, user.id);

    res.json({
      success: true,
      message: 'Safety PIN and Duress PIN configured successfully.',
    });
  }
);

authRouter.get('/consents', requireAuth, (req: AuthRequest, res: Response) => {
  const consents = db.prepare(`SELECT * FROM consents WHERE user_id = ?`).all(req.user!.id);
  res.json({ consents });
});

authRouter.post(
  '/consents',
  requireAuth,
  validateBody(consentUpdateSchema),
  (req: AuthRequest, res: Response) => {
    const { type, granted } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare(`SELECT id FROM consents WHERE user_id = ? AND type = ?`).get(req.user!.id, type) as { id: string } | undefined;

    if (existing) {
      db.prepare(`UPDATE consents SET granted = ?, created_at = ? WHERE id = ?`).run(granted ? 1 : 0, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO consents (id, user_id, type, granted, policy_version, created_at)
        VALUES (?, ?, ?, ?, '1.0', ?)
      `).run(`c_${nanoid(8)}`, req.user!.id, type, granted ? 1 : 0, now);
    }

    res.json({ success: true, type, granted });
  }
);

authRouter.get('/me/export', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const userData = db.prepare(`
    SELECT id, username, display_name, age_confirmed_at, settings_json, false_alarm_count, created_at
    FROM users WHERE id = ?
  `).get(userId);

  const consents = db.prepare(`SELECT * FROM consents WHERE user_id = ?`).all(userId);
  const guardians = db.prepare(`SELECT id, name, phone, relation, priority, status, created_at FROM guardians WHERE user_id = ?`).all(userId);
  const journeys = db.prepare(`SELECT * FROM journeys WHERE user_id = ?`).all(userId);
  const incidents = db.prepare(`SELECT * FROM incidents WHERE user_id = ?`).all(userId);
  const fakeCalls = db.prepare(`SELECT * FROM fake_calls WHERE user_id = ?`).all(userId);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    user: userData,
    consents,
    guardians,
    journeys,
    incidents,
    fakeCalls,
  };

  res.setHeader('Content-Disposition', `attachment; filename="raksha-export-${userId}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(exportPayload, null, 2));
});

authRouter.delete('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  const user = req.user!;

  if (!password) {
    res.status(400).json({ error: { code: 'PASSWORD_REQUIRED', message: 'Password is required to delete your account' } });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: { code: 'INVALID_PASSWORD', message: 'Incorrect password' } });
    return;
  }

  // Hard cascade delete: delete user cascades to consents, guardians, journeys, incidents, fake_calls
  db.prepare(`DELETE FROM push_subscriptions WHERE owner_type = 'user' AND owner_id = ?`).run(user.id);
  db.prepare(`DELETE FROM users WHERE id = ?`).run(user.id);

  res.clearCookie('raksha_session', { path: '/' });
  res.json({ success: true, message: 'Account and all associated personal data have been permanently deleted.' });
});
