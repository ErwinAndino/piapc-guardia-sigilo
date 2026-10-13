import { describe, expect, it } from "vitest";
import { cellKey, createGridMap, type GridPoint } from "../../src/domain/model/grid";
import { calculateRoute } from "../../src/application/simulation/navigationDemo";

const START: GridPoint = { x: 0, y: 1 };
const GOAL: GridPoint = { x: 4, y: 1 };
const SLOW_STRIP: readonly GridPoint[] = [
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
];

function freeMap() {
  return createGridMap(5, 3, []);
}

function slowCosts(): Map<string, number> {
  return new Map(SLOW_STRIP.map((point) => [cellKey(point), 5]));
}

describe("calculateRoute como consumidor de navegación", () => {
  it("A-03/A-AC3: con costos usa el modo ponderado y obtiene el rodeo de costo 6", () => {
    const result = calculateRoute(freeMap(), START, GOAL, "astar", slowCosts());

    expect(result.status).toBe("success");
    expect(result.path.length - 1).toBe(6);
    expect(result.totalCost).toBe(6);
    expect(result.path.some((point) => SLOW_STRIP.some((slow) => cellKey(slow) === cellKey(point))))
      .toBe(false);
  });

  it("A-AC3: sin costos conserva el modo unitario de 4 pasos y costo 4", () => {
    const result = calculateRoute(freeMap(), START, GOAL, "astar");

    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
  });

  it("A-01: BFS no cambia con un mapa de costos presente", () => {
    const result = calculateRoute(freeMap(), START, GOAL, "bfs", slowCosts());

    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
  });

  it("A-04: franja a costo 1 recupera el mínimo unitario por el consumidor", () => {
    const unitCosts = new Map(SLOW_STRIP.map((point) => [cellKey(point), 1]));
    const result = calculateRoute(freeMap(), START, GOAL, "astar", unitCosts);

    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
  });
});
