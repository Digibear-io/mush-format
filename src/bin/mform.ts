#!/usr/bin/env node

import { program } from "commander";
import { stat, writeFile, readFile, mkdir } from "fs/promises";
import { watch } from "fs";
import { resolve, dirname, join } from "path";
import { formatter } from "../formatter";
import * as dotenv from "dotenv";
import * as os from "os";
// import YAML from "yaml";
// @ts-ignore
import LineDiff from "line-diff";
import { loadConfig } from "../config";
import { log, fmt, brand } from "../utils/colors";

const conf = require("../../package.json");

// Global config paths
const GLOBAL_CONFIG_DIR = resolve(os.homedir(), ".mform");
const GLOBAL_ENV_PATH = resolve(GLOBAL_CONFIG_DIR, ".env");

// Load environment variables - .env.local takes precedence
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: GLOBAL_ENV_PATH }); // Load global .env

/**
 * Save API key to global .env file
 */
async function saveApiKey(key: string) {
  const fs_sync = require("fs");

  try {
    if (!fs_sync.existsSync(GLOBAL_CONFIG_DIR)) {
      await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
    }
  } catch (e) { }

  let content = "";
  try {
    content = await readFile(GLOBAL_ENV_PATH, { encoding: "utf-8" });
  } catch (e) {
    // File doesn't exist, ignore
  }

  const lines = content.split("\n").filter(line => !line.startsWith("GOOGLE_API_KEY="));
  lines.push(`GOOGLE_API_KEY=${key}`);
  await writeFile(GLOBAL_ENV_PATH, lines.join("\n").trim() + "\n");
  log.success(`API Key saved globally to ${fmt.path(GLOBAL_ENV_PATH)}`);
}

program
  .version(conf.version)
  .description("A MUSHcode pre-processor.");

// --- Helper Functions (Migrated from mform-run.ts) ---

async function ensureDirectoryExistence(filePath: string) {
  const name = dirname(filePath);
  try {
    const stats = await stat(name);
    return true;
  } catch {
    await mkdir(name, { recursive: true });
  }
}

async function tmp(filepath: string) {
  try {
    return await readFile(filepath, { encoding: "utf-8" });
  } catch {
    return "";
  }
}

async function handleOutput(
  data: string,
  outputList: string[],
  options: any,
  inputLabel: string
) {
  if (options.output) {
    await writeFile(
      options.output,
      options.diff ? outputList.join("\n") : data
    );
    log.success(`Formatted ${fmt.file(inputLabel)} → ${fmt.path(options.output)}`);
  } else {
    console.log(options.diff ? outputList.join("\n") : data);
    if (options.diff)
      log.info(
        `${fmt.number(data.split("\n").length)} lines generated, ${fmt.number(outputList.length)} lines quoted`
      );
  }
}

async function parseFile(inputPath: string, options: any) {
  const path = resolve(`${dirname(inputPath)}`);
  const fileName = inputPath.split("/").pop();
  if (!fileName) return;

  const DIFF_PATH = resolve(`${join(path, ".tmp", fileName)}`);

  await ensureDirectoryExistence(DIFF_PATH);
  const diffIn = await tmp(DIFF_PATH);
  const file = await readFile(resolve(inputPath), { encoding: "utf-8" });

  const { data } = await formatter.format(file, dirname(inputPath), fileName, { installer: options.installScript });
  let output: string[] = [];
  await writeFile(DIFF_PATH, data);

  if (options.diff) {
    const diff = new LineDiff(diffIn, data);
    const tempOutput = data.split("\n");
    diff.changes.forEach((change: any) => {
      if (change.changes) {
        output.push(tempOutput[change.lineno - 1]);
      }
    });
  }

  await handleOutput(data, output, options, inputPath);
}

async function parseDir(inputPath: string, options: any) {
  /* const confPath = join(inputPath, "formatter.yml"); */
  const confPath = join(inputPath, "mush.json");
  let settings: any = {};

  try {
    const conf = await readFile(confPath, { encoding: "utf-8" });
    settings = JSON.parse(conf);
  } catch (e) {
    // Fallback or error if necessary, but original code assumed existence or failed?
    // Original code: await readFile(...) without try/catch would fail if missing.
    // But typically parseDir is called when it IS a directory, 
    // maybe we should assume formatter.yml exists or handle it.
    // Keeping closer to original behavior but we'll see.
    // If original crashed on missing formatter.yml, we will too.
  }

  if (Object.keys(settings).length === 0) {
    // Try to read it again without try/catch to throw error if needed
    // or just assume default
    const conf = await readFile(confPath, { encoding: "utf-8" });
    settings = JSON.parse(conf);
  }

  const fileName = settings.main ? settings.main : "./index.mush";

  const path = resolve(join(inputPath, fileName));
  const DIFF_PATH = resolve(join(inputPath, "/.tmp", fileName));
  const file = await readFile(path, { encoding: "utf-8" });

  await ensureDirectoryExistence(DIFF_PATH);
  const diffIn = await tmp(DIFF_PATH);

  const { data } = await formatter.format(file, inputPath, undefined, { installer: options.installScript });
  let output: string[] = [];
  await writeFile(DIFF_PATH, data);

  if (options.diff) {
    const diff = new LineDiff(diffIn, data);
    const tempOutput = data.split("\n");
    diff.changes.forEach((change: any) => {
      if (change.changes) {
        output.push(tempOutput[change.lineno - 1]);
      }
    });
  }

  await handleOutput(data, output, options, inputPath);
}

async function executeRun(inputPath: string, options: any) {
  try {
    if (!inputPath) throw new Error("No input file");
    const resolvedPath = resolve(inputPath);
    const dirent = await stat(resolvedPath);
    if (dirent.isFile()) {
      await parseFile(inputPath, options);
    } else if (dirent.isDirectory()) {
      await parseDir(inputPath, options);
    }
  } catch (err) {
    if (inputPath) {
      try {
        // Fallback attempt: maybe it's raw text? But original code:
        // if (args[0]) { const { data } = await formatter.format(args[0]); console.log(data); }
        // This seems to imply treating string as content? Or path?
        // The original code passed args[0] (path) to format() as first arg 'text'.
        // format(text, path, filename).
        // If checking stat failed, maybe it doesn't exist?
        // But original catch block is:
        // catch { if (args[0]) { const { data } = await formatter.format(args[0]); console.log(data); } }
        // If args[0] is a path that doesn't exist, stat throws.
        // Then it tries to format 'args[0]' as a string content?
        // That seems to be the fallback logic. 
        const { data } = await formatter.format(inputPath, "", undefined, { installer: options.installScript });
        console.log(data);
      } catch (e) {
        console.error(err);
      }
    } else {
      console.error(err);
    }
  }
}

// --- Command Definition ---

program
  .command("run <path>")
  .description("run a Project or file in agentic mode (auto-analyze, parse, lint, heal).")
  .option("-o --output <file>", "The file to save the output too.")
  .option(
    "-d --diff",
    "Only print the differences from the previous output file."
  )
  .option("-i --install-script", "Compile output as an Installer Script")
  .option("-w --watch", "Watch mode")
  .option("--no-agent", "Disable agentic mode and use classic formatter")
  .option("--google-api-key <key>", "Google API key for LLM healing (alternative to .env.local)")
  .action(async (path, options) => {
    // Save API key globally if provided via flag
    if (options.googleApiKey) {
      await saveApiKey(options.googleApiKey);
      // Reload global env to pick up the saved key
      dotenv.config({ path: GLOBAL_ENV_PATH, override: true });
      process.env.GOOGLE_API_KEY = options.googleApiKey;
    }

    // Load configuration
    const loaded = await loadConfig(undefined, resolve(path));
    const config = loaded?.config;

    // Use agentic mode by default unless explicitly disabled
    if (options.agent !== false) {
      log.section('AGENTIC MODE ACTIVATED');

      // Check for API key upfront
      if (!process.env.GOOGLE_API_KEY) {
        console.log('');
        log.warning('GOOGLE_API_KEY not set!');
        log.detail('Complex errors will be detected but NOT auto-healed.');
        log.detail('To enable LLM-powered healing, either:');
        log.detail('  1. Create .env.local: GOOGLE_API_KEY=your_key');
        log.detail('  2. Use flag: --google-api-key=your_key');
        console.log('');
      }

      const { app } = await import("../agent/graph");
      const projectRoot = resolve(path);

      // Invoke graph with initial state, analyzer will pick up the config
      const result = await app.invoke({
        projectRoot,
        config: config // Pass pre-loaded config to state
      });
      log.section('AGENTIC FLOW COMPLETE');
      log.info(`Verification Status: ${result.verificationStatus === 'passed' ? fmt.status.passed() : result.verificationStatus === 'failed' ? fmt.status.failed() : fmt.status.pending()}`);

      // Output the healed/formatted code
      if (result.formattedLines && result.formattedLines.length > 0) {
        const output = result.formattedLines.map((l: any) => l.text).join('\n');

        if (options.output) {
          const MAX_FILE_SIZE = 500 * 1024; // 500KB in bytes
          const outputBuffer = Buffer.from(output, 'utf8');

          if (outputBuffer.length > MAX_FILE_SIZE) {
            // Split into multiple files
            const lines = result.formattedLines;
            const chunks: string[] = [];
            let currentChunk: string[] = [];
            let currentSize = 0;

            for (const line of lines) {
              const lineText = line.text + '\n';
              const lineSize = Buffer.byteLength(lineText, 'utf8');

              if (currentSize + lineSize > MAX_FILE_SIZE && currentChunk.length > 0) {
                // Save current chunk and start new one
                chunks.push(currentChunk.join('\n'));
                currentChunk = [line.text];
                currentSize = lineSize;
              } else {
                currentChunk.push(line.text);
                currentSize += lineSize;
              }
            }

            // Add final chunk
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.join('\n'));
            }

            // Write multiple files
            const basePath = options.output.replace(/\.(txt|mu|mush)$/i, '');
            const extension = options.output.match(/\.(txt|mu|mush)$/i)?.[0] || '.txt';

            for (let i = 0; i < chunks.length; i++) {
              const filename = `${basePath}-part${i + 1}${extension}`;
              await writeFile(filename, chunks[i]);
              log.success(`Part ${i + 1}/${chunks.length} saved to ${fmt.path(filename)} ${fmt.dim(`(${Math.round(Buffer.byteLength(chunks[i]) / 1024)}KB)`)}`);
            }

            log.info(`Output split into ${fmt.number(chunks.length)} files due to size (${fmt.number(Math.round(outputBuffer.length / 1024))}KB total)`);

          } else {
            // Single file output
            await writeFile(options.output, output);
            log.success(`Output saved to ${fmt.path(options.output)} ${fmt.dim(`(${Math.round(outputBuffer.length / 1024)}KB)`)}`);
          }
        } else {
          log.subsection('Formatted Output');
          console.log(output);
          log.subsection('End Output');
          log.info(`Tip: Use ${fmt.command('-o <file>')} to save output to a file`);
        }
      }

      return;
    }

    // Classic mode (only if --no-agent is specified)
    await executeRun(path, options);

    if (options.watch) {
      log.info(`Watching ${fmt.path(path)} for changes...`);
      let timer: NodeJS.Timeout;

      watch(resolve(path), { recursive: true }, (eventType, filename) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          console.clear();
          log.step(`File changed: ${fmt.file(filename || 'unknown')}. Re-running...`);
          await executeRun(path, options);
        }, 100); // 100ms debounce
      });

      // Keep process alive? watch keeps event loop active.
    }
  });


program
  .command(
    "github <user>/<repo>[@branch][/<file or folder>/]",
    "Run a github repo.", { executableFile: "mform-github" }
  )
  .alias("git")
  .command("init <project>", "Initialize a new MUSHCode project.", { executableFile: "mform-init" })
  .alias("i")
  .command("install <package>", "Install a dependency from GitHub.", { executableFile: "mform-install" })
  .alias("add")
  .command("purge <file>", "Purge your system of code deltas from diff files.", { executableFile: "mform-purge" })
  .alias("p");

program.parse(process.argv);
