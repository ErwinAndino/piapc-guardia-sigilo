import { describe, expect, it } from "vitest";
import {
  blockedRouteCell,
  createInitialGuardState,
  DEFAULT_GUARD_CONFIG,
  updateGuardSimulation,
  type GuardConfig,
  type GuardSimulationState,
  type GuardSimulationUpdate,
} from "../../src/application/simulation/guardSimulation";
import { cellCenter, createGridMap, worldToCell, type GridMap, type GridPoint } from "../../src/domain/model/grid";
import { latestTransitions } from "../../src/domain/telemetry/telemetry";
import { effectiveMap } from "../../src/domain/model/doors";
import type { SearchAlgorithm } from "../../src/domain/navigation/search";

const TILE = 16;

function testConfig(): GuardConfig {
  return {
    ...DEFAULT_GUARD_CONFIG,
    guardSpeed: 200,
    visionRange: 60,
    lookMsPerDirection: 20,
    searchLimitMs: 400,
    patrolPoints: [
      { x: 2, y: 6 },
      { x: 8, y: 6 },
    ],
  };
}

function tick(
  state: GuardSimulationState,
  playerCell: GridPoint,
  timeMs: number,
  config: GuardConfig,
  map: GridMap,
  options: {
    sound?: boolean;
    deltaMs?: number;
    covered?: boolean;
    algorithm?: SearchAlgorithm;
    entryCosts?: ReadonlyMap<string, number>;
  } = {},
): GuardSimulationUpdate {
  return updateGuardSimulation(state, {
    map,
    tileSize: TILE,
    playerPosition: cellCenter(playerCell, TILE),
    playerSoundRequested: options.sound ?? false,
    timeMs,
    deltaMs: options.deltaMs ?? 16,
    algorithm: options.algorithm ?? "astar",
    entryCosts: options.entryCosts,
    playerCovered: options.covered ?? false,
  }, config);
}

function openMap(): GridMap {
  return createGridMap(14, 12, []);
}

function containsEventInOrder(
  events: readonly string[],
  sequence: readonly string[],
): boolean {
  let previousIndex = -1;
  for (const event of sequence) {
    const index = events.findIndex((candidate, candidateIndex) => (
      candidate === event && candidateIndex > previousIndex
    ));
    if (index < 0) {
      return false;
    }
    previousIndex = index;
  }
  return true;
}

describe("guard simulation", () => {
  it("pursues the player after a valid vision perception", () => {
    const config = testConfig();
    const state = createInitialGuardState(cellCenter({ x: 4, y: 6 }, TILE), TILE, config);
    const update = tick(state, { x: 2, y: 6 }, 16, config, openMap());

    expect(update.vision.visible).toBe(true);
    expect(update.state.behavior.name).toBe("pursuing");
    expect(latestTransitions(update.state.telemetry, 10).map((entry) => entry.event))
      .toContain("vision-acquired");
  });

  it("does not acquire, update memory nor pursue when the player is covered", () => {
    const config = testConfig();
    const state = createInitialGuardState(cellCenter({ x: 4, y: 6 }, TILE), TILE, config);
    const update = tick(
      state,
      { x: 2, y: 6 },
      16,
      config,
      openMap(),
      { covered: true },
    );

    expect(update.vision).toMatchObject({ visible: false, reason: "covered" });
    expect(update.state.behavior.name).not.toBe("pursuing");
    expect(update.state.perception.memory.lastKnownPosition).toBeNull();
    expect(latestTransitions(update.state.telemetry, 10).map((entry) => entry.event))
      .not.toContain("vision-acquired");
  });

  it("investigates a heard sound that is not visible", () => {
    const config = testConfig();
    const map = createGridMap(14, 12, [{ x: 8, y: 6 }]);
    const state = createInitialGuardState(cellCenter({ x: 4, y: 6 }, TILE), TILE, config);
    const update = tick(
      state,
      { x: 12, y: 6 },
      16,
      config,
      map,
      { sound: true },
    );

    expect(update.soundHeard).toBe(true);
    expect(update.vision.visible).toBe(false);
    expect(update.state.behavior.name).toBe("investigating");
    expect(latestTransitions(update.state.telemetry, 10).map((entry) => entry.event))
      .toContain("sound-heard");
  });

  it("chases, loses sight, searches and returns to patrol", () => {
    const config = testConfig();
    const map = openMap();
    let state = createInitialGuardState(cellCenter({ x: 8, y: 6 }, TILE), TILE, config);
    let time = 0;

    for (let index = 0; index < 3; index += 1) {
      const update = tick(state, { x: 5, y: 6 }, time, config, map);
      state = update.state;
      time += 16;
    }
    expect(state.behavior.name).toBe("pursuing");

    for (let index = 0; index < 400; index += 1) {
      const update = tick(state, { x: 12, y: 2 }, time, config, map);
      state = update.state;
      time += 16;
    }

    expect(state.behavior.name).toBe("patrolling");
    const events = latestTransitions(state.telemetry, 100).map((entry) => entry.event);
    expect(containsEventInOrder(events, [
      "vision-acquired",
      "lost-sight",
      "search-timeout",
      "return-to-patrol",
    ])).toBe(true);
  });

  it("keeps pursuing a statically visible player without flapping", () => {
    const config = testConfig();
    const map = openMap();
    let state = createInitialGuardState(cellCenter({ x: 4, y: 6 }, TILE), TILE, config);
    let time = 0;

    for (let index = 0; index < 120; index += 1) {
      const update = tick(state, { x: 2, y: 6 }, time, config, map);
      state = update.state;
      expect(state.behavior.name).toBe("pursuing");
      time += 16;
    }

    const events = latestTransitions(state.telemetry, 200).map((entry) => entry.event);
    expect(events).not.toContain("lost-sight");
  });

  it("does not backtrack while chasing a moving player", () => {
    const config = testConfig();
    const map = openMap();
    let state = createInitialGuardState(cellCenter({ x: 4, y: 6 }, TILE), TILE, config);
    let time = 0;

    const playerCells: GridPoint[] = [
      { x: 2, y: 6 },
      { x: 1, y: 6 },
      { x: 0, y: 6 },
    ];

    let previousX = state.position.x;
    let advanced = false;
    for (let index = 0; index < 60; index += 1) {
      const playerCellIndex = Math.min(Math.floor(index / 8), playerCells.length - 1);
      const playerCell = playerCells[playerCellIndex];
      if (!playerCell) {
        throw new Error("Player cell fixture missing.");
      }
      const update = tick(state, playerCell, time, config, map);
      state = update.state;
      time += 16;

      expect(state.position.x).toBeLessThanOrEqual(previousX);
      if (state.position.x < previousX) {
        advanced = true;
      }
      previousX = state.position.x;
    }

    expect(state.behavior.name).toBe("pursuing");
    expect(advanced).toBe(true);
    expect(state.position.x).toBeLessThan(cellCenter({ x: 1, y: 6 }, TILE).x);
  });

  it("finds the first blocked waypoint cell", () => {
    const map = createGridMap(5, 5, [{ x: 2, y: 0 }]);
    const waypoints = [
      cellCenter({ x: 1, y: 0 }, TILE),
      cellCenter({ x: 2, y: 0 }, TILE),
      cellCenter({ x: 3, y: 0 }, TILE),
    ];

    expect(blockedRouteCell(map, waypoints, TILE)).toEqual({ x: 2, y: 0 });
    expect(blockedRouteCell(map, [cellCenter({ x: 1, y: 0 }, TILE)], TILE)).toBeNull();
    expect(blockedRouteCell(map, [], TILE)).toBeNull();
  });

  it("invalidates and replans when a waypoint becomes blocked", () => {
    const config = testConfig();
    const open = openMap();
    let state = createInitialGuardState(cellCenter({ x: 4, y: 6 }, TILE), TILE, config);
    state = tick(state, { x: 13, y: 11 }, 0, config, open).state;
    expect(state.waypoints.length).toBeGreaterThan(0);

    const blocked = createGridMap(14, 12, [{ x: 3, y: 6 }]);
    const update = tick(state, { x: 13, y: 11 }, 16, config, blocked);
    const entries = latestTransitions(update.state.telemetry, 20);
    const invalidated = entries.find((entry) => entry.event === "route-invalidated");

    expect(invalidated).toBeDefined();
    expect(invalidated?.previous).toBe(invalidated?.next);
    const cells = update.state.waypoints.map((waypoint) => worldToCell(waypoint, TILE));
    expect(cells.some((cell) => cell.x === 3 && cell.y === 6)).toBe(false);
  });

  it("clamps a blocked destination to an adjacent walkable cell", () => {
    const config: GuardConfig = { ...testConfig(), patrolPoints: [{ x: 3, y: 6 }] };
    const map = createGridMap(14, 12, [{ x: 3, y: 6 }]);
    const state = createInitialGuardState(cellCenter({ x: 5, y: 6 }, TILE), TILE, config);
    const update = tick(state, { x: 13, y: 11 }, 16, config, map);

    expect(update.state.planFailed).toBe(false);
    const cells = update.state.waypoints.map((waypoint) => worldToCell(waypoint, TILE));
    expect(cells.some((cell) => cell.x === 3 && cell.y === 6)).toBe(false);
  });

  it("routes through an open door when it is the shortest path", () => {
    const config: GuardConfig = { ...testConfig(), patrolPoints: [{ x: 4, y: 2 }] };
    const base = createGridMap(5, 5, [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ]);
    const door = [{ x: 2, y: 2 }];
    const open = effectiveMap(base, door, door);

    const state = createInitialGuardState(cellCenter({ x: 0, y: 2 }, TILE), TILE, config);
    const update = tick(state, { x: 4, y: 4 }, 16, config, open);
    const cells = update.state.waypoints.map((waypoint) => worldToCell(waypoint, TILE));

    expect(update.state.planFailed).toBe(false);
    expect(cells.some((cell) => cell.x === 2 && cell.y === 2)).toBe(true);
  });
});

describe("terreno lento en el consumidor de simulación", () => {
  function corridorConfig(): GuardConfig {
    return { ...testConfig(), patrolPoints: [{ x: 8, y: 1 }] };
  }

  function slowMap(): GridMap {
    return createGridMap(9, 3, []);
  }

  function slowCosts(): ReadonlyMap<string, number> {
    const costs = new Map<string, number>();
    for (let x = 1; x <= 7; x += 1) {
      costs.set(`${x},1`, 5);
    }
    return costs;
  }

  function routeCells(update: GuardSimulationUpdate): GridPoint[] {
    return update.state.waypoints.map((waypoint) => worldToCell(waypoint, TILE));
  }

  function crossesSlowTerrain(cells: readonly GridPoint[], costs: ReadonlyMap<string, number>): boolean {
    return cells.some((cell) => costs.has(`${cell.x},${cell.y}`));
  }

  it("E-AC1: con costos el guardia evita la franja lenta", () => {
    const config = corridorConfig();
    const state = createInitialGuardState(cellCenter({ x: 0, y: 1 }, TILE), TILE, config);
    const update = tick(state, { x: 8, y: 2 }, 16, config, slowMap(), {
      entryCosts: slowCosts(),
    });

    expect(update.state.planFailed).toBe(false);
    expect(update.state.waypoints.length).toBeGreaterThan(0);
    expect(crossesSlowTerrain(routeCells(update), slowCosts())).toBe(false);
  });

  it("E-AC1: sin costos el guardia cruza la franja (mínimo unitario)", () => {
    const config = corridorConfig();
    const state = createInitialGuardState(cellCenter({ x: 0, y: 1 }, TILE), TILE, config);
    const update = tick(state, { x: 8, y: 2 }, 16, config, slowMap());

    expect(crossesSlowTerrain(routeCells(update), slowCosts())).toBe(true);
  });

  it("E-AC2: BFS ignora los costos y cruza la franja", () => {
    const config = corridorConfig();
    const state = createInitialGuardState(cellCenter({ x: 0, y: 1 }, TILE), TILE, config);
    const update = tick(state, { x: 8, y: 2 }, 16, config, slowMap(), {
      algorithm: "bfs",
      entryCosts: slowCosts(),
    });

    expect(crossesSlowTerrain(routeCells(update), slowCosts())).toBe(true);
  });
});