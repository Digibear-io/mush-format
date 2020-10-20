import { FormatData, Next } from "../formatter";

export default (data: FormatData, next: Next) => {
  // Process headers
  data.scratch.current = data.scratch.current.replace(
    /^#header\s+(.*)\s?=\s?(.*)/gim,
    (...args: string[]) => {
      data.headers!.push({ name: args[1], value: args[2] });
      return "";
    }
  );

  // Process footers
  data.scratch.current = data.scratch.current.replace(
    /^#footer\s+(.*)\s?=\s?(.*)/gim,
    (...args: string[]) => {
      data.footers!.push({ name: args[1], value: args[2] });
      return "";
    }
  );

  // Look for the @debug directive.
  data.scratch.current = data.scratch.current.replace(/@debug/g, () => {
    data.debug = true;
    return "";
  });

  // Expose any debug statements, if debugging is true.
  data.scratch.current = data.scratch.current.replace(
    /#debug\s*?{([\s\S]+)\n}\s*?/gi,
    (...args: string[]) => {
      if (data.debug) return args[1];
      return "";
    }
  );

  next();
};
