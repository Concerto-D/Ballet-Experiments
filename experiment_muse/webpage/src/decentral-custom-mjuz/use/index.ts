import {
	emptyProgram,
	getStack,
	nextAction,
	operations,
	runDeployment,
	sigint,
	sigquit,
} from '@mjuz/core';
import {RemoteConnection, Wish} from '@mjuz/core/resources';
import { Behavior } from '@funkia/hareactive';
import {ProvideResource} from "../../../provide-dep";
import {UseResource} from "../../../use-dep";

const program = async () => {
	// Remote connection name and offerName has to have the same name
	const provideManager = new RemoteConnection('provide1', { port: 19952 });
	const provideWish1 = new Wish<ProvideResource>(provideManager, 'provide3');
	const provideWish2 = new Wish<ProvideResource>(provideManager, 'provide4');
	const useResource1 = new UseResource('useRes1', {
		nameDep: "firstDep1",
		useDep: provideWish1.offer,
		done: false,
	});
	const useResource2 = new UseResource('useRes2', {
		nameDep: "firstDep2",
		useDep: provideWish2.offer,
		done: false,
	});

	// Export the Internet address for the service.
	return {
		useResId1: useResource1.id,
		useResId2: useResource2.id,
	};
};

const initStack = getStack(
	{
		program: emptyProgram,
		projectName: 'DecentralizedCustomUse2',
		stackName: 'use3',
	},
	{ workDir: '.' }
);

runDeployment(
	initStack,
	operations(Behavior.of(program)),
	(offerUpdates) => nextAction(offerUpdates, sigquit(), sigint()),
	{ deploymentName: 'use1', resourcesPort: 19953, deploymentPort: 19954 }
).catch(err => console.log(err));
