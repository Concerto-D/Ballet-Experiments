import {
	emptyProgram,
	getStack, newLogger,
	nextAction,
	operations, registerTimeValue,
	runDeployment,
	sigint,
	sigquit, TimestampPeriod, TimestampType,
} from '@mjuz/core';
import {Offer, RemoteConnection, Wish} from '@mjuz/core/resources';
import { Behavior } from '@funkia/hareactive';
import {SleepingComponentResource} from "../../sleepingComponent";
import {goToSleep, initializeReconf} from "../../metricAnalysis";
import {computeOpenstackTimes} from "../computeTransitionsTimes";

const [
	transitions_times,
	targetDeployment,
	nbScalingNodes,
	scalingNum,
	inventory,
	logger
] = initializeReconf("nova")

const compName = `nova${scalingNum}`

const [
	createTime,
	deleteTime
] = computeOpenstackTimes(transitions_times, compName, scalingNum);

const timestampType = targetDeployment === "deploy" ? TimestampType.DEPLOY : TimestampType.UPDATE
let timestampRegistered = false;
const program = async () => {
	logger.info("Reconf starts");
	// Reconf starts
	if (!timestampRegistered) {
		registerTimeValue(timestampType, TimestampPeriod.START);
		timestampRegistered = true;
	}
	
	// Resolve keystone wish
	const [workerHost, workerPort] = inventory[`worker${scalingNum}`].split(":")
	const workerConnection = new RemoteConnection(`worker${scalingNum}`, { port: Number.parseInt(workerPort), host: workerHost});
	let mariadbworkerResWish = new Wish<SleepingComponentResource>(workerConnection, `mariadbworker${scalingNum}Provide`);
	let keystoneResWish = new Wish<SleepingComponentResource>(workerConnection, `keystone${scalingNum}Provide`);
	
	// Create comp
	const novaResource = new SleepingComponentResource(
		`${compName}Res`,
		{reconfState: keystoneResWish.offer, timeCreate: createTime["nova"], timeDelete: deleteTime["nova"], depsOffers: [mariadbworkerResWish.offer, keystoneResWish.offer]}
	)
	
	novaResource.id.apply(novaResourceId => {
		if (novaResourceId === targetDeployment) {
			// Reconf ends
			goToSleep(50);
		}
	})
	
	return {
		novaResourceId: novaResource.id
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
