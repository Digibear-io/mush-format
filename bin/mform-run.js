#!/usr/bin/env node

const { program } = require("commander");
const {
  statSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdirSync,
} = require("fs");
const { resolve, dirname, join } = require("path");
const { formatter } = require("../dist/formatter");
const lineDiff = require("line-diff");
const yml = require("yaml");

program
  .description("Run the Parser on the selected file or directory.")
  .option("-o --output <file>", "The file to save the output too.")
  .option(
    "-d --diff",
    "Only print the differences from the previous output file."
  );

program.parse(process.argv);
const args = program.args;

/**
 * Ensure that the directory structure we need to save a file actually exists.
 * @param {string} filePath
 */
function ensureDirectoryExistence(filePath) {
  var name = dirname(filePath);
  if (existsSync(name)) {
    return true;
  }
  ensureDirectoryExistence(name);
  mkdirSync(name, { recursive: true });
}

/**
 * Open a temp file.
 * @param {string} filepath
 */
function tmp(filepath) {
  try {
    return readFileSync(filepath, { encoding: "utf-8" });
  } catch {
    return "";
  }
}

/**
 * Parse a file.
 */
function parseFile() {
  const path = resolve(`${dirname(args[0])}`);
  const DIFF_PATH = resolve(`${join(path, ".tmp", args[0].split("/").pop())}`);

  // If there's a diff file alreeady, use it.
  ensureDirectoryExistence(DIFF_PATH);
  const diffIn = tmp(DIFF_PATH);
  const file = readFileSync(resolve(args[0]), { encoding: "utf-8" });

  // Format the file fed to the CLI.
  formatter.format(file, dirname(args[0])).then(({ data }) => {
    let output = [];
    // Update the diff file for the file just ran.
    writeFileSync(DIFF_PATH, data);

    // If we're running in diff mode, get the deltas.
    if (program.diff) {
      const diff = new lineDiff(diffIn, data);
      const tempOutput = data.split("\n");
      diff.changes.forEach((change) => {
        if (change.changes) {
          output.push(tempOutput[change.lineno - 1]);
        }
      });
    }

    if (program.output) {
      writeFileSync(program.output, program.diff ? output : data);
      console.log(`[MFORM]: Formatted: ${program.input} >> ${program.output}`);
    } else {
      // If no out file is created, quote directly to stdOut for programs like
      // Tinyfugure to pickup on.
      console.log(program.diff ? output.join("\n") : data);
      if (program.diff)
        console.log(
          `think [MFORM]: %ch${
            data.split("\n").length
          }%cn lines generated, %ch${output.length}%cn lines quoted.`
        );
    }
  });
}

/**
 * Read from a directory structure, looking for a formatter.yml file first, before
 * looking in the root directory for an index.mush if the previous doesn't exist.
 */
function parseDir() {
  const conf = readFileSync(join(args[0], "formatter.yml"), {
    encoding: "utf-8",
  });
  const settings = yml.parse(conf);
  const fileName = settings.main ? settings.main : "./index.mush";

  const path = resolve(join(args[0], fileName));
  const DIFF_PATH = resolve(join(args[0], "/.tmp", fileName));
  const file = readFileSync(path, { encoding: "utf-8" });

  // See if the temp file exists.
  ensureDirectoryExistence(DIFF_PATH);
  const diffIn = tmp(DIFF_PATH);

  formatter.format(file, args[0]).then(({ data }) => {
    let output = [];
    // Update the diff file for the file just ran.
    writeFileSync(DIFF_PATH, data);

    // If we're running in diff mode, get the deltas.
    if (program.diff) {
      const diff = new lineDiff(diffIn, data);
      const tempOutput = data.split("\n");
      diff.changes.forEach((change) => {
        if (change.changes) {
          output.push(tempOutput[change.lineno - 1]);
        }
      });
    }

    // If we're writing to a file, do that now, else print to stdOut.
    if (program.output) {
      writeFileSync(program.output, program.diff ? output : data);
      console.log(`[MFORM]: Formatted: ${program.input} >> ${program.output}`);
    } else {
      // If no out file is created, quote directly to stdOut for programs like
      // Tinyfugure to pickup on.
      console.log(program.diff ? output.join("\n") : data);
      if (program.diff)
        console.log(
          `think [MFORM]: %ch${
            data.split("\n").length
          }%cn lines generated, %ch${output.length}%cn lines quoted.`
        );
    }
  });
}

// Get info on the file or directory.
try {
  const dirent = statSync(resolve(args[0]));
  switch (true) {
    case dirent.isFile():
      parseFile();
      break;
    case dirent.isDirectory():
      parseDir();
      break;
  }
} catch {
  formatter.format(args[0]).then(({ data }) => console.log(data));
}
