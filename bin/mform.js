#!/usr/bin/env node

const { program } = require("commander");
const { readFileSync, writeFileSync } = require("fs");
const { formatter } = require("../dist/formatter");

program
  .version("1.0.0")
  .option("-i --input <file>", "The input file to format.")
  .option("-o --output <file>", "The file to save the output too.");

program.parse(process.argv);

try {
  const file = readFileSync(program.input, { encoding: "utf-8" });
  formatter.format(file).then((data) => {
    if (program.output) {
      writeFileSync(program.output, data);
      console.log(`[MFORM]: Formatted: ${program.input} >> ${program.output}`);
    } else {
      console.log(data);
    }
  });
} catch (error) {
  console.log(`[MFORM]: Unable to process file: ${error.message}`);
}
