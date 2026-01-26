import { Context, Next, Line } from "../formatter";

export default (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];
  const outputLines: Line[] = [];

  ctx.scratch.define = {};
  ctx.scratch.define.started = false;
  ctx.scratch.define.edited = ""; // Keeps defines body as string
  ctx.scratch.define.trigger = "";
  ctx.scratch.define.body = "";

  for (const line of lines) {
    const text = line.text;
    const defMatch = text.match(/^@define\s+([^{]+)/i);

    if (defMatch) {
      ctx.scratch.define.started = true;
      ctx.scratch.define.trigger = defMatch[1];
      ctx.scratch.define.body = "";
    } else if (/^\}/g.test(text) && ctx.scratch.define.started) {
      if (ctx.scratch.define.body) {
        ctx.defines?.set(
          new RegExp(ctx.scratch.define.trigger.trim(), "gi"),
          ctx.scratch.define.body.trim()
        );
      }
      ctx.scratch.define.trigger = "";
      ctx.scratch.define.body = "";
      ctx.scratch.define.started = false;
    } else if (ctx.scratch.define.started) {
      ctx.scratch.define.body += text + "\n";
    } else {
      // Not part of a define definition, keep it
      outputLines.push(line);
    }
  }

  // If we were inside a define block but it didn't verify close? 
  // Original logic didn't handle that explicitly well (would lose lines).
  // We'll stick to original logic: if started, lines are consumed into body.

  ctx.scratch.current = outputLines;

  next();
};
