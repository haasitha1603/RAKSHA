import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { checkDanger, redactPII } from '../services/assistant.js';

describe('Help & AI Assistant Tests', () => {
  it('GET /api/help/articles returns 45 articles and full category list', async () => {
    const res = await request(app).get('/api/help/articles');
    expect(res.status).toBe(200);
    expect(res.body.articles).toBeDefined();
    expect(res.body.articles.length).toBeGreaterThanOrEqual(45);
    expect(res.body.categories).toBeDefined();
    expect(res.body.categories).toContain('Journey Safety');
    expect(res.body.categories).toContain('SOS & Emergency');
    expect(res.body.categories).toContain('Fake Calls');
    expect(res.body.categories).toContain('Privacy & Data');
    expect(res.body.categories).toContain('Technical & Offline');
    expect(res.body.categories).toContain('Guardians & Sharing');
  });

  it('GET /api/help/articles?category=Journey%20Safety filters correctly', async () => {
    const res = await request(app).get('/api/help/articles?category=Journey%20Safety');
    expect(res.status).toBe(200);
    expect(res.body.articles.length).toBeGreaterThan(0);
    for (const article of res.body.articles) {
      expect(article.category).toBe('Journey Safety');
    }
  });

  it('GET /api/help/articles?q=deviation searches across title, content, tags', async () => {
    const res = await request(app).get('/api/help/articles?q=deviation');
    expect(res.status).toBe(200);
    expect(res.body.articles.length).toBeGreaterThan(0);
    const hasMatch = res.body.articles.some(
      (a: any) =>
        a.title.toLowerCase().includes('deviation') ||
        a.content.toLowerCase().includes('deviation') ||
        a.tags.includes('deviation')
    );
    expect(hasMatch).toBe(true);
  });

  it('Strict Danger Pre-Check catches danger keywords and phrases', () => {
    expect(checkDanger('someone is following me')).toBe(true);
    expect(checkDanger('Help me now!')).toBe(true);
    expect(checkDanger('I am in danger')).toBe(true);
    expect(checkDanger('I am scared, someone is attacking')).toBe(true);
    expect(checkDanger('Please trigger sos')).toBe(true);
    expect(checkDanger('Bachao bachao')).toBe(true);
    expect(checkDanger('How do I add a guardian?')).toBe(false);
    expect(checkDanger('Tell me about battery life')).toBe(false);
  });

  it('PII redaction replaces phone numbers, emails, and coordinates', () => {
    const textWithPii =
      'Contact me at test@example.com or call +919876543210 at location 28.6139, 77.2090';
    const redacted = redactPII(textWithPii);
    expect(redacted).not.toContain('test@example.com');
    expect(redacted).not.toContain('9876543210');
    expect(redacted).not.toContain('28.6139, 77.2090');
    expect(redacted).toContain('[EMAIL_REDACTED]');
    expect(redacted).toContain('[PHONE_REDACTED]');
    expect(redacted).toContain('[COORDINATES_REDACTED]');
  });

  it('POST /api/assistant/chat returns zero-latency emergency actions when in danger', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .send({ message: 'Help me now, a stalker is following me!' });

    expect(res.status).toBe(200);
    expect(res.body.isEmergency).toBe(true);
    expect(res.body.actions).toBeDefined();
    const actionUrls = res.body.actions.map((a: any) => a.url);
    expect(actionUrls).toContain('tel:112');
    expect(actionUrls).toContain('/app/sos');
  });

  it('POST /api/assistant/chat returns deterministic answers for safety questions', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .send({ message: 'What happens if I deviate from my route?' });

    expect(res.status).toBe(200);
    expect(res.body.isEmergency).toBe(false);
    expect(res.body.message).toBeDefined();
    expect(res.body.message.length).toBeGreaterThan(20);
  });
});
