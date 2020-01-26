import { FormatData, Next } from "../formatter";

export default (data: FormatData, next: Next) => {
  data.output = data
    .scratch!.current.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, " ") // remove comments
    .replace(/^#.*/gim, "") // remove unevaluated tags.
    .split("\n")
    .filter(Boolean)
    .reduce((acc: string, curr: string) => {
      curr.match(/^[^\s]/) // Does line start with a NOT space?
        ? (acc += "\n" + curr.trim())
        : (acc += " " + curr.trim());
      return acc;
    }, "")
    .replace(/\s\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\)\s+\)/g, "))")
    .replace(/\s+?=\s+?|=\s+?/g, "=")
    .replace(/\]\s+\)/g, "])")
    .replace(/\]\s?\[/g, "][")
    .replace(/\s?%([rt])\s?/g, "%$1");
  return next(null, data);
};
