import * as fs from 'fs';
import * as path from 'path';
import { FormatterState } from '../graph';

/**
 * Recursively list all files in a directory.
 */
function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.tmp' && file !== 'dist') {
        walkDir(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

/**
 * Project Analyzer Node.
 * List files and eventually use an LLM to decide which ones are source code.
 */
export async function projectAnalyzerNode(state: FormatterState): Promise<Partial<FormatterState>> {
  console.log(`--- Analyzing Project at: ${state.projectRoot} ---`);
  
  if (!state.projectRoot) {
    throw new Error("projectRoot is required in state.");
  }

  // Check if it's a file or directory
  const stats = fs.statSync(state.projectRoot);
  
  if (stats.isFile()) {
    // It's a single file - treat it as the entry point
    console.log(`Single file detected: ${path.basename(state.projectRoot)}`);
    return {
      files: [state.projectRoot],
      entryPoint: state.projectRoot,
      iterationCount: 1
    };
  }

  // It's a directory - walk it
  const allFiles = walkDir(state.projectRoot);
  
  // Basic heuristic: Include .txt and .mush files.
  // In a full agentic version, we'd pass this list to an LLM.
  const sourceFiles = allFiles.filter(f => 
    f.endsWith('.txt') || f.endsWith('.mush') || f.endsWith('.mu')
  );

  console.log(`Found ${sourceFiles.length} potential source files.`);

  // Identifying entry point
  let entryPoint: string | undefined = state.entryPoint;
  
  if (!entryPoint) {
      // Heuristic: check for mush.json first
      const mushJsonPath = path.join(state.projectRoot, 'mush.json');
      if (fs.existsSync(mushJsonPath)) {
          try {
              const config = JSON.parse(fs.readFileSync(mushJsonPath, 'utf8'));
              if (config.main) {
                  entryPoint = path.resolve(state.projectRoot, config.main);
              }
          } catch (e) {
              console.warn("Failed to parse mush.json");
          }
      }
  }
  
  if (!entryPoint) {
    // Heuristic: Index files
    entryPoint = sourceFiles.find(f => {
        const lower = path.basename(f).toLowerCase();
        return lower === 'index.mush' || lower === 'index.txt' || lower.includes('main') || lower.includes('setup');
    });
  }

  console.log(`Determined Entry Point: ${entryPoint}`);

  return {
    files: sourceFiles,
    entryPoint: entryPoint,
    iterationCount: 1
  };
}
