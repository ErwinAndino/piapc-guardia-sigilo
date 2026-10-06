---
id: upgrade-01-patrulla-pausas-mirada-evidencia
titulo: Evidencia - Patrulla con pausas y mirada direccional
tipo: evidencia
audiencia: estudiante
acceso: publico
version: 2
---

# Evidencia — Patrulla con pausas y mirada direccional

## Version

- Inicial: `e14a1c6` (Initial commit); comportamiento introducido por `f80466c`
  ("H4: maquina de estados del guardia con telemetria").
- Final: sin commits propios de codigo; documentacion en el commit que
  cierre este paquete (pendiente de autorizacion humana).
- Entorno: Windows, node v24.16.0, npm 12.0.2.

## Comandos y resultados

| Orden | Comando | Resultado | Salida relevante |
|---:|---|---|---|
| 1 | `npm run validate` (2026-10-06) | exit 0 | typecheck OK; 10 archivos / 69 pruebas OK; build OK 3.56 s |
| 2 | `npx vitest run tests/behavior/guardBehavior.test.ts` | exit 0 | 1 archivo / 15 pruebas OK |

## Build y ejecucion

- `npm run build` genera `dist/index.html`, `dist/assets/index-Bjc2XB3U.js`
  (1505.79 kB) y `dist/assets/index-BdusbQAW.css`.
- Advertencia de chunk > 500 kB: preexistente, fuera de alcance.

## Registro cronologico resumido

| Orden | Accion o herramienta | Resultado observable | Decision humana |
|---:|---|---|---|
| 1 | Lectura de `guardBehavior.ts`, `guardSimulation.ts`, `GameScene.ts` y tests | Fase `looking`, `LOOK_DIRECTIONS`, `facing` y rotulo "MIRANDO" verificados con rutas | Adoptar el comportamiento del baseline como upgrade 01 |
| 2 | Ejecucion de comandos de validacion | exit 0 en ambas ejecuciones | Aceptar resultados |
| 3 | Redaccion de spec, plan y evidencia | Paquete documentado en `docs/upgrades/01-patrulla-pausas-mirada/` | Pendiente |

## Diff

- No hay cambios de `src/` ni `tests/` para este upgrade.
- Origen del comportamiento: `git show f80466c` incluye
  `src/domain/behavior/guardBehavior.ts` (+446),
  `src/application/simulation/guardSimulation.ts` (+282),
  `src/game/scenes/GameScene.ts` (fase/rotulo en HUD) y
  `tests/behavior/guardBehavior.test.ts` (+274).
- Cambios de este paquete: solo `docs/upgrades/01-patrulla-pausas-mirada/*`.

## Matriz criterio → evidencia

| Criterio | Comprobacion | Resultado real |
|---|---|---|
| C1: pausa al llegar al waypoint | `guardBehavior.test.ts` — "begins the four-direction look when arriving at a patrol point" | aprobado (15/15 pruebas del archivo) |
| C2: cuatro direcciones y avance temporal | tests "counts exactly four look directions" y "advances the look step over time and then continues the cycle" | aprobado |
| C3: avance de waypoint con telemetría `patrol-waypoint` | test de ciclo de patrulla + `guardBehavior.ts:406` (`cause: look-complete`) | aprobado |
| C4: la vision interrumpe la pausa | test "interrupts the look when a valid vision perception arrives" | aprobado |
| C5: `facing` cambia con `lookStep` | inspeccion: `guardSimulation.ts:240` (`facing = LOOK_DIRECTIONS[behavior.lookStep] ?? facing`) | aprobado por inspeccion; sin prueba automatizada |
| C6: build y suite completa | `npm run validate` | exit 0 |
| C7: pausa y giro visibles en pantalla | reproduccion visual con `npm run dev` | **pendiente (usuario)** |

## Evidencia visual o telemetria

- Visual (C7): pendiente — ejecutar `npm run dev` y observar detencion +
  giro del cono en cada marcador de patrulla y rotulo "MIRANDO" en el HUD.
- Telemetria: transiciones visibles en HUD via `latestTransitions`
  (`GameScene.ts:305`).

## Limitaciones

- El comportamiento no fue escrito para este upgrade: las pruebas cubren C1–C4
  como regresión del baseline, no como prueba de un cambio nuevo.
- C5 no tiene cobertura automatizada.
- C7 sin producir.

## Decision humana

- Fecha: [AAAA-MM-DD].
- Resolucion: [ ] integrar  [ ] corregir  [ ] revertir  [ ] descartar
- Notas: [PENDIENTE]
