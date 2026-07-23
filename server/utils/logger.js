const winston = require('winston');

const isProd = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(
          ({ level, message, timestamp, ...meta }) =>
            `${timestamp} ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`
        )
      ),
  transports: [new winston.transports.Console()],
});

// A stream interface so morgan (HTTP request logging) can pipe through
// the same structured logger instead of writing straight to stdout.
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
