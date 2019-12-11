"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (data, next) => {
    data.output = data
        .scratch.current.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, " ") // remove comments
        .replace(/^#.*/gim, "") // remove unevaluated tags.
        .split("\n")
        .filter(Boolean)
        .reduce((acc, curr) => {
        curr.match(/^[^\s]/) // Does line start with a NOT space?
            ? (acc += "\n" + curr.trim())
            : (acc += " " + curr.trim());
        return acc;
    }, "")
        .replace(/\(\s+/g, "(")
        .replace(/\)\s+\)/g, "))")
        .replace(/\s+?=\s+?|=\s+?/g, "=");
    return next(null, data);
};
//# sourceMappingURL=compress.js.map