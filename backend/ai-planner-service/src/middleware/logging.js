/**
 * Safe logger for ai-planner-service
 */

let logger = console;
let morganLogger = (req, res, next) => next();

try {
  const winston = require("winston");
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: "ai-trip-planner" },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });
} catch (e) {
  logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => console.log('[DEBUG]', ...args),
  };
}

try {
  const morgan = require("morgan");
  morganLogger = morgan("dev");
} catch (e) {
  morganLogger = (req, res, next) => next();
}

const errorLogger = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  next(err);
};

const requestLogger = (req, res, next) => next();

const dbLogger = {
  logQuery: () => {},
  logError: (err) => logger.error("DB error:", err),
};

const aiLogger = {
  logRequest: (model, prompt) => logger.info(`AI request: ${model}`),
  logError: (model, prompt, err) => logger.error(`AI failed: ${model}`, err),
};

module.exports = {
  logger,
  morganLogger,
  errorLogger,
  requestLogger,
  dbLogger,
  aiLogger,
};
