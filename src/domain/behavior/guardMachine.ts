import type { GridPoint } from "../model/grid";
import { nextPatrolIndex } from "./patrol";
import {
  captureIntent,
  haltIntent,
  navigateIntent,
  rotateIntent,
  type GuardEvent,
  type GuardIntent,
  type GuardState,
  type TransitionRecord,
} from "./guardStates";

export interface GuardMachineState {
  readonly current: GuardState;
  readonly patrolIndex: number;
  readonly consecutiveUnreachable: number;
}

export interface GuardMachineContext {
  readonly vision: boolean;
  readonly playerCell: GridPoint | null;
  readonly lastKnownCell: GridPoint | null;
  readonly reachedLastKnown: boolean;
  readonly patrolPoints: readonly GridPoint[];
}

export interface GuardMachineStep {
  readonly state: GuardMachineState;
  readonly intent: GuardIntent;
  readonly transition: TransitionRecord | null;
}

export const INITIAL_GUARD_MACHINE: GuardMachineState = {
  current: "patrolling",
  patrolIndex: 0,
  consecutiveUnreachable: 0,
};

const ALLOWED_EVENTS: Readonly<Record<GuardState, readonly GuardEvent[]>> = {
  patrolling: ["vision-acquired", "sound-heard", "patrol-point-reached", "patrol-point-unreachable"],
  investigating: ["vision-acquired", "observation-changed", "path-completed", "destination-unreachable"],
  chasing: ["vision-lost", "replan-needed", "capture-reached"],
  searching: ["vision-acquired", "sound-heard", "search-timeout"],
  returning: ["vision-acquired", "path-completed", "patrol-point-unreachable"],
  captured: [],
};

export function stepGuardMachine(
  machine: GuardMachineState,
  event: GuardEvent,
  context: GuardMachineContext,
  timeMs: number,
): GuardMachineStep {
  if (event === "restart") {
    return {
      state: INITIAL_GUARD_MACHINE,
      intent: patrolIntentAt(INITIAL_GUARD_MACHINE.patrolIndex, context),
      transition: record(machine.current, "restart", "patrolling", "reset", timeMs),
    };
  }

  if (!ALLOWED_EVENTS[machine.current].includes(event)) {
    throw new Error(`Event ${event} is not allowed in state ${machine.current}.`);
  }

  switch (machine.current) {
    case "patrolling":
      return stepPatrolling(machine, event, context, timeMs);
    case "investigating":
      return stepInvestigating(machine, event, context, timeMs);
    case "chasing":
      return stepChasing(machine, event, context, timeMs);
    case "searching":
      return stepSearching(machine, event, context, timeMs);
    case "returning":
      return stepReturning(machine, event, context, timeMs);
    case "captured":
      throw new Error(`Captured guard only accepts restart, received ${event}.`);
  }
}

export function resolveGuardIntent(
  machine: GuardMachineState,
  context: GuardMachineContext,
): GuardIntent {
  switch (machine.current) {
    case "patrolling":
      return patrolIntent(machine, context);
    case "investigating":
      return investigateIntent(context);
    case "chasing":
      return chaseIntent(context);
    case "searching":
      return searchIntent(machine, context);
    case "returning":
      return returnIntent(machine, context);
    case "captured":
      return captureIntent();
  }
}

function stepPatrolling(
  machine: GuardMachineState,
  event: GuardEvent,
  context: GuardMachineContext,
  timeMs: number,
): GuardMachineStep {
  switch (event) {
    case "vision-acquired":
      if (!guardVision(context)) {
        return sameStep(machine, patrolIntent(machine, context));
      }
      return {
        state: { ...machine, current: "chasing" as const },
        intent: chaseIntent(context),
        transition: record("patrolling", "vision-acquired", "chasing", "vision-gained", timeMs),
      };
    case "sound-heard":
      if (!guardSound(context)) {
        return sameStep(machine, patrolIntent(machine, context));
      }
      return {
        state: { ...machine, current: "investigating" as const },
        intent: investigateIntent(context),
        transition: record("patrolling", "sound-heard", "investigating", "sound-investigation", timeMs),
      };
    case "patrol-point-reached":
      return handlePatrolPointReached(machine, context, timeMs);
    case "patrol-point-unreachable":
      return handlePatrolPointUnreachable(machine, context, timeMs, "patrol-unreachable");
    default:
      throw new Error(`Event ${event} is not allowed in state patrolling.`);
  }
}

function stepInvestigating(
  machine: GuardMachineState,
  event: GuardEvent,
  context: GuardMachineContext,
  timeMs: number,
): GuardMachineStep {
  switch (event) {
    case "vision-acquired":
      if (!guardVision(context)) {
        return sameStep(machine, investigateIntent(context));
      }
      return {
        state: { ...machine, current: "chasing" as const },
        intent: chaseIntent(context),
        transition: record("investigating", "vision-acquired", "chasing", "vision-gained", timeMs),
      };
    case "observation-changed":
      if (!guardSound(context)) {
        return sameStep(machine, investigateIntent(context));
      }
      return {
        state: { ...machine, current: "investigating" as const },
        intent: investigateIntent(context),
        transition: record("investigating", "observation-changed", "investigating", "observation-updated", timeMs),
      };
    case "path-completed":
      return {
        state: { ...machine, current: "searching" as const },
        intent: searchIntent(machine, context),
        transition: record("investigating", "path-completed", "searching", "investigation-reached", timeMs),
      };
    case "destination-unreachable":
      return {
        state: { ...machine, current: "returning" as const },
        intent: returnIntent(machine, context),
        transition: record("investigating", "destination-unreachable", "returning", "investigation-unreachable", timeMs),
      };
    default:
      throw new Error(`Event ${event} is not allowed in state investigating.`);
  }
}

function stepChasing(
  machine: GuardMachineState,
  event: GuardEvent,
  context: GuardMachineContext,
  timeMs: number,
): GuardMachineStep {
  switch (event) {
    case "vision-lost":
      return {
        state: { ...machine, current: "searching" as const },
        intent: searchIntent(machine, context),
        transition: record("chasing", "vision-lost", "searching", "vision-lost", timeMs),
      };
    case "replan-needed":
      if (!guardVision(context)) {
        return sameStep(machine, chaseIntent(context));
      }
      return {
        state: { ...machine, current: "chasing" as const },
        intent: chaseIntent(context),
        transition: record("chasing", "replan-needed", "chasing", "replan", timeMs),
      };
    case "capture-reached":
      if (!guardVision(context)) {
        return sameStep(machine, chaseIntent(context));
      }
      return {
        state: { ...machine, current: "captured" as const },
        intent: captureIntent(),
        transition: record("chasing", "capture-reached", "captured", "captured", timeMs),
      };
    default:
      throw new Error(`Event ${event} is not allowed in state chasing.`);
  }
}

function stepSearching(
  machine: GuardMachineState,
  event: GuardEvent,
  context: GuardMachineContext,
  timeMs: number,
): GuardMachineStep {
  switch (event) {
    case "vision-acquired":
      if (!guardVision(context)) {
        return sameStep(machine, searchIntent(machine, context));
      }
      return {
        state: { ...machine, current: "chasing" as const },
        intent: chaseIntent(context),
        transition: record("searching", "vision-acquired", "chasing", "vision-gained", timeMs),
      };
    case "sound-heard":
      if (!guardSound(context)) {
        return sameStep(machine, searchIntent(machine, context));
      }
      return {
        state: { ...machine, current: "investigating" as const },
        intent: investigateIntent(context),
        transition: record("searching", "sound-heard", "investigating", "sound-investigation", timeMs),
      };
    case "search-timeout":
      if (context.vision) {
        return sameStep(machine, searchIntent(machine, context));
      }
      return {
        state: { ...machine, current: "returning" as const },
        intent: returnIntent(machine, context),
        transition: record("searching", "search-timeout", "returning", "search-timeout", timeMs),
      };
    default:
      throw new Error(`Event ${event} is not allowed in state searching.`);
  }
}

function stepReturning(
  machine: GuardMachineState,
  event: GuardEvent,
  context: GuardMachineContext,
  timeMs: number,
): GuardMachineStep {
  switch (event) {
    case "vision-acquired":
      if (!guardVision(context)) {
        return sameStep(machine, returnIntent(machine, context));
      }
      return {
        state: { ...machine, current: "chasing" as const },
        intent: chaseIntent(context),
        transition: record("returning", "vision-acquired", "chasing", "vision-gained", timeMs),
      };
    case "path-completed": {
      const nextState: GuardMachineState = {
        current: "patrolling",
        patrolIndex: machine.patrolIndex,
        consecutiveUnreachable: 0,
      };
      return {
        state: nextState,
        intent: patrolIntentAt(nextState.patrolIndex, context),
        transition: record("returning", "path-completed", "patrolling", "return-completed", timeMs),
      };
    }
    case "patrol-point-unreachable":
      return handlePatrolPointUnreachable(machine, context, timeMs, "return-unreachable");
    default:
      throw new Error(`Event ${event} is not allowed in state returning.`);
  }
}

function handlePatrolPointReached(
  machine: GuardMachineState,
  context: GuardMachineContext,
  timeMs: number,
): GuardMachineStep {
  const count = context.patrolPoints.length;
  if (count <= 0) {
    throw new Error("Patrol points must not be empty.");
  }
  const nextIndex = nextPatrolIndex(machine.patrolIndex, count);
  const nextState: GuardMachineState = {
    current: "patrolling",
    patrolIndex: nextIndex,
    consecutiveUnreachable: 0,
  };
  return {
    state: nextState,
    intent: patrolIntentAt(nextIndex, context),
    transition: record("patrolling", "patrol-point-reached", "patrolling", "waypoint-next", timeMs),
  };
}

function handlePatrolPointUnreachable(
  machine: GuardMachineState,
  context: GuardMachineContext,
  timeMs: number,
  cause: string,
): GuardMachineStep {
  const count = context.patrolPoints.length;
  if (count <= 0) {
    throw new Error("Patrol points must not be empty.");
  }
  const failures = machine.consecutiveUnreachable + 1;
  if (failures >= count) {
    return {
      state: { ...machine, consecutiveUnreachable: failures },
      intent: haltIntent(),
      transition: record(machine.current, "patrol-point-unreachable", machine.current, cause, timeMs),
    };
  }
  const nextIndex = nextPatrolIndex(machine.patrolIndex, count);
  const nextState: GuardMachineState = {
    current: machine.current,
    patrolIndex: nextIndex,
    consecutiveUnreachable: failures,
  };
  return {
    state: nextState,
    intent: patrolIntentAt(nextIndex, context),
    transition: record(machine.current, "patrol-point-unreachable", machine.current, cause, timeMs),
  };
}

function sameStep(machine: GuardMachineState, intent: GuardIntent): GuardMachineStep {
  return { state: machine, intent, transition: null };
}

function guardVision(context: GuardMachineContext): boolean {
  return context.vision && context.playerCell !== null;
}

function guardSound(context: GuardMachineContext): boolean {
  return !context.vision && context.lastKnownCell !== null;
}

function patrolIntentAt(index: number, context: GuardMachineContext): GuardIntent {
  const point = context.patrolPoints[index];
  return point ? navigateIntent(point) : haltIntent();
}

function patrolIntent(machine: GuardMachineState, context: GuardMachineContext): GuardIntent {
  return patrolIntentAt(machine.patrolIndex, context);
}

function investigateIntent(context: GuardMachineContext): GuardIntent {
  return context.lastKnownCell ? navigateIntent(context.lastKnownCell) : haltIntent();
}

function chaseIntent(context: GuardMachineContext): GuardIntent {
  return context.playerCell ? navigateIntent(context.playerCell) : haltIntent();
}

function searchIntent(_machine: GuardMachineState, context: GuardMachineContext): GuardIntent {
  if (context.lastKnownCell && !context.reachedLastKnown) {
    return navigateIntent(context.lastKnownCell);
  }
  return rotateIntent();
}

function returnIntent(machine: GuardMachineState, context: GuardMachineContext): GuardIntent {
  return patrolIntent(machine, context);
}

function record(
  previousState: GuardState,
  event: GuardEvent,
  nextState: GuardState,
  cause: string,
  timeMs: number,
): TransitionRecord {
  return { timeMs, previousState, event, nextState, cause };
}