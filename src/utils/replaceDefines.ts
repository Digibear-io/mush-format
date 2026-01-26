import { Context } from "../formatter";

export function replaceDefines(ctx: Context, text: string) {
  ctx.defines?.forEach((v, k) => {
    text = text.replace(k, (...args: string[]) => {
      let registers = args;
      // Search through the value string for registers and replace.
      return v.replace(/\$([0-9])/g, (...args) => {
        const val = registers[parseInt(args[1])];
        if (typeof val === "string") {
          return val.trim();
        } else if (typeof val === "number") {
             // likely offset, return as string? 
             // Or maybe we shouldn't allow $OFFSET unless asked?
             // Usually $0-$N are captures. Offset is N+1.
             return String(val);
        } else {
          return "";
        }
      });
    });
  });

  return text;
}
