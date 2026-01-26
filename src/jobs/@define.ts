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
        let trigger = ctx.scratch.define.trigger.trim();
        const body = ctx.scratch.define.body.trim();
        
        // Detect max arg index used in body (e.g. $1, $2...)
        // We ignore $0 as it usually means full match, unless we want to shift?
        // Let's assume $1 is first arg.
        const matches = body.matchAll(/\$([1-9][0-9]*)/g);
        let maxArg = 0;
        for (const m of matches) {
            const val = parseInt(m[1]);
            if (val > maxArg) maxArg = val;
        }

        if (maxArg > 0 && !trigger.includes("(")) {
            // Generate regex for macros: TRIGGER\s*\((arg1),(arg2)...\)
            // We use [^,)]+ to capture args, allowing trim later.
            // Using [^,)]+ prevents matching closing paren or next arg.
            // Also handle spaces.
            
            // Escape trigger special chars for regex safety?
            // The existing code didn't, but for macros we probably should to be safe.
            // But if user provided regex in trigger, we break it.
            // We'll assume trigger is a simple name for macros.
            
            let argsPattern = "";
            for (let i = 0; i < maxArg; i++) {
                // (capture)
                // We use [^,)]+ which means "anything not comma or close paren"
                // This is a simple parser.
                // We allow whitespace around separators.
                argsPattern += "\\s*([^,)]*)\\s*";
                if (i < maxArg - 1) {
                    argsPattern += ",";
                }
            }
            
            // Full Regex: TRIGGER\s*\( args \)
            trigger = `${trigger}\\s*\\(${argsPattern}\\)`;
        }

        ctx.defines?.set(
          new RegExp(trigger, "gi"),
          body
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
