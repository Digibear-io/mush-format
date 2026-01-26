import { formatter } from "../formatter";

describe("Templating Engine", () => {
    
    describe("#for Loop", () => {
        it("should unroll simple loops", async () => {
            const input = `
#for i in range(1, 3) {
say {{i}}
}
`.trim();
            const expected = `
say 1
say 2
say 3
`.trim();
            // Note: The formatter might trim results or modify whitespace.
            // Let's check loose containment or simple equality.
            const result = await formatter.format(input);
            // Result comes out as single string
            expect(result.data).toContain("say 1");
            expect(result.data).toContain("say 2");
            expect(result.data).toContain("say 3");
            expect(result.data).not.toContain("#for");
            expect(result.data).not.toContain("}");
        });

        it("should handle expressions inside loop", async () => {
             const input = `
#for i in range(1, 2) {
&CMD_{{i}} obj = code
}
`.trim();
             const result = await formatter.format(input);
             expect(result.data).toContain("&CMD_1 obj = code");
             expect(result.data).toContain("&CMD_2 obj = code");
        });
    });

    describe("#if Block", () => {
        it("should include code when condition is true", async () => {
            const input = `
#if (1 === 1) {
say TRUE
}
`.trim();
            const result = await formatter.format(input);
            expect(result.data).toContain("say TRUE");
        });

        it("should exclude code when condition is false", async () => {
            const input = `
#if (1 === 2) {
say FALSE
}
`.trim();
            const result = await formatter.format(input);
            expect(result.data).not.toContain("say FALSE");
        });
        
        it("should evaluate math", async () => {
             const input = `
#if (3 > 2) {
say MATH
}
`.trim();
             const result = await formatter.format(input);
             expect(result.data).toContain("say MATH");
        });
    });
    
    describe("Integration", () => {
        it("should handle nested for loops", async () => {
            const input = `
#for x in range(1, 2) {
  #for y in range(1, 2) {
    say {{x}}-{{y}}
  }
}
`.trim();
            const result = await formatter.format(input);
            expect(result.data).toContain("say 1-1");
            expect(result.data).toContain("say 1-2");
            expect(result.data).toContain("say 2-1");
            expect(result.data).toContain("say 2-2");
        });

        it("should work with #const (resolved before template)", async () => {
             // resolve replaces #const MAX = 2 before template sees it
             const input = `
#const MAX = 2
#for i in range(1, MAX) {
say {{i}}
}
`.trim();
             const result = await formatter.format(input);
             expect(result.data).toContain("say 1");
             expect(result.data).toContain("say 2");
        });
        
        it("should handle if inside for", async () => {
            const input = `
#for i in range(1, 3) {
  #if ({{i}} === 2) {
    say INDEX_IS_TWO
  }
}
`.trim();
            const result = await formatter.format(input);
            expect(result.data).toContain("say INDEX_IS_TWO");
            expect(result.data).not.toContain("say INDEX_IS_ONE"); // implied absence logic
            
            // Should see 1 iteration where if matched? 
            // Loop 1: #if (1 === 2) -> False
            // Loop 2: #if (2 === 2) -> True -> say INDEX_IS_TWO
            // Loop 3: #if (3 === 2) -> False
        });
    });
});
