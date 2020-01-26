export interface FormatData {
    input: string;
    scratch?: {
        [k: string]: any;
    };
    headers?: Object[];
    footers?: Object[];
    output?: string;
    cache: Map<string, any>;
}
export declare type Next = (err: Error | null, data?: FormatData) => Promise<FormatData | Error | void>;
export declare type Layer = (data: FormatData, next: Next) => Promise<FormatData | Error | void>;
export declare function format(text: string): Promise<string>;
