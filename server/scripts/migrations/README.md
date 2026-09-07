# Database Migrations

Lightweight, dependency-free migration scripts for one-off schema/data changes.
Each migration is a standalone Node script named `YYYYMMDD_short_name.js` and is
**idempotent** (safe to re-run).

## Running a migration

```bash
cd server
# Ensure server/.env has a valid MONGO_URI (or pass it inline)
node scripts/migrations/20260614_add_tenancy.js
```

The script connects with the same `config/db.js` the app uses, prints a JSON
summary of what it changed, and exits 0 on success / 1 on failure.

## Conventions

- **Additive first.** Prefer adding nullable fields + a backfill over destructive
  changes. New fields default to `null`/`active` so existing rows stay valid.
- **Idempotent.** Only write when the source exists and the target differs, so a
  re-run is a no-op.
- **Backfill order matters.** e.g. `20260614_add_tenancy` fills `User.sector`
  before `Booking.sector` because bookings copy the (now-populated) student sector.

## Rollback posture

These migrations are additive. To roll back `20260614_add_tenancy`:

```js
// In a mongo shell — fields are safe to unset; app treats null as "unscoped legacy".
db.users.updateMany({}, { $unset: { sector: "", accountStatus: "" } });
db.bookings.updateMany({}, { $unset: { schoolId: "", sector: "" } });
db.schools.updateMany({}, { $unset: { sector: "" } });
```

> Backups: take a `mongodump` before running any migration in staging/prod. RPO/RTO
> and a tested restore drill are tracked separately (audit §5.5).

## Index

| Migration | Purpose |
|-----------|---------|
| `20260614_add_tenancy.js` | Backfill `User.sector`, `Booking.schoolId/sector`; reset orphaned `twoFactorEnabled`. |
