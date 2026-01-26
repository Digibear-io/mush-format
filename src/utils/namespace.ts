import { Line } from "../formatter";

export function applyNamespace(lines: Line[], alias: string): Line[] {
    const symbols = new Set<string>();
    
    // Pass 1: Identification
    // Identify all Attribute definitions (&NAME) and Function definitions (@def/func name())
    for (const line of lines) {
        const text = line.text;
        
        // Attribute: &NAME obj = ...
        const attrMatch = text.match(/^&(\w+)\s/);
        if (attrMatch) {
            symbols.add(attrMatch[1]);
        }
        
        // Function: @def/func NAME(...) = ...
        // Note: checking for @def/func 
        const funcMatch = text.match(/^@def\/func\s+(\w+)\(/);
        if (funcMatch) {
            symbols.add(funcMatch[1]);
        }
    }
    
    if (symbols.size === 0) return lines;

    const output: Line[] = [];
    
    // Pass 2: Transformation
    for (const line of lines) {
        let text = line.text;
        
        // 2a. Rename Valid Definitions
        // Re-match to be precise about what line we are on
        const attrMatch = text.match(/^&(\w+)\s/);
        if (attrMatch && symbols.has(attrMatch[1])) {
             text = text.replace(`&${attrMatch[1]}`, `&${alias}-${attrMatch[1]}`);
        }
        
        const funcMatch = text.match(/^@def\/func\s+(\w+)\(/);
        if (funcMatch && symbols.has(funcMatch[1])) {
             text = text.replace(`@def/func ${funcMatch[1]}(`, `@def/func ${alias}-${funcMatch[1]}(`);
        }
        
        // 2b. Update References
        // We look for usage of the symbols.
        // Simple word boundary check might be enough? 
        // e.g. u(NAME) -> u(ALIAS-NAME)
        // [name(...)] -> [alias-name(...)]
        // But we must be careful not to double-replace if the definition line also contains self-reference? 
        // Or if we already replaced the definition header in step 2a.
        
        // Let's iterate over symbols. sorting by length desc might help prevent substring issues if any?
        // But we are using word boundaries.
        
        for (const symbol of symbols) {
            // We want to replace 'symbol' with 'alias-symbol'
            // But NOT if it's the definition we just replaced?
            // Actually, if we replaced definitions in 2a, 'text' is already modified.
            // If the line started with &NAME, it is now &ALIAS-NAME.
            // We shouldn't replace ALIAS-NAME again.
            // But we MIGHT have references on the RHS.
            
            // Regex: \bSYMBOL\b
            // But avoid replacing if it's part of the new definition we just made? 
            // The alias-symbol contains the symbol as suffix. 
            // \bNAME\b will match inside ALIAS-NAME ? 
            // "ALIAS-NAME" -> \b matches start, '-' is non-word char? 
            // In JS regex \w includes [a-zA-Z0-9_]. Hyphen is NOT \w.
            // So "ALIAS-NAME" is "WORD" "-" "WORD".
            // So \bNAME\b matches the "NAME" part of "ALIAS-NAME".
            // DANGER!
            
            // If we replace usages blindly, we might corrupt our already-prefixed definition?
            // Strategy: 
            // 1. Identify if this is a definition line.
            // 2. If so, split into HEADER and BODY. Update HEADER manually. Update BODY using general replace.
            
            // Let's reset and do it per line more carefully.
        }
        
        // Better Strategy for Single Pass knowing JS Regex:
        // Identify if line corresponds to a definition.
        let isDefinition = false;
        let definitionName = "";
        
        // Check Attr
        const am = line.text.match(/^&(\w+)\s/); // Check ORIGINAL text for safety logic
        if (am && symbols.has(am[1])) {
            isDefinition = true;
            definitionName = am[1];
        }
        
        // Check Func
        const fm = line.text.match(/^@def\/func\s+(\w+)\(/);
        if (fm && symbols.has(fm[1])) {
             isDefinition = true;
             definitionName = fm[1];
        }
        
        let newText = line.text;
        
        // Replace Definitions ONLY at the start
        if (isDefinition) {
            if (am) {
                newText = newText.replace(`&${definitionName}`, `&${alias}-${definitionName}`);
            } else if (fm) {
                newText = newText.replace(`@def/func ${definitionName}(`, `@def/func ${alias}-${definitionName}(`);
            }
        }
        
        // Replace References ANYWHERE (excluding the definition part we just handled?)
        // If we simply iterate replacing \bNAME\b with \bALIAS-NAME\b
        // And we have &ALIAS-NAME ...
        // \bNAME\b matches "NAME" inside "ALIAS-NAME" because - is a boundary.
        // So we get &ALIAS-ALIAS-NAME.
        
        // Solution: Lookbehind is not fully supported in all JS envs? (ES2018 supports it).
        // If supported: (?<!-)NAME\b
        // But safer: iterate tokens or use a replacement function.
        
        // We can ignore the "Definition Header" part of the string during replacement.
        // For standard lines, replace all.
        // For definition lines, split by '='? 
        // &NAME obj = CODE
        // We replaced LHS. Now process RHS.
        // @def/func NAME() = CODE
        // Replaced LHS. Process RHS.
        
        // But what if multi-line? MUSHcode often is.
        // The formatter usually handles full file.
        
        // Let's refine the "Replace All" logic to handle the "hyphen is a boundary" issue.
        // The issue is that we are introducing a hyphen.
        // If we search for \bNAME\b, we want to ensure it's NOT preceded by our Alias- prefix.
        
        for (const sym of symbols) {
             const regex = new RegExp(`\\b${sym}\\b`, 'g');
             
             newText = newText.replace(regex, (match, offset, string) => {
                 // Check what comes before
                 const prefix = string.slice(Math.max(0, offset - alias.length - 1), offset);
                 if (prefix === `${alias}-`) {
                     return match; // Already prefixed (e.g. we just did it in LHS, or it was manually written)
                 }
                 return `${alias}-${match}`;
             });
        }
        
        output.push({ ...line, text: newText });
    }
    
    return output;
}
