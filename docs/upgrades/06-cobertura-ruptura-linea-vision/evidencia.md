---
id: upgrade-06-cobertura-ruptura-linea-vision-evidencia
titulo: Evidencia - Cobertura y ruptura de linea de vision
tipo: evidencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia — Cobertura y ruptura de linea de vision

## Version

- Inicial: `20dd5eb` ("Upgrade 05: camara dinamica de tension al perseguir").
- Final: cambios de la mejora 06 sin commitear (sin commit sin autorizacion).
- Entorno: Windows, node v22+ (npm script de `package.json`), Phaser 3.90.0.

## Comandos y resultados

| Orden | Comando | Resultado | Salida relevante |
|---:|---|---|---|
| 1 | `npx vitest run tests/model/grid.test.ts` | exit 0 | 8/8 pruebas (C3) |
| 2 | `npx vitest run tests/perception/perception.test.ts` | exit 0 | 14/14 pruebas (C1, C2) |
| 3 | `npx vitest run tests/application/guardSimulation.test.ts` | exit 0 | 6/6 pruebas (C4) |
| 4 | `npx vitest run tests/presentation/coverStyle.test.ts` | exit 0 | 6/6 pruebas (C5, C6) |
| 5 | `npx vitest run tests/presentation/sightLine.test.ts` | exit 0 | 8/8 pruebas (C7) |
| 6 | `npm run typecheck` | exit 0 | Sin errores TS (incluye exhaustividad de `Record<VisionReason, string>`) |
| 7 | `npm run validate` | exit 0 | typecheck OK, 15 archivos / 143 pruebas verdas, build OK |

## Build y ejecucion

- `npm run build` genera `dist/` correctamente (29 modulos).
- Advertencia preexistente del chunk principal (1513 kB > 500 kB): fuera del
  alcance de esta mejora.
- Reproduccion visual pendiente de humano: checklist de la spec (C8) en
  "Evidencia visual o telemetria".

## Registro cronologico resumido

| Orden | Accion o herramienta | Resultado observable | Decision humana |
|---:|---|---|---|
| 1 | Lectura de spec, plantillas y codigo afectado | Alcance mapeado a archivos | aceptar plan |
| 2 | Escribir `docs/upgrades/06-cobertura-ruptura-linea-vision/plan.md` | Plan aprobado por incrementos | aprobar |
| 3 | Inc 1: `hasAdjacentObstacle` en `grid.ts` + tests | C3: 8/8 | aceptar |
| 4 | Inc 2: motivo `covered` y campo `covered` en `evaluateVision` + tests; etiqueta `CUBIERTO` forzada por typecheck | C1/C2: 14/14 | aceptar |
| 5 | Inc 3: `playerCovered` en `PerceptionFrameInput` y `GuardSimulationInput` + test guard | C4: 6/6; validate destacada 143/143 | aceptar |
| 6 | Inc 4: `coverStyle.ts` (velocidad, etiqueta y `VISION_LABELS`) + tests | C5/C6: 6/6 | aceptar |
| 7 | Inc 5: `sightLine.ts` (estilo y segmentacion) + tests | C7: 8/8 | aceptar |
| 8 | Inc 6: `GameScene.ts` (tecla SHIFT, velocidad, HUD, rayo) | typecheck OK, checklist visual pendiente | pendiente |
| 9 | `npm run validate` final | 15 archivos / 143 pruebas, build OK (C10) | pendiente |

## Diff

- Cambios sin commitear (autorizacion humana pendiente):
  - `src/domain/model/grid.ts` — `hasAdjacentObstacle` + offsets cardinales.
  - `src/domain/perception/perception.ts` — motivo y consulta `covered`, evaluacion tras oclusion.
  - `src/application/simulation/perceptionSimulation.ts` — `playerCovered` en input, reenvio `?? false`.
  - `src/application/simulation/guardSimulation.ts` — `playerCovered` en input, reenvio `?? false`.
  - `src/game/scenes/GameScene.ts` — tecla SHIFT, estado de cobertura, velocidad 190/95, linea HUD, rayo con estado (profunidad 1.5); `VISION_LABELS` importado desde `coverStyle`.
  - `src/game/presentation/coverStyle.ts` — (nuevo) `COVER_SPEED_FACTOR`, `playerSpeedFor`, `coverLabel`, `VISION_LABELS`.
  - `src/game/presentation/sightLine.ts` — (nuevo) `SIGHT_DASH`/`SIGHT_GAP`, `sightLineStyleFor`, `sightLineSegments`.
  - `tests/model/grid.test.ts`, `tests/perception/perception.test.ts`, `tests/application/guardSimulation.test.ts` — extendidas.
  - `tests/presentation/coverStyle.test.ts`, `tests/presentation/sightLine.test.ts` — (nuevas).
  - `docs/upgrades/06-cobertura-ruptura-linea-vision/{spec,plan,evidencia}.md` — documentacion.
- Sin cambios (C9): `guardBehavior.ts`, `memory.ts`, `telemetry.ts`, `labLevel.ts`, `package.json`/`package-lock.json`.

## Matriz criterio → evidencia

| Criterio de la spec | Comprobacion | Resultado real |
|---|---|---|
| C1 | `npx vitest run tests/perception/perception.test.ts` (test "hides a target that would otherwise be visible when covered") | aprobado |
| C2 | Mismo archivo (test "does not mask other vision causes when covered") | aprobado |
| C3 | `npx vitest run tests/model/grid.test.ts` (tests de `hasAdjacentObstacle`) | aprobado |
| C4 | `npx vitest run tests/application/guardSimulation.test.ts` (test "does not acquire, update memory nor pursue when the player is covered") | aprobado |
| C5 | `npx vitest run tests/presentation/coverStyle.test.ts` (factor 0.5 exacto, 190 → 95) | aprobado |
| C6 | `npx vitest run tests/presentation/coverStyle.test.ts` + `npm run typecheck` | aprobado |
| C7 | `npx vitest run tests/presentation/sightLine.test.ts` | aprobado |
| C8 | Checklist manual de reproduccion (pendiente de humano) | pendiente |
| C9 | `git diff --stat -- src/domain src/application` (solo los 4 archivos del alcance), diff sin cambios en `guardBehavior.ts`, `memory.ts`, `telemetry.ts` ni `labLevel.ts` | aprobado |
| C10 | `npm run validate` | aprobado |

## Evidencia visual o telemetria

Aplica (HUD, rayo y velocidad). Checklist manual de la spec, pendiente de
revision humana:

1. Pararse junto a una pared → HUD `cobertura DISPONIBLE`, sin ningun otro cambio.
2. Mantener SHIFT con linea despejada → HUD `cobertura ACTIVA`, vision `CUBIERTO`, rayo segmentado amarillo, velocidad a la mitad y el guardia no pasa a perseguir.
3. Soltar SHIFT estando a la vista → vision `VISIBLE`, rayo continuo verde y el guardia pasa a perseguir.
4. Cubrirse detras de una pared → vision `OCLUIDO` (no `CUBIERTO`) y rayo gris segmentado.
5. Reiniciar con SHIFT presionado → escena limpia, HUD estable y sin residuos de cobertura.

## Ambiguedad detectada en la spec (pendiente de resolucion humana)

El caso limite de la spec dice "SHIFT sostenido sin obstaculo adyacente: ...
HUD `DISPONIBLE`", pero el Alcance define `cobertura -` (sin obstaculo
adyacente). La implementacion sigue el Alcance y la C6: sin obstaculo
adyacente la etiqueta es siempre `-`, aunque la tecla este sostenida
(`coverLabel(adjacent=false, active)` devuelve `-`). Si se quiere el
comportamiento del caso limite, se ajustaria `coverLabel` sin tocar el
dominio.

## Limitaciones

- No validado: checklist visual (C8) y reproduccion con zoom (05) / shake y
  flash (04) activos; requiere humano con `npm run dev`.
- No validado: `npm run dev` en red o dispositivos distintos al entorno local.

## Decision humana

- Fecha: [AAAA-MM-DD].
- Resolucion: [ ] integrar  [ ] corregir  [ ] revertir  [ ] descartar
- Notas: [PENDIENTE]