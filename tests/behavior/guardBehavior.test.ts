import { describe, expect, it } from "vitest";
import {
  createInitialBehavior,
  LOOK_DIRECTION_COUNT,
  updateGuardBehavior,
  type GuardBehavior,
  type GuardFrame,
} from "../../src/domain/behavior/guardBehavior";
import { emptyPerceptionMemory } from "../../src/domain/perception/memory";

const PATROL_POINTS = [
  { x: 0, y: 0 },
  { x: 1, y: 5 },
];

const MEMORY = {
  lastKnownPosition: { x: 10, y: 10 },
  lastPerceivedAtMs: 500,
  source: "sound" as const,
};

function patrolling(patrolIndex = 0): GuardBehavior {
  return {
    name: "patrolling",
    phase: "navigating",
    lookStep: 0,
    lookElapsedMs: 0,
    searchElapsedMs: 0,
    patrolIndex,
    sightLostElapsedMs: 0,
  };
}

function frame(overrides: Partial<GuardFrame> = {}): GuardFrame {
  return {
    timeMs: 1000,
    deltaMs: 16,
    atDestination: false,
    planFailed: false,
    vision: { visible: false, reason: "out-of-range", distance: 200 },
    soundHeard: false,
    memory: MEMORY,
    lookMsPerDirection: 20,
    searchLimitMs: 400,
    sightLostToleranceMs: 250,
    patrolCount: 2,
    nearestPatrolIndex: 0,
    ...overrides,
  };
}

describe("guard behavior", () => {
  it("starts patrolling toward the nearest matching patrol point", () => {
    const behavior = createInitialBehavior({ x: 1, y: 5 }, PATROL_POINTS);

    expect(behavior.name).toBe("patrolling");
    expect(behavior.phase).toBe("navigating");
    expect(behavior.patrolIndex).toBe(1);
  });

  it("begins the four-direction look when arriving at a patrol point", () => {
    const decision = updateGuardBehavior(patrolling(1), frame({ atDestination: true }));

    expect(decision.transition).toBeNull();
    expect(decision.behavior.phase).toBe("looking");
    expect(decision.intent.kind).toBe("look");
  });

  it("advances the look step over time and then continues the cycle", () => {
    const looking: GuardBehavior = {
      name: "patrolling",
      phase: "looking",
      lookStep: 0,
      lookElapsedMs: 0,
      searchElapsedMs: 0,
      patrolIndex: 1,
      sightLostElapsedMs: 0,
    };

    const partial = updateGuardBehavior(looking, frame({ deltaMs: 20 }));
    expect(partial.behavior.lookStep).toBe(1);
    expect(partial.intent.kind).toBe("look");

    const complete = updateGuardBehavior(partial.behavior, frame({ deltaMs: 60 }));
    expect(complete.transition).toEqual({
      previous: "patrolling",
      event: "patrol-waypoint",
      next: "patrolling",
      cause: "look-complete",
    });
    expect(complete.behavior.name).toBe("patrolling");
    expect(complete.behavior.phase).toBe("navigating");
    expect(complete.behavior.patrolIndex).toBe(0);
    expect(complete.intent).toEqual({ kind: "patrol", index: 0 });
  });

  it("interrupts the look when a valid vision perception arrives", () => {
    const looking: GuardBehavior = {
      name: "patrolling",
      phase: "looking",
      lookStep: 2,
      lookElapsedMs: 40,
      searchElapsedMs: 0,
      patrolIndex: 1,
      sightLostElapsedMs: 0,
    };
    const decision = updateGuardBehavior(looking, frame({
      vision: { visible: true, reason: "visible", distance: 30 },
    }));

    expect(decision.transition).toEqual({
      previous: "patrolling",
      event: "vision-acquired",
      next: "pursuing",
      cause: "vision:visible",
    });
    expect(decision.behavior.name).toBe("pursuing");
    expect(decision.intent).toEqual({ kind: "last-known" });
  });

  it("heads to the sound position when a sound is heard without vision", () => {
    const heard = { ...MEMORY, lastKnownPosition: { x: 3, y: 3 } };
    const decision = updateGuardBehavior(patrolling(0), frame({
      soundHeard: true,
      memory: heard,
    }));

    expect(decision.transition).toEqual({
      previous: "patrolling",
      event: "sound-heard",
      next: "investigating",
      cause: "sound:heard",
    });
    expect(decision.behavior.name).toBe("investigating");
    expect(decision.intent).toEqual({ kind: "last-known" });
  });

  it("keeps pursuing while the player is visible even if a sound arrives", () => {
    const pursuing: GuardBehavior = {
      name: "pursuing",
      phase: "navigating",
      lookStep: 0,
      lookElapsedMs: 0,
      searchElapsedMs: 0,
      patrolIndex: 0,
      sightLostElapsedMs: 0,
    };
    const decision = updateGuardBehavior(pursuing, frame({
      vision: { visible: true, reason: "visible", distance: 20 },
      soundHeard: true,
    }));

    expect(decision.transition).toBeNull();
    expect(decision.behavior.name).toBe("pursuing");
  });

  it("switches to searching at the last known position when sight is lost", () => {
    const pursuing: GuardBehavior = {
      name: "pursuing",
      phase: "navigating",
      lookStep: 0,
      lookElapsedMs: 0,
      searchElapsedMs: 0,
      patrolIndex: 0,
      sightLostElapsedMs: 0,
    };
    const decision = updateGuardBehavior(pursuing, frame({ deltaMs: 250 }));

    expect(decision.transition).toEqual({
      previous: "pursuing",
      event: "lost-sight",
      next: "searching",
      cause: "vision:not-visible",
    });
    expect(decision.behavior.phase).toBe("navigating");
    expect(decision.intent).toEqual({ kind: "last-known" });
  });

  it("stays pursuing briefly after sight is lost", () => {
    const pursuing: GuardBehavior = {
      name: "pursuing",
      phase: "navigating",
      lookStep: 0,
      lookElapsedMs: 0,
      searchElapsedMs: 0,
      patrolIndex: 0,
      sightLostElapsedMs: 0,
    };
    const decision = updateGuardBehavior(pursuing, frame({ deltaMs: 100 }));

    expect(decision.transition).toBeNull();
    expect(decision.behavior.name).toBe("pursuing");
    expect(decision.behavior.sightLostElapsedMs).toBe(100);
    expect(decision.intent).toEqual({ kind: "last-known" });
  });

  it("starts looking when the investigation point is reached", () => {
    const investigating: GuardBehavior = {
      name: "investigating",
      phase: "navigating",
      lookStep: 0,
      lookElapsedMs: 0,
      searchElapsedMs: 0,
      patrolIndex: 0,
      sightLostElapsedMs: 0,
    };
    const decision = updateGuardBehavior(investigating, frame({ atDestination: true }));

    expect(decision.transition).toEqual({
      previous: "investigating",
      event: "investigate-arrival",
      next: "searching",
      cause: "destination-arrival",
    });
    expect(decision.behavior.phase).toBe("looking");
    expect(decision.intent.kind).toBe("look");
  });

  it("returns to patrol when the limited search expires without findings", () => {
    const searching: GuardBehavior = {
      name: "searching",
      phase: "looking",
      lookStep: 3,
      lookElapsedMs: 80,
      searchElapsedMs: 400,
      patrolIndex: 0,
      sightLostElapsedMs: 0,
    };
    const decision = updateGuardBehavior(searching, frame({ deltaMs: 0 }));

    expect(decision.transition).toEqual({
      previous: "searching",
      event: "search-timeout",
      next: "returning",
      cause: "search-limit-exceeded",
    });
    expect(decision.intent).toEqual({ kind: "nearest-patrol" });
  });

  it("returns to the nearest patrol point and resumes the cycle on arrival", () => {
    const returning: GuardBehavior = {
      name: "returning",
      phase: "navigating",
      lookStep: 0,
      lookElapsedMs: 0,
      searchElapsedMs: 0,
      patrolIndex: 0,
      sightLostElapsedMs: 0,
    };
    const decision = updateGuardBehavior(returning, frame({
      atDestination: true,
      nearestPatrolIndex: 1,
    }));

    expect(decision.transition).toEqual({
      previous: "returning",
      event: "return-to-patrol",
      next: "patrolling",
      cause: "patrol-reached",
    });
    expect(decision.behavior.patrolIndex).toBe(0);
    expect(decision.intent).toEqual({ kind: "patrol", index: 0 });
  });

  it("recovers from an unreachable patrol destination by advancing the cycle", () => {
    const decision = updateGuardBehavior(patrolling(0), frame({ planFailed: true }));

    expect(decision.transition).toEqual({
      previous: "patrolling",
      event: "patrol-recovery",
      next: "patrolling",
      cause: "navigation:failure",
    });
    expect(decision.behavior.patrolIndex).toBe(1);
  });

  it("counts exactly four look directions", () => {
    expect(LOOK_DIRECTION_COUNT).toBe(4);
  });

  it("ignores an empty perception memory while patrolling", () => {
    const decision = updateGuardBehavior(patrolling(0), frame({
      memory: emptyPerceptionMemory(),
    }));

    expect(decision.behavior.name).toBe("patrolling");
    expect(decision.transition).toBeNull();
  });

  it("rejects invalid timing configuration", () => {
    expect(() => updateGuardBehavior(patrolling(0), frame({
      lookMsPerDirection: 0,
    }))).toThrow("timing");
  });

  it("rejects negative deltas", () => {
    expect(() => updateGuardBehavior(patrolling(0), frame({
      deltaMs: -1,
    }))).toThrow("non-negative");
  });
});