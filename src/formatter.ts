import open from "./jobs/open";
import render from "./jobs/render";
import compress from "./jobs/compress";
import post from "./jobs/post";
import pipeline, { Middleware, Next, Pipe } from "./middleware";
import defines from "./jobs/@define";
import testGen from "./jobs/test-gen";
import docParser from "./jobs/doc-parser";
import linter from "./jobs/linter";
import resolve from "./jobs/resolve";
import template from "./jobs/template";
import install from "./jobs/install";
import agent from "./jobs/agent";

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

export interface Line {
  text: string;
  file: string;
  line: number;
}

export interface Context {
  input: string;
  path: string;
  filename?: string;
  scratch: { [k: string]: any; current?: Line[] | string }; // Allow string for compat during refactor, but aim for Line[]
  debug?: boolean;
  installer?: boolean;
  defines?: Map<RegExp, string>;
  headers: Header[];
  footers: Header[];
  banner?: string | string[];
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
    this.stack.get("render")?.use(agent, resolve, template, testGen, docParser, defines, render);
    this.stack.get("compress")?.use(/* linter, */ compress);
    this.stack.get("post")?.use(install, post);
  }

  /**
   * Add a new Job(layer) pmtp tje stack.
   * @param step The current step to add the job to.
   * @param layer The job to be added
   */

  async format(text: string, path = "", filename?: string, options: { installer?: boolean; banner?: string | string[] } = {}) {
    const ctx: Context = {
      cache: new Map(),
      input: text,
      path,
      filename,
      installer: options.installer,
      banner: options.banner,
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
      ctx.output += "\nError: Unable to process requested file.\n" + error;
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

export { Next };
