var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
System.register("jobs/open", [], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            exports_1("default", (data, next) => next(null, data));
        }
    };
});
System.register("jobs/render", [], function (exports_2, context_2) {
    "use strict";
    var __moduleName = context_2 && context_2.id;
    return {
        setters: [],
        execute: function () {
            exports_2("default", (data, next) => {
                // Process headers
                data.scratch.current = data.input.replace(/^#header\s+(.*)\s?=\s?(.*)/gim, (...args) => {
                    data.headers.push({ name: args[1], value: args[2] });
                    return "";
                });
                // Process footers
                data.scratch.current = data.input.replace(/^#footer\s+(.*)\s?=\s?(.*)/gim, (...args) => {
                    data.footers.push({ name: args[1], value: args[2] });
                    return "";
                });
                return next(null, data);
            });
        }
    };
});
System.register("jobs/compress", [], function (exports_3, context_3) {
    "use strict";
    var __moduleName = context_3 && context_3.id;
    return {
        setters: [],
        execute: function () {
            exports_3("default", (data, next) => {
                data.output = data
                    .scratch.current.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, " ") // remove comments
                    .replace(/^#.*/gim, "") // remove unevaluated tags.
                    .split("\n")
                    .filter(Boolean)
                    .reduce((acc, curr) => {
                    curr.match(/^[^\s]/) // Does line start with a NOT space?
                        ? (acc += "\n" + curr.trim())
                        : (acc += curr.trim());
                    return acc;
                }, "");
                return next(null, data);
            });
        }
    };
});
System.register("formatter", ["jobs/open", "jobs/render", "jobs/compress"], function (exports_4, context_4) {
    "use strict";
    var open_1, render_1, compress_1, format;
    var __moduleName = context_4 && context_4.id;
    return {
        setters: [
            function (open_1_1) {
                open_1 = open_1_1;
            },
            function (render_1_1) {
                render_1 = render_1_1;
            },
            function (compress_1_1) {
                compress_1 = compress_1_1;
            }
        ],
        execute: function () {
            format = (text) => __awaiter(void 0, void 0, void 0, function* () {
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
                const process = (step, data) => __awaiter(void 0, void 0, void 0, function* () {
                    let idx = 0;
                    const next = (err, data) => __awaiter(void 0, void 0, void 0, function* () {
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
            exports_4("default", format);
        }
    };
});
