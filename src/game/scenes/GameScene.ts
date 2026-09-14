import Phaser from "phaser";
import {
  CAPTURE_DISTANCE_PX,
  GUARD_START,
  GRID_HEIGHT,
  GRID_WIDTH,
  LAB_MAP,
  PATROL_POINTS,
  PLAYER_START,
  REPLAN_INTERVAL_MS,
  SEARCH_DURATION_MS,
  TILE_SIZE,
} from "../../application/simulation/labLevel";
import {
  initialGuardSimulationState,
  updateGuardSimulation,
  withGuardSound,
  type GuardSimulationState,
} from "../../application/simulation/guardSimulation";
import { cellCenter, isWalkable } from "../../domain/model/grid";
import type { Vector2 } from "../../domain/model/vector";
import { timeSinceLastPerception } from "../../domain/perception/memory";
import type { PerceptionFrame } from "../../application/simulation/perceptionSimulation";
import type {
  GuardEvent,
  GuardState,
} from "../../domain/behavior/guardStates";
import type { SearchAlgorithm, SearchStatus } from "../../domain/navigation/search";
import type { VisionReason } from "../../domain/perception/perception";

const PLAYER_SPEED = 190;
const GUARD_SPEED = 115;
const VISION_RANGE = 220;
const FIELD_OF_VIEW = Math.PI / 2;
const SOUND_RADIUS = 190;
const SOUND_DURATION_MS = 800;
const STATUS_LABELS: Readonly<Record<SearchStatus, string>> = {
  success: "EXITO",
  unreachable: "INALCANZABLE",
  "invalid-start": "INICIO INVALIDO",
  "invalid-goal": "DESTINO INVALIDO",
};
const VISION_LABELS: Readonly<Record<VisionReason, string>> = {
  visible: "VISIBLE",
  "out-of-range": "FUERA DE RANGO",
  "outside-cone": "FUERA DEL CONO",
  occluded: "OCLUIDO",
  "invalid-facing": "DIRECCION INVALIDA",
};
const STATE_LABELS: Readonly<Record<GuardState, string>> = {
  patrolling: "PATRULLANDO",
  investigating: "INVESTIGANDO",
  chasing: "PERSIGUIENDO",
  searching: "BUSCANDO",
  returning: "REGRESANDO",
  captured: "CAPTURADO",
};
const EVENT_LABELS: Readonly<Record<GuardEvent, string>> = {
  "vision-acquired": "VISION",
  "vision-lost": "PERDIO VISION",
  "sound-heard": "OYO SONIDO",
  "observation-changed": "NUEVA PISTA",
  "patrol-point-reached": "PUNTO ALCANZADO",
  "patrol-point-unreachable": "PUNTO INALCANZABLE",
  "path-completed": "DESTINO ALCANZADO",
  "destination-unreachable": "DESTINO INALCANZABLE",
  "replan-needed": "REPLAN",
  "capture-reached": "CAPTURA",
  "search-timeout": "BUSQUEDA TERMINADA",
  restart: "REINICIO",
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private guard!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveUp!: Phaser.Input.Keyboard.Key;
  private moveDown!: Phaser.Input.Keyboard.Key;
  private moveLeft!: Phaser.Input.Keyboard.Key;
  private moveRight!: Phaser.Input.Keyboard.Key;
  private reset!: Phaser.Input.Keyboard.Key;
  private toggleAlgorithm!: Phaser.Input.Keyboard.Key;
  private emitSound!: Phaser.Input.Keyboard.Key;
  private navigationGraphics!: Phaser.GameObjects.Graphics;
  private perceptionGraphics!: Phaser.GameObjects.Graphics;
  private lastKnownMarker!: Phaser.GameObjects.Arc;
  private navigationHud!: Phaser.GameObjects.Text;
  private guardSim!: GuardSimulationState;
  private navigationAlgorithm: SearchAlgorithm = "astar";
  private guardFacing: Vector2 = { x: -1, y: 0 };

  public constructor() {
    super("GameScene");
  }

  public create(): void {
    this.navigationAlgorithm = "astar";
    const guardPosition = cellCenter(GUARD_START, TILE_SIZE);
    this.guardSim = initialGuardSimulationState(guardPosition, { x: -1, y: 0 });
    this.guardFacing = { x: -1, y: 0 };
    this.cameras.main.setBackgroundColor("#10161c");
    this.drawGrid();

    const walls = this.physics.add.staticGroup();
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        if (!isWalkable(LAB_MAP, { x, y })) {
          const center = cellCenter({ x, y }, TILE_SIZE);
          const wall = this.add.rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, 0x27333d);
          wall.setStrokeStyle(1, 0x3a4c58);
          walls.add(wall);
        }
      }
    }

    const spawn = cellCenter(PLAYER_START, TILE_SIZE);
    this.player = this.add.rectangle(spawn.x, spawn.y, 20, 20, 0xe5b454);
    this.player.setStrokeStyle(2, 0xffd98a);
    this.player.setDepth(4);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, walls);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.moveUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.moveDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.moveLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.moveRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.reset = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.toggleAlgorithm = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.emitSound = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    this.perceptionGraphics = this.add.graphics().setDepth(1);
    this.navigationGraphics = this.add.graphics().setDepth(2);
    this.guard = this.add
      .circle(guardPosition.x, guardPosition.y, 11, 0x6b8afd)
      .setStrokeStyle(2, 0xb9c5ff)
      .setDepth(4);
    this.lastKnownMarker = this.add
      .circle(0, 0, 7, 0x000000, 0)
      .setStrokeStyle(2, 0xe16969)
      .setDepth(5)
      .setVisible(false);

    this.add
      .text(16, 14, "H4 / MAQUINA DE ESTADOS", {
        color: "#9eb4c2",
        fontFamily: "monospace",
        fontSize: "14px",
      })
      .setDepth(10);

    this.navigationHud = this.add
      .text(GRID_WIDTH * TILE_SIZE - 16, 14, "", {
        align: "right",
        backgroundColor: "#10161ccc",
        color: "#d9e4ea",
        fontFamily: "monospace",
        fontSize: "13px",
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(10);

    const initial = updateGuardSimulation(this.guardSim, this.simulationInput(0, 0));
    this.guardSim = initial.state;
  }

  public update(time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.reset)) {
      this.scene.restart();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.toggleAlgorithm)) {
      this.navigationAlgorithm = this.navigationAlgorithm === "astar" ? "bfs" : "astar";
    }

    if (Phaser.Input.Keyboard.JustDown(this.emitSound)) {
      this.guardSim = withGuardSound(this.guardSim, {
        position: { x: this.player.x, y: this.player.y },
        radius: SOUND_RADIUS,
        emittedAtMs: time,
        durationMs: SOUND_DURATION_MS,
      });
    }

    const horizontal = Number(this.cursors.right.isDown || this.moveRight.isDown)
      - Number(this.cursors.left.isDown || this.moveLeft.isDown);
    const vertical = Number(this.cursors.down.isDown || this.moveDown.isDown)
      - Number(this.cursors.up.isDown || this.moveUp.isDown);
    const velocity = new Phaser.Math.Vector2(horizontal, vertical);

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(PLAYER_SPEED);
    }

    this.playerBody.setVelocity(velocity.x, velocity.y);

    const frame = updateGuardSimulation(
      this.guardSim,
      this.simulationInput(time, delta),
    );
    this.guardSim = frame.state;
    this.guardFacing = frame.facing;
    this.guard.setPosition(frame.position.x, frame.position.y);
    this.guard.setFillStyle(frame.current === "captured" ? 0xcd5c5c : 0x6b8afd);
    this.guard.setStrokeStyle(2, frame.current === "captured" ? 0xffa3a3 : 0xb9c5ff);

    this.drawNavigation(frame.route?.waypoints ?? []);
    this.drawPerception(frame.perception);
    this.updateTelemetry(frame.current, frame.perception, time);
  }

  private simulationInput(
    timeMs: number,
    deltaMs: number,
  ): Parameters<typeof updateGuardSimulation>[1] {
    return {
      map: LAB_MAP,
      tileSize: TILE_SIZE,
      timeMs,
      deltaMs,
      target: { x: this.player.x, y: this.player.y },
      speed: GUARD_SPEED,
      visionRange: VISION_RANGE,
      fieldOfViewRadians: FIELD_OF_VIEW,
      algorithm: this.navigationAlgorithm,
      patrolPoints: PATROL_POINTS,
      captureDistancePx: CAPTURE_DISTANCE_PX,
      searchDurationMs: SEARCH_DURATION_MS,
      replanIntervalMs: REPLAN_INTERVAL_MS,
    };
  }

  private drawGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1b252d, 1);

    for (let x = 0; x <= GRID_WIDTH; x += 1) {
      graphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
    }
    for (let y = 0; y <= GRID_HEIGHT; y += 1) {
      graphics.lineBetween(0, y * TILE_SIZE, GRID_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
  }

  private drawNavigation(waypoints: readonly Vector2[]): void {
    this.navigationGraphics.clear();
    if (waypoints.length === 0) {
      return;
    }

    this.navigationGraphics.lineStyle(4, 0x62d0e8, 0.9);
    this.navigationGraphics.beginPath();
    this.navigationGraphics.moveTo(waypoints[0]?.x ?? 0, waypoints[0]?.y ?? 0);
    for (const point of waypoints.slice(1)) {
      this.navigationGraphics.lineTo(point.x, point.y);
    }
    this.navigationGraphics.strokePath();
  }

  private drawPerception(perception: PerceptionFrame): void {
    this.perceptionGraphics.clear();
    const facingAngle = Math.atan2(this.guardFacing.y, this.guardFacing.x);
    const halfFieldOfView = FIELD_OF_VIEW / 2;
    this.perceptionGraphics.fillStyle(perception.vision.visible ? 0x73c991 : 0x6b8afd, 0.16);
    this.perceptionGraphics.beginPath();
    this.perceptionGraphics.moveTo(this.guard.x, this.guard.y);
    this.perceptionGraphics.arc(
      this.guard.x,
      this.guard.y,
      VISION_RANGE,
      facingAngle - halfFieldOfView,
      facingAngle + halfFieldOfView,
    );
    this.perceptionGraphics.closePath();
    this.perceptionGraphics.fillPath();

    if (perception.state.soundEvent) {
      this.perceptionGraphics.lineStyle(2, 0xe5b454, 0.8);
      this.perceptionGraphics.strokeCircle(
        perception.state.soundEvent.position.x,
        perception.state.soundEvent.position.y,
        perception.state.soundEvent.radius,
      );
    }

    const lastKnown = perception.state.memory.lastKnownPosition;
    this.lastKnownMarker.setVisible(lastKnown !== null);
    if (lastKnown) {
      this.lastKnownMarker.setPosition(lastKnown.x, lastKnown.y);
    }
  }

  private updateTelemetry(
    current: GuardState,
    perception: PerceptionFrame,
    time: number,
  ): void {
    const transition = this.guardSim.lastTransition;
    const stateLine = `estado ${STATE_LABELS[current]}`;
    const previous = transition
      ? `anterior ${STATE_LABELS[transition.previousState]}`
      : "anterior -";
    const eventLine = transition
      ? `${EVENT_LABELS[transition.event]} (${transition.cause})`
      : "-";

    const metrics = this.guardSim.lastSearch;
    const search = metrics
      ? `${metrics.algorithm === "astar" ? "A*" : "BFS"} / ${STATUS_LABELS[metrics.status]}` +
        ` | costo ${metrics.totalCost ?? "-"} | expandidos ${metrics.expandedNodes}`
      : "";
    const searchFrontier = metrics
      ? `frontera maxima ${metrics.maximumFrontier}`
      : "";

    const vision = VISION_LABELS[perception.vision.reason];
    const soundHeard = perception.soundHeard;
    const sound = perception.state.soundEvent
      ? (soundHeard ? "OIDO" : "FUERA DE RANGO")
      : "-";

    const age = timeSinceLastPerception(perception.state.memory, time);
    const memory = age === null
      ? "memoria -"
      : `memoria ${perception.state.memory.source} ${(age / 1000).toFixed(1)}s`;

    this.navigationHud.setText([
      `${this.navigationAlgorithm === "astar" ? "A*" : "BFS"} / ${stateLine} | ${previous}`,
      `evento ${eventLine}`,
      ...(search ? [search, searchFrontier] : []),
      `vision ${vision}`,
      `sonido ${sound}`,
      memory,
    ]);
  }
}