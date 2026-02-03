
import { FormatterState } from '../graph';
import { Context, Line } from "../../formatter";
import { replaceDefines } from "../../utils/replaceDefines";

export async function compressorNode(state: FormatterState): Promise<Partial<FormatterState>> {
  console.log("--- Compressor Start ---");

  let lines = state.formattedLines || [];

  // 1. Strip comments (stateful Line processing)
  lines = stripComments(lines);

  // 2. Join indented lines
  lines = joinLinesLogic(lines);

  // 3. Replace defines
  const dummyContext: Context = {
    path: state.projectRoot,
    filename: state.entryPoint,
    defines: new Map<RegExp, string>(),
    scratch: {},
    output: "",
    input: "",
    headers: [],
    footers: [],
    combined: "",
    cache: new Map<string, any>()
  };
  
  lines = lines.map((l) => ({
    ...l,
    text: replaceDefines(dummyContext, l.text),
  }));

  // 4. Split and Process & Generate Map
  const processedLines: Line[] = [];
  
  for (const line of lines) {
    if (!line.text.trim()) {
      processedLines.push(line);
      continue;
    }

    processedLines.push(...processCommand(line));
  }
  
  console.log("--- Compressor End ---");

  return {
    formattedLines: processedLines,
  };
}


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
        while (i < text.length && text[i] !== "\n") {
          i++;
        }
        newText += "\n";
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
        file: lines[i]?.file || "unknown",
        line: lines[i]?.line || i + 1,
      });
    }
  }
  return output;
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
  const match = cmd.match(/^((?:@@wait\s+\S+=)?&(\S+)\s+(\S+)=)(.*)$/s);

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
