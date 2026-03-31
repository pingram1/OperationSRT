const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about our colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message} ${info.meta ? JSON.stringify(info.meta) : ''}`
  )
);

// Define which transports to use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message} ${info.meta ? JSON.stringify(info.meta) : ''}`
      )
    ),
  }),
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, '..', 'logs');
  
  // Create logs directory if it doesn't exist
  const fs = require('fs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Remove sensitive data from log metadata
const sanitizeMeta = (meta) => {
  if (!meta || typeof meta !== 'object') return meta;
  
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'apiKey', 'apikey'];
  const sanitized = { ...meta };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Override logger methods to sanitize sensitive data
const originalLog = logger.log.bind(logger);
logger.log = function(level, message, meta) {
  const sanitizedMeta = sanitizeMeta(meta);
  return originalLog(level, message, sanitizedMeta);
};

module.exports = logger;


