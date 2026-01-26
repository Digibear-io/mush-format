"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const format_1 = __importDefault(require("../src/jobs/format"));
describe("Style Enforcer", () => {
    it("should format long function calls with newlines", async () => {
        const longString = '"' + "A".repeat(80) + '"';
        const input = `&DESC ME=[if(1,${longString})]`;
        // Line Mock
        const line = {
            text: input,
            file: "test.mu",
            line: 1
        };
        const ctx = {
            scratch: {
                current: [line]
            },
            output: ""
        };
        const next = jest.fn();
        await (0, format_1.default)(ctx, next);
        const outputLines = ctx.scratch.current;
        const outputText = outputLines.map(l => l.text).join('\n');
        console.log("Formatted Output:\n" + outputText);
        expect(outputLines.length).toBeGreaterThan(1);
        // Check for expanded format
        // &DESC ME = [if(
        //   1,
        //   "AAAA..."
        // )]
        // Verify specific structure
        const joined = outputText.replace(/\s+/g, ' '); // Collapse for rough check? No, we want structure.
        // Note: My implementation adds spaces: `&DESC ME = ...`.
        expect(outputText).toContain("&DESC ME = [if(");
        // Expect 1 to be indented?
        // The implementation:
        // [if(
        //   1,
        //   "..."
        // )]
        // Wait, let's trace:
        // [if(  -> open '[' (children: if, (group))
        // if -> text
        // (group) -> since if is text and prev was text (func name), we skip break?
        // Wait my logic:
        // children[0] is 'if'. children[1] is '('.
        // if matches /^\s*[\w.:]+\s*$/.
        // children[1] matches ' group.
        // So skipFirstBreak = true.
        // So `out += printedChild` (child 0 'if'). out = "[if".
        // Then i=1 (group '('). 
        // printedChild uses indentLevel (not innerIndent).
        // wait, `skipFirstBreak && i < 2 ? indentLevel : innerIndent`.
        // So i=1 uses indentLevel.
        // Inside `(` group:
        // It calls `print(node, indentLevel)`.
        // If THIS group is long (which it is, because longString is in it),
        // It enters `group` logic.
        // `out = '('`.
        // children 1's children are `1`, `,`, `longString`.
        // Loop:
        // newline + indent(indentLevel+1).
        // print `1`.
        // `,` -> emit `,\n` + indent.
        // print longString.
        // Closer `)`.
        // So result:
        // [if(
        //   1,
        //   "..."
        // )]
        // Because `(` group printed `(\n  ... \n)`.
        // So `[if` + `(\n...` matches `[if(\n...`.
        // Perfect.
        expect(outputText).toMatch(/&DESC ME = \[if\(\s+1,\s+"A+"\s+\)\]/);
    });
});
//# sourceMappingURL=format.test.js.map