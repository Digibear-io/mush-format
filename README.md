# MUSH Formatter

![header](mushformatter.jpg)

> This repo is still very much under development. While the API is pretty stable now, minor things are likely to change before the API hits stable `1.0.0`.

a Typescript library designed to take mushcode from something readable to something you can quote directly into your game. See the [Demo](https://format.ursamu.io)!

**Table Of Contents**<br />
[Installation](#install) <br/>
[Usage](#usage) <br />
[CLI](#cli) <br />
[plugins](#plugins) <br />
[Formatting Rules](#formatting-rules) <br />
[Meta Tags](#meta-tags) <br />
[Development](#development)<br />
[Todo](#todo)<br />
[License](#license)

## Install

with your preferred package manager, install the library into your project.

```
npm i @digibear/mush-format

or

yarn add @digibear/mush-format
```

## Usage

```JavaScript
import { formatter } from "@digibear/mush-format";

const code = `
// This line won't render
&command.cmd #123=$things:
  @pemit %#=And Stuff. // this line will be added to the first.`;

formatter(code)
  .then(({data}) => console.log(data))
  .catch(console.error);

// -> &command.cmd #123=$things:@pemit %# = And Stuff.
```

## CLI

Mush-format has a global command avaliable, `mform`. It's able to format a file from the command line.

### Basic Usage

`npm i -g @digibear/mush-format` then `mform --help`

```
Usage: mform [options] [command]

A MUSHcode pre-processor.

Options:
  -V, --version             output the version number
  -h, --help                display help for command

Commands:
  run|r <path>||<project>   run a Project or file.
  github|git <user>/<repo>  Run a github repo.
  init|i <project>          Initialize a new MUSHCode project.
  purge|p <file>            Purge your system of code deltas from diff files.
  help [command]            display help for command
```

### Diffing

`mform` has the ability to just print the differences between two runs of a file. A great tool if you're planning on adding formatting to your development toolchain. You can feed the run command a specific file, or an entire project.

```
mform r -d input.mush

or

mform run --diff  ./project
```

When you run mform it automatically caches your resulting archive for potential comparrison later. To purge a file related to your mushcode archive:

## Plugins

The behavior of the formatter is configurable through the use of plugins.

- `step` - The stage in the formatting process this plugin should be appended to.
  - **pre** Before the formatting process begins.
  - **open** - The first stage of formatting. Opening aditional resources needed.
  - **render** - Render (and define new) tags in the text to be formatted.
  - **compress** - Strip formatting and compress the text down.
  - **post** - After the formatting is complete.
- `async run(context, next)` - The body of the plugin.
  - **`context`** is passed from the formatter, and contains a snapshot of the current program state.
    - `debug?: Boolean` An indicator for `#debug` meta-tag evaluation.
    - `input: string` The original text
    - `scratch?:` Random formatter storage object
      - `current: string` The current edit of the data code.
      - `[k: string]: any`
    - `headers?: Map<string, any>` Headers to include
    - `footers?: Map<string, any>` Footers to include
    - `output?: string;` The current state of the formatted text
    - `cache: Map<string, string>`

**`plugin.js`**

```JavaScript
export default (ctx: Context, next: Next) => {
  // Mark the start date/time for the formatter run,
  // and copy the contents of ctx.input into a working
  // temp property on the ctx object.
  ctx.context.scratch.current = `Fortmatter started - ${new Date()}\n` + ctx.input;

next();
}
```

**`index.js`**

```JS
import { formatter } from '@digibear/mush-format';
import startLog from "../plugins/plugin"

// Install any middleware.
formatter.use("pre", startLog);

formatter.format(`
// This is an example file!
&cmd.awesome #134=
  @pemit %#=This is example code!`)
  .then(({data}) => console.log(data))
  .catch((err) => console.error(err));

// -> Formatter started - Tue Oct 20 2020 12:52:23 ...
// -> &cmd.awesome #134=@pemit %#=this is example code!
```

## Formatting Rules

The rules of the game are pretty simple! If the first column of a line isn't a comment, space or newline, it interprets it as the beginning of a line. If your line begins with any of the above things, it'll be removed. An example:

```
// This line won't render
&command.cmd #123 = $things:
  @pemit %#=And Stuff. // this line will be added to the first.

- // A single dash on a line makes an extra return in
  // the compressed code

@@ This comment will appear in the compressed code.
@@ Great for leaving notes in your final compressed code block!
```

Translates to:

```
&command.cmd #123=$things: @pemit %#=And Stuff

@@ This comment will appear in the compressed code.
@@ Great for leaving notes in your final compressed code block!
```

## Meta Tags

Meta tags are a way to add extra functionality to your formatted mushcode scripts. They cover things like importing other files and mushc scripts, to controlling conditional formatting of compile-time commands.

### `#include git[hub]:<user>/<repo>[#branch][/<path>]`

### `#include <URL or Path>`

`#include` allows you to add mushcode contained in a github repo into your code before processing. If path is given with a file name, it will open that file, else it will look for a file called `index.mush` to use as it's starting point from the last given directory, or the base of the project. [Example Repo](https://github.com/lcanady/archive-test.git) for a dummy implementation.

```
#include git:lcanady/archive-test
#include git:lcanady/archive-test#main/code/file1.mush

// ... More code ...
```

### `#file /path/to/file.txt`

This meta-tag will import a file like `#include` but will add mush comments `@@` to every line, making a note for anyone reading through your compressed code source. This is great for offering things like install instructions, and licenses.

**`text.txt`**

```
This is a test file.
It's a multi-line file.
```

**`index.mush`**

```
#file ./text.txt
```

**results**

```
@@ This is a test file.
@@ It's a multi-line file.
```

### `@define`(Coming Soon)

`@define` allows you to save a few keystrokes, and `@define` your own directives Defines, when used later, will be replaced with whatever code you give them. Just remember! Defines follow the same basic formatting rules. Any time line starts with anything other than a space - it counts as a new command.

`Tests` are regular expressions as strings. This means that spaces should be entered as a space " ".

```
@define @te[st]+ (.*) {
think This is a
  test:
  $1
}

@test Foo
```

Then later, when the formatter is run, the above example becomes:

```
think This is a test: Foo
```

### `@debug`

The `@debug` directive tells the preprocessor that you would like to include any `#debug {}` meta-tags. The closing curly-brace `}` of the `#debug` block must be on it's own line, as the first character or else it won't be recognized.

```
@debug

// ...

#debug {

think %chThis will be included in the processed code!%cn

} // Make sure the closing curly-brace is the first character on
  // a new line!
```

### `@installer`(Coming Soon)

The `@installer` directive creates an installer script that includes verification for objects, attributes, tags, flags, and totems. Instead of that random 'Huh?' message, the install script offers a useful error.

```
@installer

// ...

@create Test Object <TO>;

// -> @create Test Object <TO>;
// -> think %ch%cyMush-Format >> %cnCreated Object: %chFoobar [if(match(lastcreate(me, t), Foobar),%ch%cG PASS %cn,%ch%cR FAIL %cn)]

```

## Development

To setup `mush-format` in your own development enviornment, there are a few easy steps!

```
git clone https://github.com/digibear-io/mush-format.git
cd mush-format
npm install
npm run build
```

And you're ready to start coding!

### Todo

- [x] Add #include for local repos.
- [x] Add #define support.
- [x] Mushcode Archive initializer.
- [ ] Complete purge sub-command.
- [x] Complete GitHub sub-command.
- [ ] Add Installer mode.
- [x] Add @debug functionality

## License

MIT
