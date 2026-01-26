/// <reference types="jest" />
import { formatter } from "../formatter";

test("Parses @test directive correctly", async () => {
  const input = `
@test "Math Test" {
  [add(1, 2)]
} expect {
  3
}
`;
  const { data } = await formatter.format(input);
  
  // Clean up whitespace for easier matching
  const cleaned = data.replace(/\s+/g, " ").trim();
  
  expect(cleaned).toContain("think [setq(0, [add(1, 2)])]");
  expect(cleaned).toContain("[setq(1, 3)]");
  expect(cleaned).toContain("[ifelse(strmatch(%q0, %q1), ansi(gh, PASS: Math Test), ansi(rh, FAIL: Math Test: Expected '%q1' but got '%q0'))]");
});

test("Parses multiline test blocks", async () => {
    const input = `
@test "Complex Test" {
    [u(
        my/fun,
        arg1
    )]
} expect {
    RESULT
}
`;
    const { data } = await formatter.format(input);
    expect(data).toContain("[setq(1, RESULT)]");
    expect(data).toContain("PASS: Complex Test");
});
