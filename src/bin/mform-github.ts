#!/usr/bin/env node

import { program } from "commander";
import { formatter } from "../formatter";

program.parse(process.argv);

(async () => {
  if (program.args[0]) {
    const { data } = await formatter.format("#include git:" + program.args[0]);
    console.log(data);
  }
})();
