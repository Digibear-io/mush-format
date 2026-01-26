import { Context, Next } from "../formatter";

export default (ctx: Context, next: Next) => {
  // look for object @create entries. If installer is true, add a test.
  ctx.output = ctx.output.replace(/@create\s+(.*)/gi, (...args: string[]) => {
    if (ctx.installer) {
      return (
        `${args[0]}\n` +
        `think %ch%cyformat >> %cnCreated Object: %ch${args[1]} ` +
        `[if(match(lastcreate(me, t), ${args[1]}),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`
      );
    }
    return args[0];
  });

  // look for object &attribute entries. If installer is true, add a test.
  ctx.output = ctx.output.replace(/&(.*)\s+?(.*)/gi, (...args: string[]) => {
    if (ctx.installer) {


      return (
        `${args[0]}\n` +
        `think %ch%cyformat >>%cn Created command '%ch${args[1]
          .trim()
          .toUpperCase()}%cn' on '%ch${args[2].trim()}%cn' [if(hasattr(${args[2].trim()}, ${args[1].trim()}),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`
      );
    }
    return args[0];
  });

  // look for room @dig entries. If installer is true, add a test.
  ctx.output = ctx.output.replace(/@dig\s+(.*)/gi, (...args: string[]) => {
    if (ctx.installer) {
      const room = args[1].split("=")[0];
      return (
        `${args[0]}\n` +
        `think %ch%cyformat >> %cnCreated Room: %ch${room} ` +
        `[if(match(lastcreate(me, r), ${room}),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`
      );
    }
    return args[0];
  });

  // look for room @open entries. If installer is true, add a test.
  ctx.output = ctx.output.replace(/@open\s+(.*)/gi, (...args: string[]) => {
    if (ctx.installer) {
      const exit = args[1].split("=")[0].split(";")[0];
      return (
        `${args[0]}\n` +
        `think %ch%cyformat >> %cnCreated Exit: %ch${exit} ` +
        `[if(match(lastcreate(me, e), ${exit}),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`
      );
    }
    return args[0];
  });

  // look for object @tag messages.  If installer is true, add a test.
  ctx.output = ctx.output.replace(
    /@tag\/add\s+(.*)\s*?=\s*?(.*)/gi,
    (...args: string[]) => {
      if (ctx.installer) {
        return (
          `${args[0]}\n` +
          `think %ch%cyformat >> %cn@tag Created: %ch${args[1]} ` +
          `[if(strlen(tagmatch(${args[1]})),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`
        );
      }

      return args[0];
    }
  );

  // look for flags.  If installer is true, add a test.
  ctx.output = ctx.output.replace(
    /@set\s+(.*)\s*?=\s*?(.*)/gi,
    (...args: string[]) => {
      if (ctx.installer) {
        const tests = args[2]
          .trim()
          .split(" ")
          .map((flag) => {
            if (flag.startsWith("!")) {
              return `think %ch%cyformat >>%cn Flag '%ch${flag
                .slice(1)
                .toLowerCase()}%cn' removed from %ch[name(*${args[1].trim()})]%cn [if(not(hasflag(*${args[1].trim()}, ${flag
                .slice(1)
                .toLowerCase()})),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`;
            }

            return `think %ch%cyformat >>%cn Flag '%ch${flag}%cn' added to %ch[name(*${args[1].trim()})]%cn [if(hasflag(*${args[1].trim()}, ${flag}),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`;
          })
          .join("\n");

        return `${args[0]}\n` + tests;
      }

      return args[0];
    }
  );

  // look for toggles.  If installer is true, add a test.
  ctx.output = ctx.output.replace(
    /@toggle\s+(.*)\s*?=\s*?(.*)/gi,
    (...args: string[]) => {
      if (ctx.installer) {
        const tests = args[2]
          .trim()
          .split(" ")
          .map((flag) => {
            if (flag.startsWith("!")) {
              return `think %ch%cyformat >>%cn Toggle '%ch${flag
                .slice(1)
                .toLowerCase()}%cn' removed from %ch[name(*${args[1].trim()})]%cn [if(not(hastoggle(*${args[1].trim()}, ${flag
                .slice(1)
                .toLowerCase()})),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`;
            }

            return `think %ch%cyformat >>%cn Toggle '%ch${flag}%cn' added to %ch[name(*${args[1].trim()})]%cn [if(hastoggle(*${args[1].trim()}, ${flag}),%ch%cG PASS %cn,%ch%cR FAIL %cn)]`;
          })
          .join("\n");

        return `${args[0]}\n` + tests;
      }
      return args[0];
    }
  );

  // Add headers.
  ctx.output =
    ctx.headers
      .map((header) => `@@ ${header.name}: ${header.value}`)
      .join("\n") +
    "\n" +
    ctx.output;

  // Add footers.
  ctx.output =
    ctx.output +
    "\n\n" +
    ctx.footers
      .map((footer) => `@@ ${footer.name}: ${footer.value}`)
      .join("\n");

  if (ctx.installer) {
    ctx.output = "@set me=quiet\n" + ctx.output.trim();
    ctx.output = ctx.output + "\n" + "@set me=!quiet\n";
  }
  next();
};
