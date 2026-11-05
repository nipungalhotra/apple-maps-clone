# RoadReady — Production Readiness Report

**Date:** 2026-11-04 · **Commit:** `9e52140` (main) · **Scope:** web (React/Vite), API (`server/index.js`), Capacitor iOS/Android shells

## Verdict: NOT production-ready

RoadReady works as a polished **demo/prototype**. It is not a production product yet. The backend has no auth or multi-user model and cannot be reached in its own deploy config. Payments are simulated. Several user-facing claims ("DMV-Certified", "Approved for Submission", live traffic) are backed by fabricated data, which creates legal and app-store risk.

| Area | Status |
|---|---|
| Build | ✅ `vite build` passes (warning: 1.38 MB JS bundle, 379 KB gzip) |
| Tests | ❌ None (0 test files in project; no test script) |
| Lint / types | ❌ No ESLint, no TypeScript, no CI |
| Security | ❌ XSS, no auth, open CORS, 1 critical + 1 high dep vuln |
| Backend | ❌ Single global user, JSON file storage, unreachable on Render |
| Payments | ❌ Fake; Pro unlock is a localStorage flag |
| Data integrity / legal | ❌ Fabricated DMV log, fake traffic, synthetic practice zones |
| Mobile | ⚠️ App ID and name mismatch, uses "Apple Maps" trademark, web assets not synced |
| Accessibility | ❌ 0 `aria-*` attributes across 77 buttons; zoom disabled |

---

## P0 fix status (updated 2026-11-04)

| # | Blocker | Status |
|---|---|---|
| 1 | Server bound to 127.0.0.1 | ✅ Fixed: `HOST` defaults to `0.0.0.0` |
| 2 | Frontend never reaches API in prod/native | ✅ Fixed in code: all calls go through `apiFetch()` → `VITE_API_BASE_URL`. **You must set `VITE_API_BASE_URL` in Vercel and for native builds** |
| 3 | Missing booking endpoint / fake confirmation | ✅ Fixed: `POST /api/instructors/book` added and validated; the UI shows an error on failure, the copy now says "Request Sent, instructor must confirm", fake prefilled student data is removed, and the permit number is no longer collected. ⚠️ Instructors are still not notified (needs email/SMS) |
| 4 | Global shared user data | ✅ Fixed: real accounts (Supabase Auth, tokens verified on the server) and a Postgres database replace the JSON files. Guests are still supported by device ID; their data moves into the account on sign-in. In-app account deletion is included. **Needs a Supabase project and `DATABASE_URL` to be configured** (see `docs/ACCOUNTS_AND_DATABASE.md`) |
| 5 | Fake payments | ✅ Fixed in code: Stripe Checkout on the web and in-app purchases via RevenueCat on iOS/Android, verified by the server (signed Stripe webhooks; RevenueCat REST API) with renewals, cancellations and refunds handled. Simulated checkout is dev-only. **Needs Stripe, RevenueCat and store products set up** (see `docs/PAYMENTS.md`) |
| 6 | Fabricated DMV-certified log | ✅ Fixed: replaced with a blank, clearly-disclaimed personal worksheet; all "Official/Certified/DL-50HRS" claims are removed from the UI |
| 7 | XSS in map markers | ✅ Fixed: marker text is HTML-escaped |
| 8 | Vulnerable deps | ✅ Fixed: `npm audit` reports 0 vulnerabilities (maplibre-gl 5 → 6.16, with the worker bundled by Vite) |
| 9 | Apple trademark / ID mismatch | ✅ Fixed: the app is named RoadReady, the bundle/package ID is `com.roadready.app` on both platforms, the unused "Always" location permission is removed, and Siri/Apple Maps are removed from visible UI text |

**After merging `main` (modular server):** the fixes above were moved into `server/routes/*`, with shared helpers in `server/lib/storage.js`. A new route lives at `server/routes/instructors.js`. CORS now uses `ALLOWED_ORIGINS` (`CORS_ORIGINS` is still accepted), and the server tests cover the new behavior.

✅ **Background location and plain-HTTP settings from `main` removed:** iOS `NSAllowsArbitraryLoads`, `UIBackgroundModes: location` and `NSLocationAlwaysUsageDescription`, plus Android `usesCleartextTraffic` and the background/foreground-service location permissions. The app only reads location while it is open. `NSLocationAlwaysAndWhenInUseUsageDescription` stays, because `@capacitor/geolocation` requires it; it uses the same while-in-use wording, and the prompt is never shown. `NSAllowsLocalNetworking` stays so local dev live-reload keeps working.

✅ **P1 fixes:**
- **Navigation HUD index mismatch** is fixed. The simulated GPS position is now converted to the current maneuver step by distance driven (`getStepIndexForCoordinate`), so turn instructions and voice prompts move through the steps. The footer reads "Step X of N".
- **Synthetic practice grounds outside SF** are removed. Outside the curated San Francisco area the app now shows "No verified practice grounds here yet" instead of placing made-up grounds at fixed GPS offsets.
- **Map attribution** is restored (compact "© OpenStreetMap contributors © CARTO").
- **Lead export exposure and `npm audit`** were already fixed with the P0 work.

✅ **Sample and made-up content removed:**
- the instructor marketplace (invented instructors with fake phone and licence numbers) and its booking endpoint
- the insurance offers (real insurers' brands with no affiliate deals) and their lead-tracking endpoints
- seeded community reviews
- invented ratings, review counts, opening hours and stock photos on places
- "98% Safe" labels, now an explicitly estimated beginner rating with a disclaimer
- false "live" traffic and weather claims

Also hardened: input validation and length limits, a per-IP rate limit on writes, JSON body limit (16 KB), atomic file writes, CORS allowlist (`CORS_ORIGINS`), basic security headers, generic error responses, a JSON 404 for unknown `/api` routes, graceful shutdown, `server/storage/` removed from git, Capacitor `cleartext` off, and the duplicate CDN MapLibre CSS removed.

---

## P0 — Blockers (original findings)

### 1. Backend binds to `127.0.0.1`, so it is unreachable on Render
`server/index.js:375` has `app.listen(PORT, '127.0.0.1', ...)`. On Render or any container host, the service must listen on `0.0.0.0`. The health check at `/api/health` will fail and the deploy will never go live. **Fix:** `app.listen(PORT, '0.0.0.0')`, or omit the host.

### 2. Frontend never reaches the backend in production
- `src/services/apiConfig.js` defines `apiUrl()` / `VITE_API_BASE_URL`, but **nothing uses it**. All 9 `fetch` calls hardcode relative `/api/...` (`App.jsx:93,234`, `AppleMap.jsx:334`, `LearnerModePanel.jsx:62,126`, `InsuranceSavingsModal.jsx:32`, `InstructorBookingModal.jsx:49`, `subscriptionService.js:60,77`).
- `vercel.json` rewrites `/(.*)` → `/index.html` and has no `/api` proxy. On Vercel, every API call returns the HTML page. The `res.json()` calls then throw, and the errors are silently swallowed.
- Inside the Capacitor apps, relative `/api` resolves to the WebView's local origin, so the API is never reached there either.

### 3. Missing endpoint: `/api/instructors/book`
`InstructorBookingModal.jsx:49` POSTs to a route that does not exist on the server, so it returns 404. The `catch` block shows a **"booking confirmed" screen anyway**. Users believe they booked a paid lesson ($65–$150) when nothing was sent to anyone. The student's name, phone and permit number are also collected and then dropped.

### 4. No authentication or per-user data; all users share one record
`passport.json` and `subscriptions.json` are single global objects:
- If any visitor POSTs `/api/subscription/upgrade`, **everyone** becomes Pro. If anyone POSTs `/api/subscription/reset`, everyone is downgraded.
- Everyone shares the same logged hours and badges.
- `GET /api/affiliates/insurance-clicks` publicly exposes every lead record (driver age, hours, partner).

### 5. Payments are simulated; Pro can be unlocked for free
`subscriptionService.upgradeToPro()` writes `{isPro:true}` to localStorage after a `setTimeout`. No payment processor is involved. Anyone can run `localStorage.setItem('apple_maps_learner_subscription','{"isPro":true}')`. The server also accepts any client-supplied `tier`/`price`. Mobile stores additionally **require** StoreKit / Google Play Billing for digital unlocks.

### 6. Fabricated "Official DMV-Certified" practice log
`PrintableDmvLogModal.jsx` prints hardcoded sessions (dates, locations, supervisor "M. Rivera") that the user never drove. It also prints a fake hash `#RR-9482-CA` and the text "Approved for Submission at Road Test" / "Form DL-50HRS". Day and night hours are derived arithmetically (`loggedHours - 4`, `loggedHours * 0.25`), not from real sessions. Submitting this to a DMV could be document falsification, and the app has no DMV certification. **This is the highest legal risk in the app.** Remove the certification language and generate the log only from real, user-entered sessions.

### 7. XSS through map markers
`AppleMap.jsx:245` interpolates `selectedPlace.name` into `el.innerHTML`. For searches with no preset match, that name comes from the third-party Photon/OSM geocoder (`searchService.js`). Anyone can edit OSM place names. The same pattern appears at lines 280, 413 and 503. **Fix:** build the DOM with `textContent`, or escape the values.

### 8. Vulnerable dependencies (`npm audit`: 1 critical, 1 high, 7 moderate)
- **critical** `maplibre-gl` (direct): XSS sanitizer bypass in `DOM.sanitize()`
- **high** `body-parser` (via express): DoS through compressed bodies
- moderate: `vite` (`fs.deny` bypass), `uuid`/`xcode` (via `@capacitor/cli`), `minimatch`, `glob`, `rimraf`

Run `npm audit fix` and upgrade `maplibre-gl`.

### 9. Trademark and branding
The native apps still ship as **"Apple Maps Learner"** (`Info.plist` `CFBundleDisplayName`, Android `strings.xml`). Their bundle ID is `com.applemap.learner`, while `capacitor.config.json` says `com.roadready.app`. The repo name, health check string and code comments also use "Apple Maps" and "Siri". Apple will reject the app for this, and it invites a trademark complaint. The location permission strings also say "Apple Maps Learner".

---

## P1 — High (fix before beta)

### Backend
- **No input validation.** For example, `hours` in `/api/passport/log` is not type-checked: `"5"` string-concatenates (`18 + "5"` → `"185"`), and negative values subtract hours. `notes`, `author` and `zoneId` have no length limits, so the report file can grow without bound (disk exhaustion). `zoneId: "__proto__"` hits a prototype-pollution-style key path on a plain object.
- **No rate limiting**, no `helmet` security headers, and `cors()` allows all origins.
- **Error responses leak internals** (`details: err.message`, which includes file paths).
- **File storage is not durable or safe.** Sync read-modify-write on JSON files loses data under concurrent writes. Render's free-tier disk is ephemeral, so all data is wiped on every deploy or restart. The free plan also sleeps after inactivity (cold starts of ~30–60 s).
- **Runtime data is committed to git** (`server/storage/*.json`). User-generated data will dirty the repo, and `insurance_clicks.json` will hold PII-adjacent lead data.
- No structured logging, request logging, graceful shutdown or process-level error handlers.
- `render.yaml` uses `npm install` instead of `npm ci`, installs all dev deps and pins no Node version (no `engines` field).
- The server serves `dist/` but Render never builds it, so the SPA-fallback branch is dead config.

### Misleading or fake data presented as real
- **"Live Traffic"** (`/api/traffic`) is synthesized: 6 fixed line offsets around the user, colored by server clock hour. That clock is the *server's* timezone, not the user's.
- **Practice grounds outside San Francisco are invented.** `generateLearnerZonesForLocation()` places 5 fictional grounds (such as "Community Sports Complex", 98% safe) at fixed offsets from the user. They could land on highways, water or private property. **This is a safety issue**, because the app tells new drivers a spot is safe to practice.
- Geocoded search results get a hardcoded rating of 4.6, 320 reviews, "Open today" and an unrelated stock photo.
- Community reports use a static `timeAgo: 'Just now'` string that never ages. The seed authors are fictional.
- The offline routing fallback invents turn instructions ("turn right onto Avenue Boulevard").

### Third-party services not licensed for production
- `router.project-osrm.org` is a demo server whose usage policy forbids production or heavy use.
- `photon.komoot.io` is a fair-use public instance.
- CARTO basemaps require attribution and have commercial-use terms. `attributionControl: false` (`AppleMap.jsx:57`) **removes the attribution that OSM/CARTO licenses require**.
- The MapLibre CSS is loaded twice: once from unpkg `@5.1.1` in `index.html` (installed version is 5.24) and once bundled.

### Functional bugs
- **Navigation index mismatch.** `activeStepIndex` steps through `routeData.coordinates` (`NavigationHUD.jsx:48`), but the same index is used for `steps[activeStepIndex]` (`NavigationHUD.jsx:25`). Once the index passes the step count, the HUD falls back to step 0, so turn instructions and voice prompts are wrong for most of the drive.
- **"Navigation" is a simulation.** Position auto-advances on a timer, with no `watchPosition` or real GPS tracking. This is fine for a demo but must not be marketed as turn-by-turn.
- **Logged hours drift.** The client adds 1 locally while the server caps at `targetHours`. The client shows `18` before the API responds. `if (data?.loggedHours)` ignores a valid `0`.
- **Dark-mode toggle does not change the map style.** The style is chosen only once at map init, and there is no `setStyle` on change.
- **Booking and affiliate flows ignore server errors** (`res.ok` is never checked).
- `handleAddPracticeHour` lets the user log hours with one tap and no verification, which undermines any claim that the log is "certified".

### Mobile (Capacitor)
- `"cleartext": true` allows plain HTTP in the WebView. Remove it for production.
- `minifyEnabled false` on Android release, and `versionCode 1` / `1.0` with no versioning strategy.
- The web build is not synced into the native projects (`android/app/src/main/assets` and `ios/App/App/public` are absent), so the native apps currently have no content.
- No `@capacitor/geolocation` plugin. The app relies on the WebView's `navigator.geolocation`. The `NSLocationAlwaysAndWhenInUse` string claims background location, which the app never uses (App Review flags unused permission claims).
- The package path is still the template `com/getcapacitor/myapp`, the tests are template stubs, and there is no privacy manifest (`PrivacyInfo.xcprivacy`) for iOS.

---

## P2 — Medium (quality and operations)

- **No tests at all**: no unit, integration or e2e tests, and no test runner configured.
- **No CI/CD pipeline, linting or formatting** (ESLint/Prettier). JS only, with no type safety.
- **No React Error Boundary.** Any render error white-screens the whole app.
- **Bundle size:** a single 1.38 MB chunk. Code-split MapLibre and the modals with `React.lazy`.
- **Accessibility:** 0 ARIA attributes, and the many icon-only buttons have no labels. `user-scalable=no, maximum-scale=1.0` blocks pinch-zoom (a WCAG 1.4.4 failure). `select-none` on `<body>`. No focus management or `Escape` handling in modals. Color contrast on the small 9–10px text needs checking.
- **No privacy policy, terms, consent or data-deletion flow**, despite collecting location, phone numbers, permit numbers and driver age, and despite targeting teens. COPPA/CCPA and app-store privacy labels apply.
- **No analytics, crash reporting or monitoring** (Sentry or similar).
- **No SEO or PWA basics** beyond the title and description (no OG tags, manifest or service worker).
- **Fonts and CSS load from third-party CDNs** (Google Fonts, unpkg). This is a privacy concern (GDPR for Google Fonts) and a single point of failure. Self-host them.
- **`favorites` are not persisted.** They reset on reload.
- The onboarding flag is set *before* the user finishes the guide.
- 13 outdated packages, including major versions behind on React 19, Vite 8, MapLibre 6 and Tailwind 4.
- `package.json` name is still `apple-maps-clone` and the health endpoint says "Apple Maps Learner Engine Backend".
- The README markets features as real ("Real-time congestion", "Certified", "Verified Local Instructors", "State Form DL-50HRS Compliant") that are simulated or hardcoded.

---

## What's solid

- The build is clean and the frontend structure (components / services / data) is sensible.
- External calls use `AbortSignal.timeout` and degrade gracefully.
- The search debounce and the map marker cleanup in effects are done correctly.
- The safety-scoring engine (`learnerEngine.js`) is readable and deterministic. It is a good base once it is fed real data.
- `window.open(..., 'noopener,noreferrer')` is used correctly for affiliate links.

---

## Recommended path to production

1. **Week 1 (unblock deploy and safety):** bind to `0.0.0.0`; route all calls through `apiUrl()` and set `VITE_API_BASE_URL`; escape the marker HTML; `npm audit fix` and upgrade maplibre; remove the "Certified/Official/Approved" DMV wording and the hardcoded log rows; remove the synthetic zones outside SF (or label them clearly as examples); restore map attribution.
2. **Weeks 2–3 (real backend):** add auth (Supabase, Clerk or Firebase); move to Postgres with per-user tables; add zod validation, helmet, rate limiting and a CORS allowlist; implement or remove instructor booking; take `server/storage` out of git.
3. **Weeks 3–4 (monetization):** Stripe on web, RevenueCat (StoreKit/Play Billing) on mobile, with Pro status checked server-side.
4. **Weeks 4–5 (quality):** Vitest and React Testing Library, Playwright smoke tests, GitHub Actions CI, Sentry, Error Boundary, code splitting, an a11y pass.
5. **Mobile release:** rebrand the IDs and names, add the Geolocation plugin, a privacy manifest, a privacy policy, remove cleartext, enable minify, and paid or self-hosted routing, geocoding and tiles.

---

### Verification notes
- Ran `npm ci`, `npm run build` (pass) and `npm audit`. All other findings come from static code review.
- Running the API server to probe the endpoints live was blocked in this session, so the backend behaviors above (missing route 404, string-hour concatenation, global state) are inferred from the code and were not exercised at runtime.
- No browser or device run was performed. The ARTEMIS device MCP failed to connect this session.
