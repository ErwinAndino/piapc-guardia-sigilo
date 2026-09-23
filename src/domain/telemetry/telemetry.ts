import type { GuardStateName } from "../behavior/guardBehavior";

export interface TelemetryEntry {
  readonly timeMs: number;
  readonly previous: GuardStateName | null;
  readonly event: string;
  readonly next: GuardStateName;
  readonly cause: string;
}

export interface TransitionLog {
  readonly entries: readonly TelemetryEntry[];
}

export function createTelemetryLog(): TransitionLog {
  return { entries: [] };
}

export function recordTelemetry(
  log: TransitionLog,
  entry: TelemetryEntry,
): TransitionLog {
  if (!Number.isFinite(entry.timeMs)) {
    throw new Error("Telemetry time must be finite.");
  }
  if (entry.event.length === 0 || entry.cause.length === 0) {
    throw new Error("Telemetry event and cause must not be empty.");
  }

  return { entries: [...log.entries, entry] };
}

export function latestTransitions(log: TransitionLog, count: number): TelemetryEntry[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Latest transitions count must be a non-negative integer.");
  }
  return log.entries.slice(-count);
}