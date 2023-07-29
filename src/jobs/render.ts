import { Context, Next } from "../formatter";
import { replaceDefines } from "../utils/replaceDefines";

export default async (ctx: Context, next: Next) => {
  // Process headers
  ctx.scratch.current = ctx.scratch.current?.replace(
    /#header\s+(.*)\s?=\s?(.*)/gim,
    (...args: string[]) => {
      ctx.headers!.push({ name: args[1], value: args[2] });
      return "";
    }
  );

  // Process footers
  ctx.scratch.current = ctx.scratch.current?.replace(
    /#footer\s+(.*)\s?=\s?(.*)/gim,
    (...args: string[]) => {
      ctx.footers!.push({ name: args[1], value: args[2] });
      return "";
    }
  );

  // Look for the @installer directive.
  ctx.scratch.current = ctx.scratch.current?.replace(/@installer/gi, () => {
    ctx.installer = true;
    return "";
  });

  // Expose any debug statements, if debugging is true.
  ctx.scratch.debug = {};
  ctx.scratch.debug.body = "";
  ctx.scratch.debug.edited = "";
  ctx.scratch.debug.start = false;
  ctx.scratch.debug.debug = false;

  ctx.scratch.current?.split("\n").forEach((line) => {
    if (/^@debug/i.test(line)) {
      ctx.scratch.debug.debug = true;
    } else if (/^#debug\s*?\{/gi.test(line)) {
      ctx.scratch.debug.start = true;
    } else if (
      ctx.scratch.debug.start &&
      ctx.scratch.debug.debug &&
      !/^\}/i.test(line)
    ) {
      ctx.scratch.debug.edited += line + "\n";
    } else if (/^\}/i.test(line) && ctx.scratch.debug.start) {
      ctx.scratch.debug.start = false;
    } else if (!ctx.scratch.debug.start) {
      ctx.scratch.debug.edited += line + "\n";
    }
  });

  ctx.scratch.current = ctx.scratch.debug.edited;

  // Replace defines.
  ctx.scratch.current = replaceDefines(ctx, ctx.scratch.current || "");

  next();
};
