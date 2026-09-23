import { describe, expect, it } from "vitest";
import {
  createInitialGuardState,
  DEFAULT_GUARD_CONFIG,
  updateGuardSimulation,
  type GuardConfig,
  type GuardSimulationState,
  type GuardSimulationUpdate,
} from "../../src/application/simulation/guardSimulation";
import { cellCenter, createGridMap, type GridMap, type GridPoint } from "../../src/domain/model/grid";
import { latestTransitions } from "../../src/domain/telemetry/telemetry";

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
  options: { sound?: boolean; deltaMs?: number } = {},
): GuardSimulationUpdate {
  return updateGuardSimulation(state, {
    map,
    tileSize: TILE,
    playerPosition: cellCenter(playerCell, TILE),
    playerSoundRequested: options.sound ?? false,
    timeMs,
    deltaMs: options.deltaMs ?? 16,
    algorithm: "astar",
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
});