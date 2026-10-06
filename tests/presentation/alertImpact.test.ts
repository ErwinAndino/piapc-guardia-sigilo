import { describe, expect, it } from "vitest";
import {
  IMPACT_COOLDOWN_MS,
  IMPACT_FLASH_DURATION_MS,
  IMPACT_PARTICLE_DURATION_MS,
  IMPACT_RING_DURATION_MS,
  IMPACT_RING_END_RADIUS,
  IMPACT_RING_START_ALPHA,
  IMPACT_RING_START_RADIUS,
  IMPACT_SHAKE_DURATION_MS,
  evaluateAlertImpact,
  impactProgress,
  impactRemainingMs,
  impactRingStyle,
  initialAlertImpactState,
} from "../../src/game/presentation/alertImpact";
import type { GuardStateName } from "../../src/domain/behavior/guardBehavior";
import type { TelemetryEntry, TransitionLog } from "../../src/domain/telemetry/telemetry";

function entry(partial: Partial<TelemetryEntry>): TelemetryEntry {
  return {
    timeMs: 0,
    previous: null,
    event: "reset",
    next: "patrolling",
    cause: "initial",
    ...partial,
  };
}

function log(...entries: TelemetryEntry[]): TransitionLog {
  return { entries };
}

function transitionTo(next: GuardStateName, timeMs = 0): TelemetryEntry {
  return entry({
    timeMs,
    previous: "patrolling",
    event: "vision-acquired",
    next,
    cause: "vision:visible",
  });
}

function burstAfter(state: typeof initialAlertImpactState, events: TransitionLog, nowMs: number) {
  return evaluateAlertImpact(state, events, nowMs);
}

describe("alert impact trigger", () => {
  it("starts with no processed entries and no burst clock", () => {
    expect(initialAlertImpactState).toEqual({ processedEntries: 0, lastBurstAtMs: null });
  });

  it("fires only for transitions into pursuing", () => {
    for (const target of ["investigating", "searching", "returning", "patrolling"] as const) {
      const result = burstAfter(initialAlertImpactState, log(transitionTo(target)), 100);
      expect(result.burst).toBe(false);
    }

    const pursuit = burstAfter(initialAlertImpactState, log(transitionTo("pursuing")), 100);
    expect(pursuit.burst).toBe(true);
    expect(pursuit.state.lastBurstAtMs).toBe(100);
  });

  it("ignores entries that are not state transitions", () => {
    const sameState = entry({
      timeMs: 10,
      previous: "pursuing",
      event: "navigation-unreachable",
      next: "pursuing",
      cause: "navigation:goal-unreachable",
    });
    const initial = entry({ timeMs: 0, previous: null, event: "reset", next: "pursuing" });

    expect(burstAfter(initialAlertImpactState, log(sameState), 100).burst).toBe(false);
    expect(burstAfter(initialAlertImpactState, log(initial), 100).burst).toBe(false);
  });

  it("counts a pursuit recorded before another event in the same frame", () => {
    const events = log(
      transitionTo("pursuing", 100),
      entry({
        timeMs: 100,
        previous: "pursuing",
        event: "lost-sight",
        next: "searching",
        cause: "memory:expired",
      }),
    );

    expect(burstAfter(initialAlertImpactState, events, 100).burst).toBe(true);
  });

  it("does not fire twice for the same log", () => {
    const events = log(transitionTo("pursuing", 100));
    const first = burstAfter(initialAlertImpactState, events, 100);
    const second = burstAfter(first.state, events, 900);

    expect(first.burst).toBe(true);
    expect(second.burst).toBe(false);
    expect(second.state).toEqual(first.state);
  });

  it("advances the processed entry counter to the log length", () => {
    const events = log(transitionTo("investigating", 50), transitionTo("pursuing", 60));
    const result = burstAfter(initialAlertImpactState, events, 70);

    expect(result.state.processedEntries).toBe(2);
  });

  it("rejects a non-finite clock and an invalid state counter", () => {
    expect(() => evaluateAlertImpact(initialAlertImpactState, log(), Number.NaN)).toThrow();
    expect(() =>
      evaluateAlertImpact({ processedEntries: -1, lastBurstAtMs: null }, log(), 0),
    ).toThrow();
  });
});

describe("alert impact cooldown", () => {
  const firstLog = log(transitionTo("pursuing", 0));

  it("blocks a second burst before the cooldown elapses", () => {
    const first = burstAfter(initialAlertImpactState, firstLog, 1000);
    const rediscovery = log(...firstLog.entries, transitionTo("pursuing", 1200));
    const blocked = burstAfter(first.state, rediscovery, 1499);

    expect(IMPACT_COOLDOWN_MS).toBe(1500);
    expect(blocked.burst).toBe(false);
    expect(blocked.state.lastBurstAtMs).toBe(1000);
  });

  it("allows a new burst once the cooldown has elapsed", () => {
    const first = burstAfter(initialAlertImpactState, firstLog, 1000);
    const rediscovery = log(...firstLog.entries, transitionTo("pursuing", 2500));
    const allowed = burstAfter(first.state, rediscovery, 2500);

    expect(allowed.burst).toBe(true);
    expect(allowed.state.lastBurstAtMs).toBe(2500);
  });

  it("does not schedule a burst for a blocked transition", () => {
    const first = burstAfter(initialAlertImpactState, firstLog, 1000);
    const rediscovery = log(...firstLog.entries, transitionTo("pursuing", 1200));
    const blocked = burstAfter(first.state, rediscovery, 1499);
    const later = burstAfter(blocked.state, rediscovery, 5000);

    expect(later.burst).toBe(false);
    expect(later.state.lastBurstAtMs).toBe(1000);
  });

  it("fires the first burst without a previous clock", () => {
    const result = burstAfter({ processedEntries: 0, lastBurstAtMs: null }, firstLog, 0);
    expect(result.burst).toBe(true);
    expect(result.state.lastBurstAtMs).toBe(0);
  });
});

describe("alert impact durations", () => {
  it("matches the durations declared in the spec", () => {
    expect(IMPACT_SHAKE_DURATION_MS).toBe(400);
    expect(IMPACT_FLASH_DURATION_MS).toBe(250);
    expect(IMPACT_PARTICLE_DURATION_MS).toBe(500);
    expect(IMPACT_RING_DURATION_MS).toBe(600);
  });
});

describe("impact progress", () => {
  const DURATION = 600;

  it("starts at 1 and reaches 0 at the duration", () => {
    expect(impactProgress(0, DURATION)).toBe(1);
    expect(impactProgress(DURATION, DURATION)).toBe(0);
  });

  it("clamps beyond the boundaries without rebasing", () => {
    expect(impactProgress(-100, DURATION)).toBe(1);
    expect(impactProgress(DURATION + 500, DURATION)).toBe(0);
    for (const elapsed of [50, 150, 300, 450, 599]) {
      const value = impactProgress(elapsed, DURATION);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("is strictly decreasing while active", () => {
    const samples = [50, 100, 200, 350].map((ms) => impactProgress(ms, DURATION));
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeLessThan(samples[index - 1] as number);
    }
  });

  it("converts to a remaining duration for resumed effects", () => {
    expect(impactRemainingMs(0, DURATION)).toBe(DURATION);
    expect(impactRemainingMs(DURATION / 2, DURATION)).toBe(DURATION / 2);
    expect(impactRemainingMs(DURATION, DURATION)).toBe(0);
    expect(impactRemainingMs(DURATION + 1, DURATION)).toBe(0);
  });

  it("rejects non-finite inputs and non-positive durations", () => {
    expect(() => impactProgress(Number.NaN, DURATION)).toThrow();
    expect(() => impactProgress(Number.POSITIVE_INFINITY, DURATION)).toThrow();
    expect(() => impactProgress(0, 0)).toThrow();
    expect(() => impactProgress(0, -1)).toThrow();
    expect(() => impactProgress(0, Number.NaN)).toThrow();
  });
});

describe("impact ring style", () => {
  it("starts at the guard radius with full alpha", () => {
    const style = impactRingStyle(0);
    expect(style.radius).toBe(IMPACT_RING_START_RADIUS);
    expect(style.alpha).toBe(IMPACT_RING_START_ALPHA);
    expect(style.radius).toBe(11);
    expect(style.alpha).toBe(1);
  });

  it("grows to the end radius and fades out at the duration", () => {
    const style = impactRingStyle(IMPACT_RING_DURATION_MS);
    expect(style.radius).toBe(IMPACT_RING_END_RADIUS);
    expect(style.radius).toBe(64);
    expect(style.alpha).toBe(0);
  });

  it("clamps past the duration", () => {
    expect(impactRingStyle(IMPACT_RING_DURATION_MS + 400)).toEqual(
      impactRingStyle(IMPACT_RING_DURATION_MS),
    );
  });

  it("expands and fades monotonically while active", () => {
    const samples = [0, 150, 300, 450, 599].map(impactRingStyle);
    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1];
      const current = samples[index];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      expect(current?.radius).toBeGreaterThan(previous?.radius ?? 0);
      expect(current?.alpha).toBeLessThan(previous?.alpha ?? 1);
      expect(current?.radius).toBeLessThanOrEqual(IMPACT_RING_END_RADIUS);
      expect(current?.alpha).toBeGreaterThanOrEqual(0);
      expect(current?.alpha).toBeLessThanOrEqual(1);
    }
  });

  it("passes through the midpoint of the expansion", () => {
    const style = impactRingStyle(IMPACT_RING_DURATION_MS / 2);
    expect(style.radius).toBeCloseTo((IMPACT_RING_START_RADIUS + IMPACT_RING_END_RADIUS) / 2);
    expect(style.alpha).toBeCloseTo(0.5);
  });
});
