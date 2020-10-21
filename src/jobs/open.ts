import _fetch from "isomorphic-fetch";
import replace from "string-replace-async";

import { Context, Next } from "../formatter";
import { validURL } from "../utilities";

export default async (ctx: Context, next: Next) => {
  // Replace all references of #insert with compiled files recursively.

  const read = async (path: string): Promise<string | undefined> => {
    const match = path.match(/gi[thub]+:\s+?(.*)\/(.*)$/i);

    try {
      // Check to see if it's a github link
      if (match) {
        // If yes, set the base directory, and pull the first file from
        // the github repo. Cache the results.

        ctx.scratch.base = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/main/`;
        if (validURL(`${ctx.scratch.base}/index.mush`)) {
          const results = await _fetch(`${ctx.scratch.base}/index.mush`);
          if (!ctx.cache.has(`${ctx.scratch.base}/index.mush`)) {
            // Save the file to the cache.
            const text = await results.text();
            ctx.cache.set(`${ctx.scratch.base}/index.mush`, text);

            // scan the file for more includes.
            return scan(text);
          }
        }
      } else {
        // If No, check to see if if fetching the file with the base
        // directory works.

        const url = new URL(path, ctx.scratch.base).toString();
        if (validURL(url)) {
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
    } catch {}
  };

  // Scan for includes and open the the file.
  function scan(text: string) {
    return replace(text, /#include\s+?(.*)/g, async (...args: string[]) => {
      return (await read(args[1])) || "";
    });
  }

  // Kick off the recursive loop.
  ctx.scratch.current = await scan(ctx.input);

  next();
};
