#!/usr/bin/env node

const { program } = require("commander");
const { formatter } = require("../dist/formatter");

program.parse(process.argv);
formatter
  .format("#include git:" + program.args[0])
  .then((data) => console.log(data));
