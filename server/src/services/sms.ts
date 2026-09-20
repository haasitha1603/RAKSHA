import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { emitToRoom } from '../sockets/index.js';

export interface SmsMessage {
  toPhone: string;
  body: string;
  kind: string;
  incidentId?: string;
  journeyId?: string;
  isDrill?: boolean;
}

export interface SmsProvider {
  send(msg: SmsMessage): Promise<{ success: boolean; provider: string }>;
}

export class MockSmsProvider implements SmsProvider {
  async send(msg: SmsMessage): Promise<{ success: boolean; provider: string }> {
    const outboxId = `out_${nanoid(8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO outbox (id, to_phone, body, kind, incident_id, journey_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(outboxId, msg.toPhone, msg.body, msg.kind, msg.incidentId || null, msg.journeyId || null, now);

    console.log(`[Mock SMS Outbox] To: ${msg.toPhone} | Type: ${msg.kind} | Body: "${msg.body}"`);

    // Emit live outbox update to demo room
    emitToRoom('demo', 'outbox:new', {
      id: outboxId,
      toPhone: msg.toPhone,
      body: msg.body,
      kind: msg.kind,
      incidentId: msg.incidentId,
      journeyId: msg.journeyId,
      isDrill: Boolean(msg.isDrill),
      createdAt: now,
    });

    return { success: true, provider: 'mock' };
  }
}

export class TwilioSmsProvider implements SmsProvider {
  async send(msg: SmsMessage): Promise<{ success: boolean; provider: string }> {
    // Drills are strictly simulated and never sent externally
    if (msg.isDrill || msg.body.startsWith('[DRILL]')) {
      return new MockSmsProvider().send(msg);
    }

    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_FROM) {
      console.warn('Twilio credentials missing. Falling back to MockSmsProvider.');
      return new MockSmsProvider().send(msg);
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64');
      const body = new URLSearchParams({
        To: msg.toPhone,
        From: config.TWILIO_FROM,
        Body: msg.body,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        throw new Error(`Twilio HTTP error ${res.status}`);
      }

      return { success: true, provider: 'twilio' };
    } catch (err) {
      console.error('Twilio SMS failed:', err);
      // Fallback record in outbox
      return new MockSmsProvider().send(msg);
    }
  }
}

export const smsProvider: SmsProvider =
  config.SMS_PROVIDER === 'twilio' ? new TwilioSmsProvider() : new MockSmsProvider();
