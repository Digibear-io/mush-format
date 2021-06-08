import { Context, Next } from "../formatter";

export default (ctx: Context, next: Next) => {
  ctx.scratch.ast = [];
  ctx.output.replace(/[@\+&]?(\w+)\s+(.*)\s*=\s*(.*)/gi, (...args: string[]) => {
    
    return "";
  });

  console.log(ctx.scratch.ast);
};
