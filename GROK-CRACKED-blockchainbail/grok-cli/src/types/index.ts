// =============================================================================
// types/index.ts — shared type definitions
// =============================================================================

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: Record<string, any>;
}

export interface EditorCommand {
  command: "create" | "str_replace" | "insert" | "undo";
  path: string;
  content?: string;
  old_str?: string;
  new_str?: string;
  insert_line?: number;
  backup?: string;
}

export interface AgentState {
  currentDirectory: string;
  editHistory: EditorCommand[];
  tools: string[];
}
