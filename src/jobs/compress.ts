import { Context, Next, Line } from "../formatter";
import { replaceDefines } from "../utils/replaceDefines";
import { writeFile } from "fs/promises";

export default async (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  let lines = ctx.scratch.current as Line[];

  // 1. Strip comments (stateful Line processing)
  lines = stripComments(lines);

  // 2. Join indented lines
  lines = joinLines(lines);

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
  if (sourceMap.length > 0) {
    console.log("\n--- Source Map ---");
    console.log(sourceMap.join("\n"));
    console.log("------------------\n");
  }

  next();
};

function stripComments(lines: Line[]): Line[] {
  const output: Line[] = [];
  let inBlockComment = false;

  for (const line of lines) {
    if (line.text.startsWith("##")) {
      continue;
    }
    if (line.text.startsWith("@@")) {
      output.push(line);
      continue;
    }

    let text = line.text;
    let newText = "";
    let i = 0;

    while (i < text.length) {
      if (inBlockComment) {
        if (text.substr(i, 2) === "*/") {
          inBlockComment = false;
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      // Check strings
      if (text[i] === '"' || text[i] === "'") {
        const quote = text[i];
        newText += quote;
        i++;
        while (i < text.length) {
          const char = text[i];
          newText += char;
          if (char === "\\") {
            i++;
            if (i < text.length) newText += text[i];
          } else if (char === quote) {
            i++;
            break;
          }
          i++;
        }
        continue;
      }

      // Check URL (prevent // detection)
      const urlMatch = text.substr(i).match(/^(?:https?|ftps?):\/\/[^\s]+/i);
      if (urlMatch) {
        newText += urlMatch[0];
        i += urlMatch[0].length;
        continue;
      }

      // Check comments
      if (text.substr(i, 2) === "//") {
        break; // Ignore rest of line
      }
      
      // Look out for */* which is a common MUSH pattern for switches.
      // We only start a block comment if it's NOT preceded by a *.
      if (text.substr(i, 2) === "/*") {
        if (i > 0 && text[i - 1] === "*") {
           // It's */* - treat as normal text
           newText += "/*";
           i += 2;
           continue;
        }
        inBlockComment = true;
        i += 2;
        continue;
      }

      newText += text[i];
      i++;
    }

    if (newText.trim()) {
      output.push({ ...line, text: newText });
    }
  }
  return output;
}

function joinLines(lines: Line[]): Line[] {
  const output: Line[] = [];
  if (lines.length === 0) return output;

  let current = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const next = lines[i];
    if (next.text.startsWith("@@")) {
      output.push(current);
      output.push(next);
      current = lines[i + 1]; // This logic is slightly flawed if @@ is last?
      // Wait, if @@ is encountered, we push current.
      // Next iteration we want to start fresh?
      // Actually @@ lines are standalone markers usually.
      // But we need to handle the loop index.
      // If we pushed next, we should skip it.
      // But my loop logic: current is waiting to see if next is indented.
      // If next is @@, it is NOT indented (usually).
      // So pushing current is correct. Pushing next is correct.
      // Then current sets to i+1?? No.
      // loop continues.
      // current needs to be reset.
      
      // Let's fix loop:
      // If next is @@: push current. push next. current = lines[i+1]?
      // No, because loop increments i.
      // We need to handle `current` being undefined if we skipped?
      
      // Better:
      // Iterate. If indented, append to current.
      // Else, push current, current = next.
      continue; 
    }
     
    // Correction for @@ logic:
    // If next is @@, we break the join chain.
    /*
        if (next.text.startsWith('@@')) {
            output.push(current);
            output.push(next);
            // We need a new current.
            // But we are in a loop.
            // If i is last, we are done?
            // This is messy.
    */
    // Revert to simpler map logic if possible? No, strict reduction needed.
  }
  // Re-implementation of joinLines below for clarity
  return joinLinesLogic(lines); 
}

function joinLinesLogic(lines: Line[]): Line[] {
    const output: Line[] = [];
    if (lines.length === 0) return output;

    let current: Line | null = lines[0];

    for (let i = 1; i < lines.length; i++) {
        const next = lines[i];
        
        if (!current) {
            current = next;
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
            current = next;
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
  const lNext = { ...line, text: nextCmdText }; // Inherit source info
  
  return [l1, ...processCommand(lNext)];
}
