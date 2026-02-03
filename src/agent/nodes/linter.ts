import { FormatterState } from '../graph';
import { Line } from '../../formatter';
import { LLMHealer } from '../healer';

// Create singleton LLM healer instance
let llmHealer: LLMHealer | null = null;

/**
 * Self-Healing Linter Node.
 * Detects structural issues and uses heuristics (or LLM) to propose fixes.
 */
export async function selfHealingLinterNode(state: FormatterState): Promise<Partial<FormatterState>> {
  console.log("--- Self-Healing Linter Start ---");

  // Assuming `parser` node populated `formattedLines`
  const lines = state.formattedLines || [];
  
  // Function to check lines for errors
  const checkLines = (linesToCheck: Line[]) => {
    const errors: any[] = [];
    
    for (const lineObj of linesToCheck) {
        if (!lineObj.text) continue;
        const text = lineObj.text;
        
        // Check for @ commands inside brackets/parens (complex syntax error)
        let insideBracket = 0;
        let insideParen = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '[') insideBracket++;
            if (char === ']') insideBracket--;
            if (char === '(') insideParen++;
            if (char === ')') insideParen--;
            
            // Detect @ command while inside brackets or parens
            if (char === '@' && (insideBracket > 0 || insideParen > 0)) {
                errors.push({ 
                    line: lineObj.line, 
                    message: "COMPLEX: @ command appears inside function/bracket (needs LLM healing)", 
                    text: lineObj.text,
                    complex: true
                });
            }
        }
        
        // Strict bracket check
        let balance = 0;
        let pBalance = 0;
        let inQuote = false;
        let esc = false;
        
        for(let i=0; i<text.length; i++) {
            const char = text[i];
            if (esc) { esc = false; continue; }
            if (char === '\\') { esc = true; continue; }
            if (char === '"') { inQuote = !inQuote; continue; }
            
            if (!inQuote) {
               if (char === '[') balance++;
               if (char === ']') balance--;
               if (char === '(') pBalance++;
               if (char === ')') pBalance--;
            }
        }
        
        if (balance !== 0) {
            errors.push({ line: lineObj.line, message: "Unbalanced brackets []", text: lineObj.text });
        }
        if (pBalance !== 0) {
            errors.push({ line: lineObj.line, message: "Unbalanced parentheses ()", text: lineObj.text });
        }
    }
    
    return errors;
  };
  
  let errors = checkLines(lines);

  // Self-Healing Logic
  if (errors.length > 0) {
    // Check if we have complex errors
    const complexErrors = errors.filter(e => e.complex);
    const simpleErrors = errors.filter(e => !e.complex);
    
    if (complexErrors.length > 0) {
        console.log(`⚠️  Detected ${complexErrors.length} COMPLEX errors that need LLM healing.`);
    }
    
    if (simpleErrors.length > 0) {
        console.log(`Detected ${simpleErrors.length} simple errors. Attempting heuristic healing...`);
    }
    
    let currentLines = [...lines];
    
    // Step 1: Try heuristic healing for simple errors first
    if (simpleErrors.length > 0) {
        let healedCount = 0;
        currentLines = currentLines.map(l => {
            // Check if this line has simple errors
            const lineSimpleErrors = simpleErrors.filter(e => e.line === l.line);
            if (lineSimpleErrors.length === 0) {
                return l;
            }
            
            let text = l.text;
            let modified = false;
            
            // Count unbalanced brackets and parentheses
            let bracketBalance = 0;
            let parenBalance = 0;
            
            for(const char of text) {
                if(char === '[') bracketBalance++;
                if(char === ']') bracketBalance--;
                if(char === '(') parenBalance++;
                if(char === ')') parenBalance--;
            }
            
            // Heal by appending closures in proper order
            if (parenBalance > 0) {
                text += ")".repeat(parenBalance);
                healedCount++;
                modified = true;
                console.log(`[Heuristic] Line ${l.line}: Appended ${parenBalance} missing ')'`);
            }
            
            if (bracketBalance > 0) {
                text += "]".repeat(bracketBalance);
                healedCount++;
                modified = true;
                console.log(`[Heuristic] Line ${l.line}: Appended ${bracketBalance} missing ']'`);
            }
            
            if (modified) {
                return { ...l, text };
            }
            
            return l;
        });
        
        if (healedCount > 0) {
            console.log(`[Heuristic] Healed ${healedCount} simple errors.`);
        }
    }
    
    // Step 2: Try LLM healing for complex errors
    if (complexErrors.length > 0) {
        console.log(`⚠️  Attempting LLM healing for complex errors...`);
        
        if (!process.env.GOOGLE_API_KEY) {
            console.log(`⚠️  GOOGLE_API_KEY not set. Cannot perform LLM healing.`);
            console.log(`   Set your API key in .env.local: GOOGLE_API_KEY=your_key_here`);
            
            // Return with heuristic fixes but complex errors remaining
            const reCheckErrors = checkLines(currentLines);
            return {
                formattedLines: currentLines,
                lintErrors: reCheckErrors,
                verificationStatus: 'failed',
                iterationCount: 1
            };
        }
        
        // Initialize LLM healer if needed
        if (!llmHealer) {
            llmHealer = new LLMHealer();
            await llmHealer.initialize();
        }
        
        console.log(`[LLM] Processing ${complexErrors.length} lines with complex errors...`);
        
        // Heal lines with complex errors
        const healedLines = await Promise.all(currentLines.map(async (l) => {
            const error = complexErrors.find(e => e.line === l.line);
            if (error) {
                try {
                    const fixed = await llmHealer!.healLine(l, error);
                    console.log(`[LLM] Line ${l.line}: Fixed!`);
                    return { ...l, text: fixed };
                } catch (err) {
                    console.error(`[LLM] Failed to heal line ${l.line}:`, err);
                    return l;
                }
            }
            return l;
        }));
        
        currentLines = healedLines;
    }
    
    // Re-check after all healing
    const reCheckErrors = checkLines(currentLines);
    
    if (reCheckErrors.length === 0) {
        console.log(`✅ Successfully healed all errors!`);
        return {
             formattedLines: currentLines,
             lintErrors: [],
             iterationCount: 1
        };
    } else {
        console.log(`⚠️  ${reCheckErrors.length} errors remain after healing.`);
        return {
             formattedLines: currentLines,
             lintErrors: reCheckErrors,
             iterationCount: 1
        };
    }
  }
  
  if (errors.length === 0) {
      console.log("Lint check passed.");
  }

  return {
    verificationStatus: errors.length === 0 ? 'passed' : 'failed',
    lintErrors: errors,
    iterationCount: 1
  };
}
