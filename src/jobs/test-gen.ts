import { Context, Next, Line } from "../formatter";

export default async (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];
  
  if (lines.length === 0) return next();

  // Reconstruct full text to run regex (preserving line breaks)
  const fullText = lines.map(l => l.text).join('\n');
  
  // Map character indices to line numbers
  const lineOffsets: number[] = [];
  let currentOffset = 0;
  for (const line of lines) {
      lineOffsets.push(currentOffset);
      currentOffset += line.text.length + 1; // +1 for \n
  }
  
  /* Helper to find line index from char index */
  function getLineIndex(charIdx: number): number {
      // Binary search or linear scan. Linear scan is fine for now or reverse scan.
      for (let i = lineOffsets.length - 1; i >= 0; i--) {
          if (charIdx >= lineOffsets[i]) return i;
      }
      return 0;
  }

  // Regex to match:
  // @test "Name" { body } expect { expectation }
  // We use [^]*? to match multiline content lazily
  const testRegex = /@test\s+"([^"]+)"\s*{([^]*?)}\s*expect\s*{([^]*?)}/g;

  const matches = [...fullText.matchAll(testRegex)];
  
  if (matches.length === 0) return next();

  const outputLines: Line[] = [];
  let lastProcessedLineIdx = 0;

  for (const match of matches) {
     if (match.index === undefined) continue;
     
     const startChar = match.index;
     const endChar = startChar + match[0].length;
     
     const startLineIdx = getLineIndex(startChar);
     const endLineIdx = getLineIndex(endChar - 1); // -1 because endChar is exclusive range end in string, but we want inclusive line

     // Identify processed range
     // Push lines before this match
     for (let i = lastProcessedLineIdx; i < startLineIdx; i++) {
         outputLines.push(lines[i]);
     }
     
     // Generate replacement
     const testName = match[1];
     const body = match[2].trim();
     const expected = match[3].trim();

    const resultText = `think [setq(0, ${body})][setq(1, ${expected})][ifelse(strmatch(%q0, %q1), ansi(gh, PASS: ${testName}), ansi(rh, FAIL: ${testName}: Expected '%q1' but got '%q0'))]`;
    
    // Create new Line(s) for the replacement
    // We map it to the startLineIdx's file/line
    const sourceLine = lines[startLineIdx];
    outputLines.push({
        text: resultText,
        file: sourceLine.file,
        line: sourceLine.line
    });
    
    lastProcessedLineIdx = endLineIdx + 1;
  }
  
  // Push remaining lines
  for (let i = lastProcessedLineIdx; i < lines.length; i++) {
      outputLines.push(lines[i]);
  }

  ctx.scratch.current = outputLines;

  next();
};
