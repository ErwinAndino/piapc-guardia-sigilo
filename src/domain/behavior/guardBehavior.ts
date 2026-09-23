import type { PerceptionMemory } from "../perception/memory";
import type { VisionResult } from "../perception/perception";
import { cellEquals, type GridPoint } from "../model/grid";
import type { Vector2 } from "../model/vector";

export type GuardStateName =
  | "patrolling"
  | "investigating"
  | "pursuing"
  | "searching"
  | "returning";

export type BehaviorPhase = "navigating" | "looking";

export interface GuardBehavior {
  readonly name: GuardStateName;
  readonly phase: BehaviorPhase;
  readonly lookStep: number;
  readonly lookElapsedMs: number;
  readonly searchElapsedMs: number;
  readonly patrolIndex: number;
}

export const STATE_LABELS: Readonly<Record<GuardStateName, string>> = {
  patrolling: "PATRULLAR",
  investigating: "INVESTIGAR",
  pursuing: "PERSEGUIR",
  searching: "BUSCAR",
  returning: "REGRESAR",
};

export const LOOK_DIRECTION_COUNT = 4;

export const LOOK_DIRECTIONS: readonly Vector2[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export type GuardIntent =
  | { readonly kind: "patrol"; readonly index: number }
  | { readonly kind: "last-known" }
  | { readonly kind: "nearest-patrol" }
  | { readonly kind: "look" };

export interface BehaviorTransition {
  readonly previous: GuardStateName;
  readonly event: string;
  readonly next: GuardStateName;
  readonly cause: string;
}

export interface GuardDecision {
  readonly behavior: GuardBehavior;
  readonly intent: GuardIntent;
  readonly transition: BehaviorTransition | null;
}

export interface GuardFrame {
  readonly timeMs: number;
  readonly deltaMs: number;
  readonly atDestination: boolean;
  readonly planFailed: boolean;
  readonly vision: VisionResult;
  readonly soundHeard: boolean;
  readonly memory: PerceptionMemory;
  readonly lookMsPerDirection: number;
  readonly searchLimitMs: number;
  readonly patrolCount: number;
  readonly nearestPatrolIndex: number | null;
}

export function createInitialBehavior(
  startCell: GridPoint,
  patrolPoints: readonly GridPoint[],
): GuardBehavior {
  const startIndex = patrolPoints.findIndex((point) => cellEquals(point, startCell));
  return {
    name: "patrolling",
    phase: "navigating",
    lookStep: 0,
    lookElapsedMs: 0,
    searchElapsedMs: 0,
    patrolIndex: startIndex >= 0 ? startIndex : 0,
  };
}

export function updateGuardBehavior(
  previous: GuardBehavior,
  frame: GuardFrame,
): GuardDecision {
  validateFrame(frame);

  const lookElapsed = previous.phase === "looking"
    ? previous.lookElapsedMs + frame.deltaMs
    : previous.lookElapsedMs;
  const lookStep = previous.phase === "looking"
    ? Math.min(LOOK_DIRECTION_COUNT - 1, Math.floor(lookElapsed / frame.lookMsPerDirection))
    : previous.lookStep;
  const searchElapsed = previous.name === "searching"
    ? previous.searchElapsedMs + frame.deltaMs
    : previous.searchElapsedMs;

  const base = {
    patrolIndex: previous.patrolIndex,
    lookElapsedMs: lookElapsed,
    searchElapsedMs: searchElapsed,
  };

  if (frame.vision.visible) {
    if (previous.name !== "pursuing") {
      return {
        behavior: {
          ...base,
          name: "pursuing",
          phase: "navigating",
          lookStep: 0,
          lookElapsedMs: 0,
          searchElapsedMs: 0,
        },
        intent: { kind: "last-known" },
        transition: {
          previous: previous.name,
          event: "vision-acquired",
          next: "pursuing",
          cause: "vision:visible",
        },
      };
    }

    return {
      behavior: {
        ...base,
        name: "pursuing",
        phase: "navigating",
        lookStep: 0,
        lookElapsedMs: 0,
        searchElapsedMs: 0,
      },
      intent: { kind: "last-known" },
      transition: null,
    };
  }

  if (frame.soundHeard && previous.name !== "pursuing") {
    return {
      behavior: {
        ...base,
        name: "investigating",
        phase: "navigating",
        lookStep: 0,
        lookElapsedMs: 0,
        searchElapsedMs: 0,
      },
      intent: { kind: "last-known" },
      transition: previous.name === "investigating"
        ? null
        : {
            previous: previous.name,
            event: "sound-heard",
            next: "investigating",
            cause: "sound:heard",
          },
    };
  }

  switch (previous.name) {
    case "pursuing": {
      if (!frame.memory.lastKnownPosition) {
        return {
          behavior: {
            ...base,
            name: "returning",
            phase: "navigating",
            lookStep: 0,
            lookElapsedMs: 0,
            searchElapsedMs: 0,
          },
          intent: { kind: "nearest-patrol" },
          transition: {
            previous: "pursuing",
            event: "lost-sight",
            next: "returning",
            cause: "memory:empty",
          },
        };
      }

      return {
        behavior: {
          ...base,
          name: "searching",
          phase: "navigating",
          lookStep: 0,
          lookElapsedMs: 0,
          searchElapsedMs: 0,
        },
        intent: { kind: "last-known" },
        transition: {
          previous: "pursuing",
          event: "lost-sight",
          next: "searching",
          cause: "vision:not-visible",
        },
      };
    }

    case "investigating": {
      if (frame.atDestination) {
        return {
          behavior: {
            ...base,
            name: "searching",
            phase: "looking",
            lookStep: 0,
            lookElapsedMs: 0,
            searchElapsedMs: 0,
          },
          intent: { kind: "look" },
          transition: {
            previous: "investigating",
            event: "investigate-arrival",
            next: "searching",
            cause: "destination-arrival",
          },
        };
      }

      if (!frame.memory.lastKnownPosition) {
        return {
          behavior: {
            ...base,
            name: "returning",
            phase: "navigating",
            lookStep: 0,
            lookElapsedMs: 0,
            searchElapsedMs: 0,
          },
          intent: { kind: "nearest-patrol" },
          transition: {
            previous: "investigating",
            event: "investigate-lost",
            next: "returning",
            cause: "memory:empty",
          },
        };
      }

      return { behavior: previous, intent: { kind: "last-known" }, transition: null };
    }

    case "searching": {
      if (previous.phase === "navigating") {
        if (frame.atDestination) {
          return {
            behavior: { ...previous, phase: "looking", lookStep: 0, lookElapsedMs: 0 },
            intent: { kind: "look" },
            transition: null,
          };
        }

        if (!frame.memory.lastKnownPosition) {
          return {
            behavior: {
              ...base,
              name: "returning",
              phase: "navigating",
              lookStep: 0,
              lookElapsedMs: 0,
            },
            intent: { kind: "nearest-patrol" },
            transition: {
              previous: "searching",
              event: "search-lost",
              next: "returning",
              cause: "memory:empty",
            },
          };
        }

        return {
          behavior: { ...previous, searchElapsedMs: searchElapsed },
          intent: { kind: "last-known" },
          transition: null,
        };
      }

      const lookDone = lookElapsed >= frame.lookMsPerDirection * LOOK_DIRECTION_COUNT;
      if (lookDone && searchElapsed >= frame.searchLimitMs) {
        return {
          behavior: {
            ...base,
            name: "returning",
            phase: "navigating",
            lookStep: 0,
            lookElapsedMs: 0,
          },
          intent: { kind: "nearest-patrol" },
          transition: {
            previous: "searching",
            event: "search-timeout",
            next: "returning",
            cause: "search-limit-exceeded",
          },
        };
      }

      return {
        behavior: {
          ...previous,
          lookStep,
          lookElapsedMs: lookElapsed,
          searchElapsedMs: searchElapsed,
        },
        intent: { kind: "look" },
        transition: null,
      };
    }

    case "returning": {
      if (frame.atDestination && frame.nearestPatrolIndex !== null) {
        const nextPatrol = (frame.nearestPatrolIndex + 1) % frame.patrolCount;
        return {
          behavior: {
            ...base,
            name: "patrolling",
            phase: "navigating",
            lookStep: 0,
            lookElapsedMs: 0,
            searchElapsedMs: 0,
            patrolIndex: nextPatrol,
          },
          intent: { kind: "patrol", index: nextPatrol },
          transition: {
            previous: "returning",
            event: "return-to-patrol",
            next: "patrolling",
            cause: "patrol-reached",
          },
        };
      }

      return { behavior: previous, intent: { kind: "nearest-patrol" }, transition: null };
    }

    case "patrolling": {
      if (frame.planFailed) {
        const recovered = (previous.patrolIndex + 1) % frame.patrolCount;
        return {
          behavior: {
            ...base,
            name: "patrolling",
            phase: "navigating",
            lookStep: 0,
            lookElapsedMs: 0,
            searchElapsedMs: 0,
            patrolIndex: recovered,
          },
          intent: { kind: "patrol", index: recovered },
          transition: {
            previous: "patrolling",
            event: "patrol-recovery",
            next: "patrolling",
            cause: "navigation:failure",
          },
        };
      }

      if (previous.phase === "navigating") {
        if (frame.atDestination) {
          return {
            behavior: {
              ...previous,
              phase: "looking",
              lookStep: 0,
              lookElapsedMs: 0,
              searchElapsedMs: 0,
            },
            intent: { kind: "look" },
            transition: null,
          };
        }

        return {
          behavior: previous,
          intent: { kind: "patrol", index: previous.patrolIndex },
          transition: null,
        };
      }

      const lookDone = lookElapsed >= frame.lookMsPerDirection * LOOK_DIRECTION_COUNT;
      if (lookDone) {
        const nextPatrol = (previous.patrolIndex + 1) % frame.patrolCount;
        return {
          behavior: {
            ...previous,
            name: "patrolling",
            phase: "navigating",
            lookStep: 0,
            lookElapsedMs: 0,
            searchElapsedMs: 0,
            patrolIndex: nextPatrol,
          },
          intent: { kind: "patrol", index: nextPatrol },
          transition: {
            previous: "patrolling",
            event: "patrol-waypoint",
            next: "patrolling",
            cause: "look-complete",
          },
        };
      }

      return {
        behavior: { ...previous, lookStep, lookElapsedMs: lookElapsed },
        intent: { kind: "look" },
        transition: null,
      };
    }
  }
}

function validateFrame(frame: GuardFrame): void {
  if (!Number.isFinite(frame.timeMs) || !Number.isFinite(frame.deltaMs) || frame.deltaMs < 0) {
    throw new Error("Frame time values must be finite and non-negative.");
  }
  if (
    !Number.isFinite(frame.lookMsPerDirection)
    || frame.lookMsPerDirection <= 0
    || !Number.isFinite(frame.searchLimitMs)
    || frame.searchLimitMs < 0
  ) {
    throw new Error("Behavior timing configuration is invalid.");
  }
  if (!Number.isInteger(frame.patrolCount) || frame.patrolCount <= 0) {
    throw new Error("Patrol count must be a positive integer.");
  }
  if (
    typeof frame.soundHeard !== "boolean"
    || typeof frame.atDestination !== "boolean"
    || typeof frame.planFailed !== "boolean"
  ) {
    throw new Error("Frame flags must be booleans.");
  }
}