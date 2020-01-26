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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const open_1 = __importDefault(require("./jobs/open"));
const render_1 = __importDefault(require("./jobs/render"));
const compress_1 = __importDefault(require("./jobs/compress"));
function format(text) {
    return __awaiter(this, void 0, void 0, function* () {
        const stack = new Map();
        // Preload the categories
        stack.set("pre", []);
        stack.set("open", []);
        stack.set("render", []);
        stack.set("compress", []);
        stack.set("post", []);
        /**
         * Add a new Job(layer) pmtp tje stack.
         * @param step The current step to add the job to.
         * @param layer The job to be added
         */
        const use = (step, layer) => stack.get(step).push(layer);
        // install the middleware
        use("open", open_1.default);
        use("render", render_1.default);
        use("compress", compress_1.default);
        /**
         * Process the indivitual steps of the formatter.
         * @param step The current step.
         * @param data The formatting data passed between steps.
         */
        const process = (step, data) => __awaiter(this, void 0, void 0, function* () {
            let idx = 0;
            const next = (err, data) => __awaiter(this, void 0, void 0, function* () {
                if (err)
                    return Promise.reject(err);
                if (idx >= stack.get(step).length)
                    return Promise.resolve(data);
                const layer = stack.get(step)[idx++];
                yield layer(data, next).catch((err) => next(err));
            });
            yield next(null, data);
        });
        const data = {
            cache: new Map(),
            input: text,
            output: "",
            scratch: {},
            headers: [],
            footers: []
        };
        // Okay, passing data around here and mutating it.  I'm sure
        // there's a more elegant way, but this'll work for now!
        yield process("pre", data);
        yield process("open", data);
        yield process("render", data);
        yield process("compress", data);
        yield process("post", data);
        return data.output.trim();
    });
}
exports.format = format;
;
//# sourceMappingURL=formatter.js.map