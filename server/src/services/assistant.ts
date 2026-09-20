import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AssistantAction {
  label: string;
  url: string;
  type: 'call' | 'navigate' | 'external';
  urgent: boolean;
}

export interface AssistantResponse {
  isEmergency: boolean;
  dangerDetected?: boolean;
  message: string;
  actions?: AssistantAction[];
  suggestions?: string[];
  sources?: { id: string; title: string; category: string }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DANGER_TERMS = [
  'follow',
  'following',
  'followed',
  'stalk',
  'stalker',
  'stalking',
  'danger',
  'attack',
  'attacked',
  'attacking',
  'scared',
  'help me now',
  'help me',
  'in danger',
  'kidnap',
  'kidnapped',
  'threatened',
  'threat',
  'emergency',
  'kill',
  'hurt me',
  'hurt',
  'sos',
  'bachao',
  'chased',
  'someone is outside',
  'abuse',
  'trapped',
];

interface KbArticle {
  id: string;
  whatIfNumber?: number;
  category: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
}

let cachedArticles: KbArticle[] = [];

function loadKbArticles(): KbArticle[] {
  if (cachedArticles.length > 0) {
    return cachedArticles;
  }
  try {
    const candidates = [
      path.resolve(__dirname, '../help/kb.json'),
      path.resolve(__dirname, '../../src/help/kb.json'),
      path.resolve(process.cwd(), 'src/help/kb.json'),
      path.resolve(process.cwd(), 'server/src/help/kb.json'),
    ];
    let kbPath = candidates[0];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        kbPath = c;
        break;
      }
    }
    const raw = fs.readFileSync(kbPath, 'utf8');
    cachedArticles = JSON.parse(raw);
    return cachedArticles;
  } catch (err) {
    console.error('Failed to load kb.json in assistant:', err);
    return [];
  }
}

/**
 * Checks whether user input matches critical physical danger keywords
 */
export function checkDanger(input: string): boolean {
  const normalized = input.toLowerCase();
  return DANGER_TERMS.some((term) => {
    // Check whole word or substring depending on length
    if (term.includes(' ')) {
      return normalized.includes(term);
    }
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    return regex.test(normalized) || normalized.includes(term);
  });
}

/**
 * Redacts Personally Identifiable Information (PII)
 */
export function redactPII(text: string): string {
  let cleaned = text;

  // Redact Emails
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

  // Redact GPS coordinates (lat, lng pairs)
  cleaned = cleaned.replace(
    /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)\s*,\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/g,
    '[COORDINATES_REDACTED]'
  );

  // Redact phone numbers (international and 10-digit Indian/local formats)
  cleaned = cleaned.replace(
    /(?:\+?91[\s-]?)?[6-9]\d{9}\b/g,
    '[PHONE_REDACTED]'
  );
  cleaned = cleaned.replace(
    /\b(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    '[PHONE_REDACTED]'
  );

  return cleaned;
}

/**
 * Deterministic Fallback Search across Knowledge Base
 */
export function searchKnowledgeBase(query: string): AssistantResponse {
  const articles = loadKbArticles();
  const lowerQuery = query.toLowerCase();

  // Stop words to remove for token matching
  const stopWords = new Set([
    'what', 'is', 'the', 'how', 'do', 'i', 'can', 'if', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'my', 'does', 'when', 'why', 'where', 'are', 'you'
  ]);

  const queryTokens = lowerQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));

  let bestScore = 0;
  let bestArticle: KbArticle | null = null;
  const scoredArticles: { article: KbArticle; score: number }[] = [];

  for (const article of articles) {
    let score = 0;
    const titleLower = article.title.toLowerCase();
    const summaryLower = article.summary.toLowerCase();
    const contentLower = article.content.toLowerCase();
    const tagsLower = article.tags.map((t) => t.toLowerCase());

    // Exact phrase match bonus
    if (queryTokens.length >= 2 && titleLower.includes(lowerQuery.slice(0, 30))) {
      score += 15;
    }

    for (const token of queryTokens) {
      if (titleLower.includes(token)) score += 5;
      if (tagsLower.some((t) => t.includes(token))) score += 4;
      if (summaryLower.includes(token)) score += 3;
      if (contentLower.includes(token)) score += 1;
    }

    if (score > 0) {
      scoredArticles.push({ article, score });
      if (score > bestScore) {
        bestScore = score;
        bestArticle = article;
      }
    }
  }

  scoredArticles.sort((a, b) => b.score - a.score);
  const topSources = scoredArticles.slice(0, 3).map((s) => ({
    id: s.article.id,
    title: s.article.title,
    category: s.article.category,
  }));

  if (bestArticle && bestScore >= 4) {
    return {
      isEmergency: false,
      message: `${bestArticle.content}`,
      sources: topSources,
      suggestions: [
        'How does the offline SOS queue work?',
        'What is the difference between regular SOS and Duress PIN?',
        'How do I add a guardian?'
      ],
    };
  }

  return {
    isEmergency: false,
    message: "I am Raksha's Safety & Navigation Guide. I can assist you with active journey monitoring, discreet SOS triggers, fake calls, guardian telemetry, and technical offline capabilities. What specific safety question can I help you with?",
    suggestions: [
      'What happens if I deviate from my route?',
      'How does Duress PIN 4321 work?',
      'How does Raksha work offline?',
      'What does Raksha do when phone battery is low?'
    ],
  };
}

/**
 * Handle Assistant Query
 */
export async function processAssistantQuery(
  rawQuery: string,
  history: ChatMessage[] = []
): Promise<AssistantResponse> {
  const query = rawQuery.trim();

  // 1. Strict Danger Pre-Check (Zero Latency)
  if (checkDanger(query)) {
    return {
      isEmergency: true,
      dangerDetected: true,
      message:
        'EMERGENCY ALERT: It sounds like you may be in danger. If you need immediate physical assistance, contact emergency services right now or trigger Raksha SOS.',
      actions: [
        { label: 'Call 112 (National Emergency)', url: 'tel:112', type: 'call', urgent: true },
        { label: 'Trigger Raksha SOS', url: '/app/sos', type: 'navigate', urgent: true },
        { label: "Women's Helpline (1091)", url: 'tel:1091', type: 'call', urgent: false },
      ],
      suggestions: [
        'Move toward a well-lit, populated area or 24/7 store immediately',
        'Keep your phone unlocked and prepare to enter Duress PIN if forced',
        'Share your live link with designated guardians',
      ],
    };
  }

  // 2. PII Redaction
  const sanitizedQuery = redactPII(query);
  const sanitizedHistory = history.slice(-6).map((msg) => ({
    role: msg.role,
    content: redactPII(msg.content),
  }));

  // 3. Provider Call (Anthropic Claude Haiku if configured)
  if (
    config.ASSISTANT_PROVIDER === 'anthropic' &&
    config.ANTHROPIC_API_KEY &&
    config.ANTHROPIC_API_KEY.trim() !== ''
  ) {
    try {
      const systemPrompt = `You are Raksha's AI Safety & Navigation Assistant.
Raksha is a high-reliability women's safety navigation and emergency response application.
Your role is to assist users with:
1. Understanding active journey tracking, safe route scoring, corridor deviation detection, and safety checks.
2. Explaining discreet SOS triggers (Hold-to-trigger, Duress PIN 4321, Accelerometer Shake, Voice activation, Calculator decoy).
3. Synthesized Web Audio fake calls and standby timer.
4. Guardians live tracking link and responder consoles.
5. Offline GPS breadcrumb caching and SMS fallback.

Tone Guidelines:
- Calm, professional, empathetic, concise, and safety-conscious.
- If a user mentions being in physical danger or needing emergency help, instruct them to call 112 immediately or trigger SOS.
- Never make false promises about physical intervention. Be honest about app capabilities.
- Keep responses within 2-4 sentences when possible.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.ASSISTANT_MODEL || 'claude-3-haiku-20240307',
          max_tokens: 500,
          system: systemPrompt,
          messages: [
            ...sanitizedHistory,
            { role: 'user', content: sanitizedQuery },
          ],
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const replyText = data?.content?.[0]?.text;
        if (replyText) {
          return {
            isEmergency: false,
            message: replyText,
            suggestions: [
              'Tell me more about safe route planning',
              'How does Duress PIN work?',
              'How do I report a safety hazard?'
            ],
          };
        }
      } else {
        console.warn('Anthropic API returned error, falling back to KB:', await response.text());
      }
    } catch (err) {
      console.warn('Failed to call Anthropic API, falling back to KB search:', err);
    }
  }

  // 4. Fallback to Deterministic Knowledge Base Search
  return searchKnowledgeBase(sanitizedQuery);
}
