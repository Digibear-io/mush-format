import { Context } from "../formatter";

export function replaceDefines(ctx: Context, text: string) {
  ctx.defines?.forEach((v, k) => {
    text = text.replace(k, (...args: string[]) => {
      let registers = args;
      // Search through the value string for registers and replace.
      return v.replace(/\$([0-9])/g, (...args) => {
        if (registers[parseInt(args[1])]) {
          return registers[parseInt(args[1])].trim();
        } else {
          return "";
        }
      });
    });
  });

  return text;
}
