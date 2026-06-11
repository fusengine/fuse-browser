/**
 * Shared spawner for the live CLI checks: run the real CLI binary in a child
 * process and capture `{ code, stdout, stderr }`. Used by `live-cli.ts`.
 * @module tests/live/live-cli-run
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Absolute path to the CLI entry point. */
const CLI = fileURLToPath(new URL("../../src/bin/cli.ts", import.meta.url));

/** Result of one CLI invocation. */
export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Spawn `node --import tsx src/bin/cli.ts <args...>` and resolve with its output.
 *
 * @param args - CLI arguments (command, url, flags).
 * @returns Captured exit code and streams.
 */
export function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["--import", "tsx", CLI, ...args], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

/** Parse stdout as JSON, returning `null` on failure (keeps assertions terse). */
export function parseJson(stdout: string): Record<string, unknown> | null {
  try {
    return JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    return null;
  }
}
