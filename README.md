# MUSH Formatter

![header](mushformatter.jpg)

a Typescript library designed to take mushcode from something readable to something you can quote directly into your game.

## Install

with npm, save as a dependancy

```
npm i @digibear/mush-format
```

## Usage

```JavaScript
import formatter from '@digibear/mush-format'


( async () => {
  console.log(
    await formatter(`
@nameformat #0=
  [if(hasflag(%#,json),,
   if(
      orflags(%#,iWa),
      [cname(%!)]%(%![flags(%!)]%),
      [cname(%!)]
    )
  )]`
    )
  )
})()
  .catch(error => console.log(error));

// -> @nameformat #0=[if(hasflag(%#,json),, if(orflags(%#,iWa), [cname(%!)]%(%![flags(%!)]%), [cname(%!)]))]

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
