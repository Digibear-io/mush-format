#!/usr/bin/env node

import { program } from "commander";
import { stat, writeFile, readFile, mkdir } from "fs/promises";
import { resolve, dirname, join } from "path";
import { formatter } from "../formatter";
import YAML from "yaml";
// @ts-ignore
import LineDiff from "line-diff";

program
  .description("Run the Parser on the selected file or directory.")
  .option("-o --output <file>", "The file to save the output too.")
  .option(
    "-d --diff",
    "Only print the differences from the previous output file."
  );

program.parse(process.argv);
const args = program.args;

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
  const conf = await readFile(join(args[0], "formatter.yml"), {
    encoding: "utf-8",
  });
  const settings = YAML.parse(conf);
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

(async () => {
    try {
        if (!args[0]) throw new Error("No input file");
        const dirent = await stat(resolve(args[0]));
        if (dirent.isFile()) {
            await parseFile();
        } else if (dirent.isDirectory()) {
            await parseDir();
        }
    } catch {
        if (args[0]) {
             const { data } = await formatter.format(args[0]);
             console.log(data);
        }
    }
})();
