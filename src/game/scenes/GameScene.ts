import Phaser from "phaser";
import {
  GUARD_START,
  GRID_HEIGHT,
  GRID_WIDTH,
  LAB_ENTRY_COSTS,
  LAB_MAP,
  LAB_SLOW_CELLS,
  PATROL_POINTS,
  PLAYER_START,
  SLOW_TERRAIN_COST,
  TILE_SIZE,
  DOOR_CELLS,
} from "../../application/simulation/labLevel";
import {
  createInitialGuardState,
  DEFAULT_GUARD_CONFIG,
  updateGuardSimulation,
  type GuardSimulationState,
} from "../../application/simulation/guardSimulation";
import { cellCenter, hasAdjacentObstacle, isWalkable, worldToCell, type GridPoint } from "../../domain/model/grid";
import { STATE_LABELS } from "../../domain/behavior/guardBehavior";
import { latestTransitions, type TelemetryEntry } from "../../domain/telemetry/telemetry";
import type { SearchAlgorithm } from "../../domain/navigation/search";
import {
  timeSinceLastPerception,
  type PerceptionSource,
} from "../../domain/perception/memory";
import type { VisionResult } from "../../domain/perception/perception";
import { coneStyleFor } from "../presentation/coneStyle";
import { coverLabel, playerSpeedFor, VISION_LABELS } from "../presentation/coverStyle";
import { sightLineSegments, sightLineStyleFor } from "../presentation/sightLine";
import {
  flashProgress,
  guardBodyStyleFor,
  latestStateTransition,
} from "../presentation/guardStyle";
import {
  IMPACT_FLASH_BLUE,
  IMPACT_FLASH_DURATION_MS,
  IMPACT_FLASH_GREEN,
  IMPACT_FLASH_RED,
  IMPACT_PARTICLE_COUNT,
  IMPACT_PARTICLE_DURATION_MS,
  IMPACT_PARTICLE_SPEED_MAX,
  IMPACT_PARTICLE_SPEED_MIN,
  IMPACT_RING_COLOR,
  IMPACT_RING_DURATION_MS,
  IMPACT_SHAKE_DURATION_MS,
  IMPACT_SHAKE_INTENSITY,
  evaluateAlertImpact,
  impactRemainingMs,
  impactRingStyle,
  initialAlertImpactState,
  type AlertImpactState,
} from "../presentation/alertImpact";
import {
  HOLD_AFTER_PURSUIT_MS,
  ZOOM_BASE,
  ZOOM_SMOOTH_FACTOR,
  advancePursuitHold,
  advanceZoom,
  cameraFocus,
  initialPursuitHoldMs,
  zoomTargetFor,
} from "../presentation/cameraTension";
import { doorHintFor, doorsHudLine, doorStyleFor } from "../presentation/doorStyle";
import { slowTerrainHudLine, slowTerrainStyleFor } from "../presentation/slowTerrainStyle";
import { doorInteraction, effectiveMap } from "../../domain/model/doors";

const PLAYER_SPEED = 190;
const GUARD_RADIUS = 11;
const FLASH_DURATION_MS = 400;
const FLASH_RING_START_RADIUS = GUARD_RADIUS;
const FLASH_RING_END_RADIUS = 28;
const FLASH_RING_START_ALPHA = 0.9;
const VISION_RANGE = DEFAULT_GUARD_CONFIG.visionRange;
const FIELD_OF_VIEW = DEFAULT_GUARD_CONFIG.fieldOfViewRadians;
const MAP_CENTER = {
  x: (GRID_WIDTH * TILE_SIZE) / 2,
  y: (GRID_HEIGHT * TILE_SIZE) / 2,
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
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private stepKey!: Phaser.Input.Keyboard.Key;
  private coverKey!: Phaser.Input.Keyboard.Key;
  private patrolGraphics!: Phaser.GameObjects.Graphics;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private navigationGraphics!: Phaser.GameObjects.Graphics;
  private perceptionGraphics!: Phaser.GameObjects.Graphics;
  private sightLineGraphics!: Phaser.GameObjects.Graphics;
  private transitionGraphics!: Phaser.GameObjects.Graphics;
  private lastKnownMarker!: Phaser.GameObjects.Arc;
  private hudCamera!: Phaser.Cameras.Scene2D.Camera;
  private hud!: Phaser.GameObjects.Text;
  private guardState!: GuardSimulationState;
  private lastTransition: TelemetryEntry | null = null;
  private flashElapsedMs = 0;
  private impactParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private alertImpactState: AlertImpactState = initialAlertImpactState;
  private impactElapsedMs = 0;
  private impactActive = false;
  private algorithm: SearchAlgorithm = "astar";
  private paused = false;
  private lastVision: VisionResult = {
    visible: false,
    reason: "out-of-range",
    distance: 0,
  };
  private lastSoundHeard = false;
  private tensionZoom = ZOOM_BASE;
  private pursuitHoldMs = initialPursuitHoldMs;
  private coverAdjacent = false;
  private playerCovered = false;
  private openDoors: Set<string> = new Set();
  private doorKey!: Phaser.Input.Keyboard.Key;
  private doorGraphics!: Phaser.GameObjects.Graphics;
  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private doorsGroup!: Phaser.Physics.Arcade.StaticGroup;

  public constructor() {
    super("GameScene");
  }

  public create(): void {
    this.algorithm = "astar";
    this.paused = false;
    this.guardState = createInitialGuardState(cellCenter(GUARD_START, TILE_SIZE), TILE_SIZE);
    this.lastTransition = latestStateTransition(this.guardState.telemetry);
    this.flashElapsedMs = 0;
    this.alertImpactState = initialAlertImpactState;
    this.impactElapsedMs = 0;
    this.impactActive = false;
    this.cameras.main.setBackgroundColor("#10161c");
    this.tensionZoom = ZOOM_BASE;
    this.pursuitHoldMs = initialPursuitHoldMs;
    this.cameras.main.setZoom(ZOOM_BASE);
    this.cameras.main.centerOn(MAP_CENTER.x, MAP_CENTER.y);
    this.openDoors = new Set();
    this.drawGrid();
    this.terrainGraphics = this.add.graphics().setDepth(0.5);
    this.drawSlowTerrain();

    this.wallsGroup = this.physics.add.staticGroup();
    this.doorsGroup = this.physics.add.staticGroup();
    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const cell: GridPoint = { x, y };
        if (isWalkable(LAB_MAP, cell)) {
          continue;
        }
        const isDoor = DOOR_CELLS.some((d) => d.x === x && d.y === y);
        const center = cellCenter(cell, TILE_SIZE);
        if (isDoor) {
          const door = this.add.rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, 0x8a5a2b);
          door.setStrokeStyle(2, 0xd9a05b);
          door.setDepth(1);
          this.doorsGroup.add(door);
        } else {
          const wall = this.add.rectangle(center.x, center.y, TILE_SIZE, TILE_SIZE, 0x27333d);
          wall.setStrokeStyle(1, 0x3a4c58);
          this.wallsGroup.add(wall);
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
    this.physics.add.collider(this.player, this.wallsGroup);
    this.physics.add.collider(this.player, this.doorsGroup);

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
    this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.stepKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.coverKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.doorKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.perceptionGraphics = this.add.graphics().setDepth(1);
    this.navigationGraphics = this.add.graphics().setDepth(2);
    this.patrolGraphics = this.add.graphics().setDepth(3);
    this.sightLineGraphics = this.add.graphics().setDepth(1.5);
    this.transitionGraphics = this.add.graphics().setDepth(5);
    this.doorGraphics = this.add.graphics().setDepth(1.2);

    const guardPosition = cellCenter(GUARD_START, TILE_SIZE);
    this.guard = this.add
      .circle(guardPosition.x, guardPosition.y, GUARD_RADIUS, 0x6b8afd)
      .setStrokeStyle(2, 0xb9c5ff)
      .setDepth(4);
    this.lastKnownMarker = this.add
      .circle(0, 0, 7, 0x000000, 0)
      .setStrokeStyle(2, 0xe16969)
      .setDepth(5)
      .setVisible(false);

    this.impactParticles = this.createImpactParticles();

    const hudTitle = this.add
      .text(16, 14, "H4 / MAQUINA DE ESTADOS", {
        color: "#9eb4c2",
        fontFamily: "monospace",
        fontSize: "14px",
      })
      .setDepth(10);

    this.hud = this.add
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

    this.drawPatrolMarkers();

    const hudItems: Phaser.GameObjects.GameObject[] = [hudTitle, this.hud];
    this.hudCamera = this.cameras.add();
    this.cameras.main.ignore(hudItems);
    this.hudCamera.ignore(
      this.children.list.filter((child) => !hudItems.includes(child)),
    );
  }

  public update(time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.reset)) {
      this.scene.restart();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.toggleAlgorithm)) {
      this.algorithm = this.algorithm === "astar" ? "bfs" : "astar";
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.setPaused(!this.paused);
    }

    const stepRequested = Phaser.Input.Keyboard.JustDown(this.stepKey);
    const soundRequested = Phaser.Input.Keyboard.JustDown(this.emitSound);

    if (this.paused && !stepRequested) {
      this.render();
      return;
    }

    const horizontal = Number(this.cursors.right.isDown || this.moveRight.isDown)
      - Number(this.cursors.left.isDown || this.moveLeft.isDown);
    const vertical = Number(this.cursors.down.isDown || this.moveDown.isDown)
      - Number(this.cursors.up.isDown || this.moveUp.isDown);
    const velocity = new Phaser.Math.Vector2(horizontal, vertical);

    const playerCell = worldToCell({ x: this.player.x, y: this.player.y }, TILE_SIZE);
    const effective = effectiveMap(LAB_MAP, [...DOOR_CELLS], this.openDoorsAsArray());
    this.coverAdjacent = hasAdjacentObstacle(effective, playerCell);
    this.playerCovered = this.coverAdjacent && this.coverKey.isDown;

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(playerSpeedFor(this.playerCovered, PLAYER_SPEED));
    }

    this.playerBody.setVelocity(velocity.x, velocity.y);

    if (!this.paused && Phaser.Input.Keyboard.JustDown(this.doorKey)) {
      const guardCell = worldToCell(this.guardState.position, TILE_SIZE);
      const interaction = doorInteraction([...DOOR_CELLS], this.openDoorsAsArray(), playerCell, guardCell);
      if (interaction.interaction === "open" && interaction.door) {
        this.openDoors.add(`${interaction.door.x},${interaction.door.y}`);
        this.updateDoorColliders();
      } else if (interaction.interaction === "close" && interaction.door) {
        this.openDoors.delete(`${interaction.door.x},${interaction.door.y}`);
        this.updateDoorColliders();
      }
    }

    this.updateDoorGraphics();
    this.updateGuard(time, delta, soundRequested);
    this.render();
  }

  private openDoorsAsArray(): Array<{ x: number; y: number }> {
    return Array.from(this.openDoors).map((key) => {
      const [xStr, yStr] = key.split(",");
      return { x: Number(xStr), y: Number(yStr) };
    });
  }

  private updateDoorColliders(): void {
    this.doorsGroup.children.iterate((child) => {
      const go = child as Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Rectangle;
      if (!(go instanceof Phaser.GameObjects.Rectangle)) {
        return null;
      }
      const key = this.doorKeyFromSprite(go);
      if (key === null) {
        (go.body as Phaser.Physics.Arcade.Body).enable = true;
        return null;
      }
      const isOpen = this.openDoors.has(key);
      const body = go.body as Phaser.Physics.Arcade.Body;
      if (isOpen) {
        body.enable = false;
      } else {
        body.enable = true;
        body.reset(go.x, go.y);
      }
      return null;
    });
  }

  private doorKeyFromSprite(sprite: Phaser.GameObjects.Rectangle): string | null {
    const pos = worldToCell({ x: sprite.x, y: sprite.y }, TILE_SIZE);
    const key = `${pos.x},${pos.y}`;
    if (DOOR_CELLS.some((d) => d.x === pos.x && d.y === pos.y)) {
      return key;
    }
    return null;
  }

  private updateDoorGraphics(): void {
    this.doorGraphics.clear();
    for (const door of DOOR_CELLS) {
      const center = cellCenter(door, TILE_SIZE);
      const key = `${door.x},${door.y}`;
      const isOpen = this.openDoors.has(key);
      const style = doorStyleFor(isOpen);
      this.doorGraphics.fillStyle(style.fill, style.alpha);
      this.doorGraphics.fillRect(center.x - TILE_SIZE / 2, center.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      this.doorGraphics.lineStyle(style.strokeWidth, style.stroke, style.alpha);
      this.doorGraphics.strokeRect(center.x - TILE_SIZE / 2, center.y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    }
  }

  private updateGuard(time: number, delta: number, soundRequested: boolean): void {
    const effective = effectiveMap(LAB_MAP, [...DOOR_CELLS], this.openDoorsAsArray());
    const update = updateGuardSimulation(this.guardState, {
      map: effective,
      tileSize: TILE_SIZE,
      playerPosition: { x: this.player.x, y: this.player.y },
      playerSoundRequested: soundRequested,
      playerCovered: this.playerCovered,
      timeMs: time,
      deltaMs: delta,
      algorithm: this.algorithm,
      entryCosts: LAB_ENTRY_COSTS,
    });
    this.guardState = update.state;
    this.guard.setPosition(update.state.position.x, update.state.position.y);
    this.lastVision = update.vision;
    this.lastSoundHeard = update.soundHeard;

    const transition = latestStateTransition(this.guardState.telemetry);
    if (transition !== null && transition !== this.lastTransition) {
      this.lastTransition = transition;
      this.flashElapsedMs = 0;
    } else if (this.lastTransition !== null) {
      this.flashElapsedMs += delta;
    }

    if (!this.paused) {
      const impact = evaluateAlertImpact(
        this.alertImpactState,
        this.guardState.telemetry,
        time,
      );
      this.alertImpactState = impact.state;
      if (impact.burst) {
        this.startImpact();
      }
    }

    if (this.impactActive && !this.paused) {
      this.impactElapsedMs += delta;
      if (this.impactElapsedMs >= IMPACT_RING_DURATION_MS) {
        this.impactElapsedMs = IMPACT_RING_DURATION_MS;
        this.impactActive = false;
      }
    }

    this.applyTensionZoom(delta);
  }

  private applyTensionZoom(deltaMs: number): void {
    const state = this.guardState.behavior.name;
    this.pursuitHoldMs = advancePursuitHold(
      this.pursuitHoldMs,
      state === "pursuing",
      deltaMs,
      HOLD_AFTER_PURSUIT_MS,
    );
    const target = zoomTargetFor(state, this.pursuitHoldMs);
    this.tensionZoom = advanceZoom(this.tensionZoom, target, ZOOM_SMOOTH_FACTOR);
    const focus = cameraFocus(this.tensionZoom, this.player, MAP_CENTER);
    this.cameras.main.centerOn(focus.x, focus.y);
    this.cameras.main.setZoom(this.tensionZoom);
  }

  private createImpactParticles(): Phaser.GameObjects.Particles.ParticleEmitter {
    const key = "alert-spark";
    if (!this.textures.exists(key)) {
      const spark = this.add.graphics();
      spark.fillStyle(0xffffff, 1);
      spark.fillCircle(4, 4, 4);
      spark.generateTexture(key, 8, 8);
      spark.destroy();
    }
    return this.add
      .particles(0, 0, key, {
        emitting: false,
        lifespan: IMPACT_PARTICLE_DURATION_MS,
        speed: {
          min: IMPACT_PARTICLE_SPEED_MIN,
          max: IMPACT_PARTICLE_SPEED_MAX,
        },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: IMPACT_RING_COLOR,
        blendMode: "ADD",
      })
      .setDepth(6);
  }

  private startImpact(): void {
    this.impactActive = true;
    this.impactElapsedMs = 0;
    this.cameras.main.shake(IMPACT_SHAKE_DURATION_MS, IMPACT_SHAKE_INTENSITY, true);
    this.cameras.main.flash(
      IMPACT_FLASH_DURATION_MS,
      IMPACT_FLASH_RED,
      IMPACT_FLASH_GREEN,
      IMPACT_FLASH_BLUE,
      true,
    );
    this.impactParticles.explode(IMPACT_PARTICLE_COUNT, this.guard.x, this.guard.y);
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.cameras.main.shakeEffect.reset();
      this.cameras.main.flashEffect.reset();
      this.impactParticles.pause();
      return;
    }

    this.impactParticles.resume();
    if (!this.impactActive) {
      return;
    }
    const shakeRemaining = impactRemainingMs(this.impactElapsedMs, IMPACT_SHAKE_DURATION_MS);
    if (shakeRemaining > 0) {
      this.cameras.main.shake(shakeRemaining, IMPACT_SHAKE_INTENSITY, true);
    }
    const flashRemaining = impactRemainingMs(this.impactElapsedMs, IMPACT_FLASH_DURATION_MS);
    if (flashRemaining > 0) {
      this.cameras.main.flash(
        flashRemaining,
        IMPACT_FLASH_RED,
        IMPACT_FLASH_GREEN,
        IMPACT_FLASH_BLUE,
        true,
      );
    }
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

  private drawSlowTerrain(): void {
    const style = slowTerrainStyleFor(SLOW_TERRAIN_COST);
    this.terrainGraphics.clear();
    this.terrainGraphics.fillStyle(style.fill, style.alpha);
    this.terrainGraphics.lineStyle(style.strokeWidth, style.stroke, Math.min(1, style.alpha + 0.25));
    for (const cell of LAB_SLOW_CELLS) {
      const center = cellCenter(cell, TILE_SIZE);
      const left = center.x - TILE_SIZE / 2;
      const top = center.y - TILE_SIZE / 2;
      this.terrainGraphics.fillRect(left, top, TILE_SIZE, TILE_SIZE);
      this.terrainGraphics.strokeRect(left, top, TILE_SIZE, TILE_SIZE);
    }
  }

  private drawPatrolMarkers(): void {
    this.patrolGraphics.clear();
    this.patrolGraphics.fillStyle(0x73c991, 0.35);
    for (const point of PATROL_POINTS) {
      const center = cellCenter(point, TILE_SIZE);
      this.patrolGraphics.fillRect(center.x - 9, center.y - 9, 18, 18);
    }
    this.patrolGraphics.lineStyle(2, 0x73c991, 0.9);
    for (const point of PATROL_POINTS) {
      const center = cellCenter(point, TILE_SIZE);
      this.patrolGraphics.strokeRect(center.x - 12, center.y - 12, 24, 24);
    }
  }

  private render(): void {
    this.drawRoute();
    this.drawPerception();
    this.drawSightLine();
    this.drawGuardBody();
    this.renderHud();
  }

  private drawSightLine(): void {
    this.sightLineGraphics.clear();
    const style = sightLineStyleFor(this.lastVision.reason);
    this.sightLineGraphics.lineStyle(style.width, style.color, style.alpha);
    const from = { x: this.guard.x, y: this.guard.y };
    const to = { x: this.player.x, y: this.player.y };

    if (style.dashed) {
      for (const [start, end] of sightLineSegments(from, to)) {
        this.sightLineGraphics.lineBetween(start.x, start.y, end.x, end.y);
      }
      return;
    }

    this.sightLineGraphics.lineBetween(from.x, from.y, to.x, to.y);
  }

  private drawGuardBody(): void {
    const style = guardBodyStyleFor(this.guardState.behavior.name);
    this.guard.setFillStyle(style.fill);
    this.guard.setStrokeStyle(2, style.stroke);

    this.transitionGraphics.clear();
    if (this.lastTransition === null) {
      return;
    }
    if (this.impactActive && this.lastTransition.next === "pursuing") {
      const impactStyle = impactRingStyle(this.impactElapsedMs);
      if (impactStyle.alpha > 0) {
        this.transitionGraphics.lineStyle(4, IMPACT_RING_COLOR, impactStyle.alpha);
        this.transitionGraphics.strokeCircle(this.guard.x, this.guard.y, impactStyle.radius);
      }
      return;
    }
    const progress = flashProgress(this.flashElapsedMs, FLASH_DURATION_MS);
    if (progress >= 1) {
      return;
    }
    const targetStyle = guardBodyStyleFor(this.lastTransition.next);
    const radius =
      FLASH_RING_START_RADIUS +
      (FLASH_RING_END_RADIUS - FLASH_RING_START_RADIUS) * progress;
    const alpha = FLASH_RING_START_ALPHA * (1 - progress);
    this.transitionGraphics.lineStyle(3, targetStyle.stroke, alpha);
    this.transitionGraphics.strokeCircle(this.guard.x, this.guard.y, radius);
  }

  private drawRoute(): void {
    this.navigationGraphics.clear();
    const waypoints = this.guardState.waypoints;
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

  private drawPerception(): void {
    this.perceptionGraphics.clear();
    const guardPosition = { x: this.guard.x, y: this.guard.y };
    const facing = this.guardState.facing;
    const facingAngle = Math.atan2(facing.y, facing.x);
    const halfFieldOfView = FIELD_OF_VIEW / 2;
    const coneStyle = coneStyleFor(this.guardState.behavior.name);
    this.perceptionGraphics.fillStyle(coneStyle.fill, coneStyle.alpha);
    this.perceptionGraphics.beginPath();
    this.perceptionGraphics.moveTo(guardPosition.x, guardPosition.y);
    this.perceptionGraphics.arc(
      guardPosition.x,
      guardPosition.y,
      VISION_RANGE,
      facingAngle - halfFieldOfView,
      facingAngle + halfFieldOfView,
    );
    this.perceptionGraphics.closePath();
    this.perceptionGraphics.fillPath();

    const soundEvent = this.guardState.perception.soundEvent;
    if (soundEvent) {
      this.perceptionGraphics.lineStyle(2, 0xe5b454, 0.8);
      this.perceptionGraphics.strokeCircle(
        soundEvent.position.x,
        soundEvent.position.y,
        soundEvent.radius,
      );
    }

    const lastKnown = this.guardState.perception.memory.lastKnownPosition;
    this.lastKnownMarker.setVisible(lastKnown !== null);
    if (lastKnown) {
      this.lastKnownMarker.setPosition(lastKnown.x, lastKnown.y);
    }
  }

  private renderHud(): void {
    const time = this.time.now;
    const behavior = this.guardState.behavior;
    const phaseLabel = behavior.phase === "looking" ? "MIRANDO" : "AVANZANDO";
    const age = timeSinceLastPerception(this.guardState.perception.memory, time);
    const memory = age === null
      ? "memoria -"
      : `memoria ${sourceLabel(this.guardState.perception.memory.source)} ${(age / 1000).toFixed(1)}s`;
    const sound = this.guardState.perception.soundEvent
      ? (this.lastSoundHeard ? "OIDO" : "FUERA DE RANGO")
      : "-";
    const algorithm = this.algorithm === "astar" ? "A*" : "BFS";
    const pauseLabel = this.paused ? "PAUSA (N para paso)" : "";
    const transitions = latestTransitions(this.guardState.telemetry, 3)
      .map(formatTransition);

    const playerCell = worldToCell({ x: this.player.x, y: this.player.y }, TILE_SIZE);
    const guardCell = worldToCell(this.guardState.position, TILE_SIZE);
    const doorResult = doorInteraction([...DOOR_CELLS], this.openDoorsAsArray(), playerCell, guardCell);
    const hint = doorHintFor(doorResult.interaction);

    this.hud.setText([
      `estado ${STATE_LABELS[behavior.name]} / ${phaseLabel}`,
      `algoritmo ${algorithm}${this.paused ? " | " + pauseLabel : ""}`,
      `vision ${VISION_LABELS[this.lastVision.reason]}`,
      `cobertura ${coverLabel(this.coverAdjacent, this.playerCovered)}`,
      `sonido ${sound}`,
      doorsHudLine(this.openDoors.size, DOOR_CELLS.length, hint),
      slowTerrainHudLine(LAB_SLOW_CELLS.length, SLOW_TERRAIN_COST),
      memory,
      ...transitions,
    ]);
  }
}

function sourceLabel(source: PerceptionSource | null): string {
  return source === "vision" ? "VISION" : source === "sound" ? "SONIDO" : "-";
}

function formatTransition(entry: TelemetryEntry): string {
  const previous = entry.previous ? STATE_LABELS[entry.previous] : "-";
  return `${previous}->${STATE_LABELS[entry.next]} ${entry.event}: ${entry.cause}`;
}