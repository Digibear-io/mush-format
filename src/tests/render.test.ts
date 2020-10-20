/// <reference types="jest" />
import Formatter from "../formatter";

const formatter = new Formatter();

const str = "\n@debug\n\n#debug {\nThis is a test\n}\n";

test("Register the @debug directive and statement", async () => {
  expect(await formatter.format(str)).toEqual("\nThis is a test");
});

test("Without the @debug directive, #debug block is removed", async () => {
  expect(
    await (await formatter.format("#debug{\nThis should be removed!\n}")).trim()
  ).toEqual("");
});
