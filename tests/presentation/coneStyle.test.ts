import { describe, expect, it } from "vitest";
import {
  coneStyleFor,
  type ConeStyle,
} from "../../src/game/presentation/coneStyle";
import type { GuardStateName } from "../../src/domain/behavior/guardBehavior";

const ALL_STATES: readonly GuardStateName[] = [
  "patrolling",
  "investigating",
  "pursuing",
  "searching",
  "returning",
];

function keysOf(style: ConeStyle): string[] {
  return Object.keys(style).sort();
}

describe("cone style", () => {
  it("covers every guard state", () => {
    for (const state of ALL_STATES) {
      expect(coneStyleFor(state)).toBeDefined();
    }
  });

  it("assigns the resting style to patrolling and returning", () => {
    const resting = coneStyleFor("patrolling");
    expect(coneStyleFor("returning")).toEqual(resting);
    expect(coneStyleFor("pursuing")).not.toEqual(resting);
    expect(coneStyleFor("investigating")).not.toEqual(resting);
    expect(coneStyleFor("searching")).not.toEqual(resting);
  });

  it("uses distinct styles for the three threat levels", () => {
    const resting = coneStyleFor("patrolling");
    const alert = coneStyleFor("investigating");
    const maximum = coneStyleFor("pursuing");

    expect(alert).not.toEqual(resting);
    expect(maximum).not.toEqual(alert);
    expect(maximum).not.toEqual(resting);
  });

  it("keeps alert states visually equivalent", () => {
    expect(coneStyleFor("searching")).toEqual(coneStyleFor("investigating"));
  });

  it("restores the resting style after a pursuit", () => {
    const before = coneStyleFor("patrolling");
    const during = coneStyleFor("pursuing");
    const after = coneStyleFor("patrolling");

    expect(during).not.toEqual(before);
    expect(after).toEqual(before);
  });

  it("exposes style only, never cone geometry", () => {
    for (const state of ALL_STATES) {
      expect(keysOf(coneStyleFor(state))).toEqual(["alpha", "fill"]);
    }
  });

  it("keeps alpha values inside the graphic range", () => {
    for (const state of ALL_STATES) {
      const style = coneStyleFor(state);
      expect(style.alpha).toBeGreaterThan(0);
      expect(style.alpha).toBeLessThanOrEqual(1);
      expect(Number.isInteger(style.fill)).toBe(true);
    }
  });
});
