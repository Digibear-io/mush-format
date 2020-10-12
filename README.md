# MUSH Formatter

![header](mushformatter.jpg)

a Typescript library designed to take mushcode from something readable to something you can quote directly into your game.

## Install

with npm, save as a dependancy

```
npm i @digibear/mush-format
```

## Usage

- `text: string` The text to be formatted.
- `options: Plugin[]` Optional [plugins](#plugins) that can be included for that run of of the formatter.

```JavaScript
import {format} from '@digibear/mush-format'
import * as plugin from './plugin'
import * as plugin2 from './plugin2'

( async () => {
  console.log(
    await format(`
@nameformat #0=
  [if(hasflag(%#,json),,
   if(
      orflags(%#,iWa),
      [cname(%!)]%(%![flags(%!)]%),
      [cname(%!)]
    )
  )]`,
  {
    plugins: [plugin, plugin2]
  }
    )
  )
})()
  .catch(error => console.log(error));

// -> @nameformat #0=[if(hasflag(%#,json),, if(orflags(%#,iWa), [cname(%!)]%(%![flags(%!)]%), [cname(%!)]))]

```

## Plugins

The behavior of the formatter is configurable through the use of plugins.

- `step` - The stage in the formatting process this plugin should be appended to.
  - **pre** Before the formatting process begins.
  - **open** - The first stage of formatting. Opening aditional resources needed.
  - **render** - Render (and define new) tags in the text to be formatted.
  - **compress** - Strip formatting and compress the text down.
  - **post** - After the formatting is complete.
- `async run(data, next)` - The body of the plugin.
  - **data** is passed from the formatter, and contains a snapshot of the current program state.
    - `data`
      - `input: string` The original text
      - `scratch?: { k: string]: any }` Random formatter storage object
      - `headers?: Map<string, any>` Headers to include
      - `footers?: Map<string, any>` Footers to include
      - `output?: string;` The current state of the formatted text
      - `cache: Map<string, any>`
    - `next(error: Error | null, data)`
      - **error** A posisble error object. If there is no error it must be set null.

```JavaScript
// -- plugin1.js
export const step = "pre";

export function run(data, next) {
  console.log("Starting Formatter: ", New Date());

  // next must be called, or the program will end.
  next()
}
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

## Todo

- [x] Ability to load plugins before running the formatter.
- [x] Clean up Middleware System.
- [ ] Add support for a format.json repo level config file.
- [ ] Add #include tag for github repos.
- [ ] Add #include for local repos.
- [ ] Rhost specific installer plugin.
- [ ] Add the ability to read from Github Repos

## Changelog

- 0.1.0 - Initial Commit
- 0.3.1 - Included functionality for plugins

## License

MIT
