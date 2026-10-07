import { describe, expect, it } from "vitest";
import {
  COVER_SPEED_FACTOR,
  coverLabel,
  playerSpeedFor,
  VISION_LABELS,
} from "../../src/game/presentation/coverStyle";
import type { VisionReason } from "../../src/domain/perception/perception";

const ALL_REASONS: readonly VisionReason[] = [
  "visible",
  "out-of-range",
  "outside-cone",
  "occluded",
  "invalid-facing",
  "covered",
];

describe("cover style", () => {
  describe("playerSpeedFor", () => {
    it("applies the exact 0.5 factor while covered", () => {
      expect(COVER_SPEED_FACTOR).toBe(0.5);
      expect(playerSpeedFor(true, 190)).toBe(95);
      expect(playerSpeedFor(true, 200)).toBe(100);
    });

    it("keeps the base speed untouched without coverage", () => {
      expect(playerSpeedFor(false, 190)).toBe(190);
      expect(playerSpeedFor(false, 0)).toBe(0);
    });
  });

  describe("coverLabel", () => {
    it("reports no cover without an adjacent obstacle", () => {
      expect(coverLabel(false, false)).toBe("-");
      expect(coverLabel(false, true)).toBe("-");
    });

    it("reports DISPONIBLE next to an obstacle while inactive", () => {
      expect(coverLabel(true, false)).toBe("DISPONIBLE");
    });

    it("reports ACTIVA next to an obstacle while active", () => {
      expect(coverLabel(true, true)).toBe("ACTIVA");
    });
  });

  describe("VISION_LABELS", () => {
    it("labels every vision reason, including covered", () => {
      for (const reason of ALL_REASONS) {
        expect(VISION_LABELS[reason]).toBeDefined();
      }
      expect(VISION_LABELS.covered).toBe("CUBIERTO");
    });
  });
});