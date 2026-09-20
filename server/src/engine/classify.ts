import { ReportCategory } from '@raksha/shared';

interface ClassificationResult {
  category: ReportCategory;
  severity: number;
  confidence: number;
  matchedKeywords: string[];
}

const CATEGORY_KEYWORDS: Record<ReportCategory, { words: string[]; weight: number }[]> = {
  lighting: [
    { words: ['dark', 'no light', 'lights out', 'streetlight', 'pitch black', 'dim', 'broken lamp', 'unlit'], weight: 1.0 },
    { words: ['shadow', 'lamp', 'bulb', 'night', 'visibility'], weight: 0.5 },
  ],
  harassment: [
    { words: ['harass', 'catcall', 'followed', 'stalk', 'chased', 'leering', 'inappropriate', 'touch', 'molest'], weight: 1.2 },
    { words: ['whistling', 'shouting', 'uncomfortable', 'taunting'], weight: 0.7 },
  ],
  suspicious: [
    { words: ['suspicious', 'loitering', 'drunk', 'lurking', 'gang', 'prowling', 'shady'], weight: 1.0 },
    { words: ['parked car', 'watching', 'group', 'isolated', 'alley'], weight: 0.5 },
  ],
  accident: [
    { words: ['accident', 'crash', 'collision', 'hit and run', 'injured', 'ambulance', 'skid'], weight: 1.2 },
    { words: ['fell', 'bike down', 'glass', 'blood'], weight: 0.6 },
  ],
  hazard: [
    { words: ['pothole', 'open manhole', 'waterlogged', 'flooded', 'construction', 'wire', 'debris', 'cable'], weight: 1.0 },
    { words: ['slippery', 'hole', 'broken road', 'blocked sidewalk'], weight: 0.6 },
  ],
  crowd: [
    { words: ['crowd', 'stampede', 'mob', 'jam', 'crush', 'bottleneck', 'choke point'], weight: 1.0 },
    { words: ['gathering', 'chaos', 'protest', 'rally', 'packed'], weight: 0.5 },
  ],
  unsafe_road: [
    { words: ['speeding', 'reckless', 'no divider', 'blind curve', 'racing', 'no signal'], weight: 1.0 },
    { words: ['dangerous turn', 'fast traffic', 'highway', 'crossing'], weight: 0.6 },
  ],
  other: [
    { words: ['issue', 'problem', 'unsafe', 'danger', 'alert', 'warning'], weight: 0.4 },
  ],
};

const HIGH_SEVERITY_WORDS = ['emergency', 'urgent', 'aggressive', 'weapon', 'assault', 'fatal', 'severe', 'danger', 'violence', 'deep'];
const LOW_SEVERITY_WORDS = ['minor', 'slight', 'small', 'flickering', 'little', 'occasional'];

export function classifyReportText(text: string): ClassificationResult {
  const lower = text.toLowerCase();
  const scores: Partial<Record<ReportCategory, { score: number; matches: string[] }>> = {};

  for (const [cat, ruleList] of Object.entries(CATEGORY_KEYWORDS) as [ReportCategory, { words: string[]; weight: number }[]][]) {
    let catScore = 0;
    const matches: string[] = [];

    for (const rule of ruleList) {
      for (const word of rule.words) {
        if (lower.includes(word)) {
          catScore += rule.weight;
          matches.push(word);
        }
      }
    }

    if (catScore > 0) {
      scores[cat] = { score: catScore, matches };
    }
  }

  // Find category with highest score
  let bestCategory: ReportCategory = 'other';
  let highestScore = 0;
  let bestMatches: string[] = [];

  for (const [cat, data] of Object.entries(scores) as [ReportCategory, { score: number; matches: string[] }][]) {
    if (data.score > highestScore) {
      highestScore = data.score;
      bestCategory = cat;
      bestMatches = data.matches;
    }
  }

  // Determine Severity (1-5, default 3)
  let severity = 3;
  if (HIGH_SEVERITY_WORDS.some((w) => lower.includes(w))) {
    severity = 5;
  } else if (LOW_SEVERITY_WORDS.some((w) => lower.includes(w))) {
    severity = 2;
  } else if (bestCategory === 'harassment' || bestCategory === 'accident') {
    severity = 4;
  }

  const confidence = Math.min(0.95, Number((0.35 + highestScore * 0.25).toFixed(2)));

  return {
    category: bestCategory,
    severity,
    confidence,
    matchedKeywords: bestMatches,
  };
}
