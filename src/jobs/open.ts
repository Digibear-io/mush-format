import _fetch from "isomorphic-fetch";
import replace from "string-replace-async";

import { FormatData, Next } from "../formatter";
import { validURL } from "../utilities";

export default async (data: FormatData, next: Next) => {
  // Replace all references of #insert with compiled files recursively.

  const replaceInclude = async (str: string) => {
    return await replace(
      str,
      /#include\s+(.*)/g,
      async (...args: string[]) => (await fetchURL(args[1])) || ""
    );
  };

  // If it's a valid URL, then replace with the contents from a
  // get request.
  async function fetchURL(url: string) {
    // Make sure the URL is valid.
    url = url.toLowerCase();
    if (validURL(url)) {
      if (!data.cache.has(url)) {
        data.cache.set(url, (await (await _fetch(url)).text()) || "");
        data.scratch.base = url.substring(0, url.lastIndexOf("/")) + "/";
        return data.cache.get(url);
      }
    } else {
      // Else it's probably in the same directory.
      // try to grab it.
      url = new URL(url, data.scratch.base).toString();
      if (validURL(url)) {
        if (!data.cache.has(url.toLowerCase())) {
          data.cache.set(url.toLowerCase(), await (await _fetch(url)).text());
          data.scratch.base = url.substring(0, url.lastIndexOf("/")) + "/";
          return data.cache.get(url) || "";
        }
      }
    }

    return "";
  }

  data.scratch.current = await replace(
    data.input,
    /#include\s+?(.*)/g,
    async (...args: string[]) => {
      const response = await replaceInclude(await fetchURL(args[1]));
      return response || "";
    }
  );

  next();
};
