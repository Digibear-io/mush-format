
import { Context, Next, Line } from "../formatter";

export default async (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];
  const formattedLines: Line[] = [];

  for (const line of lines) {
    if (!line.text.trim()) {
      formattedLines.push(line);
      continue;
    }

    // Command Detection: &ATTR OBJ=VAL or @CMD ARG=VAL
    const cmdMatch = line.text.match(/^([@&][^\s=]+)\s+([^=]+)=(.*)$/s);

    if (cmdMatch) {
        const command = cmdMatch[1];
        const args = cmdMatch[2].trim();
        const value = cmdMatch[3];
        
        const formattedValue = prettyPrint(value, 0);
        
        // Reassemble: CMD ARGS = VALUE
        const fullText = `${command} ${args} = ${formattedValue}`;
        
        fullText.split('\n').forEach(txt => {
            formattedLines.push({
                text: txt,
                file: line.file,
                line: line.line
            });
        });

    } else {
        // Treat as expression if likely function call or long
        if ((line.text.includes('[') || line.text.includes('(')) && line.text.length > 80) {
             const formatted = prettyPrint(line.text, 0);
             formatted.split('\n').forEach(txt => {
                 formattedLines.push({ ...line, text: txt });
             });
        } else {
            formattedLines.push(line);
        }
    }
  }

  ctx.scratch.current = formattedLines;
  ctx.output = formattedLines.map(l => l.text).join("\n");
  next();
};

function prettyPrint(code: string, baseIndent: number): string {
    const root = parse(code);
    return print(root, baseIndent).trim();
}

// AST Definitions
type NodeType = 'root' | 'text' | 'group' | 'comma';

interface Node {
    type: NodeType;
    text?: string;
    open?: string;
    close?: string;
    children?: Node[];
}

// Parsing Logic
function parse(input: string): Node {
    const root: Node = { type: 'root', children: [] };
    const stack: Node[] = [root];
    let buffer = "";

    const flush = () => {
        if (buffer) {
            stack[stack.length - 1].children!.push({ type: 'text', text: buffer });
            buffer = "";
        }
    };

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (char === '[' || char === '(') {
            flush();
            const close = char === '[' ? ']' : ')';
            const group: Node = { type: 'group', open: char, close, children: [] };
            stack[stack.length - 1].children!.push(group);
            stack.push(group);
        } else if (char === ']' || char === ')') {
            flush();
            // Attempt to close matching group
            if (stack.length > 1) {
                const current = stack[stack.length - 1];
                if (current.type === 'group' && current.close === char) {
                    stack.pop();
                } else {
                    buffer += char; // Mismatch, treat as text
                }
            } else {
                buffer += char; // Root level closing bracket? Treat as text
            }
        } else if (char === ',') {
            flush();
            stack[stack.length - 1].children!.push({ type: 'comma' });
        } else {
            buffer += char;
        }
    }
    flush();
    return root;
}

// Collapse helper (removes extra spaces to check canonical length)
function stringify(node: Node): string {
    if (node.type === 'text') return node.text!.replace(/\s+/g, ' ');
    if (node.type === 'comma') return ',';
    if (node.type === 'root') return node.children!.map(stringify).join('');
    if (node.type === 'group') {
        const content = node.children!.map(stringify).join('');
        return `${node.open}${content}${node.close}`;
    }
    return '';
}

// Printing Logic
function print(node: Node, indentLevel: number): string {
    // 1. Check if we can keep it flat
    const flat = stringify(node);
    if (flat.length <= 80 && !flat.includes('\n')) {
        return flat;
    }

    if (node.type === 'root') {
        return node.children!.map(c => print(c, indentLevel)).join('');
    }

    if (node.type === 'text') {
        return node.text!.replace(/\s+/g, ' '); // Normalize spaces
    }
    
    if (node.type === 'comma') {
        return ','; // Should be handled by parent group usually
    }

    if (node.type === 'group') {
        // COMPLEX LOGIC:
        // We have a group that exceeds 80 chars. 
        // We need to format it with newlines.
        
        let out = node.open!;
        const children = node.children!;
        const innerIndent = indentLevel + 1;
        const indentStr = "  ".repeat(innerIndent);
        const closingIndentStr = "  ".repeat(indentLevel);
        
        // Check for [func( pattern to avoid breaking early
        let skipFirstBreak = false;
        if (node.open === '[' && children.length > 1) {
            // If first child is text (func name) and second is group '('
             if (children[0].type === 'text' && /^\s*[\w.:]+\s*$/.test(children[0].text || '') && children[1].type === 'group' && children[1].open === '(') {
                 skipFirstBreak = true;
             }
        }

        if (!skipFirstBreak) {
            out += "\n" + indentStr;
        }

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            
            if (child.type === 'comma') {
                out += ",\n" + indentStr; 
            } else {
                // Formatting the child
                const printedChild = print(child, skipFirstBreak && i < 2 ? indentLevel : innerIndent);
                
                // If we skipped first break, we append directly
                // Logic: [func ( ... ) ]
                // i=0 (func): append "func"
                // i=1 ((...)): append "(...)"
                
                // Refined:
                // If skipFirstBreak is true:
                // i=0: matches text. Print it.
                // i=1: matches group `(`. 
                // We want to verify if `(` group breaks.
                // Depending on `(` group content:
                // If `(` group is long: It will emit `(\n...`
                // So `[func(\n` works naturally!
                
                // Problem: If i=1 `(` group is NOT long?
                // `[func(short)]` -> `[func(short)]` (flat check failed earlier?)
                // If `[func(short)]` was > 80 (due to other things?), we wouldn't be here?
                // Wait, maybe `[func(short)]` is < 80 but part of a larger structure?
                // Nope, we process nodes. `print(node)` checks `flat`.
                // So if `(` group is short, `print(group)` returns flat `(short)`.
                // So we get `[func(short)`.
                
                // Then what about the rest? `]`?
                // If the whole `[` group is > 80, but `(` part is short?
                // e.g. `[func(short) + variable + ...]`
                // Then we need to break other parts.
                
                out += printedChild;
                
                // After 'func', we don't want space? MUSH is rigid.
                // `func` + `(` -> `func(` (no space).
            }
        }
        
        // Closer
        // Cuddle check: If we are closing a group and the content ends with a closer that matches our style (e.g. balanced-ish),
        // or specifically for [func()] -> )] pattern.
        // We check if the last printed char was a closer or we want to condense.
        // Simple heuristic: If we skipped first break (function style), we cuddle valid closers.
        const endsWithCloser = /[)\]}]$/.test(out);
        if ((skipFirstBreak || (node.open==='(' && endsWithCloser)) && endsWithCloser) {
             out += node.close!;
        } else {
            out += "\n" + closingIndentStr + node.close!;
        }
        return out;
    }

    return "";
}
