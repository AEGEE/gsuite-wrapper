const winston = require('winston');

// Setting logLevel to warn in case of testing, to display only errors and warnings.
const logLevel = process.env.NODE_ENV.includes('test') ? 'warn' : 'debug';

const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.align(),
                winston.format.splat(),
                winston.format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`),
            ),
        }),
    ],
});

/* istanbul ignore next */
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({ filename: 'error-warn.log',
        level: 'warn',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.align(),
            winston.format.splat(),
            winston.format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`),
        ) }));
}

if (process.env.NODE_ENV === 'test') {
    logger.add(new winston.transports.File({ filename: 'aalllll.log',
        level: 'info',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.align(),
            winston.format.splat(),
            winston.format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`),
        ) }));
}

logger.stream = {
    write(message) {
        logger.info(message.substring(0, message.lastIndexOf('\n')));
    },
};

module.exports = logger;
