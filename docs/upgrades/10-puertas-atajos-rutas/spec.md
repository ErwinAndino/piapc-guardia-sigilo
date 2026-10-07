---
id: upgrade-10-puertas-atajos-rutas-spec
titulo: Spec - Puertas, atajos o rutas bloqueables
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 1
---

# Spec — Puertas, atajos o rutas bloqueables

- Upgrade de catalogo: 10.
- Aporte del catalogo: Transformacion del espacio y la estrategia.
- Estado: borrador pendiente de revision humana.

## Problema

El mapa (`LAB_MAP`) es estatico: las paredes nunca cambian y las rutas del guardia y del jugador son siempre las mismas. El jugador no puede transformar el espacio ni cortar ni abrir caminos; su unico efecto sobre el mundo es el sonido (Q) y la cobertura (SHIFT), que no alteran ninguna ruta. El guardia siempre planea contra el mismo grafo, de modo que una persecucion siempre se resuelve con el mismo rodeo y nunca hay una decision espacial que pueda cambiar el resultado.

## Intencion de diseno

Tres celdas ya existentes en las paredes se declaran puertas conmutables: cerradas son pared (bloquean movimiento y vision), abiertas son hueco (ambos pasan). El jugador las alterna con la tecla E estando en la celda o adyacente a ella; solo el jugador opera puertas, nunca el guardia. El mapa efectivo del cuadro (base menos las puertas abiertas) alimenta a la vez la colision del jugador, la oclusion del cono, la cobertura y la planeacion A*, de modo que una puerta abierta es un atajo para ambos y una puerta cerrada es una ruta bloqueada para ambos: abrir o cerrar transforma la estrategia y tiene coste.

Las reglas son funciones puras: `effectiveMap` y `doorInteraction` en `src/domain/model/doors.ts`, `nearestWalkable` en `src/domain/model/grid.ts` y la deteccion de ruta bloqueada en `src/application/simulation/guardSimulation.ts`. `GameScene` solo guarda el estado de puertas, traduce la tecla, conmuta la colision y dibuja. La invalidacion de la ruta se registra en la telemetria existente como una entrada generica `route-invalidated` con `previous === next`, sin estados ni eventos nuevos de la maquina de estados: los filtros de flash (mejora 04) y de impacto de alerta exigen `previous !== next`, por lo que la entrada es visible en el HUD pero no dispara efectos.

Decisiones resueltas con el humano el 2026-10-06: variante de puertas conmutables (cubra puerta + atajo + bloqueo con una sola mecanica); la puerta cerrada bloquea la linea de vision como una pared; solo el jugador opera las puertas.

Decisiones de diseno propuestas por el agente, pendientes de revision humana: tecla E (libre entre las ya usadas); tres puertas en celdas verificadas; el destino dentro de una puerta recien cerrada se desplaza a la celda contigua en vez de fallar; etiquetas de HUD y colores.

## Objetivo

Que el jugador pueda transformar el mapa en el momento para acortar su ruta o cortar la del guardia, y que esa transformacion sea observable en la colision, en la vision, en la ruta dibujada y en la telemetria, sin tocar la maquina de estados.

## Alcance

### Definicion de puertas

- `DOOR_CELLS: readonly GridPoint[]` en `src/application/simulation/labLevel.ts`: `{x:4,y:6}` (muro oeste del area central), `{x:19,y:8}` (muro vertical derecho) y `{x:16,y:15}` (muro sur del pasillo de patrulla). Las tres celdas ya estan en `BLOCKED_AREAS`; ese arreglo y `PATROL_POINTS` no se modifican.
- Todas arrancan cerradas, por lo que el mapa efectivo inicial es identico al `LAB_MAP` actual: ninguna ruta, vision ni prueba existente cambia al iniciar.
- Efecto verificado por busqueda en anchura sobre el mapa actual (celdas cerradas → abiertas): `(4,6)` acorta jugador `(2,2)→(7,8)` de 17 a 11; `(19,8)` acorta guardia `(27,17)→centro (16,8)` de 32 a 20; `(16,15)` acorta igualmente de 32 a 20 conectando el pasillo de patrulla con el centro. El mapa base es una sola componente conectada: cerrar una puerta nunca vuelve inaccesible un destino, solo elimina el atajo.

### Reglas en `src/domain/` (puras, sin Phaser ni DOM)

- `src/domain/model/doors.ts` (archivo nuevo):
  - `effectiveMap(base, doors, openDoors): GridMap` — mapa base con desbloqueadas unicamente las puertas declaradas que estan abiertas. Lanza error observable si `openDoors` contiene una celda no declarada o fuera del mapa.
  - `doorInteraction(doors, openDoors, playerCell, guardCell): DoorInteraction` — devuelve `none`, `open`, `close` u `occupied` con la puerta afectada. Rango: celda del jugador igual o cardinal-adyacente a la puerta. Una puerta abierta solo permite `close` si ni el jugador ni el guardia ocupan la celda; en otro caso `occupied` (el cierre se rechaza, no hay estados parciales).
- `src/domain/model/grid.ts` (adicion): `nearestWalkable(map, cell)` — identidad en celda transitable; en celda bloqueada devuelve el primer vecino cardinal transitable en orden N/E/S/W; sin ningun vecino libre devuelve la celda original (el planificador conserva su fracaso explicito).
- Sin cambios en `guardBehavior.ts`, `memory.ts`, `telemetry.ts`, `perception.ts` ni `search.ts`.

### Coordinacion en `src/application/`

- `guardSimulation.ts`:
  - Invalidacion de ruta: al inicio de `updateGuardSimulation`, antes de mover, si alguna celda de los waypoints aun no consumidos (`indice >= nextWaypoint`) esta bloqueada en `input.map`, se limpian los waypoints y se registra la entrada `route-invalidated` (cause `blocked:<x>,<y>` de la primera celda bloqueada, `previous === next` = estado actual). El guardia no avanza hacia la celda en ese cuadro y el planificador existente reconstruye la ruta evitandola.
  - Destino transitable: `targetCell` se pasa por `nearestWalkable(input.map, targetCell)` antes de planificar, cubriendo la ultima posicion conocida dentro de una puerta recien cerrada.
  - Funcion pura exportada para pruebas: `blockedRouteCell(map, waypoints, tileSize): GridPoint | null`.
- `input.map` sigue siendo el mapa que recibe la simulacion: ahora es el mapa efectivo del cuadro, calculado por `GameScene`.
- `labLevel.ts` solo agrega `DOOR_CELLS`.

### Presentacion y entrada en `src/game/`

- `GameScene.ts`:
  - Estado `openDoors` (vacio en `create`, por lo que R reinicia con todas las puertas cerradas).
  - Tecla E (`doorKey`), ignorada mientras la simulacion esta pausada, igual que Q y el movimiento.
  - Mapa efectivo por cuadro con `effectiveMap(LAB_MAP, DOOR_CELLS, openDoors)`, usado para `updateGuardSimulation`, para `hasAdjacentObstacle` (cobertura de la mejora 06) y para la colision.
  - Las puertas salen del grupo estatico `walls` y tienen su propia colision conmutable que se actualiza en el mismo cuadro del toggle.
  - Dibujo de puertas por codigo, actualizado al alternar.
- `src/game/presentation/doorStyle.ts` (archivo nuevo), funciones puras y constantes con nombre:
  - `doorStyleFor(isOpen)`: cerrada relleno `0x8a5a2b` con trazo `0xd9a05b` (ámbar, distinto del gris de pared `0x27333d`); abierta sin relleno solido y trazo `0x73c991` alfa 0.9 grosor 2 (marco verde = pasable, misma paleta que los marcadores de patrulla).
  - `doorHintFor(interaction)`: etiqueta exhaustiva `""` para `none`, `"E ABRIR"` para `open`, `"E CERRAR"` para `close` y `"OCUPADA"` para `occupied`.
  - `doorsHudLine(openCount, total, hint)`: linea del HUD `puertas N/3 abiertas` con sufijo ` | <hint>` cuando hay hint.
- HUD: una linea nueva debajo de `cobertura`; el resto del HUD no cambia ni escala.

### Pruebas

- Nuevas: `tests/model/doors.test.ts`, `tests/presentation/doorStyle.test.ts`.
- Extendidas: `tests/model/grid.test.ts` (`nearestWalkable`), `tests/application/guardSimulation.test.ts` (invalidacion, clamp y atajo), `tests/perception/perception.test.ts` (vision a traves de puerta cerrada/abierta), `tests/presentation/guardStyle.test.ts` (`route-invalidated` no es transicion).

## Fuera de alcance

- Que el guardia abra, cierre o solicite puertas; cierre automatico o programado; doble interruptor.
- Sonidos, animaciones de bisagra o efectos de puerta (distractores sonoros: mejora 07; efectos de alerta: mejora 04).
- Nuevos estados, eventos o invariantes de la maquina de estados; cambios en la memoria o en el tipo de `TelemetryEntry` (solo se usan entradas genericas ya soportadas).
- Modificar la geometria existente: `BLOCKED_AREAS`, puntos de patrulla o posiciones iniciales.
- Llaves, permisos, puertas con condicion, puertas dobles o mecanismos que no sean conmutador libre.
- Persistencia de puertas entre reinicios (R cierra todas) o entre sesiones.
- Captura del jugador: no existe mecanica de captura en el codigo y no se agrega aqui.
- Captura o bloqueo de la celda por el propio jugador (cerrarse dentro): se rechaza, no se modela atrapamiento.
- Dependencias de otras mejoras: esta mejora debe funcionar con o sin las mejoras 04, 05, 06, 07 y 08, y no modifica sus efectos.
- Recursos externos, dependencias nuevas o cambios de configuracion.

## Restricciones

- `src/domain/` no importa Phaser, DOM ni APIs del navegador.
- `src/application/` coordina; `src/game/` adapta y no decide reglas de comportamiento.
- Las reglas de puerta (mapa efectivo, rango de operacion, ocupacion y destino transitable) se deciden en funciones puras de `src/domain/`; `GameScene` solo traduce la tecla, conmuta colision y dibuja.
- Formas dibujadas por codigo; sin dependencias nuevas.
- Cambios pequenos con revision de diff despues de cada incremento.
- Sin commits, publicacion ni despliegue sin autorizacion humana.

## Caso normal

1. Arranque: las tres puertas cerradas, HUD `puertas 0/3 abiertas`, mapa efectivo identico al actual y patrulla sin cambios.
2. El jugador llega a la celda o a una contigua de `(4,6)`: el HUD muestra `| E ABRIR`. Pulsa E: la puerta queda abierta en el mismo cuadro, su colision cede, el hueco se dibuja en verde y la linea de vision a traves de el deja de estar ocluida.
3. El jugador atraviesa el hueco hacia el area central (11 pasos en vez de 17) y el guardia, de perseguir, ahora planea contra el mapa efectivo: si el atajo le conviene y esta abierto, cruza; si no, sigue el rodeo.
4. Desde el otro lado, el jugador pulsa E junto a la puerta y la cierra tras de si: la colision vuelve en ese cuadro, la telemetria registra `route-invalidated` (visible en el feed del HUD, sin flash ni impacto de alerta), los waypoints cruzados se descartan y la ruta dibujada se recoloca por el rodeo sin que el guardia entre en la celda.
5. Si el guardia vio al jugador dentro de la puerta antes del cierre, su ultima posicion conocida queda en la celda cerrada: el destino se desplaza a la celda contigua transitable, el guardia llega al lado de la puerta y continua la logica de buscar/regresar existente.
6. El jugador abre `(19,8)` o `(16,15)`: el HUD pasa a `puertas 1/3 abiertas` y las rutas guardia ↔ centro y patrulla ↔ centro se acortan de 32 a 20 celdas, observable en el dibujo de ruta.
7. R reinicia la escena con todas las puertas cerradas y el HUD en `0/3`.

## Caso limite

- Pulsar E sin ninguna puerta en rango: no ocurre nada; el HUD muestra solo `puertas N/3 abiertas`.
- Cerrar con el jugador dentro de la celda abierta: rechazado, HUD `| OCUPADA`, sin cambio de colision ni de mapa (no hay estado parcial).
- Cerrar con el guardia dentro de la celda abierta: rechazado con el mismo motivo `OCUPADA`.
- E durante pausa (P): se ignora, igual que Q y el movimiento; con paso (N) la simulacion avanza un cuadro con el mapa sin cambios de puerta.
- El guardia ya cruzo la puerta y el jugador la cierra a sus espaldas: los waypoints restantes no incluyen la celda, no hay invalidacion y el guardia continua su ruta.
- Invalidacion simultanea de varias celdas: se limpia la ruta entera y la causa identifica la primera celda bloqueada; una sola entrada por cuadro.
- Tras la invalidacion no existe ruta alternativa: entra el mecanismo existente `navigation:invalid-goal`/`unreachable` con `patrol-recovery` en patrulla (no debe ocurrir con el mapa base conexo, se conserva como red de seguridad).
- El jugador visto en la puerta, sale y cierra: como en el caso normal 5; la memoria no se altera, solo el destino de navegacion.
- Con la mejora 06: la adyacencia de cobertura se evalua sobre el mapa efectivo, una puerta abierta no cuenta como obstaculo y la cerrada si.
- Con las mejoras 04 y 05: `route-invalidated` tiene `previous === next`, por lo que no dispara flash, particulas ni zoom; si aparece en las ultimas lineas del HUD.
- Con las mejoras 07 y 08: sin interaccion; las puertas no emiten sonido ni alteran el medidor.
- Pausa activa con puerta abierta: nada avanza al reanudar; el mapa efectivo se recalcula desde el estado guardado.
- Teclas Q, SPACE, P, N y SHIFT conservan su comportamiento actual; E no colisiona con ninguna.

## Criterios de aceptacion

| N. | Criterio verificable | Prueba prevista |
|---|---|---|
| C1 | `effectiveMap(LAB_MAP, DOOR_CELLS, [])` devuelve exactamente el mismo conjunto bloqueado que `LAB_MAP`: el arranque no cambia ninguna ruta, vision ni comportamiento | Test unitario en `tests/model/doors.test.ts` + suite existente sin modificaciones |
| C2 | `effectiveMap` desbloquea solo las puertas declaradas que estan abiertas y lanza error observable ante una celda abierta no declarada o fuera del mapa | Test unitario en `tests/model/doors.test.ts` |
| C3 | `doorInteraction` devuelve `none` sin puerta en rango, `open` con el jugador en celda contigua a una cerrada, `close` con una abierta y libre, y `occupied` (cierre rechazado) si el jugador o el guardia ocupa la celda abierta | Test unitario en `tests/model/doors.test.ts` |
| C4 | `nearestWalkable` es identidad en celda transitable, devuelve el primer vecino cardinal transitable en orden N/E/S/W en celda bloqueada y la celda original si no hay vecino libre | Test unitario en `tests/model/grid.test.ts` |
| C5 | Con la puerta cerrada entre guardia y jugador la oclusion devuelve `occluded`; abierta y con rango y cono cumplidos devuelve `visible` | Test unitario en `tests/perception/perception.test.ts` con mapa efectivo |
| C6 | Si al empezar el cuadro una celda de los waypoints no consumidos esta bloqueada, los waypoints se limpian en ese mismo cuadro, el guardia no avanza hacia la celda, se registra `route-invalidated` con `previous === next` y la ruta reconstruida no contiene la celda | Test unitario en `tests/application/guardSimulation.test.ts` |
| C7 | Una ultima posicion conocida dentro de una puerta recien cerrada produce un destino en la celda transitable contigua: el plan tiene exito, no incluye la celda cerrada y no se agregan estados ni eventos nuevos a la maquina de estados | Test unitario en `tests/application/guardSimulation.test.ts` |
| C8 | Con la puerta abierta en el atajo y siendo este el camino mas corto, la ruta planificada del guardia incluye la celda de la puerta | Test unitario en `tests/application/guardSimulation.test.ts` |
| C9 | El jugador atraviesa la puerta abierta y no puede cruzar la cerrada; el cierre recupera la colision en el mismo cuadro | Checklist manual de reproduccion + revision de codigo en `GameScene.ts` |
| C10 | `doorStyleFor` distingue abierta y cerrada con los valores fijados, `doorHintFor` cubre los 4 motivos con etiqueta exhaustiva (`Record`/`switch` tipado sin `undefined`) y `doorsHudLine` compone `puertas N/3 abiertas` con el sufijo | Test unitario en `tests/presentation/doorStyle.test.ts` + `npm run typecheck` |
| C11 | Una entrada `route-invalidated` no produce flash ni impacto de alerta (`latestStateTransition` y el filtro de alerta exigen `previous !== next`), pero si aparece en el feed de transiciones del HUD | Test unitario en `tests/presentation/guardStyle.test.ts` + checklist manual |
| C12 | Sin dependencias nuevas; `src/domain/` sigue sin importar Phaser ni DOM; `guardBehavior.ts`, `memory.ts`, `telemetry.ts`, `perception.ts` y `search.ts` sin cambios; `BLOCKED_AREAS` y `PATROL_POINTS` intactos (solo se anade `DOOR_CELLS`) | Revision de diff |
| C13 | `npm run validate` finaliza correctamente | `npm run validate` |

## Evidencia prevista

- Comandos: `npm run validate` y las pruebas enfocadas nuevas o extendidas:
  - `npx vitest run tests/model/doors.test.ts tests/model/grid.test.ts`
  - `npx vitest run tests/application/guardSimulation.test.ts`
  - `npx vitest run tests/perception/perception.test.ts`
  - `npx vitest run tests/presentation/doorStyle.test.ts tests/presentation/guardStyle.test.ts`
- Reproduccion visual o telemetria: checklist manual en `evidencia.md`:
  1. Arrancar → mapa identico al actual, HUD `puertas 0/3 abiertas`, patrulla sin cambios.
  2. Acercarse a `(4,6)` → `| E ABRIR`; pulsar E → hueco verde, atravesarlo sin colision y ver la vision a traves del hueco (`VISIBLE` en vez de `OCLUIDO`).
  3. Cerrar desde el otro lado con el guardia persiguiendo → entrada `route-invalidated` en el HUD, ruta recolocada por el rodeo y guardia que no cruza la celda.
  4. Abrir `(19,8)` → la persecucion hacia el centro usa el atajo (ruta de 20 en vez de 32 celdas).
  5. Pulsar E con el guardia dentro de la puerta → `| OCUPADA`, nada cambia.
  6. Pausa (P) y E → no alterna; R → todas las puertas cerradas y HUD en `0/3`.
