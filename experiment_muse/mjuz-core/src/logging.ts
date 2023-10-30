import Pino, { Level, Logger } from 'pino';

let rootLogger: any;
const childLoggers: Logger[] = [];

export const newLogger = (name: string, logFileName = ''): Logger => {
	if (rootLogger === undefined) {
		rootLogger = Pino(
			{
				prettyPrint: {
					ignore: 'hostname',
					hideObject: true,
					translateTime: true,
				},
				level: 'info',
			},
			Pino.destination(logFileName)
		);
	}

	const logger = rootLogger.child({ c: name });
	process.on('uncaughtException', (err) => {
		logger.error(err);
		process.exit(1);
	});

	process.on('unhandledRejection', (err) => {
		logger.error(err);
		process.exit(1);
	});

	process.on('UnhandledPromiseRejectionWarning', (err) => {
		logger.error(err);
		process.exit(1);
	});

	childLoggers.push(logger);
	return logger;
};

export const setLogLevel = (level: Level): void => {
	rootLogger.level = level;
	childLoggers.forEach((logger) => (logger.level = level));
};
