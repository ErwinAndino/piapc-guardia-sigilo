import type { Vector2 } from "../../domain/model/vector";
import type { VisionReason } from "../../domain/perception/perception";

export interface SightLineStyle {
  readonly color: number;
  readonly alpha: number;
  readonly width: number;
  readonly dashed: boolean;
}

export const SIGHT_DASH = 10;
export const SIGHT_GAP = 6;

const VISIBLE_STYLE: SightLineStyle = {
  color: 0x73c991,
  alpha: 0.9,
  width: 2,
  dashed: false,
};

const COVERED_STYLE: SightLineStyle = {
  color: 0xe5b454,
  alpha: 0.8,
  width: 2,
  dashed: true,
};

const BROKEN_STYLE: SightLineStyle = {
  color: 0x8a97a3,
  alpha: 0.45,
  width: 1,
  dashed: true,
};

export function sightLineStyleFor(reason: VisionReason): SightLineStyle {
  if (reason === "visible") {
    return VISIBLE_STYLE;
  }
  if (reason === "covered") {
    return COVERED_STYLE;
  }
  return BROKEN_STYLE;
}

export function sightLineSegments(
  from: Vector2,
  to: Vector2,
  dash: number = SIGHT_DASH,
  gap: number = SIGHT_GAP,
): ReadonlyArray<readonly [Vector2, Vector2]> {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  const segments: Array<readonly [Vector2, Vector2]> = [];
  if (length === 0) {
    return segments;
  }

  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const step = dash + gap;
  let travelled = 0;

  while (travelled < length) {
    const start = travelled;
    const end = Math.min(travelled + dash, length);
    segments.push([
      { x: from.x + unitX * start, y: from.y + unitY * start },
      { x: from.x + unitX * end, y: from.y + unitY * end },
    ]);
    travelled += step;
  }

  return segments;
}