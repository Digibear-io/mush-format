import { readFile } from "fs/promises";
import { existsSync } from "fs";
import _fetch from "isomorphic-fetch";
import { join, dirname, isAbsolute, resolve } from "path";
import validURL from "valid-url";

import { Context, Next, Line } from "../formatter";
import { applyNamespace } from "../utils/namespace";

export default async (ctx: Context, next: Next) => {
  const visited = new Set<string>();

  const loadFile = async (
    filePath: string,
    visitedFiles: Set<string> = visited
  ): Promise<Line[]> => {
    
    // Check for Standard Library Import
    if (filePath.startsWith("std/")) {
        const relativePath = filePath.substring(4);
        const libPath = join(__dirname, "../stdlib", relativePath);

        if (visitedFiles.has(libPath)) {
            throw new Error(`Circular dependency detected: ${libPath}`);
        }
        
        if (existsSync(libPath)) {
            visitedFiles.add(libPath);
            ctx.scratch.base = dirname(libPath);
            const text = await readFile(libPath, "utf8");
            return await scan(text, libPath, visitedFiles);
        } else {
            throw new Error(`Standard Library file not found: ${filePath}`);
        }
    }
    
    if (filePath.startsWith("git:")) {
      const gitPath = filePath.substring(4); // Remove 'git:'
      let [repoPart, branchPart] = gitPath.split("@");
      let branch = "main";
      let p = "";

      if (branchPart) {
          const slashIdx = branchPart.indexOf("/");
          if (slashIdx !== -1) {
              branch = branchPart.substring(0, slashIdx);
              p = branchPart.substring(slashIdx); // includes leading /
          } else {
              branch = branchPart;
          }
      } else {
          // Check if repoPart has path
           const parts = repoPart.split("/");
           // user/repo/path/to/file
           if (parts.length > 2) {
               repoPart = parts.slice(0, 2).join("/");
               p = "/" + parts.slice(2).join("/");
           }
      }
      
      if (!p || p === "/") p = "/index.mush";
      
      // Encode path parts to handle spaces
      const encodedPath = p.split('/').map(part => encodeURIComponent(part)).join('/');
      
      // Reassign to https url
      filePath = `https://raw.githubusercontent.com/${repoPart}/${branch}${p.replace(/ /g, '%20')}`;
    }

    if (validURL.isUri(filePath)) {
      if (visitedFiles.has(filePath)) {
        throw new Error(`Circular dependency detected: ${filePath}`);
      }
      visitedFiles.add(filePath);

      const response = await _fetch(filePath);
      if (!response.ok) {
           throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
      }
      ctx.scratch.base = dirname(filePath);
      const text = await response.text();
      return await scan(text, filePath, visitedFiles);
    } 
    
    // Local File or Raw Text
    let fullPath = filePath;
    let isFile = false;

    // Try to resolve path if it looks like a file path
    if (!filePath.includes('\n')) {
        fullPath = isAbsolute(filePath)
            ? filePath
            : join(ctx.scratch.base ?? ctx.path ?? process.cwd(), filePath);
            
        if (existsSync(fullPath)) {
            isFile = true;
        }
    }

    if (isFile) {
      if (visitedFiles.has(fullPath)) {
        throw new Error(`Circular dependency detected: ${fullPath}`);
      }
      visitedFiles.add(fullPath);
      
      // Update context with primary file info if not already set or if it's the root call
      if (!ctx.path) ctx.path = resolve(dirname(fullPath));
      if (!ctx.filename) ctx.filename = fullPath.split("/").pop();
      
      ctx.scratch.base = dirname(fullPath);
      const text = await readFile(fullPath, "utf8");
      return await scan(text, fullPath, visitedFiles);
    } else {
      // Treat as raw text content if not found as file
      const origin = ctx.filename ?? ctx.path ?? "cwd/input.mu"; 
      return await scan(filePath, origin, visitedFiles);
    }
  };

  async function scan(text: string, currentFile: string, visitedFiles: Set<string>): Promise<Line[]> {
    const rawLines = text.split("\n");
    let outputLines: Line[] = [];

    for (let i = 0; i < rawLines.length; i++) {
        const lineText = rawLines[i];
        
        // Handle #file
        const fileMatch = lineText.match(/#file\s+?(.*)/i);
        if (fileMatch) {
            const nestedPath = fileMatch[1];
             const oldBase = ctx.scratch.base;
             
             try {
                const loadedLines = await loadFile(nestedPath, visitedFiles);
                
                outputLines.push({ text: "-", file: currentFile, line: i + 1 });
                loadedLines.forEach(l => {
                    outputLines.push({ text: `@@ ${l.text}`, file: l.file, line: l.line });
                });
                outputLines.push({ text: "-", file: currentFile, line: i + 1 });
                
             } finally {
                 ctx.scratch.base = oldBase;
             }
             continue;
        }

        // Handle #include
        const includeMatch = lineText.match(/#include\s+(.*)/i);
        if (includeMatch) {
            const includedFile = includeMatch[1];
            const oldBase = ctx.scratch.base;
            try {
                let includeBase = ctx.scratch.base;
                if (validURL.isUri(currentFile)) {
                    includeBase = dirname(currentFile);
                } else if (isAbsolute(currentFile)) {
                    includeBase = dirname(currentFile);
                }
                
                if (includeBase) ctx.scratch.base = includeBase;

                const loadedLines = await loadFile(includedFile, visitedFiles);
                outputLines.push(...loadedLines);
            } finally {
                 ctx.scratch.base = oldBase;
            }
            continue;
        }

        // Handle #import
        const importMatch = lineText.match(/#import\s+"(.*?)"\s+as\s+(\w+)/i);
        if (importMatch) {
             const importedFile = importMatch[1];
             const alias = importMatch[2];
             
             const oldBase = ctx.scratch.base;
             try {
                let includeBase = ctx.scratch.base;
                if (validURL.isUri(currentFile)) {
                    includeBase = dirname(currentFile);
                } else if (isAbsolute(currentFile)) {
                    includeBase = dirname(currentFile);
                }
                
                if (includeBase) ctx.scratch.base = includeBase;

                const loadedLines = await loadFile(importedFile, visitedFiles);
                const transformedLines = applyNamespace(loadedLines, alias);
                outputLines.push(...transformedLines);
                
             } finally {
                 ctx.scratch.base = oldBase;
             }
             continue;
        }

        // Handle Metadata
        const metaMatch = lineText.match(/^#(author|version|desc|description)\s+(.*)/i);
        if (metaMatch) {
            const name = metaMatch[1].toLowerCase();
            const value = metaMatch[2].trim();
            ctx.headers.push({ name, value });
            continue;
        }

        outputLines.push({
            text: lineText,
            file: currentFile,
            line: i + 1
        });
    }

    return outputLines;
  }

  // Initial load
  ctx.scratch.current = await loadFile(ctx.input);
  
  if (ctx.scratch.current) {
    ctx.combined = (ctx.scratch.current as Line[]).map(l => l.text).join('\n');
    ctx.scratch.data = ctx.combined; 
  }
  
  next();
};
