import { FormatData, Next } from "../formatter";

export default (data: FormatData, next: Next) => {
  data.scratch.current = data.input;

  next();
};
