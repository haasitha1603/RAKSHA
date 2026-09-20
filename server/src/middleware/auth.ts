import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { UserRow } from '@raksha/shared';

export interface AuthRequest extends Request {
  user?: UserRow;
  guardianToken?: string;
  responderFacilityId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.raksha_session;
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(payload.userId) as UserRow | undefined;

    if (!user) {
      res.clearCookie('raksha_session');
      res.status(401).json({ error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' } });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.clearCookie('raksha_session');
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid' } });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.raksha_session;
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(payload.userId) as UserRow | undefined;
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid optional session
  }
  next();
}

export function requireResponderAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const sessionVal = req.cookies?.raksha_responder;
  if (!sessionVal) {
    res.status(401).json({ error: { code: 'RESPONDER_AUTH_REQUIRED', message: 'Responder authentication required' } });
    return;
  }

  try {
    const [facilityId, key] = sessionVal.split(':');
    if (!facilityId || key !== config.DEMO_RESPONDER_KEY) {
      res.status(403).json({ error: { code: 'INVALID_RESPONDER_KEY', message: 'Invalid responder key' } });
      return;
    }
    req.responderFacilityId = facilityId;
    next();
  } catch {
    res.status(403).json({ error: { code: 'INVALID_RESPONDER_SESSION', message: 'Invalid session' } });
  }
}
