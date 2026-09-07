# Report Card — Start Right Tutoring (OperationSRT) — 2026-06-15 (re-grade)

> **Auditor role:** Staff Security & Architecture Engineer (strict)
> **Scope:** Express/MongoDB API (`server/`) + React/Vite SPA (`client/`) + Docker/CI infra.
> **Baseline rubric:** `docs/UNIVERSAL_APP_REPORT_CARD_RUBRIC.md` (v1), Domains 1–5.
> **Weighting:** Disproportionate scrutiny on **Domain 1 (Security)** and **Domain 3 (Architecture — multi-tenant)** because the platform handles K-12/post-secondary student PII and must hold **public / private / charter** sector boundaries.
> **Re-grade context:** `Old` = initial audit (2026-06-13). `New` = post-P0-remediation (this pass, 2026-06-15) after the P0 epic (`P0_BETA_REMEDIATION_EPIC.md`) shipped: multi-tenant/sector data model + migration, `tenantScope` enforcement, hardened auth (live user reload + centralized hashing), real TOTP 2FA (server + client), and the duplicate-index cleanup. Verified by `npm run lint` (server, clean) and `npm test` (server, **19 files / 174 tests green**).

---

## Executive summary

**Top 3 strongest areas**
1. **Payment & webhook integrity (§1.6)** — Stripe signature verification (`constructEvent`), idempotency store (`ProcessedStripeEvent`), and a `received → processed/failed` lifecycle (`server/controllers/paymentController.js`).
2. **Deployment topology & CI (§3.6 / §5.1 / §5.2)** — Non-root pinned containers with healthchecks, compose dependency gates (`mongo → api → web`), and a two-package CI pipeline (lint + test + coverage threshold + build smoke).
3. **PII scrubbing & upload truth (§1.7 / §1.5)** — A real recursive log/Sentry scrubber (`server/utils/scrub.js`) plus magic-byte upload verification (`server/middleware/uploadMiddleware.js` + `utils/fileMagic.js`).

**Resolved since initial audit (all three critical blockers)**
1. **Multi-tenant / sector isolation now modeled and enforced (§3.3, §1.1).** Canonical `public/private/charter` vocabulary (`server/utils/tenancy.js`), denormalized `schoolId`+`sector` on `User` and `Booking`, tenant indexes, an idempotent backfill migration, and a `tenantScope` middleware resolving `req.tenant` by role (wired into `schoolRoutes`).
2. **Authentication is now trustworthy (§1.1).** `authMiddleware` reloads the user every request (fresh role / `schoolId` / `sector` / `accountStatus`), real RFC-6238 TOTP 2FA gates login end-to-end (challenge → `/api/auth/2fa/verify` → client UI), and password hashing is centralized in an idempotent `User` pre-save hook.

**Top next investments (now non-blocking)**
1. **Logging hygiene (§1.7).** Pervasive `console.*` of raw errors/identifiers still bypasses the scrubber — a FERPA-relevant cleanup, not a blocker.
2. **Validator coverage + append-only audit trail (§1.2, §5.4).** Extend express-validator coverage beyond the current modules and persist privileged mutations to an audit log.

**Beta verdict: READY FOR BETA (conditional).** All three critical authorization/tenancy/identity blockers from the initial audit are remediated and test-covered; infrastructure, payments, and observability remain production-grade. Remaining items are quality/hardening (logging hygiene, validator breadth, a11y, audit trail) and are acceptable to carry into a controlled beta with first school partners. See [Critical vulnerabilities — status](#top-3-critical-vulnerabilities-blocking-beta--resolved).

---

## Scorecard

| Domain & Subcategory | Old | New | Evidence of improvement (or reason for no change) |
|----------------------|-----|-----|---------------------------------------------------|
| **Security — AuthN / AuthZ** | C+ | **A-** | **Resolved all three prior gaps.** (1) `authMiddleware` now reloads the user from the DB every request and rejects deleted/suspended/`accountStatus!=='active'` accounts immediately — no more 8h stale-claim window (`server/middleware/AuthMiddleware.js`); tenant context (`schoolId`/`sector`) is also refreshed per request. (2) **Real RFC-6238 TOTP 2FA** (`server/utils/twoFactor.js`): `loginUser` issues a 5-min challenge token when 2FA is on, `POST /api/auth/2fa/verify` completes it (`authController.js`), enrollment verifies a code before activating (`userController.js enableTwoFactor`/`verifyTwoFactorSetup`), and disable is code-gated. Client wiring complete (`TwoFactorChallenge`, Settings enrollment modal). (3) Password hashing centralized in an **idempotent** `User` pre-save hook (`server/models/User.js`), removing the 6× duplication risk. Authorization additionally gains the `tenantScope` middleware. **Residual (minor):** `JWT_REFRESH_SECRET` fallback warning remains. Covered by new auth/2FA/middleware tests (174 server tests green). |
| **Security — Input validation** | B- | **B** | Shared express-validator chains + `validateRequest` (`server/middleware/validate.js`). **Improved:** email format validator **restored** on the model (`server/models/User.js:98-101`) and a `sector` enum validator added for school creation (`middleware/validators/schools.js`). **Residual:** validator-module coverage still trails route-group count (profile/booking/challenge/resource/ai use inline checks). |
| **Security — Secrets management** | — | **B** | Fail-fast env validation incl. JWT length ≥32 and prod-required set (`server/utils/envValidator.js`); `.env` + `*.pem/*.key` git-ignored (`.gitignore`); `.env.example` present. **Gap:** `JWT_REFRESH_SECRET` silently falls back to `JWT_SECRET + '_refresh'` (warn only) (`authController.js:16-18`); no rotation playbook (see §5.8). |
| **Security — Transport & headers** | — | **B+** | Helmet CSP with `scriptSrc 'self'`, prod CORS allow-list returning 403 (`server/server.js:48-107`), configurable `trust proxy`, end-to-end request IDs. **Minor:** `styleSrc 'unsafe-inline'`; HSTS left to upstream TLS terminator. |
| **Security — File uploads** | — | **A-** | Post-write magic-byte verification deletes spoofed files (`server/middleware/uploadMiddleware.js:202-232`), mime+extension allow-list, size caps, filename sanitization, authenticated serving. Residual: local-disk storage (not signed-URL bucket) — fine for beta scale. |
| **Security — Payments security** | — | **A-** | Webhook signature verification + idempotency + lifecycle, raw body mounted before JSON parser (`server/server.js:141`, `server/controllers/paymentController.js:220-278`). |
| **Security — PII / logging** | — | **B** | Robust scrubber (keys + JWT/Bearer/Stripe/card/email value patterns, depth/length caps) wired into logger + Sentry (`server/utils/scrub.js`); prod error responses hide stack/messages (`server/middleware/errorHandler.js:72-103`). **Gap:** pervasive `console.log/console.error` of raw errors and student identifiers across controllers bypasses the scrubber (e.g. `userController.js`, `schoolController.js`, `authController.js:137-140`) — a FERPA-relevant leak surface. |
| **Security — Client security** | — | **A-** | Token kept **in memory, not `localStorage`** (`client/src/api/authStorage.js`); zero `dangerouslySetInnerHTML`/`innerHTML` usages in `client/src`; `ErrorBoundary` present. |
| **Testing — Breadth** | — | **B-** | 17 server test files incl. auth/payment/membership/financials/parent-link controllers + middleware + utils; 4 client tests. High-risk money/auth covered. **Gap:** users, schools, bookings, analytics, scholarship-payout controllers untested. |
| **Testing — Depth / quality** | — | **B** | Behavior-focused on covered paths (payment idempotency, scholarship eligibility). **Gap:** Mongo is mocked (`server/models/__mocks__`); little real-HTTP/test-DB integration. |
| **Testing — Infra / CI** | — | **A-** | `.github/workflows/ci.yml`: per-package jobs, `npm ci`, lint+test+coverage(threshold-gated)+build smoke, concurrency cancel, least-privilege token, coverage artifacts. |
| **Testing — Lint / static analysis** | — | **B+** | ESLint configs checked in for client + server; CI gates lint. Server is plain JS (no type checking); client partially TS. |
| **Testing — Code hygiene / smells** | C+ | **B-** | **Improved:** password hashing de-duplicated into one idempotent model hook (was 6×); duplicate `{ email: 1 }` index declaration removed (`unique: true` already creates it), clearing the Mongoose duplicate-index warning. New tenancy/2FA logic is isolated in dedicated utils (`utils/tenancy.js`, `utils/twoFactor.js`) with unit tests. **Residual:** controllers still bypass `errorHandler` with local `try/catch → console.error`; Mongo-error detection still copy-pasted. |
| **Testing — Build health** | — | **B+** | Client Vite build runs in CI; server boots under Node 20; Docker image builds. |
| **Architecture — Backend layering** | — | **C+** | `services/` and rule utils exist (`bookingAccess.js`, `payrollUtils.js`, `matchingUtils.js`, `scholarshipService.js`). **Gap:** controllers are fat and own validation + hashing + data access + aggregation (`userController.js` ~850 lines; `schoolController.js` inlines the metrics `$facet`). Rules leak across controllers. |
| **Architecture — API consistency** | — | **C+** | Canonical error envelope + `pagination` util defined, but success shapes are inconsistent (bare doc vs `{success,...}` vs `{message}`), error envelopes drift wherever controllers bypass `errorHandler`, and large lists are unpaginated (`getAllUsers` returns **all** users — `userController.js:217-229`). No OpenAPI. |
| **Architecture — Data modeling** | B- | **B+** | **Major improvement.** Canonical sector vocabulary incl. **charter** (`server/utils/tenancy.js` `SECTORS`); denormalized `schoolId`+`sector` tenant keys on `User` and `Booking` with dedicated indexes (`schoolId+role`, `sector`, `Booking.schoolId/sector + sessionDate`); new `accountStatus` lifecycle + `twoFactorPendingSecret`. **Migration tooling now exists** — idempotent runner `server/scripts/migrations/20260614_add_tenancy.js` + conventions in `scripts/migrations/README.md`. Duplicate email index removed. **Residual:** `User` remains a large god-document (deliberately not refactored to protect beta velocity); tenant keys not yet propagated to `Resource`/`Challenge`/`Announcement` (not on the live multi-tenant surface for first partners). |
| **Architecture — Client architecture** | — | **B** | Shared primitives (`Button/Card/Dialog/Modal/Toast/Skeleton`), page-based routing, `routePrefetch` + lazy loading, TS types for challenges. Some duplication remains. |
| **Architecture — Cross-cutting concerns** | — | **B** | Request IDs + structured `requestLogger` + Sentry-with-scrub are strong, but undercut by ad-hoc `console.*` and inconsistent user-facing error `code`s. |
| **Architecture — Deployment topology** | — | **A-** | `docker-compose.yml` health gates (`service_healthy` mongo→api→web), non-root `Dockerfile` (`node:20-alpine`, uid 1001), `/health` DB ping healthcheck. |
| **UX — Consistency** | — | **B-** | Shared `Toast` / `ConfirmDialog` / `Dialog` primitives suggest one async-feedback pattern; not fully verified for stray `window.confirm`/bespoke modals. |
| **UX — Accessibility** | — | **C** | No evidence of a11y testing, aria audit, or focus management verification on modals; unverified keyboard paths. Pre-production for an institutional buyer (district procurement often requires WCAG). |
| **UX — Bundle / runtime performance** | — | **B** | Vite with chunking + lazy routes + `routePrefetch`; CI build smoke. Not profiled. |
| **UX — Responsive / adaptive layout** | — | **B-** | Tailwind utility-first; breakpoints not verified against mobile widths in this audit. |
| **UX — Error UX** | — | **B+** | `requestId` returned in error body and exposed via `X-Request-Id` header (`server.js:84`, `errorHandler.js:85-87`); `ErrorBoundary` provides recovery. |
| **UX — i18n readiness** | — | **D** | Single-locale, no centralized string catalog. Acceptable-as-intentional for MVP per rubric §4.6. |
| **DevOps — CI / CD** | — | **A-** | Strong pipeline (above). **Gap:** no explicit staging/prod promotion stage (manual deploy implied). |
| **DevOps — Containers / process** | — | **A-** | Non-root, pinned, healthchecked, dependency-ordered compose. |
| **DevOps — Logging & tracing** | — | **B** | Structured logger + requestId correlation; weakened by pervasive `console.*`. |
| **DevOps — Health & audit** | — | **C+** | `/health` pings Mongo and returns 503 when down (`server/routes/healthRoutes.js`). **Gap:** `TelemetryEvent` + `ModerationLog` exist, but privileged mutations (role change, user delete, admin password reset, school creation, scholarship payout approval) are **not** written to an append-only audit trail — only `console.log` (`userController.js:341,371`). |
| **DevOps — Database ops** | C | **B-** | **Improved:** a versioned, idempotent, re-runnable migration pattern is now in place (`server/scripts/migrations/` + README), first exercised by the tenancy backfill (reset 3 orphaned `twoFactorEnabled` accounts; backfill no-op pending school-linked data). **Residual:** still no stated RPO/RTO or tested restore posture. |
| **DevOps — Docs & onboarding** | — | **B+** | `README.md`, `STRIPE_SETUP.md`, `GOOGLE_WORKSPACE_SETUP.md`, `README-ADMIN-SETUP.md`, `README-SCRIPTS.md`, `docs/TESTING.md`, `docs/FAILURE_MODES.md`. Local run path is clear. |
| **DevOps — Dependency hygiene** | — | **B** | Lockfiles + `npm ci` in CI + `npm audit` (advisory, non-blocking). No Dependabot/Renovate evident. |
| **DevOps — Secrets & rotation** | — | **C+** | Git-ignored + validated, but no rotation playbook/automation/secret-manager integration. |

---

## Top 3 critical vulnerabilities (blocking beta) — RESOLVED

> All three initial critical blockers were remediated in the P0 epic and verified by the server lint + test suites (**19 files / 174 tests green**). Status below.

### ✅ #1 — Multi-tenant / sector isolation — **RESOLVED**
**Rubric:** §3.3 Data modeling, §1.1 Authorization · **Was: Critical**

- **Charter is now modeled** and the sector vocabulary is canonical and validated:

```1:8:server/utils/tenancy.js
const SECTORS = ['public', 'private', 'charter'];
```

- Tenant keys (`schoolId` + `sector`) are denormalized onto `User` and `Booking` with dedicated indexes, and a reusable `buildTenantFilter` / `assertSameTenant` enforces scoping.
- A `tenantScope` middleware resolves `req.tenant` (`global` / `school` / `self`) by role and is wired into `schoolRoutes`; `school_admin` without a school binding is rejected.
- `authMiddleware` now refreshes `schoolId`/`sector` per request, so controller-level isolation operates on fresh tenant context.
- Backfill handled by an idempotent migration (`server/scripts/migrations/20260614_add_tenancy.js`).

**Residual (non-blocking):** tenant keys not yet propagated to `Resource`/`Challenge`/`Announcement` (off the live partner surface); admin global-list endpoints self-enforce tenant filtering in-controller.

---

### ✅ #2 — Real TOTP two-factor authentication — **RESOLVED**
**Rubric:** §1.1 Identity · **Was: Critical**

- RFC-6238 TOTP implemented with zero external deps (`server/utils/twoFactor.js`): secret generation, `otpauth://` provisioning URI, and time-window verification.
- `loginUser` issues a short-lived (5-min) challenge token when 2FA is active; `POST /api/auth/2fa/verify` validates the code and only then issues real session tokens.
- Enrollment requires verifying a live code before activation (`enableTwoFactor` → `verifyTwoFactorSetup`); disable is **code-gated** to stop a hijacked session from silently removing the factor.
- **Client fully wired:** `TwoFactorChallenge` on both login pages, a self-contained Settings enrollment/disable modal, and a zero-dependency client-side QR renderer (the secret never leaves the browser).
- Covered by new `authController` 2FA-flow tests and `twoFactor` unit tests.

---

### ✅ #3 — Live authorization + centralized password hashing — **RESOLVED**
**Rubric:** §1.1 Authorization & Identity · **Was: High → Critical**

- `authMiddleware` reloads the user every request and rejects missing/inactive accounts immediately — eliminating the up-to-8h stale-claim window for deleted/suspended/downgraded users:

```server/middleware/AuthMiddleware.js
const user = await User.findById(claimedId).select('role accountStatus schoolId sector');
if (!user) { /* reject */ }
if (user.accountStatus && user.accountStatus !== 'active') { /* reject */ }
req.user = { id: String(user._id), role: user.role, schoolId: user.schoolId || null, sector: user.sector || null };
```

- The model-level password-hashing pre-save hook is **re-enabled and idempotent** (skips already-bcrypt-hashed values via a version-prefix guard), so hashing is guaranteed at the data layer regardless of call site — closing the plaintext-persistence risk.
- Covered by the rewritten `authMiddleware` tests (real JWT signing + mocked `User`).

---

## Methodology & evidence index

- **Auth/session:** `server/middleware/AuthMiddleware.js`, `server/controllers/authController.js`, `server/routes/AuthRoutes.js`
- **Tenancy:** `server/models/User.js`, `server/models/School.js`, `server/controllers/schoolController.js`, `server/controllers/userController.js`, `server/controllers/analyticsController.js`
- **Input/errors:** `server/middleware/validate.js`, `server/middleware/validators/*`, `server/middleware/errorHandler.js`
- **Secrets/transport:** `server/utils/envValidator.js`, `server/server.js`, `.gitignore` (`server/.env` confirmed **not** tracked)
- **Uploads/payments:** `server/middleware/uploadMiddleware.js`, `server/utils/fileMagic.js`, `server/controllers/paymentController.js`, `server/models/ProcessedStripeEvent.js`
- **PII/logging:** `server/utils/scrub.js`, `server/utils/logger.js`, `server/utils/sentry.js`
- **Client:** `client/src/api/authStorage.js`, `client/src/components/**`
- **Infra/CI:** `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `server/routes/healthRoutes.js`

> **Re-grade note (2026-06-15):** Critical #1–#3 were converted into the P0 epic (`P0_BETA_REMEDIATION_EPIC.md`) and shipped. New evidence files this pass: `server/utils/tenancy.js`, `server/utils/twoFactor.js`, `server/middleware/tenantScope.js`, `server/scripts/migrations/20260614_add_tenancy.js`, `client/src/components/auth/TwoFactorChallenge.jsx`, `client/src/components/common/QRCode.jsx`, `client/src/utils/qrcode.js`. Next re-grade cadence: after logging-hygiene + validator-coverage sweep.
