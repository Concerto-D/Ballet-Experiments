"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeStrCPSTimes = void 0;
const computeStrCPSCreateTime = (tt_ass, assemblyName, scalingNum) => {
    if (assemblyName === "database") {
        return { "database": (tt_ass["database"]["configure0"]
                + tt_ass["database"]["configure1"]
                + tt_ass["database"]["bootstrap"]
                + tt_ass["database"]["deploy"])
        };
    }
    else if (assemblyName === "system") {
        return { "system": (tt_ass["system"]["initiate0"]
                + tt_ass["system"]["initiate1"]
                + tt_ass["system"]["initiate2"]
                + tt_ass["system"]["deploy"])
        };
    }
    else if (assemblyName.includes("cps")) {
        return {
            "listener": (tt_ass[`listener${scalingNum}`]["start"]
                + tt_ass[`listener${scalingNum}`]["configure"]
                + tt_ass[`listener${scalingNum}`]["run"]),
            "sensor": (tt_ass[`sensor${scalingNum}`]["provision0"]
                + tt_ass[`sensor${scalingNum}`]["provision1"]
                + tt_ass[`sensor${scalingNum}`]["provision2"]
                + tt_ass[`sensor${scalingNum}`]["install"]
                + tt_ass[`sensor${scalingNum}`]["configure"]
                + tt_ass[`sensor${scalingNum}`]["run"]),
        };
    }
    else {
        throw new Error(`Assembly name not found for transitions time create: ${assemblyName}`);
    }
};
const computeStrCPSDeleteTime = (tt_ass, assemblyName, scalingNum) => {
    if (assemblyName === "database") {
        return { "database": tt_ass["database"]["interrupt"] + tt_ass["database"]["unconfigure"] };
    }
    else if (assemblyName === "system") {
        return { "system": tt_ass["system"]["stop"] };
    }
    else if (assemblyName.includes("cps")) {
        return {
            "listener": tt_ass[`listener${scalingNum}`]["interrupt"],
            "sensor": tt_ass[`sensor${scalingNum}`]["pause"],
        };
    }
    else {
        throw new Error(`Assembly name not found for transitions time create: ${assemblyName}`);
    }
};
const computeStrCPSTimes = (transitions_times, assemblyName, scalingNum) => {
    let createTime = computeStrCPSCreateTime(transitions_times["transitions_times"], assemblyName, scalingNum);
    let deleteTime = computeStrCPSDeleteTime(transitions_times["transitions_times"], assemblyName, scalingNum);
    return [createTime, deleteTime];
};
exports.computeStrCPSTimes = computeStrCPSTimes;
