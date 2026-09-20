import React, { useState, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  MapPin,
  AlertTriangle,
  Menu,
  Shield,
  PhoneCall,
  Users,
  History,
  Settings,
  Calculator,
  Compass,
  FileText,
  X,
} from 'lucide-react';
import { useSosStore } from '../../stores/sosStore.js';
import { useJourneyStore } from '../../stores/journeyStore.js';

export const BottomNav: React.FC = () => {
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { triggerSos } = useSosStore();
  const { currentLocation, activeJourney } = useJourneyStore();

  // Hide bottom bar on special full-screen screens
  const isSpecialScreen =
    location.pathname.startsWith('/app/fake-call/incoming') ||
    location.pathname.startsWith('/app/fake-call/standby') ||
    location.pathname === '/app/decoy';

  if (isSpecialScreen) return null;

  const handleSosStart = () => {
    startTimeRef.current = Date.now();
    setHoldProgress(0);

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    holdTimerRef.current = window.setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / 1500) * 100);
      setHoldProgress(pct);

      if (elapsed >= 1500) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        startTimeRef.current = null;
        setHoldProgress(0);

        // Trigger SOS
        const loc = currentLocation || { lat: 28.6139, lng: 77.2090, acc: 15 };
        triggerSos({
          journeyId: activeJourney?.id,
          trigger: 'hold',
          discreet: false,
          location: loc,
        }).then(() => {
          navigate('/app/sos');
        }).catch(() => {
          navigate('/app/sos');
        });
      }
    }, 40);
  };

  const handleSosEnd = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (startTimeRef.current && Date.now() - startTimeRef.current < 400) {
      // Tap detected -> navigate to SOS screen directly
      navigate('/app/sos');
    }
    startTimeRef.current = null;
    setHoldProgress(0);
  };

  return (
    <>
      {/* Mobile Tab Bar */}
      <nav
        aria-label="App Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-lg border-t border-border safe-bottom shadow-lg"
      >
        <div className="flex items-center justify-around h-16 px-2 relative">
          {/* Home */}
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-full text-xs font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </NavLink>

          {/* Plan Route */}
          <NavLink
            to="/app/plan"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-full text-xs font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <MapPin className="w-5 h-5 mb-0.5" />
            <span>Plan</span>
          </NavLink>

          {/* Raised 88px SOS Button */}
          <div className="relative -top-5 flex flex-col items-center">
            <button
              onMouseDown={handleSosStart}
              onMouseUp={handleSosEnd}
              onTouchStart={handleSosStart}
              onTouchEnd={handleSosEnd}
              aria-label="Emergency SOS. Press and hold for 1.5 seconds or tap to open SOS panel"
              className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#B91C1C] to-[#DC2626] text-white flex flex-col items-center justify-center shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400 select-none touch-none active:scale-95 transition-transform"
            >
              {/* Circular SVG Progress Ring */}
              {holdProgress > 0 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="6"
                    strokeDasharray="289"
                    strokeDashoffset={289 - (289 * holdProgress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <span className="font-heading font-black text-xl tracking-wider">SOS</span>
              <span className="text-[10px] font-bold opacity-90">HOLD</span>
            </button>
          </div>

          {/* Community Reports */}
          <NavLink
            to="/app/reports"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-full text-xs font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <AlertTriangle className="w-5 h-5 mb-0.5" />
            <span>Reports</span>
          </NavLink>

          {/* More Sheet Trigger */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            aria-label="Open more menu"
            className="flex flex-col items-center justify-center w-14 h-full text-xs font-medium text-text-muted hover:text-text transition-colors"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Desktop Sidebar Layout */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-surface border-r border-border z-20">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-heading font-extrabold text-lg text-text">RAKSHA</span>
          </div>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-text hover:bg-surface-raised'
              }`
            }
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/app/plan"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-text hover:bg-surface-raised'
              }`
            }
          >
            <MapPin className="w-4 h-4" />
            <span>Plan Journey</span>
          </NavLink>

          <NavLink
            to="/app/guardians"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-text hover:bg-surface-raised'
              }`
            }
          >
            <Users className="w-4 h-4" />
            <span>Guardians</span>
          </NavLink>

          <NavLink
            to="/app/fake-call"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-text hover:bg-surface-raised'
              }`
            }
          >
            <PhoneCall className="w-4 h-4" />
            <span>Fake Call</span>
          </NavLink>

          <NavLink
            to="/app/reports"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-text hover:bg-surface-raised'
              }`
            }
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Safety Reports</span>
          </NavLink>

          <NavLink
            to="/app/history"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-text hover:bg-surface-raised'
              }`
            }
          >
            <History className="w-4 h-4" />
            <span>Journey History</span>
          </NavLink>

          <NavLink
            to="/app/decoy"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-text hover:bg-surface-raised'
              }`
            }
          >
            <Calculator className="w-4 h-4" />
            <span>Decoy Calculator</span>
          </NavLink>

          <div className="pt-4 mt-4 border-t border-border">
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-text hover:bg-surface-raised'
                }`
              }
            >
              <Settings className="w-4 h-4" />
              <span>Settings &amp; PINs</span>
            </NavLink>

            <NavLink
              to="/app/drills"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Safety Drills</span>
            </NavLink>

            <NavLink
              to="/app/help"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Help &amp; Queries</span>
            </NavLink>
          </div>
        </div>

        {/* Desktop SOS Trigger */}
        <div className="p-4 border-t border-border">
          <NavLink
            to="/app/sos"
            className="w-full flex items-center justify-center gap-2 py-3 bg-emergency hover:bg-red-700 text-white font-heading font-bold rounded-xl shadow-md transition-colors"
          >
            <span>EMERGENCY SOS</span>
          </NavLink>
        </div>
      </aside>

      {/* Mobile More Sheet */}
      {moreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-surface rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 border-t border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-heading font-bold text-lg text-text">More Features</h3>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="p-1 rounded-full text-text-muted hover:text-text"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <NavLink
                to="/app/guardians"
                onClick={() => setMoreSheetOpen(false)}
                className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-primary transition-colors"
              >
                <Users className="w-5 h-5 text-primary mb-1.5" />
                <div className="font-semibold text-sm text-text">Guardians</div>
                <div className="text-xs text-text-muted">Magic links &amp; contacts</div>
              </NavLink>

              <NavLink
                to="/app/fake-call"
                onClick={() => setMoreSheetOpen(false)}
                className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-primary transition-colors"
              >
                <PhoneCall className="w-5 h-5 text-primary mb-1.5" />
                <div className="font-semibold text-sm text-text">Fake Call</div>
                <div className="text-xs text-text-muted">Schedule an exit</div>
              </NavLink>

              <NavLink
                to="/app/history"
                onClick={() => setMoreSheetOpen(false)}
                className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-primary transition-colors"
              >
                <History className="w-5 h-5 text-primary mb-1.5" />
                <div className="font-semibold text-sm text-text">Journey History</div>
                <div className="text-xs text-text-muted">Past routes &amp; events</div>
              </NavLink>

              <NavLink
                to="/app/decoy"
                onClick={() => setMoreSheetOpen(false)}
                className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-primary transition-colors"
              >
                <Calculator className="w-5 h-5 text-primary mb-1.5" />
                <div className="font-semibold text-sm text-text">Decoy Screen</div>
                <div className="text-xs text-text-muted">Working calculator</div>
              </NavLink>

              <NavLink
                to="/app/settings"
                onClick={() => setMoreSheetOpen(false)}
                className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-primary transition-colors"
              >
                <Settings className="w-5 h-5 text-primary mb-1.5" />
                <div className="font-semibold text-sm text-text">Settings &amp; PINs</div>
                <div className="text-xs text-text-muted">Safety &amp; Duress PINs</div>
              </NavLink>

              <NavLink
                to="/app/drills"
                onClick={() => setMoreSheetOpen(false)}
                className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-primary transition-colors"
              >
                <Compass className="w-5 h-5 text-primary mb-1.5" />
                <div className="font-semibold text-sm text-text">Safety Drills</div>
                <div className="text-xs text-text-muted">Simulate scenarios</div>
              </NavLink>
            </div>

            <div className="pt-2">
              <a
                href="tel:112"
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-100 dark:bg-red-950/40 text-emergency font-bold rounded-xl border border-red-300 dark:border-red-900"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Emergency 112</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
