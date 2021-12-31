/// <reference types="jest" />
import { formatter } from "../formatter";

const str = `
@debug
#debug {
  This is a test
}`.trim();

test("Register the @debug directive and statement", async () => {
  expect((await formatter.format(str)).data)?.toContain("This is a test");
});

test("Without the @debug directive, #debug block is removed", async () => {
  expect(
    await (
      await formatter.format("#debug{\nThis should be removed!\n}")
    ).data?.trim()
  ).toEqual("");
});

test("Headers and footers render in the file.", async () => {
  const { data } = await formatter.format(
    "#header foobar=baz\n#footer footer=footer\n"
  );
  expect(data).toContain("@@ foobar: baz");
  expect(data).toContain("@@ footer: footer");
});

test("#include pulls in a github archive", async () => {
  expect(
    (await formatter.format("#include git:lcanady/archive-test")).data!
  ).toContain("file 4!");
});

test("@defines are replaced", async () => {
  expect(
    (
      await formatter.format(`
@define @test (.*) {
  This is a $1 
}

@test Foobar
    `)
    ).data!
  ).toEqual("This is a Foobar");
});
