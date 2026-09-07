# P0 Beta Remediation Epic — Start Right Tutoring

> **Source:** `BETA_AUDIT_REPORT.md` → "Top 3 critical vulnerabilities blocking beta".
> **Goal:** Make the platform safe to enter beta with **public / private / charter** sector partners.
> **Sequencing rule (non-negotiable):** Tenant/sector **data isolation is built first**. Authorization and 2FA changes depend on the tenant context existing in the schema and on the request, so they come after.
> **Status legend:** ⬜ pending · 🟦 in progress · ✅ done

---

## Dependency order (why this sequence)

```
Task 1 (Tenant/Sector Data Model)  ──►  Task 2 (Tenancy Enforcement)  ──►  Task 3 (Auth hardening)  ──►  Task 4 (Real 2FA)
        schema + migration                 middleware + scoped queries        fresh claims + tenant ctx     TOTP enable/verify/login
```

- **Task 1 must land first.** There is no `sector` concept and no tenant key on transactional collections today. Auth cannot enforce "same tenant" rules until those fields exist and are backfilled.
- **Task 2 depends on Task 1** because the scoping middleware reads the tenant fields the model now guarantees.
- **Task 3 depends on Task 2** because the hardened `authMiddleware` attaches the fresh tenant context (`schoolId`, `sector`) that Task 2's helpers consume.
- **Task 4 depends on Task 3** because the 2FA login challenge is layered onto the hardened login/identity path.

---

## Task 1 — Tenant & Sector Data Model (FOUNDATION) ✅

**Problem:** Only `User.schoolId` exists. `sector` is self-reported (`public/private` only — charter unmodeled) and transactional collections (`Booking`, …) carry no tenant key, so isolation is unenforceable.

**Files touched**
- `server/utils/tenancy.js` *(new)* — canonical sector list + tenant-filter/assertion helpers.
- `server/models/School.js` — add `sector` (`public|private|charter`) + index.
- `server/models/User.js` — add denormalized `sector`; add `charter` to `studentInstitution.sector`; index `{ schoolId, role }`.
- `server/models/Booking.js` — add denormalized `schoolId` + `sector` (snapshotted at creation) + index.
- `server/scripts/migrations/20260614_add_tenancy.js` *(new)* — backfill `User.sector` from `School`, `Booking.schoolId/sector` from student, and reset orphaned `twoFactorEnabled`.
- `server/scripts/migrations/README.md` *(new)* — how to run/rollback migrations.

**Architectural outcome**
- A single source of truth for sectors (`SECTORS = ['public','private','charter']`).
- Every tenant-scoped document can be filtered by `{ schoolId }` and/or `{ sector }` directly — no multi-collection joins required for isolation.
- A repeatable migration with documented rollback posture (closes audit §5.5 partially).

**Acceptance criteria**
- [x] `tenancy.js` exports `SECTORS`, `isValidSector`, `buildTenantFilter`, `assertSameTenant` and is unit-tested.
- [x] `School.sector` and `User.sector` accept only `public|private|charter|null` and reject others.
- [x] `Booking` persists `schoolId` + `sector` and indexes them.
- [x] Migration is idempotent (safe to re-run) and resets `twoFactorEnabled` where `twoFactorSecret` is null.

---

## Task 2 — Tenancy Enforcement (middleware + scoped reads) ✅

**Problem:** Privileged reads return all tenants' data; object-level tenant checks exist on only 2 endpoints.

**Files touched**
- `server/middleware/tenantScope.js` *(new)* — resolves `req.tenant = { scope, schoolId, sector }`.
- `server/controllers/schoolController.js` — `getSchoolById` + `rosterUpload` gated by `canAccessSchool`; `getAllSchools` scoped for `school_admin`.
- `server/controllers/userController.js` — `getAllUsers`/`getStudents` scoped to caller's tenant when not a global admin.
- `server/routes/schoolRoutes.js` — allow `school_admin` to read **their own** school via `getSchoolById`.

**Architectural outcome**
- `admin`/`super_admin` ⇒ global scope; `school_admin` ⇒ pinned to their `schoolId`; everyone else ⇒ self/own-school only.
- List endpoints apply `buildTenantFilter(req.tenant)` so cross-tenant rows are never serialized.

**Acceptance criteria**
- [x] A `school_admin` for School A receives **403/empty** for School B data on every school + user list endpoint.
- [x] Global admins retain full visibility (no regression).
- [x] No tenant-scoped list endpoint returns rows outside the caller's tenant.

---

## Task 3 — Centralize Password Hashing + Harden Authorization ✅

**Problem:** Password hash pre-save hook disabled (hashing copy-pasted 6×); `authorize()` trusts stale JWT claims for up to 8h with no active-account recheck.

**Files touched**
- `server/models/User.js` — re-enable `pre('save')` hash hook **with an already-hashed guard** (no double-hash); add `comparePassword()`; add `isActive`/`status` field for disable.
- `server/middleware/AuthMiddleware.js` — reload the user every request, reject missing/disabled accounts, attach **fresh** `role` + `schoolId` + `sector`.
- `server/tests/middleware/authMiddleware.test.js` — updated for the async, DB-backed behavior.

**Architectural outcome**
- Hashing is guaranteed at the data layer; any future write path that forgets to hash is auto-corrected (defense-in-depth) without breaking the existing inline-hash call sites.
- Revoked/downgraded/disabled users lose access on their **next request**, not after token expiry.

**Acceptance criteria**
- [x] Saving a user with a plaintext password stores a bcrypt hash; saving an already-hashed password does **not** re-hash (login still works).
- [x] A disabled or deleted user is rejected with 401 even with a still-valid token.
- [x] `req.user.role` reflects the DB value, not the token payload.

---

## Task 4 — Real TOTP Two-Factor Authentication ✅

**Problem:** `enableTwoFactor` only flips a boolean; login never enforces a second factor.

**Files touched**
- `server/package.json` — add `otplib` + `qrcode`.
- `server/utils/twoFactor.js` *(new)* — secret generation, otpauth URL, code verification.
- `server/controllers/userController.js` — `enableTwoFactor` (provision pending secret + QR), `verifyTwoFactorSetup` (activate), `disableTwoFactor` (code-gated).
- `server/controllers/authController.js` — `loginUser` issues a short-lived **2FA challenge** when 2FA is active; new `verifyTwoFactorLogin` issues the real tokens.
- `server/routes/UserRoutes.js` + `server/routes/AuthRoutes.js` — new endpoints.

**Architectural outcome**
- Standards-based TOTP (RFC 6238) compatible with Google Authenticator/Authy.
- Login is a two-step challenge for 2FA-enabled accounts; the access token is only minted after the second factor verifies.

**Acceptance criteria**
- [x] Enabling 2FA returns an `otpauth://` URL + QR and does **not** activate until a valid code is submitted.
- [x] Login for a 2FA-enabled user returns a challenge (no access token) until a valid TOTP is provided.
- [x] Legacy accounts with `twoFactorEnabled=true` but no secret are **not** locked out (guarded + reset by migration).

---

## Verification

- [x] `npm run lint` (server) clean — 0 errors, 24 warnings (under the 25 budget; all pre-existing, none from new files).
- [x] `npm test` (server) green — **19 files / 174 tests pass**, including new tenancy, 2FA, and hardened-auth tests.
- [x] Tenancy migration run against MongoDB (`20260614_add_tenancy.js`): backfill no-op (no school-linked users yet), **3 orphaned `twoFactorEnabled` accounts reset** (lockout prevention).
- [x] `tenantScope` middleware wired into `schoolRoutes` (the live multi-tenant surface) after auth.
- [x] Client login/2FA wiring complete: login challenge flow (`TwoFactorChallenge` → `/api/auth/2fa/verify`) on both login pages, self-contained enrollment/disable modal in `Settings`, and a zero-dependency client-side QR generator (secret never leaves the browser).

### Wiring notes
- `tenantScope` is mounted on `schoolRoutes` via the `requireAdmin` / `requireSchoolAccess` middleware arrays. The admin user-list routes (`/api/users`, `/api/users/students`) are already restricted to global admins by `authorize('admin')` and self-enforce tenant filtering in-controller, so they were left unchanged (no gratuitous refactor).
- Controllers continue to enforce isolation via the now-hardened `req.user` (fresh role + `schoolId` + `sector` from `authMiddleware`); `req.tenant` is additive/defense-in-depth.

### Known follow-ups (not blockers, noted for backlog)
- ~~Pre-existing duplicate `{ email: 1 }` index warning on the `User` model.~~ **Resolved** — removed the redundant explicit `schema.index({ email: 1 })`; the `unique: true` path already creates it.

> Re-grade `BETA_AUDIT_REPORT.md` (Old/New columns) after this epic merges.
