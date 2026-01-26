import { Context, Next, Line } from "../formatter";

export default (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];
  const outputLines: Line[] = [];
  const constants = new Map<string, string>();

  // 1. Scan and Strip
  for (const line of lines) {
    const text = line.text;
    // Look for #const KEY = VALUE
    // We assume KEY is a word (\w+) and VALUE is the rest of the line
    const match = text.match(/^\s*#const\s+(\w+)\s*=\s*(.+)$/);

    if (match) {
      const key = match[1];
      const value = match[2].trim();
      constants.set(key, value);
    } else {
      outputLines.push(line);
    }
  }

  // 2. Replace
  // We only proceed if we have constants to replace
  if (constants.size > 0) {
    for (const line of outputLines) {
        let text = line.text;
        
        // Naive iteration over all constants for each line
        // Optimization: Could construct a single regex for all keys if performance becomes an issue
        // But for typical MUSHcode files, this is likely fine.
        for (const [key, value] of constants) {
            // Use word boundaries to strictly match the variable name
            // We use a RegExp with 'g' flag to replace all occurrences in the line
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            text = text.replace(regex, value);
        }
        
        line.text = text;
    }
  }

  // Update the context with processed lines 
  ctx.scratch.current = outputLines;
  next();
};
