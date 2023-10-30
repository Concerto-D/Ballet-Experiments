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
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDepUpdateTime = exports.computeDepInstallTime = exports.computeDepRunningTime = exports.computeServerRunningTime = exports.computeServerUpdateTime = exports.computeServerInstallTime = exports.goToSleep = exports.initTimeLogDir = exports.initializeReconf = exports.getScriptParameters = void 0;
const core_1 = require("@mjuz/core");
const fs = __importStar(require("fs"));
const YAML = __importStar(require("yaml"));
const getScriptParameters = () => {
    const config_file_path = process.argv[4];
    const duration = Number.parseInt(process.argv[5]);
    const timestamp_log_file = process.argv[6];
    const current_execution_dir = process.argv[7];
    const targetDeployment = process.argv[8];
    const nbScalingNodes = Number.parseInt(process.argv[9]);
    let scalingNum = null;
    if (process.argv.length > 10) {
        scalingNum = Number.parseInt(process.argv[10]);
    }
    return [
        config_file_path,
        duration,
        timestamp_log_file,
        current_execution_dir,
        targetDeployment,
        nbScalingNodes,
        scalingNum
    ];
};
exports.getScriptParameters = getScriptParameters;
const initializeReconf = (assemblyType) => {
    const [config_file_path, duration, timestamp_log_file, current_execution_dir, targetDeployment, nbScalingNodes, scalingNum] = exports.getScriptParameters();
    core_1.globalVariables.execution_expe_dir = current_execution_dir;
    core_1.globalVariables.reconfigurationName = targetDeployment;
    let assemblyName = assemblyType;
    if (scalingNum !== null) {
        assemblyName += scalingNum.toString();
    }
    try {
        if (!fs.existsSync(current_execution_dir))
            fs.mkdirSync(current_execution_dir);
    }
    catch (_a) { }
    try {
        if (!fs.existsSync(`${current_execution_dir}/logs`))
            fs.mkdirSync(`${current_execution_dir}/logs`);
    }
    catch (_b) { }
    const logger = core_1.newLogger('pulumi', `${current_execution_dir}/logs/logs_${assemblyName}.txt`);
    logger.info("---------------------------------- Waking up hello everyone ----------------------------------------------------");
    // Initialization timestamp log dir
    exports.initTimeLogDir(assemblyName, current_execution_dir, timestamp_log_file, logger);
    // Get location of nodes
    const inventory = YAML.parse(fs.readFileSync(`${current_execution_dir}/inventory.yaml`, "utf-8"));
    core_1.setExitCode(0); // Set default exit code
    // Compute server deployment time
    const transitions_times = JSON.parse(fs.readFileSync(config_file_path, "utf-8"));
    let updateTime;
    // if(assemblyName === "server") {  TODO: refacto parallel_deps
    // 	installTime = computeServerInstallTime(config_file_path, nbScalingNodes);
    // 	runningTime = computeServerRunningTime(config_file_path);
    // 	updateTime = computeServerUpdateTime(config_file_path, nbScalingNodes);
    // }
    // else {
    // 	installTime = computeDepInstallTime(config_file_path, assemblyName);
    // 	runningTime = computeDepRunningTime(config_file_path, assemblyName);
    // 	updateTime = computeDepUpdateTime(config_file_path, assemblyName);
    // }
    logger.info("script parameters:");
    logger.info(config_file_path);
    logger.info(timestamp_log_file);
    logger.info(current_execution_dir);
    logger.info(targetDeployment);
    logger.info(`${nbScalingNodes}`);
    logger.info(`${scalingNum}`);
    logger.info("------------");
    return [
        transitions_times,
        targetDeployment,
        nbScalingNodes,
        scalingNum,
        inventory,
        logger
    ];
};
exports.initializeReconf = initializeReconf;
const initTimeLogDir = (assemblyName, current_execution_dir, logDirTimestamp, logger) => {
    // if(!fs.existsSync(current_execution_dir)) {
    // 	try {
    // 		fs.mkdirSync(current_execution_dir);
    // 	}
    // 	catch {
    // 		logger.info(`------ RACE CONDITION HANDLED BY EXCEPTION: FOLDER ${current_execution_dir} WAS ALREADY CREATED`);
    // 	}
    // }
    core_1.globalVariables.assemblyName = assemblyName;
    if (logDirTimestamp !== null) {
        core_1.globalVariables.logDirTimestamp = logDirTimestamp;
    }
    else {
        const dateNow = new Date();
        let year = dateNow.getFullYear();
        let month = ("0" + (dateNow.getMonth() + 1)).slice(-2);
        let day = ("0" + dateNow.getDate()).slice(-2);
        let hour = ("0" + dateNow.getHours()).slice(-2);
        let minute = ("0" + dateNow.getMinutes()).slice(-2);
        let seconds = ("0" + dateNow.getSeconds()).slice(-2);
        core_1.globalVariables.logDirTimestamp = `${year}-${month}-${day}_${hour}-${minute}-${seconds}`;
    }
};
exports.initTimeLogDir = initTimeLogDir;
const goToSleep = (newExitCode) => {
    core_1.setExitCode(newExitCode);
    process.kill(process.pid, 3);
};
exports.goToSleep = goToSleep;
const computeServerInstallTime = (transitions_times_file, nb_deps_tot) => {
    const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
    const transitions_times_assembly = transitions_times["transitions_times"]["server"];
    let t_sc_sum = 0;
    for (let i = 0; i < nb_deps_tot; i++) {
        t_sc_sum += transitions_times_assembly["t_sc"][i];
    }
    return transitions_times_assembly["t_sa"] + t_sc_sum;
};
exports.computeServerInstallTime = computeServerInstallTime;
const computeServerUpdateTime = (transitions_times_file, nb_deps_tot) => {
    const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
    const transitions_times_assembly = transitions_times["transitions_times"]["server"];
    let t_ss_sp_sum = 0;
    for (let i = 0; i < nb_deps_tot; i++) {
        t_ss_sp_sum += transitions_times_assembly["t_ss"][i];
        t_ss_sp_sum += transitions_times_assembly["t_sp"][i];
    }
    return t_ss_sp_sum;
};
exports.computeServerUpdateTime = computeServerUpdateTime;
const computeServerRunningTime = (transitions_times_file) => {
    const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
    const transitions_times_assembly = transitions_times["transitions_times"]["server"];
    return transitions_times_assembly["t_sr"];
};
exports.computeServerRunningTime = computeServerRunningTime;
const computeDepRunningTime = (transitions_times_file, assemblyName) => {
    const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
    const transitions_times_assembly = transitions_times["transitions_times"][assemblyName];
    return transitions_times_assembly["t_dr"];
};
exports.computeDepRunningTime = computeDepRunningTime;
const computeDepInstallTime = (transitions_times_file, depName) => {
    const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
    const transitions_times_assembly = transitions_times["transitions_times"][depName];
    return transitions_times_assembly["t_di"];
};
exports.computeDepInstallTime = computeDepInstallTime;
const computeDepUpdateTime = (transitions_times_file, depName) => {
    const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
    const transitions_times_assembly = transitions_times["transitions_times"][depName];
    return transitions_times_assembly["t_du"];
};
exports.computeDepUpdateTime = computeDepUpdateTime;
