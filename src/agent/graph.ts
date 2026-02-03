import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { Line } from "../formatter";

/**
 * Define the state for the Agentic Formatter.
 */
export const FormatterStateAnnotation = Annotation.Root({
  projectRoot: Annotation<string>(),
  entryPoint: Annotation<string>(),
  files: Annotation<string[]>({
    reducer: (left, right) => (right ? [...new Set([...left, ...right])] : left),
    default: () => [],
  }),
  currentContent: Annotation<Record<string, string>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  formattedLines: Annotation<Line[]>({
    reducer: (left, right) => (right ? right : left), // Replace instead of append
    default: () => [],
  }),
  lintErrors: Annotation<any[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  verificationStatus: Annotation<'untested' | 'passed' | 'failed'>({
    reducer: (left, right) => right ?? left,
    default: () => 'untested',
  }),
  iterationCount: Annotation<number>({
    reducer: (left, right) => (left ?? 0) + (right ?? 0),
    default: () => 0,
  }),
});

export type FormatterState = typeof FormatterStateAnnotation.State;

import { projectAnalyzerNode } from "./nodes/analyzer";
import { smartParserNode } from "./nodes/parser";
import { selfHealingLinterNode } from "./nodes/linter";
import { verificationNode } from "./nodes/verifier";
import { compressorNode } from "./nodes/compressor";

// Conditional Edge Logic
function shouldHeal(state: FormatterState): "linter" | "verifier" | typeof END {
  const { lintErrors, iterationCount } = state;
  
  if (lintErrors && lintErrors.length > 0) {
    if (iterationCount < 3) {
      console.log(`[Graph] Lint errors detected. Entering self-healing loop (Attempt ${iterationCount + 1}/3).`);
      return "linter"; // Loop back to linter (which includes healing logic)
    } else {
      console.log("[Graph] Max healing attempts reached. Proceeding with errors.");
      return "verifier";
    }
  }
  
  return "verifier";
}

const workflow = new StateGraph(FormatterStateAnnotation)
  .addNode("analyzer", projectAnalyzerNode)
  .addNode("parser", smartParserNode)
  .addNode("compressor", compressorNode)
  .addNode("linter", selfHealingLinterNode)
  .addNode("verifier", verificationNode)
  .addEdge(START, "analyzer")
  .addEdge("analyzer", "parser")
  .addEdge("parser", "compressor")
  .addEdge("compressor", "linter")
  .addConditionalEdges("linter", shouldHeal)
  .addEdge("verifier", END);

export const app = workflow.compile();
