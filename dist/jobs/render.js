"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (data, next) => {
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
};
//# sourceMappingURL=render.js.map