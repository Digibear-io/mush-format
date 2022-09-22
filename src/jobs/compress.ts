import { Context, Next } from "../formatter";

export default (ctx: Context, next: Next) => {
  // compression 1
  ctx.scratch.current = ctx.scratch
    .current!.replace(/^\/\*[\s\S]*?\*\/[\s\S]*?$|([^:]|^)\/\/.*$/gm, "") // remove comments
    .replace(/^#.*/gim, "") // remove unevaluated tags.
    .replace(/\n+/g, "\n")
    .split("\n")
    .reduce((acc: string, curr: string) => {
      curr.match(/^[ \t]+/) // Does line start with a space?
        ? (acc += curr.trimStart())
        : (acc += "\n" + curr);
      return acc;
    }, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n-/g, "\n");

  // Replace defines.  This hack lets me have @defines split into multiple lines without having
  // to go through the code line by line.
  ctx.defines?.forEach((v, k) => {
    ctx.scratch.current = ctx.scratch.current?.replace(
      k,
      (...args: string[]) => {
        let registers = args;
        // Search through the value string for registers and replace.
        return v.replace(/\$([0-9])/g, (...args) => {
          if (registers[parseInt(args[1])]) {
            return registers[parseInt(args[1])].trim();
          } else {
            return "";
          }
        });
      }
    );
  });

  // compression 2
  ctx.output = ctx.scratch
    .current!.replace(/^\/\*[\s\S]*?\*\/[\s\S]*?$|^\/\/.*$/gm, "") // remove comments
    .replace(/^#.*/gim, "") // remove unevaluated tags.
    .replace(/\n+/g, "\n")
    .split("\n")
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
