import { Context, Next } from "../formatter";

export default (ctx: Context, next: Next) => {
  ctx.scratch.define = {};
  ctx.scratch.define.started = false;
  ctx.scratch.define.edited = "";
  ctx.scratch.define.trigger = "";
  ctx.scratch.define.body = "";
  ctx.scratch.current?.split("\n").forEach((line) => {
    const defMatch = line.match(/^@define\s+([^{]+)/i);
    if (defMatch) {
      ctx.scratch.define.started = true;
      ctx.scratch.define.trigger = defMatch[1];
      ctx.scratch.define.body = "";
    } else if (/^\}/g.test(line) && ctx.scratch.define.started) {
      if (ctx.scratch.define.body)
        ctx.defines?.set(
          new RegExp(ctx.scratch.define.trigger.trim(), "gi"),
          ctx.scratch.define.body
        );
      ctx.scratch.define.trigger = "";
      ctx.scratch.define.body = "";
      ctx.scratch.define.started = false;
    } else if (ctx.scratch.define.started) {
      ctx.scratch.define.body += line + "\n";
    } else {
      ctx.scratch.define.edited += line + "\n";
    }
  });

  ctx.scratch.current = ctx.scratch.define.edited;

  next();
};
