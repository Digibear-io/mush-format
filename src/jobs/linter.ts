import { Context, Next, Line } from "../formatter";

interface LintError {
  line: number;
  message: string;
  type: "error" | "warning";
}

export default async (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];
  const errors: LintError[] = [];
  const stack: { char: string; line: number }[] = [];

  let inBlockComment = false;

  for (const lineObj of lines) {
    if (lineObj.text.trim().startsWith("@@")) continue;

    const text = lineObj.text;
    let i = 0;

    // Helper to check token at current position
    const checkToken = (index: number) => {
      // Security / Deprecation checks
      // We look for [switch( and [entrances(
      // We can use substring matching
      const substr = text.substring(index);
      
      if (substr.startsWith("[switch(")) {
        errors.push({
          line: lineObj.line,
          message: "Performance: Consider using [case()] instead of switch()",
          type: "warning",
        });
      }
      
      if (substr.startsWith("[entrances(")) {
        errors.push({
          line: lineObj.line,
          message: "Warning: entrances() can be CPU intensive on large DBs.",
          type: "warning",
        });
      }
    };

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

      const char = text[i];

      // Escape handling
      if (char === "\\") {
        i += 2;
        continue;
      }

      // Quote handling
      if (char === '"' || char === "'") {
        const quote = char;
        i++;
        while (i < text.length) {
          if (text[i] === "\\") {
            i += 2;
            continue;
          }
          if (text[i] === quote) {
            i++;
            break;
          }
          
          // Inside quotes, we still check content for brackets/warnings
          // Reference: MUSH evaluates content of quotes often
          // However, strict bracket balancing might trip on text like "Result: [Success]"
          // But strict MUSH demands balanced brackets unless escaped.
          // So we should lint inside quotes.
          
          const qChar = text[i];
          if (qChar === "[" || qChar === "(") {
              // Check specific function usage
              if (qChar === "[") checkToken(i);
              
              stack.push({ char: qChar, line: lineObj.line });
          } else if (qChar === "]") {
              const last = stack.pop();
              if (!last || last.char !== "[") {
                  errors.push({ line: lineObj.line, message: "Unbalanced brackets: unexpected ]", type: "error" });
              }
          } else if (qChar === ")") {
              const last = stack.pop();
              if (!last || last.char !== "(") {
                  errors.push({ line: lineObj.line, message: "Unbalanced parentheses: unexpected )", type: "error" });
              }
          }
          
          i++;
        }
        continue;
      }

      // Comment handling
      if (text.substr(i, 2) === "//" || text.substr(i, 2) === "##") break; // Skip rest of line
      if (text.substr(i, 2) === "/*") {
        if (i > 0 && text[i - 1] === "*") {
           // It's */* - treat as normal text
           i += 2;
           continue;
        }
        inBlockComment = true;
        i += 2;
        continue;
      }

      // Code handling
      if (char === "[" || char === "(") {
          if (char === "[") checkToken(i);
          stack.push({ char, line: lineObj.line });
      } else if (char === "]") {
          const last = stack.pop();
          if (!last || last.char !== "[") {
               errors.push({ line: lineObj.line, message: "Unbalanced brackets: unexpected ]", type: "error" });
          }
      } else if (char === ")") {
          const last = stack.pop();
          if (!last || last.char !== "(") {
               errors.push({ line: lineObj.line, message: "Unbalanced parentheses: unexpected )", type: "error" });
          }
      }

      i++;
    }
  }

  // Check remaining stack
  if (stack.length > 0) {
      const last = stack[stack.length - 1];
      errors.push({
          line: last.line,
          message: `Unbalanced ${last.char === "[" ? "brackets" : "parentheses"}: missing closing ${last.char === "[" ? "]" : ")"}`,
          type: "error"
      });
  }

  // Report
  if (errors.length > 0) {
    console.error("\n--- Lint Report ---");
    errors.forEach(e => {
        const pfx = e.type === "error" ? "ERROR" : "WARNING";
        console.error(`Line ${e.line}: [${pfx}] ${e.message}`);
    });
    console.error("-------------------\n");

    if (errors.some(e => e.type === "error")) {
        throw new Error("Linting failed with errors.");
    }
  }

  next();
};
