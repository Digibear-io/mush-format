#!/usr/bin/env node

const { program } = require("commander");
const {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
} = require("fs");
const { join, resolve, dirname } = require("path");
const { formatter } = require("../dist/formatter");
const lineDiff = require("line-diff");

program
  .version("1.1.0")
  .option("-i --input <file>", "The input file to format.")
  .option("-o --output <file>", "The file to save the output too.")
  .option(
    "-d --diff",
    "Only print the differences from the previous output file."
  )
  .option("-p --purge", "Purge any temp diff files.");

program.parse(process.argv);

// Get any diff file if it exists.
const DIFF_PATH = resolve(
  `${dirname(program.input)}/.tmp/${program.input.split("/").pop()}`
);
const exists = existsSync(DIFF_PATH);

// if the program is diffing, check for a temp file in the cwd.
if (program.diff) {
  try {
    if (!existsSync(resolve(`${dirname(program.input)}/.tmp`)))
      mkdirSync(resolve(`${dirname(program.input)}/.tmp`));
  } catch {
    console.log("Unable to create .tmp file in current directory.");
  }
}

const diffIn = exists ? readFileSync(DIFF_PATH, { encoding: "utf-8" }) : "";

try {
  const file = readFileSync(program.input, { encoding: "utf-8" });

  formatter.format(file).then((data) => {
    let output = [];
    if (program.diff) {
      const diff = new lineDiff(diffIn, data);
      const tempOutput = data.split("\n");
      writeFileSync(DIFF_PATH, data);
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
      console.log(program.diff ? output.join("\n") : data);
    }

    // Purge the diff file.
    if (program.purge) {
      try {
        unlinkSync(DIFF_PATH);
      } catch {}
    }
  });
} catch (error) {
  console.log(`[MFORM]: Unable to process file: ${error.message}`);
}
