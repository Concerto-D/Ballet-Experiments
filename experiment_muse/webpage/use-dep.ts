import { CustomResourceOptions, dynamic, ID, Input, Output } from '@pulumi/pulumi';
import {ProvideResource} from "@mjuz/webpage/provide-dep";

export interface UsePropsInput {
	nameDep: Input<string>;
	useDep: Input<ProvideResource>;
	done: Input<boolean>;
}

export interface UsePropsProviderInput {
	nameDep: string;
	useDep: ProvideResource;
	done: boolean;
}

interface UsePropsProviderOutput {
    nameDep: number;
    useDep: string;
	done: boolean;
}


export class UseProvider implements dynamic.ResourceProvider {
	async check(olds: UsePropsProviderInput, news: UsePropsProviderInput): Promise<dynamic.CheckResult> {
		news.done = false;
		return {
			inputs: news
		};
	}
	
    async create(inputs: UsePropsProviderInput): Promise<dynamic.CreateResult> {
		// inputs.done = false;
        return {
			id: inputs.nameDep,
			outs: {
				nameDep: inputs.nameDep,
				useDep: inputs.useDep,
				done: inputs.done
			}
		};
    }
}

export class UseResource extends dynamic.Resource {
	public readonly nameDep!: Output<string>;
	public readonly useDep!: Output<ProvideResource>;
	public readonly done!: Output<boolean>;
	
    constructor(name: string, props: UsePropsInput, opts?: CustomResourceOptions) {
        super(new UseProvider(), name, props, opts);
    }
}
