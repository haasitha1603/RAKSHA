import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { AILoadingState } from '../ui/AILoadingState';
import { Link } from 'react-router-dom';

interface AssistantAction {
  label: string;
  url: string;
  type: 'call' | 'navigate' | 'external';
  urgent: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isEmergency?: boolean;
  actions?: AssistantAction[];
  suggestions?: string[];
  sources?: { id: string; title: string; category: string }[];
  timestamp: string;
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const DEFAULT_SUGGESTIONS = [
  'What happens if I deviate from my route?',
  'How does Duress PIN 4321 work?',
  'Does Raksha work offline?',
  'What should I do if I feel unsafe right now?',
];

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  onClose,
  initialQuery,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I am Raksha's AI Safety Guide. Ask me about safe routing, corridor deviation alerts, discreet SOS triggers, fake calls, or offline emergency procedures.",
      suggestions: DEFAULT_SUGGESTIONS,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      if (initialQuery && initialQuery.trim()) {
        handleSend(initialQuery);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await apiFetch<{
        isEmergency: boolean;
        message: string;
        actions?: AssistantAction[];
        suggestions?: string[];
        sources?: { id: string; title: string; category: string }[];
      }>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      const assistantMessage: Message = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: res.message,
        isEmergency: res.isEmergency,
        actions: res.actions,
        suggestions: res.suggestions,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content:
          "I couldn't complete that request. If you are experiencing an emergency, please call 112 immediately.",
        isEmergency: true,
        actions: [
          { label: 'Call 112 (National Emergency)', url: 'tel:112', type: 'call', urgent: true },
          { label: 'Trigger SOS', url: '/app/sos', type: 'navigate', urgent: true },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-md bg-[#0D0D11] border-l border-white/10 h-full flex flex-col shadow-2xl z-10">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8E17C4] to-[#D96BFF] flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(183,39,245,0.5)]">
              AI
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Raksha Safety AI
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </h2>
              <p className="text-[11px] text-text-muted">Instant guidance &amp; zero-latency safety check</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close assistant"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-2.5 rounded-lg bg-surface/40 border border-white/5 text-[11px] text-text-muted flex items-center gap-2">
            <span className="text-[#B727F5] font-semibold">Privacy Shield:</span>
            <span>Phone numbers, emails, and coordinates are automatically redacted.</span>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#B727F5] text-white rounded-tr-none shadow-[0_2px_12px_rgba(183,39,245,0.3)]'
                    : msg.isEmergency
                    ? 'bg-red-950/70 border-2 border-red-500 text-red-100 rounded-tl-none'
                    : 'bg-[#18181F] text-zinc-100 border border-white/10 rounded-tl-none'
                }`}
              >
                {/* Emergency Indicator */}
                {msg.isEmergency && (
                  <div className="flex items-center space-x-1.5 text-red-400 font-bold text-xs mb-2">
                    <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-red-400" />
                    <span>EMERGENCY DISPATCH PROTOCOL</span>
                  </div>
                )}

                <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>

                {/* Emergency Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.actions.map((act, i) =>
                      act.type === 'call' ? (
                        <a
                          key={i}
                          href={act.url}
                          className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-colors ${
                            act.urgent
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {act.label}
                        </a>
                      ) : (
                        <Link
                          key={i}
                          to={act.url}
                          onClick={onClose}
                          className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-colors ${
                            act.urgent
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {act.label}
                        </Link>
                      )
                    )}
                  </div>
                )}

                {/* Sources References */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px] text-text-muted">
                    <span className="font-semibold text-zinc-300">Sources: </span>
                    {msg.sources.map((s, idx) => (
                      <span key={s.id}>
                        {idx > 0 && ', '}
                        <span className="text-[#B727F5]">{s.title}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[10px] text-text-muted mt-1 px-1">{msg.timestamp}</span>

              {/* Follow-up / Suggestions Pills */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                  {msg.suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSend(sug)}
                      disabled={isLoading}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-white/10 hover:border-[#B727F5]/50 hover:bg-[#B727F5]/10 text-zinc-300 transition-all text-left"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && <AILoadingState status="Raksha AI is searching knowledge base..." />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 border-t border-white/10 bg-surface/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about safety, routes, SOS..."
              disabled={isLoading}
              className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#B727F5] transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-[#B727F5] text-white disabled:opacity-40 hover:bg-[#9E1FD5] transition-all flex items-center justify-center"
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssistantDrawer;
