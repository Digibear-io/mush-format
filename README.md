# MUSH Formatter

![header](mushformatter.jpg)

a javaScript library designed to take mushcode from something readable to something you can quote directly into your game.

## Install

with npm, save as a dependancy

```
npm i mush-format --save
```

## Simple Usage

Mush Format is, at it's core a middleware system, very close to express JS.

```JavaScript
const Formatter = require(mush-format)
const formatter = new Formatter();

( async () => {
  const results = await formatter.format("path/to/code.mu")
  console.log(results.text)
})()
  .catch(error => console.log(error));
```

## Extending The Formatter

Mush Format is at it's heart a middleware system close to ExpressJS. To install a middleware

```JavaScript
app.use("step", middleware)
```

Writing middleware is very similar to writing it for express, including the usge of a [`next()`](#nexterror-data) function to call the next middleware system in line. It's a function that takes two arguments `data` and `next`.

```JavaScript
app.use("step", (data, next) => {

  // ... code to run

  next(null, data)

})
```

### `Steps`

There are 5 steps when formatting code.

- **Pre** - These middleware functions are performed before formatting begins.
- **Open** - Open all of the connected documents and stitch them together.
- **Render** - This step is used to read any [#meta tags](#meta-tags) and execute appropriate actions.
- **Compress** - Remove all formatting and unevaluated meta tags, and minify the code so it can be quoted.
- **Finish** - Any changes that need to be made post formatting. Headers and footers are set in this step.

### `Data`

The data object carries information between connected middleware, and steps. Here
are a few highlights of important args:

```JavaScript
data = {
  // The original string that kicked
  // off the Command
  input: "",

  // The current file/URL that mush formatter
  // is working with.
  curFile: "",

  // The base URL or directory.
  base: "",

  // this is the stitched together
  // document from any included ode.
  raw: "",

  // The final, game ready code.
  text: "",

  // Stores header title/value
  // key-pairs.
  headers: [],

  // Same thing, only with footer tags
  footers: [],

  // Any messages from the process
  // of working with the file, text,
  // archive or directory.
  log: []
}
```

### `next(error, data)`

Use the next function to route any errors, and pass data onto the next middleware function. If you forget to include `next` the software will hang.

```JavaScript
module.exports = (data, next) => {

  // .... Accomplish some stuff ....

  next(null, data)

}
```

## Meta Tags

Meta tags allow you to extend the base functionality of your code, from installing other libraries, to setting compiler time variables and even adding entire blocks of code at run time.

### `include /path/to/file.mu`

this #meta allows you to import a file (or entire Github repository) into the current file. #include accepts three kinds of files right now:

Local File You can designate a local file to include, entering the `./path/to/`file.mu format.
Local Directory If you list a directory, Mu-Format will look for a file called `installer.mu` and kick off the `#include` from there.
Github Archive This is the same as installing from a local directory, instead you'll you'll enter the full address to the base repo `https://github.com/<user>/<repo>`.

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
