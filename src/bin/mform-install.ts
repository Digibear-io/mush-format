#!/usr/bin/env node

import { program } from "commander";
import { mkdir, readFile, writeFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { log, fmt } from "../utils/colors";

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

      const modulesDir = resolve(process.cwd(), ".mform");
      const targetDir = join(modulesDir, repo);

      // 1. Ensure .mform exists
      if (!existsSync(modulesDir)) {
          log.step(`Creating ${fmt.path(modulesDir)}...`);
          await mkdir(modulesDir, { recursive: true });
      }

      // 2. Clone the repository
      if (existsSync(targetDir)) {
        log.info(`Package ${fmt.key(repo)} already exists in .mform. Updating...`);
        try {
            await execAsync("git pull", { cwd: targetDir });
            log.success(`Updated ${fmt.key(repo)}`);
        } catch (e) {
            console.error(`Failed to update ${repo}:`, e);
        }
      } else {
        log.step(`Installing ${fmt.key(repo)} from GitHub into .mform...`);
        try {
            const gitUrl = `https://github.com/${user}/${repo}.git`;
            await execAsync(`git clone --depth 1 ${gitUrl} ${targetDir}`);
            log.success(`Installed ${fmt.key(repo)}`);
        } catch (e) {
            console.error(`Failed to clone ${repo}:`, e);
            process.exit(1);
        }
      }

      // 3. Update configuration
      const searchPaths = ['mform.config.ts', 'mform.config.js', 'mform.config.mjs', 'mform.config.cjs'];
      let configPath = searchPaths.find(p => existsSync(resolve(process.cwd(), p)));
      
      if (!configPath) {
        configPath = 'mform.config.js';
        log.step(`Creating ${fmt.file('mform.config.ts')}...`);
        const defaultConfig = `module.exports = {
  dependencies: {
    "${repo}": "${pkg}"
  }
};
`;
        await writeFile(resolve(process.cwd(), configPath), defaultConfig);
        log.success(`Added ${fmt.key(repo)} to ${fmt.file('mform.config.ts')}`);
      } else {
        // Simple update logic for existing config file
        // For now, we'll try to read and inject or overwrite if it's simple.
        // A more robust solution would use a proper parser.
        const absConfigPath = resolve(process.cwd(), configPath);
        let content = await readFile(absConfigPath, 'utf8');
        
        // Basic check for dependencies object
        if (content.includes('dependencies:')) {
          // Try to inject into existing dependencies
          const depEntry = `    "${repo}": "${pkg}",\n`;
          content = content.replace(/(dependencies:\s*{)/, `$1\n${depEntry}`);
        } else {
          // Try to add dependencies object before the last closing brace
          const depBlock = `  dependencies: {\n    "${repo}": "${pkg}"\n  },\n`;
          content = content.replace(/(module\.exports\s*=\s*{|export\s*default\s*{)/, `$1\n${depBlock}`);
        }
        
        await writeFile(absConfigPath, content);
        log.success(`Updated ${fmt.key(repo)} in ${fmt.file('mform.config.ts')}`);
      }

    } catch (err) {
      console.error("An error occurred:", err);
      process.exit(1);
    }
  });

program.parse(process.argv);
