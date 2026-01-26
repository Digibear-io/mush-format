import { Context, Next, Line } from "../formatter";
import { generateInstallScript } from "./installer";

export default async (ctx: Context, next: Next) => {
  if (!ctx.installer) return next();
  
  // Ensure we have lines
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];
  
  // Convert lines to strings
  // The 'compress' job usually leaves us with clean commands.
  // We assume ctx.scratch.current contains the list of commands to be installed.
  const commands = lines.map(l => l.text);
  
  const options = {
      // Future: parse options from headers/config?
      // For now, default options.
      // Maybe we can check for specific headers to populate options?
  };
  
  const script = generateInstallScript(commands, options, ctx);
  
  // Replace output with the install script
  ctx.output = script;

  // We might want to clear scratch.current or replace it to reflect change?
  // But formatter.ts usually grabs ctx.output if defined? 
  // Actually formatter.ts does: 
  // ctx.output = processedLines.map((l) => l.text).join("\n"); in compress.ts
  // So we run AFTER compress.
  
  // If we run AFTER compress, compress sets ctx.output.
  // We overwrite it.
  
  next();
};
