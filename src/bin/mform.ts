#!/usr/bin/env node

import { program } from "commander";
const conf = require("../../package.json");

program
  .version(conf.version)
  .description("A MUSHcode pre-processor.")
  .command("run <path>||<project>", "run a Project or file.", { executableFile: "mform-run" })
  .alias("r")
  .command(
    "github <user>/<repo>[@branch][/<file or folder>/]",
    "Run a github repo.", { executableFile: "mform-github" }
  )
  .alias("git")
  .command("init <project>", "Initialize a new MUSHCode project.", { executableFile: "mform-init" })
  .alias("i")
  .command("purge <file>", "Purge your system of code deltas from diff files.", { executableFile: "mform-purge" })
  .alias("p");

program.parse(process.argv);
