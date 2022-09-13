#!/usr/bin/env node

const { program } = require("commander");
const { mkdirSync, existsSync, writeFileSync } = require("fs");
const inquirer = require("inquirer");
const { resolve, join } = require("path");

program.option("-y --yes", "Quick install with base settings.");

program.parse(process.argv);

const project = (options = {}) => {
  const { project, main, author, repo, desc } = options;

  return {
    project,
    author,
    main,
    repo,
    desc,
  };
};

console.log(`
 __   __  __   __  _______  __   __                    
|  |_|  ||  | |  ||       ||  | |  |                   
|       ||  | |  ||  _____||  |_|  |                   
|       ||  |_|  || |_____ |       |                   
|       ||       ||_____  ||       |                   
| ||_|| ||       | _____| ||   _   |                   
|_|   |_||_______||_______||__| |__|                   
 _______  _______  ______    __   __  _______  _______ 
|       ||       ||    _ |  |  |_|  ||   _   ||       |
|    ___||   _   ||   | ||  |       ||  |_|  ||_     _|
|   |___ |  | |  ||   |_||_ |       ||       |  |   |  
|    ___||  |_|  ||    __  ||       ||       |  |   |  
|   |    |       ||   |  | || ||_|| ||   _   |  |   |  
|___|    |_______||___|  |_||_|   |_||__| |__|  |___|
`);

if (program.yes) {
  const path = resolve(program.args[0]).toLowerCase();
  // Create the project folder if it doesn't exist.
  if (!existsSync(path))
    try {
      mkdirSync(path, { recursive: true });
      mkdirSync(path, { recursive: true });
      writeFileSync(
        path + "/formatter.json",
        project(JSON.stringify(program()))
      );
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
        default: "",
      },
      {
        type: "input",
        name: "desc",
        message: "Project Description?",
        default: "",
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
        default: "index.mu",
      },
      {
        type: "input",
        name: "repo",
        message: "GitHub repo?",
        default: "",
      },
    ])
    .then((answers) => {
      try {
        const path = resolve(join(answers.path, answers.project)).toLowerCase();
        mkdirSync(path, { recursive: true });
        writeFileSync(
          path + "/formatter.json",
          JSON.stringify(project(answers))
        );
        writeFileSync(path + "/index.mu", header);
        writeFileSync(path + "/.gitignore", ".tmp");
        console.log("[MFORM] Project created.");
      } catch (error) {
        console.log("[MFORM] Error Creating project: ", error.message);
      }
    });
}
