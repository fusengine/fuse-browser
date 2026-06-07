import { describe, expect, test } from "bun:test";
import { firstFlag, handleMetaFlags } from "../../src/bin/cli-meta.js";

/** Run `fn` capturing process.exit code + stdout, with both restored after. */
function capture(fn: () => void): { code: number | undefined; out: string } {
  const realExit = process.exit;
  const realWrite = process.stdout.write.bind(process.stdout);
  let code: number | undefined;
  let out = "";
  // @ts-expect-error test stub: throw to unwind on exit
  process.exit = (c?: number) => {
    code = c;
    throw new Error("__exit__");
  };
  process.stdout.write = ((s: string) => {
    out += s;
    return true;
  }) as typeof process.stdout.write;
  try {
    fn();
  } catch (e) {
    if (!(e instanceof Error) || e.message !== "__exit__") throw e;
  } finally {
    process.exit = realExit;
    process.stdout.write = realWrite;
  }
  return { code, out };
}

describe("firstFlag", () => {
  test("returns the first dash-prefixed token, or undefined", () => {
    expect(firstFlag(["fetch", "https://x", "--text"])).toBe("--text");
    expect(firstFlag(["fetch", "https://x"])).toBeUndefined();
  });
});

describe("handleMetaFlags", () => {
  test("--help prints usage and exits 0", () => {
    const { code, out } = capture(() => handleMetaFlags(["--help"], "USAGE_LINE\n"));
    expect(code).toBe(0);
    expect(out).toContain("USAGE_LINE");
  });

  test("-v prints a version and exits 0", () => {
    const { code, out } = capture(() => handleMetaFlags(["-v"], "u\n"));
    expect(code).toBe(0);
    expect(out.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("no meta flag is a no-op (does not exit)", () => {
    const { code } = capture(() => handleMetaFlags(["fetch", "https://x"], "u\n"));
    expect(code).toBeUndefined();
  });
});
