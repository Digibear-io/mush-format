import open from "./jobs/open";
import render from "./jobs/render";
import compress from "./jobs/compress";
import pipeline, { Middleware, Next, Pipe } from "./middleware";

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
  scratch: { [k: string]: any };
  debug?: boolean;
  headers: Header[];
  footers: Header[];
  output: string;
  cache: Map<string, any>;
}

export default class Formatter {
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
    this.stack.get("render")?.use(render);
    this.stack.get("compress")?.use(compress);
  }

  /**
   * Add a new Job(layer) pmtp tje stack.
   * @param step The current step to add the job to.
   * @param layer The job to be added
   */

  async format(text: string) {
    const ctx: Context = {
      cache: new Map(),
      input: text,
      output: "",
      scratch: {},
      headers: [],
      footers: [],
    };

    // Okay, passing data around here and mutating it.  I'm sure
    // there's a more elegant way, but this'll work for now!
    await this.stack.get("pre")?.execute(ctx);
    await this.stack.get("open")?.execute(ctx);
    await this.stack.get("render")?.execute(ctx);
    await this.stack.get("compress")?.execute(ctx);
    await this.stack.get("post")?.execute(ctx);

    ctx.output =
      ctx.headers
        .map((header) => `@@ ${header.name}: ${header.value}`)
        .join("\n") +
      "\n" +
      ctx.output;

    ctx.output =
      ctx.output +
      "\n\n" +
      ctx.footers
        .map((footer) => `@@ ${footer.name}: ${footer.value}`)
        .join("\n");

    return ctx.output;
  }

  use(step: Step, ...plugins: Middleware<Context>[]) {
    this.stack.get(step)?.use(...plugins);
    return this;
  }
}

export { Next };
