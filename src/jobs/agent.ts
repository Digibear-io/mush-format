import { app } from "../agent/graph";
import { Context, Next, Line } from "../formatter";
import * as path from "path";
import * as fs from "fs";

/**
 * Agentic Formatter Job.
 * Integrates the LangGraph-based agentic system into the formatter pipeline.
 */
export default async (ctx: Context, next: Next) => {
  // If we don't have an input path or filename, we skip agentic project analysis.
  // This typically happens when formatting raw string inputs (like in unit tests).
  if (!ctx.path && !ctx.filename) {
    return next();
  }

  // Allow explicit disabling of agent mode via context
  if ((ctx as any).agent === false) {
    return next();
  }

  // Resolve relative paths based on the context's path
  const projectRoot = ctx.path ? path.resolve(process.cwd(), ctx.path) : process.cwd();
  const entryPoint = (ctx.path && ctx.filename) ? path.resolve(process.cwd(), ctx.path, ctx.filename) : undefined;

  console.log(`[AgentJob] Starting agentic formatting for ${entryPoint || projectRoot}`);

  try {
    // Invoke the LangGraph app
    const result = await app.invoke({
      projectRoot,
      entryPoint,
      iterationCount: 0,
    });

    // The agent produces formattedLines in the state
    if (result.formattedLines && result.formattedLines.length > 0) {
      ctx.scratch.current = result.formattedLines;
      ctx.output = result.formattedLines.map((l: Line) => l.text).join("\n");
      
      // Determine the file or directory name to check against ignore list
      // If entryPoint is defined, use its basename. Otherwise, use ctx.path's basename.
      // If neither, default to an empty string to avoid errors.
      const fileToCheck = entryPoint ? path.basename(entryPoint) : (ctx.path ? path.basename(ctx.path) : '');

      if (fileToCheck !== 'node_modules' && fileToCheck !== '.git' && fileToCheck !== '.tmp' && fileToCheck !== 'dist' && fileToCheck !== '.agent' && fileToCheck !== 'mocks' && !fileToCheck.startsWith('.')) {
          ctx.combined = ctx.output;
      }
      
      console.log(`[AgentJob] Agentic formatting complete. ${result.formattedLines.length} lines processed.`);
    } else {
      console.warn("[AgentJob] Agent returned no formatted lines. Falling back to next middleware.");
    }
  } catch (error) {
    console.error("[AgentJob] Error running agentic formatter:", error);
    // Continue to next middleware as fallback
  }

  return next();
};
