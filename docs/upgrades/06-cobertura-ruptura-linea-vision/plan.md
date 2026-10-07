---
id: upgrade-06-cobertura-ruptura-linea-vision-plan
titulo: Plan - Cobertura y ruptura de linea de vision
tipo: plan
audiencia: estudiante
acceso: publico
version: 1
---

# Plan — Cobertura y ruptura de linea de vision

- Spec: `./spec.md` (estado: decisiones resueltas con el humano el 2026-10-06; aprobada para ejecucion).
- Estado del plan: aprobado el 2026-10-06; ejecutado (incrementos 1-7); pendiente de reproduccion visual (C8) y decision humana.

## Supuestos de diseno

- `hasAdjacentObstacle(map, cell)` se implementa sobre `!isWalkable` de los 4
  vecinos cardinales: cubre a la vez celda bloqueada y celda fuera del mapa
  (regla existente de `isInside`), sin duplicar logica.
- `evaluateVision` evalua `covered` al final, justo antes del
  `return { visible: true }`: solo alcanza el motivo `covered` cuando sin
  cobertura el resultado seria `visible`. Los retornos previos de
  `out-of-range`, `outside-cone` y `occluded` dan C2 sin codigo extra.
- `perceptionSimulation` solo reenvia `input.playerCovered ?? false` a
  `evaluateVision`; como `visible` queda `false`, `rememberObservation` no se
  ejecuta: memoria y transiciones intactas (C4) sin tocar `guardBehavior.ts`
  ni `memory.ts`.
- `VISION_LABELS` se muda de `GameScene.ts` a
  `src/game/presentation/coverStyle.ts` (exportado e importado por la escena):
  C6 exige probarlo desde `tests/presentation/coverStyle.test.ts` y el
  `Record<VisionReason, string>` da exhaustividad en `typecheck`.
- Rayo dibujado con un `Graphics` nuevo (`sightLineGraphics`), creado en el
  bloque de `create()` anterior a los `hudCamera.ignore(...)`, con profundidad
  1.5: sobre el cono (1) y por debajo de ruta (2), marcadores (3), guardia y
  jugador (4) y marcador de memoria (5).
- Phaser no tiene linea punteada nativa: los segmentos se calculan por codigo
  con una funcion pura auxiliar en `sightLine.ts` (tramo de 10 px y hueco de
  6 px) para que el dibujo sea testeable.
- La velocidad del jugador usa la misma base actual (`PLAYER_SPEED = 190`);
  `playerSpeedFor(covered, 190)` devuelve 190 o 95 exactos (C5).

## Incrementos

| N. | Archivos previstos | Criterio a comprobar | Comando o prueba | Riesgo | Condicion de detencion |
|---:|---|---|---|---|---|
| 1 | `src/domain/model/grid.ts`, `tests/model/grid.test.ts` | C3: adyacencia verdadera con al menos un vecino no transitable o fuera del mapa; falsa en celda interior libre | `npx vitest run tests/model/grid.test.ts` | Confundir "no transitable" con "bloqueado" olvida el borde del mapa | Test fallido => corregir la funcion, no ampliar la spec |
| 2 | `src/domain/perception/perception.ts`, `tests/perception/perception.test.ts` | C1 (`covered: true` con linea despejada => `visible: false` y motivo `covered`); C2 (no enmascara `occluded`, `out-of-range`, `outside-cone`) | `npx vitest run tests/perception/perception.test.ts` | Aplicar `covered` antes de la oclusion rompe C2 | C2 fallido => reordenar el chequeo dentro de `evaluateVision` |
| 3 | `src/application/simulation/perceptionSimulation.ts`, `src/application/simulation/guardSimulation.ts`, `tests/application/guardSimulation.test.ts` | C4: con `playerCovered: true` no hay memoria nueva ni transicion a `pursuing`; sin cobertura y con linea despejada persigue; default `false` sin cambios en pruebas previas | `npx vitest run tests/application/guardSimulation.test.ts` y `npm run typecheck` | Olvidar el default `false` rompe las construcciones existentes de input | C4 fallido o pruebas previas en rojo => revisar el reenvio del flag |
| 4 | `src/game/presentation/coverStyle.ts` (nuevo), `tests/presentation/coverStyle.test.ts` (nuevo) | C5 (`playerSpeedFor` 190 -> 95 exactos y 190 -> 190); C6 (`coverLabel` distingue `-`, `DISPONIBLE`, `ACTIVA`; `VISION_LABELS` con etiqueta para `covered` tipado exhaustivo) | `npx vitest run tests/presentation/coverStyle.test.ts` | Constante `COVER_SPEED_FACTOR` alterada por error (debe ser 0.5 exacto) | C5/C6 fallidos => corregir el modulo; no se toca `GameScene` |
| 5 | `src/game/presentation/sightLine.ts` (nuevo), `tests/presentation/sightLine.test.ts` (nuevo) | C7: estilo definido para los 6 motivos; continuo verde `0x73c991` alfa 0.9 grosor 2 solo en `visible`; segmentado amarillo `0xe5b454` alfa 0.8 grosor 2 en `covered`; segmentado gris `0x8a97a3` alfa 0.45 grosor 1 en el resto | `npx vitest run tests/presentation/sightLine.test.ts` | Mezclar la geometria de guiones con el estilo | C7 fallidos => separar estilo y segmentacion |
| 6 | `src/game/scenes/GameScene.ts` | C8: HUD con linea `cobertura` y `vision CUBIERTO` sin escalar ni desplazarse con el zoom; rayo sobre el cono y por debajo de guardia, jugador y marcadores; C9: diff sin cambios en `guardBehavior.ts`, `memory.ts`, `telemetry.ts`, `labLevel.ts`, sin dependencias nuevas | `npm run typecheck`, `npm run dev` con checklist 1-5 de la spec; `git diff --stat` | Tecla SHIFT mal usada (`isDown` frente a `JustDown`), velocidad aplicada solo en un eje, o rayo creado despues del `hudCamera.ignore` y duplicado en la HUD | Checklist visual fallido => revertir solo `GameScene` |
| 7 | `docs/upgrades/06-cobertura-ruptura-linea-vision/evidencia.md` | C10 y matriz criterio -> evidencia completa | `npm run validate` (exit 0) y pruebas enfocadas de la spec | Documentacion desconectada del codigo | Discrepancia entre criterios y evidencia => detenerse |

Detalle del incremento 6 (unico que toca Phaser): `addKey(SHIFT)`,
`covered = shift.isDown && hasAdjacentObstacle(LAB_MAP, worldToCell(jugador))`
recalculado cada frame (sin estado persistente => sin residuo tras R ni en
pausa), `playerSpeedFor` en la escala de velocidad, `playerCovered` en el
input de `updateGuardSimulation`, linea nueva en `setText` de la HUD, import
de `VISION_LABELS` desde `coverStyle` y `drawSightLine()` con el estilo desde
`sightLineStyleFor(this.lastVision.reason)`.

## Validacion

- Por incremento: la prueba enfocada de su fila mas `npm run typecheck`.
- Tras los incrementos 3 y 6 y al cierre:
  `npm run typecheck && npm run test:run && npm run build` (= `npm run validate`),
  exit 0.
- `git diff` revisado tras cada incremento; sin commits sin autorizacion humana.

## Riesgos

- No hay tests de `GameScene`: las reglas viven en `coverStyle.ts` y
  `sightLine.ts`; HUD y rayo se verifican con el checklist manual (C8).
- Orden de profundidades fragil: cono 1, ruta 2, patrulla 3, guardia y jugador
  4, marcador de memoria 5; el rayo va en 1.5 y se crea antes de los
  `hudCamera.ignore`.
- Las mejoras 04 (shake/flash) y 05 (zoom) ya estan en el codigo: verificar en
  reproduccion que el rayo escala con el zoom y la HUD permanece estable.
- Build con chunk principal sobre el limite de 500 kB de Vite: preexistente,
  fuera de alcance.

## Condiciones para detenerse

- Ambiguedad de diseno sin resolver en la spec.
- Cambio concurrente que entre en conflicto con el alcance.
- Validacion fallida por causa no comprendida.
- Archivo fuera del plan o permiso faltante.
