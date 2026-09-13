# LifeFix AI

> "Tenés un problema. LifeFix te dice qué hacer."

LifeFix AI is a mobile assistant for everyday real-world problems. A user
photographs something — a stain, a broken appliance, a damaged plant, a
leak, an error code, a care label — optionally describes what's going on,
and gets back a clear, structured, step-by-step solution.

Core loop: **open app → photograph → analyze → understand the problem →
get a solution → resolve it.**

This is a real, production-track codebase, not a prototype: strict
TypeScript, a modular service layer, and an architecture designed to reach
the App Store and Google Play — not a demo meant to be thrown away.

## Status: Phase 5.9

Phase 1 built the foundation (navigation, design system, screens,
component library). Phase 2 added a real backend and a real AI provider
(`POST /analyze`, Anthropic's Claude, a backend-side safety policy) —
fully built, and still there, but **not the active default right now**:
per an explicit, cost-conscious product decision, development runs against
`MockAIService` (simulated data, zero network calls, zero cost) until
we're ready to pay for real AI usage. See "Developing without any external
cost" below. Phase 5 added two delight/accessibility features that work
entirely offline — "Explicámelo más fácil" (a rule-based, zero-cost text
simplifier) and "Escuchar solución" (on-device text-to-speech via
`expo-speech`) — plus an accessibility pass across every screen. **Phase
5.5 is a hardening pass**: the daily free-analysis limit is now actually
enforced and persisted (not just displayed), every history mutation
handles its own failures with real user feedback, Home and Camera share
one gallery-picker implementation, the selected language survives a
restart, and Profile's five menu rows all do something real (no dead
buttons) — still with zero payment/subscription code and zero calls to a
paid AI provider. **Phase 5.75 adds a global Error Boundary** (a render
error anywhere in the app now shows a Retry/Go to Home recovery screen
instead of a blank one) **and closes the test-coverage gap on the core
flow and screens** — `useAnalysisSessionStore` (the store behind the
entire capture → analyze → result loop) went from 0% to fully tested, and
Home/Result/History now have their own screen-level tests, none of which
existed before. **Phase 5.9 closes the last free robustness gaps found in a
full project audit** — Camera and Profile went from 0% to real coverage of
their critical flows, `app/+not-found.tsx` (the last screen with hardcoded
Spanish strings) is now fully internationalized, and there's now an
automated smoke test confirming the app boots and the Error Boundary stays
wired — before moving on to anything in Phase 6 (store readiness), most of
which either costs money or depends on a product decision not made yet.
See [What's implemented](#whats-implemented--whats-not) for the precise,
current line between what's real and what's still a documented gap.

### Developing without any external cost

`createAIService()` (`src/services/ai/index.ts`) defaults to
`MockAIService` — no network call, no AI provider, no cost. The real
backend from Phase 2 (`POST /analyze`, `backend/**`, `RemoteAIService`,
Anthropic's Claude) is fully built and unchanged; it's just not the
default path. To opt into it later (this **will** incur real Anthropic API
cost): set `EXPO_PUBLIC_USE_REMOTE_AI=true` and `ANTHROPIC_API_KEY` in
`.env`. No payment/billing/subscription/paywall integration exists or is
active anywhere in this codebase.

## Architecture

Three layers, kept strictly separate so no AI provider secret can ever ship
inside the mobile binary:

```
┌─────────────────────┐      ┌──────────────────────┐      ┌────────────────┐
│   Mobile app (RN)    │ ───▶ │  app/analyze+api.ts    │ ───▶ │  Claude (Anthropic) │
│  Expo + TypeScript   │      │  + backend/**          │      │  vision + structured │
│  holds NO secrets    │      │  holds ANTHROPIC_API_KEY│      │  JSON output         │
└─────────────────────┘      └──────────────────────┘      └────────────────┘
```

- **Mobile app** — everything under `app/(tabs)/`, `app/camera.tsx`,
  `app/result.tsx`, and `src/`. Owns UI, navigation, local device state
  (history, current session), and calls only the LifeFix backend, through
  `ApiClient`. It never talks to an AI provider SDK directly, and never
  imports anything from `backend/`.
- **Backend** — `app/analyze+api.ts` (the HTTP boundary) plus everything
  under `backend/` (the actual logic: request validation, the AI provider
  call, response-schema validation, the safety policy, rate limiting).
  This is where `ANTHROPIC_API_KEY` lives, read from the server's own
  environment — never in the app bundle or in git. See "Why this split,
  and how it's enforced" below for how that's guaranteed, not just
  asserted.
- **AI provider** — Anthropic's Claude (`@anthropic-ai/sdk`), the only
  concrete implementation of `VisionAnalysisProvider` today. Swappable
  behind that interface without touching `analyzeHandler.ts` or anything
  upstream of it.

### Why this split, and how it's enforced (not just asserted)

An adversary who decompiles the mobile app must never find a usable AI
provider key. This isn't just a convention here — it's structural:

- `app/analyze+api.ts` is the **only** file the mobile client can reach
  over HTTP; everything it imports (`backend/**`, `@anthropic-ai/sdk`,
  `zod`) is server-only code.
- Expo Router bundles `+api.ts` routes into a **separate server target**.
  `npx expo export --platform web` (with `web.output: "server"`, set in
  `app.json`) produces the client bundle and the `/analyze` function as
  two entirely separate output files — verified by hand: grepping the
  compiled client bundle for `anthropic` or `ANTHROPIC_API_KEY` returns
  zero matches; the separate `server/_expo/functions/analyze+api.js` file
  is where those references actually live. For iOS/Android, `expo export
  --platform ios|android` doesn't include API routes in the native bundle
  at all — same check, same zero matches.
- `RemoteAIService` (mobile) only ever calls our own `/analyze` route via
  `ApiClient`; it holds no provider key to leak in the first place.

### The `/analyze` request/response contract

`POST /analyze`, `multipart/form-data`:

| Field | Required | Notes |
|---|---|---|
| `image` | yes | `image/jpeg`, `image/png`, `image/webp`, or `image/gif`, ≤ 8 MB |
| `userContext` | no | free text, ≤ 500 chars |
| `category` | no | one of the app's `ProblemCategory` values |
| `locale` | no | `es` (default) or `en` — controls the AI's response language |

Success (200): the `AnalysisResult` fields the client doesn't already own
(everything except `imageUri`/`userContext`, which the client fills in
itself — see "Privacy" below for why the image is never round-tripped
back). Failure (4xx/5xx): `{ "error": { "code": "<AnalysisErrorCode>" } }`
— see `backend/errors.ts` for the full list and status codes, and
`src/utils/analysisErrorMessages.ts` for how the client turns a code into a
localized, human-friendly message. The raw error message is logged
server-side only; it never reaches the response body.

### Safety, by construction — applied twice

LifeFix's system prompt (`backend/aiProvider/systemPrompt.ts`) instructs
Claude to classify every problem as `safe` / `caution` / `professional` and
to keep instructions generic (never step-by-step) for anything in the
`professional` tier — but **the backend never trusts that self-report
alone**. `backend/safety/applySafetyPolicy.ts` independently re-classifies
the model's own problem/explanation/warning text with the same
keyword-based `riskClassifier` the client uses defensively, and takes the
**more severe** of the two signals. If the final risk is `high`, the
backend itself — not the model — replaces the steps with a single safe
"see a professional" instruction and clears the materials list, regardless
of what the model actually said. This is covered by
`backend/__tests__/applySafetyPolicy.test.ts`, including the case where the
model under-reports risk and the keyword pass is what catches it.

### Privacy, by construction

- The photo is processed in memory for the duration of one request and
  never written to disk or a database — the backend has no image storage
  at all right now.
- The backend's success response does **not** include the image; the
  client already has it locally and merges its own `imageUri` back onto
  the response (see `RemoteAIService.analyze()`). The photo is never
  round-tripped back over the network after upload.
- The raw error `message` (which can include upstream provider detail)
  never appears in an HTTP response body — only the stable `code` does
  (see `backend/errors.ts`).
- Nothing is saved to on-device history automatically — only after the
  user taps "guardar en historial" on a result, and `HistoryRepository`'s
  `remove()`/`clear()` are real, immediate deletes.

### Service abstractions (`src/services/`)

Every external capability is behind an interface so the concrete
implementation (and the vendor behind it) can change without touching call
sites:

| Interface | Purpose | Current implementation |
|---|---|---|
| `AIService` | photo (+context) → `AnalysisResult` | **`MockAIService` (default)** — simulated data, zero cost. `RemoteAIService` (calls the real `POST /analyze` backend) is fully built and available — set `EXPO_PUBLIC_USE_REMOTE_AI=true` to opt in (incurs real Anthropic cost); there is no automatic silent fallback either direction |
| `VisionAnalysisProvider` (`backend/aiProvider/`) | image + context → structured provider JSON | `AnthropicVisionProvider` (Claude, via `@anthropic-ai/sdk`) — server-only, built but only reachable when `RemoteAIService` is opted into |
| `RateLimiter` (`backend/rateLimit/`) | abuse/cost guard for `/analyze` | `InMemoryRateLimiter` — **structurally complete and unit-tested, but currently a no-op in practice**; see "What's implemented / what's not" |
| `SolutionSimplificationService` (`src/services/simplify/`) | rewrite a result's text in plainer language | `LocalSolutionSimplificationService` — rule-based word substitution + safe sentence splitting, zero cost. Powers "Explicámelo más fácil" |
| `AuthService` | current user, sign in/out | `AnonymousAuthService` (local, in-memory) |
| `EntitlementsService` | plan, daily-use limits | `LocalEntitlementsService` (`free` plan only; daily usage persisted to AsyncStorage with an automatic reset on a new local day, and actually enforced via `useDailyLimitGuard()` in Home/Camera) |
| `AnalyticsService` | event tracking | `NoopAnalyticsService` |
| `HistoryRepository` | saved analyses | `AsyncStorageHistoryRepository` (on-device only) |
| `RiskClassifier` (`src/safety/`) | flags dangerous topics | `KeywordRiskClassifier` — used defensively client-side, and authoritatively server-side in `backend/safety/applySafetyPolicy.ts` (same module, imported by both) |

Where a real implementation doesn't exist yet, or an existing one has a
known limitation, the file says so explicitly in its doc comment (see
`AuthService.ts`, `backend/rateLimit/RateLimiter.ts`) — nothing pretends to
be finished.

### Monetization, data-driven

`PLAN_LIMITS` (`src/services/entitlements/EntitlementsService.ts`) defines
`free`/`pro` limits as data, not scattered conditionals, so pricing/limits
can change without touching call sites. No payment provider (RevenueCat /
StoreKit / Play Billing) is integrated yet — `EntitlementsService` is the
seam it plugs into.

## Stack

- **Expo (React Native) + TypeScript**, `expo-router` for file-based
  navigation — one codebase, iOS + Android, EAS Build/Submit-ready.
  `react-dom` + `react-native-web` are included so `npm run web` also works
  — useful for fast UI iteration and headless browser testing — though iOS
  and Android are the actual target platforms.
- **Zustand** for local UI/session state (`useAnalysisSessionStore`,
  `useHistoryStore`).
- **i18next / react-i18next** for i18n (Spanish default, English), no
  hardcoded UI strings — see `src/i18n/locales/`.
- **expo-camera** / **expo-image-picker** for capture.
- **expo-speech** for on-device, zero-cost text-to-speech ("Escuchar
  solución") — no account, no API key, no network call.
- **@react-native-async-storage/async-storage** for local history
  persistence.
- **Expo Router API routes** (`+api.ts`) for the backend — same repo, same
  dev server, but bundled into a separate server target so client and
  server code never mix (see "Why this split" above). No separate
  service/repo to stand up or keep in sync.
- **`@anthropic-ai/sdk`** (server-only) for the Claude call, with **`zod`**
  validating both the AI's structured output and the incoming request
  fields.
- **Jest + jest-expo + @testing-library/react-native** for tests.
- **ESLint (flat config, `eslint-config-expo`) + Prettier**.

## Project structure

```
app/                      Expo Router routes (screens + navigation)
  (tabs)/                 Bottom tab navigator: Home, History, Profile
  camera.tsx               Full-screen capture flow (modal)
  result.tsx                Analysis result (modal)
  about.tsx / privacy.tsx / help.tsx   Profile's info screens (modal)
  analyze+api.ts            POST /analyze — thin HTTP adapter (server-only)
  _layout.tsx              Root providers (theme, safe area, gesture handler)

backend/                  Server-only. Reachable ONLY from app/analyze+api.ts —
                          never import this from src/ or app/(tabs)/**.
  config.ts                Env vars, model id, image/rate-limit constants
  errors.ts                AnalysisError taxonomy (code -> HTTP status)
  schema.ts                Zod schemas: AI provider output + request fields
  analyzeHandler.ts         Orchestrates: rate limit -> parse/validate ->
                           provider call -> safety policy -> response
  aiProvider/              VisionAnalysisProvider interface + AnthropicVisionProvider
                           + the system prompt
  safety/                  applySafetyPolicy.ts — the authoritative safety gate
  rateLimit/               RateLimiter interface + InMemoryRateLimiter
  mapping/                 Provider JSON -> AnalysisResult

src/
  theme/                   Design tokens (color, spacing, typography) + ThemeProvider
  i18n/                    i18next setup + es/en locale files + language persistence
  components/
    AppErrorBoundary.tsx   Global recovery UI — exported as ErrorBoundary from app/_layout.tsx
    ui/                    Generic reusable primitives (Button, Card, Input, …)
    results/               Analysis-result-specific components
  hooks/                   useDailyLimitGuard — gates a new analysis on the daily limit
  services/
    ai/                    AIService interface, MockAIService, RemoteAIService
    auth/                  AuthService interface + AnonymousAuthService
    entitlements/          EntitlementsService interface + LocalEntitlementsService
    analytics/             AnalyticsService interface + NoopAnalyticsService
    api/                   ApiClient (backend HTTP client)
    device/                Local device-id (used as the rate-limit key)
    simplify/              SolutionSimplificationService + LocalSolutionSimplificationService
    history/               HistoryRepository interface + AsyncStorage impl
    media/                 pickImageFromGallery — shared Home/Camera gallery picker
  safety/                  RiskClassifier (shared by client and backend)
  state/                   Zustand stores
  types/                   Shared domain types (AnalysisResult, AnalysisErrorCode, …)
  utils/                   analysisErrorMessages.ts — error code -> localized message
  constants/               Category list + icons
```

## Getting started

```bash
npm install
npm run start        # then press i / a / w, or scan the QR code in Expo Go
```

Other scripts:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run test         # jest
npm run doctor       # expo-doctor (some checks need network access to expo.dev)
```

## Environment variables

Copy `.env.example` to `.env`. Two very different kinds of variable live
there — see the file's own header comment for the full explanation:
`EXPO_PUBLIC_*` is bundled into the **client** (never put a secret in one);
everything else is read only by server code (`backend/**`, imported only
from `app/analyze+api.ts`) and is safe for real secrets.

| Var | Where | Default | Purpose |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | client | *(empty → relative)* | Backend base URL. Empty resolves as a relative path against the app's own origin, which is correct for web and for native during development (same Metro dev server serves both). Set to an absolute URL only for a native production build talking to a separately hosted backend |
| `EXPO_PUBLIC_USE_REMOTE_AI` | client | `false` (unset also means false) | Set to `"true"` to opt into the real backend (`RemoteAIService`) — **this will incur real Anthropic API cost**. Defaults to `MockAIService`: no network, no cost |
| `ANTHROPIC_API_KEY` | server | *(none)* | Only read when `EXPO_PUBLIC_USE_REMOTE_AI=true`. Without it, `POST /analyze` returns `503 PROVIDER_NOT_CONFIGURED` — verified by hand (see below) — never a fabricated result |
| `ANTHROPIC_MODEL` | server | `claude-opus-5` | Override the model used for analysis |
| `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_PER_DAY` | server | `8` / `60` | Abuse/cost guardrails — see the rate-limiting caveat below before relying on these |
| `ANALYSIS_TIMEOUT_MS` | server | `45000` | Max time to wait on the AI provider before failing with `TIMEOUT` |

## What's implemented / what's not

**Implemented and verified:**
- Everything from Phase 1 (navigation, design system, screens, components,
  i18n, local history/entitlements).
- **A real backend** (`POST /analyze`, an Expo Router API route) that
  validates the request, calls Claude with a specialized system prompt,
  validates the AI's structured JSON output against a strict `zod` schema,
  runs an independent backend-side safety policy on top of the model's own
  classification, and returns the app's existing `AnalysisResult` shape —
  fully built, currently **not the active default** (see "Developing
  without any external cost" above).
- **The secret boundary holds** — verified by hand, not just asserted:
  exporting the app (`expo export`, both iOS and web) confirms `anthropic`
  and `ANTHROPIC_API_KEY` appear zero times in the client bundle, and only
  in the separate server function bundle for web (the API-route target).
- Structured, typed error codes end-to-end (`AnalysisErrorCode`), each
  mapped to a specific localized (es/en) human message — one per failure
  mode called out in the spec (invalid image, too large, timeout, provider
  down/unconfigured, invalid AI response, rate limited, network error,
  unknown), never a raw technical message shown to the user.
- `followUpQuestions` — a genuinely new field end to end (schema → mapping
  → UI card) for when the AI needs more information instead of guessing.
- **"Explicámelo más fácil"** — `LocalSolutionSimplificationService`
  rewrites a result's explanation and steps in plainer language (jargon
  substitution + splitting long compound sentences at a safe conjunction
  boundary), toggled live on the result screen with no loading delay and
  no network call. Fully unit-tested
  (`src/services/simplify/__tests__/`), including the specific bug it
  caught along the way — see below.
- **"Escuchar solución"** — reads the problem + steps aloud via
  `expo-speech` (on-device TTS, no account, no cost), with a Stop toggle
  and a graceful, localized "couldn't play audio" message if the device
  has no TTS voices available (verified: this exact path triggers in this
  sandbox's headless browser, which has no TTS engine, and the UI recovers
  cleanly instead of getting stuck).
- **An accessibility pass** across every screen and shared component,
  driven by a dedicated audit: added `accessibilityRole="header"` to page
  titles, fixed two hardcoded-Spanish `accessibilityLabel`s that broke
  under the English locale (`BottomSheet`'s close button, `ResultCard`'s
  delete button — both now route through `t()`), added labels to
  previously-unlabeled images (captured photo in both `camera.tsx` and
  `result.tsx`), gave `LoadingState` a default label instead of a silent
  one when no message is passed, and enlarged three touch targets that
  were under the ~44×44 minimum (`ResultCard`'s delete button, and the
  close buttons on `camera.tsx`/`result.tsx`).

- **Phase 5.5 hardening.** The 3-analysis daily free limit is persisted
  (AsyncStorage, with an automatic reset on a new local day) and actually
  enforced in Home and Camera via `useDailyLimitGuard()` — previously it was
  tracked in memory but never checked. Every `useHistoryStore` mutation now
  handles its own failure with a localized `Alert` instead of throwing
  silently; the History screen shows a real error state (with retry) instead
  of a misleading empty state when loading fails, and has a "Clear history"
  action. Home and Camera share one gallery-picker implementation
  (`pickImageFromGallery`) instead of two independently-drifted copies. The
  selected language now persists across restarts. Profile's "Ayuda", "Acerca
  de LifeFix AI", and "Privacidad" rows are real screens now instead of dead
  buttons, and "Pasar a PRO"/"Notificaciones" show an honest "coming soon"
  message — no payment code involved.

- **Phase 5.75 + 5.9 technical robustness.** A global `AppErrorBoundary`
  (exported as `ErrorBoundary` from `app/_layout.tsx` per Expo Router's own
  convention) now catches any unexpected render error app-wide and shows a
  Retry/Go to Home recovery screen instead of a blank one — verified live
  against the running dev server, not just in a unit test. Every screen now
  has real test coverage of its critical flows (previously only services
  and stores were tested, never a rendered screen): Home, Result, History,
  Camera, and Profile, plus `useAnalysisSessionStore` (the store behind the
  entire capture → analyze → result loop, 0% → 100%) and a smoke test that
  the app boots and the Error Boundary stays wired. `app/+not-found.tsx`,
  the last screen with hardcoded Spanish strings, is now fully
  internationalized. Overall coverage (`src/**` + `app/**`): 68.86% →
  86.65% statements.

**A real bug the simplifier's own tests caught:** the first version of
`substituteWords` used `\bword\b` regex boundaries, which silently never
match Spanish words ending in an accented vowel (`\b` treats `á`/`é`/etc.
as non-word characters, so `\bverificá\b` never matches "Verificá ") — a
test written against real app content caught it immediately, and the fix
(tokenizing on letter runs instead of `\b`) is in
`LocalSolutionSimplificationService.ts`.

**Structurally complete, but with a known, verified limitation:**
- **Rate limiting.** `RateLimiter` (interface) + `InMemoryRateLimiter`
  exist, are fully unit-tested (windowing, per-key isolation, `429` +
  `retryAfterSeconds`), and are wired into `analyzeHandler.ts`. Verified
  against the running dev server, though: Expo Router API routes execute
  each request as an isolated invocation, so the in-memory `Map` resets on
  *every* request, not just on restart — it currently allows every request
  through. It needs a durable, shared store (Redis/Upstash, a database
  row) behind the same `RateLimiter` interface to actually enforce
  anything, in dev or in a serverless-style production deployment. See
  `backend/rateLimit/RateLimiter.ts` for the detail and ROADMAP for this as
  an open item.

**Explicitly NOT implemented yet** (by design, per the phased plan):
- Real authentication (`AnonymousAuthService` is a local-only stand-in);
  the `X-Device-Id` header used for rate limiting is a local random id, not
  an authenticated identity.
- **No payments, subscriptions, billing, or paywall** — none integrated,
  none active, per explicit product direction to avoid any external cost
  right now.
- Push notifications, analytics provider, persistent image storage.
- EAS Hosting / production deployment of the backend (it currently only
  runs via the Expo dev server; deploying it for real native builds is
  still ahead, and only relevant once real AI usage is turned back on).

## Next steps

1. Decide when/how to turn real AI analysis back on (see "Developing
   without any external cost") — nothing else needs to change in the code
   for that switch; `RemoteAIService` and the backend are already built
   and were verified working (Phase 2) before this cost-conscious pause.
2. Back the rate limiter with a durable store so it actually enforces
   limits (see the caveat above) — relevant once real AI usage resumes.
3. Real auth provider decision + implementation behind `AuthService`, and
   reconcile the device-id rate-limit key with a real user identity.
4. Payments integration behind `EntitlementsService` — still explicitly
   out of scope until the product/business side decides otherwise.
5. EAS Hosting (or equivalent) deployment of the backend for native
   production builds, plus EAS Build configuration and a first
   TestFlight/Play internal test track.

See `ROADMAP.md` for the fuller, longer-term plan.
