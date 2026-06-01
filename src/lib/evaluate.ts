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
import type { Frame, Page } from "playwright";

/** A context that can evaluate browser scripts — a page or one of its frames. */
type EvalTarget = Pick<Page, "evaluate"> | Pick<Frame, "evaluate">;

/** Evaluate an arrow-function browser script with no argument; returns `R`. */
export function evalScript<R>(ctx: EvalTarget, script: string): Promise<R> {
  return ctx.evaluate(`(${script})()` as unknown as () => R);
}

/** Evaluate an arrow-function browser script with one serializable argument. */
export function evalScriptArg<R, A>(ctx: EvalTarget, script: string, arg: A): Promise<R> {
  const expression = `(${script})(${JSON.stringify(arg)})`;
  return ctx.evaluate(expression as unknown as () => R);
}
