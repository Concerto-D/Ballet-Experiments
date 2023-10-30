import { dynamic, Output } from '@pulumi/pulumi';
import { DepInstallResource } from "./depInstall";
export declare class ServerInstallProvider implements dynamic.ResourceProvider {
    check(olds: any, news: any): Promise<{
        inputs: any;
    }>;
    create(inputs: any): Promise<{
        id: any;
        outs: {
            reconfState: any;
            time: any;
            depsOffers: any;
        };
    }>;
    diff(id: any, olds: any, news: any): Promise<{
        changes: any;
        replaces: string[];
        deleteBeforeReplace: boolean;
    }>;
    update(id: any, olds: any, news: any): Promise<{
        id: any;
        outs: {
            reconfState: any;
            time: any;
            depsOffers: any;
        };
    }>;
    delete(id: any, props: any): Promise<void>;
}
export declare class ServerInstallResource extends dynamic.Resource {
    readonly reconfState: Output<string>;
    readonly time: Output<number>;
    readonly depsOffers: Output<DepInstallResource>;
    constructor(name: string, props: any, opts?: any);
}
