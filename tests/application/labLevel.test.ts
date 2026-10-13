import { describe, expect, it } from "vitest";
import { cellKey, isWalkable } from "../../src/domain/model/grid";
import {
  LAB_ENTRY_COSTS,
  LAB_MAP,
  LAB_SLOW_CELLS,
  SLOW_TERRAIN_COST,
} from "../../src/application/simulation/labLevel";

describe("labLevel — terreno lento", () => {
  it("marca la franja y=17, x=5..24", () => {
    expect(LAB_SLOW_CELLS.length).toBe(20);
    for (const cell of LAB_SLOW_CELLS) {
      expect(cell.y).toBe(17);
      expect(cell.x).toBeGreaterThanOrEqual(5);
      expect(cell.x).toBeLessThanOrEqual(24);
    }
  });

  it("solo marca celdas transitables con costo 5", () => {
    for (const cell of LAB_SLOW_CELLS) {
      expect(isWalkable(LAB_MAP, cell)).toBe(true);
      expect(LAB_ENTRY_COSTS.get(cellKey(cell))).toBe(SLOW_TERRAIN_COST);
    }
    expect(LAB_ENTRY_COSTS.size).toBe(LAB_SLOW_CELLS.length);
  });
});
