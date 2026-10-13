import { describe, expect, it } from "vitest";
import { cellKey, createGridMap, isWalkable, type GridPoint } from "../../src/domain/model/grid";
import { findPathAStar, findPathBfs } from "../../src/domain/navigation/search";

const START: GridPoint = { x: 0, y: 0 };
const GOAL: GridPoint = { x: 4, y: 0 };
const DETOUR_MAP = createGridMap(5, 5, [
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
  { x: 2, y: 3 },
]);

describe.each([
  ["BFS", findPathBfs],
  ["A*", findPathAStar],
] as const)("%s", (_name, findPath) => {
  it("finds an optimal walkable route", () => {
    const result = findPath(DETOUR_MAP, START, GOAL);

    expect(result.status).toBe("success");
    expect(result.totalCost).toBe(12);
    expect(result.path[0]).toEqual(START);
    expect(result.path.at(-1)).toEqual(GOAL);
    expect(result.path.every((point) => isWalkable(DETOUR_MAP, point))).toBe(true);
    expect(result.expandedNodes).toBeGreaterThan(0);
    expect(result.maximumFrontier).toBeGreaterThan(0);
  });

  it("returns a one-cell path when start equals goal", () => {
    const result = findPath(DETOUR_MAP, START, START);

    expect(result.status).toBe("success");
    expect(result.path).toEqual([START]);
    expect(result.totalCost).toBe(0);
    expect(result.explored).toEqual([START]);
    expect(result.expandedNodes).toBe(1);
    expect(result.maximumFrontier).toBe(1);
  });

  it("reports invalid endpoints without exploring", () => {
    const invalidStart = findPath(DETOUR_MAP, { x: -1, y: 0 }, GOAL);
    const invalidGoal = findPath(DETOUR_MAP, START, { x: 2, y: 0 });

    expect(invalidStart.status).toBe("invalid-start");
    expect(invalidGoal.status).toBe("invalid-goal");
    expect(invalidGoal.expandedNodes).toBe(0);
  });

  it("reports an unreachable goal explicitly", () => {
    const splitMap = createGridMap(3, 3, [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
    const result = findPath(splitMap, { x: 0, y: 1 }, { x: 2, y: 1 });

    expect(result.status).toBe("unreachable");
    expect(result.path).toEqual([]);
    expect(result.totalCost).toBeNull();
    expect(result.expandedNodes).toBe(3);
    expect(result.maximumFrontier).toBe(2);
    expect(result.explored).toEqual([
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 0, y: 2 },
    ]);
  });
});

describe("algorithm comparison", () => {
  it("A* preserves optimal cost while expanding no more nodes than BFS", () => {
    const bfs = findPathBfs(DETOUR_MAP, START, GOAL);
    const astar = findPathAStar(DETOUR_MAP, START, GOAL);

    expect(astar.totalCost).toBe(bfs.totalCost);
    expect(astar.expandedNodes).toBeLessThanOrEqual(bfs.expandedNodes);
  });
});

describe("anexo A: terreno lento (costos de entrada)", () => {
  const SLOW_START: GridPoint = { x: 0, y: 1 };
  const SLOW_GOAL: GridPoint = { x: 4, y: 1 };
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

  function pathCost(path: readonly GridPoint[], costs: ReadonlyMap<string, number>): number {
    return path.slice(1).reduce((sum, point) => sum + (costs.get(cellKey(point)) ?? 1), 0);
  }

  it("A-AC1: la ruta directa unitaria tiene 4 pasos y su costo ponderado es 16", () => {
    const map = freeMap();
    const unit = findPathAStar(map, SLOW_START, SLOW_GOAL);

    expect(unit.path.length - 1).toBe(4);
    expect(pathCost(unit.path, slowCosts())).toBe(16);
  });

  it("A-AC1: la búsqueda ponderada elige un rodeo de 6 pasos y costo 6 sin entrar en la franja", () => {
    const map = freeMap();
    const result = findPathAStar(map, SLOW_START, SLOW_GOAL, slowCosts());

    expect(result.status).toBe("success");
    expect(result.path.length - 1).toBe(6);
    expect(result.totalCost).toBe(6);
    expect(result.path[0]).toEqual(SLOW_START);
    expect(result.path.at(-1)).toEqual(SLOW_GOAL);
    expect(result.path.every((point) => isWalkable(map, point))).toBe(true);
    expect(result.path.some((point) => SLOW_STRIP.some((slow) => cellKey(slow) === cellKey(point))))
      .toBe(false);
  });

  it("A-02: el inicio no suma costo", () => {
    const costs = slowCosts();
    costs.set(cellKey(SLOW_START), 100);
    const result = findPathAStar(freeMap(), SLOW_START, SLOW_GOAL, costs);

    expect(result.totalCost).toBe(6);
  });

  it("A-04: si la franja vuelve a costo 1 recupera el mínimo unitario", () => {
    const unitCosts = new Map(SLOW_STRIP.map((point) => [cellKey(point), 1]));
    const result = findPathAStar(freeMap(), SLOW_START, SLOW_GOAL, unitCosts);

    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
  });

  it("A-AC2: sin costos, A* conserva el resultado unitario de 4 pasos y costo 4", () => {
    const result = findPathAStar(freeMap(), SLOW_START, SLOW_GOAL);

    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
  });

  it("A-01: BFS conserva su semántica unitaria y no recibe costos", () => {
    const result = findPathBfs(freeMap(), SLOW_START, SLOW_GOAL);

    expect(result.path.length - 1).toBe(4);
    expect(result.totalCost).toBe(4);
    expect(result.path.some((point) => SLOW_STRIP.some((slow) => cellKey(slow) === cellKey(point))))
      .toBe(true);
  });
});
