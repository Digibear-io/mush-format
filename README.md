# MUSH Formatter

![header](mushformatter.jpg)

> This repo is still very much under development. While the API is pretty stable now, minor things are likely to change before the API hits stable `1.0.0`.

a Typescript library designed to take mushcode from something readable to something you can quote directly into your game.

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
import formatter from '@digibear/mush-format'

const code = `
// This line won't render
&command.cmd #123=$things:
  @pemit %#=And Stuff. // this line will be added to the first.`;

formatter
  .format(code)
  .then(results => consile.log(results))
  .catch(error => console.error(error));

// -> &command.cmd #123=$things:@pemit %# = And Stuff.
```

## CLI

Coming soon

## Plugins

The behavior of the formatter is configurable through the use of plugins.

- `step` - The stage in the formatting process this plugin should be appended to.
  - **pre** Before the formatting process begins.
  - **open** - The first stage of formatting. Opening aditional resources needed.
  - **render** - Render (and define new) tags in the text to be formatted.
  - **compress** - Strip formatting and compress the text down.
  - **post** - After the formatting is complete.
- `async run(context, next)` - The body of the plugin.
  - **context** is passed from the formatter, and contains a snapshot of the current program state.
    - `context`
      - `debug?: Boolean` An indicator for `#debug` meta-tag evaluation.
      - `input: string` The original text
      - `scratch?: { [k: string]: any }` Random formatter storage object
      - `headers?: Map<string, any>` Headers to include
      - `footers?: Map<string, any>` Footers to include
      - `output?: string;` The current state of the formatted text
      - `cache: Map<string, string>`
    - `next()` Force the program to move onto the next piece of middleware within the middleware pipeline.

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
import formatter from '@digibear/mush-format';

// Install any middleware.
formatter.use("pre", startlog);

formatter.format(`
// This is an example file!
&cmd.awesome #134=
  @pemit %#=This is example code!`);

// -> Formatter started - Tue Oct 20 2020 12:52:23 GMT-0700 (Pacific Daylight Time)
// -> &cmd.awesome #134=@pemit %#=this is example code!
```

## Formatting Rules

The rules of the game are pretty simple! If the first column of a line isn't a comment, space or newline, it interprets it as the beginning of a line. If your line begins with any of the above things, it'll be removed. An example:

```
// This line won't render
&command.cmd #123 = $things:
  @pemit %#=And Stuff. // this line will be added to the first.
```

Translates to:

```
&command.cmd #123=$things: @pemit %#=And Stuff
```

## Meta Tags

Meta tags are a way to add extra functionality to your formatted mushcode scripts. They cover things like importing other files and mushc scripts, to controlling conditional formatting of compile-time commands.

### `#include git[hub]: <user>/<repo>`

`#include` allows you to add mushcode contained in a github repo into your code before processing. The repo must have a `main` branch with a file named `index.mush` - which will serve as the main entry point for your build. Within the repo you can use relative paths (to remain compatible with building locally). Take a look at my [Example Repo](https://github.com/lcanady/archive-test.git) for a dummy implementation.

```
#include git: lcanady/archive-test

// ... More code ...
```

### `@debug`

The @debug directive tells the preprocessor that you would like to include any `#debug {}` meta-tags. The closing curly-brace `}` of the `#debug` block must be on it's own line, as the first character or else it won't be recognized.

```
@debug

// ...

#debug {

think %chThis will be included in the processed code!%cn

} // Make sure the closing curly-brace is the first character on
  // a new line!
```

### Todo

- [x] Ability to load plugins before running the formatter.
- [x] Clean up Middleware System.
- [x] Add #include tag for github repos.
- [ ] Add #include for local repos.
- [x] Add the ability to read from Github Repos

## License

MIT
