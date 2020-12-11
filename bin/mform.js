#!/usr/bin/env node

const { program } = require("commander");
const {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  mkdirSync,
} = require("fs");
const { resolve, dirname } = require("path");
const { formatter } = require("../dist/formatter");
const lineDiff = require("line-diff");

program
  .version("1.1.0")
  .description("A MUSHcode pre-processor.")
  .command("run [path]", "run a Project or file.")
  .alias("r")
  .command("init [project]", "Initialize a new MUSHCode project.")
  .alias("i")
  .command("purge [file]", "Purge your system of code deltas from diff files.");

program.parse(process.argv);
