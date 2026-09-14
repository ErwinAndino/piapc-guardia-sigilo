import { describe, expect, it } from "vitest";
import { createGridMap, type GridMap, type GridPoint } from "../../src/domain/model/grid";
import {
  initialGuardSimulationState,
  updateGuardSimulation,
  withGuardSound,
  type GuardSimulationInput,
  type GuardSimulationState,
} from "../../src/application/simulation/guardSimulation";
import type { Vector2 } from "../../src/domain/model/vector";
import type { SoundEvent } from "../../src/domain/perception/perception";
import type { GuardState } from "../../src/domain/behavior/guardStates";

const TILE = 10;
const OPEN_MAP: GridMap = createGridMap(6, 6, []);
const PATROL: readonly GridPoint[] = [
  { x: 1, y: 1 },
  { x: 4, y: 1 },
  { x: 4, y: 4 },
  { x: 1, y: 4 },
];
function center(cell: GridPoint): Vector2 {
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + TILE / 2 };
}

function baseInput(
  timeMs: number,
  deltaMs: number,
  overrides: Partial<GuardSimulationInput> = {},
): GuardSimulationInput {
  return {
    map: OPEN_MAP,
    tileSize: TILE,
    timeMs,
    deltaMs,
    target: { x: 5, y: 55 },
    speed: 200,
    visionRange: 1,
    fieldOfViewRadians: Math.PI / 2,
    algorithm: "astar",
    patrolPoints: PATROL,
    captureDistancePx: 12,
    searchDurationMs: 800,
    replanIntervalMs: 100,
    ...overrides,
  };
}

interface Driver {
  state: GuardSimulationState;
  lastSeenTransitionAtMs: number | null;
  events: { timeMs: number; event: string; cause: string; previous: string; next: string }[];
  rotationFacings: Vector2[];
}

function makeDriver(start: GridPoint = { x: 1, y: 1 }): Driver {
  return {
    state: initialGuardSimulationState(center(start), { x: 1, y: 0 }),
    lastSeenTransitionAtMs: null,
    events: [],
    rotationFacings: [],
  };
}

function update(
  driver: Driver,
  timeMs: number,
  deltaMs: number,
  overrides: Partial<GuardSimulationInput> = {},
): GuardSimulationState {
  const frame = updateGuardSimulation(driver.state, baseInput(timeMs, deltaMs, overrides));
  driver.state = frame.state;
  if (frame.state.machine.current === "searching" && frame.route === null) {
    driver.rotationFacings.push(frame.facing);
  }
  const transition = frame.lastTransition;
  if (
    transition
    && (driver.lastSeenTransitionAtMs === null || transition.timeMs > driver.lastSeenTransitionAtMs)
  ) {
    driver.lastSeenTransitionAtMs = transition.timeMs;
    driver.events.push({
      timeMs: transition.timeMs,
      event: transition.event,
      cause: transition.cause,
      previous: transition.previousState,
      next: transition.nextState,
    });
  }
  return frame.state;
}

function samePosition(left: Vector2, right: Vector2): boolean {
  return left.x === right.x && left.y === right.y;
}

describe("guard simulation", () => {
  it("patrols the cycle returning to the first point", () => {
    const driver = makeDriver();
    let patrolArrivals = 0;

    for (let frame = 0; frame < 600 && patrolArrivals < PATROL.length; frame += 1) {
      update(driver, frame * 50, 50);
      const seen = driver.events.filter((event) => event.event === "patrol-point-reached").length;
      if (seen > patrolArrivals) {
        patrolArrivals = seen;
      }
    }

    expect(patrolArrivals).toBe(PATROL.length);
    expect(driver.state.machine.current).toBe("patrolling");
    expect(driver.state.machine.patrolIndex).toBe(0);
  });

  it("keeps the guard patrolling without vision or sound events", () => {
    const driver = makeDriver();
    for (let frame = 0; frame < 10; frame += 1) {
      update(driver, frame * 50, 50);
    }
    expect(driver.events.every((event) => event.event !== "vision-acquired")).toBe(true);
    expect(driver.events.every((event) => event.event !== "sound-heard")).toBe(true);
    expect(driver.state.machine.current).toBe("patrolling");
  });

  it("follows sound, searches at the last known position, then returns", () => {
    const driver = makeDriver();
    const sound: SoundEvent = {
      position: center({ x: 4, y: 4 }),
      radius: 100,
      emittedAtMs: 0,
      durationMs: 60,
    };
    driver.state = withGuardSound(driver.state, sound);

    let current: GuardState = "patrolling";
    for (let frame = 0; frame < 2000; frame += 1) {
      current = update(driver, frame * 50, 50).machine.current;
      if (current === "patrolling" && driver.events.some((event) => event.cause === "return-completed")) {
        break;
      }
    }

    expect(driver.state.machine.current).toBe("patrolling");
    const causes = driver.events.map((event) => event.cause);
    const soundIndex = causes.indexOf("sound-investigation");
    const reachedIndex = causes.indexOf("investigation-reached");
    expect(soundIndex).toBeGreaterThanOrEqual(0);
    expect(reachedIndex).toBeGreaterThan(soundIndex);
    expect(causes).toContain("search-timeout");
    expect(causes).toContain("return-completed");

    const distinctDirections = new Set(
      driver.rotationFacings.map((facing) => `${facing.x},${facing.y}`),
    );
    expect(distinctDirections.size).toBeGreaterThanOrEqual(3);
  });

  it("re-plans when the chased player changes cell", () => {
    const driver = makeDriver();
    update(driver, 0, 0, {
      target: center({ x: 3, y: 1 }),
      visionRange: 120,
    });
    expect(driver.state.machine.current).toBe("chasing");

    update(driver, 50, 50, {
      target: center({ x: 4, y: 1 }),
      visionRange: 120,
    });

    expect(driver.events.some((event) => event.event === "replan-needed")).toBe(true);
    expect(driver.state.machine.current).toBe("chasing");
  });

  it("captures the player when close and then the guard stops moving", () => {
    const driver = makeDriver();
    update(driver, 0, 0, {
      target: center({ x: 2, y: 1 }),
      visionRange: 120,
    });
    update(driver, 50, 50, {
      target: center({ x: 2, y: 1 }),
      visionRange: 120,
    });

    expect(driver.state.machine.current).toBe("captured");
    const frozen = driver.state.position;

    update(driver, 100, 50, { target: center({ x: 2, y: 1 }), visionRange: 120 });
    expect(driver.state.machine.current).toBe("captured");
    expect(samePosition(driver.state.position, frozen)).toBe(true);
  });

  it("loses vision while chasing and starts searching", () => {
    const driver = makeDriver();
    update(driver, 0, 0, {
      target: center({ x: 4, y: 1 }),
      visionRange: 120,
      captureDistancePx: 6,
    });
    expect(driver.state.machine.current).toBe("chasing");

    update(driver, 50, 50, {
      target: center({ x: 1, y: 1 }),
      visionRange: 120,
      captureDistancePx: 6,
    });

    expect(driver.events.some((event) => event.event === "vision-lost")).toBe(true);
    expect(driver.state.machine.current).toBe("searching");
  });

  it("abandons an unreachable investigation and returns to patrol", () => {
    const blocked = Array.from({ length: 6 }, (_, y) => ({ x: 3, y }));
    const splitMap = createGridMap(6, 6, blocked);
    const driver = makeDriver({ x: 1, y: 1 });
    const sound: SoundEvent = {
      position: center({ x: 4, y: 1 }),
      radius: 100,
      emittedAtMs: 0,
      durationMs: 60,
    };
    driver.state = withGuardSound(driver.state, sound);

    for (let frame = 0; frame < 200; frame += 1) {
      update(driver, frame * 50, 50, { map: splitMap });
      if (driver.events.some((event) => event.event === "destination-unreachable")
        && driver.state.machine.current === "patrolling") {
        break;
      }
    }

    expect(driver.events.some((event) => event.event === "destination-unreachable")).toBe(true);
    expect(driver.state.machine.current).toBe("patrolling");
  });

  it("re-investigates a fresh sound while searching", () => {
    const driver = makeDriver();
    const first: SoundEvent = {
      position: center({ x: 4, y: 4 }),
      radius: 100,
      emittedAtMs: 0,
      durationMs: 600,
    };
    driver.state = withGuardSound(driver.state, first);
    for (let frame = 0; frame < 400; frame += 1) {
      update(driver, frame * 50, 50);
      if (driver.state.machine.current === "searching") {
        break;
      }
    }
    expect(driver.state.machine.current).toBe("searching");

    const second: SoundEvent = {
      position: center({ x: 1, y: 4 }),
      radius: 100,
      emittedAtMs: 10_000,
      durationMs: 600,
    };
    driver.state = withGuardSound(driver.state, second);
    const before = driver.events.length;
    update(driver, 10_000, 50);
    const freshEvents = driver.events.slice(before);

    expect(freshEvents.some((event) => event.cause === "sound-investigation")).toBe(true);
    expect(driver.state.machine.current).toBe("investigating");
  });
});