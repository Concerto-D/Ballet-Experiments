import {
	emptyProgram,
	getStack,
	nextAction,
	operations,
	runDeployment,
	sigint,
	sigquit,
} from '@mjuz/core';
import { Offer, RemoteConnection } from '@mjuz/core/resources';
import { Behavior } from '@funkia/hareactive';
import {DepInstallResource} from "../depInstall";
import { initializeReconf } from "../metricAnalysis";


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
] = initializeReconf("dep")

logger.info("script parameters:")
logger.info(
	config_file_path,
	timestamp_log_file,
	current_execution_dir,
	reconfiguration_name,
	nbScalingNodes,
	depNum
)
logger.info("------------")

const program = async () => {
	const serverHost = inventory["server"].split(":")[0]
	const contentManager = new RemoteConnection(`dep${depNum}`, { port: 19952, host: serverHost});
	
	const deployTime = reconfiguration_name === "deploy" ? installTime + runningTime : updateTime + runningTime
	
	// For update: delete and replace resource
	const depInstallRessource = new DepInstallResource(
		`dep${depNum}${reconfiguration_name}`, 
		{reconfState: reconfiguration_name, time: deployTime}
	);
	
	// For the update of the offer, need to also delete and replace the offer because the dep resource changed
	// TODO: check if this is automatically handled by Mjuz
	// NOTE: Very ad-hoc solution to prevent Mjuz from blocking because the Offer has to be deleted
	// and so it has to withdraw from Wish (which is deleted in the server side)
	new Offer(contentManager, `dep${depNum}deploy`, depInstallRessource)
	if(reconfiguration_name === 'update')
		new Offer(contentManager, `dep${depNum}update`, depInstallRessource)
	
	return {
		depInstallId: depInstallRessource.id
	}
};

const initStack = getStack(
	{
		program: emptyProgram,
		projectName: `Dep${depNum}DeployAndUpdate`,
		stackName: `dep${depNum}`,
	},
	{ workDir: '.' }
);

runDeployment(
	initStack,
	operations(Behavior.of(program)),
	(offerUpdates) => nextAction(offerUpdates, sigquit(), sigint()),
	{ deploymentName: `dep${depNum}`, resourcesPort: 19953 + 2*Number.parseInt(depNum), deploymentPort: 19954 + 2*Number.parseInt(depNum)}
);
