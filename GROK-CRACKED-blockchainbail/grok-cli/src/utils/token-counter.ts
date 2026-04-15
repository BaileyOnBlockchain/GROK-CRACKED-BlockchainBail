// =============================================================================
// utils/token-counter.ts
// Lightweight token estimation for tracking context window usage.
// Uses tiktoken when available, falls back to character-based estimate.
// =============================================================================

export interface TokenCounter {
  countTokens(text: string): number;
  countMessageTokens(messages: Array<{ role: string; content: string | null }>): number;
  estimateStreamingTokens(text: string): number;
  dispose(): void;
}

// ~4 chars per token — good enough for display purposes
function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}

class SimpleTokenCounter implements TokenCounter {
  countTokens(text: string): number {
    return estimateTokens(text);
  }

  countMessageTokens(messages: Array<{ role: string; content: string | null }>): number {
    return messages.reduce((total, msg) => {
      const content = typeof msg.content === "string" ? msg.content : "";
      return total + estimateTokens(content) + 4;
    }, 0);
  }

  estimateStreamingTokens(text: string): number {
    return estimateTokens(text);
  }

  dispose(): void {}
}

export function createTokenCounter(_model?: string): TokenCounter {
  // Attempt to use tiktoken if installed — fall back silently
  try {
    const { get_encoding } = require("tiktoken");
    const enc = get_encoding("cl100k_base");

    return {
      countTokens(text: string): number {
        try { return enc.encode(text || "").length; } catch { return estimateTokens(text); }
      },
      countMessageTokens(messages: Array<{ role: string; content: string | null }>): number {
        return messages.reduce((total, msg) => {
          const content = typeof msg.content === "string" ? msg.content : "";
          try { return total + enc.encode(content).length + 4; }
          catch { return total + estimateTokens(content) + 4; }
        }, 0);
      },
      estimateStreamingTokens(text: string): number {
        try { return enc.encode(text || "").length; } catch { return estimateTokens(text); }
      },
      dispose() { try { enc.free(); } catch {} },
    };
  } catch {
    return new SimpleTokenCounter();
  }
}
