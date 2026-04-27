/** @type {import('vitest').UserConfig} */
module.exports = {
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['**/*.test.js'],
    exclude: ['node_modules', 'uploads'],
    coverage: {
      provider: 'v8',
      // text: console summary; json + lcov: machine-readable for CI / GH
      // artifact upload; html: drillable for local debugging.
      reporter: ['text', 'text-summary', 'json', 'lcov', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        '**/*.test.js',
        'uploads',
        'logs',
        'coverage',
        'vitest.config.js',
        'eslint.config.js',
        // Manual scripts that aren't unit-tested by design.
        'scripts/**',
        // Wiring file; integration-tested via running the server.
        'server.js',
        // DB connector; covered by integration / smoke testing only.
        'config/**',
        'jobs/**',
      ],
      /**
       * Conservative ratchet thresholds based on the current measured
       * coverage. Set just below the present floor so a future PR that
       * deletes a passing test (or ships a large untested file) fails
       * CI immediately, without forcing every contributor to chase
       * coverage on day-1. Bump these up once new tests land.
       *
       * Measured 2026-04-27 against 146 passing tests:
       *   lines: 15.79  → threshold 14
       *   functions: 29.25 → threshold 27
       *   branches: 57.42 → threshold 54
       *   statements: 15.79 → threshold 14
       */
      thresholds: {
        lines: 14,
        functions: 27,
        branches: 54,
        statements: 14,
      },
    },
    testTimeout: 10000,
    hookTimeout: 5000,
  },
};
