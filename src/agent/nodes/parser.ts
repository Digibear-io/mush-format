import { FormatterState } from '../graph';
import { Formatter, Line } from '../../formatter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Intelligent Parser Node.
 * Reuses the existing Formatter logic but adapts it for the Agentic Flow.
 */
export async function smartParserNode(state: FormatterState): Promise<Partial<FormatterState>> {
  console.log("--- Agentic Parsing Start ---");

  const formatter = new Formatter();
  
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
  
  const output = await formatter.format(inputContent, path.dirname(target), path.basename(target));
  
  // Extract the formatted lines from the context
  // The formatter puts the result in ctx.scratch.current as Line[]
  // We need to access it. But format() returns { data, combined }.
  // We need the Line[] array internally stored.
  // The formatter doesn't expose ctx.scratch.current externally easily.
  // We could parse the output back into lines, OR we modify the formatter to return it.
  // For now, let's create Line objects from the output.
  
  const lines: Line[] = output.data.split('\n').map((text, idx) => ({
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
