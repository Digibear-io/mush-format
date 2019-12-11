import open from "./jobs/open";
import render from "./jobs/render";
import compress from "./jobs/compress";

export interface FormatData {
  input: string;
  scratch?: { [k: string]: any };
  headers?: Object[];
  footers?: Object[];
  output?: string;
  cache: Map<string, any>;
}

export type Next = (
  err: Error | null,
  data?: FormatData
) => Promise<FormatData | Error | void>;

export type Layer = (
  data: FormatData,
  next: Next
) => Promise<FormatData | Error | void>;

const format = async (text: string) => {
  const stack = new Map();

  // Preload the categories
  stack.set("pre", []);
  stack.set("open", []);
  stack.set("render", []);
  stack.set("compress", []);
  stack.set("post", []);

  /**
   * Add a new Job(layer) pmtp tje stack.
   * @param step The current step to add the job to.
   * @param layer The job to be added
   */
  const use = (step: string, layer: Layer): void => stack.get(step).push(layer);

  // install the middleware
  use("open", open);
  use("render", render);
  use("compress", compress);

  /**
   * Process the indivitual steps of the formatter.
   * @param step The current step.
   * @param data The formatting data passed between steps.
   */
  const process = async (step: string, data: FormatData) => {
    let idx = 0;

    const next = async (
      err: Error | null,
      data?: FormatData
    ): Promise<FormatData | Error | void> => {
      if (err) return Promise.reject(err);
      if (idx >= stack.get(step).length) return Promise.resolve(data);

      const layer = stack.get(step)[idx++];
      await layer(data, next).catch((err: Error) => next(err));
    };

    await next(null, data);
  };

  const data: FormatData = {
    cache: new Map(),
    input: text,
    output: "",
    scratch: {},
    headers: [],
    footers: []
  };

  // Okay, passing data around here and mutating it.  I'm sure
  // there's a more elegant way, but this'll work for now!
  await process("pre", data);
  await process("open", data);
  await process("render", data);
  await process("compress", data);
  await process("post", data);

  return data.output!.trim();
};

export default format;
