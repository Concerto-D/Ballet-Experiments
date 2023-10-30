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
import {ProvideResource} from "../../../provide-dep";

const program = async () => {
	const props1 = {
		field1: "id_props_1",
		field2: 12345,
		field3: true,
	};
	const props2 = {
		field1: "id_props_2",
		field2: 12345,
		field3: true,
	};
	const provideResource1 = new ProvideResource("provideRes1", props1);
	const provideResource2 = new ProvideResource("provideRes2", props2);
	const contentManager = new RemoteConnection('provide1', { port: 19954 });
	new Offer(contentManager, 'provide3', provideResource1);
	new Offer(contentManager, 'provide4', provideResource2);

	// Export the Internet address for the service.
	return {
		field1: provideResource1.field1,
		field2: provideResource2.field1,
	};
};

const initStack = getStack(
	{
		program: emptyProgram,
		projectName: 'DecentralizedCustomProvide2',
		stackName: 'provide3',
	},
	{ workDir: '.' }
);

runDeployment(
	initStack,
	operations(Behavior.of(program)),
	(offerUpdates) => nextAction(offerUpdates, sigquit(), sigint()),
	{ deploymentName: 'provide1', resourcesPort: 19951, deploymentPort: 19952 }
);
