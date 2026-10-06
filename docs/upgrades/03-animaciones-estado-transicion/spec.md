---
id: upgrade-03-animaciones-estado-transicion-spec
titulo: Spec - Animaciones por estado y transicion
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 2
---

# Spec — Animaciones por estado y transicion

- Upgrade de catalogo: 03.
- Aporte del catalogo: Representacion coherente de la conducta.
- Estado: revisada y aprobada por el humano el 2026-10-06.

## Problema

El guardia se dibuja como un circulo azul fijo
(`src/game/scenes/GameScene.ts`, creacion del `Arc` de radio 11). El estado
de conducta solo se refleja en el cono de vision y en el HUD de texto: el
cuerpo del guardia no cambia nunca, y no hay ninguna marca visual del
instante en que ocurre una transicion. Quien observa la escena debe leer el
texto para saber que conducta se ejecuta y cuando cambio.

## Intencion de diseno

Que la representacion del guardia sea una funcion derivada del estado y del
registro de transiciones, calculada por funciones puras en la capa de
presentacion y dibujada por la escena. La animacion no decide comportamiento:
traduce informacion que el dominio ya produce.

## Objetivo

Añadir dos feedbacks visuales al cuerpo del guardia, sin tocar dominio ni
aplicacion:

1. Color de cuerpo por estado (tres niveles de amenaza, misma paleta que el
   cono de vision).
2. Destello transitorio (anillo expansivo) en el instante de cada transicion
   real de estado.

## Alcance

- Modulo puro `src/game/presentation/guardStyle.ts`:
  - `guardBodyStyleFor(state)` — mapa de los 5 estados a estilo de cuerpo
    (`fill`, `stroke`).
  - `latestStateTransition(log)` — ultima transicion real del registro de
    telemetria, o `null`.
  - `flashProgress(elapsedMs, durationMs)` — progreso 0..1 del destello.
- Aplicacion del estilo de cuerpo y dibujo del anillo en
  `src/game/scenes/GameScene.ts` (Graphics propio, sin tweens de Phaser).
- Pruebas unitarias en `tests/presentation/guardStyle.test.ts`.

## Fuera de alcance

- Sprites, atlas, texturas o animaciones frame-a-frame.
- Tweens de Phaser; el progreso se calcula con funciones puras.
- Cambios en `src/domain/` o `src/application/`.
- El cono de vision, el HUD, la camara, la interfaz o la geometria del
  guardia (radio 11 se mantiene).
- Sonido, dependencias nuevas o recursos externos.

## Restricciones

- `src/domain/` no importa Phaser, DOM ni APIs del navegador.
- `src/application/` coordina; `src/game/` adapta y no decide reglas.
- Formas dibujadas por codigo; sin dependencias nuevas.
- Cambios pequenos con revision de diff despues de cada incremento.
- Sin commits, publicacion ni despliegue sin autorizacion humana.

## Caso normal

El cuerpo del guardia se dibuja cada frame con el color que corresponde a su
estado actual. Al transitar patrulla → investigacion → persecucion el color
avanza azul → amarillo → rojo; al volver a patrulla recupera el azul. Cada
vez que la telemetria registra una transicion real, aparece un anillo que
crece desde el cuerpo del guardia y se desvanece en 400 ms.

## Caso limite

- Los 5 estados de `GuardStateName` tienen estilo de cuerpo definido (sin
  `undefined` ni excepcion al dibujar).
- La telemetria contiene entradas que no son transiciones de estado:
  `reset` inicial (`previous === null`) y `navigation-unreachable`
  (`previous === next`). Ninguna de ellas dispara el destello.
- Transiciones encadenadas en menos de 400 ms: la ultima gana; el destello se
  reinicia.
- Escena en pausa (`P`): la simulacion y el reloj del destello se congelan;
  al reanudar el destello continua desde donde estaba.
- Reinicio (`R`): el destello y el reloj se limpian junto con la escena.

## Criterios de aceptacion

| N. | Criterio verificable | Prueba prevista |
|---|---|---|
| C1 | Cada estado del guardia tiene un estilo de cuerpo definido | `tests/presentation/guardStyle.test.ts` — cobertura de los 5 estados |
| C2 | Los tres niveles de amenaza tienen estilo de cuerpo distinto | prueba de distincion entre niveles |
| C3 | `latestStateTransition` ignora `reset` y `navigation-unreachable` | prueba con registro mixto y registro vacio |
| C4 | `flashProgress` devuelve 0..1 acotado y monotonico, y valida su entrada | prueba de rangos, monotonia y error con entrada invalida |
| C5 | Tras una persecucion, el estilo de patrulla se restaura identico | prueba de restauracion |
| C6 | El typecheck, la suite y el build pasan | `npm run validate` → exit 0 |
| C7 | En pantalla el cuerpo cambia de color y el anillo aparece al transicionar | reproduccion visual: `npm run dev`, perseguir al jugador y observar color y destello |

## Evidencia prevista

- Comandos: `npx vitest run tests/presentation/guardStyle.test.ts` (prueba
  enfocada) y `npm run validate`.
- Reproduccion visual: `npm run dev` y transicion patrulla → persecucion →
  patrulla observando color del cuerpo y anillo.
- Diff de los archivos de alcance y registro en `evidencia.md`.
