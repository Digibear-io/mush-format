# MUSH Format

![MUSH Format Banner](./mushformatter.jpg)

[![npm version](https://badge.fury.io/js/%40digibear%2Fmush-format.svg)](https://badge.fury.io/js/%40digibear%2Fmush-format)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MUSH Format** is a powerful pre-processor and build tool for **MUSHcode**
(TinyMUSH, PennMUSH, MUX, Rhole, etc.). It transforms readable, modern,
structured code into the compact, minified format required by game servers.

Write code like a developer, not a text compressor.

---

## 🚀 Key Features

- **🤖 Agentic Processing** (Default): Autonomous project analysis, intelligent
  parsing, self-healing linting, and automatic error correction.
- **Modern Syntax**: Write clean, indented code with comments.
- **Project Management**: Initialize, build, and manage dependencies with the
  CLI.
- **Modular Design**: Use `#include` and `#file` to split your code into
  reusable modules.
- **Macros & Templates**: Use `@define` macros and `#for` / `#if` templates to
  generate complex code.
- **Dependency Management**: Install packages directly from GitHub.
- **Testing**: Built-in unit testing framework with `@test`.
- **Documentation**: Auto-generate help files from `/** ... */` comments.
- **Self-Healing Linting**: Automatically detects and fixes unbalanced brackets
  and parentheses.

---

## 📦 Installation

Install globally to use the CLI tool `mform`:

```bash
npm install -g @digibear/mush-format
```

Or install locally in your project:

```bash
npm install --save-dev @digibear/mush-format
```

---

## ⚡ Quick Start

1. **Initialize a new project**:
   ```bash
   mform init my-mush-project
   cd my-mush-project
   ```

2. **Write your code** (`src/index.mush`):
   ```mush
   // Defines a command
   &CMD_HELLO #123=$hello *:
       @pemit %#=Hello, %0!
   ```

3. **Compile it**:
   ```bash
   mform run .
   ```

   **Output**:
   ```mush
   &CMD_HELLO #123=$hello *:@pemit %#=Hello, %0!
   ```

---

## 🛠 Configuration (`mush.json`)

Configure your project with `mush.json` in the root directory:

```json
{
  "main": "./src/index.mush",
  "dependencies": {
    "github-repo": "github:user/repo"
  }
}
```

---

## 📖 Feature Reference

### 1. Formatting Rules

- **Indentation**: All whitespace at the start of lines is stripped. Indent
  freely!
- **Comments**:
  - `//` : Removed during compilation.
  - `/* ... */` : Block comments, removed during compilation.
  - `@@` : MUSH comments, preserved in the output.
- **Newlines**: Blank lines are removed unless you escape them.

### 2. Preprocessor Directives

#### Imports

Import other files relative to the current file or from a URL.

```mush
#include ./utils/helpers.mush
#include https://raw.githubusercontent.com/user/repo/main/lib.mu
```

Include a file's content as MUSH comments (perfect for licenses or READMEs):

```mush
#file ./LICENSE
```

#### Macros (`@define`)

Define reusable code snippets.

```mush
@define @emit(msg) {
    @pemit %#=msg
}

@emit(Welcome!)
// Becomes: @pemit %#=Welcome!
```

#### Templating (`#for`, `#if`)

Generate code loops or conditionally include blocks.

```mush
#for i in range(1, 3) {
    &tr_loop_%i #123=@emit Loop %i
}

#if (1 == 1) {
    // Included
}
```

#### Meta Tags

- `@debug`: Include `#debug { ... }` blocks for development builds.
- `@installer`: Wraps output in an installer script with success/failure
  reporting.

### 3. Testing Framework (`@test`)

Write unit tests directly in your source files.

```mush
@test "Add Test" {
    add(1, 1)
} expect {
    2
}
```

### 4. Documentation Generator

Generate in-game `@help` entries automatically from JSDoc-style comments.

```mush
@help_object #123
@help_pre &HELP_

/**
 * +attack
 * Performs an attack on the target.
 */
&CMD_ATTACK #123=$+attack *: ...
```

Generates: `&HELP_ATTACK #123=+attack%r%rPerforms an attack on the target.`

---

## 🖥 CLI Reference

| Command               | Alias | Description                                                                    |
| :-------------------- | :---- | :----------------------------------------------------------------------------- |
| `mform run <path>`    | `r`   | Compile a project or file. Flags: `-d` (diff), `-w` (watch), `-i` (installer). |
| `mform init <name>`   | `i`   | Create a new project scaffold.                                                 |
| `mform install <pkg>` | `add` | Install a dependency (e.g., `github:user/repo`).                               |
| `mform github <url>`  | `git` | Run/Format a remote file directly from GitHub.                                 |
| `mform purge <file>`  | `p`   | Clear diff caches for a file.                                                  |

---

## 🤝 Contributing

Contributions are welcome!

1. Clone the repo: `git clone https://github.com/digibear-io/mush-format.git`
2. Install dependencies: `npm install`
3. Build: `npm run build`

## License

MIT © [Digibear](https://github.com/digibear-io)
