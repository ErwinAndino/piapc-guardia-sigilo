import type { GuardStateName } from "../../domain/behavior/guardBehavior";

export interface ConeStyle {
  readonly fill: number;
  readonly alpha: number;
}

const CONE_STYLES: Readonly<Record<GuardStateName, ConeStyle>> = {
  patrolling: { fill: 0x6b8afd, alpha: 0.16 },
  returning: { fill: 0x6b8afd, alpha: 0.16 },
  investigating: { fill: 0xe5b454, alpha: 0.24 },
  searching: { fill: 0xe5b454, alpha: 0.24 },
  pursuing: { fill: 0xe16969, alpha: 0.32 },
};

export function coneStyleFor(state: GuardStateName): ConeStyle {
  return CONE_STYLES[state];
}
