import { existsSync, readFileSync } from "fs";
import _fetch from "isomorphic-fetch";
import { dirname, join, resolve } from "path";
import replace from "string-replace-async";
import validURL from "valid-url";

import { Context, Next } from "../formatter";

export default async (ctx: Context, next: Next) => {
  // Replace all references of #insert with compiled files recursively.

  const read = async (path: string): Promise<string | undefined> => {
    const match = path.match(
      /git[hub]*:\s*(\w+)\/([^@\/]+)(?:@([^\/]+))?(?:\/(.*))?/i
    );

    try {
      // Check to see if it's a github link
      if (match) {
        // If yes, set the base directory, and pull the first file from
        // the github repo. Cache the results.

        ctx.scratch.base = encodeURI(
          `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${
            match[3] || "main"
          }/${match[4] || ""}`
        );
        let last = ctx.scratch.base.split("/");
        last = last.pop();
        if (validURL.isWebUri(`${ctx.scratch.base}`) && /\..+$/.test(last)) {
          const results = await _fetch(ctx.scratch.base);
          if (!ctx.cache.has(ctx.scratch.base)) {
            // Save the file to the cache.
            const text = await results.text();
            ctx.cache.set(`${ctx.scratch.base}`, text);

            // scan the file for more includes.
            return scan(text);
          }
        } else {
          const results = await _fetch(`${ctx.scratch.base}/index.mu`);
          if (!ctx.cache.has(`${ctx.scratch.base}/index.mu`)) {
            // Save the file to the cache.
            const text = await results.text();
            ctx.cache.set(`${ctx.scratch.base}/index.mu`, text);

            // scan the file for more includes.
            return scan(text);
          }
        }
      } else {
        // If No, check to see if if fetching the file with the base
        // directory works.

        const url = new URL(path, ctx.scratch.base).toString();
        if (validURL.isWebUri(url)) {
          if (!ctx.cache.has(url)) {
            const results = await _fetch(url);
            const text = await results.text();
            ctx.cache.set(url, text);

            // If yes, recursively check the file for more includes.
            ctx.scratch.base = url.substring(0, url.lastIndexOf("/")) + "/";
            return scan(text);
          } else {
            // Already scanned,  Doesn't need further processing
            ctx.scratch.base = url.substring(0, url.lastIndexOf("/")) + "/";
            return ctx.cache.get(url);
          }
        }
      }
    } catch (error) {
      // If it's not a valid github url, then try using fs.
      try {
        // If the path is actually a file...
        ctx.scratch.base = dirname(resolve(path));
        if (existsSync(resolve(path))) {
          if (!ctx.cache.has(path)) {
            // Save the file to the cache.
            const text = readFileSync(resolve(path), { encoding: "utf-8" });
            ctx.cache.set(ctx.scratch.base, text);

            // scan the file for more includes.
            return scan(text);
          } else {
            // Already scanned, no further action needed.
            ctx.scratch.base = resolve(path);
          }
        } else {
          // Else if it's not a valid path, try joining it with the base directory.
          const altpath = resolve(join(ctx.path, path));
          if (!ctx.cache.has(altpath)) {
            const text = readFileSync(altpath, { encoding: "utf-8" });
            ctx.cache.set(altpath, text);
            ctx.scratch.base = dirname(altpath);
            return scan(text);
          }
        }
      } catch {}
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
      /#include\s+?(.*)/g,
      async (...args: string[]) => {
        return (await read(args[1])) || "";
      }
    );
  }

  // Kick off the recursive loop.
  if (/^http|https/i.test(ctx.input)) ctx.input = "#include " + ctx.input;
  if (/^gi[thub]+.*/i.test(ctx.input)) ctx.input = "#include " + ctx.input;
  ctx.scratch.current = "";
  ctx.scratch.current = await scan(ctx.input);
  ctx.combined = ctx.scratch.current;
  ctx.scratch.data = ctx.scratch.current;
  next();
};
