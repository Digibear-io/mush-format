#!/usr/bin/env node

const { program } = require("commander");
const { mkdirSync, existsSync, writeFileSync } = require("fs");
const inquirer = require("inquirer");
const { resolve, join } = require("path");

program.option("-y --yes", "Quick install with base settings.");

program.parse(process.argv);

const yaml = (options = {}) =>
  `
Project: ${options.project.replace(/\s/g, "-") || "project"}
author: ${options.author || '" "'}
main: ${options.main || "index.mush"}
repo: ${options.repo ? options.repo : '" "'}
Description: ${options.desc ? options.desc : '" "'}
include: 
  - /src/**/*
`.trim();

const header =
  "@@ To format this project, visit:  https://github.com/digibear-io/mush-format\n\n".trim();

if (program.yes) {
  const path = resolve(program.args[0]).toLowerCase();
  // Create the project folder if it doesn't exist.
  if (!existsSync(path))
    try {
      mkdirSync(path, { recursive: true });
      mkdirSync(path, { recursive: true });
      writeFileSync(path + "/formatter.yml", yaml());
      writeFileSync(path + "/.gitignore", ".tmp");
      writeFileSync(path + "/index.mush", header);
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
        type: "input",
        name: "desc",
        message: "Project Description?",
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
        const path = resolve(join(answers.path, answers.project)).toLowerCase();
        mkdirSync(path, { recursive: true });
        writeFileSync(path + "/formatter.yml", yaml(answers));
        writeFileSync(path + "/index.mush", header);
        writeFileSync(path + "/.gitignore", ".tmp");
        console.log("[MFORM] Project created.");
      } catch (error) {
        console.log("[MFORM] Error Creating project: ", error.message);
      }
    });
}
