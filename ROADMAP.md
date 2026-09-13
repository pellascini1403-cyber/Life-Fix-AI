# LifeFix AI — Internal Roadmap

Working plan for taking LifeFix from Phase 1 (this scaffold) to a shippable
production app. Update this as phases complete or priorities shift.

## Phase 1 — Foundation (done)

- Expo + TypeScript project scaffold, `expo-router` navigation.
- Design system (tokens, `ThemeProvider`, light/dark palettes).
- Home / History / Profile screens.
- Reusable component library (`src/components/ui`, `src/components/results`).
- Full capture → analyze → result flow, backed by `MockAIService`.
- Service interfaces for AI, auth, entitlements, analytics, history — real
  where trivial (history, local entitlements), explicitly stubbed where a
  backend/vendor decision is required (AI, auth, payments).
- Safety risk classification wired into the UI.
- i18n (es/en), loading/error/empty states.
- Jest + ESLint + typecheck all green; Metro bundles clean for iOS and
  Android.

## Phase 2 — Backend + real AI (done)

- Backend built as Expo Router API routes (`app/analyze+api.ts` +
  `backend/**`), not a separate service — same repo, same dev server,
  bundled into a separate server target so client and server code can't
  mix (verified: zero `anthropic`/`ANTHROPIC_API_KEY` references in the
  exported client bundle for iOS or web).
- `POST /analyze`: multipart image + optional text context + category +
  locale → the app's existing `AnalysisResult` JSON (no new client-facing
  schema — `backend/mapping/mapProviderOutputToAnalysisResult.ts` adapts
  the AI provider's own structured output onto it).
- AI provider: Anthropic's Claude (`@anthropic-ai/sdk`), behind the
  `VisionAnalysisProvider` interface — swappable without touching
  `analyzeHandler.ts`.
- Risk classification now runs backend-side
  (`backend/safety/applySafetyPolicy.ts`), taking the more severe of the
  model's own `safetyLevel` and an independent keyword re-check — never
  trusting the model's self-report alone. The client-side
  `KeywordRiskClassifier` remains a defensive backstop (same module,
  imported by both).
- `createAIService()` originally defaulted to `RemoteAIService` at the end
  of this phase. **Reverted right after**, per an explicit product
  decision to develop with zero external cost until ready to pay for real
  AI usage: it now defaults to `MockAIService`, and
  `EXPO_PUBLIC_USE_REMOTE_AI=true` is the explicit opt-in to
  `RemoteAIService` (which does incur cost) — no silent fallback either
  direction. Nothing about the backend itself changed; it's just not the
  active default. See Phase 5 and README "Developing without any external
  cost".
- Rate limiting: **interface + in-memory implementation done and
  unit-tested, but not yet actually enforcing anything** — see README
  "What's implemented / what's not" and the carried-over task below.

### Carried over from Phase 2 (not done)

- **Back the rate limiter with a durable store.** Verified against the
  running dev server: Expo Router API routes execute each request as an
  isolated invocation, so `InMemoryRateLimiter`'s `Map` resets every
  request, not just on restart — right now it never actually blocks
  anything. Needs a shared store (Redis/Upstash, or a database row) behind
  the existing `RateLimiter` interface in `backend/rateLimit/` before it
  does anything in dev or production. This is the one loose end from
  Phase 2 and should be picked up early in Phase 3 or 4 (whichever lands a
  database/KV dependency first).
- Deploying the backend for real native builds (EAS Hosting or
  equivalent) — this phase only runs it via the Expo dev server / web
  export. Needed before a TestFlight/Play build can call `/analyze` from
  outside that dev server.

**Phase order note:** Phases 3 (auth) and 4 (monetization) are on hold —
not because of any technical blocker, but because both would mean setting
up and/or configuring paid or billable third-party services, which
conflicts with the current cost-conscious development decision. Phase 5
(accessibility & delight) was picked up next instead, since it needs zero
external accounts or paid APIs. Resume Phase 3/4 whenever that constraint
lifts.

## Phase 3 — Real auth

- Pick a provider (Supabase Auth / Firebase Auth / Auth0 — decide based on
  what the backend stack ends up being).
- Implement a real `AuthService`; keep `AnonymousAuthService` only as a
  fallback for fully offline/first-run use if product wants that.
- Migrate any locally-anonymous history to the authenticated user on
  sign-in (or decide it stays device-local — product decision).
- Reconcile the `X-Device-Id` rate-limit key (currently a local random id)
  with the real authenticated user identity.

## Phase 4 — Monetization

- Integrate RevenueCat (or direct StoreKit/Play Billing) behind
  `EntitlementsService`.
- Build the paywall screen + upgrade flow from the existing "Pasar a PRO"
  CTA in Profile.
- Wire `PLAN_LIMITS` to remote config so limits can change without an app
  release.
- Ads SDK integration for the free tier (behind `adsEnabled`).

## Phase 5 — Accessibility & delight features (done)

- "Explicámelo más fácil" — `SolutionSimplificationService` interface +
  `LocalSolutionSimplificationService`, a rule-based (word substitution +
  safe sentence splitting), zero-cost implementation. Toggled live on the
  result screen. Interface is ready for a real AI-backed rewrite later
  without touching call sites.
- "Escuchar solución" — `expo-speech` (on-device TTS, no account, no
  cost), with a Stop toggle and a graceful fallback message when no TTS
  voices are available on the device (verified: exactly this path
  triggers in this project's own headless-browser test environment).
- Accessibility pass across every screen, driven by a dedicated audit
  agent: heading roles on page titles, two hardcoded-Spanish
  `accessibilityLabel`s fixed to route through `t()` (`BottomSheet`,
  `ResultCard`), labels added to two previously-unlabeled images (captured
  photo previews), a default label for `LoadingState` when no message is
  passed, and three touch targets enlarged to the ~44×44 minimum.
- Dynamic Type / font-scale: no dedicated device QA pass was done (would
  need a real device/simulator with the OS text-size setting changed), but
  the audit confirmed no code path disables it (`Text.tsx` never sets
  `allowFontScaling={false}`, and nothing else in the audited files does
  either) — this has held since Phase 1, by construction, not by new work
  this phase.

**Bug caught by this phase's own tests:** the first version of the
simplifier's word-substitution regex used `\bword\b` boundaries, which
never match a Spanish word ending in an accented vowel (`\b` treats
`á`/`é`/etc. as non-word characters) — caught immediately by a test
written against real app content, fixed by tokenizing on letter runs
instead of relying on `\b`.

## Phase 5.5 — Hardening & stability (done)

A cost-conscious stabilization pass, done entirely without touching
`RemoteAIService`, `MockAIService`, the safety system, real auth, or
monetization — the goal was to make everything already built actually solid
before adding anything new.

- **Daily free-analysis limit, actually enforced.** `LocalEntitlementsService`
  now persists `analysesUsedToday` + the local calendar date to AsyncStorage
  (previously in-memory only, reset every app launch, and never actually
  checked before this phase). A new `useDailyLimitGuard()` hook wraps
  `canRunAnalysis()` with a plain informational alert (no paywall, no
  purchase flow) and gates both of Home's entry points (`openCamera`,
  `pickFromGallery`) and Camera's `confirmPhoto`. The counter resets
  automatically the first time it's read on a new local day. Profile's
  existing "N free analyses left today" display now actually reflects
  real usage — it refreshes on tab focus (`useFocusEffect`) instead of once
  on first mount, which a first pass of manual testing caught showing a
  stale count after using all 3.
- **Real error handling across history.** Every `useHistoryStore` mutation
  (`save`, `setFeedback`, `remove`, `clear`) now catches its own failures
  and returns a boolean instead of throwing silently; callers show a
  localized `Alert` on failure. The History screen's load-error state,
  which previously fell through to the empty-state UI (misleading — a
  storage failure looked identical to "no history yet"), now shows a real
  `ErrorState` with retry. A "Clear history" action was added to the
  screen header (only shown when there's something to clear). Result's
  👍/👎 feedback buttons, previously local-only component state that never
  reached the history store, now actually persist via `setFeedback` when
  the result is already saved.
- **Unified gallery picker.** `src/services/media/pickImageFromGallery.ts`
  replaces two independently-drifted copies of the same permission-request
  + pick logic in Home and Camera (one alerted on permission denial, the
  other didn't; neither handled an unexpected picker error) with one
  shared, fully-covered implementation.
- **Language persistence.** The selected language now survives an app
  restart (`src/i18n/index.ts`: `changeAndPersistLanguage` /
  `loadPersistedLanguage`, backed by AsyncStorage) instead of resetting to
  the device locale every launch.
- **No more dead buttons in Profile.** "Pasar a PRO" and "Notificaciones"
  now show an honest "coming soon" message instead of doing nothing — no
  payment logic anywhere. "Ayuda", "Acerca de LifeFix AI", and "Privacidad"
  are now real screens (`app/help.tsx`, `app/about.tsx`, `app/privacy.tsx`).
  Privacy's copy is deliberately scoped to only what the app actually does
  right now (simulated on-device analysis, opt-in local-only history,
  no accounts, the two device permissions it requests) — nothing about a
  future real-AI backend is described as already happening.
- **Tests:** 77 → 100 (new coverage for entitlements persistence/daily
  reset, `useHistoryStore`'s success/error paths, the gallery picker, and
  language persistence/restore), plus a clean `tsc --noEmit` and
  `eslint .`. Verified manually end-to-end via headless-browser screenshots
  (daily-limit gate blocking a 4th analysis, the three new Profile screens,
  Clear history).

## Phase 5.75 — Technical robustness: Error Boundary + core-flow test coverage (done)

Zero new dependencies, zero new external services, no touches to
`RemoteAIService`, `MockAIService`, the safety system, Auth, or
Monetization — purely closing gaps found in a project-wide audit before
either of those resume.

- **Global Error Boundary.** `src/components/AppErrorBoundary.tsx`,
  exported as `ErrorBoundary` from `app/_layout.tsx` per Expo Router's own
  route convention — an unexpected render error anywhere in the app now
  shows a recovery screen (Retry / Go to Home) instead of a blank one.
  Deliberately self-contained: it reads color constants directly instead of
  calling `useTheme()`, since the crash that triggers it may have happened
  inside `ThemeProvider` itself. Verified twice — as a unit test, and live
  against the running dev server (a temporary forced-throw + headless
  screenshots confirmed the fallback renders, "Retry" re-attempts the same
  crashing screen, and "Go to Home" actually recovers to a fully working
  Home screen).
- **`useAnalysisSessionStore` test coverage**: 0% → 100%. Covers the happy
  path, the immediate `analyzing` transition, `ClientAnalysisError` code
  mapping, the `UNKNOWN` fallback for a non-`ClientAnalysisError` throw,
  `showResult`, `reset`, and `setStartCategory` — this store drives the
  entire capture → analyze → result flow and had never had a test of its
  own before this phase.
- **Screen-level tests** (previously nonexistent — every prior test
  exercised a service or store, never a rendered screen) for the
  highest-risk flows: Home's daily-limit gate blocking both camera and
  gallery entry points, category selection, and the gallery
  permission-denied path; Result's save/feedback wiring into
  `useHistoryStore` (including a forced-failure alert case); History's
  error state + retry, "Clear history", and per-entry delete.
- `collectCoverageFrom` now includes `app/**` (previously coverage was
  blind to every screen).
- **Found and fixed along the way, not part of the original scope but
  necessary to make any of this possible:** the installed `expo-font@57.0.4`
  imports `expo-asset` without declaring it as a dependency, and it wasn't
  hoisted to a location `expo-font` could resolve — meaning *any* test
  rendering `@expo/vector-icons` (i.e. almost every screen) crashed before
  this phase. Fixed with a manual Jest mock (`__mocks__/@expo/vector-icons.js`)
  rather than touching `package.json`, since icons are purely decorative in
  tests. Also added the official `react-native-safe-area-context` Jest mock
  to `jest.setup.js` (needed once screens using `useSafeAreaInsets` were
  under test for the first time).
- **Tests:** 100 → 130, plus a clean `tsc --noEmit` and `eslint .` (zero
  warnings).

## Phase 6 — Store readiness

- App icons, splash, and store screenshots (real brand assets — current
  ones are Expo scaffold placeholders).
- EAS Build profiles (`eas.json`) for dev/preview/production.
- Privacy policy + App Store privacy nutrition label / Play Data Safety
  form — informed by exactly what `HistoryRepository`/backend actually
  store.
- TestFlight + Play internal testing track.
- Crash reporting (Sentry or similar) — currently no error reporting
  service is wired up.

## Open product decisions (need input before the relevant phase starts)

- ~~Backend language/framework~~ — decided: Expo Router API routes, same
  repo. Hosting for native production builds (EAS Hosting vs. self-hosted
  Node) is still open.
- ~~AI provider for vision + solution generation~~ — decided: Anthropic
  Claude. Revisit only if cost/quality data says otherwise later.
- Durable store for rate limiting (Redis/Upstash vs. a database table —
  likely whatever Phase 3/4 picks for auth/entitlements anyway).
- Auth provider.
- Payments provider (RevenueCat vs. direct StoreKit/Play Billing).
- Whether device-local history should migrate to server-side storage, and
  if so, what "delete my data" means end-to-end.
