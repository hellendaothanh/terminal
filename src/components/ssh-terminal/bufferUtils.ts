import type { Terminal as XTerm } from '@xterm/xterm';

/**
 * Extract the most relevant terminal text context for AI features:
 * current selection > last 40 buffer lines > recent output ring buffer.
 */
export const getTerminalContextText = (
  term: XTerm | null,
  recentOutput: string,
  sessionId: string
): string => {
  if (term) {
    const selection = term.getSelection();
    if (selection && selection.trim().length > 0) {
      return selection;
    }
    const buffer = term.buffer.active;
    const lines: string[] = [];
    const start = Math.max(0, buffer.length - 40);
    for (let i = start; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        const str = line.translateToString(true);
        if (str.trim().length > 0) lines.push(str);
      }
    }
    if (lines.length > 0) {
      return lines.join('\n');
    }
  }
  if (recentOutput && recentOutput.trim().length > 0) {
    return recentOutput.trim().split('\n').slice(-30).join('\n');
  }
  const bufferGetter = (window as any).__activeBuffers?.[sessionId];
  return bufferGetter ? bufferGetter().text : '';
};
