# OperationSRT Unit Testing Suite

## Overview

This Vitest-based test suite targets **production-hardening** for high-concurrency and high-security environments. Tests follow the **Arrange-Act-Assert (AAA)** pattern with meaningful descriptions.

## Running Tests

```bash
cd server
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Test Structure

| Directory | Focus |
|-----------|-------|
| `tests/middleware/` | Auth, error handling, upload middleware |
| `tests/utils/` | Upload middleware constants and error handling |
| `controllers/*.test.js` | Auth, payment, membership, financials, parent-link (colocated with controllers) |

## Identified Failure Modes

See **[FAILURE_MODES.md](./FAILURE_MODES.md)** for the full catalog of holes, boundary conditions, and security gaps identified in the implementation. The test suite targets these areas.

## Coverage Areas

### Defensive Edge Cases
- Null/undefined inputs
- Empty strings and whitespace-only values
- Malformed data structures (invalid ObjectIds, NaN, Infinity)
- Boundary values (negative amounts, zero, pagination limits)

### Security Boundaries
- Role injection and privilege escalation attempts
- Authorization bypass (accessing other users' data)
- Parent-child relationship enforcement
- Input sanitization and validation bypass

### Error Handling
- Production vs development error message exposure
- Catch block coverage
- No sensitive system information in client-facing errors

### Concurrency & Idempotency
- Documented in FAILURE_MODES.md; some operations (e.g. `confirmPayment`, `acceptParentLinkRequest`) have known race conditions that integration tests should cover.

## Mocking Strategy

- **mock-require** for controller tests: Vitest's `vi.mock()` does not intercept CommonJS `require()`. Controller tests use the `mock-require` package so Mongoose models, Stripe, and other dependencies are mocked before the controller loads.
- **Controller tests are colocated** (`controllers/*.test.js`) so mock paths match the controller's `require()` paths exactly.
- **vi.mock()** for middleware and utils (authMiddleware, errorHandler, uploadMiddleware) where ES module resolution applies.
- Models (User, Booking, Transaction, etc.), Stripe, JWT, and bcrypt are mocked to avoid DB and external service dependency.

## Known Limitations

- **Integration tests**: For full end-to-end flows (payment webhook idempotency, parent-link race conditions), consider adding integration tests with a test database.
