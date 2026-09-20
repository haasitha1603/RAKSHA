import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Shield, ExternalLink } from 'lucide-react';
import { getEmergencyNumbers } from '@raksha/shared';

export const Footer: React.FC = () => {
  const numbers = getEmergencyNumbers('IN');

  return (
    <footer className="bg-surface border-t border-border mt-auto pt-10 pb-24 md:pb-12 text-sm text-text-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Emergency Hotlines Strip */}
        <div className="bg-primary-soft/50 rounded-2xl p-5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-primary" aria-hidden="true" />
            <h4 className="font-heading font-bold text-text text-sm">
              Emergency Hotlines (Direct Dial)
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {numbers.map((item) => (
              <a
                key={item.number}
                href={`tel:${item.number}`}
                aria-label={`Call ${item.label} on ${item.number}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border hover:border-primary transition-colors text-left"
              >
                <div>
                  <div className="text-[11px] font-medium text-text-muted">{item.label}</div>
                  <div className="text-base font-bold text-primary font-mono">{item.number}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-heading font-bold text-text">
              <Shield className="w-4 h-4 text-primary" />
              <span>RAKSHA</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Smart safe route navigation, continuous journey monitoring, and coordinated emergency bridge.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-text mb-2 text-xs uppercase tracking-wider">Features</h5>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/app/plan" className="hover:text-text">Safe Route Planning</Link></li>
              <li><Link to="/app/fake-call" className="hover:text-text">Fake Call Generator</Link></li>
              <li><Link to="/demo" className="hover:text-text">Demo Simulator</Link></li>
              <li><Link to="/what-if" className="hover:text-text">What-If Matrix</Link></li>
              <li><Link to="/responder" className="hover:text-text">Responder Console</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-text mb-2 text-xs uppercase tracking-wider">Legal &amp; Trust</h5>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/legal/privacy" className="hover:text-text">Privacy Policy</Link></li>
              <li><Link to="/legal/terms" className="hover:text-text">Terms of Service</Link></li>
              <li><Link to="/legal/cookies" className="hover:text-text">Cookies &amp; Local Storage</Link></li>
              <li><Link to="/legal/third-parties" className="hover:text-text">Third-Party Services</Link></li>
              <li><Link to="/legal/licenses" className="hover:text-text">Open Source Licences</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-text mb-2 text-xs uppercase tracking-wider">Contact</h5>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/contact" className="hover:text-text">Operator Identity &amp; Feedback</Link></li>
              <li><a href="mailto:contact@raksha.internal" className="hover:text-text">contact@raksha.internal</a></li>
              <li><span className="text-[11px] block mt-1">Hackathon Prototype. Not legal or medical advice.</span></li>
            </ul>
          </div>
        </div>

        {/* Prototype Honest Disclaimer Bottom Note */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-text-muted">
            &copy; {new Date().getFullYear()} Team Raksha. Built for Hackathon Prototype.
          </p>
          <p className="text-caution font-medium text-center sm:text-right">
            Prototype: police/hospital alerts are simulated. In a real emergency call 112.
          </p>
        </div>
      </div>
    </footer>
  );
};
