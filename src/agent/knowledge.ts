import * as fs from 'fs';
import * as path from 'path';

/**
 * MUX Knowledge Base for RAG
 * Parses and indexes MUX help files for context-aware code healing
 */

export interface HelpEntry {
    topic: string;
    content: string;
    file: string;
    commands?: string[];
    functions?: string[];
}

export class MUXKnowledgeBase {
    private entries: HelpEntry[] = [];
    private indexed: boolean = false;

    constructor(private docsPath: string = path.join(__dirname, '../../docs')) {}

    /**
     * Parse help file into individual entries
     */
    private parseHelpFile(filepath: string): HelpEntry[] {
        const content = fs.readFileSync(filepath, 'utf8');
        const entries: HelpEntry[] = [];
        const lines = content.split('\n');
        
        let currentTopic = '';
        let currentContent: string[] = [];
        
        for (const line of lines) {
            // Topic marker starts with '& '
            if (line.startsWith('& ')) {
                // Save previous entry
                if (currentTopic && currentContent.length > 0) {
                    entries.push({
                        topic: currentTopic,
                        content: currentContent.join('\n').trim(),
                        file: path.basename(filepath),
                        commands: this.extractCommands(currentContent.join('\n')),
                        functions: this.extractFunctions(currentContent.join('\n'))
                    });
                }
                
                // Start new entry
                currentTopic = line.substring(2).trim();
                currentContent = [];
            } else {
                currentContent.push(line);
            }
        }
        
        // Save last entry
        if (currentTopic && currentContent.length > 0) {
            entries.push({
                topic: currentTopic,
                content: currentContent.join('\n').trim(),
                file: path.basename(filepath),
                commands: this.extractCommands(currentContent.join('\n')),
                functions: this.extractFunctions(currentContent.join('\n'))
            });
        }
        
        return entries;
    }

    /**
     * Extract @ commands from help content
     */
    private extractCommands(content: string): string[] {
        const commands = new Set<string>();
        const commandRegex = /@(\w+)/g;
        let match;
        
        while ((match = commandRegex.exec(content)) !== null) {
            commands.add(`@${match[1].toLowerCase()}`);
        }
        
        return Array.from(commands);
    }

    /**
     * Extract functions from help content
     */
    private extractFunctions(content: string): string[] {
        const functions = new Set<string>();
        const functionRegex = /(\w+)\(/g;
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            const funcName = match[1].toLowerCase();
            // Filter out common words that aren't functions
            if (funcName.length > 2 && !['the', 'and', 'for', 'this', 'that'].includes(funcName)) {
                functions.add(funcName);
            }
        }
        
        return Array.from(functions);
    }

    /**
     * Load and index all help files
     */
    async index(): Promise<void> {
        if (this.indexed) return;
        
        // Silence indexing logs to keep UI clean
        
        const helpFiles = ['help.txt', 'wizhelp.txt', 'plushelp.txt', 'staffhelp.txt'];
        
        for (const file of helpFiles) {
            const filepath = path.join(this.docsPath, file);
            if (fs.existsSync(filepath)) {
                const entries = this.parseHelpFile(filepath);
                this.entries.push(...entries);
            }
        }
        
        this.indexed = true;
    }

    /**
     * Simple keyword-based search (without embeddings for now)
     * TODO: Add vector embeddings for semantic search
     */
    search(query: string, limit: number = 5): HelpEntry[] {
        const queryLower = query.toLowerCase();
        const keywords = queryLower.split(/\s+/);
        
        // Score each entry based on keyword matches
        const scored = this.entries.map(entry => {
            let score = 0;
            const searchText = `${entry.topic} ${entry.content}`.toLowerCase();
            
            // Exact topic match gets highest score
            if (entry.topic.toLowerCase() === queryLower) {
                score += 100;
            }
            
            // Topic contains query
            if (entry.topic.toLowerCase().includes(queryLower)) {
                score += 50;
            }
            
            // Count keyword occurrences
            for (const keyword of keywords) {
                const occurrences = (searchText.match(new RegExp(keyword, 'g')) || []).length;
                score += occurrences * 5;
            }
            
            // Boost if it's a command
            if (entry.commands && entry.commands.some(cmd => queryLower.includes(cmd))) {
                score += 30;
            }
            
            return { entry, score };
        });
        
        // Sort by score and return top results
        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => s.entry);
    }

    /**
     * Get help for specific @ commands
     */
    searchCommand(command: string): HelpEntry[] {
        const cmdLower = command.toLowerCase();
        return this.entries.filter(entry => 
            entry.commands && entry.commands.includes(cmdLower)
        );
    }

    /**
     * Get help for specific functions
     */
    searchFunction(func: string): HelpEntry[] {
        const funcLower = func.toLowerCase();
        return this.entries.filter(entry => 
            entry.functions && entry.functions.includes(funcLower)
        );
    }

    /**
     * Format search results as context for LLM
     */
    formatContext(results: HelpEntry[]): string {
        if (results.length === 0) {
            return "No relevant documentation found.";
        }
        
        return results.map((entry, idx) => {
            return `## ${entry.topic}\n\n${entry.content.substring(0, 500)}${entry.content.length > 500 ? '...' : ''}`;
        }).join('\n\n---\n\n');
    }
}
