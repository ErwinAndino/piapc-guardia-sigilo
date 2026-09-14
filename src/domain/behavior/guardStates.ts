import type { GridPoint } from "../model/grid";

export type GuardState =
  | "patrolling"
  | "investigating"
  | "chasing"
  | "searching"
  | "returning"
  | "captured";

export type GuardEvent =
  | "vision-acquired"
  | "vision-lost"
  | "sound-heard"
  | "observation-changed"
  | "patrol-point-reached"
  | "patrol-point-unreachable"
  | "path-completed"
  | "destination-unreachable"
  | "replan-needed"
  | "capture-reached"
  | "search-timeout"
  | "restart";

export interface TransitionRecord {
  readonly timeMs: number;
  readonly previousState: GuardState;
  readonly event: GuardEvent;
  readonly nextState: GuardState;
  readonly cause: string;
}

export type GuardIntentKind = "navigate" | "rotate" | "halt" | "capture";

export interface GuardIntent {
  readonly kind: GuardIntentKind;
  readonly destination: GridPoint | null;
}

export function navigateIntent(destination: GridPoint): GuardIntent {
  return { kind: "navigate", destination: { ...destination } };
}

export function rotateIntent(): GuardIntent {
  return { kind: "rotate", destination: null };
}

export function haltIntent(): GuardIntent {
  return { kind: "halt", destination: null };
}

export function captureIntent(): GuardIntent {
  return { kind: "capture", destination: null };
}