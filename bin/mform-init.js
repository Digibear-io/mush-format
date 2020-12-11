#!/usr/bin/env node

const { program } = require("commander");
const { mkdirSync, existsSync, writeFileSync } = require("fs");
const inquirer = require("inquirer");

program.option("-y --yes", "Quick install with base settings.");

program.parse(process.argv);

const yaml = (options = {}) =>
  `
Project: ${options.project.replace(/\s/g, "-") || "project"}
author: ${options.author || '" "'}
main: ${options.main || "index.mush"}
repo: ${options.repo ? options.repo : '" "'}
`.trim();

const header = "@@ To compile this project, visit:  https://github.com/digibear-io/mush-format\n\n".trim();

if (program.yes) {
  // Create the project folder if it doesn't exist.
  if (!existsSync(program.args[0]))
    try {
      mkdirSync(program.args[0], { recursive: true });
      writeFileSync(program.args[0] + "/formatter.yml", yaml());
      writeFileSync(program.args[0] + "/index.mush", header);
      console.log("[MFORM] Project created with default values.");
    } catch (error) {
      console.log("[MFORM] Error Creating project: ", error.message);
    }
} else {
  inquirer
    .prompt([
      {
        type: "input",
        name: "project",
        message: "Project Name?",
        default: program.args[0],
        transformer: (input) => input.replace(/\s/g, "-").toLowerCase(),
      },
      {
        type: "input",
        name: "author",
        message: "Author?",
        default: "N/A",
      },
      {
        name: "input",
        name: "path",
        message: "Project Path?",
        default: ".",
      },
      {
        type: "input",
        name: "main",
        message: "Project entry point?",
        default: "index.mush",
      },
      {
        type: "input",
        name: "repo",
        message: "GitHub repo?",
        default: "N/A",
      },
    ])
    .then((answers) => {
      try {
        mkdirSync(answers.path, { recursive: true });
        writeFileSync(answers.path + "/formatter.yml", yaml(answers));
        writeFileSync(answers.path + "/index.mush", header);
        console.log("[MFORM] Project created with default values.");
      } catch (error) {
        console.log("[MFORM] Error Creating project: ", error.message);
      }
    });
}
