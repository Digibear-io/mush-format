import { Context, Next, Line } from "../formatter";
import { replaceDefines } from "../utils/replaceDefines";

export default async (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  
  const hasCommands = (ctx.scratch.current as Line[]).some(l => 
    l.text.trim() && !l.text.startsWith('/*') && !l.text.startsWith('//') && !l.text.startsWith('@@') && !l.text.startsWith('#')
  );

  // If no commands and no explicit compress request, skip and ensure ctx.output is synced
  if (!hasCommands && !ctx.compress) {
      ctx.output = (ctx.scratch.current as Line[]).map(l => l.text).join("\n");
      return next();
  }

  let lines = ctx.scratch.current as Line[];

  // 1. Strip comments (stateful Line processing)
  lines = stripComments(lines);

  // 2. Join indented lines
  lines = joinLinesLogic(lines);

  // 3. Replace defines
  lines = lines.map((l) => ({
    ...l,
    text: replaceDefines(ctx, l.text),
  }));

  // 4. Split and Process & Generate Map
  const processedLines: Line[] = [];
  const sourceMap: string[] = [];

  for (const line of lines) {
    if (!line.text.trim()) {
      processedLines.push(line);
      continue;
    }

    // Detect attribute for mapping
    const match = line.text.match(/^((?:@wait\s+\S+=)?&(\S+)\s+(\S+)=)/i);
    if (match) {
      const attr = match[2];
      const obj = match[3];
      sourceMap.push(`${obj}/${attr} -> ${line.file}:${line.line}`);
    }

    processedLines.push(...processCommand(line));
  }

  ctx.scratch.current = processedLines;
  ctx.output = processedLines.map((l) => l.text).join("\n");

  // Output Source Map
  if (sourceMap.length > 0 && ctx.debug) {
    console.log("\n--- Source Map ---");
    console.log(sourceMap.join("\n"));
    console.log("------------------\n");
  }

  next();
};

function stripComments(lines: Line[]): Line[] {
  const text = lines.map((l) => l.text).join("\n");
  let newText = "";
  let inBlockComment = false;
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < text.length; i++) {
    if (inString) {
      newText += text[i];
      if (text[i] === "\\") {
        i++;
        if (i < text.length) newText += text[i];
      } else if (text[i] === stringChar) {
        inString = false;
      }
    } else if (inBlockComment) {
      if (text.substr(i, 2) === "*/") {
        inBlockComment = false;
        i++;
      }
    } else {
      if (text[i] === '"' || text[i] === "'") {
        inString = true;
        stringChar = text[i];
        newText += text[i];
      } else if (text.substr(i, 2) === "/*") {
        inBlockComment = true;
        i++;
      } else if (text.substr(i, 2) === "//") {
        // Lookahead/behind for URL check
        const prev = i > 0 ? text[i-1] : "";
        if (prev === ':') {
             newText += "//";
             i++;
        } else {
            while (i < text.length && text[i] !== "\n") {
              i++;
            }
            newText += "\n";
        }
      } else {
        newText += text[i];
      }
    }
  }

  const newLines = newText.split("\n");
  const output: Line[] = [];
  for (let i = 0; i < newLines.length; i++) {
    if (newLines[i].trim()) {
      output.push({
        text: newLines[i],
        file: lines[0]?.file || "unknown",
        line: i + 1,
      });
    }
  }
  return output;
}

function joinLinesLogic(lines: Line[]): Line[] {
    const output: Line[] = [];
    if (lines.length === 0) return output;

    let current: Line | null = null;

    for (let i = 0; i < lines.length; i++) {
        const next = lines[i];
        
        if (!current) {
            current = { ...next };
            continue;
        }

        if (next.text.startsWith('@@')) {
            output.push(current);
            output.push(next);
            current = null;
            continue;
        }

        if (/^[ \t]/.test(next.text)) {
            current.text += next.text.trimStart();
        } else {
            output.push(current);
            current = { ...next };
        }
    }
    if (current) output.push(current);
    
    return output;
}

const SAFE_LIMIT = 8000;

function findSafeSplitIndex(text: string, maxLen: number): number {
  let p = 0; // paren
  let s = 0; // square
  let c = 0; // curly
  let lastSafe = -1;

  for (let i = 0; i < text.length; i++) {
    if (i >= maxLen) break;

    const ch = text[i];
    if (ch === "\\") {
      i++;
      continue;
    }

    if (ch === "{") c++;
    else if (ch === "}") c--;
    else if (ch === "[") s++;
    else if (ch === "]") s--;
    else if (ch === "(") p++;
    else if (ch === ")") p--;

    if (c === 0 && s === 0 && p === 0) {
      lastSafe = i + 1;
    }
  }
  return lastSafe > 0 ? lastSafe : maxLen;
}

function processCommand(line: Line): Line[] {
  const cmd = line.text;
  if (cmd.length <= SAFE_LIMIT) return [line];

  // Check for &ATTR OBJ=VAL
  const match = cmd.match(/^((?:@wait\s+\S+=)?&(\S+)\s+(\S+)=)(.*)$/s);

  if (!match) return [line];

  const [_, prefix, attr, obj, val] = match;

  const available = SAFE_LIMIT - prefix.length;
  if (available < 100) return [line];

  const splitIdx = findSafeSplitIndex(val, available);
  const part1 = val.substring(0, splitIdx);
  const remainder = val.substring(splitIdx);

  const l1 = { ...line, text: `${prefix}${part1}` };
  
  const nextCmdText = `@wait 0=&${attr} ${obj}=[get(${obj}/${attr})]${remainder}`;
  // Recursive call
  const lNext = { ...line, text: nextCmdText }; 
  
  return [l1, ...processCommand(lNext)];
}
