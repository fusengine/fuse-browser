/**
 * Diff two interactive snapshots to report what changed after an action,
 * so an agent sees the *effect* of its action without a full re-snapshot.
 * Pure and testable (no browser).
 * @module extraction/snapshot-diff
 */
import type { InteractiveElement } from "../interfaces/extraction.js";

/** A ref whose visible text changed between two snapshots. */
export interface TextChange {
  index: number;
  before: string;
  after: string;
}

/** Summary of what changed between a before/after snapshot pair. */
export interface SnapshotDiff {
  added: InteractiveElement[];
  removed: InteractiveElement[];
  textChanged: TextChange[];
  urlChanged: boolean;
  changed: boolean;
}

/**
 * Structural identity key, excluding `text` and the volatile positional
 * `index`. A pure text change keeps the same key, so it surfaces via
 * `textChanged` (matched on this key too) rather than as a false add+remove,
 * and reordered elements no longer produce spurious text diffs.
 */
function keyOf(el: InteractiveElement): string {
  return `${el.tag}#${el.id ?? ""}|${el.name ?? ""}|${el.href ?? ""}|${el.type ?? ""}`;
}

/**
 * Compute the diff between `before` and `after` snapshots. Add/remove AND text
 * changes are matched by the structural key (not the positional index), so the
 * result stays correct when the DOM reorders.
 */
export function diffSnapshots(
  before: InteractiveElement[],
  after: InteractiveElement[],
  urlChanged = false,
): SnapshotDiff {
  const beforeByKey = new Map(before.map((el) => [keyOf(el), el]));
  const afterByKey = new Map(after.map((el) => [keyOf(el), el]));
  const added = after.filter((el) => !beforeByKey.has(keyOf(el)));
  const removed = before.filter((el) => !afterByKey.has(keyOf(el)));

  const textChanged: TextChange[] = [];
  for (const [key, el] of afterByKey) {
    const prev = beforeByKey.get(key);
    if (prev && prev.text !== el.text) {
      textChanged.push({ index: el.index, before: prev.text, after: el.text });
    }
  }

  const changed =
    urlChanged || added.length > 0 || removed.length > 0 || textChanged.length > 0;
  return { added, removed, textChanged, urlChanged, changed };
}
