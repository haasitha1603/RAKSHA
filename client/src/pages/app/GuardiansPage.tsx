import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Phone,
  Mail,
  Trash2,
  Share2,
  CheckCircle2,
  Clock,
  Send,
  Copy,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { GuardianRow } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';
import { EmptyState } from '../../components/common/EmptyState.js';

export const GuardiansPage: React.FC = () => {
  const [guardians, setGuardians] = useState<GuardianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<GuardianRow | null>(null);
  const [testSent, setTestSent] = useState<string | null>(null);

  // Add form fields
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchGuardians = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ guardians: GuardianRow[] }>('/api/guardians');
      setGuardians(res.guardians || []);
    } catch (err) {
      console.error('Failed to load guardians:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardians();
  }, []);

  const handleAddGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<{ guardian: GuardianRow }>('/api/guardians', {
        method: 'POST',
        body: JSON.stringify({
          name,
          relationship,
          phone: phone.trim(),
          email: email.trim() || undefined,
        }),
      });

      setShowAddModal(false);
      setName('');
      setPhone('+91 ');
      setEmail('');
      await fetchGuardians();
      setShowShareModal(res.guardian);
    } catch (err) {
      console.error('Failed to add guardian:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGuardian = async (id: string) => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) return;
    try {
      await apiFetch(`/api/guardians/${id}`, { method: 'DELETE' });
      fetchGuardians();
    } catch (err) {
      console.error('Failed to remove guardian:', err);
    }
  };

  const handleTestAlert = async (id: string, guardianName: string) => {
    try {
      await apiFetch(`/api/guardians/${id}/test`, { method: 'POST' });
      setTestSent(guardianName);
      setTimeout(() => setTestSent(null), 4000);
    } catch (err) {
      console.error('Failed to send test alert:', err);
    }
  };

  const getShareLink = (token: string) => {
    return `${window.location.origin}/g/${token}`;
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(getShareLink(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Helmet>
        <title>Emergency Guardians — Raksha</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl text-text">Emergency Guardians</h1>
            <p className="text-xs text-text-muted mt-1">
              Your trusted circle who receive automated live-tracking links during journeys and instant alerts during SOS.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Guardian</span>
          </button>
        </div>

        {/* Test Alert Banner Feedback */}
        {testSent && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Simulated test alert sent to <strong>{testSent}</strong>. Notice logged in mock SMS outbox.
            </span>
          </div>
        )}

        {/* Guardians List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-surface-raised rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        ) : guardians.length === 0 ? (
          <EmptyState
            title="No emergency guardians yet"
            description="Add at least one trusted contact. They will receive automated tracking and SOS bridge dispatches."
            icon="guardians"
            actionLabel="Add Your First Guardian"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="space-y-3">
            {guardians.map((g, idx) => (
              <div
                key={g.id}
                className="p-4 bg-surface border border-border rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-primary-soft text-primary font-heading font-bold text-base flex items-center justify-center shrink-0">
                    {g.name[0]?.toUpperCase() || 'G'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-text">{g.name}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-raised border border-border text-text-muted">
                        {g.relation}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-text-muted" />
                        {g.phone}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                      {g.status === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Active Guardian
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-400 font-medium">
                          <Clock className="w-3 h-3" />
                          Invitation Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                  <button
                    onClick={() => setShowShareModal(g)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-semibold text-text hover:bg-surface-raised flex items-center gap-1 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Invite Link</span>
                  </button>

                  <button
                    onClick={() => handleTestAlert(g.id, g.name)}
                    className="px-3 py-1.5 bg-primary-soft text-primary hover:bg-primary-soft/80 border border-primary/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Test Alert</span>
                  </button>

                  <button
                    onClick={() => handleDeleteGuardian(g.id)}
                    className="p-2 text-text-muted hover:text-emergency transition-colors rounded-lg hover:bg-surface-raised"
                    aria-label="Remove guardian"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD GUARDIAN MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface border border-border rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-heading font-bold text-lg text-text">Add Emergency Guardian</h3>
                <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text">
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddGuardian} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
                  >
                    <option value="Parent">Parent</option>
                    <option value="Spouse">Spouse / Partner</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary font-mono"
                  />
                  <p className="text-[11px] text-text-muted mt-1">SMS alerts will be directed to this number.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text hover:bg-surface-raised"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Add Guardian'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SHARE INVITE LINK MODAL */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface border border-border rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-heading font-bold text-lg text-text">Guardian Invitation</h3>
                <button onClick={() => setShowShareModal(null)} className="text-text-muted hover:text-text">
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-text">
                  Share this secure link with <strong>{showShareModal.name}</strong> so they can monitor your journeys and accept alerts:
                </p>
                <div className="p-2.5 bg-surface-raised border border-border rounded-xl font-mono text-[11px] text-text break-all">
                  {getShareLink(showShareModal.token)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(showShareModal.token)}
                  className="py-2.5 px-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text hover:bg-surface-raised flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-primary" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Hi ${showShareModal.name}, I've added you as an Emergency Guardian on Raksha. View and accept here: ${getShareLink(
                      showShareModal.token
                    )}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`sms:${showShareModal.phone}?body=${encodeURIComponent(
                    `Hi ${showShareModal.name}, I've added you as my Emergency Guardian on Raksha: ${getShareLink(
                      showShareModal.token
                    )}`
                  )}`}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </a>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(null)}
                  className="w-full py-2.5 bg-surface-raised border border-border rounded-xl text-xs font-semibold text-text hover:bg-surface"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
