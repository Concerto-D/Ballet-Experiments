import {
	emptyProgram,
	getStack, newLogger,
	nextAction,
	operations, registerTimeValue,
	runDeployment, setExitCode,
	sigint,
	sigquit, TimestampPeriod, TimestampType,
} from '@mjuz/core';
import {Offer, RemoteConnection, Wish} from '@mjuz/core/resources';
import { Behavior } from '@funkia/hareactive';
import {SleepingComponentResource} from "../../sleepingComponent";
import {goToSleep, initializeReconf} from "../../metricAnalysis";
import * as pulumi from "@pulumi/pulumi"
import {computeStrCPSTimes} from "../computeTransitionsTimes";

const [
	transitions_times,
	targetDeployment,
	nbScalingNodes,
	scalingNum,
	inventory,
	logger
] = initializeReconf("cps")

const compName = `cps${scalingNum}`;

const [
	createTime,
	deleteTime
] = computeStrCPSTimes(transitions_times, compName, scalingNum);

const timestampType = targetDeployment === "deploy" ? TimestampType.DEPLOY : TimestampType.UPDATE
let timestampRegistered = false;
const program = async () => {
	logger.info("Reconf starts");
	// Reconf starts
	if (!timestampRegistered) {
		registerTimeValue(timestampType, TimestampPeriod.START);
		timestampRegistered = true;
	}
	
	/* RemoteConnection with system */
	const [systemHost, systemPort] = inventory["system"].split(":")
	const systemConnection = new RemoteConnection(`system`, { port: Number.parseInt(systemPort), host: systemHost});
	
	/* listener */
	// Resolve system Wish
	let systemResWish = new Wish<SleepingComponentResource>(systemConnection, `system${scalingNum}Provide`);
	
	// Create component
	const listenerResource = new SleepingComponentResource(
		`listenerRes`,
		{reconfState: systemResWish.offer, timeCreate: createTime["listener"], timeDelete: deleteTime["listener"], depsOffers: [systemResWish.offer]}
	)
	
	/* sensor */
	// Create component
	const sensorResource = new SleepingComponentResource(
		`sensorRes`,
		{reconfState: listenerResource.reconfState, timeCreate: createTime["sensor"], timeDelete: deleteTime["sensor"], depsOffers: []},
		{dependsOn: listenerResource}
	)
	
	pulumi.all([listenerResource.id, sensorResource.id])
		.apply(([listenerId, sensorId]) => {
			if(listenerId == targetDeployment && sensorId === targetDeployment) {
				goToSleep(50)
			}
		});
	
	return {
		sensorResourceId: sensorResource.id
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
