import { MushFlavor, Line } from './formatter.js';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

/**
 * mush-format configuration options.
 * These map directly to the mform formatter options.
 */
export interface MFormConfig {
  /**
   * Enable debug mode - includes #debug blocks in output.
   */
  debug?: boolean | undefined;

  /**
   * Wrap output in an installer script with success/failure reporting.
   */
  installer?: boolean | undefined;

  /**
   * Banner text to include at the top of compiled output.
   * Can be a string or array of strings.
   */
  banner?: string | string[] | undefined;

  /**
   * Custom @define macros.
   * Key is the macro name/pattern, value is the replacement.
   */
  defines?: Record<string, string> | undefined;

  /**
   * Project entry point.
   */
  main?: string | undefined;
}

export interface MyceliumConfig {
  /**
   * The flavor of MUSH to use (e.g., 'tinymux', 'pennmush').
   * If a string is provided, it looks up the flavor in the registry.
   * If an object is provided, it uses that flavor definition directly.
   */
  flavor: string | MushFlavor;

  /**
   * Input glob patterns or file paths.
   */
  include?: string[] | undefined;

  /**
   * Dependencies to install.
   * Key is the package name (directory name in mycelium_modules).
   * Value is the git URL.
   */
  dependencies?: Record<string, string> | undefined;

  /**
   * Glob patterns for test files (e.g. ['tests/*.spec.ts']).
   */
  testFiles?: string[] | undefined;

  /**
   * Output directory for compiled files.
   */
  outDir?: string | undefined;

  /**
   * Output filename (default: out.txt).
   */
  outFile?: string | undefined;

  /**
   * Custom whitelists for commands and functions.
   */
  customCommands?: string[] | undefined;
  customFunctions?: string[] | undefined;
  
  /**
   * Whether to minify the output.
   */
  minify?: boolean | undefined;

  /**
   * mush-format configuration options.
   */
  mform?: MFormConfig | undefined;

  /**
   * Linter rules configuration.
   */
  linter?: {
    rules?: Record<string, 'error' | 'warning' | 'off'> | undefined;
  } | undefined;

  /**
   * Test runner configuration.
   */
  tests?: {
    /**
     * Host for the MUSH server (default: localhost).
     */
    host?: string | undefined;
    /**
     * Port for the MUSH server (default: 6250).
     */
    port?: number | undefined;
    /**
     * Admin credentials for setup/teardown.
     */
    admin?: {
        name: string;
        password: string;
    } | undefined;

    /**
     * Additional players to create/ensure exist.
     */
    players?: Array<{
        name: string;
        password: string;
        flags?: string[];
    }> | undefined;
  } | undefined;

  /**
   * Logging configuration.
   */
  logging?: {
    /**
     * Log level (default: 'info').
     */
    level?: 'info' | 'warn' | 'error' | 'none';
    /**
     * Path to log file.
     */
    file?: string;
    /**
     * Whether to log to console (default: true).
     */
    console?: boolean;
  } | undefined;
}

export interface LoadedConfig {
  config: MyceliumConfig;
  configPath: string;
}

export async function loadConfig(configPath?: string, cwd: string = process.env.INIT_CWD || process.cwd()): Promise<LoadedConfig | null> {
  const searchPaths = configPath 
    ? [configPath] 
    : ['mform.config.ts', 'mform.config.js', 'mform.config.mjs', 'mform.config.cjs'];

  let currentDir = cwd;

  // If a specific path is provided, don't search upward
  if (configPath) {
    for (const p of searchPaths) {
      const rawPath = path.resolve(currentDir, p);
      if (fs.existsSync(rawPath)) {
        const config = await importConfig(rawPath);
        return { config, configPath: rawPath };
      }
    }
    return null;
  }

  // Recursive upward search
  while (true) {
    for (const p of searchPaths) {
      const rawPath = path.resolve(currentDir, p);
      if (fs.existsSync(rawPath)) {
        const config = await importConfig(rawPath);
        return { config, configPath: rawPath };
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  return null;
}

async function importConfig(rawPath: string): Promise<MyceliumConfig> {
  try {
    // For ES modules or newer Node.js
    const fileUrl = pathToFileURL(rawPath).href;
    const imported = await import(fileUrl);
    
    // Support default export, named 'config' export, or the object itself
    const config = imported.default || imported.config || imported;
    
    return config as MyceliumConfig;
  } catch (e: any) {
    // Fallback for CommonJS if import fails in some environments
    try {
        const config = require(rawPath);
        return (config.default || config.config || config) as MyceliumConfig;
    } catch (requireError) {
        console.error(`Failed to load config from ${rawPath}:`, e);
        throw e;
    }
  }
}
