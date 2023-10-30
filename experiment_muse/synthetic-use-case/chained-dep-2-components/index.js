"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@mjuz/core");
const resources_1 = require("@mjuz/core/resources");
const hareactive_1 = require("@funkia/hareactive");
const depInstall_1 = require("../depInstall");
const metricAnalysis_1 = require("../metricAnalysis");
const [config_file_path, timestamp_log_file, current_execution_dir, reconfiguration_name, nbScalingNodes, depNum, inventory, installTime, runningTime, updateTime, logger] = metricAnalysis_1.initializeReconf("dep");
logger.info("script parameters:");
logger.info(config_file_path);
logger.info(timestamp_log_file);
logger.info(current_execution_dir);
logger.info(reconfiguration_name);
logger.info(`${nbScalingNodes}`);
logger.info(`${depNum}`);
logger.info("------------");
const program = () => __awaiter(void 0, void 0, void 0, function* () {
    const serverHost = inventory["server"].split(":")[0];
    const contentManager = new resources_1.RemoteConnection(`dep${depNum}`, { port: 19952, host: serverHost });
    const deployTime = reconfiguration_name === "deploy" ? runningTime : updateTime + runningTime;
    logger.info(`dep${depNum} installTime: ${installTime}`);
    // const deployTime = 7;
    //  For update: delete and replace resource
    const depInstallRessource = new depInstall_1.DepInstallResource(`dep${depNum}Install`, { reconfState: "install", time: installTime });
    new resources_1.Offer(contentManager, `dep${depNum}install`, depInstallRessource);
    logger.info(`dep${depNum} deployTime: ${deployTime}`);
    const depRunningRessource = new depInstall_1.DepInstallResource(`dep${depNum}Running${reconfiguration_name}`, { reconfState: reconfiguration_name, time: deployTime }, { dependsOn: depInstallRessource });
    // For the update of the offer, need to also delete and replace the offer because the dep resource changed
    // TODO: check if this is automatically handled by Mjuz
    // NOTE: Very ad-hoc solution to prevent Mjuz from blocking because the Offer has to be deleted
    // and so it has to withdraw from Wish (which is deleted in the server side)
    // if(reconfiguration_name === 'deploy')
    new resources_1.Offer(contentManager, `dep${depNum}${reconfiguration_name}`, depRunningRessource);
    // if(reconfiguration_name === 'update')
    // new Offer(contentManager, `dep${depNum}update`, depRunningRessource)
    // Don't let any "dangling" resources (dangling means not exported) because of this issue:
    // https://github.com/pulumi/pulumi/issues/6998
    // That's why depInstallRessource and depRunningRessource have to be exported
    return {
        depInstallId: depInstallRessource.id,
        depRunningRessourceId: depRunningRessource.id
    };
});
const initStack = core_1.getStack({
    program: core_1.emptyProgram,
    projectName: `Dep${depNum}DeployAndUpdate2Comps`,
    stackName: `dep${depNum}2Comps`,
}, { workDir: '.' });
core_1.runDeployment(initStack, core_1.operations(hareactive_1.Behavior.of(program)), (offerUpdates) => core_1.nextAction(offerUpdates, core_1.sigquit(), core_1.sigint()), { deploymentName: `dep${depNum}`, resourcesPort: 19953 + 2 * Number.parseInt(depNum), deploymentPort: 19954 + 2 * Number.parseInt(depNum) });
