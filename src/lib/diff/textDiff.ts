import { diffWords } from "diff";

export interface WordDiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * Compute word-level diff between two strings.
 * Returns an array of parts with added/removed flags for rendering inline diffs.
 */
export function computeWordDiff(before: string, after: string): WordDiffPart[] {
  return diffWords(before, after).map((part) => ({
    value: part.value,
    added: part.added || undefined,
    removed: part.removed || undefined,
  }));
}
