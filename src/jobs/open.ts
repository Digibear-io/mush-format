import { readFileSync } from "fs";
import { existsSync } from "fs";
import _fetch from "isomorphic-fetch";
import { dirname, join, resolve } from "path";
import replace from "string-replace-async";
import validURL from "valid-url";

import { Context, Next } from "../formatter";

export default async (ctx: Context, next: Next) => {
  const read = async (path: string): Promise<string | undefined> => {
    // first we check if the path is a url.
    if (validURL.isUri(path)) {
      // if it is, we fetch the file and return the contents.
      const response = await _fetch(path);
      ctx.scratch.base = dirname(path);
      return scan(await response.text());
    }

    // if the file path starts with a dot, or we resolve it relative to the current file.
    if (path.startsWith(".") || path.startsWith("/")) {
      path = join(ctx.scratch.base, path);

      if (validURL.isUri(path)) {
        // if it is, we fetch the file and return the contents.
        const response = await _fetch(path);
        ctx.scratch.base = dirname(path);
        return scan(await response.text());
      }

      // if it's not a file or a url, we return undefined.
      throw new Error(`File not found: ${path}`);
    }
  };

  // Scan for includes and open the the file.
  async function scan(text: string) {
    // Open files
    let results = await replace(
      text,
      /#file\s+?(.*)/gi,
      async (...args: string[]) => {
        const res = (await read(args[1])) || "";
        if (res) {
          return (
            "\n-\n" +
            res
              .trim()
              .split("\n")
              .map((line) => `@@ ${line}`)
              .join("\n") +
            "\n-\n"
          );
        }

        return "";
      }
    );

    return await replace(
      results,
      /#include\s+(.*)/g,
      async (...args: string[]) => {
        return (await read(args[1])) || "";
      }
    );
  }

  ctx.scratch.current = "";
  ctx.scratch.current = await scan(ctx.input);
  ctx.combined = ctx.scratch.current;
  ctx.scratch.data = ctx.scratch.current;
  next();
};
