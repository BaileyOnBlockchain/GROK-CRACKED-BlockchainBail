# Grok CLI

> An open-source AI agent that brings Grok directly into your terminal.  
> File editing, bash execution, real-time search, MCP server support, and a streaming Ink UI — all in one binary.

**Built by [@blockchainbail](https://x.com/blockchainbail) · Part of the [Oden Network](https://odennetworkxr.com) builder stack**

---

## How to run

**Requirements:** Node.js 18+ or Bun

```bash
# 1. Clone
git clone https://github.com/BaileyOnBlockchain/grok-cli.git
cd grok-cli

# 2. Install dependencies
npm install

# 3. Set your API key
cp .env.example .env
# Edit .env and add your GROK_API_KEY (get one at https://console.x.ai)

# 4. Build
npm run build

# 5. Run
node dist/index.js

# Or install globally
npm install -g .
grok
```

**Dev mode (no build step):**
```bash
npm run dev          # via Bun
npm run dev:node     # via tsx
```

---

## What it does

Grok CLI is a fully agentic coding assistant that operates in your terminal. Give it a task — it plans, reads files, edits code, runs commands, and iterates until done.

| Feature | Details |
|---|---|
| **Streaming UI** | Real-time token-by-token output via Ink + React in the terminal |
| **File editing** | `view_file`, `create_file`, `str_replace_editor` with diff output and undo |
| **Morph Fast Apply** | Optional 4,500+ tok/s file editing via Morph API (set `MORPH_API_KEY`) |
| **Bash execution** | Full shell access with confirmation prompts before execution |
| **Unified search** | ripgrep-powered text + file search across your codebase |
| **Todo lists** | Visual task planning built into the agent loop |
| **MCP servers** | Connect any MCP-compatible tool server (stdio, HTTP, SSE) |
| **Web search** | Auto-triggered for queries about current events, prices, news |
| **AI git commits** | `grok git commit-and-push` — AI-generated commit message + push |
| **Headless mode** | `--prompt "..."` flag for piping into scripts or other tools |
| **Input history** | Up/down arrow navigation through previous inputs |
| **Custom instructions** | Drop a `.grok-instructions` file in any project for per-project prompts |

---

## Usage

```bash
# Interactive chat
grok

# Start with an initial message
grok "refactor this codebase to use TypeScript strict mode"

# Set working directory
grok -d /path/to/project

# Use a specific model
grok -m grok-4-latest

# Headless (single prompt, JSON output)
grok --prompt "what files are in this directory?" | jq .

# AI commit and push
grok git commit-and-push
```

---

## Architecture

```
src/
├── index.ts                    ← CLI entry (Commander, headless mode, git subcommand)
├── agent/
│   ├── grok-agent.ts           ← Core agent: agentic loop, streaming, tool execution
│   └── index.ts                ← Simple command-parsing agent (headless/scripts)
├── grok/
│   ├── client.ts               ← OpenAI-compatible Grok API client (chat + stream)
│   └── tools.ts                ← Tool definitions + MCP tool integration
├── tools/
│   ├── text-editor.ts          ← File view/create/str_replace/insert/undo with diffs
│   ├── morph-editor.ts         ← Morph Fast Apply integration
│   ├── bash.ts                 ← Shell command execution
│   ├── search.ts               ← ripgrep + fuzzy file search
│   ├── todo-tool.ts            ← In-session todo list with ANSI rendering
│   ├── confirmation-tool.ts    ← Per-operation and session-level confirmation
│   └── index.ts                ← Tool barrel export
├── mcp/
│   ├── client.ts               ← MCP client (stdio / HTTP / SSE transports)
│   └── config.ts               ← MCP server config (~/.grok/mcp.json)
├── commands/
│   └── mcp.ts                  ← `grok mcp add/remove/list/test` subcommands
├── ui/
│   ├── components/
│   │   └── chat-interface.tsx  ← Ink terminal UI (streaming, confirmations, input)
│   └── hooks/
│       ├── use-enhanced-input.ts  ← Full readline-style input: history, word-delete, etc.
│       └── use-input-history.ts   ← Up/down arrow history navigation
├── utils/
│   ├── settings-manager.ts     ← ~/.grok/user-settings.json (API key, model, base URL)
│   ├── confirmation-service.ts ← Singleton: session flags + pending confirmation state
│   ├── token-counter.ts        ← tiktoken wrapper with char-estimate fallback
│   ├── custom-instructions.ts  ← Loads ~/.grok/instructions.md or .grok-instructions
│   └── text-utils.ts           ← Pure cursor/text manipulation (insert, delete, word-move)
└── types/
    └── index.ts                ← ToolResult, EditorCommand, AgentState
```

---

## Key patterns

**Agentic loop**  
`GrokAgent.processUserMessageStream` runs a while loop: call Grok → if tool calls present, execute them and push results into the message history → call again → repeat until no tool calls or max rounds hit (default 400). Cancellable mid-stream via `AbortController`.

**Streaming + tool calls**  
Uses `messageReducer` to accumulate streaming delta chunks into a complete message object before dispatching tool calls. Content tokens are yielded immediately as they arrive; tool call objects are yielded once a complete function name is accumulated.

**Confirmation system**  
`ConfirmationService` is a singleton. When a tool needs confirmation, it stores a pending request and returns a Promise. The UI layer polls `getPendingRequest()`, renders the prompt, and calls `resolveConfirmation()` to release the promise. Session flags (`fileOperations`, `bashCommands`, `allOperations`) skip future prompts.

**MCP integration**  
`MCPManager` wraps `@modelcontextprotocol/sdk` clients. Tool names are namespaced as `mcp__<serverName>__<toolName>` so the agent can route calls correctly. Servers are loaded from `~/.grok/mcp.json` in the background without blocking startup.

**Morph Fast Apply**  
When `MORPH_API_KEY` is set, `edit_file` is added to the tool list. The agent sends instructions + a code snippet with `// ... existing code ...` markers, and `morph-v3-large` applies the edit at high speed. Falls back to `str_replace_editor` if the key isn't set.

---

## MCP servers

```bash
# Add a predefined server
grok mcp add filesystem
grok mcp add github

# Add a custom stdio server
grok mcp add my-server --transport stdio --command npx --args my-mcp-server

# Add an HTTP server
grok mcp add my-api --transport http --url https://my-mcp.example.com/mcp

# List connected servers and their tools
grok mcp list

# Test a server connection
grok mcp test filesystem

# Remove a server
grok mcp remove my-server
```

---

## Custom instructions

Drop a `.grok-instructions` file in any project directory to inject custom system prompt additions:

```markdown
# .grok-instructions
Always use TypeScript strict mode.
Prefer functional patterns over class-based ones.
Never use `any` types.
```

Global instructions go in `~/.grok/instructions.md`.

---

## Models

| Model | Best for |
|---|---|
| `grok-code-fast-1` | Fast coding tasks (default) |
| `grok-4-latest` | Complex reasoning and planning |

Switch model mid-session: `/model grok-4-latest`

---

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `GROK_API_KEY` | xAI API key (required) | — |
| `GROK_BASE_URL` | API base URL | `https://api.x.ai/v1` |
| `GROK_MODEL` | Default model | `grok-code-fast-1` |
| `GROK_MAX_TOKENS` | Max output tokens | `1536` |
| `MORPH_API_KEY` | Morph Fast Apply key (optional) | — |

Settings can also be saved persistently to `~/.grok/user-settings.json` via `--api-key` flag on first run.

---

⚠️ Use responsibly. Bash execution gives Grok full shell access to your machine.
