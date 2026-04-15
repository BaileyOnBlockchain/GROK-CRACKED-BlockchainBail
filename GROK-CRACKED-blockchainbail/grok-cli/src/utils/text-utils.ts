// =============================================================================
// utils/text-utils.ts
// Pure functions for cursor-aware text editing in the terminal input field.
// Used by useEnhancedInput hook for all keyboard-driven mutations.
// =============================================================================

export interface TextEditResult {
  text: string;
  position: number;
}

/** Insert `insertion` at `position` in `text` */
export function insertText(text: string, position: number, insertion: string): TextEditResult {
  return {
    text: text.slice(0, position) + insertion + text.slice(position),
    position: position + insertion.length,
  };
}

/** Delete the character immediately before the cursor */
export function deleteCharBefore(text: string, position: number): TextEditResult {
  if (position === 0) return { text, position };
  return {
    text: text.slice(0, position - 1) + text.slice(position),
    position: position - 1,
  };
}

/** Delete the character at the cursor position */
export function deleteCharAfter(text: string, position: number): TextEditResult {
  if (position >= text.length) return { text, position };
  return {
    text: text.slice(0, position) + text.slice(position + 1),
    position,
  };
}

/** Delete from cursor back to the previous word boundary */
export function deleteWordBefore(text: string, position: number): TextEditResult {
  if (position === 0) return { text, position };
  let i = position - 1;
  // Skip trailing spaces
  while (i > 0 && text[i] === " ") i--;
  // Skip word characters
  while (i > 0 && text[i - 1] !== " ") i--;
  return {
    text: text.slice(0, i) + text.slice(position),
    position: i,
  };
}

/** Delete from cursor forward to the next word boundary */
export function deleteWordAfter(text: string, position: number): TextEditResult {
  if (position >= text.length) return { text, position };
  let i = position;
  // Skip leading spaces
  while (i < text.length && text[i] === " ") i++;
  // Skip word characters
  while (i < text.length && text[i] !== " ") i++;
  return {
    text: text.slice(0, position) + text.slice(i),
    position,
  };
}

/** Move cursor to the start of the current line */
export function moveToLineStart(text: string, position: number): number {
  const lineStart = text.lastIndexOf("\n", position - 1);
  return lineStart === -1 ? 0 : lineStart + 1;
}

/** Move cursor to the end of the current line */
export function moveToLineEnd(text: string, position: number): number {
  const lineEnd = text.indexOf("\n", position);
  return lineEnd === -1 ? text.length : lineEnd;
}

/** Move cursor back one word (Ctrl+Left) */
export function moveToPreviousWord(text: string, position: number): number {
  if (position === 0) return 0;
  let i = position - 1;
  while (i > 0 && text[i] === " ") i--;
  while (i > 0 && text[i - 1] !== " ") i--;
  return i;
}

/** Move cursor forward one word (Ctrl+Right) */
export function moveToNextWord(text: string, position: number): number {
  if (position >= text.length) return text.length;
  let i = position;
  while (i < text.length && text[i] === " ") i++;
  while (i < text.length && text[i] !== " ") i++;
  return i;
}
