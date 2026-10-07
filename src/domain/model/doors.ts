import { cellKey, isInside, type GridMap, type GridPoint } from "./grid";

export type DoorInteraction = "none" | "open" | "close" | "occupied";

export interface DoorInteractionResult {
  readonly interaction: DoorInteraction;
  readonly door: GridPoint | null;
}

const CARDINAL_OFFSETS: readonly GridPoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

function isDeclaredDoor(doors: readonly GridPoint[], cell: GridPoint): boolean {
  return doors.some((door) => door.x === cell.x && door.y === cell.y);
}

function validateOpenDoors(base: GridMap, doors: readonly GridPoint[], openDoors: readonly GridPoint[]): void {
  for (const door of openDoors) {
    if (!isInside(base, door)) {
      throw new Error(`Door is outside the grid: ${cellKey(door)}.`);
    }
    if (!isDeclaredDoor(doors, door)) {
      throw new Error(`Door is not declared: ${cellKey(door)}.`);
    }
  }
}

export function effectiveMap(
  base: GridMap,
  doors: readonly GridPoint[],
  openDoors: readonly GridPoint[],
): GridMap {
  validateOpenDoors(base, doors, openDoors);

  const openSet = new Set<string>();
  for (const door of openDoors) {
    openSet.add(cellKey(door));
  }

  const blocked = new Set<string>();
  for (const key of base.blocked) {
    if (openSet.has(key)) {
      continue;
    }
    blocked.add(key);
  }

  for (const door of doors) {
    const key = cellKey(door);
    if (openSet.has(key)) {
      continue;
    }
    blocked.add(key);
  }

  return {
    width: base.width,
    height: base.height,
    blocked,
  };
}

export function doorInteraction(
  doors: readonly GridPoint[],
  openDoors: readonly GridPoint[],
  playerCell: GridPoint,
  guardCell: GridPoint,
): DoorInteractionResult {
  const openSet = new Set<string>();
  for (const door of openDoors) {
    openSet.add(cellKey(door));
  }

  for (const door of doors) {
    const key = cellKey(door);
    const isOpen = openSet.has(key);
    const inRange = isAdjacentOrSame(playerCell, door);

    if (!inRange) {
      continue;
    }

    if (isOpen) {
      const playerInside = cellEquals(playerCell, door);
      const guardInside = cellEquals(guardCell, door);
      if (playerInside || guardInside) {
        return { interaction: "occupied", door };
      }
      return { interaction: "close", door };
    }

    return { interaction: "open", door };
  }

  return { interaction: "none", door: null };
}

function isAdjacentOrSame(cell: GridPoint, door: GridPoint): boolean {
  if (cell.x === door.x && cell.y === door.y) {
    return true;
  }
  return CARDINAL_OFFSETS.some((offset) => (
    cell.x === door.x + offset.x && cell.y === door.y + offset.y
  ));
}

function cellEquals(left: GridPoint, right: GridPoint): boolean {
  return left.x === right.x && left.y === right.y;
}