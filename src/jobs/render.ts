import { Context, Next } from "../formatter";

export default (ctx: Context, next: Next) => {
  // Process headers
  ctx.scratch.current = ctx.scratch.current.replace(
    /^#header\s+(.*)\s?=\s?(.*)/gim,
    (...args: string[]) => {
      ctx.headers!.push({ name: args[1], value: args[2] });
      return "";
    }
  );

  // Process footers
  ctx.scratch.current = ctx.scratch.current.replace(
    /^#footer\s+(.*)\s?=\s?(.*)/gim,
    (...args: string[]) => {
      ctx.footers!.push({ name: args[1], value: args[2] });
      return "";
    }
  );

  // Look for the @debug directive.
  ctx.scratch.current = ctx.scratch.current.replace(/@debug/g, () => {
    ctx.debug = true;
    return "";
  });

  // Expose any debug statements, if debugging is true.
  ctx.scratch.current = ctx.scratch.current.replace(
    /#debug\s*?{([\s\S]+)\n}\s*?/gi,
    (...args: string[]) => {
      if (ctx.debug) return args[1];
      return "";
    }
  );

  next();
};
