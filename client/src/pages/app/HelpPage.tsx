import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { apiFetch } from '../../lib/api';
import { AssistantDrawer } from '../../components/assistant/AssistantDrawer';
import { BackgroundPaths } from '../../components/ui/BackgroundPaths';

interface KbArticle {
  id: string;
  whatIfNumber?: number;
  category: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
}

export const HelpPage: React.FC = () => {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [assistantInitialQuery, setAssistantInitialQuery] = useState<string>('');

  // Load feedback from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('raksha_kb_feedback');
      if (stored) {
        setFeedback(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    const updated = { ...feedback, [id]: type };
    setFeedback(updated);
    try {
      localStorage.setItem('raksha_kb_feedback', JSON.stringify(updated));
    } catch (e) {
      // Ignore storage errors
    }
  };

  // Fetch articles on mount
  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch<{
          articles: KbArticle[];
          total: number;
          categories: string[];
        }>('/api/help/articles');
        setArticles(res.articles || []);
        setCategories(res.categories || []);
      } catch (err) {
        console.error('Failed to load help articles:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
  }, []);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    let result = articles;

    if (selectedCategory !== 'All') {
      result = result.filter(
        (a) => a.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [articles, selectedCategory, searchQuery]);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openAssistantWith = (q: string) => {
    setAssistantInitialQuery(q);
    setIsAssistantOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Help &amp; Operational Queries — Raksha</title>
      </Helmet>

      <div className="relative min-h-screen bg-bg text-text pb-20 overflow-hidden">
        <BackgroundPaths opacity={0.08} />

        {/* Header Hero */}
        <header className="relative z-10 max-w-5xl mx-auto px-4 pt-8 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#B727F5]">
                Knowledge Base &amp; What-If Scenarios
              </span>
              <h1 className="text-3xl font-extrabold text-white mt-1">Help &amp; Operational Queries</h1>
              <p className="text-sm text-text-muted mt-1 max-w-2xl">
                Comprehensive operational guidance, fail-safe edge cases, and safety system boundaries.
              </p>
            </div>

            {/* Ask AI Assistant Button */}
            <button
              onClick={() => {
                setAssistantInitialQuery('');
                setIsAssistantOpen(true);
              }}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8E17C4] to-[#B727F5] hover:from-[#9E1FD5] hover:to-[#C64BFF] text-white text-sm font-semibold shadow-[0_4px_16px_rgba(183,39,245,0.4)] transition-all transform active:scale-95"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                AI
              </div>
              <span>Ask Raksha Assistant</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-6 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword (e.g., deviation, duress, offline, battery, low lighting)..."
              className="w-full bg-surface border border-white/15 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#B727F5] transition-colors shadow-inner"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-text-muted hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center space-x-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                selectedCategory === 'All'
                  ? 'bg-[#B727F5] text-white shadow-md shadow-[#B727F5]/30'
                  : 'bg-surface border border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
              }`}
            >
              All Articles ({articles.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#B727F5] text-white shadow-md shadow-[#B727F5]/30'
                    : 'bg-surface border border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {/* Content Container */}
        <main className="relative z-10 max-w-5xl mx-auto px-4 space-y-12">
          {/* Articles Accordion Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Operational Scenarios &amp; FAQs</span>
                <span className="text-xs font-normal text-text-muted">
                  ({filteredArticles.length} found)
                </span>
              </h2>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-text-muted text-sm animate-pulse">
                Loading knowledge base articles...
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface/50 border border-white/10 text-center space-y-3">
                <p className="text-zinc-300 font-medium">No articles matched your search.</p>
                <p className="text-xs text-text-muted">
                  Try broader keywords or ask our AI assistant directly.
                </p>
                <button
                  onClick={() => openAssistantWith(searchQuery)}
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[#B727F5] hover:underline"
                >
                  Ask Raksha AI about &ldquo;{searchQuery}&rdquo; &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.map((article) => {
                  const isExpanded = expandedId === article.id;
                  const itemFeedback = feedback[article.id];

                  return (
                    <div
                      key={article.id}
                      className={`rounded-2xl border transition-all ${
                        isExpanded
                          ? 'bg-[#14141B] border-[#B727F5]/50 shadow-[0_4px_20px_rgba(183,39,245,0.12)]'
                          : 'bg-surface/70 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleAccordion(article.id)}
                        className="w-full text-left p-4.5 flex items-start justify-between gap-4"
                        aria-expanded={isExpanded}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {article.whatIfNumber && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                                SCENARIO #{article.whatIfNumber}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#B727F5]/15 text-[#D96BFF] font-medium border border-[#B727F5]/30">
                              {article.category}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-white group-hover:text-[#B727F5] transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-xs text-text-muted line-clamp-1">{article.summary}</p>
                        </div>

                        <div className="pt-1 text-zinc-400">
                          <svg
                            className={`w-5 h-5 transform transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-[#B727F5]' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-white/5 space-y-4">
                          <div className="text-sm text-zinc-200 leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
                            {article.content}
                          </div>

                          {/* Tags */}
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-[11px] text-zinc-500 mr-1">Tags:</span>
                              {article.tags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery(tag);
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-white/10 text-zinc-400 hover:text-white"
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Helpfulness Feedback & AI Action */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-text-muted">
                            <div className="flex items-center space-x-2">
                              <span>Was this explanation clear?</span>
                              <button
                                onClick={() => handleFeedback(article.id, 'up')}
                                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                                  itemFeedback === 'up'
                                    ? 'bg-green-500/20 text-green-400 font-semibold'
                                    : 'hover:bg-white/10 text-zinc-400'
                                }`}
                              >
                                👍 Yes
                              </button>
                              <button
                                onClick={() => handleFeedback(article.id, 'down')}
                                className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                                  itemFeedback === 'down'
                                    ? 'bg-red-500/20 text-red-400 font-semibold'
                                    : 'hover:bg-white/10 text-zinc-400'
                                }`}
                              >
                                👎 Needs more detail
                              </button>
                            </div>

                            <button
                              onClick={() => openAssistantWith(`Tell me more about: ${article.title}`)}
                              className="text-xs text-[#B727F5] hover:underline font-medium"
                            >
                              Ask AI follow-up &rarr;
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Boundaries Section: What Raksha Can and Cannot Do */}
          <section className="p-6 md:p-8 rounded-3xl bg-surface/40 border border-white/10 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                System Capabilities &amp; Transparency
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                What Raksha Can and Cannot Do
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Honest operational boundaries to ensure travelers and guardians have accurate expectations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CAN DO */}
              <div className="p-5 rounded-2xl bg-black/40 border border-green-500/20 space-y-3">
                <div className="flex items-center space-x-2 text-green-400 font-bold text-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>WHAT RAKSHA DOES</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-2.5 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">•</span>
                    <span><strong>High-precision corridor monitoring:</strong> Flags deviations &gt;150m or sudden stops in unlit areas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">•</span>
                    <span><strong>Stealth emergency triggers:</strong> Supports Duress PIN 4321, Shake-to-SOS, voice trigger, and Calculator decoy.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">•</span>
                    <span><strong>Offline telemetry resilience:</strong> Caches breadcrumbs in IndexedDB and formats one-tap SMS coordinates when offline.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">•</span>
                    <span><strong>Sub-second parallel dispatch:</strong> Broadcasts telemetry to designated guardians and emergency consoles in &lt;800ms.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">•</span>
                    <span><strong>Realistic synthesized fake calls:</strong> Generates audio chimes, timer countdowns, and automated speech dialogue.</span>
                  </li>
                </ul>
              </div>

              {/* CANNOT DO */}
              <div className="p-5 rounded-2xl bg-black/40 border border-red-500/20 space-y-3">
                <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>WHAT RAKSHA CANNOT DO</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-2.5 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span><strong>No direct physical intervention:</strong> Software cannot physically stop assailants; it dispatches alerts to people and authorities who can.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span><strong>Does not replace 112:</strong> In immediate physical danger, always call national emergency services (112) directly if reachable.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span><strong>Cannot run on a dead battery:</strong> If the phone powers off at 0%, no live packets can transmit (Raksha sends low-battery alerts at 15% &amp; 10% beforehand).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span><strong>Cannot penetrate Faraday cages:</strong> Subterranean basements with zero GPS and zero cellular connectivity will queue packets until signal recovers.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Direct Support & Feedback Card */}
          <section className="p-6 rounded-2xl bg-surface/30 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Need additional help or noticed an inaccuracy?</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Our safety engineering team reviews all edge cases and scenario inquiries.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="mailto:support@raksha.internal?subject=Raksha%20Operational%20Query"
                className="px-4 py-2 rounded-xl bg-surface border border-white/15 hover:border-white/30 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email Support</span>
              </a>
            </div>
          </section>
        </main>
      </div>

      {/* Slide-over Assistant Drawer */}
      <AssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        initialQuery={assistantInitialQuery}
      />
    </>
  );
};

export default HelpPage;
