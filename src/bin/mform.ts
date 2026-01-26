#!/usr/bin/env node

import { program } from "commander";
import { stat, writeFile, readFile, mkdir } from "fs/promises";
import { watch } from "fs";
import { resolve, dirname, join } from "path";
import { formatter } from "../formatter";
// import YAML from "yaml";
// @ts-ignore
import LineDiff from "line-diff";

const conf = require("../../package.json");

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
    console.log(`[MFORM]: Formatted: ${inputLabel} >> ${options.output}`);
  } else {
    console.log(options.diff ? outputList.join("\n") : data);
    if (options.diff)
      console.log(
        `think [MFORM]: %ch${data.split("\n").length
        }%cn lines generated, %ch${outputList.length}%cn lines quoted.`
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
  .description("run a Project or file.")
  .option("-o --output <file>", "The file to save the output too.")
  .option(
    "-d --diff",
    "Only print the differences from the previous output file."
  )
  .option("-i --install-script", "Compile output as an Installer Script")
  .option("-w --watch", "Watch mode") // Added watch flag
  .action(async (path, options) => {
    // Initial Run
    await executeRun(path, options);

    if (options.watch) {
      console.log(`[MFORM]: Watching ${path} for changes...`);
      let timer: NodeJS.Timeout;
      
      watch(resolve(path), { recursive: true }, (eventType, filename) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
             console.clear();
             console.log(`[MFORM]: File changed: ${filename}. Re-running...`);
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
