import { dynamic, Output } from '@pulumi/pulumi';


export class SleepingComponentProvider implements dynamic.ResourceProvider {
	async check(olds: any, news: any) {
		// Add nameChanged value for the diff method
		news.reconfChanged = olds.reconfState !== news.reconfState;
		return {
			inputs: news,
		};
	}
	
	async create(inputs: any) {
		const sleep = (s: number) => new Promise(r => setTimeout(r, s*1000));
		await sleep(inputs.timeCreate);
		return {
			id: inputs.reconfState,
			outs: {
				reconfState: inputs.reconfState,
				timeCreate: inputs.timeCreate,
				timeDelete: inputs.timeDelete,
				depsOffers: inputs.depsOffers
			},
		};
	}
	
	async diff(id: any, olds: any, news: any) {
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
				timeCreate: news.timeCreate,
				timeDelete: news.timeDelete,
				depsOffers: news.depOffers
			}
		}
		
	}
	
	async delete(id: any, props: any) {
		const sleep = (s: number) => new Promise(r => setTimeout(r, s*1000));
		await sleep(props.timeDelete);
	}
}

export class SleepingComponentResource extends dynamic.Resource {
	public readonly reconfState!: Output<string>;
	public readonly timeCreate!: Output<number>;
	public readonly timeDelete!: Output<number>;
	public readonly depsOffers!: Output<any>;
	
	constructor(name: string, props: any, opts?: any) {
		super(new SleepingComponentProvider(), name, props, opts);
	}
}
