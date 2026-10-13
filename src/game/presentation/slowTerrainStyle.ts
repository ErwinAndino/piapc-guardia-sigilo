export interface SlowTerrainStyle {
  readonly fill: number;
  readonly stroke: number;
  readonly strokeWidth: number;
  readonly alpha: number;
}

const SLOW_TERRAIN_STYLE: SlowTerrainStyle = {
  fill: 0xb0893f,
  stroke: 0xe0c46a,
  strokeWidth: 1,
  alpha: 0.22,
};

const NO_SLOW_TERRAIN_STYLE: SlowTerrainStyle = {
  ...SLOW_TERRAIN_STYLE,
  alpha: 0,
};

export function slowTerrainStyleFor(cost: number): SlowTerrainStyle {
  return cost > 1 ? SLOW_TERRAIN_STYLE : NO_SLOW_TERRAIN_STYLE;
}

export function slowTerrainHudLine(cellCount: number, cost: number): string {
  return `terreno lento ${cellCount} celdas x${cost} | A* pondera`;
}
