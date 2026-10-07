import { describe, expect, it } from "vitest";
import {
  SIGHT_DASH,
  SIGHT_GAP,
  sightLineSegments,
  sightLineStyleFor,
  type SightLineStyle,
} from "../../src/game/presentation/sightLine";
import type { VisionReason } from "../../src/domain/perception/perception";

const ALL_REASONS: readonly VisionReason[] = [
  "visible",
  "out-of-range",
  "outside-cone",
  "occluded",
  "invalid-facing",
  "covered",
];

function segmentsCoverage(
  segments: ReadonlyArray<readonly [{ x: number; y: number }, { x: number; y: number }]>,
): number {
  return segments.reduce((total, segment) => {
    const deltaX = segment[1].x - segment[0].x;
    const deltaY = segment[1].y - segment[0].y;
    return total + Math.hypot(deltaX, deltaY);
  }, 0);
}

describe("sight line style", () => {
  it("defines a style for every vision reason", () => {
    for (const reason of ALL_REASONS) {
      expect(sightLineStyleFor(reason)).toBeDefined();
    }
  });

  it("keeps the line continuous and green only when visible", () => {
    const visible = sightLineStyleFor("visible");
    for (const reason of ALL_REASONS) {
      const style = sightLineStyleFor(reason);
      expect(style.dashed).toBe(reason !== "visible");
      expect(style.color === 0x73c991).toBe(reason === "visible");
    }
    expect(visible).toEqual({ color: 0x73c991, alpha: 0.9, width: 2, dashed: false });
  });

  it("styles covering as dashed amber and the rest as faint grey", () => {
    expect(sightLineStyleFor("covered")).toEqual({
      color: 0xe5b454,
      alpha: 0.8,
      width: 2,
      dashed: true,
    });

    for (const reason of ["out-of-range", "outside-cone", "occluded", "invalid-facing"]) {
      const style = sightLineStyleFor(reason as VisionReason);
      expect(style).toEqual({ color: 0x8a97a3, alpha: 0.45, width: 1, dashed: true });
    }
  });

  it("keeps colors, alphas and widths within their ranges", () => {
    for (const reason of ALL_REASONS) {
      const style = sightLineStyleFor(reason);
      expect(Number.isInteger(style.color)).toBe(true);
      expect(style.alpha).toBeGreaterThan(0);
      expect(style.alpha).toBeLessThanOrEqual(1);
      expect(style.width).toBeGreaterThan(0);
      expect(typeof style.dashed).toBe("boolean");
    }
  });

  it("exposes style only, never geometry", () => {
    const keys: (keyof SightLineStyle)[] = ["color", "alpha", "width", "dashed"];
    for (const reason of ALL_REASONS) {
      expect(Object.keys(sightLineStyleFor(reason)).sort()).toEqual(keys.sort());
    }
  });
});

describe("sight line segments", () => {
  it("covers the full line with dash and gap spacing", () => {
    const segments = sightLineSegments({ x: 0, y: 0 }, { x: 100, y: 0 });
    const first = segments[0];

    expect(segments.length).toBe(Math.ceil(100 / (SIGHT_DASH + SIGHT_GAP)));
    expect(first).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    for (const [start, end] of segments) {
      expect(start.y).toBe(0);
      expect(end.y).toBe(0);
      expect(end.x).toBeLessThanOrEqual(100);
      expect(start.x).toBeLessThan(end.x);
    }
    expect(segmentsCoverage(segments)).toBe(64);
  });

  it("renders a single dash for a line shorter than the dash length", () => {
    const segments = sightLineSegments({ x: 0, y: 0 }, { x: 8, y: 6 });
    const segment = segments[0];

    expect(segments.length).toBe(1);
    expect(segment).toBeDefined();
    const [start, end] = segment as readonly [{ x: number; y: number }, { x: number; y: number }];
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBe(10);
    expect(start).toEqual({ x: 0, y: 0 });
  });

  it("returns no segments for coincident endpoints", () => {
    expect(sightLineSegments({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([]);
  });
});