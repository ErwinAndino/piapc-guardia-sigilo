import type { GuardStateName } from "../../domain/behavior/guardBehavior";
import { assertFiniteVector, type Vector2 } from "../../domain/model/vector";

export const ZOOM_BASE = 1;
export const ZOOM_PURSUE = 1.15;
export const ZOOM_SMOOTH_FACTOR = 0.08;
export const HOLD_AFTER_PURSUIT_MS = 2500;
export const initialZoom = ZOOM_BASE;
export const initialPursuitHoldMs = 0;

function clampZoom(zoom: number): number {
  return Math.min(ZOOM_PURSUE, Math.max(ZOOM_BASE, zoom));
}

export function advancePursuitHold(
  currentMs: number,
  pursuing: boolean,
  deltaMs: number,
  holdMs: number = HOLD_AFTER_PURSUIT_MS,
): number {
  if (!Number.isFinite(currentMs) || !Number.isFinite(deltaMs) || !Number.isFinite(holdMs)) {
    throw new Error("Pursuit hold values must be finite.");
  }
  if (deltaMs < 0) {
    throw new Error("Pursuit hold delta must be non-negative.");
  }
  if (holdMs < 0) {
    throw new Error("Pursuit hold duration must be non-negative.");
  }
  if (pursuing) {
    return holdMs;
  }
  return Math.min(holdMs, Math.max(0, currentMs - deltaMs));
}

export function zoomTargetFor(state: GuardStateName, holdRemainingMs = 0): number {
  if (!Number.isFinite(holdRemainingMs)) {
    throw new Error("Pursuit hold remaining time must be finite.");
  }
  return state === "pursuing" || holdRemainingMs > 0 ? ZOOM_PURSUE : ZOOM_BASE;
}

export function cameraFocus(zoom: number, player: Vector2, mapCenter: Vector2): Vector2 {
  if (!Number.isFinite(zoom)) {
    throw new Error("Camera focus zoom must be finite.");
  }
  assertFiniteVector(player);
  assertFiniteVector(mapCenter);
  const bounded = clampZoom(zoom);
  const t = (bounded - ZOOM_BASE) / (ZOOM_PURSUE - ZOOM_BASE);
  return {
    x: mapCenter.x + (player.x - mapCenter.x) * t,
    y: mapCenter.y + (player.y - mapCenter.y) * t,
  };
}

export function advanceZoom(current: number, target: number, factor: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target) || !Number.isFinite(factor)) {
    throw new Error("Zoom advance values must be finite.");
  }
  const step = Math.min(1, Math.max(0, factor));
  return clampZoom(current + (target - current) * step);
}