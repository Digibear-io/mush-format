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
  ctx.scratch.current = ctx.scratch.current.replace(/@debug/gi, () => {
    ctx.debug = true;
    return "";
  });

  // Look for the @installer directive.
  ctx.scratch.current = ctx.scratch.current.replace(/@installer/gi, () => {
    ctx.installer = true;
    return "";
  });

  // Check for #define definitions
  ctx.scratch.current = ctx.scratch.current.replace(
    /#define\s+?(.*)\s+?{([\S\s]+)\n}\s*?/gi,
    (...args: string[]) => {
      ctx.defines?.set(new RegExp(args[1], "gi"), args[2]);
      return "";
    }
  );

  // Expose any debug statements, if debugging is true.
  ctx.scratch.current = ctx.scratch.current.replace(
    /#debug\s*?{([\s\S]+)\n}\s*?/gi,
    (...args: string[]) => {
      if (ctx.debug) return args[1];
      return "";
    }
  );

  // Replace defines.
  ctx.defines?.forEach((v, k) => {
    ctx.scratch.current = ctx.scratch.current.replace(
      k,
      (...args: string[]) => {
        let registers = args;
        // Search through the value string for registers and replace.
        return v.replace(/\$([0-9])/g, (...args) => {
          if (registers[parseInt(args[1])]) {
            return registers[parseInt(args[1])].trim();
          } else {
            return "";
          }
        });
      }
    );
  });

  next();
};
