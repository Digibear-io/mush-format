import { readFile } from "fs/promises";
import { existsSync } from "fs";
import _fetch from "isomorphic-fetch";
import { dirname, join } from "path";
import replace from "string-replace-async";
import validURL from "valid-url";

import { Context, Next } from "../formatter";

export default async (ctx: Context, next: Next) => {
  const loadFile = async (filePath: string): Promise<string | undefined> => {
    let fileContents: string | undefined;

    if (validURL.isUri(filePath)) {
      const response = await _fetch(filePath);
      ctx.scratch.base = dirname(filePath);
      fileContents = await scan(await response.text());
    } else {
      const fullPath = join(ctx.scratch.base ?? ctx.path, filePath);

      if (existsSync(fullPath)) {
        ctx.scratch.base = dirname(fullPath);
        fileContents = await scan(await readFile(fullPath, "utf8"));
      } else {
        fileContents = await scan(filePath);
      }
    }

    if (!fileContents) {
      throw new Error(`File not found: ${filePath}`);
    }

    return fileContents;
  };

  async function scan(text: string) {
    let results = await replace(
      text,
      /#file\s+?(.*)/gi,
      async (...args: string[]) => {
        const res = (await loadFile(args[1])) || "";
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

    results = await replace(
      results,
      /#include\s+(.*)/gi,
      async (...args: string[]) => {
        const includedFile = args[1];
        const includedFilePath = join(
          ctx.scratch.base ?? dirname(ctx.path),
          includedFile
        );
        const includedFileContents = await loadFile(includedFilePath);
        if (includedFileContents) {
          return await scan(includedFileContents);
        }

        return "";
      }
    );

    return results;
  }

  ctx.scratch.current = "";
  ctx.scratch.current = await loadFile(ctx.input);
  if (ctx.scratch.current) {
    ctx.combined = ctx.scratch.current;
    ctx.scratch.data = ctx.scratch.current;
  }
  next();
};
