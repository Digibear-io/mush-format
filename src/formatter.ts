import open from "./jobs/open";
import render from "./jobs/render";
import compress from "./jobs/compress";
import pipeline, { Middleware, Next, Pipe } from "./middleware";

export type Step = "pre" | "open" | "render" | "compress" | "post";
export type Plugin = (
  step: Step,
  context: FormatData,
  next: Next
) => Promise<void>;

export interface FormatData {
  input: string;
  scratch: { [k: string]: any };
  debug?: boolean;
  headers: Object[];
  footers: Object[];
  output: string;
  cache: Map<string, any>;
}

export default class Formatter {
  plugins: Middleware<FormatData>[];
  stack: Map<string, Pipe<FormatData>>;

  constructor() {
    this.stack = new Map<Step, Pipe<FormatData>>();
    // Preload the categories
    this.stack.set("pre", pipeline<FormatData>());
    this.stack.set("open", pipeline<FormatData>());
    this.stack.set("render", pipeline<FormatData>());
    this.stack.set("compress", pipeline<FormatData>());
    this.stack.set("post", pipeline<FormatData>());
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
    const data: FormatData = {
      cache: new Map(),
      input: text,
      output: "",
      scratch: {},
      headers: [],
      footers: [],
    };

    // Okay, passing data around here and mutating it.  I'm sure
    // there's a more elegant way, but this'll work for now!
    await this.stack.get("pre")?.execute(data);
    await this.stack.get("open")?.execute(data);
    await this.stack.get("render")?.execute(data);
    await this.stack.get("compress")?.execute(data);
    await this.stack.get("post")?.execute(data);

    return data?.output;
  }

  use(step: Step, ...plugins: Middleware<FormatData>[]) {
    this.stack.get(step)?.use(...plugins);
    return this;
  }
}

export { Next };
