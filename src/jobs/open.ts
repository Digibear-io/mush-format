import { FormatData, Next } from "../formatter";

export default (data: FormatData, next: Next) => next(null, data);
