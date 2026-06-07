import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const version = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version as string;

function run(entry: string, ...args: string[]) {
  return spawnSync("node", ["--import", "tsx", entry, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

describe("bin metadata flags", () => {
  test("fuse-browser handles help and version before strict arg parsing", () => {
    const help = run("src/bin/cli.ts", "--help");
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("usage: fuse-browser");
    expect(help.stderr).toBe("");

    const versionResult = run("src/bin/cli.ts", "--version");
    expect(versionResult.status).toBe(0);
    expect(versionResult.stdout.trim()).toBe(version);
    expect(versionResult.stderr).toBe("");
  });

  test("fuse-browser reports unknown top-level flags without a stack trace", () => {
    const result = run("src/bin/cli.ts", "--definitely-not-a-real-flag");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown option '--definitely-not-a-real-flag'");
    expect(result.stderr).not.toContain("parse_args");
    expect(result.stderr).not.toContain("ERR_PARSE_ARGS_UNKNOWN_OPTION");
  });

  test("browser-mcp handles metadata flags before starting the server", () => {
    const help = run("src/bin/mcp.ts", "--help");
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("usage: browser-mcp");
    expect(help.stderr).toBe("");

    const versionResult = run("src/bin/mcp.ts", "--version");
    expect(versionResult.status).toBe(0);
    expect(versionResult.stdout.trim()).toBe(version);
    expect(versionResult.stderr).toBe("");
  });
});
