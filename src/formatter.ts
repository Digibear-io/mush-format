import open from "./jobs/open";
import render from "./jobs/render";
import compress from "./jobs/compress";
import pipeline, { Next, Pipe } from "./middleware";

export type Step = "pre" | "open" | "render" | "compress" | "post";
("");
export interface Plugin {
  step: Step;
  run: (data: FormatData, next: Next) => Promise<void>;
}

export interface FormatData {
  input: string;
  scratch: { [k: string]: any };
  headers: Object[];
  footers: Object[];
  output: string;
  cache: Map<string, any>;
}

export interface FormatOptions {
  plugins?: Plugin[];
}

export async function format(text: string, { plugins }: FormatOptions = {}) {
  const stack = new Map<Step, Pipe<FormatData>>();

  // Preload the categories
  stack.set("pre", pipeline<FormatData>());
  stack.set("open", pipeline<FormatData>());
  stack.set("render", pipeline<FormatData>());
  stack.set("compress", pipeline<FormatData>());
  stack.set("post", pipeline<FormatData>());

  /**
   * Add a new Job(layer) pmtp tje stack.
   * @param step The current step to add the job to.
   * @param layer The job to be added
   */

  // install the middleware
  stack?.get("open")?.use(open);
  stack?.get("render")?.use(render);
  stack?.get("compress")?.use(compress);

  // Install plugins
  if (plugins) {
    for (const plugin of plugins) {
      stack?.get(plugin.step)?.use(plugin.run);
    }
  }

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
  await stack.get("open")?.execute(data);
  await stack.get("render")?.execute(data);
  await stack.get("compress")?.execute(data);
  await stack.get("post")?.execute(data);

  return data?.output;
}

export { Next };
