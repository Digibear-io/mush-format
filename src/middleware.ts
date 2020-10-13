export type Next = () => Promise<any> | any;
export type Middleware<T> = (
  context: T,
  next: Next
) => Promise<void | T> | void | T;
export type Pipe<T> = {
  use: (...middlewares: Middleware<T>[]) => void;
  execute: (context: T) => Promise<void | T>;
};

export default function Pipe<T>(...middlewares: Middleware<T>[]): Pipe<T> {
  const stack: Middleware<T>[] = middlewares;

  const use: Pipe<T>["use"] = (...middlewares) => {
    stack.push(...middlewares);
  };

  const execute: Pipe<T>["execute"] = async (context) => {
    let prevIndex = -1;

    const runner = async (index: number, context: T): Promise<void | T> => {
      if (index === prevIndex) {
        throw new Error("next() already called.");
      }

      if (index === stack.length) return context;

      prevIndex = index;

      const middleware = stack[index];

      if (middleware) {
        await middleware(context, () => runner(index + 1, context));
      }
    };
    const response = await runner(0, context);
    if (response) return response;
  };

  return { use, execute };
}
