import * as fs from 'fs';
import * as path from 'path';
import { FormatterState } from '../graph';
import { loadConfig } from '../../config';
import { globSync } from 'glob';
import { log, fmt } from '../../utils/colors';

/**
 * Recursively list all files in a directory.
 */
function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.tmp' && file !== 'dist' && file !== '.agent' && !file.startsWith('.')) {
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
  log.section(`Analyzing Project: ${fmt.path(state.projectRoot)}`);
  
  if (!state.projectRoot) {
    throw new Error("projectRoot is required in state.");
  }

  // Load Mycelium/MForm config
  const loaded = await loadConfig(undefined, state.projectRoot);
  const config = loaded?.config;

  log.detail(`Config loaded from: ${loaded?.configPath ? fmt.path(loaded.configPath) : fmt.dim('none')}`);
  if (config) {
      log.detail(`Config keys: ${fmt.key(Object.keys(config).join(', '))}`);
      log.detail(`Config include: ${config.include ? fmt.number(config.include.length) : fmt.dim('undefined')}`);
  }

  // Check if it's a file or directory
  const stats = fs.statSync(state.projectRoot);
  
  if (stats.isFile()) {
    // It's a single file - treat it as the entry point
    log.info(`Single file detected: ${fmt.file(path.basename(state.projectRoot))}`);
    return {
      files: [path.resolve(state.projectRoot)],
      entryPoint: path.resolve(state.projectRoot),
      iterationCount: 1
    };
  }

  // It's a directory - walk it
  let sourceFiles: string[] = [];

  if (config?.include && Array.isArray(config.include)) {
    console.log("Using include patterns from config.");
    const patterns = config.include;
    for (const pattern of patterns) {
        const matches = globSync(pattern, { cwd: state.projectRoot, absolute: true, nodir: true });
        sourceFiles.push(...matches);
    }
    // Remove duplicates preserving order
    sourceFiles = [...new Set(sourceFiles)];
  } else {
    const allFiles = walkDir(state.projectRoot);
    // Basic heuristic: Include .txt and .mush files.
    // In a full agentic version, we'd pass this list to an LLM.
    sourceFiles = allFiles.filter(f => 
        f.endsWith('.txt') || f.endsWith('.mush') || f.endsWith('.mu')
    );
  }

  log.step(`Found ${fmt.number(sourceFiles.length)} potential source files`);

  // Identifying entry point
  let entryPoint: string | undefined = state.entryPoint;
  
  if (!entryPoint) {
      // Heuristic: check for mform.config first
      if (config?.mform?.main) {
          entryPoint = path.resolve(state.projectRoot, config.mform.main);
      } else if ((config as any)?.main) {
          entryPoint = path.resolve(state.projectRoot, (config as any).main);
      }
      
      // Fallback: check for mush.json (legacy)
      if (!entryPoint) {
           const mushJsonPath = path.join(state.projectRoot, 'mush.json');
           if (fs.existsSync(mushJsonPath)) {
               try {
                   const configJson = JSON.parse(fs.readFileSync(mushJsonPath, 'utf8'));
                   if (configJson.main) {
                       entryPoint = path.resolve(state.projectRoot, configJson.main);
                   }
               } catch (e) {
                   console.warn("Failed to parse mush.json");
               }
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

  // Final Fallback: first source file
  if (!entryPoint && sourceFiles.length > 0) {
    entryPoint = sourceFiles[0];
  }

  log.highlight(`Entry Point: ${fmt.file(path.basename(entryPoint!))} ${fmt.dim('(' + entryPoint + ')')}`);

  // Load .env.local if it exists
  const envPath = path.join(state.projectRoot, '.env.local');
  if (fs.existsSync(envPath)) {
    log.detail('Found .env.local, loading environment variables.');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        if (key) {
          process.env[key.trim()] = value;
        }
      }
    });
  }

  return {
    files: sourceFiles,
    entryPoint: entryPoint!,
    iterationCount: 1,
    config: config
  };
}
