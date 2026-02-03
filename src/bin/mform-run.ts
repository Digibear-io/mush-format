#!/usr/bin/env node

import { program } from "commander";
import { stat, writeFile, readFile, mkdir } from "fs/promises";
import { resolve, dirname, join } from "path";
import { formatter } from "../formatter";
// import YAML from "yaml";
// @ts-ignore
import LineDiff from "line-diff";

program
  .description("Run the Parser on the selected file or directory.")
  .option("-o --output <file>", "The file to save the output too.")
  .option(
    "-d --diff",
    "Only print the differences from the previous output file."
  )
  .option("--agent", "Run in agentic mode using LangGraph.")
  .option("--gemini-api-key <key>", "Set the Gemini API Key and store it locally.");

program.parse(process.argv);
const args = program.args;

import * as dotenv from "dotenv";
import * as os from "os";

const GLOBAL_CONFIG_DIR = resolve(os.homedir(), ".mform");
const GLOBAL_ENV_PATH = resolve(GLOBAL_CONFIG_DIR, ".env");
const LOCAL_ENV_PATH = resolve(process.cwd(), ".env.local");

// Load local first (override), then global
dotenv.config({ path: LOCAL_ENV_PATH });
dotenv.config({ path: GLOBAL_ENV_PATH });

import { app } from "../agent/graph";

async function saveApiKey(key: string) {
  try {
    if (!fs_sync.existsSync(GLOBAL_CONFIG_DIR)) {
      await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
    }
  } catch (e) {}

  let content = "";
  try {
    content = await readFile(GLOBAL_ENV_PATH, { encoding: "utf-8" });
  } catch (e) {
    // File doesn't exist, ignore
  }

  const lines = content.split("\n").filter(line => !line.startsWith("ANTHROPIC_API_KEY="));
  lines.push(`ANTHROPIC_API_KEY=${key}`);
  await writeFile(GLOBAL_ENV_PATH, lines.join("\n").trim() + "\n");
  console.log(`[MFORM]: API Key saved globally to ${GLOBAL_ENV_PATH}`);
}

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

async function handleOutput(data: string, outputList: string[], options: any, inputLabel: string) {
    if (options.output) {
      await writeFile(options.output, options.diff ? outputList.join("\n") : data);
      console.log(`[MFORM]: Formatted: ${inputLabel} >> ${options.output}`);
    } else {
      console.log(options.diff ? outputList.join("\n") : data);
      if (options.diff)
        console.log(
          `think [MFORM]: %ch${
            data.split("\n").length
          }%cn lines generated, %ch${outputList.length}%cn lines quoted.`
        );
    }
}

async function parseFile() {
  const path = resolve(`${dirname(args[0])}`);
  const fileName = args[0].split("/").pop();
  if (!fileName) return; // Should not happen if args[0] exists
  
  const DIFF_PATH = resolve(`${join(path, ".tmp", fileName)}`);

  await ensureDirectoryExistence(DIFF_PATH);
  const diffIn = await tmp(DIFF_PATH);
  const file = await readFile(resolve(args[0]), { encoding: "utf-8" });

  const { data } = await formatter.format(file, dirname(args[0]), fileName);
    let output: string[] = [];
    await writeFile(DIFF_PATH, data);

    const options = program.opts();

    if (options.diff) {
      const diff = new LineDiff(diffIn, data);
      const tempOutput = data.split("\n");
      diff.changes.forEach((change: any) => {
        if (change.changes) {
          output.push(tempOutput[change.lineno - 1]);
        }
      });
    }

    await handleOutput(data, output, options, args[0]);
}

async function parseDir() {
  const conf = await readFile(join(args[0], "mush.json"), {
    encoding: "utf-8",
  });
  const settings = JSON.parse(conf);
  const fileName = settings.main ? settings.main : "./index.mush";

  const path = resolve(join(args[0], fileName));
  const DIFF_PATH = resolve(join(args[0], "/.tmp", fileName));
  const file = await readFile(path, { encoding: "utf-8" });

  await ensureDirectoryExistence(DIFF_PATH);
  const diffIn = await tmp(DIFF_PATH);

  const { data } = await formatter.format(file, args[0]);
    let output: string[] = [];
    await writeFile(DIFF_PATH, data);

    const options = program.opts();

    if (options.diff) {
      const diff = new LineDiff(diffIn, data);
      const tempOutput = data.split("\n");
      diff.changes.forEach((change: any) => {
        if (change.changes) {
          output.push(tempOutput[change.lineno - 1]);
        }
      });
    }

    await handleOutput(data, output, options, args[0]);
}

import * as fs_sync from "fs";

(async () => {
    try {
        const options = program.opts();

        if (options.geminiApiKey) {
          await saveApiKey(options.geminiApiKey);
          // Reload global env
          dotenv.config({ path: GLOBAL_ENV_PATH, override: true });
        }

        if (!args[0]) {
          if (options.geminiApiKey) return;
          throw new Error("No input file");
        }

        if (options.agent) {
          console.log("[MFORM]: Running in Agentic Mode...");
          const projectRoot = resolve(args[0]);
          const result = await app.invoke({ projectRoot });
          const data = result.formattedLines.map((line: any) => line.text).join("\n");
          await handleOutput(data, [], options, args[0]);
          console.log("[MFORM]: Agentic Flow Complete.");
          console.log(`Verification Status: ${result.verificationStatus}`);
          return;
        }

        const dirent = await stat(resolve(args[0]));
        if (dirent.isFile()) {
            await parseFile();
        } else if (dirent.isDirectory()) {
            await parseDir();
        }
    } catch (e) {
        if (args[0]) {
             const { data } = await formatter.format(args[0]);
             console.log(data);
        }
    }
})();
