import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface KbArticle {
  id: string;
  whatIfNumber?: number;
  category: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
}

const router = Router();

function getKbPath(): string {
  const candidates = [
    path.resolve(__dirname, '../help/kb.json'),
    path.resolve(__dirname, '../../src/help/kb.json'),
    path.resolve(process.cwd(), 'src/help/kb.json'),
    path.resolve(process.cwd(), 'server/src/help/kb.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

let cachedArticles: KbArticle[] = [];

function getArticles(): KbArticle[] {
  if (cachedArticles.length > 0) {
    return cachedArticles;
  }
  try {
    const kbPath = getKbPath();
    const raw = fs.readFileSync(kbPath, 'utf8');
    cachedArticles = JSON.parse(raw);
    return cachedArticles;
  } catch (err) {
    console.error('Failed to load kb.json:', err);
    return [];
  }
}

// GET /api/help/articles?category=...&q=...
router.get('/help/articles', (req: Request, res: Response) => {
  const articles = getArticles();
  const categoryFilter = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const searchFilter = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  let filtered = articles;

  if (categoryFilter && categoryFilter.toLowerCase() !== 'all') {
    filtered = filtered.filter(
      (a) => a.category.toLowerCase() === categoryFilter.toLowerCase()
    );
  }

  if (searchFilter) {
    filtered = filtered.filter((a) => {
      const inTitle = a.title.toLowerCase().includes(searchFilter);
      const inSummary = a.summary.toLowerCase().includes(searchFilter);
      const inContent = a.content.toLowerCase().includes(searchFilter);
      const inTags = a.tags.some((tag) => tag.toLowerCase().includes(searchFilter));
      return inTitle || inSummary || inContent || inTags;
    });
  }

  const allCategories = Array.from(new Set(articles.map((a) => a.category)));

  res.json({
    articles: filtered,
    total: filtered.length,
    categories: allCategories,
  });
});

// GET /api/help/articles/:id
router.get('/help/articles/:id', (req: Request, res: Response) => {
  const articles = getArticles();
  const article = articles.find((a) => a.id === req.params.id);

  if (!article) {
    return res.status(404).json({ error: { code: 'ARTICLE_NOT_FOUND', message: 'Article not found' } });
  }

  res.json({ article });
});

export default router;
