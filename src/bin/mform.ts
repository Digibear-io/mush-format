import commander, { version } from "commander";
import conf from "../../package.json";

commander;
version(conf.version)
  .command("mform <name>")
  .description("Format Mushcode!")
  .option("-i, --input <file>", "Input file")
  .option("-o, --output <file>", "Output file")
  .option("-d, --debug", "Debug mode")
  .action((name, options) => {
    console.log(name);
    console.log(options);
  });
