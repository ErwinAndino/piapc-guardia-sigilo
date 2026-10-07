import type { DoorInteraction } from "../../domain/model/doors";

export interface DoorStyle {
  readonly fill: number;
  readonly stroke: number;
  readonly strokeWidth: number;
  readonly alpha: number;
}

const DOOR_CLOSED_STYLE: DoorStyle = {
  fill: 0x8a5a2b,
  stroke: 0xd9a05b,
  strokeWidth: 2,
  alpha: 1,
};

const DOOR_OPEN_STYLE: DoorStyle = {
  fill: 0x000000,
  stroke: 0x73c991,
  strokeWidth: 2,
  alpha: 0.9,
};

export function doorStyleFor(isOpen: boolean): DoorStyle {
  return isOpen ? DOOR_OPEN_STYLE : DOOR_CLOSED_STYLE;
}

export function doorHintFor(interaction: DoorInteraction): string {
  if (interaction === "open") {
    return "E ABRIR";
  }
  if (interaction === "close") {
    return "E CERRAR";
  }
  if (interaction === "occupied") {
    return "OCUPADA";
  }
  return "";
}

export function doorsHudLine(openCount: number, total: number, hint: string): string {
  const base = `puertas ${openCount}/${total} abiertas`;
  if (hint && hint.length > 0) {
    return `${base} | ${hint}`;
  }
  return base;
}