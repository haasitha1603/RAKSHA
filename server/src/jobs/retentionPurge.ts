import { db } from '../db/index.js';

export function runRetentionPurge(): void {
  console.log('Running daily retention purge...');

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
  const ninetyDaysAgo = new Date(now - 90 * 86400000).toISOString();
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString();
  const oneDayAgo = new Date(now - 24 * 3600000).toISOString();

  // 1. Delete journey_points older than 30 days for ended journeys
  db.prepare(`
    DELETE FROM journey_points
    WHERE journey_id IN (
      SELECT id FROM journeys WHERE status IN ('completed', 'cancelled') AND datetime(ended_at) <= datetime(?)
    )
  `).run(thirtyDaysAgo);

  // 2. Delete journeys & events older than 90 days
  db.prepare(`
    DELETE FROM journeys
    WHERE status IN ('completed', 'cancelled') AND datetime(ended_at) <= datetime(?)
  `).run(ninetyDaysAgo);

  // 3. Delete resolved incidents older than 90 days
  db.prepare(`
    DELETE FROM incidents
    WHERE status IN ('resolved', 'false_alarm') AND datetime(resolved_at) <= datetime(?)
  `).run(ninetyDaysAgo);

  // 4. Delete fake calls older than 24h
  db.prepare(`
    DELETE FROM fake_calls
    WHERE status IN ('answered', 'declined', 'missed', 'cancelled') AND datetime(scheduled_for) <= datetime(?)
  `).run(oneDayAgo);

  // 5. Delete outbox older than 7 days
  db.prepare(`
    DELETE FROM outbox
    WHERE datetime(created_at) <= datetime(?)
  `).run(sevenDaysAgo);

  console.log('Retention purge completed.');
}
