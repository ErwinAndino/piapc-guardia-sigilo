---
id: upgrade-03-animaciones-estado-transicion-evidencia
titulo: Evidencia - Animaciones por estado y transicion
tipo: evidencia
audiencia: estudiante
acceso: publico
version: 2
---

# Evidencia — Animaciones por estado y transicion

## Version

- Inicial: sin commits propios; cambios sobre `e183fbd` en el arbol de trabajo.
- Final: pendiente de autorizacion humana para commit.
- Entorno: node v24.16.0, npm 12.0.2, Windows, rama
  `Laboratorio-de-intervencion-agentica-completa`.

## Comandos y resultados

| Orden | Comando | Resultado | Salida relevante |
|---:|---|---|---|
| 1 | `npx vitest run tests/presentation/guardStyle.test.ts` | exit 0 | 1 archivo / 15 pruebas |
| 2 | `npm run typecheck` | exit 0 | `tsc --noEmit` sin errores |
| 3 | `npx vitest run tests/presentation/` | exit 0 | 2 archivos / 22 pruebas |
| 4 | `npm run validate` | exit 0 | typecheck + 11 archivos / 84 pruebas + build `dist/` |

Advertencia de build conocida (chunk 1507.28 kB > 500 kB): preexistente,
fuera de alcance de este upgrade.

## Build y ejecucion

`npm run build` genera `dist/` correctamente. La reproduccion visual (C7)
requiere `npm run dev` y esta pendiente de revision humana.

## Registro cronologico resumido

| Orden | Accion o herramienta | Resultado observable | Decision humana |
|---:|---|---|---|
| 1 | Redaccion de `spec.md` y `plan.md` (incremento 0) | Diff de 2 documentos de `docs/upgrades/03-*/` | [ ] |
| 2 | Aprobacion de spec y plan | Humano: "procede a aplicar el plan" | aceptar / corregir / detener |
| 3 | `guardStyle.ts` + `guardStyle.test.ts` (incremento 1) | 15 pruebas nuevas en verde | [ ] |
| 4 | `GameScene.ts` cuerpo + anillo (incremento 2) | typecheck y presentation en verde | [ ] |
| 5 | `npm run validate` (incremento 3) | exit 0, 84 pruebas, build OK | [ ] |

## Diff

- Commits o referencia de cambios autorizados: sin commits (pendiente de
  autorizacion humana); cambios sobre `e183fbd`.
- Resumen de archivos modificados:
  - `docs/upgrades/03-animaciones-estado-transicion/spec.md` (v2)
  - `docs/upgrades/03-animaciones-estado-transicion/plan.md` (v2)
  - `src/game/presentation/guardStyle.ts` (nuevo)
  - `tests/presentation/guardStyle.test.ts` (nuevo)
  - `src/game/scenes/GameScene.ts` (color de cuerpo + anillo de destello)

## Matriz criterio → evidencia

| Criterio de la spec | Comprobacion | Resultado real |
|---|---|---|
| C1 Estilo definido para los 5 estados | `guardStyle.test.ts` — "covers every guard state" | aprobado (15 pruebas, exit 0) |
| C2 Tres niveles de amenaza distintos | `guardStyle.test.ts` — "uses distinct styles..." | aprobado |
| C3 `latestStateTransition` ignora `reset` y `navigation-unreachable` | `guardStyle.test.ts` — 4 pruebas de filtro | aprobado |
| C4 `flashProgress` acotado, monotonico y validado | `guardStyle.test.ts` — bloque "flash progress" | aprobado |
| C5 Restauracion tras persecucion | `guardStyle.test.ts` — "restores the resting style..." | aprobado |
| C6 `npm run validate` exit 0 | Comando 4 | aprobado (11 archivos / 84 pruebas) |
| C7 Color y anillo visibles en ejecucion | `npm run dev` + transicion patrulla → persecucion → patrulla | pendiente de reproduccion visual humana |

## Evidencia visual o telemetria

- Pendiente: `npm run dev`; provocar una transicion (p. ej. acercarse al
  guardia) y observar (a) el cuerpo azul → amarillo → rojo y (b) el anillo
  expansivo de 400 ms en color del estado destino.
- Sin cambios de telemetria ni de dominio: el registro existente
  (`TransitionLog`) es la unica fuente de eventos de transicion.

## Limitaciones

- No validado: C7 (reproduccion visual) requiere ejecucion interactiva con
  `npm run dev` y decision humana.
- No validado: comportamiento del destello en pausa y reinicio se diseno en
  spec (reloj congelado, limpieza al reiniciar) pero solo es verificable en
  ejecucion.

## Decision humana

- Fecha: [AAAA-MM-DD].
- Resolucion: [ ] integrar  [ ] corregir  [ ] revertir  [ ] descartar
- Notas: [PENDIENTE]
