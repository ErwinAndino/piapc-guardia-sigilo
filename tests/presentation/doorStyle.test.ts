import { describe, expect, it } from "vitest";
import {
  doorHintFor,
  doorStyleFor,
  doorsHudLine,
} from "../../src/game/presentation/doorStyle";

describe("doorStyle presentation", () => {
  it("doorStyleFor distinguishes open and closed with fixed values", () => {
    const closed = doorStyleFor(false);
    const open = doorStyleFor(true);

    expect(closed.fill).toBe(0x8a5a2b);
    expect(closed.stroke).toBe(0xd9a05b);
    expect(open.stroke).toBe(0x73c991);
  });

  it("doorHintFor covers all cases exhaustively", () => {
    expect(doorHintFor("none")).toBe("");
    expect(doorHintFor("open")).toBe("E ABRIR");
    expect(doorHintFor("close")).toBe("E CERRAR");
    expect(doorHintFor("occupied")).toBe("OCUPADA");
  });

  it("doorsHudLine composes line with optional suffix", () => {
    expect(doorsHudLine(0, 3, "")).toBe("puertas 0/3 abiertas");
    expect(doorsHudLine(1, 3, "E ABRIR")).toBe("puertas 1/3 abiertas | E ABRIR");
  });
});