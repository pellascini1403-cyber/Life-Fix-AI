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

## Status: Phase 1

This phase built the foundation: project scaffold, navigation, design
system, the three core screens, reusable components, and the *interfaces*
for AI, auth, entitlements and analytics — with a mock AI implementation so
the full capture → analyze → result flow works end-to-end today. See
[What's implemented](#whats-implemented--whats-not) below for the precise
line between what's real and what's a documented stub.

## Architecture

Three layers, kept strictly separate so no AI provider secret can ever ship
inside the mobile binary:

```
┌─────────────────────┐      ┌──────────────────┐      ┌────────────────────┐
│   Mobile app (RN)    │ ───▶ │  LifeFix backend  │ ───▶ │   AI provider(s)   │
│  Expo + TypeScript   │      │  (not built yet)  │      │  (not chosen yet)  │
│  holds NO secrets    │      │  holds the keys   │      │                    │
└─────────────────────┘      └──────────────────┘      └────────────────────┘
```

- **Mobile app** — this repo. Owns UI, navigation, local device state
  (history, current session), and calls only the LifeFix backend, through
  `ApiClient`. It never talks to an AI provider SDK directly.
- **Backend** (not implemented) — a separate service that owns: the AI
  provider call, the safety/risk classification of AI output, auth,
  per-plan rate limiting, and any server-side storage. This is where API
  keys live, as environment variables / a secrets manager — never in the
  app bundle or in git.
- **AI provider** (not chosen) — swappable behind the backend's own
  internal interface. The mobile app is fully insulated from this choice.

### Why this split

An adversary who decompiles the mobile app must never find a usable AI
provider key. Any code path that would embed one (an AI SDK call from
React Native, an API key in `app.json`/`.env`/`EXPO_PUBLIC_*`) is
disallowed by construction: `RemoteAIService` only ever calls our own
backend via `ApiClient`, and `ApiClient` only carries our own session
token, injected by `AuthService`.

### Service abstractions (`src/services/`)

Every external capability is behind an interface so the concrete
implementation (and the vendor behind it) can change without touching call
sites:

| Interface | Purpose | Current implementation |
|---|---|---|
| `AIService` (+ `ImageAnalysisService`, `SolutionService`) | photo (+context) → `AnalysisResult` | `MockAIService` (dev-only, canned data) — `RemoteAIService` is scaffolded and throws until the backend endpoint exists |
| `AuthService` | current user, sign in/out | `AnonymousAuthService` (local, in-memory) |
| `EntitlementsService` | plan, daily-use limits | `LocalEntitlementsService` (in-memory, `free` plan only) |
| `AnalyticsService` | event tracking | `NoopAnalyticsService` |
| `HistoryRepository` | saved analyses | `AsyncStorageHistoryRepository` (on-device only) |
| `RiskClassifier` (`src/safety/`) | flags dangerous topics | `KeywordRiskClassifier` (defensive client-side check; the real gate belongs server-side, next to the AI call) |

Where a real implementation doesn't exist yet, the file says so explicitly
in its doc comment (see `RemoteAIService.ts`) — nothing pretends to be
finished.

### Safety, by construction

Every `AnalysisResult` carries a `risk: 'none' | 'low' | 'medium' | 'high'`
and `recommendsProfessional: boolean`. The UI surfaces this via
`SafetyBanner` whenever risk is medium/high, and `MockAIService` downgrades
`confidence` to `'low'` for high-risk input. In production, this
classification must run server-side, before the result ever reaches the
client — the client-side `KeywordRiskClassifier` is a defensive backstop,
never the only gate.

### Privacy, by construction

- Nothing is saved to history automatically — only after the user taps
  "guardar en historial" on a result.
- `HistoryRepository.remove()` / `.clear()` are real, immediate deletes.
- No image is uploaded anywhere yet (there is no backend); once one
  exists, retention must respect `EntitlementsService`'s
  `historyRetentionDays` and support hard deletion.

### Monetization, data-driven

`PLAN_LIMITS` (`src/services/entitlements/EntitlementsService.ts`) defines
`free`/`pro` limits as data, not scattered conditionals, so pricing/limits
can change without touching call sites. No payment provider (RevenueCat /
StoreKit / Play Billing) is integrated yet — `EntitlementsService` is the
seam it plugs into.

## Stack

- **Expo (React Native) + TypeScript**, `expo-router` for file-based
  navigation — one codebase, iOS + Android, EAS Build/Submit-ready.
- **Zustand** for local UI/session state (`useAnalysisSessionStore`,
  `useHistoryStore`).
- **i18next / react-i18next** for i18n (Spanish default, English), no
  hardcoded UI strings — see `src/i18n/locales/`.
- **expo-camera** / **expo-image-picker** for capture.
- **@react-native-async-storage/async-storage** for local history
  persistence.
- **Jest + jest-expo + @testing-library/react-native** for tests.
- **ESLint (flat config, `eslint-config-expo`) + Prettier**.

## Project structure

```
app/                      Expo Router routes (screens + navigation)
  (tabs)/                 Bottom tab navigator: Home, History, Profile
  camera.tsx               Full-screen capture flow (modal)
  result.tsx                Analysis result (modal)
  _layout.tsx              Root providers (theme, safe area, gesture handler)

src/
  theme/                   Design tokens (color, spacing, typography) + ThemeProvider
  i18n/                    i18next setup + es/en locale files
  components/
    ui/                    Generic reusable primitives (Button, Card, Input, …)
    results/               Analysis-result-specific components
  services/
    ai/                    AIService + ImageAnalysisService/SolutionService interfaces,
                           MockAIService, RemoteAIService (stub)
    auth/                  AuthService interface + AnonymousAuthService
    entitlements/          EntitlementsService interface + LocalEntitlementsService
    analytics/             AnalyticsService interface + NoopAnalyticsService
    api/                   ApiClient (backend HTTP client)
    history/               HistoryRepository interface + AsyncStorage impl
  safety/                  RiskClassifier
  state/                   Zustand stores
  types/                   Shared domain types (AnalysisResult, Entitlements, …)
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

Copy `.env.example` to `.env`. All `EXPO_PUBLIC_*` vars are bundled into
the client — **never** put a secret in one.

| Var | Default | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.lifefix.ai` | Backend base URL (backend not built yet) |
| `EXPO_PUBLIC_USE_REMOTE_AI` | `false` | `true` switches `createAIService()` to `RemoteAIService`, which currently throws until the backend endpoint exists |

## What's implemented / what's not

**Implemented:**
- Navigation: bottom tabs (Home/History/Profile) + camera/result modals.
- Design system: color/spacing/typography tokens, light/dark palettes,
  `ThemeProvider`.
- Full capture flow: live camera preview, gallery picker, optional text
  context, category shortcuts.
- Full result UI: problem/explanation, confidence, safety banner, steps,
  materials, time, difficulty, warnings, feedback, save-to-history.
- History: list, view a saved result again, delete one, empty state.
- Profile: plan/usage display, language switch (es/en), menu shell.
- i18n (es default, en), loading/error/empty states, local persistence.
- Safety risk classification (client-side keyword layer + UI banner).
- Unit tests for the risk classifier, entitlements limits, history
  persistence, and a UI component.

**Explicitly NOT implemented yet** (by design, per the phased plan):
- The backend service itself (no `/v1/analyses` endpoint exists).
- Any real AI provider integration — `MockAIService` returns canned,
  category-shaped results so the UI/flow can be built and tested now.
- Real authentication (`AnonymousAuthService` is a local-only stand-in).
- Real payments/subscriptions (RevenueCat/StoreKit/Play Billing) and ads.
- Server-side (authoritative) safety classification.
- "Explicámelo más fácil" and "Escuchar solución" accessibility features.
- Push notifications, analytics provider, remote image storage.

## Next steps

1. Stand up the backend (`POST /v1/analyses`), choose the AI provider, and
   swap `createAIService()` over to `RemoteAIService`.
2. Real auth provider decision + implementation behind `AuthService`.
3. Payments integration behind `EntitlementsService`.
4. Server-side risk classification, replacing/augmenting the client-side
   keyword layer.
5. EAS Build configuration + first TestFlight/Play internal test track.

See `ROADMAP.md` for the fuller, longer-term plan.
