// =============================================================================
// utils/custom-instructions.ts
// Loads user-defined system prompt additions from ~/.grok/instructions.md
// or a local .grok-instructions file in the working directory.
// Local file takes precedence over global.
// =============================================================================

import fs from "fs-extra";
import * as path from "path";
import * as os from "os";

const GLOBAL_INSTRUCTIONS = path.join(os.homedir(), ".grok", "instructions.md");
const LOCAL_INSTRUCTIONS  = path.join(process.cwd(), ".grok-instructions");

export function loadCustomInstructions(): string | null {
  // Local .grok-instructions takes priority
  for (const file of [LOCAL_INSTRUCTIONS, GLOBAL_INSTRUCTIONS]) {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf-8").trim();
        if (content) return content;
      }
    } catch {}
  }
  return null;
}
