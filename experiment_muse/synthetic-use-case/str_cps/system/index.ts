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

const compName = `system`;

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
	
	/* RemoteConnection with database */
	const [databaseHost, databasePort] = inventory["database"].split(":")
	const databaseConnection = new RemoteConnection(`database`, { port: Number.parseInt(databasePort), host: databaseHost});
	
	/* system */
	// Resolve database Wish
	let databaseResWish = new Wish<SleepingComponentResource>(databaseConnection, `databaseProvide`);
	
	// Create component
	const systemResource = new SleepingComponentResource(
		`systemRes`,
		{reconfState: databaseResWish.offer, timeCreate: createTime["system"], timeDelete: deleteTime["system"], depsOffers: [databaseResWish.offer]}
	)
	
	// Provide system to listeners
	const offerList = [];
	for(let i = 0; i < nbScalingNodes; i++) {
		const [cpsHost, cpsPort] = inventory[`cps${i}`].split(":");
		const cpsConnection = new RemoteConnection(`cps${i}`, { port: Number.parseInt(cpsPort), host: cpsHost});
		const offer = new Offer(cpsConnection, `system${i}Provide`, systemResource)
		offerList.push(offer);
	}
	
	systemResource.id.apply(systemResourceId => {
		if (systemResourceId === targetDeployment) {
			goToSleep(50);
		}
	})
	
	return {
		systemResourceId: systemResource.id
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
