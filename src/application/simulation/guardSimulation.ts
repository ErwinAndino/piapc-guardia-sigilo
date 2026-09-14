import type { GridMap, GridPoint } from "../../domain/model/grid";
import { cellCenter, worldToCell } from "../../domain/model/grid";
import type { Vector2 } from "../../domain/model/vector";
import { distanceBetween } from "../../domain/model/vector";
import {
  type GuardMachineContext,
  type GuardMachineState,
  INITIAL_GUARD_MACHINE,
  resolveGuardIntent,
  stepGuardMachine,
} from "../../domain/behavior/guardMachine";
import type {
  GuardEvent,
  GuardState,
  TransitionRecord,
} from "../../domain/behavior/guardStates";
import { advanceAlongPath } from "../../domain/navigation/pathFollower";
import type { SearchAlgorithm, SearchStatus } from "../../domain/navigation/search";
import { calculateRoute } from "./navigationDemo";
import {
  initialPerceptionState,
  updatePerceptionSimulation,
  withSoundEvent,
  type PerceptionFrame,
  type PerceptionSimulationState,
} from "./perceptionSimulation";
import type { SoundEvent } from "../../domain/perception/perception";

const SEARCH_LOOK_DIRECTIONS: readonly Vector2[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

export interface ActiveRoute {
  readonly goalCell: GridPoint;
  readonly waypoints: readonly Vector2[];
  readonly status: SearchStatus;
}

export interface GuardSearchMetrics {
  readonly algorithm: SearchAlgorithm;
  readonly status: SearchStatus;
  readonly totalCost: number | null;
  readonly expandedNodes: number;
  readonly maximumFrontier: number;
}

export interface GuardSimulationState {
  readonly machine: GuardMachineState;
  readonly perception: PerceptionSimulationState;
  readonly position: Vector2;
  readonly facing: Vector2;
  readonly route: ActiveRoute | null;
  readonly nextWaypoint: number;
  readonly previousState: GuardState | null;
  readonly lastTransition: TransitionRecord | null;
  readonly searchStartedAtMs: number | null;
  readonly nextReplanAtMs: number | null;
  readonly capturedAtMs: number | null;
  readonly lastSearch: GuardSearchMetrics | null;
}

export interface GuardSimulationInput {
  readonly map: GridMap;
  readonly tileSize: number;
  readonly timeMs: number;
  readonly deltaMs: number;
  readonly target: Vector2;
  readonly speed: number;
  readonly visionRange: number;
  readonly fieldOfViewRadians: number;
  readonly algorithm: SearchAlgorithm;
  readonly patrolPoints: readonly GridPoint[];
  readonly captureDistancePx: number;
  readonly searchDurationMs: number;
  readonly replanIntervalMs: number;
}

export interface GuardSimulationFrame {
  readonly state: GuardSimulationState;
  readonly position: Vector2;
  readonly facing: Vector2;
  readonly current: GuardState;
  readonly previousState: GuardState | null;
  readonly lastTransition: TransitionRecord | null;
  readonly perception: PerceptionFrame;
  readonly route: ActiveRoute | null;
}

export function initialGuardSimulationState(
  position: Vector2,
  facing: Vector2,
): GuardSimulationState {
  return {
    machine: INITIAL_GUARD_MACHINE,
    perception: initialPerceptionState(),
    position: { ...position },
    facing: { ...facing },
    route: null,
    nextWaypoint: 0,
    previousState: null,
    lastTransition: null,
    searchStartedAtMs: null,
    nextReplanAtMs: null,
    capturedAtMs: null,
    lastSearch: null,
  };
}

export function withGuardSound(
  state: GuardSimulationState,
  soundEvent: SoundEvent,
): GuardSimulationState {
  return { ...state, perception: withSoundEvent(state.perception, soundEvent) };
}

export function updateGuardSimulation(
  state: GuardSimulationState,
  input: GuardSimulationInput,
): GuardSimulationFrame {
  const priorLastKnownCell = lastKnownCellOf(state.perception, input.tileSize);
  const priorReachedLastKnown =
    priorLastKnownCell !== null
    && sameCell(worldToCell(state.position, input.tileSize), priorLastKnownCell);

  let position = state.position;
  let facing = state.facing;
  let nextWaypoint = state.nextWaypoint;
  let routeCompleted = false;

  if (state.machine.current !== "captured") {
    if (
      state.machine.current === "searching"
      && priorReachedLastKnown
    ) {
      nextWaypoint = state.route ? state.route.waypoints.length : nextWaypoint;
      routeCompleted = false;
    } else if (state.route && state.route.status === "success") {
      const movement = advanceAlongPath(
        state.position,
        state.route.waypoints,
        state.nextWaypoint,
        (input.speed * input.deltaMs) / 1000,
      );
      position = movement.position;
      facing = movement.direction ?? state.facing;
      nextWaypoint = movement.nextWaypoint;
      routeCompleted = movement.completed;
    }
  }

  const perception = updatePerceptionSimulation(state.perception, {
    map: input.map,
    tileSize: input.tileSize,
    observer: position,
    facing,
    target: input.target,
    visionRange: input.visionRange,
    fieldOfViewRadians: input.fieldOfViewRadians,
    timeMs: input.timeMs,
  });

  const lastKnownCell = lastKnownCellOf(perception.state, input.tileSize);
  const guardCell = worldToCell(position, input.tileSize);
  const reachedLastKnown =
    lastKnownCell !== null && sameCell(guardCell, lastKnownCell);
  const playerCell = worldToCell(input.target, input.tileSize);

  if (
    state.machine.current === "searching"
    && reachedLastKnown
  ) {
    const started = state.searchStartedAtMs ?? input.timeMs;
    const phaseDuration = SEARCH_LOOK_DIRECTIONS.length > 0
      ? input.searchDurationMs / SEARCH_LOOK_DIRECTIONS.length
      : input.searchDurationMs;
    const index = SEARCH_LOOK_DIRECTIONS.length > 0
      ? Math.max(
        0,
        Math.min(
          SEARCH_LOOK_DIRECTIONS.length - 1,
          Math.floor((input.timeMs - started) / phaseDuration),
        ),
      )
      : 0;
    facing = SEARCH_LOOK_DIRECTIONS[index] ?? { x: 1, y: 0 };
  }

  const atGoal = state.route !== null && state.route.status === "success" && routeCompleted;
  const routeFailed = state.route !== null && state.route.status !== "success";

  let event: GuardEvent | null = null;
  const blocked = state.machine.consecutiveUnreachable >= input.patrolPoints.length;

  if (state.machine.current === "captured") {
    // Captured guards ignore all perception; only restart can change state.
  } else if (state.machine.current === "chasing" && !perception.vision.visible) {
    event = "vision-lost";
  } else if (perception.vision.visible) {
    if (state.machine.current === "chasing") {
      const distance = distanceBetween(position, input.target);
      if (distance <= input.captureDistancePx) {
        event = "capture-reached";
      } else if (
        state.route === null
        || !sameCell(state.route.goalCell, playerCell)
        || (state.nextReplanAtMs !== null && input.timeMs >= state.nextReplanAtMs)
      ) {
        event = "replan-needed";
      }
    } else {
      event = "vision-acquired";
    }
  } else if (perception.soundHeard) {
    if (state.machine.current === "patrolling" || state.machine.current === "searching") {
      event = "sound-heard";
    } else if (
      state.machine.current === "investigating"
      && lastKnownCell !== null
      && (state.route === null || !sameCell(state.route.goalCell, lastKnownCell))
    ) {
      event = "observation-changed";
    }
  } else {
    switch (state.machine.current) {
      case "patrolling":
        if (atGoal) {
          event = "patrol-point-reached";
        } else if (routeFailed && !blocked) {
          event = "patrol-point-unreachable";
        }
        break;
      case "investigating":
        if (atGoal) {
          event = "path-completed";
        } else if (routeFailed) {
          event = "destination-unreachable";
        }
        break;
      case "searching": {
        const started = state.searchStartedAtMs;
        if (
          reachedLastKnown
          && started !== null
          && input.timeMs - started >= input.searchDurationMs
        ) {
          event = "search-timeout";
        }
        break;
      }
      case "returning":
        if (atGoal) {
          event = "path-completed";
        } else if (routeFailed && !blocked) {
          event = "patrol-point-unreachable";
        }
        break;
      default:
        break;
    }
  }

  const context: GuardMachineContext = {
    vision: perception.vision.visible,
    playerCell: perception.vision.visible ? playerCell : null,
    lastKnownCell,
    reachedLastKnown,
    patrolPoints: input.patrolPoints,
  };

  const step = event
    ? stepGuardMachine(state.machine, event, context, input.timeMs)
    : {
      state: state.machine,
      intent: resolveGuardIntent(state.machine, context),
      transition: null,
    };

  const machine = step.state;
  const transition = step.transition;
  const intent = step.intent;

  let route = state.route;
  let next = nextWaypoint;
  let lastSearch = state.lastSearch;
  const replanTriggeredByInterval =
    event === "replan-needed"
    && state.route !== null
    && sameCell(state.route.goalCell, playerCell);

  if (machine.current === "captured") {
    route = null;
    next = 0;
  } else if (intent.kind === "navigate" && intent.destination) {
    const goal = intent.destination;
    if (route === null || !sameCell(route.goalCell, goal)) {
      const read = readRoute(input, guardCell, goal);
      route = read.route;
      lastSearch = read.metrics;
      next = 0;
    } else if (replanTriggeredByInterval) {
      const read = readRoute(input, guardCell, goal);
      if (!sameWaypoints(read.route.waypoints, route.waypoints)) {
        route = read.route;
        lastSearch = read.metrics;
        next = 0;
      }
    }
  } else {
    route = null;
    next = 0;
  }

  let searchStartedAtMs = state.searchStartedAtMs;
  if (machine.current === "searching") {
    if (reachedLastKnown || (route !== null && route.status !== "success")) {
      searchStartedAtMs = state.searchStartedAtMs ?? input.timeMs;
    }
  } else {
    searchStartedAtMs = null;
  }

  let nextReplanAtMs = state.nextReplanAtMs;
  if (machine.current !== "chasing") {
    nextReplanAtMs = null;
  } else if (routeCompleted && !replanTriggeredByInterval) {
    nextReplanAtMs = null;
  } else if (event === "replan-needed" || (transition !== null && transition.nextState === "chasing")) {
    nextReplanAtMs = input.timeMs + input.replanIntervalMs;
  }

  const capturedAtMs = machine.current === "captured"
    ? (state.capturedAtMs ?? input.timeMs)
    : null;

  const nextState: GuardSimulationState = {
    machine,
    perception: perception.state,
    position,
    facing,
    route,
    nextWaypoint: next,
    previousState: transition ? transition.previousState : state.previousState,
    lastTransition: transition ?? state.lastTransition,
    searchStartedAtMs,
    nextReplanAtMs,
    capturedAtMs,
    lastSearch,
  };

  return {
    state: nextState,
    position,
    facing,
    current: machine.current,
    previousState: nextState.previousState,
    lastTransition: nextState.lastTransition,
    perception,
    route,
  };
}

function readRoute(
  input: GuardSimulationInput,
  startCell: GridPoint,
  goalCell: GridPoint,
): { readonly route: ActiveRoute; readonly metrics: GuardSearchMetrics } {
  const result = calculateRoute(input.map, startCell, goalCell, input.algorithm);
  const waypoints = result.status === "success"
    ? result.path.map((point) => cellCenter(point, input.tileSize))
    : [];
  const route: ActiveRoute = { goalCell, waypoints, status: result.status };
  return {
    route,
    metrics: {
      algorithm: result.algorithm,
      status: result.status,
      totalCost: result.totalCost,
      expandedNodes: result.expandedNodes,
      maximumFrontier: result.maximumFrontier,
    },
  };
}

function lastKnownCellOf(
  perception: PerceptionSimulationState,
  tileSize: number,
): GridPoint | null {
  const position = perception.memory.lastKnownPosition;
  return position ? worldToCell(position, tileSize) : null;
}

function sameCell(left: GridPoint, right: GridPoint): boolean {
  return left.x === right.x && left.y === right.y;
}

function sameWaypoints(left: readonly Vector2[], right: readonly Vector2[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const leftPoint = left[index];
    const rightPoint = right[index];
    if (!leftPoint || !rightPoint || leftPoint.x !== rightPoint.x || leftPoint.y !== rightPoint.y) {
      return false;
    }
  }
  return true;
}