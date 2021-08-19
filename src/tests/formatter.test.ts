/// <reference types="jest" />
import { formatter } from "../formatter";

test("Return a string.", async () => {
  const { data } = await formatter.format("This is a test");
  expect(data).toMatch("This is a test");
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
