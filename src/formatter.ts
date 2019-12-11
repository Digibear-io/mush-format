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

(async () =>
  console.log(
    await format(`/*
#############################################################################
  Global Room Parent
#############################################################################

  Basic setup for allowing Json code to co-exist with mush friendly
  formatting.  This code needs to be applied to your global parent room
  to work.  You'll more than likely need to change the dbref I'm uding here.
  
=============================================================================

  Format the description of the room to either show either plain text or
  JSON data for the web client.

-----------------------------------------------------------------------------
*/
&formatdesc #0=
  [if(
    hasflag(%#,json),
    %{
      "enabled": true%, 
      "type": "room"%,
      "exits": "[lexits(%!,|,1)]"%,
      "id": ""%, 
      "img": "[get(%!/img)]"%, 
      "name": "[name(%!)]"%, 
      "desc": "[encode64(%0)]" 
    %}, %0
  )]

/*
-----------------------------------------------------------------------------
  
  @nameformat
  
  If the player has the JSON flag set, hide the name, if not show per
  normal based on flags.

-----------------------------------------------------------------------------
*/

@nameformat #0=
  [if(hasflag(%#,json),,
    if(
      orflags(%#,iWa),
      [cname(%!)]%(%![flags(%!)]%),
      [cname(%!)]
    )
  )]
  
/*
-----------------------------------------------------------------------------
  
  @exitformat
  
  If the player has the JSON flag set, hide the exit list, else show per
  normal.

-----------------------------------------------------------------------------
*/  
@exitformat #0=
  [setq(0,%chObvious Exits:%cn%r[iter(lexits(me), cname(##))]%b)]
  [if(hasflag(%#,json),,%q0)]
  

/*
-----------------------------------------------------------------------------
  
  @conformat
  
  If the player has the JSON flag set, hide the contents, if not show per
  normal based on flags.

-----------------------------------------------------------------------------
*/    
@conformat #0=
  [setq(0,
    %chContents%cn:
    [iter(
      lcon(me, visible),
      if(
        orflags(%#,iWa),
        %r[cname(##)]%(##[flags(##)]%),
        %r[cname(##)]
      )
    )]
  )]
  [if(hasflag(%#,json),,%q0)]
`)
  ))();
