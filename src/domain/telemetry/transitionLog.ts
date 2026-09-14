import type { TransitionRecord } from "../behavior/guardStates";

export function appendTransition(
  history: readonly TransitionRecord[],
  record: TransitionRecord,
): readonly TransitionRecord[] {
  return [...history, record];
}

export function lastTransition(
  history: readonly TransitionRecord[],
): TransitionRecord | null {
  const last = history[history.length - 1];
  return last ?? null;
}