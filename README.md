# MUSH Format

![MUSH Format Banner](./mushformatter.jpg)

[![npm version](https://badge.fury.io/js/%40digibear%2Fmush-format.svg)](https://badge.fury.io/js/%40digibear%2Fmush-format)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MUSH Format** is an intelligent, AI-powered build tool and pre-processor for
**MUSHcode** (TinyMUSH, PennMUSH, MUX, RhostMUSH, etc.). Write clean, modern,
readable code – and let the agentic system autonomously analyze, format, and
heal your code into production-ready MUSH scripts.

**Write code like a developer. Let AI handle the rest.**

---

## 🤖 Agentic Architecture

MUSH Format doesn't just compile code – it **understands** it. Our agentic
workflow powered by **LangGraph** and **Google Gemini** provides:

### 🧠 **Autonomous Project Analysis**

- Automatically discovers your project structure
- Identifies entry points and dependencies
- Supports `mform.config.ts/js` for custom configuration

### ⚡ **Intelligent Parsing**

- Processes `#include`, `@define`, templates, and all directives
- Handles multi-file projects with automatic bundling
- Preserves source mapping for debugging

### 🔧 **Self-Healing Linter**

- **Heuristic healing** for common errors (unterminated strings, etc.)
- **LLM-powered healing** for complex syntax issues using RAG with MUX
  documentation
- Detects and fixes:
  - Unbalanced brackets `[]` and parentheses `()`
  - @ commands inside function calls
  - Complex nested expression errors
- Parallel batch processing (30 concurrent fixes) for speed

### ✅ **Live Verification**

- Validates formatted output
- Reports remaining errors with detailed diagnostics
- Provides confidence in your build

---

## 🚀 Quick Start

### Installation

```bash
npm install -g @digibear/mush-format
```

### Your First Project

1. **Initialize a new project**:
   ```bash
   mform init my-game
   cd my-game
   ```

2. **Write clean code** (`src/index.mush`):
   ```mush
   // Define a hello command
   &CMD_HELLO #123=$hello *:
       @pemit %#=Hello, %0!
       @pemit %#=Welcome to the game.
   ```

3. **Build with agentic mode** (default):
   ```bash
   mform run . -o build.txt
   ```

   The agent will:
   - ✓ Analyze your project
   - ✓ Parse and bundle files
   - ✓ Compress and optimize
   - ✓ Detect and heal syntax errors
   - ✓ Verify the output

4. **Output** (`build.txt`):
   ```mush
   &CMD_HELLO #123=$hello *:@pemit %#=Hello, %0!;@pemit %#=Welcome to the game.
   ```

---

## 💡 Key Features

### 🤖 **AI-Powered**

- **LLM Self-Healing**: Automatically fixes complex syntax errors using Google
  Gemini 2.5 Flash
- **RAG Integration**: Leverages MUX documentation for context-aware fixes
- **Parallel Processing**: Heals up to 30 errors simultaneously for speed

### 🎨 **Modern Syntax**

- Write indented, commented, readable code
- Use `//` comments (removed) and `@@` MUSH comments (preserved)
- Block comments `/* */` supported

### 📦 **Project Management**

- `mform init` to scaffold new projects
- `mform install github:user/repo` for dependencies
- Configuration via `mform.config.ts/js` or legacy `mush.json`

### 🔧 **Powerful Preprocessor**

- **Imports**: `#include ./file.mush` or from URLs
- **Macros**: `@define MACRO(args) { body }` for code reuse
- **Templates**: `#for`, `#if` for code generation
- **Testing**: `@test` framework for unit tests
- **Documentation**: Auto-generate help from JSDoc comments

### 🎯 **Production Ready**

- Minification and compression
- Installer script generation (`-i` flag)
- Watch mode (`-w`) for development
- Diff mode (`-d`) for incremental updates

---

## 🔑 Configuration

### API Key (Required for LLM Healing)

Create `.env.local` in your project root:

```env
GOOGLE_API_KEY=your_api_key_here
```

Or set globally:

```bash
mform run . --google-api-key=your_key
```

Without an API key, complex errors are **detected** but not automatically
healed.

### Project Configuration

**mform.config.ts** (recommended):

```typescript
export default {
  mform: {
    main: "./src/index.mush",
  },
  include: ["src/**/*.mush", "lib/**/*.mu"],
  dependencies: {
    "utils": "github:mushcoder/mush-utils",
  },
};
```

**Legacy mush.json**:

```json
{
  "main": "./src/index.mush",
  "dependencies": {
    "utils": "github:mushcoder/mush-utils"
  }
}
```

---

## 📖 Advanced Features

### Imports & Includes

```mush
// Import from local files
#include ./utils/helpers.mush

// Import from URLs
#include https://raw.githubusercontent.com/user/repo/main/lib.mu

// Include file content as MUSH comments
#file ./LICENSE
```

### Macros

Define reusable code patterns:

```mush
@define EMIT_TO_ROOM(msg) {
    @remit %l=msg
}

@define SET_ATTR(obj, attr, val) {
    &attr obj=val
}

EMIT_TO_ROOM(The room shakes!)
SET_ATTR(%#, HEALTH, 100)
```

### Templates

Generate code programmatically:

```mush
// Loops
#for i in range(1, 5) {
    &STAT_%i #123=%i
}

// Conditionals  
#if (ENV == "dev") {
    @debug Development mode active
}
```

### Testing Framework

```mush
@test "Math functions" {
    add(2, 2)
} expect {
    4
}

@test "String ops" {
    cat(Hello, World)
} expect {
    HelloWorld
}
```

Run tests (when implemented):

```bash
mform test
```

### Auto-Documentation

Generate `@help` entries from comments:

```mush
@help_object #123
@help_pre &HELP_

/**
 * +attack <target>
 * 
 * Initiates combat with the specified target.
 * Requires you to be in the same room.
 */
&CMD_ATTACK #123=$+attack *:
    // Implementation
```

Generates:

```mush
&HELP_ATTACK #123=+attack <target>%r%rInitiates combat with the specified target.%rRequires you to be in the same room.
```

---

## 🖥️ CLI Reference

### Commands

| Command               | Alias | Description                               |
| --------------------- | ----- | ----------------------------------------- |
| `mform run <path>`    | `r`   | Build project with agentic mode (default) |
| `mform init <name>`   | `i`   | Create new project scaffold               |
| `mform install <pkg>` | `add` | Install dependency from GitHub            |
| `mform github <url>`  | `git` | Format remote file from GitHub            |
| `mform purge <file>`  | `p`   | Clear diff caches                         |

### Run Options

```bash
mform run <path> [options]

Options:
  -o, --output <file>         Save output to file
  -d, --diff                  Show only changes from previous build
  -w, --watch                 Watch mode - rebuild on file changes
  -i, --install-script        Generate installer script format
  --no-agent                  Disable agentic mode (classic formatter)
  --google-api-key <key>      Set Google API key for LLM healing
```

### Examples

```bash
# Build with agentic healing
mform run . -o build.txt

# Watch mode for development
mform run . -w

# Generate installer script
mform run . -i -o installer.txt

# Classic mode (no AI)
mform run . --no-agent -o output.txt

# Install a dependency
mform install github:mushcoder/combat-system
```

---

## 🎨 Modern CLI Output

MUSH Format features a beautiful, accessible CLI with:

- 🎨 **Vibrant colors** for different message types
- ✓ **Semantic icons** (success, error, warning, info)
- 📊 **Progress indicators** during healing
- 🎯 **Clear sections** for workflow stages

```
══════════════════════════════════════════════════
  AGENTIC MODE ACTIVATED
══════════════════════════════════════════════════

──────────────────────────────────────
  Analyzing Project: /path/to/project
──────────────────────────────────────
  → Config loaded from: mform.config.ts
▸ Found 45 potential source files
★ Entry Point: index.mush

[=============================] 100% | ✓ Batch 1-30 complete

✓ Successfully healed all errors!
✓ Parsing Complete: 1,234 lines
✓ Successfully formatted 1,234 lines
```

---

## 🏗️ Architecture

MUSH Format uses **LangGraph** for workflow orchestration:

```
START → Analyzer → Parser → Compressor → Linter ⟲ Verifier → END
                                           │       │
                                           └───────┘
                                         Self-Healing Loop
                                         (max 3 iterations)
```

### Workflow Nodes

1. **Analyzer**: Discovers files, entry points, and configuration
2. **Parser**: Processes all directives and generates formatted output
3. **Compressor**: Strips comments, joins lines, optimizes
4. **Linter**: Detects errors and initiates healing
5. **Verifier**: Validates final output

### Self-Healing Process

1. **Simple errors** → Heuristic fixes (instant)
2. **Complex errors** → LLM healing with RAG context
3. **Batch processing** → 30 parallel API calls for speed
4. **Re-verification** → Ensures fixes are correct

---

## 🔮 Coming Soon

Exciting features on the roadmap to make MUSH development even better:

### 🎮 **Developer Experience**

- [ ] **VSCode Extension** - Syntax highlighting, IntelliSense, live preview, and one-click builds
- [ ] **Language Server Protocol (LSP)** - Full IDE support with autocomplete, go-to-definition, and refactoring
- [ ] **Interactive Playground** - Web-based editor to experiment with mform syntax and see instant results
- [ ] **Live Reload** - Hot module replacement for instant feedback during development

### 🚀 **Automation & CI/CD**

- [ ] **GitHub Actions Integration** - Automated builds and deployments on every commit
- [ ] **Pre-commit Hooks** - Automatic formatting and linting before commits
- [ ] **Deployment Pipelines** - Push directly to MUSH game servers from CI/CD
- [ ] **Version Tagging** - Semantic versioning for MUSH packages

### ⚡ **Performance & Optimization**

- [ ] **Incremental Builds** - Only reprocess changed files for faster rebuilds
- [ ] **Smart Caching** - Persistent cache for includes and dependencies
- [ ] **Build Profiles** - Optimize for development vs. production builds
- [ ] **Parallel Processing** - Multi-threaded parsing for massive projects

###  **Testing & Quality**

- [ ] **Enhanced Test Runner** - Execute `@test` blocks with detailed reports and coverage
- [ ] **Agentic Testing** - `mform test` command that runs tests against live MUSH server
- [ ] **Test Generation** - AI-powered test case generation from code
- [ ] **Integration Testing** - Test against live MUSH server instances
- [ ] **Code Coverage Reports** - Track which code is tested
- [ ] **Performance Profiling** - Identify slow commands and bottlenecks
- [ ] **Snapshot Testing** - Track and verify command output over time

### 🛠️ **Advanced Tooling**

- [ ] **Visual Debugger** - Step through code execution with breakpoints
- [ ] **Dependency Graph Viewer** - Visualize project structure and imports
- [ ] **Refactoring Tools** - Automated code transformations and modernization
- [ ] **Code Metrics Dashboard** - Complexity analysis, duplication detection, and quality scores

### 🌐 **Cloud & Collaboration**

- [ ] **Cloud-Based Healing** - No API key required - healing as a service
- [ ] **Package Registry** - Discover, share, and install community packages
- [ ] **Collaborative Editing** - Real-time multiplayer coding sessions
- [ ] **Version Control Integration** - Git workflow optimized for MUSH code

### 🎨 **Smart Code Intelligence**

- [ ] **Agentic Create** - `mform create <description>` to generate new code from natural language
- [ ] **Agentic Modify** - `mform modify <file> <instruction>` to edit code via AI
- [ ] **AI Code Suggestions** - Context-aware autocomplete powered by LLM
- [ ] **Automatic Refactoring** - AI-suggested improvements and modernizations
- [ ] **Code Review Assistant** - Automated best practice recommendations
- [ ] **Natural Language Commands** - "Create a combat system" → Generated scaffold
- [ ] **Intent-Based Healing** - AI understands what you're trying to do and fixes accordingly

### 🔌 **MUSH Server Integration**

- [ ] **Direct Server Upload** - Deploy code directly to your game server
- [ ] **Live Data Sync** - Two-way sync between code and server
- [ ] **Remote Debugging** - Debug code running on the server
- [ ] **Server Health Monitoring** - Track performance and errors in real-time

### 📚 **Documentation & Learning**

- [ ] **Interactive Tutorials** - Learn mform with hands-on examples
- [ ] **Recipe Library** - Pre-built templates for common patterns
- [ ] **Best Practices Guide** - Advanced techniques and optimization tips
- [ ] **Video Courses** - Comprehensive learning materials

---

## �🤝 Contributing


Contributions welcome! This project is actively developed.

1. Clone: `git clone https://github.com/digibear-io/mush-format.git`
2. Install: `npm install`
3. Build: `npm run build`
4. Test: `npm test`

---

## 📝 License

MIT © [Digibear](https://github.com/digibear-io)

---

## 🔗 Links

- **GitHub**:
  [digibear-io/mush-format](https://github.com/digibear-io/mush-format)
- **npm**:
  [@digibear/mush-format](https://www.npmjs.com/package/@digibear/mush-format)
- **Issues**: [Report a bug](https://github.com/digibear-io/mush-format/issues)

---

**Made with ❤️ for the MUSH community**
