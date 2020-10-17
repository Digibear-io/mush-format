# MUSH Formatter

![header](mushformatter.jpg)

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
[Change Log](#change-log)<br/>
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
&command.cmd #123 = $things:
  @pemit %#=And Stuff. // this line will be added to the first.`;

formatter
  .format(code)
  .then(results => consile.log(results))
  .catch(error => console.error(error));

// -> &command.cmd #123 = $things: @pemit %# = And Stuff.
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
      - `input: string` The original text
      - `scratch?: { [k: string]: any }` Random formatter storage object
      - `headers?: Map<string, any>` Headers to include
      - `footers?: Map<string, any>` Footers to include
      - `output?: string;` The current state of the formatted text
      - `cache: Map<string, string>`
    - `next()` Force the program to move onto the next piece of middleware within the middleware pipeline.

**`plugin.js`**

```JavaScript
export default (ctx, next) => {
  // Mark the start date/time for the formatting job.
  console.log(`Fortmatter started - ${new Date()}`);

  // Copy the raw input to a temp object on scratch to work with.
  context.input = context.scratch.current;

  // Move onto the next process in the middleware pipeline.
  next();
}
```

**`index.js`**

```JS
import startLog from './plugin1';
import formatter from '@digibear/mush-format';

// Install any middleware.
formatter.use("pre", startlog);

formatter.format(`
// This is an example file!
&cmd.awesome #134 =
  @pemit %# = This is example code!`);

// -> &cmd.awesome #134 = @pemit %# = this is example code!
```

## Formatting Rules

The rules of the game are pretty simple. If the first column of a line isn't a comment, space or newline, it interprets it as the beginning of a line. If your line begins with any of the above things, it'll be removed. An example:

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

### Coming Soon

### Todo

- [x] Ability to load plugins before running the formatter.
- [x] Clean up Middleware System.
- [ ] Add support for a format.json repo level config file.
- [x] Add #include tag for github repos.
- [ ] Add #include for local repos.
- [x] Add the ability to read from Github Repos

## License

MIT
