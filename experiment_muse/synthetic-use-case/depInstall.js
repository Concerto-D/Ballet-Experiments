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
exports.DepInstallResource = exports.DepInstallProvider = void 0;
const pulumi_1 = require("@pulumi/pulumi");
class DepInstallProvider {
    check(olds, news) {
        return __awaiter(this, void 0, void 0, function* () {
            // Add nameChanged value for the diff method
            news.reconfChanged = olds.reconfState !== news.reconfState;
            return {
                inputs: news,
            };
        });
    }
    create(inputs) {
        return __awaiter(this, void 0, void 0, function* () {
            const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));
            yield sleep(inputs.time);
            return {
                id: inputs.reconfState,
                outs: {
                    reconfState: inputs.reconfState,
                    time: inputs.time,
                },
            };
        });
    }
    diff(id, olds, news) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: check how to access olds parameter 
            const changed = news.reconfChanged;
            return {
                changes: changed,
                replaces: ["reconfState"],
                deleteBeforeReplace: true
            };
        });
    }
    update(id, olds, news) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                id: news.reconfState,
                outs: {
                    reconfState: news.reconfState,
                    time: news.time,
                    depsOffers: news.depOffers
                }
            };
        });
    }
    delete(id, props) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
}
exports.DepInstallProvider = DepInstallProvider;
class DepInstallResource extends pulumi_1.dynamic.Resource {
    constructor(name, props, opts) {
        super(new DepInstallProvider(), name, props, opts);
    }
}
exports.DepInstallResource = DepInstallResource;
