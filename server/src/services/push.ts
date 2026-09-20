import webPush from 'web-push';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { PushSubscriptionRow } from '@raksha/shared';

if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    config.VAPID_SUBJECT,
    config.VAPID_PUBLIC_KEY,
    config.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string }>;
  data?: { url: string; [key: string]: any };
}

export async function sendWebPush(
  ownerType: 'user' | 'guardian',
  ownerId: string,
  payload: PushPayload
): Promise<void> {
  const subscriptions = db.prepare(`
    SELECT * FROM push_subscriptions
    WHERE owner_type = ? AND owner_id = ?
  `).all(ownerType, ownerId) as PushSubscriptionRow[];

  if (subscriptions.length === 0) return;

  const jsonPayload = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      const keys = JSON.parse(sub.keys_json);
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys,
        },
        jsonPayload
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Expired subscription, remove from DB
        db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(sub.endpoint);
      }
    }
  }
}
