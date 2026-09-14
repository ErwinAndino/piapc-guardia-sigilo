import { describe, expect, it } from "vitest";
import { nextPatrolIndex } from "../../src/domain/behavior/patrol";
import { PATROL_POINTS, LAB_MAP } from "../../src/application/simulation/labLevel";
import { isWalkable } from "../../src/domain/model/grid";
import { findPathAStar } from "../../src/domain/navigation/search";

describe("patrol plan", () => {
  it("advances the index cyclically", () => {
    expect(nextPatrolIndex(0, 4)).toBe(1);
    expect(nextPatrolIndex(3, 4)).toBe(0);
  });

  it("rejects invalid indexes and empty patrols", () => {
    expect(() => nextPatrolIndex(-1, 4)).toThrow("Patrol index");
    expect(() => nextPatrolIndex(0, 0)).toThrow("Patrol points");
    expect(() => nextPatrolIndex(0.5, 4)).toThrow("Patrol index");
  });

  it("keeps every patrol point walkable and mutually reachable", () => {
    expect(PATROL_POINTS.length).toBeGreaterThanOrEqual(2);
    for (const point of PATROL_POINTS) {
      expect(isWalkable(LAB_MAP, point)).toBe(true);
    }
    for (let index = 0; index < PATROL_POINTS.length; index += 1) {
      const current = PATROL_POINTS[index];
      const following = PATROL_POINTS[(index + 1) % PATROL_POINTS.length];
      if (!current || !following) {
        throw new Error("Patrol point invariant failed.");
      }
      const result = findPathAStar(LAB_MAP, current, following);
      expect(result.status, `route ${index} -> ${(index + 1) % PATROL_POINTS.length}`)
        .toBe("success");
    }
  });
});