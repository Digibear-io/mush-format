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
        : (acc += curr.trim());
      return acc;
    }, "");
  return next(null, data);
};
