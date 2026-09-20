import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { AuthRequest } from './auth.js';

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`[AUTH_FAILURE] ip=${req.ip} reason=rate_limited`);
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please wait 1 minute.'
      }
    });
  }
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.'
    }
  }
});

export const geocodeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as AuthRequest).user?.id || req.ip || 'unknown',
  message: {
    error: {
      code: 'GEOCODE_RATE_LIMITED',
      message: 'Search query rate limit reached. Please wait a moment.'
    }
  }
});

export const reportRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as AuthRequest).user?.id || req.ip || 'unknown',
  message: {
    error: {
      code: 'DAILY_REPORT_LIMIT_REACHED',
      message: 'You have reached the limit of 5 community reports per day.'
    }
  }
});

export const sosRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as AuthRequest).user?.id || req.ip || 'unknown',
  handler: async (req: Request, res: Response) => {
    // Ground Rule / Loophole 16: Never block SOS with a hard error — return existing active SOS
    const authReq = req as AuthRequest;
    if (authReq.user) {
      const activeSos = (await db.prepare(`
        SELECT id, cancel_until, status FROM sos_events
        WHERE user_id = ? AND status IN ('pending', 'escalated', 'duress_escalated')
        ORDER BY created_at DESC LIMIT 1
      `).get(authReq.user.id)) as { id: string; cancel_until: string; status: string } | undefined;

      if (activeSos) {
        res.json({
          sosId: activeSos.id,
          cancelUntil: activeSos.cancel_until,
          status: activeSos.status,
          rateLimitedNotice: 'High SOS frequency detected. Re-using active emergency session.'
        });
        return;
      }
    }

    res.status(429).json({
      error: {
        code: 'SOS_FREQUENCY_HIGH',
        message: 'High SOS frequency detected. If this is a real emergency, dial 112 immediately.'
      }
    });
  }
});
