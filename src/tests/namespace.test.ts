import { applyNamespace } from "../utils/namespace";
import { Line } from "../formatter";

function mockLine(text: string): Line {
    return { text, file: "test.mu", line: 1 };
}

describe("Namespace Logic", () => {
    it("should prefix attributes", () => {
        const lines: Line[] = [
            mockLine("&ATTACK obj = code")
        ];
        const result = applyNamespace(lines, "MYLIB");
        expect(result[0].text).toBe("&MYLIB-ATTACK obj = code");
    });
    
    it("should prefix function definitions", () => {
        const lines: Line[] = [
            mockLine("@def/func add() = 1+1")
        ];
        const result = applyNamespace(lines, "MATH");
        expect(result[0].text).toBe("@def/func MATH-add() = 1+1");
    });
    
    it("should update references to attributes", () => {
        const lines: Line[] = [
            mockLine("&DATA obj = #123"),
            mockLine("&CMD obj = $cmd:@pemit %#=u(DATA)")
        ];
        const result = applyNamespace(lines, "LIB");
        expect(result[0].text).toBe("&LIB-DATA obj = #123");
        expect(result[1].text).toBe("&LIB-CMD obj = $cmd:@pemit %#=u(LIB-DATA)");
    });
    
    it("should update references to functions", () => {
        const lines: Line[] = [
            mockLine("@def/func sum(a,b) = add(a,b)"),
            mockLine("&CALC obj = [sum(1,2)]")
        ];
        // 'add' is NOT defined here so it shouldn't be namespaced?
        // Wait, 'sum' IS defined.
        const result = applyNamespace(lines, "M");
        expect(result[0].text).toBe("@def/func M-sum(a,b) = add(a,b)"); 
        // Note: 'add' is not in symbols, so untouched. Correct.
        expect(result[1].text).toBe("&M-CALC obj = [M-sum(1,2)]");
    });
    
    it("should handle self-reference", () => {
        const lines: Line[] = [
             mockLine("&RECURSE obj = [u(RECURSE)]")
        ];
        const result = applyNamespace(lines, "A");
        // Definition: &A-RECURSE obj = ...
        // Reference: u(A-RECURSE)
        expect(result[0].text).toBe("&A-RECURSE obj = [u(A-RECURSE)]");
    });
    
    it("should handle complex replacements", () => {
        const lines: Line[] = [
            mockLine("&FOO obj = 1"),
            mockLine("&BAR obj = u(FOO) + u(BAR)")
        ];
        const result = applyNamespace(lines, "NS");
        expect(result[0].text).toBe("&NS-FOO obj = 1");
        expect(result[1].text).toBe("&NS-BAR obj = u(NS-FOO) + u(NS-BAR)");
    });
});
