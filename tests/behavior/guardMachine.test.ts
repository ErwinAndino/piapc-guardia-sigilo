import { describe, expect, it } from "vitest";
import {
  INITIAL_GUARD_MACHINE,
  resolveGuardIntent,
  stepGuardMachine,
  type GuardMachineContext,
  type GuardMachineState,
} from "../../src/domain/behavior/guardMachine";
import {
  captureIntent,
  haltIntent,
  navigateIntent,
  rotateIntent,
  type GuardState,
} from "../../src/domain/behavior/guardStates";

const PATROL = [
  { x: 1, y: 1 },
  { x: 4, y: 1 },
  { x: 4, y: 4 },
];

function machine(
  current: GuardState,
  patrolIndex = 0,
  consecutiveUnreachable = 0,
): GuardMachineState {
  return { current, patrolIndex, consecutiveUnreachable };
}

function context(overrides: Partial<GuardMachineContext> = {}): GuardMachineContext {
  return {
    vision: false,
    playerCell: null,
    lastKnownCell: null,
    reachedLastKnown: false,
    patrolPoints: PATROL,
    ...overrides,
  };
}

describe("guard machine", () => {
  it("starts patrolling toward the first patrol point", () => {
    const step = resolveGuardIntent(INITIAL_GUARD_MACHINE, context());
    expect(INITIAL_GUARD_MACHINE.current).toBe("patrolling");
    expect(step).toEqual(navigateIntent({ x: 1, y: 1 }));
  });

  it("transitions patrolling to chasing upon valid vision", () => {
    const step = stepGuardMachine(
      machine("patrolling"),
      "vision-acquired",
      context({ vision: true, playerCell: { x: 2, y: 2 } }),
      100,
    );
    expect(step.state.current).toBe("chasing");
    expect(step.transition).toMatchObject({
      previousState: "patrolling",
      event: "vision-acquired",
      nextState: "chasing",
      cause: "vision-gained",
    });
    expect(step.intent).toEqual(navigateIntent({ x: 2, y: 2 }));
  });

  it("transitions patrolling to investigating on sound with memory", () => {
    const step = stepGuardMachine(
      machine("patrolling"),
      "sound-heard",
      context({ lastKnownCell: { x: 3, y: 3 } }),
      100,
    );
    expect(step.state.current).toBe("investigating");
    expect(step.transition?.cause).toBe("sound-investigation");
    expect(step.intent).toEqual(navigateIntent({ x: 3, y: 3 }));
  });

  it("ignores sound when vision is present", () => {
    const step = stepGuardMachine(
      machine("patrolling"),
      "sound-heard",
      context({ vision: true, playerCell: { x: 2, y: 2 }, lastKnownCell: { x: 3, y: 3 } }),
      100,
    );
    expect(step.transition).toBeNull();
    expect(step.state.current).toBe("patrolling");
  });

  it("advances the patrol index cyclically on arrival and resets failures", () => {
    const step = stepGuardMachine(
      machine("patrolling", 0, 2),
      "patrol-point-reached",
      context(),
      100,
    );
    expect(step.state).toEqual({ current: "patrolling", patrolIndex: 1, consecutiveUnreachable: 0 });
    expect(step.transition?.cause).toBe("waypoint-next");
    expect(step.intent).toEqual(navigateIntent(PATROL[1]!));
  });

  it("cycles around the last patrol point back to the first", () => {
    const step = stepGuardMachine(
      machine("patrolling", PATROL.length - 1),
      "patrol-point-reached",
      context(),
      100,
    );
    expect(step.state.patrolIndex).toBe(0);
    expect(step.intent).toEqual(navigateIntent(PATROL[0]!));
  });

  it("advances to the next patrol point when the current one is unreachable", () => {
    const step = stepGuardMachine(
      machine("patrolling", 0),
      "patrol-point-unreachable",
      context(),
      100,
    );
    expect(step.state.patrolIndex).toBe(1);
    expect(step.state.consecutiveUnreachable).toBe(1);
    expect(step.transition?.cause).toBe("patrol-unreachable");
  });

  it("halts after every patrol point is unreachable", () => {
    let state = machine("patrolling", 0);
    for (let index = 0; index < PATROL.length; index += 1) {
      const step = stepGuardMachine(state, "patrol-point-unreachable", context(), 100);
      state = step.state;
      if (index === PATROL.length - 1) {
        expect(step.intent).toEqual(haltIntent());
      }
    }
    expect(state.consecutiveUnreachable).toBe(PATROL.length);
  });

  it("re-plans investigating on a changed observation", () => {
    const step = stepGuardMachine(
      machine("investigating"),
      "observation-changed",
      context({ lastKnownCell: { x: 2, y: 2 } }),
      100,
    );
    expect(step.state.current).toBe("investigating");
    expect(step.transition?.cause).toBe("observation-updated");
    expect(step.intent).toEqual(navigateIntent({ x: 2, y: 2 }));
  });

  it("moves from investigating to searching upon arrival", () => {
    const step = stepGuardMachine(
      machine("investigating"),
      "path-completed",
      context({ lastKnownCell: { x: 3, y: 3 }, reachedLastKnown: true }),
      100,
    );
    expect(step.state.current).toBe("searching");
    expect(step.transition?.cause).toBe("investigation-reached");
    expect(step.intent).toEqual(rotateIntent());
  });

  it("moves from investigating to returning when the destination is unreachable", () => {
    const step = stepGuardMachine(
      machine("investigating"),
      "destination-unreachable",
      context(),
      100,
    );
    expect(step.state.current).toBe("returning");
    expect(step.transition?.cause).toBe("investigation-unreachable");
    expect(step.intent).toEqual(navigateIntent(PATROL[0]!));
  });

  it("sets chasing when vision completes during investigation", () => {
    const step = stepGuardMachine(
      machine("investigating"),
      "vision-acquired",
      context({ vision: true, playerCell: { x: 5, y: 5 } }),
      100,
    );
    expect(step.state.current).toBe("chasing");
    expect(step.intent).toEqual(navigateIntent({ x: 5, y: 5 }));
  });

  it("moves from chasing to searching on vision loss", () => {
    const step = stepGuardMachine(
      machine("chasing"),
      "vision-lost",
      context({ lastKnownCell: { x: 3, y: 3 } }),
      100,
    );
    expect(step.state.current).toBe("searching");
    expect(step.transition?.cause).toBe("vision-lost");
  });

  it("re-plans while chasing without leaving the state", () => {
    const step = stepGuardMachine(
      machine("chasing"),
      "replan-needed",
      context({ vision: true, playerCell: { x: 4, y: 4 } }),
      100,
    );
    expect(step.state.current).toBe("chasing");
    expect(step.transition?.cause).toBe("replan");
    expect(step.intent).toEqual(navigateIntent({ x: 4, y: 4 }));
  });

  it("captures the player when close enough", () => {
    const step = stepGuardMachine(
      machine("chasing"),
      "capture-reached",
      context({ vision: true, playerCell: { x: 2, y: 1 } }),
      100,
    );
    expect(step.state.current).toBe("captured");
    expect(step.transition?.cause).toBe("captured");
    expect(step.intent).toEqual(captureIntent());
  });

  it("re-investigates from searching when a new sound is heard", () => {
    const step = stepGuardMachine(
      machine("searching"),
      "sound-heard",
      context({ lastKnownCell: { x: 2, y: 2 } }),
      100,
    );
    expect(step.state.current).toBe("investigating");
    expect(step.transition?.cause).toBe("sound-investigation");
  });

  it("returns to patrolling after the search times out", () => {
    const step = stepGuardMachine(
      machine("searching"),
      "search-timeout",
      context(),
      100,
    );
    expect(step.state.current).toBe("returning");
    expect(step.transition?.cause).toBe("search-timeout");
  });

  it("does not time out when vision is present", () => {
    const step = stepGuardMachine(
      machine("searching"),
      "search-timeout",
      context({ vision: true, playerCell: { x: 2, y: 2 }, lastKnownCell: { x: 2, y: 2 } }),
      100,
    );
    expect(step.transition).toBeNull();
    expect(step.state.current).toBe("searching");
  });

  it("resumes patrolling from the same index after returning", () => {
    const step = stepGuardMachine(
      machine("returning", 2, 1),
      "path-completed",
      context(),
      100,
    );
    expect(step.state).toEqual({ current: "patrolling", patrolIndex: 2, consecutiveUnreachable: 0 });
    expect(step.transition?.cause).toBe("return-completed");
  });

  it("tries another patrol point when the return target is unreachable", () => {
    const step = stepGuardMachine(
      machine("returning", 0),
      "patrol-point-unreachable",
      context(),
      100,
    );
    expect(step.state.patrolIndex).toBe(1);
    expect(step.transition?.cause).toBe("return-unreachable");
  });

  it("restarts to patrolling with a reset record", () => {
    const step = stepGuardMachine(
      machine("captured", 2, 1),
      "restart",
      context(),
      100,
    );
    expect(step.state).toEqual(INITIAL_GUARD_MACHINE);
    expect(step.transition).toMatchObject({
      previousState: "captured",
      event: "restart",
      nextState: "patrolling",
      cause: "reset",
    });
  });

  it("rejects events that are not allowed in the current state", () => {
    expect(() => stepGuardMachine(machine("chasing"), "patrol-point-reached", context(), 100))
      .toThrow("not allowed in state chasing");
    expect(() => stepGuardMachine(machine("captured"), "vision-acquired", context(), 100))
      .toThrow("not allowed");
  });

  it("resolves the navigate intent for investigating from memory", () => {
    const intent = resolveGuardIntent(
      machine("investigating"),
      context({ lastKnownCell: { x: 4, y: 4 } }),
    );
    expect(intent).toEqual(navigateIntent({ x: 4, y: 4 }));
  });

  it("resolves a halt intent when chasing has no player cell", () => {
    const intent = resolveGuardIntent(machine("chasing"), context());
    expect(intent).toEqual(haltIntent());
  });
});