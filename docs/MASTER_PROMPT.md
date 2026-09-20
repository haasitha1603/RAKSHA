# RAKSHA (रक्षा) — FRONTEND & SYSTEM MASTER PROMPT

This document provides the definitive specification, architectural tenets, UI/UX design standards, and operational guidelines for the **RAKSHA** Women's Safety Navigation and Emergency Coordination System.

---

## 1. MISSION & CORE ARCHITECTURAL TENETS

1. **Safety-First Engineering**: Every UI interaction, background job, and data flow must fail safe. If connectivity degrades, cached offline breadcrumbs and pre-filled SMS emergency dials ensure travelers remain reachable.
2. **Deterministic Reliability**: Real-time corridor deviation (>150m), unexpected halts (>3 min), and battery thresholds (<10%) trigger automated verification checks with strict timeout escalation.
3. **Discreet & Stealth Mechanisms**: In coercive situations, travelers must have access to silent triggers—such as the Duress PIN (`4321`), which renders a realistic "SOS Cancelled" confirmation while silently escalating with `duress = 1` to emergency dispatch.
4. **Zero Fluff & Honesty**: All simulated systems (such as local law enforcement consoles and trauma hospital dispatch queues) must be explicitly identified as simulated in the traveler interface. Never deceive travelers about physical police presence or device capabilities.
5. **Privacy by Design**: Zero requirement for government IDs or tracking when off-duty. Data retention purge removes expired journey telemetry on a daily schedule.

---

## 2. DESIGN SYSTEM & VISUAL TOKENS

- **Primary Accent Color**: `#B727F5` (Vibrant Purple/Magenta). Used for safe corridor polylines, focus rings, interactive toggles, glowing badges, and primary action buttons.
- **Deep Black Dark Theme**: Background: `#050508`, Surface: `#0F0F14`, Elevated Surface: `#16161D`, Border: `#24242D`.
- **Emergency & SOS Palette**: High-Visibility Red (`#EF4444` / `#DC2626`). Reserved strictly for active SOS states, danger alerts, and 112 emergency hotline action items.
- **Typography**: 
  - Body: *Inter Variable* (neutral, highly legible under low-light conditions).
  - Headings: *Plus Jakarta Sans Variable* (bold, assertive, clean).
  - Telemetry & Latency Metrics: Monospace font for coordinates, timestamps, and confidence scores.
- **Kokonut UI Interactions**:
  - `HoldButton`: Raised 88px circular SOS trigger requiring a deliberate 3.0-second hold with an SVG progress ring and tactile vibration feedback.
  - `SpotlightCard`: Dashboard action cards featuring mouse-following radial highlights.
  - `BackgroundPaths`: Subtle floating SVG gradients providing visual depth without distracting from navigation.
  - `AILoadingState`: Concentric pulsating orb providing immediate visual confirmation during query resolution.

---

## 3. CORE FRONTEND WORKFLOWS & PAGES

### 3.1 Operational Dashboard (`/app`)
The primary authenticated hub consists of 8 operational elements:
1. **Greeting Header**: Displays battery status chip, online/offline network indicator, and direct access to notifications.
2. **Where to? Autocomplete**: Search bar with address suggestions and up to 3 recent destinations stored locally.
3. **Safe Navigation Map (45vh)**: Leaflet map rendering live GPS location, safe corridor paths, nearby police stations, hospitals, and well-lit commercial zones.
4. **Area Safety Summary**: Real-time score (0–100) reflecting street lighting density, open 24/7 businesses, and community reports.
5. **Quick Actions Grid (2x2)**:
   - Spotlight Card 1: *Plan Safe Route* (`/app/plan`).
   - Spotlight Card 2: *Synthesized Fake Call* (`/app/fake-call`).
   - Spotlight Card 3: *Community Hazard Report* (`/app/reports`).
   - Primary SOS: *Hold-to-Trigger SOS* (3-second circular progress ring).
6. **Active Journey Card**: Conditional widget displaying active trip ETA, deviation status, and quick-share link.
7. **Guardians Strip**: Status pill avatars indicating verification status (green = active, amber = pending) and "+ Add" trigger.
8. **Next Scheduled Fake Call Chip**: Real-time countdown timer with instant abort option.

### 3.2 Safe Route Planning (`/app/plan`)
- Interactive **Safety Slider** (0% Fast to 100% Safe): Dynamically factors street lighting, verified commercial corridors, and crime history against travel time.
- Dynamic Night Factor (1.6x multiplier applied between 20:00 and 06:00).
- Cab Mode: Captures driver name, vehicle plate, and provider details to attach to emergency incident packets.

### 3.3 Emergency & Discreet SOS (`/app/sos`)
- **Hold-to-Trigger**: 3-second hold to eliminate accidental pocket presses.
- **Stealth Duress PIN (`4321`)**: Secretly flags packet as coerced while dismissing on-screen alert.
- **Accelerometer Shake**: Detects sustained motion > 24 m/s² with 3 directional reversals.
- **Voice Trigger**: Web Speech API recognizes localized distress phrases (*"help me"*, *"bachao"*, *"stop the car"*).
- **Calculator Decoy (`/app/decoy`)**: Functional standard calculator; 2-second hold on `=` opens emergency tools.

### 3.4 Synthesized Fake Call (`/app/fake-call`)
- Zero external audio dependencies: Synthesizes realistic digital bell chimes and DTMF tones using the Web Audio API.
- Standby screen with digital clock and triple-tap emergency abort.
- Incoming call screen with answer slide, in-call dialogue synthesized via Speech Synthesis, and stealth duress keypad.

### 3.5 Help & Knowledge Base (`/app/help`)
- Instant keyword search across 45 categorized articles covering all operational edge cases.
- Categories: `Journey Safety`, `SOS & Emergency`, `Fake Calls`, `Privacy & Data`, `Technical & Offline`, `Guardians & Sharing`.
- System Boundaries section: Explicitly delineates what Raksha does vs. what it cannot do.
- **Raksha AI Assistant Drawer**:
  - **Zero-Latency Danger Pre-Check**: Instantly intercepts distress terms (*"follow"*, *"stalk"*, *"danger"*, *"help me now"*) to display 112 hotline and SOS actions without LLM latency.
  - **PII Redaction**: Regex-strips phone numbers, emails, and GPS coordinates prior to external processing.
  - **Multi-Provider Architecture**: Leverages Anthropic Claude Haiku when configured, falling back smoothly to deterministic keyword-matching across the knowledge base.

### 3.6 Safety Drills Matrix (`/app/drills`)
- Replaces static showcase demos with **14 deterministic operational scenarios** on real or preset routes:
  1. Route Deviation (>150m Excursion)
  2. Unexpected Stop (>3 min in Isolated Area)
  3. Missing Heartbeat (>60s Offline Dead Zone)
  4. Speed Anomaly (Erratic Surge / Collision)
  5. Manual SOS Trigger (3-Second Hold)
  6. Duress PIN SOS (Stealth Cancellation 4321)
  7. Discreet SOS (Silent Emergency Trigger)
  8. Sensor Shake SOS (Accelerometer Pattern)
  9. Battery Low Escalation (<10% Battery Alert)
  10. Geofence Boundary Breach
  11. Fake Call Evasion
  12. Guardian Acknowledgment & Escalation Stop
  13. Multi-Agency Simultaneous Dispatch
  14. Safe Arrival & Clean Session Closure
- 5-Step Workflow: Select Scenario ➔ Select Route ➔ Pre-Flight Review ➔ 4-Pane Synchronized Execution ➔ Pass/Fail Assertion Summary.
- 4 Synchronized Panes: Traveler Mobile Viewport, Guardian Telemetry Stream, Responder Console, System Event Log with live assertion checklist.
- Strict Suppression: All drill dispatches are tagged `[DRILL]` and suppress external Twilio SMS.

---

## 4. SECURITY & DATA PRIVACY CONSTRAINTS

1. **Authentication**: Secure `httpOnly`, `SameSite=Lax` cookies with dynamic `secure` flags based on HTTPS protocol or `x-forwarded-proto`.
2. **Session Persistence**: Statement caching prevents garbage collection crashes under Node v24; rate limiting protects login and signup routes.
3. **Database Architecture**: SQLite with Write-Ahead Logging (WAL) mode, structured migrations, and foreign key cascades.
4. **Zero Prohibited Terminology**: All marketing, showcase, and evaluation jargon is strictly banned. The system operates solely as a production-grade safety solution.
