import { dynamic, Output } from '@pulumi/pulumi';
export declare class DepInstallProvider implements dynamic.ResourceProvider {
    check(olds: any, news: any): Promise<{
        inputs: any;
    }>;
    create(inputs: any): Promise<{
        id: any;
        outs: {
            reconfState: any;
            time: any;
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
export declare class DepInstallResource extends dynamic.Resource {
    readonly name: Output<string>;
    readonly time: Output<number>;
    constructor(name: string, props: any, opts?: any);
}
