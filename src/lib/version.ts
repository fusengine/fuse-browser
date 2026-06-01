/**
 * Package version read from package.json at runtime, so it always tracks the
 * published version. Works from both source (tsx) and compiled dist — the path
 * `../../package.json` resolves to the package root in either layout.
 * @module lib/version
 */
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };

/** Current package version (e.g. for the MCP `serverInfo`). */
export const VERSION: string = pkg.version;
