import { formatter } from "../formatter";

test("DocBlock Parser generates MUSH help attributes", async () => {
  const input = `
@help_object #123
@help_pre &HELP_

/**
 * +attack
 *
 * Attacks a target.
 * [Brackets] should be escaped.
 * Newlines should be %r.
 */
+attack
`;

  const { data } = await formatter.format(input);

  // Check that the original code is preserved (minus config?)
  // our docParser implementation STRIPS config lines.
  expect(data).toContain("+attack");
  expect(data).not.toContain("@help_object");
  expect(data).not.toContain("@help_pre");

  // Check generated help attribute
  // Expected: &HELP_ATTACK #123=+attack%r%rAttacks a target.%r\[Brackets\] should be escaped.%rNewlines should be %r.
  
  // Note: formatting might have stripped indentation and extra spaces.
  // The 'joined' string might be slightly different depending on what 'cleanLines' did.
  // But generally:
  
  const expectedBody = "Attacks a target.%r\\[Brackets\\] should be escaped.%rNewlines should be %r.";
  const expectedAttr = "&HELP_ATTACK #123=+attack%r%r" + expectedBody;

  expect(data).toContain(expectedAttr);
});

test("DocBlock Parser handles defaults", async () => {
    const input = `
/**
 * cmd
 * desc
 */
`;
    // Default target: %!
    // Default prefix: &HELP_
    const { data } = await formatter.format(input);
    expect(data).toContain("&HELP_CMD %!=cmd%r%rdesc");
});
