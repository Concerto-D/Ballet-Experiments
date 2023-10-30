import {
	emptyProgram,
	getStack, newLogger,
	nextAction,
	operations, registerTimeValue,
	runDeployment,
	sigint,
	sigquit, TimestampPeriod, TimestampType,
} from '@mjuz/core';
import { Offer, RemoteConnection } from '@mjuz/core/resources';
import { Behavior } from '@funkia/hareactive';
import {SleepingComponentResource} from "../../sleepingComponent";
import {goToSleep, initializeReconf} from "../../metricAnalysis";
import {computeOpenstackTimes} from "../computeTransitionsTimes";

const compName = "mariadbmaster";

const [
	transitions_times,
	targetDeployment,
	nbScalingNodes,
	scalingNum,
	inventory,
	logger
] = initializeReconf(compName)

const [
	createTime,
	deleteTime
] = computeOpenstackTimes(transitions_times, compName, scalingNum);

const timestampType = targetDeployment === "deploy" ? TimestampType.DEPLOY : TimestampType.UPDATE

let timestampRegistered = false;
const program = async () => {
	logger.info("Reconf starts");
	if (!timestampRegistered) {
		registerTimeValue(timestampType, TimestampPeriod.START);
		timestampRegistered = true;
	}
	
	// Create component
	const mariadbmasterResource = new SleepingComponentResource(
		`${compName}Res`,
		{reconfState: targetDeployment, timeCreate: createTime["mariadbmaster"], timeDelete: deleteTime["mariadbmaster"], depsOffers: []}
	)
	
	const offerList = [];
	// Provide component to worker
	for(let i = 0; i < nbScalingNodes; i++) {
		const [workerHost, workerPort] = inventory[`worker${i}`].split(":");
		const workerConnection = new RemoteConnection(`worker${i}`, {port: Number.parseInt(workerPort), host: workerHost});
		const offer = new Offer(workerConnection, `${compName}Provide`, mariadbmasterResource);
		offerList.push(offer);
	}
	
	mariadbmasterResource.id.apply(mariadbmasterResourceId => {
		if (mariadbmasterResourceId === targetDeployment) {
			goToSleep(50);
		}
	})
	
	return {
		mariadbmasterResourceId: mariadbmasterResource.id
	}
};

const initStack = getStack(
	{
		program: emptyProgram,
		projectName: `${compName}Project`,
		stackName: `${compName}Stack`,
	},
	{ workDir: '.' }
);

const deploymentPort = Number.parseInt(inventory[compName].split(":")[1])
runDeployment(
	initStack,
	operations(Behavior.of(program)),
	(offerUpdates) => nextAction(offerUpdates, sigquit(), sigint()),
	{ deploymentName: compName, resourcesPort: deploymentPort-1, deploymentPort: deploymentPort }
);
