import { FormatData, Next } from "../formatter";

export default (data: FormatData, next: Next) => {
  data.output = data.scratch.current
    ?.replace(/^\/\*[\s\S]*?\*\/[\s\S]*?$|([^:]|^)\/\/.*$/gm, " ") // remove comments
    .replace(/^#.*/gim, "") // remove unevaluated tags.
    .split("\n")
    .filter(Boolean)
    .reduce((acc: string, curr: string) => {
      curr.match(/^\s+/) // Does line start with a space?
        ? (acc += curr.trimLeft())
        : (acc += "\n" + curr);
      return acc;
    }, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n-/g, "\n");

  next();
};
