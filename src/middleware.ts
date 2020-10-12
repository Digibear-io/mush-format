export type Next = () => Promise<void> | void;
export type Middleware<T> = (context: T, next: Next) => Promise<void> | void;
export type Pipe<T> = {
  use: (...middlewares: Middleware<T>[]) => void;
  execute: (context: T) => Promise<void>;
};

export default function Pipe<T>(...middlewares: Middleware<T>[]): Pipe<T> {
  const stack: Middleware<T>[] = middlewares;

  const use: Pipe<T>["use"] = (...middlewares) => {
    stack.push(...middlewares);
  };

  const execute: Pipe<T>["execute"] = async (context) => {
    let prevIndex = -1;

    const runner = async (index: number): Promise<void> => {
      if (index === prevIndex) {
        throw new Error("next() already called.");
      }

      prevIndex = index;

      const middleware = stack[index];

      if (middleware) {
        await middleware(context, () => runner(index + 1));
      }
    };
    await runner(0);
  };

  return { use, execute };
}
