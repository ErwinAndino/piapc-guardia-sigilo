import type { GuardStateName } from "../../domain/behavior/guardBehavior";
import type { TelemetryEntry, TransitionLog } from "../../domain/telemetry/telemetry";

export interface GuardBodyStyle {
  readonly fill: number;
  readonly stroke: number;
}

const GUARD_BODY_STYLES: Readonly<Record<GuardStateName, GuardBodyStyle>> = {
  patrolling: { fill: 0x6b8afd, stroke: 0xb9c5ff },
  returning: { fill: 0x6b8afd, stroke: 0xb9c5ff },
  investigating: { fill: 0xe5b454, stroke: 0xffd98a },
  searching: { fill: 0xe5b454, stroke: 0xffd98a },
  pursuing: { fill: 0xe16969, stroke: 0xff9d9d },
};

export function guardBodyStyleFor(state: GuardStateName): GuardBodyStyle {
  return GUARD_BODY_STYLES[state];
}

export function latestStateTransition(log: TransitionLog): TelemetryEntry | null {
  for (let index = log.entries.length - 1; index >= 0; index -= 1) {
    const entry = log.entries[index];
    if (entry === undefined) {
      continue;
    }
    if (entry.previous !== null && entry.previous !== entry.next) {
      return entry;
    }
  }
  return null;
}

export function flashProgress(elapsedMs: number, durationMs: number): number {
  if (!Number.isFinite(elapsedMs)) {
    throw new Error("Flash elapsed time must be finite.");
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("Flash duration must be a finite positive number.");
  }
  if (elapsedMs <= 0) {
    return 0;
  }
  if (elapsedMs >= durationMs) {
    return 1;
  }
  return elapsedMs / durationMs;
}
