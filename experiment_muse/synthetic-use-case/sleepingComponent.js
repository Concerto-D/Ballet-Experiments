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
exports.SleepingComponentResource = exports.SleepingComponentProvider = void 0;
const pulumi_1 = require("@pulumi/pulumi");
class SleepingComponentProvider {
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
            yield sleep(inputs.timeCreate);
            return {
                id: inputs.reconfState,
                outs: {
                    reconfState: inputs.reconfState,
                    timeCreate: inputs.timeCreate,
                    timeDelete: inputs.timeDelete,
                    depsOffers: inputs.depsOffers
                },
            };
        });
    }
    diff(id, olds, news) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    timeCreate: news.timeCreate,
                    timeDelete: news.timeDelete,
                    depsOffers: news.depOffers
                }
            };
        });
    }
    delete(id, props) {
        return __awaiter(this, void 0, void 0, function* () {
            const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));
            yield sleep(props.timeDelete);
        });
    }
}
exports.SleepingComponentProvider = SleepingComponentProvider;
class SleepingComponentResource extends pulumi_1.dynamic.Resource {
    constructor(name, props, opts) {
        super(new SleepingComponentProvider(), name, props, opts);
    }
}
exports.SleepingComponentResource = SleepingComponentResource;
