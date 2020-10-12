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

  data.scratch.current = data.input.replace(
    /^#footer\s+(.*)\s?=\s?(.*)/gim,
    (...args) => {
      data.footers!.push({ name: args[1], value: args[2] });
      return "";
    }
  );

  next();
};
