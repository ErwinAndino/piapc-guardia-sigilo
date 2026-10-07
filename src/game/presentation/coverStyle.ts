import type { VisionReason } from "../../domain/perception/perception";

export const COVER_SPEED_FACTOR = 0.5;

export function playerSpeedFor(covered: boolean, baseSpeed: number): number {
  return covered ? baseSpeed * COVER_SPEED_FACTOR : baseSpeed;
}

export type CoverLabel = "-" | "DISPONIBLE" | "ACTIVA";

export function coverLabel(adjacentObstacle: boolean, active: boolean): CoverLabel {
  if (!adjacentObstacle) {
    return "-";
  }
  return active ? "ACTIVA" : "DISPONIBLE";
}

export const VISION_LABELS: Readonly<Record<VisionReason, string>> = {
  visible: "VISIBLE",
  "out-of-range": "FUERA DE RANGO",
  "outside-cone": "FUERA DEL CONO",
  occluded: "OCLUIDO",
  "invalid-facing": "DIRECCION INVALIDA",
  covered: "CUBIERTO",
};