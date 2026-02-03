import { app } from "../agent/graph";
import { Context, Next, Line } from "../formatter";
import * as path from "path";
import * as fs from "fs";

/**
 * Agentic Formatter Job.
 * Integrates the LangGraph-based agentic system into the formatter pipeline.
 */
export default async (ctx: Context, next: Next) => {
  // If we don't have an input path, we can't use the agent easily as it expects files.
  // However, we can create a temporary file or adapt the nodes.
  // For now, let's assume we have a path or we create a virtual entry.
  
  const projectRoot = ctx.path || process.cwd();
  const entryPoint = ctx.filename ? path.join(ctx.path, ctx.filename) : undefined;

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
      
      // Update combined output if needed
      if (ctx.combined !== undefined) {
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
