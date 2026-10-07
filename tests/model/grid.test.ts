import { describe, expect, it } from "vitest";
import { LAB_MAP, PLAYER_START, TILE_SIZE } from "../../src/application/simulation/labLevel";
import {
  cellCenter,
  createGridMap,
  hasAdjacentObstacle,
  isWalkable,
  nearestWalkable,
  worldToCell,
} from "../../src/domain/model/grid";

describe("grid map", () => {
  it("keeps the player start cell walkable", () => {
    expect(isWalkable(LAB_MAP, PLAYER_START)).toBe(true);
  });

  it("blocks the level boundary and positions outside the map", () => {
    expect(isWalkable(LAB_MAP, { x: 0, y: 0 })).toBe(false);
    expect(isWalkable(LAB_MAP, { x: -1, y: 2 })).toBe(false);
    expect(isWalkable(LAB_MAP, { x: LAB_MAP.width, y: 2 })).toBe(false);
    expect(isWalkable(LAB_MAP, { x: 1.5, y: 2 })).toBe(false);
  });

  it("converts between cells and world coordinates", () => {
    const cell = { x: 7, y: 4 };

    expect(worldToCell(cellCenter(cell, TILE_SIZE), TILE_SIZE)).toEqual(cell);
  });

  it("rejects blocked cells outside the grid", () => {
    expect(() => createGridMap(2, 2, [{ x: 2, y: 0 }])).toThrow(
      "Blocked cell is outside the grid",
    );
  });

  it("rejects invalid tile sizes and world coordinates", () => {
    expect(() => cellCenter({ x: 0, y: 0 }, 0)).toThrow("Tile size");
    expect(() => worldToCell({ x: Number.NaN, y: 0 }, TILE_SIZE)).toThrow(
      "World coordinates",
    );
  });

  describe("hasAdjacentObstacle", () => {
    const map = createGridMap(4, 4, [{ x: 2, y: 2 }]);

    it("is false for an interior cell whose cardinal neighbours are walkable", () => {
      expect(hasAdjacentObstacle(map, { x: 1, y: 1 })).toBe(false);
    });

    it("is true when any cardinal neighbour is a blocked cell", () => {
      expect(hasAdjacentObstacle(map, { x: 1, y: 2 })).toBe(true);
      expect(hasAdjacentObstacle(map, { x: 2, y: 1 })).toBe(true);
      expect(hasAdjacentObstacle(map, { x: 3, y: 2 })).toBe(true);
      expect(hasAdjacentObstacle(map, { x: 2, y: 3 })).toBe(true);
    });

    it("treats a neighbour outside the map as an obstacle", () => {
      expect(hasAdjacentObstacle(map, { x: 0, y: 1 })).toBe(true);
      expect(hasAdjacentObstacle(map, { x: 1, y: 0 })).toBe(true);
      expect(hasAdjacentObstacle(map, { x: 3, y: 3 })).toBe(true);
    });
  });

  describe("nearestWalkable", () => {
    it("returns the same cell when walkable", () => {
      const map = createGridMap(3, 3, []);
      const cell = { x: 1, y: 1 };
      expect(nearestWalkable(map, cell)).toEqual(cell);
    });

    it("returns first cardinal walkable neighbor in order N/E/S/W", () => {
      const map = createGridMap(3, 3, [{ x: 1, y: 1 }]);
      expect(nearestWalkable(map, { x: 1, y: 1 })).toEqual({ x: 1, y: 0 });
      const map2 = createGridMap(3, 3, [{ x: 1, y: 1 }, { x: 1, y: 0 }]);
      expect(nearestWalkable(map2, { x: 1, y: 1 })).toEqual({ x: 2, y: 1 });
      const map3 = createGridMap(3, 3, [
        { x: 1, y: 1 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
      ]);
      expect(nearestWalkable(map3, { x: 1, y: 1 })).toEqual({ x: 1, y: 2 });
      const map4 = createGridMap(3, 3, [
        { x: 1, y: 1 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ]);
      expect(nearestWalkable(map4, { x: 1, y: 1 })).toEqual({ x: 0, y: 1 });
    });

    it("returns original cell when no neighbor is free", () => {
      const map = createGridMap(3, 3, [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 0 },
      ]);
      expect(nearestWalkable(map, { x: 1, y: 1 })).toEqual({ x: 1, y: 1 });
    });
  });
});
