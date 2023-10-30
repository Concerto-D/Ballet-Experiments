const computeOpenstackCreateTime = (tt_ass: any, assemblyName: string, scalingNum: number): any => {
	if (assemblyName === "mariadbmaster") {
		return {"mariadbmaster": (tt_ass["mariadbmaster"]["configure0"] 
								+ tt_ass["mariadbmaster"]["configure1"]
								+ tt_ass["mariadbmaster"]["bootstrap"] 
								+ tt_ass["mariadbmaster"]["start"] 
								+ tt_ass["mariadbmaster"]["register"]
								+  tt_ass["mariadbmaster"]["deploy"])
		} 
	}
	else if (assemblyName.includes("worker")) {
		return {
			"mariadbworker": (tt_ass[`mariadbworker${scalingNum}`]["configure0"] 
							+ tt_ass[`mariadbworker${scalingNum}`]["configure1"] 
							+ tt_ass[`mariadbworker${scalingNum}`]["bootstrap"] 
							+ tt_ass[`mariadbworker${scalingNum}`]["start"]
							+ tt_ass[`mariadbworker${scalingNum}`]["register"]
							+ tt_ass[`mariadbworker${scalingNum}`]["deploy"]),
			"keystone": tt_ass[`keystone${scalingNum}`]["pull"] + tt_ass[`keystone${scalingNum}`]["deploy"],
			"glance": tt_ass[`glance${scalingNum}`]["pull0"] + tt_ass[`glance${scalingNum}`]["pull1"] + tt_ass[`glance${scalingNum}`]["pull2"] + tt_ass[`glance${scalingNum}`]["deploy"]
		}
	}
	else if (assemblyName.includes("nova")) {
		return {"nova": (tt_ass[assemblyName]["pull0"] 
				       + tt_ass[assemblyName]["pull1"] 
				       + tt_ass[assemblyName]["pull2"]
				       + tt_ass[assemblyName]["ready0"]
				       + tt_ass[assemblyName]["ready1"]
					   + tt_ass[assemblyName]["cell_setup"]
				       + tt_ass[assemblyName]["start"]
				       + tt_ass[assemblyName]["deploy"])
		}
	}
	else if (assemblyName.includes("neutron")) {
		return {"neutron": tt_ass[assemblyName]["pull0"] + tt_ass[assemblyName]["pull1"] + tt_ass[assemblyName]["pull2"] + tt_ass[assemblyName]["deploy"]}
	}
	else {
		throw new Error(`Assembly name not found for transitions time create: ${assemblyName}`)
	}
}


const computeOpenstackDeleteTime = (tt_ass: any, assemblyName: string, scalingNum: number): any => {
	if (assemblyName === "mariadbmaster") {
		return {"mariadbmaster": tt_ass["mariadbmaster"]["interrupt"] + tt_ass["mariadbmaster"]["unconfigure"]} 
	}
	else if (assemblyName.includes("worker")) {
		return {
			"mariadbworker": tt_ass[`mariadbworker${scalingNum}`]["interrupt"] + tt_ass[`mariadbworker${scalingNum}`]["unconfigure"],
			"keystone": tt_ass[`keystone${scalingNum}`]["turnoff"],
			"glance": tt_ass[`glance${scalingNum}`]["turnoff"]
		}
	}
	else if (assemblyName.includes("nova")) {
		return {"nova": tt_ass[assemblyName]["interrupt"] + tt_ass[assemblyName]["unpull"]}
	}
	else if (assemblyName.includes("neutron")) {
		return {"neutron": tt_ass[assemblyName]["turnoff"]}
	}
	else {
		throw new Error(`Assembly name not found for transitions time delete: ${assemblyName}`)
	}
};

export const computeOpenstackTimes = (transitions_times: any, assemblyName: string, scalingNum: number): any => {
	let createTime = computeOpenstackCreateTime(transitions_times["transitions_times"], assemblyName, scalingNum);
	let deleteTime = computeOpenstackDeleteTime(transitions_times["transitions_times"], assemblyName, scalingNum);
	return [createTime, deleteTime]
}
