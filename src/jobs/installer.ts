import { Context } from "../formatter";
import * as fs from 'fs';
import * as path from 'path';

export interface InstallerOptions {
  header?: string;
  footer?: string;
  banner?: string | string[]; // Added banner field
}

export const generateInstallScript = (
  commands: string[],
  options: InstallerOptions,
  context?: Context
): string => {
  const output: string[] = [];

  // Helper: Escape characters for MUSH
  const safeEmit = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '%%')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\(/g, '\\(') // paranoid
      .replace(/\)/g, '\\)'); // paranoid
  };

  // Helper: Process banner content
  const processBanner = (bannerInput?: string | string[]): string[] => {
    let lines: string[] = [];

    // Helper: Find banner recursively
    const findBannerUp = (startDir: string): string | null => {
        let currentDir = startDir;
        while (true) {
            const possiblePath = path.join(currentDir, 'banner.txt');
            if (fs.existsSync(possiblePath)) {
                return possiblePath;
            }
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                // Reached root
                return null;
            }
            currentDir = parentDir;
        }
    };

    // 1. Resolve source
    if (Array.isArray(bannerInput)) {
        lines = bannerInput;
    } else if (typeof bannerInput === 'string') {
        if (bannerInput.endsWith('.txt')) {
             try {
                // Attempt to load relative to CWD first? or absolute?
                // fs.readFileSync handles absolute, or relative to process.cwd()
                const content = fs.readFileSync(bannerInput, 'utf-8');
                lines = content.split('\n');
             } catch (e) {
                 lines = [`Error loading banner: ${bannerInput}`];
             }
        } else {
            lines = bannerInput.split('\n');
        }
    } else {
        // Default behavior: Check for banner.txt recursively starting from context path
        // If context.path is set, use its directory. Otherwise process.cwd().
        const startPath = context?.path ? path.dirname(context.path) : process.cwd();
        const bannerPath = findBannerUp(startPath);
        
        if (bannerPath) {
             const content = fs.readFileSync(bannerPath, 'utf-8');
             lines = content.split('\n');
        } else {
            // Last resort default
            lines = ["Beginning Installation..."];
        }
    }

    // 2. Generate commands
    const cmds: string[] = [];
    for (const line of lines) {
        if (line.trim().length === 0) {
            // Optimization: empty line -> %r
             cmds.push('@pemit me=%r');
        } else {
            // Check if it looks like a raw command already?
            // "Requirements: Generate a separate @pemit me=<line> command for every single line of the art."
            // The prompt implies we treat the input as ART/TEXT to be emitted.
            // But preserving "raw command" capability for advanced users is nice.
            // However, the prompt specifically asked for escaping logic for "ASCII art".
            // So we should assume it is text content to be escaped and emitted.
            
            // If the user wants to pass raw commands, they arguably shouldn't use the 'banner' field,
            // or we should have a separate 'rawBanner' field.
            // Given "ASCII art headers" prompt, I will enforce emitting logic for safety.
            cmds.push(`@pemit me=${safeEmit(line)}`);
        }
    }
    return cmds;
  };

  // Helper for substitutions
  const substitute = (text: string): string => {
    if (!context) return text;
    let result = text;
    // Replace standard metadata
    // %author -> #author
    // %version -> #version
    // %desc -> #desc / #description
    
    // We prioritize specific headers we know, or just iterate headers?
    // Let's iterate context.headers to catch all
    for (const h of context.headers) {
       // Escape special regex chars in name? header names are usually simple words.
       const regex = new RegExp(`%${h.name}`, 'gi');
       result = result.replace(regex, h.value);
    }
    
    // Also support generic %PERCENT if not handled? No, logic is %NAME
    return result;
  };

  // 1. Initial Quiet
  output.push("@set me=QUIET");

  // 2. Header
  // The prompt says: "Add a banner field to the config object."
  // options.banner is passed in.
  const bannerCmds = processBanner(options.banner);
  output.push(...bannerCmds);

  // 3. Progress Tracker & Commands
  const total = commands.length;
  // "Inject a progress message every 10% of the way through"
  // threshold = total / 10.
  const threshold = Math.max(1, Math.floor(total / 10));
  
  commands.forEach((cmd, idx) => {
    // 0 is start. idx+1 is count processed.
    // We want to check if we hit a 10% marker.
    // e.g. 100 commands. threshold 10.
    // idx 10 (11th cmd) -> 11 > 10? 
    // "every 10% of the way". 10%, 20%...
    // let's do simple modulo or check.
    
    // We inject BEFORE the command? or AFTER?
    // "Inject ... every 10%".
    // 10% means 10 commands done?
    // idx starts 0.
    if (idx > 0 && idx % threshold === 0) {
        const pct = Math.round((idx / total) * 100);
        // "Command: @pemit me=Install Progress: <PERCENT>%"
        output.push(`@pemit me=Install Progress: ${pct}%`);
    }
    
    output.push(cmd);
  });
  
  // 4. Footer
  let footerText = options.footer || "Installation Complete.";
  footerText = substitute(footerText);
  
  if (footerText) {
       const lines = footerText.split('\n');
       lines.forEach(l => {
           if (l.trim().length === 0) return;
           if (!/^[@&+]/.test(l.trim())) {
               output.push(`@pemit me=${l}`);
           } else {
               output.push(l);
           }
       });
  }

  // 5. Un-Silence
  output.push("@set me=!QUIET");

  return output.join("\n");
};
