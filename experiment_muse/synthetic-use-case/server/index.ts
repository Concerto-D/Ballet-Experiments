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
	serverDeployTime,
	logger
] = initializeReconf("server")

logger.info("script parameters:");
logger.info(
	config_file_path,
	timestamp_log_file,
	current_execution_dir,
	reconfiguration_name,
	nbScalingNodes
)
logger.info("------------");

let deployTimestampRegistered = false;

const program = async () => {
	logger.info("------ PROGRAM LAUNCHED -----------");
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
	
	const remoteConns = [];
	const wishes = [];
	const depsOffers = [];
	let depNum: number;
	for (depNum = 0; depNum < nbScalingNodes; depNum++) {
		const depName = `dep${depNum}`;
		const depHost = inventory[depName].split(":")[0];
		let remoteConn = new RemoteConnection(depName, { port: 19954 + 2*depNum, host: depHost});
		
		// For update: delete and replace wish, else the server will be created before the new Offer is
		// resolve for the wish
		// TODO: check if this is automatically handled by Mjuz, it should not because the wish is replaced the exact moment it received the withdrawal of the offer
		let depWish = new Wish<DepInstallResource>(remoteConn, `dep${depNum}${reconfiguration_name}`);
		remoteConns.push(remoteConn);
		wishes.push(depWish);
		depsOffers.push(depWish.offer);
	}
	
	logger.info("Creating server");
	
	const serverInstallRessource = new ServerInstallResource(
		"server",
		{
			reconfState: reconfiguration_name,
			time: serverDeployTime,
			depsOffers: depsOffers
		}
	);
	
	serverInstallRessource.id.apply(
		resultId => {
			logger.info("Got result Id: " + resultId);
			if (resultId !== undefined) {
				goToSleep(50);
			}
		}
	)
	
	logger.info("Getting ID")
	return {
		serverInstallId: serverInstallRessource.id
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
