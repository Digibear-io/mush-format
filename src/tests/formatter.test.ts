/// <reference types="jest" />
import { join } from "path";
import { formatter } from "../formatter";

test("Return a string.", async () => {
  const { data } = await formatter.format("This is a test");
  expect(data).toMatch("This is a test");
});

test("format a file from a subdirectory.", async () => {
  expect(
    (await formatter.format("./tests/mocks/code.mu", join(__dirname, "../")))
      .data
  ).toMatch("&cmd.foo #dbref = $+foo *:@pemit %#= Foo %0;");
});

test("Add a plugin.", async () => {
  expect(
    (
      await formatter
        .use("pre", (ctx, next) => {
          ctx.input = "@@TEST\n" + ctx.input;
        })
        .format("This is a test!")
    ).data
  ).toMatch(/@@TEST/g);
});
