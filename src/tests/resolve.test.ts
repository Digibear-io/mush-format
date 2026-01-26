import { formatter } from "../formatter";

describe("Variable Resolver", () => {
  it("should replace simple constants", async () => {
    const input = `
#const VALUE = 123
&VAR obj = VALUE
`.trim();

    const expected = `&VAR obj = 123`;
    const result = await formatter.format(input);
    expect(result.data).toContain(expected);
    expect(result.data).not.toContain("#const VALUE = 123");
  });

  it("should handle multiple constants", async () => {
    const input = `
#const FOO = bar
#const BAZ = qux
say FOO BAZ
`.trim();
    const expected = "say bar qux";
    const result = await formatter.format(input);
    expect(result.data).toContain(expected);
  });

  it("should not replace substrings", async () => {
    const input = `
#const BAT = 1
say WOMBAT BAT
`.trim();
    const expected = "say WOMBAT 1";
    const result = await formatter.format(input);
    expect(result.data).toContain(expected);
  });

  it("should handle special characters in values", async () => {
    const input = `
#const COLOR = %ch%cg
say COLORHello
`.trim();
    // Note: \bCOLOR\b matches COLOR in COLORHello ? 
    // Wait, COLORHello -> 'R' is word char, 'H' is word char.
    // So \bCOLOR\b does NOT match in COLORHello. 
    // This is correct behavior for "word match".
    // If user meant "COLORHello", they should probably write "COLOR" + "Hello" or similar in mushcode if they wanted concatenation?
    // But let's test separated by space
    
    // If input is: say COLOR Hello
    const result = await formatter.format(`#const COLOR = %ch%cg\nsay COLOR Hello`);
    expect(result.data).toContain("say %ch%cg Hello");
  });

  it("should handle keys with underscores", async () => {
    const input = `
#const MY_VAR = 100
say MY_VAR
`.trim();
    const result = await formatter.format(input);
    expect(result.data).toContain("say 100");
  });
  
  it("should strip definition lines", async () => {
     const input = `
#const A = 1
say A
`;
     const result = await formatter.format(input);
     expect(result.data).not.toContain("#const");
     expect(result.data).toContain("say 1");
  });
});
