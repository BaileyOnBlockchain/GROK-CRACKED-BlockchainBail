// =============================================================================
// ui/components/chat-interface.tsx
// Terminal UI for the interactive Grok CLI session, built with Ink + React.
// Renders the message history, streaming assistant output, tool call results,
// token counter, confirmation prompts, and the input field.
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { GrokAgent, ChatEntry, StreamingChunk } from "../../agent/grok-agent.js";
import { ConfirmationService } from "../../utils/confirmation-service.js";
import { useEnhancedInput } from "../hooks/use-enhanced-input.js";

interface ChatInterfaceProps {
  agent: GrokAgent;
  initialMessage?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortToolName(name: string): string {
  if (name.startsWith("mcp__")) {
    const parts = name.split("__");
    return parts.slice(1).join(" › ");
  }
  return name.replace(/_/g, " ");
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ChatInterface({ agent, initialMessage }: ChatInterfaceProps) {
  const { exit } = useApp();
  const confirmationService = ConfirmationService.getInstance();

  const [entries, setEntries]         = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [tokenCount, setTokenCount]   = useState(0);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    operation: string;
    filename: string;
    content?: string;
    operationType: "file" | "bash";
  } | null>(null);
  const [confirmSelection, setConfirmSelection] = useState(0); // 0=Yes 1=No 2=Always
  const [error, setError]             = useState<string | null>(null);

  const processedInitial = useRef(false);

  // ── Input handler ────────────────────────────────────────────────────────────
  const { input, handleInput, clearInput, insertAtCursor } = useEnhancedInput({
    disabled: isLoading || !!pendingConfirmation,
    onSubmit: handleSubmit,
    onEscape: () => {
      if (isLoading) agent.abortCurrentOperation();
    },
  });

  async function handleSubmit(text: string) {
    if (!text.trim()) return;

    // Built-in slash commands
    if (text.trim() === "/exit" || text.trim() === "/quit") { exit(); return; }
    if (text.trim() === "/clear") { setEntries([]); setError(null); return; }
    if (text.trim() === "/model") {
      setEntries(prev => [...prev, {
        type: "assistant", content: `Current model: ${agent.getCurrentModel()}`, timestamp: new Date(),
      }]);
      return;
    }
    if (text.trim().startsWith("/model ")) {
      const newModel = text.trim().slice(7).trim();
      agent.setModel(newModel);
      setEntries(prev => [...prev, {
        type: "assistant", content: `Switched to model: ${newModel}`, timestamp: new Date(),
      }]);
      return;
    }

    setIsLoading(true);
    setStreamingText("");
    setError(null);

    try {
      const stream = agent.processUserMessageStream(text);
      let accumulated = "";

      for await (const chunk of stream as AsyncIterable<StreamingChunk>) {
        if (chunk.type === "content") {
          accumulated += chunk.content || "";
          setStreamingText(accumulated);
        } else if (chunk.type === "tool_calls") {
          // Show pending confirmation if needed
          const pending = confirmationService.getPendingRequest();
          if (pending) setPendingConfirmation({ ...pending.options, operationType: pending.operationType });
        } else if (chunk.type === "tool_result") {
          setPendingConfirmation(null);
          setConfirmSelection(0);
          setEntries(prev => [...prev, {
            type: "tool_result",
            content: chunk.toolResult?.success
              ? chunk.toolResult.output || "✓"
              : `Error: ${chunk.toolResult?.error}`,
            timestamp: new Date(),
            toolCall: chunk.toolCall,
            toolResult: chunk.toolResult,
          }]);
        } else if (chunk.type === "token_count") {
          setTokenCount(chunk.tokenCount || 0);
        } else if (chunk.type === "done") {
          if (accumulated.trim()) {
            setEntries(prev => [...prev, {
              type: "assistant", content: accumulated, timestamp: new Date(),
            }]);
          }
          setStreamingText("");
          break;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Process initial message once
  useEffect(() => {
    if (initialMessage && !processedInitial.current) {
      processedInitial.current = true;
      handleSubmit(initialMessage);
    }
  }, []);

  // ── Keyboard handler ──────────────────────────────────────────────────────────
  useInput((char, key) => {
    if (pendingConfirmation) {
      if (key.leftArrow)  setConfirmSelection(prev => Math.max(0, prev - 1));
      if (key.rightArrow) setConfirmSelection(prev => Math.min(2, prev + 1));
      if (key.return) {
        const result =
          confirmSelection === 0 ? { confirmed: true } :
          confirmSelection === 2 ? { confirmed: true, dontAskAgain: true } :
          { confirmed: false };
        confirmationService.resolveConfirmation(result);
        setPendingConfirmation(null);
        setConfirmSelection(0);
      }
      if (key.escape) {
        confirmationService.resolveConfirmation({ confirmed: false });
        setPendingConfirmation(null);
        setConfirmSelection(0);
      }
      return;
    }

    if (key.ctrl && char === "c") { exit(); return; }

    handleInput(char, key);
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  const COLS = process.stdout.columns || 100;

  return (
    <Box flexDirection="column" width={COLS}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
        <Text color="cyan" bold>⚡ Grok CLI </Text>
        <Text color="gray">│ model: </Text>
        <Text color="yellow">{agent.getCurrentModel()}</Text>
        <Text color="gray"> │ tokens: </Text>
        <Text color="magenta">{tokenCount.toLocaleString()}</Text>
        <Text color="gray"> │ dir: </Text>
        <Text color="blue">{truncate(agent.getCurrentDirectory(), 40)}</Text>
      </Box>

      {/* Message history */}
      <Box flexDirection="column" flexGrow={1}>
        {entries.map((entry, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            {entry.type === "user" && (
              <Box>
                <Text color="green" bold>▶ </Text>
                <Text color="white">{entry.content}</Text>
              </Box>
            )}
            {entry.type === "assistant" && (
              <Box flexDirection="column">
                <Text color="cyan" bold>◀ Grok</Text>
                <Text color="white">{entry.content}</Text>
              </Box>
            )}
            {entry.type === "tool_result" && (
              <Box>
                <Text color={entry.toolResult?.success ? "green" : "red"}>
                  {entry.toolResult?.success ? "✓ " : "✗ "}
                </Text>
                <Text color="gray">{shortToolName(entry.toolCall?.function.name || "")}: </Text>
                <Text color={entry.toolResult?.success ? "white" : "red"}>
                  {truncate(entry.content, 120)}
                </Text>
              </Box>
            )}
          </Box>
        ))}

        {/* Live streaming */}
        {streamingText && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="cyan" bold>◀ Grok</Text>
            <Text color="white">{streamingText}</Text>
            <Text color="gray">▋</Text>
          </Box>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingText && (
          <Box>
            <Text color="yellow">⟳ thinking...</Text>
          </Box>
        )}

        {/* Error */}
        {error && (
          <Box>
            <Text color="red">✗ {error}</Text>
          </Box>
        )}
      </Box>

      {/* Confirmation prompt */}
      {pendingConfirmation && (
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} marginY={1}>
          <Text color="yellow" bold>⚠ Confirm: {pendingConfirmation.operation}</Text>
          <Text color="white">{truncate(pendingConfirmation.filename, 80)}</Text>
          {pendingConfirmation.content && (
            <Text color="gray">{truncate(pendingConfirmation.content, 200)}</Text>
          )}
          <Box marginTop={1} gap={2}>
            {["Yes", "No", "Always (session)"].map((label, idx) => (
              <Text key={label} color={confirmSelection === idx ? "black" : "white"}
                    backgroundColor={confirmSelection === idx ? "yellow" : undefined}>
                {` ${label} `}
              </Text>
            ))}
          </Box>
          <Text color="gray">← → to select, Enter to confirm, Esc to cancel</Text>
        </Box>
      )}

      {/* Input field */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="green">❯ </Text>
        <Text color="white">{input}</Text>
        {!isLoading && <Text color="gray">▋</Text>}
      </Box>

      {/* Help bar */}
      <Box>
        <Text color="gray" dimColor>
          {"/exit to quit · /clear · /model [name] · Ctrl+C to abort · ↑↓ history"}
        </Text>
      </Box>
    </Box>
  );
}
