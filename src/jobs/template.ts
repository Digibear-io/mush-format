import { Context, Next, Line } from "../formatter";

export default (ctx: Context, next: Next) => {
  if (!Array.isArray(ctx.scratch.current)) return next();
  const lines = ctx.scratch.current as Line[];
  
  ctx.scratch.current = processLines(lines, ctx);
  
  next();
};

function processLines(lines: Line[], ctx: Context): Line[] {
    const output: Line[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const text = line.text;
        
        // Handle #for block
        // Syntax: #for VAR in range(START, END) {
        const forMatch = text.match(/^\s*#for\s+(\w+)\s+in\s+range\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*\{\s*$/i);
        
        if (forMatch) {
            const varName = forMatch[1];
            const start = parseInt(forMatch[2], 10);
            const end = parseInt(forMatch[3], 10); // Inclusive as per user desire 1,5 -> 5 times
            
            // Extract block
            const blockStart = i + 1;
            const blockEnd = findClosingBrace(lines, blockStart);
            
            if (blockEnd === -1) {
                // Formatting error, unclosed block
                // Just push the line and continue (or throw? MUSH formatter seems forgiving usually)
                // Let's treat it as text if not closed
                output.push(line);
                continue;
            }
            
            const blockLines = lines.slice(blockStart, blockEnd);
            
            // Unroll loop
            for (let val = start; val <= end; val++) {
                // Recursively process block (to handle nested loops/ifs)
                // We must clone lines to avoid modifying references in recursive calls if we were doing in-place,
                // but processLines returns new array, so it's fine.
                // We assume processed block lines are template-free, but we need to inject variable first?
                // Actually: Replace variable in raw block lines -> Then recursively process.
                
                const replacedBlock = blockLines.map(l => ({
                    ...l,
                    text: l.text.replace(new RegExp(`{{${varName}}}`, 'g'), val.toString())
                }));
                
                output.push(...processLines(replacedBlock, ctx));
            }
            
            i = blockEnd; // Skip to end of block
            continue;
        }
        
        // Handle #if block
        // Syntax: #if (CONDITION) {
        const ifMatch = text.match(/^\s*#if\s*\((.+)\)\s*\{\s*$/i);
        
        if (ifMatch) {
            const conditionStr = ifMatch[1];
            
            // Extract block
            const blockStart = i + 1;
            const blockEnd = findClosingBrace(lines, blockStart);
            
            if (blockEnd === -1) {
                output.push(line);
                continue;
            }
            
            const blockLines = lines.slice(blockStart, blockEnd);
            
            // Evaluate condition
            let shouldInclude = false;
            try {
                // SAFETY: User explicitly asked for simple eval. 
                // We use new Function to strictly evaluate the expression.
                // We might want to pass some context constants if needed but for now just raw JS math.
                // Warning: variables like 'i' from outer scope are not automatically passed unless we intentionally pass them.
                // The current architecture: Recursive replace happens BEFORE recursive process.
                // So if we are inside a loop, {{i}} is already replaced by the number '1'.
                // So #if (1 < 5) works.
                const evaluator = new Function(`return (${conditionStr});`);
                shouldInclude = !!evaluator();
            } catch (e) {
                // If eval fails, treat as false or error? 
                // Let's treat as false and simplify logging
                // console.warn("Condition failed:", conditionStr, e);
            }
            
            if (shouldInclude) {
                output.push(...processLines(blockLines, ctx));
            }
            
            i = blockEnd; // Skip to end of block
            continue;
        }
        
        // Normal line
        output.push(line);
    }
    
    return output;
}

function findClosingBrace(lines: Line[], startIndex: number): number {
    let depth = 1;
    for (let i = startIndex; i < lines.length; i++) {
        const text = lines[i].text.trim();
        
        // Check for nested blocks start
        if (/^#(for|if).*\{\s*$/i.test(text)) {
            depth++;
        }
        
        // Check for block end
        if (/^}\s*$/i.test(text)) {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}
