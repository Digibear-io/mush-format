# MUSH Formatter

![header](mushformatter.jpg)

a Typescript library designed to take mushcode from something readable to something you can quote directly into your game.

## Install

with npm, save as a dependancy

```
npm i mush-format --save
```

## Usage

```JavaScript
//Typescript
import formatter from '@digibear/mush-format'

// Node
const formatter = require(mush-format)


( async () => {
  const results = await formatter(`

@nameformat #0=
  [if(hasflag(%#,json),,
   if(
      orflags(%#,iWa),
      [cname(%!)]%(%![flags(%!)]%),
      [cname(%!)]
    )
  )]`
  )
  console.log(results)
})()
  .catch(error => console.log(error));
```

## Extending The Formatter

Mush Format is at it's heart a middleware system close to ExpressJS. To install a middleware

```JavaScript
app.use("step", middleware)
```

## Meta Tags

Meta tags allow you to extend the base functionality of your code, from installing other libraries, to setting compiler time variables and even adding entire blocks of code at run time.

### `include /path/to/file.mu`

this #meta allows you to import a file (or entire Github repository) into the current file. #include accepts three kinds of files right now:

Local File You can designate a local file to include, entering the `./path/to/`file.mu format.

### `#file ./path/to/file`

Honestly `#file` works list like `#include`, except it escapes each line of text with a MUSH null string `@@` so they don't get quoted to the Game. This is great for things like license files, and other custom comments text.

### `#header or #footer <key>=<value>`

Add key/value information to be listed at the very top or bottom of the resulting file. `#header version=1.0.0` escapes into: `@@ version 1.0.0` at the top of the resulting document.

### `#debug{}`

Debug allows you to add code only when the `debug` flag is set to true.

```

#header debug = true

#debug{

@set me=quiet
@pemit me= Game>> Installing Blah.. Notes and stuff.

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

You can add your meta tags anywhere, and if you want an extra newline in your minified code use a single dash `-` on a line.

```
@@ minified code comment
-

// This line won't render
&command.cmd #123 = $things:
  @pemit %#=And Stuff. // this line will be added to the first.
```

Minifies to:

```
@@ minified code comment

&command.cmd #123=$things: @pemit %#=And Stuff
```

Where normally the space would have been eaten by the minifier.
