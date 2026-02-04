import { FormatterState } from '../graph';
import { Line } from '../../formatter';
import pipeline from '../../middleware';
import resolve_job from '../../jobs/resolve';
import template_job from '../../jobs/template';
import testGen from '../../jobs/test-gen';
import docParser from '../../jobs/doc-parser';
import defines from '../../jobs/@define';
import render from '../../jobs/render';
import * as fs from 'fs';
import { join, dirname, resolve as pathResolve } from "path";
import { log, fmt } from '../../utils/colors';

/**
 * Intelligent Parser Node.
 * Reuses the existing Formatter logic but adapts it for the Agentic Flow.
 */
export async function smartParserNode(state: FormatterState): Promise<Partial<FormatterState>> {
  log.subsection('Agentic Parser');

  // Create a customized stack that does NOT include the agentic job
  const renderStack = pipeline<any>();
  renderStack.use(resolve_job, template_job, testGen, docParser, defines, render);

  let inputContent: string;
  let targetPath: string;
  let targetFilename: string | undefined;

  // No verbose logging here, handled by main entry points

  // Decide if we should bundle multiple files or use a single entry point
  if (state.files && state.files.length > 1 && (!state.config?.mform?.main && !(state.config as any)?.main)) {
      log.step(`Bundling ${fmt.number(state.files.length)} files into virtual entry point`);
      // Sort files to ensure predictable order (important for numbered projects like gmccg)
      const sortedFiles = [...state.files].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      inputContent = sortedFiles.map(f => `#include ${f}`).join('\n');
      targetPath = state.projectRoot;
      targetFilename = "virtual-project.mu";
  } else {
      const target = state.entryPoint || state.projectRoot;
      
      if (!target) {
        throw new Error("No target files found to parse.");
      }

      const absoluteTarget = pathResolve(target);
      targetPath = dirname(absoluteTarget);
      targetFilename = absoluteTarget.split("/").pop();

      if (fs.existsSync(absoluteTarget)) {
          const stats = fs.statSync(absoluteTarget);
          if (stats.isFile()) {
               inputContent = fs.readFileSync(absoluteTarget, 'utf8');
          } else {
               const indexPath = join(absoluteTarget, 'index.mush');
               if (fs.existsSync(indexPath)) {
                   inputContent = fs.readFileSync(indexPath, 'utf8');
               } else if (state.files && state.files.length > 0) {
                   inputContent = fs.readFileSync(state.files[0], 'utf8');
               } else {
                   throw new Error("No files to parse in directory");
               }
          }
      } else {
          throw new Error(`Target not found: ${target}`);
      }
  }
  
  const ctx: any = {
    cache: new Map(),
    input: inputContent,
    path: targetPath,
    filename: targetFilename,
    output: "",
    combined: "",
    defines: new Map(),
    scratch: {},
    headers: [],
    footers: [],
  };

  const open_job = require('../../jobs/open').default;
  await open_job(ctx, async () => {});
  await renderStack.execute(ctx);

  const lines: Line[] = ctx.output.trim().split('\n').map((text: string, idx: number) => ({
      text,
      file: targetFilename || "unknown",
      line: idx + 1
  }));
  
  log.success(`Parsing Complete: ${fmt.number(lines.length)} lines`);

  return {
    formattedLines: lines,
    currentContent: { [targetFilename || "project"]: ctx.output.trim() },
    iterationCount: 1
  };
}
