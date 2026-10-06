import type { TelemetryEntry, TransitionLog } from "../../domain/telemetry/telemetry";

export const IMPACT_COOLDOWN_MS = 1500;
export const IMPACT_SHAKE_DURATION_MS = 400;
export const IMPACT_SHAKE_INTENSITY = 0.012;
export const IMPACT_FLASH_DURATION_MS = 250;
export const IMPACT_FLASH_RED = 0xd1;
export const IMPACT_FLASH_GREEN = 0x22;
export const IMPACT_FLASH_BLUE = 0x2b;
export const IMPACT_PARTICLE_DURATION_MS = 500;
export const IMPACT_PARTICLE_COUNT = 24;
export const IMPACT_PARTICLE_SPEED_MIN = 60;
export const IMPACT_PARTICLE_SPEED_MAX = 180;
export const IMPACT_RING_DURATION_MS = 600;
export const IMPACT_RING_START_RADIUS = 11;
export const IMPACT_RING_END_RADIUS = 64;
export const IMPACT_RING_START_ALPHA = 1;
export const IMPACT_RING_COLOR = 0xff5a5a;

export interface AlertImpactState {
  readonly processedEntries: number;
  readonly lastBurstAtMs: number | null;
}

export interface AlertImpactEvaluation {
  readonly state: AlertImpactState;
  readonly burst: boolean;
}

export interface ImpactRingStyle {
  readonly radius: number;
  readonly alpha: number;
}

export const initialAlertImpactState: AlertImpactState = {
  processedEntries: 0,
  lastBurstAtMs: null,
};

function isPursuitTransition(entry: TelemetryEntry): boolean {
  return entry.previous !== null && entry.previous !== entry.next && entry.next === "pursuing";
}

export function evaluateAlertImpact(
  state: AlertImpactState,
  log: TransitionLog,
  nowMs: number,
): AlertImpactEvaluation {
  if (!Number.isFinite(nowMs)) {
    throw new Error("Alert impact time must be finite.");
  }
  if (!Number.isInteger(state.processedEntries) || state.processedEntries < 0) {
    throw new Error("Alert impact processed entries must be a non-negative integer.");
  }

  const entries = log.entries;
  const newEntries = entries.slice(state.processedEntries);
  const pursuitSeen = newEntries.some(isPursuitTransition);
  const cooldownElapsed =
    state.lastBurstAtMs === null || nowMs - state.lastBurstAtMs >= IMPACT_COOLDOWN_MS;
  const burst = pursuitSeen && cooldownElapsed;

  return {
    state: {
      processedEntries: entries.length,
      lastBurstAtMs: burst ? nowMs : state.lastBurstAtMs,
    },
    burst,
  };
}

export function impactProgress(elapsedMs: number, durationMs: number): number {
  if (!Number.isFinite(elapsedMs)) {
    throw new Error("Impact elapsed time must be finite.");
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("Impact duration must be a finite positive number.");
  }
  if (elapsedMs <= 0) {
    return 1;
  }
  if (elapsedMs >= durationMs) {
    return 0;
  }
  return 1 - elapsedMs / durationMs;
}

export function impactRemainingMs(elapsedMs: number, durationMs: number): number {
  return durationMs * impactProgress(elapsedMs, durationMs);
}

export function impactRingStyle(elapsedMs: number): ImpactRingStyle {
  const remaining = impactProgress(elapsedMs, IMPACT_RING_DURATION_MS);
  const traveled = 1 - remaining;
  return {
    radius:
      IMPACT_RING_START_RADIUS +
      (IMPACT_RING_END_RADIUS - IMPACT_RING_START_RADIUS) * traveled,
    alpha: IMPACT_RING_START_ALPHA * remaining,
  };
}
