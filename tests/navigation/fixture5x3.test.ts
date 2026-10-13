import { describe, expect, it } from "vitest";
import { createGridMap, isWalkable, type GridPoint } from "../../src/domain/model/grid";
import { findPathAStar, findPathBfs } from "../../src/domain/navigation/search";

const START: GridPoint = { x: 0, y: 1 };
const GOAL: GridPoint = { x: 4, y: 1 };

function freeMap() {
  return createGridMap(5, 3, []);
}

function barrierMap() {
  return createGridMap(5, 3, [
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
  ]);
}

describe.each([
  ["BFS", findPathBfs],
  ["A*", findPathAStar],
] as const)("fixture 5x3 libre — %s", (_name, findPath) => {
  it("encuentra la única ruta de 4 pasos y costo 4", () => {
    const map = freeMap();
    const result = findPath(map, START, GOAL);

    expect(result.status).toBe("success");
    expect(result.path).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ]);
    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
    expect(result.path.every((point) => isWalkable(map, point))).toBe(true);
  });

  it("inicio igual a meta es éxito de costo 0", () => {
    const result = findPath(freeMap(), START, START);

    expect(result.status).toBe("success");
    expect(result.path).toEqual([START]);
    expect(result.totalCost).toBe(0);
    expect(result.expandedNodes).toBe(1);
    expect(result.maximumFrontier).toBe(1);
  });

  it("barrera completa en x=2 da inaccesible, no inválido", () => {
    const result = findPath(barrierMap(), START, GOAL);

    expect(result.status).toBe("unreachable");
    expect(result.path).toEqual([]);
    expect(result.totalCost).toBeNull();
  });

  it("extremos fuera del mapa producen estados inválidos distintos", () => {
    const invalidStart = findPath(freeMap(), { x: -1, y: 1 }, GOAL);
    const invalidGoal = findPath(freeMap(), START, { x: 5, y: 1 });

    expect(invalidStart.status).toBe("invalid-start");
    expect(invalidGoal.status).toBe("invalid-goal");
    expect(invalidStart.expandedNodes).toBe(0);
    expect(invalidGoal.expandedNodes).toBe(0);
  });
});

describe("métricas observables del fixture libre", () => {
  it("BFS expande 12 nodos con frontera máxima 4", () => {
    const result = findPathBfs(freeMap(), START, GOAL);
    expect(result.expandedNodes).toBe(12);
    expect(result.maximumFrontier).toBe(4);
  });

  it("A* expande 5 nodos con frontera máxima 9", () => {
    const result = findPathAStar(freeMap(), START, GOAL);
    expect(result.expandedNodes).toBe(5);
    expect(result.maximumFrontier).toBe(9);
  });
});
