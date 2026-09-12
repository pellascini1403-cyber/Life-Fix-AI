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

## Phase 2 — Backend + real AI

- Stand up the LifeFix backend (language/framework TBD at that time —
  keep it boring: a typed HTTP API is all the mobile app needs).
- Define `POST /v1/analyses`: multipart image + optional text context +
  category → `AnalysisResult` JSON (shape already defined in
  `src/types/analysis.ts`, keep the backend contract in lockstep with it).
- Choose the AI provider(s) for image understanding + solution generation.
  Keep the provider call fully inside the backend.
- Move risk classification server-side, before the result is returned;
  keep the client-side `KeywordRiskClassifier` as a defensive backstop only.
- Swap `createAIService()` to `RemoteAIService` behind
  `EXPO_PUBLIC_USE_REMOTE_AI`, then remove the flag once it's the only path.
- Add basic rate limiting per plan (ties into Phase 4's entitlements).

## Phase 3 — Real auth

- Pick a provider (Supabase Auth / Firebase Auth / Auth0 — decide based on
  what the backend stack ends up being).
- Implement a real `AuthService`; keep `AnonymousAuthService` only as a
  fallback for fully offline/first-run use if product wants that.
- Migrate any locally-anonymous history to the authenticated user on
  sign-in (or decide it stays device-local — product decision).

## Phase 4 — Monetization

- Integrate RevenueCat (or direct StoreKit/Play Billing) behind
  `EntitlementsService`.
- Build the paywall screen + upgrade flow from the existing "Pasar a PRO"
  CTA in Profile.
- Wire `PLAN_LIMITS` to remote config so limits can change without an app
  release.
- Ads SDK integration for the free tier (behind `adsEnabled`).

## Phase 5 — Accessibility & delight features

- "Explicámelo más fácil" — simplified-language rewrite of a result.
- "Escuchar solución" — text-to-speech read-aloud of the steps.
- Full screen-reader pass (VoiceOver/TalkBack) across all screens.
- Dynamic Type / font-scale QA beyond the defaults already in place.

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

- Backend language/framework and hosting.
- AI provider(s) for vision + solution generation.
- Auth provider.
- Payments provider (RevenueCat vs. direct StoreKit/Play Billing).
- Whether device-local history should migrate to server-side storage, and
  if so, what "delete my data" means end-to-end.
