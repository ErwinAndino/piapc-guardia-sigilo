import { describe, expect, it } from "vitest";
import {
  flashProgress,
  guardBodyStyleFor,
  latestStateTransition,
  type GuardBodyStyle,
} from "../../src/game/presentation/guardStyle";
import type { GuardStateName } from "../../src/domain/behavior/guardBehavior";
import type {
  TelemetryEntry,
  TransitionLog,
} from "../../src/domain/telemetry/telemetry";

const ALL_STATES: readonly GuardStateName[] = [
  "patrolling",
  "investigating",
  "pursuing",
  "searching",
  "returning",
];

function keysOf(style: GuardBodyStyle): string[] {
  return Object.keys(style).sort();
}

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

describe("guard body style", () => {
  it("covers every guard state", () => {
    for (const state of ALL_STATES) {
      expect(guardBodyStyleFor(state)).toBeDefined();
    }
  });

  it("assigns the resting style to patrolling and returning", () => {
    const resting = guardBodyStyleFor("patrolling");
    expect(guardBodyStyleFor("returning")).toEqual(resting);
    expect(guardBodyStyleFor("pursuing")).not.toEqual(resting);
    expect(guardBodyStyleFor("investigating")).not.toEqual(resting);
    expect(guardBodyStyleFor("searching")).not.toEqual(resting);
  });

  it("uses distinct styles for the three threat levels", () => {
    const resting = guardBodyStyleFor("patrolling");
    const alert = guardBodyStyleFor("investigating");
    const maximum = guardBodyStyleFor("pursuing");

    expect(alert).not.toEqual(resting);
    expect(maximum).not.toEqual(alert);
    expect(maximum).not.toEqual(resting);
  });

  it("keeps alert states visually equivalent", () => {
    expect(guardBodyStyleFor("searching")).toEqual(
      guardBodyStyleFor("investigating"),
    );
  });

  it("restores the resting style after a pursuit", () => {
    const before = guardBodyStyleFor("patrolling");
    const during = guardBodyStyleFor("pursuing");
    const after = guardBodyStyleFor("patrolling");

    expect(during).not.toEqual(before);
    expect(after).toEqual(before);
  });

  it("exposes only fill and stroke colors", () => {
    for (const state of ALL_STATES) {
      expect(keysOf(guardBodyStyleFor(state))).toEqual(["fill", "stroke"]);
      expect(Number.isInteger(guardBodyStyleFor(state).fill)).toBe(true);
      expect(Number.isInteger(guardBodyStyleFor(state).stroke)).toBe(true);
    }
  });
});

describe("latest state transition", () => {
  it("returns null for an empty log", () => {
    expect(latestStateTransition(log())).toBeNull();
  });

  it("ignores the initial reset entry", () => {
    const reset = entry({ timeMs: 0, previous: null, event: "reset", next: "patrolling" });
    expect(latestStateTransition(log(reset))).toBeNull();
  });

  it("ignores navigation-unreachable entries", () => {
    const unreachable = entry({
      timeMs: 120,
      previous: "pursuing",
      event: "navigation-unreachable",
      next: "pursuing",
      cause: "navigation:goal-unreachable",
    });
    expect(latestStateTransition(log(unreachable))).toBeNull();
  });

  it("returns the latest real transition among mixed entries", () => {
    const reset = entry({ timeMs: 0, previous: null, event: "reset", next: "patrolling" });
    const vision = entry({
      timeMs: 900,
      previous: "patrolling",
      event: "vision-acquired",
      next: "pursuing",
      cause: "vision:visible",
    });
    const unreachable = entry({
      timeMs: 950,
      previous: "pursuing",
      event: "navigation-unreachable",
      next: "pursuing",
      cause: "navigation:goal-unreachable",
    });
    const lost = entry({
      timeMs: 1400,
      previous: "pursuing",
      event: "lost-sight",
      next: "searching",
      cause: "memory:expired",
    });

    const result = latestStateTransition(log(reset, vision, unreachable, lost));
    expect(result).toBe(lost);
  });

  it("returns the real transition even when followed only by noise", () => {
    const sound = entry({
      timeMs: 300,
      previous: "patrolling",
      event: "sound-heard",
      next: "investigating",
      cause: "sound:heard",
    });
    const unreachable = entry({
      timeMs: 400,
      previous: "investigating",
      event: "navigation-unreachable",
      next: "investigating",
      cause: "navigation:goal-unreachable",
    });

    expect(latestStateTransition(log(sound, unreachable))).toBe(sound);
  });
});

describe("flash progress", () => {
  const DURATION = 400;

  it("starts at 0 and reaches 1 at the duration", () => {
    expect(flashProgress(0, DURATION)).toBe(0);
    expect(flashProgress(DURATION, DURATION)).toBe(1);
  });

  it("clamps beyond the boundaries", () => {
    expect(flashProgress(-100, DURATION)).toBe(0);
    expect(flashProgress(DURATION + 500, DURATION)).toBe(1);
  });

  it("is strictly monotonic while active", () => {
    const samples = [50, 100, 200, 350].map((ms) => flashProgress(ms, DURATION));
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThan(samples[index - 1] as number);
    }
    for (const value of samples) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("rejects non-finite inputs and non-positive durations", () => {
    expect(() => flashProgress(Number.NaN, DURATION)).toThrow();
    expect(() => flashProgress(Number.POSITIVE_INFINITY, DURATION)).toThrow();
    expect(() => flashProgress(0, 0)).toThrow();
    expect(() => flashProgress(0, -1)).toThrow();
    expect(() => flashProgress(0, Number.NaN)).toThrow();
  });
});
