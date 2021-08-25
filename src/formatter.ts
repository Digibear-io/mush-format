import open from "./jobs/open";
import render from "./jobs/render";
import compress from "./jobs/compress";
import post from "./jobs/post";
import pipeline, { Middleware, Next, Pipe } from "./middleware";
import defines from "./jobs/@define";

export type Step = "pre" | "open" | "render" | "compress" | "post";
export type Plugin = (
  step: Step,
  context: Context,
  next: Next
) => Promise<void>;

export interface Header {
  name: string;
  value: string;
}

export interface Context {
  input: string;
  path: string;
  scratch: { [k: string]: any; current?: string };
  debug?: boolean;
  installer?: boolean;
  defines?: Map<RegExp, string>;
  headers: Header[];
  footers: Header[];
  output: string;
  combined: string;
  cache: Map<string, any>;
}

export class Formatter {
  plugins: Middleware<Context>[];
  stack: Map<string, Pipe<Context>>;

  constructor() {
    this.stack = new Map<Step, Pipe<Context>>();
    // Preload the categories
    this.stack.set("pre", pipeline<Context>());
    this.stack.set("open", pipeline<Context>());
    this.stack.set("render", pipeline<Context>());
    this.stack.set("compress", pipeline<Context>());
    this.stack.set("post", pipeline<Context>());
    this.plugins = [];

    // install the middleware
    this.stack.get("open")?.use(open);
    this.stack.get("render")?.use(defines, render);
    this.stack.get("compress")?.use(compress);
    this.stack.get("post")?.use(post);
  }

  /**
   * Add a new Job(layer) pmtp tje stack.
   * @param step The current step to add the job to.
   * @param layer The job to be added
   */

  async format(text: string, path = "") {
    const ctx: Context = {
      cache: new Map(),
      input:
        "https://gist.githubusercontent.com/lcanady/31040f10aa3223cc4f111998225e98fd/raw/a9403c34ab246ce58939e08cde73b7c03414488c/randomDefines.mu\n" +
        text,
      path,
      output: "",
      combined: "",
      defines: new Map(),
      scratch: {},
      headers: [],
      footers: [],
    };

    // Okay, passing data around here and mutating it.  I'm sure
    // there's a more elegant way, but this'll work for now!
    try {
      await this.stack.get("pre")?.execute(ctx);
      await this.stack.get("open")?.execute(ctx);
      await this.stack.get("render")?.execute(ctx);
      await this.stack.get("compress")?.execute(ctx);
      await this.stack.get("post")?.execute(ctx);
    } catch (error) {
      console.log("Error: Unable to process requested file.\nErrpr: " + error);
    }

    return {
      data: ctx.output.trim(),
      combined: ctx.combined.trim(),
    };
  }

  use(step: Step, ...plugins: Middleware<Context>[]) {
    this.stack.get(step)?.use(...plugins);
    return this;
  }
}

export const formatter = new Formatter();

formatter.format("&foo $.fo = \n bar").then(({ data }) => console.log(data));

export { Next };
