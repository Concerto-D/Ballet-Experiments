import {globalVariables, newLogger, registerTimeValue, setExitCode, TimestampPeriod, TimestampType} from "@mjuz/core";
import * as fs from "fs";
import * as YAML from "yaml";

export const getScriptParameters = (): [string, number, string, string, string, number, any] => {
	const config_file_path = process.argv[4];
	const duration = Number.parseInt(process.argv[5]);
	const timestamp_log_file = process.argv[6];
	const current_execution_dir = process.argv[7];
	const targetDeployment = process.argv[8];
	const nbScalingNodes = Number.parseInt(process.argv[9]);
	let scalingNum = null;
	if(process.argv.length > 10) {
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
	]
}

export const initializeReconf = (assemblyType: string) => {
	const [
		config_file_path,
		duration,
		timestamp_log_file,
		current_execution_dir,
		targetDeployment,
		nbScalingNodes,
		scalingNum
	] = getScriptParameters();
	globalVariables.execution_expe_dir = current_execution_dir;
	globalVariables.reconfigurationName = targetDeployment;
	let assemblyName = assemblyType
	if(scalingNum !== null) {
		assemblyName += scalingNum.toString()
	}
	try {
		if (!fs.existsSync(current_execution_dir)) fs.mkdirSync(current_execution_dir);
	} catch {}
	try {
		if (!fs.existsSync(`${current_execution_dir}/logs`)) fs.mkdirSync(`${current_execution_dir}/logs`);
	} catch {}
	const logger = newLogger('pulumi',  `${current_execution_dir}/logs/logs_${assemblyName}.txt`);
	logger.info("---------------------------------- Waking up hello everyone ----------------------------------------------------")
	// Initialization timestamp log dir
	initTimeLogDir(assemblyName, current_execution_dir, timestamp_log_file, logger);
	
	// Get location of nodes
	const inventory = YAML.parse(fs.readFileSync(`${current_execution_dir}/inventory.yaml`, "utf-8"))

	setExitCode(0);  // Set default exit code
	
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
	logger.info(config_file_path)
	logger.info(timestamp_log_file)
	logger.info(current_execution_dir)
	logger.info(targetDeployment)
	logger.info(`${nbScalingNodes}`)
	logger.info(`${scalingNum}`)
	logger.info("------------");
	
	return [  // TODO: refacto parallel_deps
		transitions_times,
		targetDeployment,
		nbScalingNodes,
		scalingNum,
		inventory,
		logger
	]
}

export const initTimeLogDir = (assemblyName: string, current_execution_dir: string, logDirTimestamp: string | null, logger: any): void => {
	
	// if(!fs.existsSync(current_execution_dir)) {
	// 	try {
	// 		fs.mkdirSync(current_execution_dir);
	// 	}
	// 	catch {
	// 		logger.info(`------ RACE CONDITION HANDLED BY EXCEPTION: FOLDER ${current_execution_dir} WAS ALREADY CREATED`);
	// 	}
	// }
	globalVariables.assemblyName = assemblyName;
	if (logDirTimestamp !== null) {
		globalVariables.logDirTimestamp = logDirTimestamp;
	}
	else {
		const dateNow = new Date();
		let year = dateNow.getFullYear();
		let month = ("0" + (dateNow.getMonth() + 1)).slice(-2);
		let day = ("0" + dateNow.getDate()).slice(-2);
		let hour = ("0" + dateNow.getHours()).slice(-2);
		let minute = ("0" + dateNow.getMinutes()).slice(-2);
		let seconds = ("0" + dateNow.getSeconds()).slice(-2);
		globalVariables.logDirTimestamp = `${year}-${month}-${day}_${hour}-${minute}-${seconds}`;
	}
}


export const goToSleep = (newExitCode: number): void => {
	setExitCode(newExitCode);
	process.kill(process.pid, 3);
};


export const computeServerInstallTime = (transitions_times_file: string, nb_deps_tot: number): number => {
	const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
	const transitions_times_assembly = transitions_times["transitions_times"]["server"]
	let t_sc_sum = 0;
	for (let i = 0; i < nb_deps_tot; i++) {
		t_sc_sum += transitions_times_assembly["t_sc"][i]
	}
	
	return transitions_times_assembly["t_sa"] + t_sc_sum
};

export const computeServerUpdateTime = (transitions_times_file: string, nb_deps_tot: number): number => {
	const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
	const transitions_times_assembly = transitions_times["transitions_times"]["server"]
	let t_ss_sp_sum = 0;
	for (let i = 0; i < nb_deps_tot; i++) {
		t_ss_sp_sum += transitions_times_assembly["t_ss"][i]
		t_ss_sp_sum += transitions_times_assembly["t_sp"][i]
	}
	
	return t_ss_sp_sum
};

export const computeServerRunningTime = (transitions_times_file: string): number => {
	const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
	const transitions_times_assembly = transitions_times["transitions_times"]["server"]
	
	return transitions_times_assembly["t_sr"];
};

export const computeDepRunningTime = (transitions_times_file: string, assemblyName: string): number => {
	const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
	const transitions_times_assembly = transitions_times["transitions_times"][assemblyName]
	
	return transitions_times_assembly["t_dr"];
};

export const computeDepInstallTime = (transitions_times_file: string, depName: string): number => {
	const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
	const transitions_times_assembly = transitions_times["transitions_times"][depName]
	
	return transitions_times_assembly["t_di"];
};

export const computeDepUpdateTime = (transitions_times_file: string, depName: string): number => {
	const transitions_times = JSON.parse(fs.readFileSync(transitions_times_file, "utf-8"));
	const transitions_times_assembly = transitions_times["transitions_times"][depName]

	return transitions_times_assembly["t_du"];
};
