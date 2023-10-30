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
const serverInstall_1 = require("../serverInstall");
const metricAnalysis_1 = require("../metricAnalysis");
const [config_file_path, timestamp_log_file, current_execution_dir, reconfiguration_name, nbScalingNodes, depNum, inventory, installTime, runningTime, updateTime, logger] = metricAnalysis_1.initializeReconf("server");
logger.info("script parameters:");
logger.info(config_file_path);
logger.info(timestamp_log_file);
logger.info(current_execution_dir);
logger.info(reconfiguration_name);
logger.info(`${nbScalingNodes}`);
logger.info(`${depNum}`);
logger.info("------------");
let deployTimestampRegistered = false;
const program = () => __awaiter(void 0, void 0, void 0, function* () {
    logger.info("------ PROGRAM LAUNCHED -----------");
    // Register START timestamp for reconfiguration time
    if (!deployTimestampRegistered) {
        let timestampType;
        if (reconfiguration_name === "deploy") {
            timestampType = core_1.TimestampType.DEPLOY;
        }
        else {
            timestampType = core_1.TimestampType.UPDATE;
        }
        core_1.registerTimeValue(timestampType, core_1.TimestampPeriod.START);
        deployTimestampRegistered = true;
    }
    // Create install ressource and wishes
    const remoteConns = [];
    const installWishes = [];
    const installDepOffers = [];
    let depNum;
    for (depNum = 0; depNum < nbScalingNodes; depNum++) {
        const depName = `dep${depNum}`;
        const depHost = inventory[depName].split(":")[0];
        let remoteConn = new resources_1.RemoteConnection(depName, { port: 19954 + 2 * depNum, host: depHost });
        // For update: delete and replace wish, else the server will be created before the new Offer is
        // resolve for the wish
        // TODO: check if this is automatically handled by Mjuz, it should not because the wish is replaced the exact moment it received the withdrawal of the offer
        let depWish = new resources_1.Wish(remoteConn, `dep${depNum}install`);
        remoteConns.push(remoteConn);
        installWishes.push(depWish);
        installDepOffers.push(depWish.offer);
    }
    logger.info(`Server installTime: ${installTime}`);
    const serverInstallRessource = new serverInstall_1.ServerInstallResource("serverInstall", {
        reconfState: "install",
        time: installTime,
        depsOffers: installDepOffers
    });
    // Create running ressource and wishes
    const deployTime = reconfiguration_name === "deploy" ? runningTime : updateTime + runningTime;
    logger.info(`Server deployTime: ${deployTime}`);
    const runningWishes = [];
    const runningDepsOffers = [];
    for (depNum = 0; depNum < nbScalingNodes; depNum++) {
        let remoteConn = remoteConns[depNum];
        let depWish = new resources_1.Wish(remoteConn, `dep${depNum}${reconfiguration_name}`, { dependsOn: serverInstallRessource });
        runningWishes.push(depWish);
        runningDepsOffers.push(depWish.offer);
    }
    const serverRunningRessource = new serverInstall_1.ServerInstallResource("serverRunning", {
        reconfState: reconfiguration_name,
        time: deployTime,
        depsOffers: runningDepsOffers
    });
    serverRunningRessource.id.apply(resultId => {
        logger.info("Got result Id: " + resultId);
        if (resultId !== undefined) {
            metricAnalysis_1.goToSleep(50);
        }
    });
    return {
        serverInstallId: serverRunningRessource.id
    };
});
const initStack = core_1.getStack({
    program: core_1.emptyProgram,
    projectName: 'ServerDeployAndUpdate',
    stackName: 'server',
}, { workDir: '.' });
core_1.runDeployment(initStack, core_1.operations(hareactive_1.Behavior.of(program)), (offerUpdates) => core_1.nextAction(offerUpdates, core_1.sigquit(), core_1.sigint()), { deploymentName: 'server', resourcesPort: 19951, deploymentPort: 19952 });
