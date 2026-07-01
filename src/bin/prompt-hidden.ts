/**
 * Read lines from stdin for CLI prompts. `promptHidden` suppresses the echo of
 * typed characters (for secrets) by muting readline's output writer once the
 * prompt has been shown — so secrets never land on screen or in scrollback.
 * @module bin/prompt-hidden
 */
import { createInterface, type Interface } from "node:readline";

type MutableInterface = Interface & {
  _writeToOutput?: (chunk: string) => void;
  _muted?: boolean;
};

/** Ask `query` and resolve the typed line with the echo suppressed. */
export function promptHidden(query: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const iface = rl as MutableInterface;
  const original = iface._writeToOutput?.bind(iface);
  iface._writeToOutput = (chunk: string) => {
    if (!iface._muted) original?.(chunk);
  };
  const answer = new Promise<string>((resolve) => {
    rl.question(query, (line) => {
      iface._muted = false;
      rl.close();
      process.stdout.write("\n");
      resolve(line);
    });
  });
  iface._muted = true; // the prompt is already written; mute the typed reply
  return answer;
}

/** Ask `query` and resolve the typed line, trimmed (visible, non-secret). */
export function promptLine(query: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (line) => {
      rl.close();
      resolve(line.trim());
    });
  });
}
