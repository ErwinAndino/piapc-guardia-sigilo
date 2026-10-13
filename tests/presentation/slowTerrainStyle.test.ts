import { describe, expect, it } from "vitest";
import {
  slowTerrainHudLine,
  slowTerrainStyleFor,
} from "../../src/game/presentation/slowTerrainStyle";

describe("slowTerrainStyle presentation", () => {
  it("slowTerrainStyleFor resalta las celdas con coste mayor que 1", () => {
    const slow = slowTerrainStyleFor(5);

    expect(slow.fill).toBe(0xb0893f);
    expect(slow.stroke).toBe(0xe0c46a);
    expect(slow.alpha).toBeGreaterThan(0);
  });

  it("slowTerrainStyleFor deja transparente el terreno unitario", () => {
    expect(slowTerrainStyleFor(1).alpha).toBe(0);
  });

  it("slowTerrainHudLine compone la leyenda de terreno lento", () => {
    expect(slowTerrainHudLine(20, 5)).toBe("terreno lento 20 celdas x5 | A* pondera");
  });
});
