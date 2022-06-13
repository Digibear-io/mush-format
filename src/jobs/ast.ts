import { Context, Next } from "../formatter";

export default (ctx: Context, next: Next) => {
  ctx.output.replace(/[@\+&]?.*\s*=.*/gi, (...args: string[]) => {
    const prettify = (string: string, idx = 0) => {
      if (!string.length) return "";
      let str = string;
      let output = "";

      const [fist, ...rest] = str.split("=");
      if (rest) {
        output +=
          fist +
          "=\n" +
          "\\s\\s\\s\\s".repeat(idx) +
          prettify(rest.join("="), idx + 1);
      }

      if (str.startsWith("$"))
        return (output += str.replace(":", ":\n" + "\\s".repeat(idx * 4)));

      output += str[1];
      return (str = str.slice(1));
    };

    console.log(prettify(args[0]));
    return "";
  });
  next();
};
