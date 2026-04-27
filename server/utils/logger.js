const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { scrub } = require('./scrub');

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

const isProd = process.env.NODE_ENV === 'production';

/**
 * Console format: pretty in dev, JSON in production. We keep a single
 * Console transport in both environments so containerized deployments
 * can rely on stdout/stderr capture for log aggregation.
 */
const consoleFormat = isProd
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    )
    : winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
        winston.format.colorize({ all: true }),
        winston.format.errors({ stack: true }),
        winston.format.printf((info) => {
            const { timestamp, level, message, stack, ...rest } = info;
            const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
            const trace = stack ? `\n${stack}` : '';
            return `${timestamp} ${level}: ${message}${meta}${trace}`;
        }),
    );

const transports = [new winston.transports.Console({ format: consoleFormat })];

if (isProd) {
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const fileFormat = winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    );

    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: fileFormat,
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: fileFormat,
        }),
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    levels,
    transports,
    exitOnError: false,
});

/**
 * Wrap each log level so that any `meta` object (or extra args) passes
 * through the shared PII scrubber before it ever touches a transport.
 *
 * We don't wrap `logger.log` (the previous approach) because the level
 * helpers (logger.info, logger.warn, …) bypass logger.log and would
 * leak unsanitized data.
 */
function wrapLevel(name) {
    const original = logger[name].bind(logger);
    logger[name] = function wrappedLevel(message, meta, ...rest) {
        if (meta === undefined) {
            return original(message);
        }
        return original(message, scrub(meta), ...rest.map((r) => scrub(r)));
    };
}

['error', 'warn', 'info', 'http', 'debug'].forEach(wrapLevel);

/**
 * Build a logger that automatically includes the request id (and
 * optional user id) in every log line emitted from a controller.
 *
 * Usage:
 *   const log = logger.forRequest(req);
 *   log.info('payment processed', { bookingId });
 */
logger.forRequest = function forRequest(req) {
    const base = {
        requestId: req?.requestId,
        userId: req?.user?.id,
    };
    const child = {};
    ['error', 'warn', 'info', 'http', 'debug'].forEach((level) => {
        child[level] = (message, meta) => logger[level](message, { ...base, ...(meta || {}) });
    });
    return child;
};

module.exports = logger;
