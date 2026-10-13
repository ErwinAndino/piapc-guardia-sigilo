import { describe, expect, it } from "vitest";
import {
  HOLD_AFTER_PURSUIT_MS,
  ZOOM_BASE,
  ZOOM_PURSUE,
  ZOOM_SMOOTH_FACTOR,
  advancePursuitHold,
  advanceZoom,
  cameraFocus,
  initialPursuitHoldMs,
  initialZoom,
  zoomTargetFor,
} from "../../src/game/presentation/cameraTension";
import type { GuardStateName } from "../../src/domain/behavior/guardBehavior";

const ALL_STATES: readonly GuardStateName[] = [
  "patrolling",
  "investigating",
  "pursuing",
  "searching",
  "returning",
];

const MAP_CENTER = { x: 480, y: 320 };
const PLAYER = { x: 120, y: 90 };

function sampleIn(state: GuardStateName, steps: number): number[] {
  const samples: number[] = [];
  let zoom = initialZoom;
  for (let index = 0; index < steps; index += 1) {
    zoom = advanceZoom(zoom, zoomTargetFor(state), ZOOM_SMOOTH_FACTOR);
    samples.push(zoom);
  }
  return samples;
}

function withinRange(zoom: number): boolean {
  return zoom >= ZOOM_BASE - 1e-9 && zoom <= ZOOM_PURSUE + 1e-9;
}

describe("zoom constants", () => {
  it("keeps a pursue zoom strictly above base within range", () => {
    expect(ZOOM_BASE).toBe(1);
    expect(ZOOM_PURSUE).toBeGreaterThan(ZOOM_BASE);
    expect(ZOOM_PURSUE).toBeLessThanOrEqual(1.15);
    expect(ZOOM_SMOOTH_FACTOR).toBeGreaterThan(0);
    expect(ZOOM_SMOOTH_FACTOR).toBeLessThanOrEqual(1);
    expect(initialZoom).toBe(ZOOM_BASE);
  });

  it("declares a positive hold after pursuit and a clean initial hold", () => {
    expect(HOLD_AFTER_PURSUIT_MS).toBe(2500);
    expect(initialPursuitHoldMs).toBe(0);
  });
});

describe("zoom target by state", () => {
  it("targets the base zoom except in pursuit", () => {
    expect(zoomTargetFor("patrolling")).toBe(ZOOM_BASE);
    expect(zoomTargetFor("investigating")).toBe(ZOOM_BASE);
    expect(zoomTargetFor("searching")).toBe(ZOOM_BASE);
    expect(zoomTargetFor("returning")).toBe(ZOOM_BASE);
  });

  it("targets exactly the pursue zoom while pursuing", () => {
    expect(zoomTargetFor("pursuing")).toBe(ZOOM_PURSUE);
  });

  it("covers every guard state", () => {
    for (const state of ALL_STATES) {
      expect(Number.isFinite(zoomTargetFor(state))).toBe(true);
    }
  });

  it("keeps the pursue target while the hold is active in any state", () => {
    for (const state of ALL_STATES) {
      expect(zoomTargetFor(state, HOLD_AFTER_PURSUIT_MS)).toBe(ZOOM_PURSUE);
    }
    expect(zoomTargetFor("patrolling", initialPursuitHoldMs)).toBe(ZOOM_BASE);
  });

  it("rejects a non-finite hold remaining time", () => {
    expect(() => zoomTargetFor("patrolling", Number.NaN)).toThrow();
    expect(() => zoomTargetFor("patrolling", Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("pursuit hold", () => {
  it("refreshes the full hold while pursuing", () => {
    expect(advancePursuitHold(0, true, 16, HOLD_AFTER_PURSUIT_MS)).toBe(HOLD_AFTER_PURSUIT_MS);
    expect(advancePursuitHold(900, true, 16, HOLD_AFTER_PURSUIT_MS)).toBe(HOLD_AFTER_PURSUIT_MS);
  });

  it("drains by the simulation delta and never goes below zero", () => {
    expect(advancePursuitHold(HOLD_AFTER_PURSUIT_MS, false, 500, HOLD_AFTER_PURSUIT_MS)).toBe(2000);
    expect(advancePursuitHold(300, false, 500, HOLD_AFTER_PURSUIT_MS)).toBe(0);
    expect(advancePursuitHold(0, false, 500, HOLD_AFTER_PURSUIT_MS)).toBe(0);
  });

  it("resets to the full hold when pursuit resumes inside the window", () => {
    let hold = advancePursuitHold(0, true, 16, HOLD_AFTER_PURSUIT_MS);
    hold = advancePursuitHold(hold, false, 2000, HOLD_AFTER_PURSUIT_MS);
    expect(hold).toBe(500);
    hold = advancePursuitHold(hold, true, 16, HOLD_AFTER_PURSUIT_MS);
    expect(hold).toBe(HOLD_AFTER_PURSUIT_MS);
  });

  it("supports a zero-duration hold", () => {
    expect(advancePursuitHold(0, true, 16, 0)).toBe(0);
    expect(advancePursuitHold(0, false, 16, 0)).toBe(0);
  });

  it("rejects non-finite values and negative intervals", () => {
    expect(() => advancePursuitHold(Number.NaN, false, 16, 100)).toThrow();
    expect(() => advancePursuitHold(0, false, Number.NaN, 100)).toThrow();
    expect(() => advancePursuitHold(0, false, 16, Number.POSITIVE_INFINITY)).toThrow();
    expect(() => advancePursuitHold(0, false, -16, 100)).toThrow();
    expect(() => advancePursuitHold(0, false, 16, -1)).toThrow();
  });
});

describe("camera focus", () => {
  it("centers the map at base zoom", () => {
    expect(cameraFocus(ZOOM_BASE, PLAYER, MAP_CENTER)).toEqual(MAP_CENTER);
  });

  it("centers the player at pursue zoom", () => {
    expect(cameraFocus(ZOOM_PURSUE, PLAYER, MAP_CENTER)).toEqual(PLAYER);
  });

  it("interpolates linearly inside the zoom range", () => {
    const mid = cameraFocus((ZOOM_BASE + ZOOM_PURSUE) / 2, PLAYER, MAP_CENTER);
    expect(mid.x).toBeCloseTo((MAP_CENTER.x + PLAYER.x) / 2, 6);
    expect(mid.y).toBeCloseTo((MAP_CENTER.y + PLAYER.y) / 2, 6);
  });

  it("never extrapolates beyond the map center or the player", () => {
    expect(cameraFocus(ZOOM_BASE - 2, PLAYER, MAP_CENTER)).toEqual(MAP_CENTER);
    expect(cameraFocus(ZOOM_PURSUE + 5, PLAYER, MAP_CENTER)).toEqual(PLAYER);
  });

  it("rejects non-finite zoom and player components", () => {
    expect(() => cameraFocus(Number.NaN, PLAYER, MAP_CENTER)).toThrow();
    expect(() => cameraFocus(Number.POSITIVE_INFINITY, PLAYER, MAP_CENTER)).toThrow();
    expect(() => cameraFocus(ZOOM_BASE, { x: Number.NaN, y: 0 }, MAP_CENTER)).toThrow();
  });
});

describe("zoom advance", () => {
  it("converges to the pursue target without overshooting", () => {
    const samples = sampleIn("pursuing", 300);
    for (const sample of samples) {
      expect(withinRange(sample)).toBe(true);
      expect(sample).toBeLessThanOrEqual(ZOOM_PURSUE + 1e-9);
      expect(sample).toBeGreaterThanOrEqual(ZOOM_BASE - 1e-9);
    }
    expect(samples[samples.length - 1]).toBeCloseTo(ZOOM_PURSUE, 6);
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index] as number).toBeGreaterThanOrEqual(samples[index - 1] as number);
    }
  });

  it("returns to base after leaving pursuit without residual", () => {
    let zoom = initialZoom;
    for (let index = 0; index < 300; index += 1) {
      zoom = advanceZoom(zoom, zoomTargetFor("pursuing"), ZOOM_SMOOTH_FACTOR);
    }
    expect(zoom).toBeCloseTo(ZOOM_PURSUE, 6);
    for (let index = 0; index < 300; index += 1) {
      zoom = advanceZoom(zoom, zoomTargetFor("patrolling"), ZOOM_SMOOTH_FACTOR);
    }
    expect(zoom).toBeCloseTo(ZOOM_BASE, 6);
    expect(initialZoom).toBe(ZOOM_BASE);
  });

  it("dampens rapid pursuit alternation within range", () => {
    const sequence: readonly GuardStateName[] = [
      "pursuing",
      "patrolling",
      "pursuing",
      "investigating",
      "pursuing",
      "returning",
    ];
    let zoom = initialZoom;
    for (let cycle = 0; cycle < 5; cycle += 1) {
      for (const state of sequence) {
        zoom = advanceZoom(zoom, zoomTargetFor(state), ZOOM_SMOOTH_FACTOR);
        expect(withinRange(zoom)).toBe(true);
      }
    }
  });

  it("clamps the factor to the unit interval", () => {
    expect(advanceZoom(ZOOM_BASE, ZOOM_PURSUE, 10)).toBe(ZOOM_PURSUE);
    expect(advanceZoom(ZOOM_PURSUE, ZOOM_BASE, -5)).toBe(ZOOM_PURSUE);
  });

  it("rejects non-finite values", () => {
    expect(() => advanceZoom(Number.NaN, ZOOM_PURSUE, 0.1)).toThrow();
    expect(() => advanceZoom(ZOOM_BASE, Number.POSITIVE_INFINITY, 0.1)).toThrow();
    expect(() => advanceZoom(ZOOM_BASE, ZOOM_PURSUE, Number.NaN)).toThrow();
  });
});

describe("zoom with pursuit hold", () => {
  const DELTA = 16;

  function stepFrame(
    zoom: number,
    hold: number,
    pursuing: boolean,
  ): { zoom: number; hold: number } {
    const nextHold = advancePursuitHold(hold, pursuing, DELTA, HOLD_AFTER_PURSUIT_MS);
    const nextZoom = advanceZoom(
      zoom,
      zoomTargetFor(pursuing ? "pursuing" : "searching", nextHold),
      ZOOM_SMOOTH_FACTOR,
    );
    return { zoom: nextZoom, hold: nextHold };
  }

  it("keeps the pursue zoom during the hold and returns to base afterwards", () => {
    let zoom = initialZoom;
    let hold = initialPursuitHoldMs;
    for (let index = 0; index < 300; index += 1) {
      ({ zoom, hold } = stepFrame(zoom, hold, true));
    }
    expect(zoom).toBeCloseTo(ZOOM_PURSUE, 6);

    for (let index = 0; index < 100; index += 1) {
      ({ zoom, hold } = stepFrame(zoom, hold, false));
    }
    expect(hold).toBeGreaterThan(0);
    expect(zoom).toBeCloseTo(ZOOM_PURSUE, 6);

    for (let index = 0; index < 300; index += 1) {
      ({ zoom, hold } = stepFrame(zoom, hold, false));
    }
    expect(hold).toBe(0);
    expect(zoom).toBeCloseTo(ZOOM_BASE, 6);
  });

  it("does not bounce when pursuit flickers inside the hold window", () => {
    let zoom = initialZoom;
    let hold = initialPursuitHoldMs;
    for (let index = 0; index < 300; index += 1) {
      ({ zoom, hold } = stepFrame(zoom, hold, true));
    }
    for (let index = 0; index < 600; index += 1) {
      ({ zoom, hold } = stepFrame(zoom, hold, index % 80 === 0));
      expect(withinRange(zoom)).toBe(true);
      expect(zoom).toBeGreaterThan(ZOOM_BASE);
    }
  });
});