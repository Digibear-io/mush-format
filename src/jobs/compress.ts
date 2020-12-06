import { Context, Next } from "../formatter";

export default (ctx: Context, next: Next) => {
  ctx.output = ctx.scratch.current
    ?.replace(/^\/\*[\s\S]*?\*\/[\s\S]*?$|([^:]|^)\/\/.*$/gm, " ") // remove comments
    .replace(/^#.*/gim, "") // remove unevaluated tags.
    .split("\n")
    .filter(Boolean)
    .reduce((acc: string, curr: string) => {
      curr.match(/^[ \t]+/) // Does line start with a space?
        ? (acc += curr.trimLeft())
        : (acc += "\n" + curr);
      return acc;
    }, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n-/g, "\n");

  next();
};
