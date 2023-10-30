import { dynamic, Output } from '@pulumi/pulumi';

export class DepInstallProvider implements dynamic.ResourceProvider {
	async check(olds: any, news: any) {
		// Add nameChanged value for the diff method
		news.reconfChanged = olds.reconfState !== news.reconfState;

		return {
			inputs: news,
		};
	}

	async create(inputs: any) {
		const sleep = (s: number) => new Promise(r => setTimeout(r, s * 1000));
		await sleep(inputs.time);
		return {
			id: inputs.reconfState,
			outs: {
				reconfState: inputs.reconfState,
				time: inputs.time,
			},
		};
	}
	
	async diff(id: any, olds: any, news: any) {
		// TODO: check how to access olds parameter 
		const changed = news.reconfChanged; 
		
		return {
			changes: changed,
			replaces: ["reconfState"],
			deleteBeforeReplace: true
		}
	}
	
	async update(id: any, olds: any, news: any) { 
		return {
			id: news.reconfState,
			outs: {
				reconfState: news.reconfState,
				time: news.time,
				depsOffers: news.depOffers
			}
		}
		
	}
	
	async delete(id: any, props: any) {
	}
}

export class DepInstallResource extends dynamic.Resource {
	public readonly name!: Output<string>;
	public readonly time!: Output<number>;

	constructor(name: string, props: any, opts?: any) {
		super(new DepInstallProvider(), name, props, opts);
	}
}
