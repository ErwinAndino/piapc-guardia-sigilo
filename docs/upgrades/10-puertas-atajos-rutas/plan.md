---
id: upgrade-10-puertas-atajos-rutas-plan
titulo: Plan - Puertas, atajos o rutas bloqueables
tipo: plan
audiencia: estudiante
acceso: publico
version: 1
---

# Plan — Puertas, atajos o rutas bloqueables

- Spec: `./spec.md` (estado: revisada).
- Estado del plan: aprobado.

## Incrementos

| N. | Archivos previstos | Criterio a comprobar | Comando o prueba | Riesgo | Condicion de detencion |
|---:|---|---|---|---|---|
| 1 | `src/domain/model/doors.ts`, `tests/model/doors.test.ts` | C1, C2, C3 | `npx vitest run tests/model/doors.test.ts` | Confundir puerta declarada con celda bloqueada | No se entiende el contrato de `effectiveMap` |
| 2 | `src/domain/model/grid.ts`, `tests/model/grid.test.ts` | C4 | `npx vitest run tests/model/grid.test.ts` | Orden N/E/S/W ambiguo | Duda sobre el orden de vecinos |
| 3 | `src/application/simulation/labLevel.ts`, `guardSimulation.ts`, `tests/application/guardSimulation.test.ts` | C6, C7, C8 | `npx vitest run tests/application/guardSimulation.test.ts` | Invalidad celdas ya consumidas | Colision con la logica de waypoints |
| 4 | `src/game/presentation/doorStyle.ts`, `tests/presentation/doorStyle.test.ts` | C10 | `npx vitest run tests/presentation/doorStyle.test.ts` | Etiqueta exhaustiva incompleta | Duda de paleta o textos de HUD |
| 5 | `src/game/scenes/GameScene.ts` | C9 | `npm run typecheck` | Estado de puertas fuera de sincronia | Cambio fuera de `GameScene` |
| 6 | `tests/perception/perception.test.ts`, `tests/presentation/guardStyle.test.ts` | C5, C11 | `npx vitest run tests/perception/perception.test.ts tests/presentation/guardStyle.test.ts` | Que `route-invalidated` dispare flash | Efecto de alerta ligado a cualquier entrada |
| 7 | Revision de diff, sin cambios de codigo | C12, C13 | `npm run validate` | Dependencia o cambio colateral | Archivos fuera del alcance tocados |

## Validacion

- Formato, tipos y build: `npm run typecheck && npm run test:run && npm run build`.
- Prueba enfocada:
  - `npx vitest run tests/model/doors.test.ts tests/model/grid.test.ts`
  - `npx vitest run tests/application/guardSimulation.test.ts`
  - `npx vitest run tests/perception/perception.test.ts`
  - `npx vitest run tests/presentation/doorStyle.test.ts tests/presentation/guardStyle.test.ts`

## Riesgos

- Que una puerta cerrada vuelva inaccesible un destino: el mapa base es conexo, se conserva `navigation:invalid-goal`/`unreachable` como red de seguridad.
- Que la invalidacion de ruta se dispare sobre celdas ya consumidas: se evalua solo `indice >= nextWaypoint`.
- Que se introduzca un estado o evento nuevo en la maquina de estados: prohibido; solo se usa la entrada generica `route-invalidated` con `previous === next`.

## Condiciones para detenerse

- Ambiguedad de diseno sin resolver en la spec.
- Cambio concurrente que entre en conflicto con el alcance.
- Validacion fallida por causa no comprendida.
- Archivo fuera del plan o permiso faltante.