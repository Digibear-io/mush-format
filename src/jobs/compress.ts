import { FormatData, Next } from "../formatter";

export default (data: FormatData, next: Next) => {
  data.output = data.scratch.current
    ?.replace(/^\/\*[\s\S]*?\*\/[\s\S]+?$|([^:]|^)\/\/.*$/gm, " ") // remove comments
    .replace(/^#.*/gim, "") // remove unevaluated tags.
    .split("\n")
    .filter(Boolean)
    .reduce((acc: string, curr: string) => {
      curr.match(/^\s/g) // Does line start with a NOT space?
        ? (acc += " " + curr)
        : (acc += "\n" + curr);
      return acc;
    }, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\)\s+\)/g, "))")
    .replace(/\s+?=\s+?|=\s+?/g, "=")
    .replace(/\]\s+\)/g, "])")
    .replace(/\]\s?\[/g, "][")
    .replace(/\s?%([rt])\s?/g, "%$1")
    .replace(/\n-/g, "\n");

  next();
};
