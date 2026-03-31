const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { expirePendingRequests } = require('./services/bookingNotificationService');
const { startBookingExpiryJob } = require('./jobs/bookingExpiryCron');
const { validateEnvironment, parseFrontendOrigins } = require('./utils/envValidator');
const { initSentry } = require('./utils/sentry');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Validate required environment variables
validateEnvironment();
initSentry();

// Connect to the database
connectDB();

// Booking pending-request expiry: initial run + hourly cron (UTC)
mongoose.connection.once('connected', () => {
    startBookingExpiryJob({ run: expirePendingRequests });
});

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'https://api.whereby.com',
        'https://*.ingest.sentry.io',
        'https://*.ingest.de.sentry.io',
        'https://*.ingest.us.sentry.io',
      ],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Stripe/Whereby
}));

// Compression middleware
app.use(compression());

// CORS: in production only FRONTEND_URL origins (comma-separated) are allowed
const frontendOrigins = parseFrontendOrigins();
const allowedOrigins = frontendOrigins.length > 0
  ? frontendOrigins
  : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:3000']);
const isProduction = process.env.NODE_ENV === 'production';

app.use((req, res, next) => {
  const origin = req.headers.origin;

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (isProduction) {
    if (origin) {
      if (!allowedOrigins.includes(origin)) {
        if (req.method === 'OPTIONS') {
          return res.sendStatus(403);
        }
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else if (!allowedOrigins.length || !origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Rate limiting for auth endpoints
// More lenient in development, stricter in production
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 in production, 20 in development
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    return process.env.NODE_ENV !== 'production' && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  },
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // 100 in production, 500 in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip?.startsWith('::ffff:127.0.0.1');
    }
    return false;
  },
});

// This allows your server to accept JSON data in requests
// Note: Stripe webhook route needs raw body, so we handle that in paymentRoutes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static PDF files from uploads directory
app.use('/api/resources/pdf', express.static(path.join(__dirname, 'uploads', 'pdfs')));
// Serve static badge images from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('user-agent') });
  next();
});

// --- Define Your API Routes ---
// Apply rate limiting to auth routes
app.use('/api/auth', authLimiter, require('./routes/AuthRoutes'));
app.use('/api/auth/google', authLimiter, require('./routes/googleAuthRoutes'));

// Apply general rate limiting to API routes (webhooks excluded)
// Note: Webhook routes handle their own rate limiting if needed
app.use('/api', (req, res, next) => {
  // Skip rate limiting for webhook endpoints
  if (req.path.includes('/webhook')) {
    return next();
  }
  apiLimiter(req, res, next);
});

app.use('/api/users', require('./routes/UserRoutes'));
app.use('/api/memberships', require('./routes/MembershipRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/tutors', require('./routes/tutorRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/financials', require('./routes/financialsRoutes'));
app.use('/api/system-config', require('./routes/systemConfigRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/payroll', require('./routes/payrollRoutes'));
app.use('/api/availability', require('./routes/availabilityRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/scholarship', require('./routes/scholarshipRoutes'));
app.use('/api/assessment', require('./routes/assessmentRoutes'));
app.use('/api/matching', require('./routes/matchingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/whereby', require('./routes/wherebyRoutes'));

// Health check endpoint (before error handler)
app.get('/health', require('./routes/healthRoutes'));

// 404 handler for API routes (must be after all other routes)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    logger.warn(`API route not found: ${req.method} ${req.originalUrl}`, { ip: req.ip });
    res.status(404).json({ message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  } else {
    // For non-API routes, just return 404
    res.status(404).json({ message: 'Route not found' });
  }
});

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
});