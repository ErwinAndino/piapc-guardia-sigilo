import { cellCenter, cellEquals, worldToCell, type GridMap, type GridPoint } from "../../domain/model/grid";
import type { Vector2 } from "../../domain/model/vector";
import {
  createInitialBehavior,
  LOOK_DIRECTIONS,
  updateGuardBehavior,
  type GuardBehavior,
} from "../../domain/behavior/guardBehavior";
import {
  createTelemetryLog,
  recordTelemetry,
  type TransitionLog,
} from "../../domain/telemetry/telemetry";
import {
  initialPerceptionState,
  updatePerceptionSimulation,
  withSoundEvent,
  type PerceptionSimulationState,
} from "./perceptionSimulation";
import { calculateRoute } from "./navigationDemo";
import { advanceAlongPath } from "../../domain/navigation/pathFollower";
import {
  findPathAStar,
  type SearchAlgorithm,
} from "../../domain/navigation/search";
import { PATROL_POINTS } from "./labLevel";
import type { VisionResult } from "../../domain/perception/perception";
import { nearestWalkable } from "../../domain/model/grid";

export interface GuardConfig {
  readonly guardSpeed: number;
  readonly visionRange: number;
  readonly fieldOfViewRadians: number;
  readonly soundRadius: number;
  readonly soundDurationMs: number;
  readonly lookMsPerDirection: number;
  readonly searchLimitMs: number;
  readonly sightLostToleranceMs: number;
  readonly patrolPoints: readonly GridPoint[];
}

export const DEFAULT_GUARD_CONFIG: GuardConfig = {
  guardSpeed: 115,
  visionRange: 220,
  fieldOfViewRadians: Math.PI / 2,
  soundRadius: 190,
  soundDurationMs: 800,
  lookMsPerDirection: 500,
  searchLimitMs: 3000,
  sightLostToleranceMs: 250,
  patrolPoints: PATROL_POINTS,
};

export interface GuardSimulationState {
  readonly behavior: GuardBehavior;
  readonly perception: PerceptionSimulationState;
  readonly waypoints: readonly Vector2[];
  readonly nextWaypoint: number;
  readonly goalCell: GridPoint | null;
  readonly position: Vector2;
  readonly facing: Vector2;
  readonly telemetry: TransitionLog;
  readonly algorithm: SearchAlgorithm;
  readonly planFailed: boolean;
}

export interface GuardSimulationInput {
  readonly map: GridMap;
  readonly tileSize: number;
  readonly playerPosition: Vector2;
  readonly playerSoundRequested: boolean;
  readonly timeMs: number;
  readonly deltaMs: number;
  readonly algorithm: SearchAlgorithm;
  readonly entryCosts?: ReadonlyMap<string, number>;
  readonly playerCovered?: boolean;
}

export interface GuardSimulationUpdate {
  readonly state: GuardSimulationState;
  readonly vision: VisionResult;
  readonly soundHeard: boolean;
}

export function createInitialGuardState(
  position: Vector2,
  tileSize: number,
  config: GuardConfig = DEFAULT_GUARD_CONFIG,
): GuardSimulationState {
  const behavior = createInitialBehavior(worldToCell(position, tileSize), config.patrolPoints);
  const telemetry = recordTelemetry(createTelemetryLog(), {
    timeMs: 0,
    previous: null,
    event: "reset",
    next: behavior.name,
    cause: "initial",
  });

  return {
    behavior,
    perception: initialPerceptionState(),
    waypoints: [],
    nextWaypoint: 0,
    goalCell: null,
    position: { ...position },
    facing: { x: -1, y: 0 },
    telemetry,
    algorithm: "astar",
    planFailed: false,
  };
}

export function blockedRouteCell(
  map: GridMap,
  waypoints: readonly GridPoint[],
  tileSize: number,
): GridPoint | null {
  for (let index = 0; index < waypoints.length; index += 1) {
    const wp = waypoints[index];
    if (wp === undefined) {
      continue;
    }
    const cell = worldToCell(wp, tileSize);
    if (!isWalkable(map, cell)) {
      return cell;
    }
  }
  return null;
}

function isWalkable(map: GridMap, point: GridPoint): boolean {
  return isInside(map, point) && !map.blocked.has(cellKey(point));
}

function isInside(map: Pick<GridMap, "width" | "height">, point: GridPoint): boolean {
  return Number.isInteger(point.x)
    && Number.isInteger(point.y)
    && point.x >= 0
    && point.y >= 0
    && point.x < map.width
    && point.y < map.height;
}

function cellKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

export function updateGuardSimulation(
  previous: GuardSimulationState,
  input: GuardSimulationInput,
  config: GuardConfig = DEFAULT_GUARD_CONFIG,
): GuardSimulationUpdate {
  let telemetry = previous.telemetry;

  let perception = previous.perception;
  if (input.playerSoundRequested) {
    perception = withSoundEvent(perception, {
      position: { ...input.playerPosition },
      radius: config.soundRadius,
      emittedAtMs: input.timeMs,
      durationMs: config.soundDurationMs,
    });
  }

  let position = previous.position;
  let facing = previous.facing;
  let nextWaypoint = previous.nextWaypoint;
  let routeInvalidated = false;

  if (previous.behavior.phase === "navigating" && previous.waypoints.length > 0) {
    const blockedCell = blockedRouteCell(
      input.map,
      previous.waypoints.slice(previous.nextWaypoint),
      input.tileSize,
    );
    if (blockedCell) {
      routeInvalidated = true;
      telemetry = recordTelemetry(telemetry, {
        timeMs: input.timeMs,
        previous: previous.behavior.name,
        event: "route-invalidated",
        next: previous.behavior.name,
        cause: `blocked:${blockedCell.x},${blockedCell.y}`,
      });
    } else {
      const movement = advanceAlongPath(
        position,
        previous.waypoints,
        previous.nextWaypoint,
        config.guardSpeed * input.deltaMs / 1000,
      );
      position = movement.position;
      nextWaypoint = movement.nextWaypoint;
      if (movement.direction) {
        facing = movement.direction;
      }
    }
  }

  const perceptionFrame = updatePerceptionSimulation(perception, {
    map: input.map,
    tileSize: input.tileSize,
    observer: position,
    facing,
    target: input.playerPosition,
    visionRange: config.visionRange,
    fieldOfViewRadians: config.fieldOfViewRadians,
    timeMs: input.timeMs,
    playerCovered: input.playerCovered ?? false,
  });
  const memory = perceptionFrame.state.memory;
  const vision = perceptionFrame.vision;
  const soundHeard = perceptionFrame.soundHeard;

  const guardCell = worldToCell(position, input.tileSize);
  const atDestination = previous.goalCell !== null
    && cellEquals(guardCell, previous.goalCell);

  const nearestPatrolIndex = previous.behavior.name === "returning"
    ? nearestReachablePatrolIndex(input.map, guardCell, config.patrolPoints, input.entryCosts)
    : null;

  const decision = updateGuardBehavior(previous.behavior, {
    timeMs: input.timeMs,
    deltaMs: input.deltaMs,
    atDestination,
    planFailed: previous.planFailed,
    vision,
    soundHeard,
    memory,
    lookMsPerDirection: config.lookMsPerDirection,
    searchLimitMs: config.searchLimitMs,
    sightLostToleranceMs: config.sightLostToleranceMs,
    patrolCount: config.patrolPoints.length,
    nearestPatrolIndex,
  });

  if (decision.transition) {
    telemetry = recordTelemetry(telemetry, {
      timeMs: input.timeMs,
      previous: decision.transition.previous,
      event: decision.transition.event,
      next: decision.transition.next,
      cause: decision.transition.cause,
    });
  }

  const behavior = decision.behavior;
  const intent = decision.intent;
  let targetCell: GridPoint | null = null;
  if (intent.kind === "patrol") {
    targetCell = config.patrolPoints[intent.index] ?? null;
  } else if (intent.kind === "last-known") {
    targetCell = memory.lastKnownPosition
      ? worldToCell(memory.lastKnownPosition, input.tileSize)
      : null;
  } else if (intent.kind === "nearest-patrol") {
    targetCell = nearestPatrolIndex !== null
      ? config.patrolPoints[nearestPatrolIndex] ?? null
      : null;
  } else {
    targetCell = previous.goalCell;
  }

  if (targetCell !== null) {
    targetCell = nearestWalkable(input.map, targetCell);
  }

  const shouldMove = intent.kind !== "look"
    && behavior.phase === "navigating"
    && targetCell !== null;

  let waypoints = previous.waypoints;
  let goalCell = previous.goalCell;
  let planFailed = false;

  if (shouldMove && targetCell !== null) {
    const goalChanged = goalCell === null || !cellEquals(targetCell, goalCell);

    if (goalChanged || previous.waypoints.length === 0 || routeInvalidated) {
      const plan = calculateRoute(input.map, guardCell, targetCell, input.algorithm, input.entryCosts);
      if (plan.status === "success") {
        const cells = plan.path.map((point) => cellCenter(point, input.tileSize));
        waypoints = [{ ...position }, ...cells.slice(1)];
        nextWaypoint = 0;
        goalCell = targetCell;
      } else {
        telemetry = recordTelemetry(telemetry, {
          timeMs: input.timeMs,
          previous: behavior.name,
          event: "navigation-unreachable",
          next: behavior.name,
          cause: `navigation:${plan.status}`,
        });
        waypoints = [];
        nextWaypoint = 0;
        planFailed = true;
      }
    }
  } else {
    waypoints = [];
    nextWaypoint = 0;
  }

  if (behavior.phase === "looking") {
    facing = LOOK_DIRECTIONS[behavior.lookStep] ?? facing;
  }

  return {
    state: {
      behavior,
      perception: perceptionFrame.state,
      waypoints,
      nextWaypoint,
      goalCell,
      position,
      facing,
      telemetry,
      algorithm: input.algorithm,
      planFailed,
    },
    vision,
    soundHeard,
  };
}

function nearestReachablePatrolIndex(
  map: GridMap,
  from: GridPoint,
  patrolPoints: readonly GridPoint[],
  entryCosts?: ReadonlyMap<string, number>,
): number | null {
  let bestIndex: number | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (let index = 0; index < patrolPoints.length; index += 1) {
    const point = patrolPoints[index];
    if (!point) {
      continue;
    }
    const result = findPathAStar(map, from, point, entryCosts);
    if (result.status === "success" && result.totalCost !== null && result.totalCost < bestCost) {
      bestCost = result.totalCost;
      bestIndex = index;
    }
  }

  return bestIndex;
}