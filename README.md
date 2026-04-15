# GROK-CRACKED-BlockchainBail

> A terminal-native AI coding agent built on xAI's Grok models. Not a chat wrapper — a full agentic loop that reads your files, edits code, runs shell commands, tracks its own progress, and iterates until the task is done.

Built by [@blockchainbail](https://x.com/blockchainbail) · [Oden Network](https://odennetworkxr.com)

---

The agent runs a continuous tool loop — call Grok, execute whatever tools it requests (file reads, edits, bash commands, searches), push results back into context, call again — repeating up to 400 rounds or until it decides it's done. Every step streams token-by-token into an Ink terminal UI built with React. Mid-task cancellation is handled via `AbortController` threaded through the streaming generator.

File editing comes in two modes. `str_replace_editor` does exact-string replacement with fuzzy multi-line fallback and generates a proper unified diff on every edit. `edit_file` uses the Morph Fast Apply API — send instructions and a partial snippet with `// ... existing code ...` markers, get back a fully merged file at 4,500+ tokens per second. Both tools gate execution behind a confirmation service: a singleton that resolves pending Promise handles when the UI layer accepts or rejects, with per-session "don't ask again" flags for each operation type.

Search is backed by ripgrep via JSON output parsing, with a parallel fuzzy file-name walker that scores matches by substring containment and character-sequence proximity. Both results are unified into a single ranked output.

MCP server support connects to any stdio, HTTP, or SSE transport using `@modelcontextprotocol/sdk`. Server tool names are namespaced as `mcp__<server>__<tool>` for unambiguous routing, loaded from `~/.grok/mcp.json` in the background without blocking startup.

The input system reimplements readline behaviour from scratch in React hooks — word-delete, Ctrl+A/E/K/U/W, cursor movement, up/down history navigation with position-aware original-input restore, and Shift+Enter multiline mode. Token counting uses tiktoken with a character-estimate fallback, updated in real time during streaming at 250ms intervals.

`grok git commit-and-push` runs headless — stages changes, diffs them, feeds the diff to Grok for a conventional-format commit message, commits, and pushes. `--prompt` flag outputs OpenAI-compatible JSON message objects for piping into other tools.

Custom per-project instructions load from `.grok-instructions` in the working directory, or globally from `~/.grok/instructions.md`, and are injected into the system prompt before every session.
