import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MUXKnowledgeBase } from './knowledge';
import { Line } from '../formatter';

/**
 * LLM-powered code healer with RAG support
 */
export class LLMHealer {
    private model: ChatGoogleGenerativeAI;
    private kb: MUXKnowledgeBase;

    constructor() {
        // Initialize Gemini model
        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            temperature: 0.1, // Low temperature for deterministic fixes
        });
        
        this.kb = new MUXKnowledgeBase();
    }

    /**
     * Initialize knowledge base
     */
    async initialize(): Promise<void> {
        await this.kb.index();
    }

    /**
     * Heal complex syntax errors using LLM + RAG
     */
    async healLine(line: Line, error: any): Promise<string> {
        // Search knowledge base for relevant context
        const context = await this.getContext(line.text, error);
        
        const prompt = `You are a MUSH code expert. Fix the following MUSHcode line that has a syntax error.

${context ? `## Relevant MUX Documentation:\n${context}\n` : ''}

## Error Details:
${error.message}

## Problematic Line:
\`\`\`
${line.text}
\`\`\`

## Instructions:
1. PRESERVE brackets [] around functions that return values (like setr, get, add, etc.)
2. @ commands (like @pemit, @force, @switch) should NOT be inside brackets []
3. If a @ command is inside a bracket, close the bracket before it and add a semicolon
4. Example: [setr(0,get(%#/name@pemit %#=[r(0)]] → [setr(0,get(%#/name))]; @pemit %#=[r(0)]
5. Do NOT remove brackets from functions - only move @ commands outside
6. Return ONLY the fixed line, no explanations or markdown

Fixed line:`;

        try {
            const response = await this.model.invoke([
                ["user", prompt]
            ]);
            
            let fixed = '';
            if (typeof response.content === 'string') {
                fixed = response.content;
            } else if (Array.isArray(response.content)) {
                fixed = response.content.filter(c => typeof c === 'string').join('');
            } else if (response.content) {
                fixed = String(response.content);
            }
            
            // Clean up the response
            fixed = fixed.trim();
            // Remove markdown code blocks if present
            fixed = fixed.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
            
            return fixed;
        } catch (err: any) {
            console.error(`[LLM] Error healing line:`, err.message);
            throw err;
        }
    }

    /**
     * Get relevant context from knowledge base
     */
    private async getContext(code: string, error: any): Promise<string> {
        // Extract @ commands and functions from the code
        const commands = code.match(/@\w+/g) || [];
        const functions = code.match(/\w+\(/g) || [];
        
        let results: any[] = [];
        
        // Search for @ commands
        for (const cmd of commands) {
            const cmdResults = this.kb.searchCommand(cmd);
            results.push(...cmdResults);
        }
        
        // Search for functions
        for (const func of functions) {
            const funcName = func.replace('(', '');
            const funcResults = this.kb.searchFunction(funcName);
            results.push(...funcResults);
        }
        
        // Also do a general search based on error message
        if (error.message.includes('@ command')) {
            const generalResults = this.kb.search('@ command syntax', 3);
            results.push(...generalResults);
        }
        
        // Deduplicate
        const unique = Array.from(new Map(results.map(r => [r.topic, r])).values());
        
        return this.kb.formatContext(unique.slice(0, 3));
    }
}
