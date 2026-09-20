# RAKSHA — Compliance, Security & Accessibility Audit

This document details Raksha's adherence to accessibility standards, data protection legislation, security controls, and open-source license obligations.

---

## 1. Privacy & Data Protection Compliance

### Digital Personal Data Protection (DPDP) Act 2023 & GDPR
| Principle | Implementation in Raksha | Audit Verification |
| :--- | :--- | :--- |
| **Data Minimization** | Location tracking operates strictly during active user journeys or SOS events. No passive background tracking when idle. | Verified in `server/src/engine/riskEngine.ts` |
| **Purpose Limitation** | Coordinates are used exclusively for route scoring and emergency dispatch. Telemetry is never used for advertising or profiling. | Verified in `client/src/pages/legal/PrivacyPage.tsx` |
| **Storage Limitation (24h Purge)** | High-frequency GPS points and breadcrumbs are permanently deleted 24 hours after trip completion. | Automated cron job: `server/src/jobs/retentionPurge.ts` (tested in `retention.test.ts`) |
| **Right to Erasure & Portability** | Users can export their full data archive in JSON format or trigger a permanent hard delete of all account records and contacts. | Endpoints: `GET /api/auth/export`, `DELETE /api/auth/me` |
| **Age Verification** | 18+ explicit age verification gate and unbundled privacy consent required during registration. | Schema: `signupSchema` in `@raksha/shared` |

### Zero Third-Party Telemetry
- **No Third-Party Analytics:** Zero instances of Google Analytics, Segment, Amplitude, or Meta Pixel.
- **Self-Hosted Typography:** `@fontsource-variable/inter` and `@fontsource-variable/plus-jakarta-sans` are bundled locally. No calls to Google Fonts CDN.
- **Local Asset Serving:** Leaflet map icons and custom SVGs are served from local public assets.

---

## 2. Web Content Accessibility Guidelines (WCAG 2.1 AA)

| Requirement | Implementation & Verification | Status |
| :--- | :--- | :---: |
| **Contrast Ratio (1.4.3)** | Text to background contrast ≥ 4.5:1 across both light and dark themes. Text colors (`var(--text)`, `var(--text-muted)`) verified with high contrast tokens. | **PASS** |
| **Touch Target Size (2.5.5)** | All interactive buttons and inputs meet the 44×44px minimum target. Primary SOS button is oversized to 88×88px with a 3-second hold ring. | **PASS** |
| **Keyboard Navigation (2.1.1)** | All pages feature visible `:focus-visible` outline rings (`3px solid var(--primary)` with `2px offset`). `SkipLink` component enables keyboard skip to main content. | **PASS** |
| **Screen Reader Support (4.1.2)** | Semantic HTML elements (`<nav>`, `<main>`, `<header>`, `<footer>`). ARIA live regions (`aria-live="polite"` and `aria-live="assertive"`) announce safety check timers and SOS dispatches. | **PASS** |
| **Reduced Motion (2.3.3)** | CSS media query `@media (prefers-reduced-motion: reduce)` sets animation and transition durations to `0.01ms`. | **PASS** |
| **Responsive Viewports (1.4.10)** | Zero horizontal scrolling from 320px mobile screens up to 3840px 4K displays. | **PASS** |

---

## 3. Security Architecture & Controls

1. **Content Security Policy (CSP):**
   - Configured via `helmet` in Express backend:
     - `default-src 'self'`
     - `script-src 'self'`
     - `style-src 'self' 'unsafe-inline'`
     - `img-src 'self' data: blob: https://tile.openstreetmap.org`
     - `connect-src 'self' ws: wss:`
2. **Authentication & Session Management:**
   - Passwords hashed using bcrypt with salt factor 10.
   - Session tokens stored exclusively in `HTTP-only`, `Secure`, `SameSite=Lax` cookies (`raksha_session`). No localStorage token exposure.
3. **Input Validation:**
   - Strict Zod schemas validate all API request bodies before reaching business logic.
4. **Rate Limiting:**
   - `express-rate-limit` guards against brute-force attacks on `/api/auth/*` endpoints (max 10 attempts per window).

---

## 4. Open Source License Compliance

- **Dependency Inventory:** 775 open source dependencies audited via `license-checker`.
- **License Distribution:** All packages are released under permissible open-source licenses:
  - MIT License: ~88%
  - Apache 2.0: ~7%
  - BSD-2/3-Clause: ~4%
  - ISC: ~1%
- **Notice & Attribution:** Complete package attributions, repositories, and license texts are accessible directly in-app at `/legal/licenses`.

---

## 5. Automated Verification Checklist

All pre-flight checks are verified via automated scripts:
```bash
node scripts/check-links.mjs
```
- [x] All 8 required static assets present (PWA icons, maskable, og-image, robots.txt).
- [x] All 22 routes registered and verified in `App.tsx`.
- [x] Banned vendor keywords scan: **0 matches** found across entire repository.
- [x] Production bundle and Service Worker precache verified.
- [x] All 13 unit tests passed with code 0.
