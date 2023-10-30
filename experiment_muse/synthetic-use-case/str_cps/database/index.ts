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
import {computeStrCPSTimes} from "../computeTransitionsTimes";

const compName = "database";

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
	if (!timestampRegistered) {
		registerTimeValue(timestampType, TimestampPeriod.START);
		timestampRegistered = true;
	}
	
	// Create component
	const databaseResource = new SleepingComponentResource(
		`${compName}Res`,
		{reconfState: targetDeployment, timeCreate: createTime["database"], timeDelete: deleteTime["database"], depsOffers: []}
	)
	
	// Provide component to system
	const [systemHost, systemPort] = inventory[`system`].split(":");
	const systemConnection = new RemoteConnection(`system`, {port: Number.parseInt(systemPort), host: systemHost});
	new Offer(systemConnection, `${compName}Provide`, databaseResource);
	
	databaseResource.id.apply(databaseResourceId => {
		if (databaseResourceId === targetDeployment) {
			goToSleep(50);
		}
	})
	
	return {
		databaseResourceId: databaseResource.id
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
