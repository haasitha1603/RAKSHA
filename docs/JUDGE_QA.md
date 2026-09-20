# RAKSHA — Hackathon Judge Q&A & Technical Defense

This document provides direct, honest, engineering-grounded answers to tough technical, architectural, and ethical questions regarding Raksha.

---

### 1. Why build Raksha as a Progressive Web App (PWA) instead of a native iOS/Android application?
**Answer:**
In emergency safety, **friction equals failure**.
1. **Zero-Install Guardian Onboarding:** When a traveller triggers an emergency, guardians receiving an SMS or WhatsApp notification cannot afford a 40MB app download, account registration, and device permission flow. A PWA tracking link (`/g/:token`) opens instantly on any browser, desktop, or mobile device in under 800 milliseconds.
2. **Immediate Web Access:** Anyone borrowing a phone, using a public kiosk, or using a basic smartphone can access Raksha immediately without app store approvals or storage limits.
3. **PWA Capabilities:** With modern Web APIs, Raksha accesses GPS geolocation, the device battery API, accelerometer motion, audio synthesis, speech recognition, IndexedDB storage, and background sync via Service Workers.

---

### 2. How do you prevent false positives from overwhelming emergency services and guardians?
**Answer:**
False alarms destroy user trust and waste public responder resources. Raksha employs a 3-stage validation pipeline:
1. **Physical Intentionality:** The primary SOS button requires a deliberate 3-second hold with an animated circular progress ring, haptic pulses, and audio cues before armed.
2. **Algorithmic Signal Conditioning:**
   - **Kalman-inspired speed jump rejection:** Filters out GPS multipath artifacts (e.g. instantaneous 150 km/h jumps).
   - **Corridor Hysteresis:** Off-route deviations require sustained deviation (>150m for over 2 consecutive updates) before triggering.
   - **Arterial Congestion Awareness:** Sudden stops along recognized arterial highways during daytime hours are not treated as kidnap stops.
3. **Interactive 30-Second Safety Check:** Before any automated escalation occurs, a prominent Safety Check modal sounds on the device with vibration. If the user is safe, entering their 4-digit Safety PIN dismisses it. Only unacknowledged timeouts escalate.

---

### 3. What is the Duress PIN and what prevents an attacker from knowing it was used?
**Answer:**
If a victim is cornered, threatened with a weapon, or forced by an attacker to unlock their phone and abort an active SOS, entering a normal PIN stops all alerts.

Raksha provides two distinct PINs:
- **Safety PIN (`1234`):** Truly cancels the alarm.
- **Duress PIN (`4321`):** Secretly flags the incident as `duress_escalated` (`duress: 1`) on the backend while displaying a convincing, calm screen stating *"SOS Cancelled — Notifications dismissed."*

To the attacker watching the screen, the emergency appears aborted. In reality, the PulseRouteAI Emergency Bridge continues live-streaming the victim's location to responders and guardians with an explicit stealth duress alert flag.

---

### 4. How does PulseRouteAI differ from existing emergency apps (e.g., Life360, Citizen, government 112 apps)?
**Answer:**
Existing applications follow a **sequential call tree**:
```
User triggers SOS ➔ 1 Guardian notified ➔ Guardian is asleep or delays 15m ➔ Guardian calls 112 ➔ Police dispatcher asks for location ➔ Police radios hospital = 25 to 45 minutes total latency.
```
PulseRouteAI implements a **parallel emergency broadcast**:
```
User triggers SOS ➔ Structured Emergency Packet created ➔ Dispatched simultaneously in < 800ms to:
  1. All accepted Emergency Guardians (WebSocket + SMS)
  2. Nearest Police Control Room (Dispatch Console)
  3. Nearest Trauma Hospital Casualty Desk (Dispatch Console)
```
Each responder instantly receives identical ground-truth context: exact coordinates, landmark address, live speed, remaining battery, and cab registration plate.

---

### 5. How does Raksha protect user privacy under India's Digital Personal Data Protection (DPDP) Act 2023?
**Answer:**
1. **Data Minimization:** Raksha does not track users when no journey is active. Tracking occurs strictly between user-initiated start and completion.
2. **Zero Third-Party Telemetry:** No Google Analytics, no Facebook SDK, no advertising cookies. Fonts and icons are 100% self-hosted.
3. **24-Hour Automated Breadcrumb Purge:** High-frequency GPS waypoints and breadcrumb logs are automatically deleted after 24 hours via server retention cron jobs (`server/src/jobs/retentionPurge.ts`).
4. **Self-Serve Portability & Hard Deletion:** Users can download their complete history archive in JSON format or trigger a permanent cascade deletion erasing all account records and database entries.

---

### 6. What happens if the phone loses internet connectivity or travels through a tunnel?
**Answer:**
1. **Client-side Resilience:** The custom Service Worker detects network disconnects, buffers GPS fixes in IndexedDB, and maintains local safety check countdowns. When connectivity restores, queued breadcrumbs are submitted with actual timestamps.
2. **Server-side Watchdog:** The backend watchdog job runs every 5 seconds. If an active journey ceases sending heartbeat pings beyond the user's safety profile threshold (e.g., 60s in strict mode), the server marks the journey as *connection_dropped* and notifies guardians of the last known coordinates.

---

### 7. How does the Route Safety Engine calculate risk scores?
**Answer:**
A route is sampled every 100 meters along its polyline. Each waypoint is scored against four spatial layers:
1. **Street Lighting (30%):** Proximity to unlit or poorly lit streets (from OpenStreetMap tag analysis).
2. **Crime Incident Clusters (30%):** Distance to historical harassment or theft hotspots.
3. **Isolation & Activity Density (20%):** Proximity to open commercial areas, 24x7 pharmacies, and transit hubs.
4. **Community Reports (20%):** Active crowdsourced hazard reports weighted by confirmation score.

A **Dynamic Night Multiplier (1.6x)** amplifies lighting and isolation penalties between 20:00 and 06:00. The safety slider adjusts the optimization weight from 100% fastest to 100% safest.

---

### 8. What prevents malicious actors from spamming or vandalizing community safety reports?
**Answer:**
1. **Exponential Half-Life Decay:** Reports lose 50% of their confidence weight every 24 hours unless re-confirmed by other unique users. After 14 days, reports expire completely.
2. **Geographic Proximity Verification:** Confirmations and denials can only be submitted by users within 1 km of the reported coordinates.
3. **NLP Keyword Classifier:** Automatically categorizes descriptions into standardized types (`lighting`, `unsafe_road`, `suspicious`, `harassment`), preventing misleading freeform tags.

---

### 9. What are the honest prototype limitations of this submission?
**Answer:**
We believe in engineering integrity:
1. **Responder Integration is Simulated:** Municipal police departments and hospital casualty desks operate on internal emergency radio networks. Direct API integration with India's ERSS 112 requires government memorandums of understanding (MoUs). This prototype simulates the receiver consoles via the **Responder Console** (`/responder`) to demonstrate the dispatch workflow.
2. **SMS Gateway:** Dispatched SMS alerts are routed to a mock in-memory outbox (`/demo` inspector) to prevent excessive Twilio API billing during evaluation.
3. **iOS Safari Background Execution:** While Android WebAPKs support full background location tracking, iOS Safari throttles location updates if the screen is locked. Raksha mitigates this with Screen Wake Lock API and audio loop keep-alive techniques.

---

### 10. How will Raksha be deployed and sustained financially in the real world?
**Answer:**
Raksha is designed as open public safety infrastructure:
1. **Civic / Municipal Partnership:** Integrated into Smart City command centers and local Police 112 dispatch infrastructure.
2. **Ride-Hailing & Logistics Integration:** Ride-hailing platforms (Uber, Ola, Rapido) and delivery apps can integrate the route safety scoring API as an added safety verification layer.
3. **Zero Monetization of User Telemetry:** Core consumer features, emergency SOS, and guardian streams will always remain 100% free and ad-free.
