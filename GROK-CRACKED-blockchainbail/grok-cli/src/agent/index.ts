// =============================================================================
// agent/index.ts — simple command-parsing agent wrapper
// Thin layer used by non-streaming headless mode. Interactive mode uses
// GrokAgent directly via the chat interface.
// =============================================================================

import { TextEditorTool, BashTool } from '../tools/index.js';
import { ToolResult, AgentState } from '../types/index.js';

export class Agent {
  private textEditor: TextEditorTool;
  private bash: BashTool;
  private state: AgentState;

  constructor() {
    this.textEditor = new TextEditorTool();
    this.bash = new BashTool();
    this.state = { currentDirectory: process.cwd(), editHistory: [], tools: [] };
  }

  async processCommand(input: string): Promise<ToolResult> {
    const cmd = input.trim();

    if (cmd.startsWith('view ')) {
      const [, filePath, range] = cmd.split(' ');
      const parsed = range?.includes('-')
        ? (range.split('-').map(Number) as [number, number])
        : undefined;
      return this.textEditor.view(filePath, parsed);
    }
    if (cmd.startsWith('str_replace ')) {
      const m = cmd.match(/str_replace\s+(\S+)\s+"([^"]+)"\s+"([^"]*)"/);
      if (!m) return { success: false, error: 'Invalid str_replace format' };
      return this.textEditor.strReplace(m[1], m[2], m[3]);
    }
    if (cmd.startsWith('create ')) {
      const m = cmd.match(/create\s+(\S+)\s+"([^"]*)"/);
      if (!m) return { success: false, error: 'Invalid create format' };
      return this.textEditor.create(m[1], m[2]);
    }
    if (cmd.startsWith('insert ')) {
      const m = cmd.match(/insert\s+(\S+)\s+(\d+)\s+"([^"]*)"/);
      if (!m) return { success: false, error: 'Invalid insert format' };
      return this.textEditor.insert(m[1], parseInt(m[2]), m[3]);
    }
    if (cmd === 'undo_edit') return this.textEditor.undoEdit();
    if (cmd === 'pwd') return { success: true, output: this.bash.getCurrentDirectory() };
    if (cmd === 'history') {
      const h = this.textEditor.getEditHistory();
      return { success: true, output: h.length ? JSON.stringify(h, null, 2) : 'No edit history' };
    }
    if (cmd === 'help') return this.getHelp();

    const command = cmd.startsWith('bash ') ? cmd.slice(5) : cmd.startsWith('$ ') ? cmd.slice(2) : cmd;
    return this.bash.execute(command);
  }

  private getHelp(): ToolResult {
    return {
      success: true,
      output: `Commands: view <path> [start-end] | str_replace <path> "old" "new" | create <path> "content" | insert <path> <line> "text" | undo_edit | bash <cmd> | $ <cmd> | pwd | history | help`,
    };
  }

  getCurrentState(): AgentState {
    return { ...this.state, currentDirectory: this.bash.getCurrentDirectory(), editHistory: this.textEditor.getEditHistory() };
  }
}
