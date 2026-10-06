---
id: upgrade-04-alerta-visual-extrema-evidencia
titulo: Evidencia - Impacto visual extremo de alerta
tipo: evidencia
audiencia: estudiante
acceso: publico
version: 1
---

# Evidencia — Impacto visual extremo de alerta

## Version

- Inicial: sin commits propios; cambios sobre `be7bc07` en el arbol de trabajo
  (rama `Laboratorio-de-intervencion-agentica-completa`).
- Final: pendiente de autorizacion humana para commit.
- Entorno: node v24.16.0, npm 12.0.2, Windows.

## Comandos y resultados

| Orden | Comando | Resultado | Salida relevante |
|---:|---|---|---|
| 1 | `npx vitest run tests/presentation/alertImpact.test.ts` | exit 0 | 1 archivo / 22 pruebas (C1–C4) |
| 2 | `npm run typecheck` | exit 0 | `tsc --noEmit` sin errores |
| 3 | `npm run validate` | exit 0 | typecheck + 12 archivos / 109 pruebas + build `dist/` |
| 4 | `git diff --stat -- src/domain src/application` | sin salida | sin cambios en dominio ni aplicacion (C6) |

Advertencia de build conocida (chunk principal 1510.89 kB > 500 kB): preexistente,
fuera de alcance de este upgrade.

## Build y ejecucion

`npm run build` genera `dist/` correctamente. La reproduccion visual (C4,
C5 y el checklist de la spec) requiere `npm run dev` y esta pendiente de
revision humana.

## Registro cronologico resumido

| Orden | Accion o herramienta | Resultado observable | Decision humana |
|---:|---|---|---|
| 1 | `alertImpact.ts` + `alertImpact.test.ts` (incremento 1) | 22 pruebas nuevas en verde | [ ] |
| 2 | `GameScene.ts` camara propia del HUD (incremento 2) | typecheck en verde; HUD a inspeccionar en ejecucion | [ ] |
| 3 | `GameScene.ts` disparo, shake, flash, particulas y anillo ampliado (incremento 3) | typecheck y prueba enfocada en verde | [ ] |
| 4 | `GameScene.ts` pausa y reinicio (incremento 4) | typecheck y prueba enfocada en verde | [ ] |
| 5 | `npm run validate` + `git diff --stat -- src/domain src/application` (incremento 5) | exit 0, 109 pruebas, diff vacio en dominio/aplicacion | [ ] |

## Diff

- Commits o referencia de cambios autorizados: sin commits (pendiente de
  autorizacion humana); cambios sobre `be7bc07`.
- Resumen de archivos modificados:
  - `docs/upgrades/04-alerta-visual-extrema/spec.md` (v2)
  - `docs/upgrades/04-alerta-visual-extrema/plan.md` (v2)
  - `src/game/presentation/alertImpact.ts` (nuevo)
  - `tests/presentation/alertImpact.test.ts` (nuevo)
  - `src/game/scenes/GameScene.ts` (camara del HUD, disparo, shake, flash,
    particulas, anillo ampliado, pausa y reinicio)

## Matriz criterio → evidencia

| Criterio de la spec | Comprobacion | Resultado real |
|---|---|---|
| C1 Solo la transicion a `pursuing` dispara el estallido | `alertImpact.test.ts` — "fires only for transitions into pursuing", "counts a pursuit recorded before another event in the same frame" | aprobado |
| C2 Enfriamiento de 1500 ms | `alertImpact.test.ts` — bloque "alert impact cooldown" (bloqueo, repermiso, sin redisparo diferido, constante 1500) | aprobado |
| C3 Duraciones exactas y progresos de 1 a 0 | `alertImpact.test.ts` — "alert impact durations" (400/250/500/600) y bloque "impact progress" (clamp sin rebasar, monotonico) | aprobado |
| C4 Anillo ampliado 11→64 con alfa 1.0 y anillo base intacto | `alertImpact.test.ts` — bloque "impact ring style"; anillo base sin tocar (`flashProgress` y constantes de `GameScene` inalteradas) | aprobado (revision visual pendiente) |
| C5 HUD estable durante el estallido | Camara propia del HUD: shake y flash solo sobre `cameras.main`; textos excluidos de principal e ignorados por `hudCamera` | aprobado por diseno (revision visual pendiente) |
| C6 Dominio, maquina de estados y telemetria sin cambios | `git diff --stat -- src/domain src/application` vacio | aprobado |
| C7 `npm run validate` exit 0 | Comando 3 | aprobado (12 archivos / 109 pruebas) |

## Evidencia visual o telemetria

- Pendiente de reproduccion con `npm run dev` (checklist de la spec):
  1. Transicion a PERSEGUIR → shake + flash rojo (250 ms) + particulas
     (500 ms) + anillo ampliado (600 ms, 11→64, alfa 1.0) visibles, HUD quieto.
  2. Transicion a INVESTIGAR → solo anillo base de 400 ms, sin shake ni flash.
  3. Perder y recuperar al jugador en menos de 1500 ms → sin segundo estallido.
  4. Reiniciar (R) en pleno estallido → escena limpia, sin shake residual.
- Pausa (P) en pleno estallido: anillo, particulas, shake y flash se congelan;
  al reanudar continuan con el tiempo restante.
- Sin cambios de telemetria: el estallido se decide leyendo `TransitionLog`
  existente; no se anade, altera ni omite ninguna entrada.

## Limitaciones

- No validado: C4 (visual del anillo), C5 y el checklist completo dependen de
  ejecucion interactiva con `npm run dev` y decision humana.
- No validado: comportamiento de pausa y reinicio solo es verificable en
  ejecucion (fue cubierto por diseno con `shakeEffect.reset()`,
  `flashEffect.reset()`, `emitter.pause()/resume()` y reintroduccion en
  `create()`).

## Decision humana

- Fecha: [AAAA-MM-DD].
- Resolucion: [ ] integrar  [ ] corregir  [ ] revertir  [ ] descartar
- Notas: [PENDIENTE]