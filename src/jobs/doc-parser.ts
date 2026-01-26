import { Context, Next, Line } from "../formatter";

export default async (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];

  const config = scanConfig(lines);
  
  // Filter out the config lines from the main output if desirable, 
  // or we can leave them. The prompt says "Strip them from the final code output."
  // So we will filter them out.
  
  const cleanLines: Line[] = [];
  const helpCommands: string[] = [];

  for (const line of lines) {
      if (isConfigLine(line.text)) {
          continue;
      }
      cleanLines.push(line);
  }

  // Parse comments and generate help text
  // We need to reconstruct the full text to easily match multi-line comments
  // But we also want to keep line numbers if possible.
  // However, identifying /** ... */ across lines suggests we might want to group them first.
  
  // Let's iterate and find blocks.
  const comments = extractComments(cleanLines);
  
  for (const comment of comments) {
      const formatted = formatHelp(comment, config);
      if (formatted) {
          helpCommands.push(formatted);
      }
  }

  // Update context
  // "The output must be valid MUSHcode." 
  // We probably want to Append the help commands to the end of the file?
  // Or prepended? Usually help code goes at the end or in a separate section.
  // The user prompt implies we are generating "in-game help".
  // The example output shows just the help attribute.
  // I will append the help commands to the processed lines.

  const finalLines = [...cleanLines];
  
  if (helpCommands.length > 0) {
      // Add a spacer
      finalLines.push({ text: "", line: -1, file: "generated" });
      finalLines.push({ text: "@@ Help System Generation @@", line: -1, file: "generated" });
      for (const cmd of helpCommands) {
          finalLines.push({ text: cmd, line: -1, file: "generated" });
      }
  }

  ctx.scratch.current = finalLines;
  ctx.output = finalLines.map(l => l.text).join("\n");

  next();
};

interface HelpConfig {
    target: string;
    prefix: string;
}

function isConfigLine(text: string): boolean {
    return /^\s*(@help_object|@help_pre)\s+/.test(text);
}

function scanConfig(lines: Line[]): HelpConfig {
    let target = "%!";
    let prefix = "&HELP_";

    for (const line of lines) {
        const text = line.text.trim();
        const objMatch = text.match(/^@help_object\s+(.+)$/);
        if (objMatch) {
            target = objMatch[1].trim();
        }
        const preMatch = text.match(/^@help_pre\s+(.+)$/);
        if (preMatch) {
            prefix = preMatch[1].trim();
        }
    }
    return { target, prefix };
}

interface DocBlock {
    command: string;
    description: string;
}

function extractComments(lines: Line[]): DocBlock[] {
    const blocks: DocBlock[] = [];
    let inBlock = false;
    let buffer: string[] = [];

    for (const line of lines) {
        const text = line.text.trim();
        
        if (!inBlock) {
            if (text.startsWith("/**")) {
                inBlock = true;
                // handle single line /** ... */ ?
                // If it ends with */ on the same line
                if (text.endsWith("*/") && text.length > 3) {
                     // Single line case
                     // Strip /** and */
                     const content = text.substring(3, text.length - 2);
                     parseBlockContent([content], blocks);
                     inBlock = false;
                } else {
                     // Start buffering potentially
                     // If there is content after /**, add it
                     const rest = text.substring(3);
                     if (rest.trim()) buffer.push(rest);
                }
            }
        } else {
            if (text.endsWith("*/")) {
                inBlock = false;
                const content = text.substring(0, text.length - 2);
                 if (content.trim()) buffer.push(content);
                 
                 parseBlockContent(buffer, blocks);
                 buffer = [];
            } else {
                buffer.push(text);
            }
        }
    }
    return blocks;
}

function parseBlockContent(lines: string[], blocks: DocBlock[]) {
    // 1. Strip leading * from each line
    const stripped = lines.map(l => {
        const trimmed = l.trim();
        if (trimmed.startsWith("*") && !trimmed.startsWith("*/")) { 
             // Be careful not to strip * if it's meaningful, but in DocBlock standard * is prefix
             // Usually it's " * text"
             return trimmed.substring(1).trim();
        }
        return trimmed;
    });

    // 2. Remove empty lines from start and end
    while(stripped.length && !stripped[0]) stripped.shift();
    while(stripped.length && !stripped[stripped.length-1]) stripped.pop();

    if (stripped.length === 0) return;

    // 3. First line is command name
    const command = stripped[0];
    
    // 4. Rest is description
    const descriptionLines = stripped.slice(1);
    // Remove leading empty lines from description
    while(descriptionLines.length && !descriptionLines[0]) descriptionLines.shift();

    const description = descriptionLines.join("\n");

    blocks.push({ command, description });
}

function formatHelp(block: DocBlock, config: HelpConfig): string {
    const { command, description } = block;
    // Normalize command for attribute name? 
    // The prompt example:
    // Input: +attack
    // Output: &HELP_ATTACK
    
    // So we need to sanitize the command name to make a valid attribute name.
    // Uppercase, replace non-alphanumeric with _, maybe strip +
    let attrName = command.replace(/^\+/, '').toUpperCase();
    attrName = attrName.replace(/[^A-Z0-9]/g, '_');
    
    // MUSH Text Formatting
    // 1. Newlines to %r
    let desc = description.replace(/\n/g, '%r');
    
    // 2. Tabs to %t
    desc = desc.replace(/\t/g, '%t');
    
    // 3. Escape [ and ]
    // We need to be careful not to double escape if already escaped? 
    // Prompt says: "If the text contains [ or ], escape them (\[, \])"
    desc = desc.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    
    // Additional: % should technically be escaped as %% in some contexts but %r is valid.
    // The prompt explicitly asks for %r conversion, so we leave % alone unless it's literal?
    // "Ensure strict MUSH syntax." 
    // Usually % is fine unless it's a substitution.
    // But literal % might need to be %%. 
    // Let's stick to the prompt's explicit requirements first.
    
    // "Join the stripped lines with %r" -> handled by replace(/\n/g, '%r') (assuming we joined logic correctly)
    
    const output = `${config.prefix}${attrName} ${config.target}=${command}%r%r${desc}`;
    return output;
}

