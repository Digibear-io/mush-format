/// <reference types="jest" />
import formatter from "../formatter";

const str = "\n@debug\n\n#debug {\nThis is a test\n}\n";

test("Register the @debug directive and statement", async () => {
  expect(await formatter.format(str)).toContain("This is a test");
});

test("Without the @debug directive, #debug block is removed", async () => {
  expect(
    await (await formatter.format("#debug{\nThis should be removed!\n}")).trim()
  ).toEqual("");
});

test("Headers and footers render in the file.", async () => {
  const results = await formatter.format(
    "#header foobar=baz\n#footer footer=footer\n"
  );
  expect(results).toContain("@@ foobar: baz");
  expect(results).toContain("@@ footer: footer");
});

test("#include pulls in a github archive", async () => {
  expect(
    await formatter.format("#include git: lcanady/archive-test")
  ).toContain("file 4!");
});
