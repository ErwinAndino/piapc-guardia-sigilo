export function nextPatrolIndex(index: number, patrolPointCount: number): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("Patrol index must be a non-negative integer.");
  }
  if (!Number.isInteger(patrolPointCount) || patrolPointCount <= 0) {
    throw new Error("Patrol points must not be empty.");
  }
  return (index + 1) % patrolPointCount;
}