import { IO } from '@funkia/io';
import {
	accum,
	Behavior,
	Future,
	performStream,
	runNow,
	sinkFuture,
	Stream,
	toPromise,
	when,
} from '@funkia/hareactive';
import {
	Action,
	newLogger,
	reactionLoop,
	setLogLevel,
	startDeploymentService,
	startOffersRuntime,
	startResourcesService,
} from '.';
import * as yargs from 'yargs';
import { Level, Logger } from 'pino';
import * as YAML from 'yaml';
import fs from 'fs';

export enum TimestampType {
	UPTIME = 'event_uptime',
	DEPLOY = 'event_deploy',
	UPDATE = 'event_update',
}

export enum TimestampPeriod {
	START = 'start',
	END = 'end',
}

export const globalVariables = {
	execution_expe_dir: '',
	logDirTimestamp: '',
	assemblyName: '',
	reconfigurationName: '',
};

type timestampDictType = {
	[timestampType: string]: {
		[timestampPeriod: string]: number;
	};
};

const allTimestampsDict: timestampDictType = {};

export const registerTimeValue = (
	timestampType: TimestampType,
	timestampPeriod: TimestampPeriod
): void => {
	if (timestampPeriod === TimestampPeriod.START) {
		if (timestampType in allTimestampsDict) {
			throw new Error(
				`Register time value start error: ${timestampType} for ${TimestampPeriod.START} already registered`
			);
		}
		allTimestampsDict[timestampType] = {};
		allTimestampsDict[timestampType][TimestampPeriod.START] = new Date().getTime() / 1000;
	} else {
		if (!(timestampType in allTimestampsDict)) {
			throw new Error(`Register time value end error: ${timestampType} never registered`);
		}
		if (TimestampPeriod.END in allTimestampsDict[timestampType]) {
			throw new Error(
				`Register time value start error: ${timestampType} for ${TimestampPeriod.END} already registered`
			);
		}
		allTimestampsDict[timestampType][TimestampPeriod.END] = new Date().getTime() / 1000;
	}
};

export const registerEndAllTimeValues = (logger: Logger): void => {
	logger.info('Registing end times');
	for (const timestampName in allTimestampsDict) {
		if (!(TimestampPeriod.END in allTimestampsDict[timestampName])) {
			logger.info(`Register end time for: ${timestampName}`);
			allTimestampsDict[timestampName][TimestampPeriod.END] = new Date().getTime() / 1000;
		}
	}
	logger.info('Done');
};

export const registerTimeValuesInFile = (logger: Logger): void => {
	logger.info('Writing file here: ' + globalVariables.logDirTimestamp);
	const reconfigurationDir = `${globalVariables.execution_expe_dir}/${globalVariables.reconfigurationName}`;
	const fileName = `${reconfigurationDir}/${globalVariables.assemblyName}_${globalVariables.logDirTimestamp}.yaml`;
	const yamlStr = YAML.stringify(allTimestampsDict);
	try {
		if (!fs.existsSync(reconfigurationDir)) fs.mkdirSync(reconfigurationDir);
		// eslint-disable-next-line no-empty
	} catch {}
	fs.writeFileSync(fileName, yamlStr);
	logger.info('Done writing file');
};

type RuntimeOptions = {
	deploymentName: string;
	deploymentHost: string;
	deploymentPort: number;
	heartbeatInterval: number;
	resourcesHost: string;
	resourcesPort: number;
	logLevel: Level;
};

const getOptions = (defaults: Partial<RuntimeOptions>): RuntimeOptions =>
	yargs.options({
		deploymentName: {
			alias: 'n',
			default: defaults.deploymentName || 'deployment',
			description: 'Name of the deployment (used for identification with other deployments).',
		},
		deploymentHost: {
			alias: 'dh',
			default: defaults.deploymentHost || '0.0.0.0',
			description: 'Host of the µs deployment service.',
		},
		deploymentPort: {
			alias: 'dp',
			default: defaults.deploymentPort || 19952,
			description: 'Port of the µs deployment service.',
		},
		resourcesHost: {
			alias: 'rh',
			default: defaults.deploymentHost || '127.0.0.1',
			description: 'Host of the µs resources service.',
		},
		resourcesPort: {
			alias: 'rp',
			default: defaults.resourcesPort || 19951,
			description: 'Port of the µs resources service.',
		},
		heartbeatInterval: {
			alias: 'hi',
			default: defaults.heartbeatInterval || 5,
			description: 'Heartbeat interval on connections between deployments in seconds.',
		},
		logLevel: {
			alias: 'v',
			default: defaults.logLevel || 'info',
			description:
				'Log level: "fatal", "error", "warn", "info", "debug", or "trace". Only affects default logger.',
		},
	}).argv as RuntimeOptions;

let exitCode = 0;
export const setExitCode = (newExitCode: number): void => {
	exitCode = newExitCode;
};

export const runDeployment = <S>(
	initOperation: IO<S>,
	operations: (action: Action) => (state: S) => IO<S>,
	nextAction: (offerUpdates: Stream<void>) => Behavior<Behavior<Future<Action>>>,
	options: Partial<RuntimeOptions> & { logger?: Logger; disableExit?: true } = {}
): Promise<S> => {
	const opts = getOptions(options || {});
	setLogLevel(opts.logLevel);
	const logger = options.logger || newLogger('runtime');
	logger.info('running deployment');
	const setup = async () => {
		const [resourcesService, deploymentService] = await Promise.all([
			startResourcesService(
				opts.resourcesHost,
				opts.resourcesPort,
				logger.child({ c: 'resources service' })
			),
			startDeploymentService(
				opts.deploymentHost,
				opts.deploymentPort,
				logger.child({ c: 'deployment service' })
			),
		]);
		const initialized = sinkFuture<void>();
		const offersRuntime = await startOffersRuntime(
			deploymentService,
			resourcesService,
			initialized,
			opts.deploymentName,
			opts.heartbeatInterval,
			logger.child({ c: 'offers runtime' })
		);

		const [stackActions, completed] = reactionLoop(
			initOperation,
			operations,
			nextAction(offersRuntime.inboundOfferUpdates),
			logger.child({ c: 'reaction loop' })
		);
		runNow(
			performStream(stackActions)
				.flatMap((actions) => accum(() => true, false, actions))
				.flatMap(when)
		).subscribe(() => initialized.resolve());
		const finalStack = await toPromise(completed);
		logger.info('wait everything');
		await Promise.all([
			resourcesService.stop(),
			deploymentService.stop(),
			offersRuntime.stop(),
		]);
		logger.info('end of run deployment');
		return finalStack;
	};

	return setup()
		.catch((err) => {
			logger.error(err, 'Deployment error');
			process.exit(1);
		})
		.finally(() => {
			registerEndAllTimeValues(logger);
			registerTimeValuesInFile(logger);
			logger.info('---------------------- Going to sleep --------------------------------\n');
			if (!options.disableExit) process.exit(exitCode);
		});
};
