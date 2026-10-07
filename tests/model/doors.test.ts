import { describe, expect, it } from "vitest";
import { createGridMap } from "../../src/domain/model/grid";
import { doorInteraction, effectiveMap } from "../../src/domain/model/doors";
import { LAB_MAP } from "../../src/application/simulation/labLevel";

const DOOR_CELLS = [
  { x: 4, y: 6 },
  { x: 19, y: 8 },
  { x: 16, y: 15 },
] as const;

describe("doors model", () => {
  it("effectiveMap with closed doors preserves base blocked set", () => {
    const effective = effectiveMap(LAB_MAP, [...DOOR_CELLS], []);

    expect(effective.blocked.size).toBe(LAB_MAP.blocked.size);
    for (const key of LAB_MAP.blocked) {
      expect(effective.blocked.has(key)).toBe(true);
    }
  });

  it("effectiveMap unlocks only declared open doors and validates input", () => {
    const effective = effectiveMap(LAB_MAP, [...DOOR_CELLS], [{ x: 4, y: 6 }]);
    const key = "4,6";

    expect(LAB_MAP.blocked.has(key)).toBe(true);
    expect(effective.blocked.has(key)).toBe(false);

    expect(() => effectiveMap(LAB_MAP, [...DOOR_CELLS], [{ x: 5, y: 5 }])).toThrow(
      /not declared/i,
    );
    expect(() => effectiveMap(LAB_MAP, [...DOOR_CELLS], [{ x: -1, y: 0 }])).toThrow(
      /outside the grid/i,
    );
  });

  it("doorInteraction returns correct interactions by range and occupancy", () => {
    const doors = [...DOOR_CELLS];
    const openDoors: { x: number; y: number }[] = [];

    expect(doorInteraction(doors, openDoors, { x: 1, y: 1 }, { x: 10, y: 10 })).toEqual({
      interaction: "none",
      door: null,
    });

    expect(doorInteraction(doors, openDoors, { x: 4, y: 7 }, { x: 10, y: 10 })).toEqual({
      interaction: "open",
      door: { x: 4, y: 6 },
    });
    expect(doorInteraction(doors, openDoors, { x: 4, y: 6 }, { x: 10, y: 10 })).toEqual({
      interaction: "open",
      door: { x: 4, y: 6 },
    });

    const open = [{ x: 4, y: 6 }];
    expect(doorInteraction(doors, open, { x: 4, y: 7 }, { x: 10, y: 10 })).toEqual({
      interaction: "close",
      door: { x: 4, y: 6 },
    });

    expect(doorInteraction(doors, open, { x: 4, y: 6 }, { x: 10, y: 10 })).toEqual({
      interaction: "occupied",
      door: { x: 4, y: 6 },
    });
    expect(doorInteraction(doors, open, { x: 4, y: 7 }, { x: 4, y: 6 })).toEqual({
      interaction: "occupied",
      door: { x: 4, y: 6 },
    });

    const map = createGridMap(5, 5, []);
    expect(() => effectiveMap(map, doors, [{ x: 0, y: 0 }])).toThrow(/not declared/i);
  });
});