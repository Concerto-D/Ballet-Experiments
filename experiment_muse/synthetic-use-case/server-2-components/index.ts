import {
	emptyProgram,
	getStack,
	nextAction,
	operations, registerTimeValue,
	runDeployment,
	sigint,
	sigquit, TimestampPeriod, TimestampType
} from '@mjuz/core';
import { Wish, RemoteConnection } from '@mjuz/core/resources';
import { Behavior } from '@funkia/hareactive';
import {ServerInstallResource} from "../serverInstall";
import {DepInstallResource} from "../depInstall";
import {
	goToSleep, initializeReconf
} from '../metricAnalysis'

const [
	config_file_path,
	timestamp_log_file,
	current_execution_dir,
	reconfiguration_name,
	nbScalingNodes,
	depNum,
	inventory,
	installTime,
	runningTime,
	updateTime,
	logger
] = initializeReconf("server")

logger.info("script parameters:");
logger.info(config_file_path)
logger.info(timestamp_log_file)
logger.info(current_execution_dir)
logger.info(reconfiguration_name)
logger.info(`${nbScalingNodes}`)
logger.info(`${depNum}`)
logger.info("------------");

let deployTimestampRegistered = false;

const program = async () => {
	logger.info("------ PROGRAM LAUNCHED -----------");
	
	// Register START timestamp for reconfiguration time
	if (!deployTimestampRegistered) {
		let timestampType;
		if(reconfiguration_name === "deploy") {
			timestampType = TimestampType.DEPLOY;
		}
		else {
			timestampType = TimestampType.UPDATE;
		}
		registerTimeValue(timestampType, TimestampPeriod.START);
		deployTimestampRegistered = true;
	}
	
	// Create install ressource and wishes
	const remoteConns = [];
	const installWishes = [];
	const installDepOffers = [];
	let depNum: number;
	for (depNum = 0; depNum < nbScalingNodes; depNum++) {
		const depName = `dep${depNum}`;
		const depHost = inventory[depName].split(":")[0];
		let remoteConn = new RemoteConnection(depName, { port: 19954 + 2*depNum, host: depHost});
		
		// For update: delete and replace wish, else the server will be created before the new Offer is
		// resolve for the wish
		// TODO: check if this is automatically handled by Mjuz, it should not because the wish is replaced the exact moment it received the withdrawal of the offer
		let depWish = new Wish<DepInstallResource>(remoteConn, `dep${depNum}install`);
		remoteConns.push(remoteConn);
		installWishes.push(depWish);
		installDepOffers.push(depWish.offer);
	}
	
	logger.info(`Server installTime: ${installTime}`);
	const serverInstallRessource = new ServerInstallResource(
		"serverInstall",
		{
			reconfState: "install",
			time: installTime,
			depsOffers: installDepOffers
		}
	);
	
	// Create running ressource and wishes
	const deployTime = reconfiguration_name === "deploy" ? runningTime : updateTime + runningTime;
	logger.info(`Server deployTime: ${deployTime}`);
	
	const runningWishes = [];
	const runningDepsOffers = [];
	for (depNum = 0; depNum < nbScalingNodes; depNum++) {
		let remoteConn = remoteConns[depNum];
		let depWish = new Wish<DepInstallResource>(remoteConn, `dep${depNum}${reconfiguration_name}`, {dependsOn: serverInstallRessource});
		runningWishes.push(depWish);
		runningDepsOffers.push(depWish.offer);
	}
	
	const serverRunningRessource = new ServerInstallResource(
		"serverRunning",
		{
			reconfState: reconfiguration_name,
			time: deployTime,
			depsOffers: runningDepsOffers
		}
	);
	
	serverRunningRessource.id.apply(
		resultId => {
			logger.info("Got result Id: " + resultId);
			if (resultId !== undefined) {
				goToSleep(50);
			}
		}
	)
	
	return {
		serverInstallId: serverRunningRessource.id
	}
};

const initStack = getStack(
	{
		program: emptyProgram,
		projectName: 'ServerDeployAndUpdate',
		stackName: 'server',
	},
	{ workDir: '.' }
);

runDeployment(
	initStack,
	operations(Behavior.of(program)),
	(offerUpdates) => nextAction(offerUpdates, sigquit(), sigint()),
	{ deploymentName: 'server', resourcesPort: 19951, deploymentPort: 19952 }
);
