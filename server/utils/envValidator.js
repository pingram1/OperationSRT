/**
 * Validates that all required environment variables are set.
 * In production, Stripe, email, FRONTEND_URL, and Sentry are required and the process exits on failure.
 */
const logger = require('./logger');

const requiredEnvVars = {
  critical: ['MONGO_URI', 'JWT_SECRET'],
  important: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
  optional: [
    'FRONTEND_URL', // required in production; optional in dev (CORS falls back to localhost)
    'WHEREBY_API',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'SENTRY_DSN',
  ],
};

/** Variables that must be set when NODE_ENV === 'production' */
const productionRequired = [
  'MONGO_URI',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'FRONTEND_URL',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'SENTRY_DSN',
];

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function parseFrontendOrigins() {
  const raw = process.env.FRONTEND_URL;
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

function exitMissing(label, names) {
  logger.error(`Missing ${label} environment variables:`, { missing: names });
  console.error(`\n❌ ERROR: Missing ${label} environment variables:`);
  names.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\nSee .env.example and set these variables, then restart the server.\n');
  process.exit(1);
}

function validateEnvironment() {
  const missing = {
    critical: [],
    important: [],
  };

  requiredEnvVars.critical.forEach((varName) => {
    if (!process.env[varName]) {
      missing.critical.push(varName);
    }
  });

  requiredEnvVars.important.forEach((varName) => {
    if (!process.env[varName]) {
      missing.important.push(varName);
    }
  });

  const missingOptional = requiredEnvVars.optional.filter((varName) => !process.env[varName]);
  if (missingOptional.length > 0) {
    logger.warn(`Missing optional environment variables: ${missingOptional.join(', ')}`);
  }

  if (missing.critical.length > 0) {
    exitMissing('critical', missing.critical);
  }

  if (!isProduction()) {
    if (missing.important.length > 0) {
      logger.warn('Missing important environment variables:', { missing: missing.important });
      console.warn('\n⚠️  WARNING: Missing important environment variables:');
      missing.important.forEach((varName) => {
        console.warn(`   - ${varName}`);
      });
      console.warn('\nSome features may not work correctly.\n');
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      logger.warn('JWT_SECRET is less than 32 characters. Consider using a longer, more secure secret.');
      console.warn('\n⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security.\n');
    }

    if (
      process.env.MONGO_URI
      && !process.env.MONGO_URI.startsWith('mongodb://')
      && !process.env.MONGO_URI.startsWith('mongodb+srv://')
    ) {
      logger.warn('MONGO_URI does not appear to be a valid MongoDB connection string.');
      console.warn('\n⚠️  WARNING: MONGO_URI should start with mongodb:// or mongodb+srv://\n');
    }

    logger.info('Environment validation completed');
    return;
  }

  // --- Production: strict ---
  const prodMissing = productionRequired.filter((name) => !process.env[name]);
  if (prodMissing.length > 0) {
    exitMissing('production-required', prodMissing);
  }

  const origins = parseFrontendOrigins();
  if (origins.length === 0) {
    logger.error('FRONTEND_URL must list at least one origin in production');
    console.error('\n❌ ERROR: FRONTEND_URL must be set to at least one URL (comma-separated for multiple).\n');
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET must be at least 32 characters in production');
    console.error('\n❌ ERROR: JWT_SECRET must be at least 32 characters in production.\n');
    process.exit(1);
  }

  const mongo = process.env.MONGO_URI;
  if (!mongo.startsWith('mongodb://') && !mongo.startsWith('mongodb+srv://')) {
    logger.error('MONGO_URI must be a valid MongoDB connection string in production');
    console.error('\n❌ ERROR: MONGO_URI must start with mongodb:// or mongodb+srv://\n');
    process.exit(1);
  }

  logger.info('Environment validation completed (production strict mode)');
}

module.exports = { validateEnvironment, parseFrontendOrigins };
