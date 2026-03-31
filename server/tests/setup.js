/**
 * Vitest setup: mock env and global dependencies for unit tests.
 * Ensures tests run without real DB, Stripe, or external services.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_unit_tests';
