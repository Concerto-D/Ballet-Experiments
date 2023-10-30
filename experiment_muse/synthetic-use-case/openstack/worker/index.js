"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const sleepingComponent_1 = require("../../sleepingComponent");
const metricAnalysis_1 = require("../../metricAnalysis");
const pulumi = __importStar(require("@pulumi/pulumi"));
const computeTransitionsTimes_1 = require("../computeTransitionsTimes");
const [transitions_times, targetDeployment, nbScalingNodes, scalingNum, inventory, logger] = metricAnalysis_1.initializeReconf("worker");
const compName = `worker${scalingNum}`;
const [createTime, deleteTime] = computeTransitionsTimes_1.computeOpenstackTimes(transitions_times, compName, scalingNum);
const timestampType = targetDeployment === "deploy" ? core_1.TimestampType.DEPLOY : core_1.TimestampType.UPDATE;
let timestampRegistered = false;
const program = () => __awaiter(void 0, void 0, void 0, function* () {
    logger.info("Reconf starts");
    // Reconf starts
    if (!timestampRegistered) {
        core_1.registerTimeValue(timestampType, core_1.TimestampPeriod.START);
        timestampRegistered = true;
    }
    /* RemoteConnection with mariadbmaster, nova and neutron */
    const [mariadbHost, mariadbPort] = inventory["mariadbmaster"].split(":");
    const [novaHost, novaPort] = inventory[`nova${scalingNum}`].split(":");
    const [neutronHost, neutronPort] = inventory[`neutron${scalingNum}`].split(":");
    const mariadbmasterConnection = new resources_1.RemoteConnection(`mariadbmaster`, { port: Number.parseInt(mariadbPort), host: mariadbHost });
    const novaConnection = new resources_1.RemoteConnection(`nova${scalingNum}`, { port: Number.parseInt(novaPort), host: novaHost });
    const neutronConnection = new resources_1.RemoteConnection(`neutron${scalingNum}`, { port: Number.parseInt(neutronPort), host: neutronHost });
    /* mariadbworker */
    // Resolve mariadbmaster Wish
    let mariadbmasterResWish = new resources_1.Wish(mariadbmasterConnection, `mariadbmasterProvide`);
    // Create component
    const mariadbworkerResource = new sleepingComponent_1.SleepingComponentResource(`mariadbworkerRes`, { reconfState: mariadbmasterResWish.offer, timeCreate: createTime["mariadbworker"], timeDelete: deleteTime["mariadbworker"], depsOffers: [mariadbmasterResWish.offer] });
    // Provide mariadbworker to nova and neutron
    new resources_1.Offer(novaConnection, `mariadbworker${scalingNum}Provide`, mariadbworkerResource);
    new resources_1.Offer(neutronConnection, `mariadbworker${scalingNum}Provide`, mariadbworkerResource);
    /* keystone */
    // Create component
    const keystoneResource = new sleepingComponent_1.SleepingComponentResource(`keystoneRes`, { reconfState: mariadbworkerResource.reconfState, timeCreate: createTime["keystone"], timeDelete: deleteTime["keystone"], depsOffers: [] }, { dependsOn: mariadbworkerResource });
    // Provide keystone to nova and neutron
    new resources_1.Offer(novaConnection, `keystone${scalingNum}Provide`, keystoneResource);
    new resources_1.Offer(neutronConnection, `keystone${scalingNum}Provide`, keystoneResource);
    /* glance */
    const glanceResource = new sleepingComponent_1.SleepingComponentResource(`glanceRes`, { reconfState: keystoneResource.reconfState, timeCreate: createTime["glance"], timeDelete: deleteTime["glance"], depsOffers: [] }, { dependsOn: [mariadbworkerResource, keystoneResource] });
    pulumi.all([mariadbworkerResource.id, keystoneResource.id, glanceResource.id])
        .apply(([workerId, keystoneId, glanceId]) => {
        if (workerId == targetDeployment && keystoneId === targetDeployment && glanceId === targetDeployment) {
            metricAnalysis_1.goToSleep(50);
        }
    });
    return {
        keystoneResourceId: keystoneResource.id
    };
});
const initStack = core_1.getStack({
    program: core_1.emptyProgram,
    projectName: `${compName}Project`,
    stackName: `${compName}Stack`,
}, { workDir: '.' });
const deploymentPort = Number.parseInt(inventory[compName].split(":")[1]);
core_1.runDeployment(initStack, core_1.operations(hareactive_1.Behavior.of(program)), (offerUpdates) => core_1.nextAction(offerUpdates, core_1.sigquit(), core_1.sigint()), { deploymentName: compName, resourcesPort: deploymentPort - 1, deploymentPort: deploymentPort });
