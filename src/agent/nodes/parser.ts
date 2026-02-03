import { FormatterState } from '../graph';
import { Line, Header } from '../../formatter';
import pipeline, { Pipe } from '../../middleware';
import open from '../../jobs/open';
import resolve from '../../jobs/resolve';
import template from '../../jobs/template';
import testGen from '../../jobs/test-gen';
import docParser from '../../jobs/doc-parser';
import defines from '../../jobs/@define';
import render from '../../jobs/render';
import format from '../../jobs/format';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Intelligent Parser Node.
 * Reuses the existing Formatter logic but adapts it for the Agentic Flow.
 * It avoids calling the agentic job recursively.
 */
export async function smartParserNode(state: FormatterState): Promise<Partial<FormatterState>> {
  console.log("--- Agentic Parsing Start ---");

  // Create a customized stack that does NOT include the agentic job
  const renderStack = pipeline<any>();
  renderStack.use(resolve, template, testGen, docParser, defines, render);

  // If we have an entry point, we use it. Otherwise we process all discovered files.
  const target = state.entryPoint || state.projectRoot;
  
  if (!target) {
    throw new Error("No target files found to parse.");
  }

  // Running the existing formatter logic
  let inputContent: string;
  
  if (fs.existsSync(target)) {
      const stats = fs.statSync(target);
      if (stats.isFile()) {
          inputContent = fs.readFileSync(target, 'utf8');
      } else {
          // Directory - look for index file or use first file
          const indexPath = path.join(target, 'index.mush');
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
  
  const ctx: any = {
    cache: new Map(),
    input: inputContent,
    path: path.dirname(target),
    filename: path.basename(target),
    output: "",
    combined: "",
    defines: new Map(),
    scratch: {},
    headers: [],
    footers: [],
  };

  await open(ctx, async () => {});
  await renderStack.execute(ctx);

  const output = {
    data: ctx.output.trim(),
    combined: ctx.combined.trim(),
  };
  
  // Extract the formatted lines from the context
  // The formatter puts the result in ctx.scratch.current as Line[]
  // We need to access it. But format() returns { data, combined }.
  // We need the Line[] array internally stored.
  // The formatter doesn't expose ctx.scratch.current externally easily.
  // We could parse the output back into lines, OR we modify the formatter to return it.
  // For now, let's create Line objects from the output.
  
  const lines: Line[] = output.data.split('\n').map((text: string, idx: number) => ({
      text,
      file: target,
      line: idx + 1
  }));
  
  console.log(`--- Parsing Complete: ${lines.length} lines ---`);

  return {
    formattedLines: lines,
    currentContent: { [target]: output.data },
    iterationCount: 1
  };
}
