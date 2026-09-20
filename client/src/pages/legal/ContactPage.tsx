import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '../../components/layout/Navbar.js';
import { Footer } from '../../components/layout/Footer.js';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <Helmet>
        <title>Contact &amp; Support — Raksha</title>
      </Helmet>

      <div className="min-h-screen bg-bg text-text flex flex-col justify-between">
        <Navbar />

        <main className="max-w-3xl mx-auto px-4 py-10 space-y-8 flex-1 w-full">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-soft text-primary font-bold text-xs rounded-full">
              <Mail className="w-3.5 h-3.5" />
              <span>Get in Touch</span>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-text">
              Contact &amp; Emergency Support
            </h1>
            <p className="text-xs text-text-muted">
              For technical inquiries, vulnerability disclosures, or municipal safety integration requests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-1">
              <Phone className="w-4 h-4 text-emergency" />
              <div className="font-heading font-bold text-sm text-text">Immediate Emergency</div>
              <p className="text-xs text-text-muted">National Police / Ambulance</p>
              <div className="font-mono text-xs font-bold text-emergency pt-1">Dial 112</div>
            </div>

            <div className="p-4 bg-surface border border-border rounded-2xl space-y-1">
              <Mail className="w-4 h-4 text-primary" />
              <div className="font-heading font-bold text-sm text-text">Engineering Team</div>
              <p className="text-xs text-text-muted">Security &amp; Bug Disclosures</p>
              <div className="font-mono text-xs text-primary pt-1">security@raksha.safety</div>
            </div>

            <div className="p-4 bg-surface border border-border rounded-2xl space-y-1">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <div className="font-heading font-bold text-sm text-text">Civic Partnership</div>
              <p className="text-xs text-text-muted">Municipal Smart City Hubs</p>
              <div className="font-mono text-xs text-text pt-1">Bengaluru, Karnataka</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs">
            <h2 className="font-heading font-bold text-base text-text mb-3">Send a Message</h2>
            {submitted ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="font-heading font-bold text-sm text-text">Message Received</h3>
                <p className="text-xs text-text-muted">
                  Thank you for reaching out. Our security team monitors incoming communications around the clock.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we assist you or collaborate?"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-input-bg text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};
