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
