/**
 * Browser-script evaluation helpers.
 *
 * Playwright (Node) treats a string passed to `page.evaluate` as a JavaScript
 * *expression*, not an auto-invoked function: `"() => 42"` returns the function
 * (serialized to undefined), not `42`, and a second `arg` is ignored for strings.
 * These wrappers therefore wrap the arrow-function source in an IIFE and inline
 * the argument via `JSON.stringify`, so callers keep authoring plain
 * `(arg) => {...}` scripts while staying isolated from Node DOM typing.
 * @module lib/evaluate
 */
import type { Page } from "playwright";

/** Evaluate an arrow-function browser script with no argument; returns `R`. */
export function evalScript<R>(page: Page, script: string): Promise<R> {
  return page.evaluate(`(${script})()` as unknown as () => R);
}

/** Evaluate an arrow-function browser script with one serializable argument. */
export function evalScriptArg<R, A>(page: Page, script: string, arg: A): Promise<R> {
  const expression = `(${script})(${JSON.stringify(arg)})`;
  return page.evaluate(expression as unknown as () => R);
}
