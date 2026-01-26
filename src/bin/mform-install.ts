#!/usr/bin/env node

import { program } from "commander";
import { mkdir, readFile, writeFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface MushConfig {
  dependencies: { [key: string]: string };
}

program
  .description("Install a MUSH package from GitHub")
  .arguments("<package>")
  .action(async (pkg: string) => {
    try {
      if (!pkg.startsWith("github:")) {
        console.error("Error: Only github:user/repo syntax is currently supported.");
        process.exit(1);
      }

      const repoPath = pkg.replace("github:", "");
      const [user, repo] = repoPath.split("/");

      if (!user || !repo) {
        console.error("Error: Invalid package format. Expected github:user/repo");
        process.exit(1);
      }

      const modulesDir = resolve(process.cwd(), "mush_modules");
      const targetDir = join(modulesDir, repo);

      // 1. Ensure mush_modules exists
      if (!existsSync(modulesDir)) {
          console.log(`Creating ${modulesDir}...`);
          await mkdir(modulesDir, { recursive: true });
      }

      // 2. Clone the repository
      if (existsSync(targetDir)) {
        console.log(`Package ${repo} already exists in mush_modules. Updating...`);
        try {
            await execAsync("git pull", { cwd: targetDir });
            console.log(`Updated ${repo}.`);
        } catch (e) {
            console.error(`Failed to update ${repo}:`, e);
        }
      } else {
        console.log(`Installing ${repo} from GitHub...`);
        try {
            const gitUrl = `https://github.com/${user}/${repo}.git`;
            await execAsync(`git clone --depth 1 ${gitUrl} ${targetDir}`);
            console.log(`Installed ${repo}.`);
        } catch (e) {
            console.error(`Failed to clone ${repo}:`, e);
            process.exit(1);
        }
      }

      // 3. Update mush.json
      const configPath = resolve(process.cwd(), "mush.json");
      let config: MushConfig = { dependencies: {} };

      if (existsSync(configPath)) {
        try {
          const content = await readFile(configPath, "utf-8");
          config = JSON.parse(content);
        } catch (e) {
          console.warn("Warning: Could not parse mush.json, creating a new one.");
        }
      }

      if (!config.dependencies) {
        config.dependencies = {};
      }

      config.dependencies[repo] = pkg;

      await writeFile(configPath, JSON.stringify(config, null, 2));
      console.log(`Added ${repo} to mush.json`);

    } catch (err) {
      console.error("An error occurred:", err);
      process.exit(1);
    }
  });

program.parse(process.argv);
