#!/usr/bin/env node

import { program } from "commander";
import { mkdir, writeFile } from "fs/promises";
const inquirer = require("inquirer");
import { resolve, join } from "path";

program.option("-y --yes", "Quick install with base settings.");

program.parse(process.argv);

const header = "@@ Title: New Project";

const project = (options: any = {}) => {
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

(async () => {
  const options = program.opts();
  if (options.yes) {
    const path = resolve(program.args[0]).toLowerCase();
    // Create the project folder if it doesn't exist.
    try {
      await mkdir(path, { recursive: true });

      await writeFile(
        path + "/formatter.json",
        JSON.stringify(project({ ...options, project: program.args[0] }))
      );
      await writeFile(path + "/.gitignore", ".tmp");
      await writeFile(path + "/index.mush", header);
      console.log("[MFORM] Project created with default values.");
    } catch (error: any) {
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
          transformer: (input: string) => input.replace(/\s/g, "-").toLowerCase(),
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
      .then(async (answers: any) => {
        try {
          const path = resolve(join(answers.path, answers.project)).toLowerCase();
          await mkdir(path, { recursive: true });
          await writeFile(
            path + "/formatter.json",
            JSON.stringify(project(answers))
          );
          await writeFile(path + "/index.mu", header);
          await writeFile(path + "/.gitignore", ".tmp");
          console.log("[MFORM] Project created.");
        } catch (error: any) {
          console.log("[MFORM] Error Creating project: ", error.message);
        }
      });
  }
})();
