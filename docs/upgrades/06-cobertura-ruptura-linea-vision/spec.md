---
id: upgrade-06-cobertura-ruptura-linea-vision-spec
titulo: Spec - Cobertura y ruptura de linea de vision
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 1
---

# Spec — Cobertura y ruptura de linea de vision

- Upgrade de catalogo: 06.
- Aporte del catalogo: Decision activa de sigilo.
- Estado: borrador pendiente de revision humana.

## Problema

Las paredes ya bloquean la linea de vision, pero el jugador no decide nada: la unica forma de no ser vista es que el mapa lo haga por el. No existe ninguna accion de sigilo que elegir, ni feedback que diga si la linea entre el guardia y el jugador esta libre o rota. El HUD informa el motivo de la vision (`OCLUIDO`, `FUERA DEL CONO`, etc.) pero no dice si el jugador esta cubierto ni si puede cubrirse, y "romper la linea de vision" no se ve: solo se deduce del cono.

## Intencion de diseno

La cobertura es una accion activa con costo: el jugador mantiene SHIFT y, solo si su celda linda con un obstaculo, queda cubierto. Mientras lo este, la percepcion del guardia devuelve el motivo nuevo `covered` y no detecta al jugador (no persigue ni actualiza memoria), y el jugador se mueve a la mitad de velocidad. Elegir cobertura es una decision con trade-off, no una invisibilidad gratuita. La regla vive en el dominio (`evaluateVision` y `hasAdjacentObstacle`); la aplicacion solo transporta el flag `playerCovered` y `GameScene` solo traduce la tecla, aplica la velocidad y dibuja. Para que la ruptura sea observable, un rayo guardia → jugador se dibuja por codigo con un estilo por motivo de vision: continuo cuando hay linea, segmentado y tenue cuando esta rota. Todas las reglas nuevas son funciones puras y testeables.

Decisiones resueltas con el humano el 2026-10-06: mecanica por tecla de cobertura; efecto de bloqueo de deteccion (motivo `covered`); requisito de adyacencia a obstaculo mas penalidad de velocidad; rayo con estado como feedback de ruptura.

## Objetivo

Que el jugador pueda decidir activamente cubrirse y comprobar de forma observable cuando su linea de vision con el guardia esta libre o rota, sin modificar la maquina de estados, la telemetria ni el mapa.

## Alcance

- Tecla de cobertura: mantener SHIFT (tecla con nombre constante), coherente con las teclas ya usadas (flechas/WASD, R, SPACE, Q, P, N).
- Requisito de posicion: funcion pura `hasAdjacentObstacle(map, cell)` en `src/domain/model/grid.ts`, verdadera si al menos uno de los 4 vecinos cardinales no es transitable (una celda fuera del mapa cuenta como obstaculo).
- Motivo nuevo `covered` en `VisionReason`; `evaluateVision` lo evalua despues de rango, cono y oclusion, de modo que solo aparece cuando sin cobertura el jugador seria visible. La cobertura no enmascara otras causas.
- Campo opcional `covered` en `VisionQuery` con default `false`, para no romper las construcciones existentes de consulta.
- Transporte del estado: `playerCovered?: boolean` en `PerceptionFrameInput` (`src/application/simulation/perceptionSimulation.ts`) y en `GuardSimulationInput` (`src/application/simulation/guardSimulation.ts`), ambos con default `false`.
- Costo de velocidad: constante `COVER_SPEED_FACTOR = 0.5` y funcion `playerSpeedFor(covered, baseSpeed)` en `src/game/presentation/coverStyle.ts`; `GameScene` la aplica al jugador (190 con cobertura inactiva, 95 con cobertura activa).
- Estado observable en HUD: `cobertura -` (sin obstaculo adyacente), `cobertura DISPONIBLE` (adyacente, tecla sin mantener) y `cobertura ACTIVA`; etiqueta `CUBIERTO` para el motivo `covered` en `VISION_LABELS`.
- Rayo con estado: funcion pura `sightLineStyleFor(reason)` en `src/game/presentation/sightLine.ts` y su dibujo en `src/game/scenes/GameScene.ts`, sobre el cono y por debajo del guardia, del jugador y de los marcadores:
  - `visible`: continuo, verde `0x73c991`, alfa 0.9, grosor 2.
  - `covered`: segmentado, amarillo `0xe5b454`, alfa 0.8, grosor 2.
  - `occluded`, `outside-cone`, `out-of-range`, `invalid-facing`: segmentado, gris `0x8a97a3`, alfa 0.45, grosor 1.
- Pruebas nuevas o extendidas: `tests/model/grid.test.ts`, `tests/perception/perception.test.ts`, `tests/application/guardSimulation.test.ts`, `tests/presentation/coverStyle.test.ts` (nueva), `tests/presentation/sightLine.test.ts` (nueva).

## Fuera de alcance

- Sonido: la cobertura no altera el radio, la duracion ni la emision del evento de la tecla Q.
- Cambios en el mapa (`src/application/simulation/labLevel.ts`) ni celdas de cobertura marcadas: la cobertura se deriva de las paredes existentes.
- Maquina de estados (`src/domain/behavior/guardBehavior.ts`), memoria (`src/domain/perception/memory.ts`) y telemetria: ningun evento ni transicion nueva.
- Captura del jugador: no existe mecanica de captura en el codigo y no se agrega aqui.
- Dependencias de otras mejoras: medidor de alerta (08), distractores sonoros (07), camara (05) y estallido visual (04). Esta mejora debe funcionar con o sin ellas y no modifica sus efectos.
- Recursos externos, dependencias nuevas, audio, animaciones de agacharse o sprites.
- Cobertura automatica (sin tecla) o estado de cobertura persistente entre cuadros.
- Pantalla de ayuda o tutorial de la tecla nueva.

## Restricciones

- `src/domain/` no importa Phaser, DOM ni APIs del navegador.
- `src/application/` coordina; `src/game/` adapta y no decide reglas.
- La regla de cobertura (adyacencia al obstaculo y bloqueo de la vision) se decide en `src/domain/`; `GameScene` solo traduce la tecla, aplica la velocidad y dibuja.
- Formas dibujadas por codigo; sin dependencias nuevas.
- Cambios pequenos con revision de diff despues de cada incremento.
- Sin commits, publicacion ni despliegue sin autorizacion humana.

## Caso normal

1. El jugador se mueve sin cobertura: velocidad normal, HUD `cobertura -`, rayo con el motivo real de la vision.
2. El jugador llega a una celda lindante con una pared: el HUD pasa a `cobertura DISPONIBLE`; la vision y la velocidad no cambian todavia.
3. El jugador mantiene SHIFT: la cobertura se activa en ese mismo cuadro. Si el guardia tenia linea despejada, la vision pasa de `visible`/`VISIBLE` a `covered`/`CUBIERTO`, la memoria del guardia deja de actualizarse y no hay transicion a perseguir; el jugador avanza a la mitad de velocidad (190 → 95).
4. El guardia sigue patrullando con su cono dibujado; el rayo queda segmentado y amarillo mientras dure la cobertura.
5. El jugador suelta SHIFT o sale de la celda con obstaculo: la cobertura se retira en el mismo cuadro, la velocidad vuelve a 190 y la vision se reevalua; si hay linea despejada el guardia ve al jugador y transiciona a perseguir (con el feedback de las mejoras 04 y 05 si estan implementadas).

## Caso limite

- SHIFT sostenido sin obstaculo adyacente: no hay cobertura; velocidad normal, HUD `DISPONIBLE`, vision sin cambios.
- Cubrirse detras de una pared: el motivo sigue siendo `occluded`; la cobertura no enmascara la causa que ya bloqueaba la vision.
- Cubrirse fuera de rango o fuera del cono: el motivo sigue siendo `out-of-range` o `outside-cone`.
- Cubrirse durante PERSEGUIR: la vision pasa a `covered`; con la tolerancia existente de 250 ms el guardia pierde al jugador y entra a BUSCAR. No se modifica la tolerancia ni la maquina de estados.
- Soltar la tecla estando a la vista: el guardia pasa a perseguir en el siguiente cuadro, sin gracia ni retardo nuevo.
- Reinicio (R) con SHIFT presionado: el estado de cobertura se deriva del teclado actual; nada queda residual en el dominio ni en la telemetria.
- Pausa (P): nada avanza; al reanudar la cobertura se recalcula desde el teclado y la posicion actuales.
- Tecla Q (sonido) con cobertura activa: el evento sonoro se emite igual y el guardia puede investigar; la cobertura solo afecta la vision.
- Esquinas de pared: manda el criterio conservador de oclusion ya existente; la cobertura no lo altera.
- Con la mejora 05 activa: el rayo escala con el zoom de la camara principal y el HUD permanece estable en `hudCamera`.
- Con la mejora 04 activa: el shake y el flash solo mueven el rayo en la medida en que se mueve la camara; no agregan estados propios.

## Criterios de aceptacion

| N. | Criterio verificable | Prueba prevista |
|---|---|---|
| C1 | Con linea despejada y `covered: true`, `evaluateVision` devuelve `visible: false` y motivo `covered`; sin cobertura devuelve `visible: true` | Test unitario en `tests/perception/perception.test.ts` |
| C2 | La cobertura no enmascara otras causas: con `covered: true`, detras de pared el motivo es `occluded`, fuera de rango `out-of-range` y fuera de cono `outside-cone` | Test unitario en `tests/perception/perception.test.ts` |
| C3 | `hasAdjacentObstacle` es verdadera solo con al menos un vecino cardinal no transitable (o fuera del mapa) y falsa en una celda interior sin obstaculo adyacente | Test unitario en `tests/model/grid.test.ts` |
| C4 | `updateGuardSimulation` con `playerCovered: true` no actualiza la memoria ni registra ninguna transicion a `pursuing`; sin cobertura y con linea despejada, persigue | Test unitario en `tests/application/guardSimulation.test.ts` |
| C5 | `playerSpeedFor` aplica factor 0.5 exacto con cobertura (190 → 95) y 1.0 sin ella | Test unitario en `tests/presentation/coverStyle.test.ts` |
| C6 | `coverLabel` distingue `-`, `DISPONIBLE` y `ACTIVA`, y `VISION_LABELS` tiene etiqueta para `covered` (tipado exhaustivo por `Record<VisionReason, string>`) | Test unitario en `tests/presentation/coverStyle.test.ts` + `npm run typecheck` |
| C7 | `sightLineStyleFor` devuelve estilo definido para los 6 motivos: continuo y verde solo en `visible`; segmentado y tenue en el resto, con colores y alfas dentro de sus rangos | Test unitario en `tests/presentation/sightLine.test.ts` |
| C8 | El HUD muestra la linea de cobertura y `CUBIERTO` sin escalar ni desplazarse con el zoom, y el rayo se ve sobre el cono sin tapar al guardia ni al jugador | Checklist manual de reproduccion |
| C9 | `src/domain/` sigue sin importar Phaser ni DOM; `guardBehavior.ts`, `memory.ts`, `telemetry.ts` y `labLevel.ts` sin cambios; sin dependencias nuevas | Revision de diff |
| C10 | `npm run validate` finaliza correctamente | `npm run validate` |

## Evidencia prevista

- Comandos: `npm run validate` y las pruebas enfocadas nuevas o extendidas:
  - `npx vitest run tests/perception/perception.test.ts tests/model/grid.test.ts`
  - `npx vitest run tests/application/guardSimulation.test.ts`
  - `npx vitest run tests/presentation/coverStyle.test.ts tests/presentation/sightLine.test.ts`
- Reproduccion visual o telemetria: checklist manual en `evidencia.md`:
  1. Pararse junto a una pared → HUD `cobertura DISPONIBLE`, sin ningun otro cambio.
  2. Mantener SHIFT con linea despejada → HUD `cobertura ACTIVA`, vision `CUBIERTO`, rayo segmentado amarillo, velocidad a la mitad y el guardia no pasa a perseguir.
  3. Soltar SHIFT estando a la vista → vision `VISIBLE`, rayo continuo verde y el guardia pasa a perseguir.
  4. Cubrirse detras de una pared → vision `OCLUIDO` (no `CUBIERTO`) y rayo gris segmentado.
  5. Reiniciar con SHIFT presionado → escena limpia, HUD estable y sin residuos de cobertura.
