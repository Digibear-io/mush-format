import { FormatterState } from '../graph';
import { Line } from '../../formatter';
import { LLMHealer } from '../healer';
import * as readline from 'readline';
import { log, fmt, Spinner } from '../../utils/colors';

// Create singleton LLM healer instance
let llmHealer: LLMHealer | null = null;

/**
 * Self-Healing Linter Node.
 * Detects structural issues and uses heuristics (or LLM) to propose fixes.
 */
export async function selfHealingLinterNode(state: FormatterState): Promise<Partial<FormatterState>> {
  log.subsection('Self-Healing Linter');

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
            errors.push({ line: lineObj.line, message: "COMPLEX: Unbalanced brackets []", text: lineObj.text, complex: true });
        }
        if (pBalance !== 0) {
            errors.push({ line: lineObj.line, message: "COMPLEX: Unbalanced parentheses ()", text: lineObj.text, complex: true });
        }
        if (inQuote) {
            errors.push({ line: lineObj.line, message: "Unterminated string", text: lineObj.text });
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
        log.warning(`Detected ${fmt.number(complexErrors.length)} COMPLEX errors that need LLM healing`);
    }
    
    if (simpleErrors.length > 0) {
        log.info(`Detected ${fmt.number(simpleErrors.length)} simple errors. Attempting heuristic healing...`);
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
            
            if (lineSimpleErrors.some(e => e.message === "Unterminated string")) {
                text += '"';
                healedCount++;
                modified = true;
            }
            
            if (modified) {
                return { ...l, text };
            }
            
            return l;
        });
        
        if (healedCount > 0) {
            log.success(`Healed ${fmt.number(healedCount)} simple errors using heuristics`);
        }
    }
    
    // Step 2: Try LLM healing for complex errors
    if (complexErrors.length > 0) {
        log.step('Attempting LLM healing for complex errors...');
        
        if (!process.env.GOOGLE_API_KEY) {
            log.error('GOOGLE_API_KEY not set. Cannot perform LLM healing.');
            log.detail('Set your API key in .env.local: GOOGLE_API_KEY=your_key_here');
            
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
        
        log.info(`Processing ${fmt.number(complexErrors.length)} lines with complex errors...`);
        

        // Create a map for $O(1)$ error lookup
        const errorMap = new Map(complexErrors.map(e => [e.line, e]));

        const renderProgressBar = (count: number, totalCount: number, status: string) => {
          if (!process.stdout.isTTY) {
            // Non-TTY: just print periodic updates
            if (count === 0 || count === totalCount || count % Math.max(1, Math.floor(totalCount / 10)) === 0) {
              console.log(`[Progress] ${Math.floor((count / totalCount) * 100)}% | ${status}`);
            }
            return;
          }

          const width = 30;
          const progress = Math.min(width, Math.floor((count / totalCount) * width));
          const pct = Math.floor((count / totalCount) * 100);
          const bar = `[${'='.repeat(progress)}${' '.repeat(width - progress)}]`;
          
          // Clear line and move cursor to beginning
          readline.cursorTo(process.stdout, 0);
          readline.clearLine(process.stdout, 0);
          process.stdout.write(`${bar} ${pct}% | ${status}`);
        };


        renderProgressBar(0, complexErrors.length, `Starting healing...`);

        // Heal lines with complex errors IN PARALLEL BATCHES
        const healedLines = [];
        let errorsProcessed = 0;
        let healedCount = 0;
        
        // Batch size for parallel processing (increased for faster healing)
        const BATCH_SIZE = 30;
        
        // Collect all errors to heal
        const errorsToHeal: Array<{line: Line, error: any, originalIndex: number}> = [];
        currentLines.forEach((l, idx) => {
            const error = errorMap.get(l.line);
            if (error) {
                errorsToHeal.push({ line: l, error, originalIndex: idx });
            }
        });
        
        // Process in batches
        const healedMap = new Map<number, string>();
        for (let i = 0; i < errorsToHeal.length; i += BATCH_SIZE) {
            const batch = errorsToHeal.slice(i, Math.min(i + BATCH_SIZE, errorsToHeal.length));
            const batchStart = i + 1;
            const batchEnd = Math.min(i + BATCH_SIZE, errorsToHeal.length);
            
            renderProgressBar(errorsProcessed, complexErrors.length, `Healing batch ${batchStart}-${batchEnd}/${complexErrors.length}...`);
            
            // Heal all errors in this batch in parallel
            const batchResults = await Promise.allSettled(
                batch.map(async ({line, error, originalIndex}) => {
                    try {
                        const fixed = await llmHealer!.healLine(line, error);
                        return { success: true, fixed, originalIndex };
                    } catch (err) {
                        return { success: false, originalIndex };
                    }
                })
            );
            
            // Process results and store in map
            for (let j = 0; j < batchResults.length; j++) {
                const result = batchResults[j];
                
                if (result.status === 'fulfilled') {
                    if (result.value.success && result.value.fixed) {
                        healedMap.set(result.value.originalIndex, result.value.fixed);
                        healedCount++;
                    }
                    errorsProcessed++;
                }
            }
            
            // Update progress after batch completes
            renderProgressBar(errorsProcessed, complexErrors.length, `✓ Batch ${batchStart}-${batchEnd} complete | ${errorsProcessed}/${complexErrors.length} processed (${healedCount} healed)`);
        }
        
        // Rebuild lines array with healed versions
        for (let i = 0; i < currentLines.length; i++) {
            const l = currentLines[i];
            if (healedMap.has(i)) {
                healedLines.push({ ...l, text: healedMap.get(i)! });
            } else {
                healedLines.push(l);
            }
        }



        process.stdout.write('\n');
        
        currentLines = healedLines;
    }
    
    // Re-check after all healing
    const reCheckErrors = checkLines(currentLines);
    
    if (reCheckErrors.length === 0) {
        log.success('Successfully healed all errors!');
        return {
             formattedLines: currentLines,
             lintErrors: [],
             iterationCount: 1
        };
    } else {
        log.warning(`${fmt.number(reCheckErrors.length)} errors remain after healing`);
        return {
             formattedLines: currentLines,
             lintErrors: reCheckErrors,
             iterationCount: 1
        };
    }
  }
  
  if (errors.length === 0) {
      log.success('Lint check passed');
  }

  return {
    verificationStatus: errors.length === 0 ? 'passed' : 'failed',
    lintErrors: errors,
    iterationCount: 1
  };
}
