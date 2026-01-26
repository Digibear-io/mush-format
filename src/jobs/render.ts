import { Context, Next, Line } from "../formatter";
import { replaceDefines } from "../utils/replaceDefines";

export default async (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];
  const outputLines: Line[] = [];

  // Pass 1: Headers, Footers, Installer (Filter)
  for (const line of lines) {
    const text = line.text;

    // Process headers
    const headerMatch = text.match(/#header\s+(.*?)\s?=\s?(.*)/i);
    if (headerMatch) {
      ctx.headers!.push({ name: headerMatch[1], value: headerMatch[2] });
      continue;
    }

    // Process footers
    const footerMatch = text.match(/#footer\s+(.*?)\s?=\s?(.*)/i);
    if (footerMatch) {
      ctx.footers!.push({ name: footerMatch[1], value: footerMatch[2] });
      continue;
    }

    // Look for @installer
    if (/@installer/i.test(text)) {
      ctx.installer = true;
      continue;
    }

    outputLines.push(line);
  }

  // Pass 2: Debug Logic
  const debugLines: Line[] = [];
  let inDebugBlock = false;
  let debugEnabled = false;

  // Initialize debug state from ctx if needed, but original code treated it locally mostly, 
  // except ctx.scratch.debug was attached to context.
  // We'll mimic the logic:
  // "Expose any debug statements, if debugging is true." -> This comment seems to imply generic debug logic?
  // Original logic actually scanned for @debug to ENABLE it for the file?

  for (const line of outputLines) {
    const text = line.text;
    
    if (/^@debug/i.test(text)) {
      debugEnabled = true;
    } else if (/^#debug\s*?\{/i.test(text)) {
      inDebugBlock = true;
    } else if (inDebugBlock && debugEnabled && !/^\}/i.test(text)) {
      debugLines.push(line);
    } else if (/^\}/i.test(text) && inDebugBlock) {
      inDebugBlock = false;
    } else if (!inDebugBlock) {
      debugLines.push(line);
    }
  }

  // Pass 3: Replace defines
  // working line-by-line
  ctx.scratch.current = debugLines.map(line => ({
      ...line,
      text: replaceDefines(ctx, line.text)
  }));

  next();
};
