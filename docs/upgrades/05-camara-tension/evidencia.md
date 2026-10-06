---
id: upgrade-05-camara-tension-evidencia
titulo: Evidencia - Camara dinamica de tension
tipo: evidencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia — Camara dinamica de tension

## Version

- Inicial: `faac4e1` (spec y plan de la mejora 05 aprobados para ejecutar).
- Final: sin commits propios; cambios sobre `faac4e1` en el arbol de trabajo
  (rama `Laboratorio-de-intervencion-agentica-completa`).
- Entorno: node v24.16.0, npm 12.0.2, Windows.

## Comandos y resultados

| Orden | Comando | Resultado | Salida relevante |
|---:|---|---|---|
| 1 | `npx vitest run tests/presentation/cameraTension.test.ts` | exit 0 | 1 archivo / 14 pruebas (C1–C4) |
| 2 | `npm run typecheck` | exit 0 | `tsc --noEmit` sin errores |
| 3 | `npm run validate` | exit 0 | typecheck + 13 archivos / 123 pruebas + build `dist/` |
| 4 | `git diff --stat -- src/domain src/application` | sin salida | sin cambios en dominio ni aplicacion (C7) |

Advertencia de build conocida (chunk principal 1511.77 kB > 500 kB): preexistente,
fuera de alcance de este upgrade.

## Build y ejecucion

`npm run build` genera `dist/` correctamente. La reproduccion visual (C5,
C6 y el checklist de la spec) requiere `npm run dev` y esta pendiente de
revision humana.

## Registro cronologico resumido

| Orden | Accion o herramienta | Resultado observable | Decision humana |
|---:|---|---|---|
| 1 | `cameraTension.ts` + `cameraTension.test.ts` (incremento 1) | 14 pruebas nuevas en verde (C1–C4) | [ ] |
| 2 | `GameScene.ts` campo `tensionZoom`, reset en `create()` y aplicacion en `updateGuard()` (incremento 2) | typecheck en verde; encuadre y HUD a inspeccionar en ejecucion | [ ] |
| 3 | `GameScene.ts` pausa (P), paso manual (N) y reinicio (R) durante PERSEGUIR (incremento 3) | typecheck y prueba enfocada en verde; cubierto por diseno | [ ] |
| 4 | `npm run validate` + `git diff --stat -- src/domain src/application` (incremento 4) | exit 0, 123 pruebas, diff vacio en dominio/aplicacion | [ ] |

## Diff

- Commits o referencia de cambios autorizados: sin commits (pendiente de
  autorizacion humana); cambios sobre `faac4e1`.
- Resumen de archivos modificados:
  - `src/game/presentation/cameraTension.ts` (nuevo)
  - `tests/presentation/cameraTension.test.ts` (nuevo)
  - `src/game/scenes/GameScene.ts` (campo `tensionZoom`, `MAP_CENTER`, reset
    y reaplicacion en `create()`, `applyTensionZoom()` al final de
    `updateGuard()`)
  - `docs/upgrades/05-camara-tension/spec.md` (v2: estado revisado)
  - `docs/upgrades/05-camara-tension/plan.md` (v2: estado aprobado y ejecutado)

## Matriz criterio → evidencia

| Criterio de la spec | Comprobacion | Resultado real |
|---|---|---|
| C1 Zoom objetivo 1.0 fuera de PERSEGUIR y 1.15 exacto en PERSEGUIR | `cameraTension.test.ts` — bloque "zoom target by state" (constantes `ZOOM_BASE`/`ZOOM_PURSUE` y `zoomTargetFor` para los cinco estados) | aprobado |
| C2 Enfoque = centro del mapa con zoom 1.0 y = jugador con zoom 1.15 | `cameraTension.test.ts` — bloque "camera focus" (centro, jugador, intermedio lineal, sin extrapolacion) | aprobado |
| C3 Convergencia sin sobrepaso ni valores fuera de [1.0, 1.15] | `cameraTension.test.ts` — bloque "zoom advance": 300 iteraciones monotonas acotadas hacia 1.15 y alternancia rapida perseguir/no persistir dentro de rango | aprobado |
| C4 Retorno a 1.0 tras salir de PERSEGUIR; `initialZoom` = 1.0 sin residual | `cameraTension.test.ts` — "returns to base after leaving pursuit without residual"; reset en `create()` reaplica `setZoom(ZOOM_BASE)` + `centerOn(MAP_CENTER)` | aprobado (revision visual del reinicio pendiente) |
| C5 HUD estable durante el zoom | El zoom y el enfoque tocan solo `cameras.main`; `hudCamera` (zoom 1) y los `ignore()` de la mejora 04 quedan intactos | aprobado por diseno (revision visual pendiente) |
| C6 Guardia y jugador visibles con zoom 1.15 | Zoom maximo 1.15 centrado en el jugador sobre mapa 960x640 que llena el viewport; bordes solo recortan | aprobado por diseno (revision visual en esquina pendiente) |
| C7 Dominio, maquina de estados y telemetria sin cambios | `git diff --stat -- src/domain src/application` vacio | aprobado |
| C8 `npm run validate` exit 0 | Comando 3 | aprobado (13 archivos / 123 pruebas) |

## Evidencia visual o telemetria

- Pendiente de reproduccion con `npm run dev` (checklist de la spec):
  1. Observar PERSEGUIR → el zoom sube suavemente a 1.15 centrado en el
     jugador, HUD quieto.
  2. Salir de PERSEGUIR → el zoom regresa suavemente a 1.0.
  3. Estar en PATRULLAR → zoom en 1.0, encuadre identico al actual.
  4. Reiniciar (R) en pleno PERSEGUIR → zoom vuelve a 1.0 al instante.
- Pausa (P) en pleno PERSEGUIR: el zoom no avanza ni retrocede; un paso manual
  (N) lo avanza exactamente un frame (cubierto por diseno: `applyTensionZoom`
  solo corre en `updateGuard()`, que se salta en pausa).
- El estallido de la mejora 04 (shake/flash) comparte `cameras.main`: debe
  seguir visible con el zoom activo (verificable en reproduccion).

## Limitaciones

- No validado: C5, C6 y el checklist completo dependen de ejecucion
  interactiva con `npm run dev` y decision humana.
- No validado: el comportamiento de pausa, paso manual y reinicio solo es
  verificable en ejecucion (cubierto por diseno como en la mejora 04).
- Decision declarada: factor de suavizado fijo por frame
  (`ZOOM_SMOOTH_FACTOR = 0.08`, sacado del plan sin valor numerico); el ritmo
  del zoom depende del refresh de la escena, no del tiempo transcurrido.
- Riesgo declarado en el plan: zoom no entero (1.15) con `pixelArt: true`,
  posible suavizado o parpadeo subpixel del dibujo.

## Decision humana

- Fecha: [AAAA-MM-DD].
- Resolucion: [ ] integrar  [ ] corregir  [ ] revertir  [ ] descartar
- Notas: [PENDIENTE]