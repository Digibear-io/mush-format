/// <reference types="jest" />
import Formatter from "../formatter";

const formatter = new Formatter();

test("Create a new formatter Object.", () =>
  expect(new Formatter()).toBeInstanceOf(Formatter));

test("Return a string.", async () => {
  expect(await formatter.format("This is a test")).toMatch("This is a test");
});

test("Add a plugin.", async () => {
  expect(
    await formatter
      .use("pre", (ctx, next) => {
        ctx.input = "@@TEST\n" + ctx.input;
      })
      .format("This is a test!")
  ).toMatch(/@@TEST\n/g);
});
