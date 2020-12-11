#!/usr/bin/env node

const { program } = require("commander");

program
  .version("1.1.0")
  .description("A MUSHcode pre-processor.")
  .command("run <path>||<project>", "run a Project or file.")
  .alias("r")
  .command("github <user>/<repo>", "Run a github repo.")
  .alias("git")
  .command("init <project>", "Initialize a new MUSHCode project.")
  .alias("i")
  .command("purge <file>", "Purge your system of code deltas from diff files.")
  .alias("p");

program.parse(process.argv);
