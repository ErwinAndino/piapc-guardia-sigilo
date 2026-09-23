import { describe, expect, it } from "vitest";
import {
  createTelemetryLog,
  latestTransitions,
  recordTelemetry,
} from "../../src/domain/telemetry/telemetry";

describe("telemetry", () => {
  it("records and appends entries in order", () => {
    let log = createTelemetryLog();
    log = recordTelemetry(log, {
      timeMs: 100,
      previous: "patrolling",
      event: "vision-acquired",
      next: "pursuing",
      cause: "vision:visible",
    });
    log = recordTelemetry(log, {
      timeMs: 200,
      previous: "pursuing",
      event: "lost-sight",
      next: "searching",
      cause: "vision:not-visible",
    });

    expect(log.entries).toHaveLength(2);
    expect(log.entries[0]).toMatchObject({ event: "vision-acquired" });
    expect(log.entries[1]).toMatchObject({ event: "lost-sight" });
  });

  it("returns the latest requested entries", () => {
    let log = createTelemetryLog();
    for (let index = 0; index < 5; index += 1) {
      log = recordTelemetry(log, {
        timeMs: index,
        previous: "patrolling",
        event: `entry-${index}`,
        next: "patrolling",
        cause: "test",
      });
    }

    expect(latestTransitions(log, 3).map((entry) => entry.event)).toEqual([
      "entry-2",
      "entry-3",
      "entry-4",
    ]);
  });

  it("rejects non-finite times", () => {
    expect(() => recordTelemetry(createTelemetryLog(), {
      timeMs: Number.POSITIVE_INFINITY,
      previous: null,
      event: "reset",
      next: "patrolling",
      cause: "initial",
    })).toThrow("finite");
  });

  it("rejects empty events and causes", () => {
    expect(() => recordTelemetry(createTelemetryLog(), {
      timeMs: 0,
      previous: "patrolling",
      event: "",
      next: "pursuing",
      cause: "vision",
    })).toThrow("event and cause");

    expect(() => recordTelemetry(createTelemetryLog(), {
      timeMs: 0,
      previous: "patrolling",
      event: "vision-acquired",
      next: "pursuing",
      cause: "",
    })).toThrow("event and cause");
  });

  it("rejects invalid slice counts", () => {
    expect(() => latestTransitions(createTelemetryLog(), -1)).toThrow("non-negative");
  });
});