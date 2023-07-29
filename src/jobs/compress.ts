import { Context, Next } from "../formatter";
import { replaceDefines } from "../utils/replaceDefines";

export default (ctx: Context, next: Next) => {
  // Remove comments and unevaluated tags
  ctx.scratch.current = ctx.scratch
    .current!.replace(/^#[^\n]*$/gm, "") // remove comments that start with // or #
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//gm, "") // remove comments that start with /*
    .replace(/\n+/g, "\n")
    .split("\n")
    .reduce((acc: string, curr: string) => {
      if (curr.startsWith("@@")) {
        acc += "\n" + curr;
      } else if (curr.match(/^[ \t]+/)) {
        acc += curr.trimStart();
      } else {
        acc += "\n" + curr;
      }
      return acc;
    }, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n-/g, "\n");

  // Replace defines
  ctx.scratch.current = replaceDefines(ctx, ctx.scratch.current);
  ctx.output = replaceDefines(ctx, ctx.scratch.current);

  next();
};
