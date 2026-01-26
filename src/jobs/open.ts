import { readFile } from "fs/promises";
import { existsSync } from "fs";
import _fetch from "isomorphic-fetch";
import { dirname, join, isAbsolute } from "path";
import validURL from "valid-url";

import { Context, Next, Line } from "../formatter";

export default async (ctx: Context, next: Next) => {
  const visited = new Set<string>();

  const loadFile = async (
    filePath: string,
    visitedFiles: Set<string> = visited
  ): Promise<Line[]> => {
    
    if (validURL.isUri(filePath)) {
      if (visitedFiles.has(filePath)) {
        throw new Error(`Circular dependency detected: ${filePath}`);
      }
      visitedFiles.add(filePath);

      const response = await _fetch(filePath);
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
      ctx.scratch.base = dirname(fullPath);
      const text = await readFile(fullPath, "utf8");
      return await scan(text, fullPath, visitedFiles);
    } else {
      // Treat as raw text content if not found as file
      // If filePath was passed as the initial input, it might be raw MUSH code.
      // We'll use a placeholder name if it's huge, or ctx.path if set.
      const origin = ctx.filename ?? ctx.path ?? "cwd/input.mu"; 
      return await scan(filePath, origin, visitedFiles);
    }
  };

  async function scan(text: string, currentFile: string, visitedFiles: Set<string>): Promise<Line[]> {
    const rawLines = text.split("\n");
    let output: Line[] = [];

    for (let i = 0; i < rawLines.length; i++) {
        const lineText = rawLines[i];
        
        // Handle #file
        const fileMatch = lineText.match(/#file\s+?(.*)/i);
        if (fileMatch) {
            const nestedPath = fileMatch[1];
             // The original behavior was scanning the file content and wrapping in @@ and -
             // We need to resolve nestedPath. 
             // Logic in generic loadFile attempts resolution.
             
             // Temporarily set base for nested load? 
             // loadFile updates ctx.scratch.base.
             // We should maybe save/restore base? 
             const oldBase = ctx.scratch.base;
             
             try {
                const loadedLines = await loadFile(nestedPath, visitedFiles);
                
                output.push({ text: "-", file: currentFile, line: i + 1 });
                loadedLines.forEach(l => {
                    output.push({ text: `@@ ${l.text}`, file: l.file, line: l.line });
                });
                output.push({ text: "-", file: currentFile, line: i + 1 });
                
             } finally {
                 if (oldBase) ctx.scratch.base = oldBase;
             }
             continue;
        }

        // Handle #include
        const includeMatch = lineText.match(/#include\s+(.*)/i);
        if (includeMatch) {
            const includedFile = includeMatch[1];
            // Resolve path relative to currentFile if it's a file
            // But loadFile relies on ctx.scratch.base. 
            // We should ensure ctx.scratch.base is correct for the currentFile.
            // If currentFile is a URL, base should be URL dir.
            // If local, dirname.
            
            const oldBase = ctx.scratch.base;
            try {
                // Determine base for this include
                let includeBase = ctx.scratch.base;
                if (validURL.isUri(currentFile)) {
                    includeBase = dirname(currentFile);
                } else if (isAbsolute(currentFile)) {
                    includeBase = dirname(currentFile);
                }
                
                // We set/override ctx.scratch.base so loadFile uses it for resolution
                if (includeBase) ctx.scratch.base = includeBase;

                const loadedLines = await loadFile(includedFile, visitedFiles);
                output.push(...loadedLines);
            } finally {
                 if (oldBase) ctx.scratch.base = oldBase;
            }
            continue;
        }

        output.push({
            text: lineText,
            file: currentFile,
            line: i + 1
        });
    }

    return output;
  }

  // Initial load
  ctx.scratch.current = await loadFile(ctx.input);
  
  if (ctx.scratch.current) {
    // Flatten lines to string for backward compat cache/combined? 
    // ctx.combined is supposed to be string.
    ctx.combined = ctx.scratch.current.map(l => l.text).join('\n');
    ctx.scratch.data = ctx.combined; // Original logic
  }
  
  next();
};
