---
id: upgrade-01-patrulla-pausas-mirada-spec
titulo: Spec - Patrulla con pausas y mirada direccional
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 2
---

# Spec — Patrulla con pausas y mirada direccional

- Upgrade de catalogo: 01.
- Aporte del catalogo: Anticipacion visual y ritmo del recorrido.
- Estado: redactada; pendiente de revision humana y cierre de evidencia.
- Nota de trazabilidad: el comportamiento existe desde el baseline
  `f80466c` (H4) y no tiene commits propios de laboratorio. Este documento lo
  adopta retroactivamente como upgrade; toda la evidencia se apoya en pruebas
  existentes y en reproduccion visual, sin codigo nuevo.

## Problema

Si el guardia cruzara cada punto de patrulla sin detenerse, el jugador no
podria anticipar su recorrido ni aprovechar una ventana para moverse: el
ritmo del patrol seria imprevisible y la mirada no comunicaria hacia donde
presta atencion el guardia.

## Intencion de diseno

Producir anticipacion visual: al llegar a un punto de patrulla el guardia se
detiene, gira la mirada en las cuatro direcciones cardinales y recien entonces
continua hacia el siguiente punto, de modo que el jugador pueda leer el ritmo
del recorrido y planificar su movimiento.

## Objetivo

Que la pausa direccional en cada waypoint sea observable (fase, orientacion
del cono y telemetría) y este cubierta por pruebas verificables, manteniendo
el dominio independiente del motor.

## Alcance

- Fase `looking` de la patrulla en `src/domain/behavior/guardBehavior.ts`.
- Direccion de la mirada por `LOOK_DIRECTIONS[lookStep]` en
  `src/application/simulation/guardSimulation.ts`.
- Representacion en pantalla: rotacion del cono y rotulo "MIRANDO" en
  `src/game/scenes/GameScene.ts`.
- Pruebas: `tests/behavior/guardBehavior.test.ts`.

## Fuera de alcance

- Duraciones, cantidad de direcciones o reglas de percepcion (ya definidas
  en el baseline: 500 ms por direccion, 4 direcciones).
- Estados investigar/perseguir/buscar/regresar.
- Estilo visual del cono (upgrade 02), camara, HUD general ni audio.

## Restricciones

- `src/domain/` sin Phaser, DOM ni APIs de navegador; `src/game/` adapta.
- Formas dibujadas por codigo; sin dependencias nuevas.
- Sin commits, publicacion ni despliegue sin autorizacion humana.

## Caso normal

Al alcanzar el waypoint con la fase `navigating`, el comportamiento pasa a
`looking` (pausa). Cada `lookMsPerDirection` avanza `lookStep` y `facing`
adopta la direccion cardinal correspondiente, por lo que el cono gira. Al
completar las cuatro direcciones se emite la transicion `patrol-waypoint`
(`cause: look-complete`), `patrolIndex` avanza y el guardia reanuda la
navegacion.

## Caso limite

- Interrupcion: si durante la pausa el jugador es visible, la vision tiene
  prioridad y el guardia pasa a `pursuing` sin completar las cuatro miradas.
- El `lookStep` se limita al maximo de `LOOK_DIRECTION_COUNT - 1` aunque
  transcurra tiempo extra (sin desborde).
- Destino de patrulla inaccesible: recupera avanzando el ciclo
  (`patrol-recovery`), sin quedar bloqueado en pausa.

## Criterios de aceptacion

| N. | Criterio verificable | Prueba prevista |
|---|---|---|
| C1 | Al llegar a un punto de patrulla entra en fase `looking` (pausa) | `tests/behavior/guardBehavior.test.ts` — "begins the four-direction look when arriving at a patrol point" |
| C2 | La mirada recorre exactamente cuatro direcciones y avanza en el tiempo | mismos tests — "counts exactly four look directions", "advances the look step over time and then continues the cycle" |
| C3 | Al completar las cuatro miradas avanza al siguiente waypoint con telemetría `patrol-waypoint` | test de ciclo de patrulla + `latestTransitions` en HUD |
| C4 | Una vision valida interrumpe la pausa | test — "interrupts the look when a valid vision perception arrives" |
| C5 | La orientacion observable (`facing`) cambia con `lookStep` durante la pausa | inspeccion de `guardSimulation.ts:240` + reproduccion visual (C7) |
| C6 | Build y suite completa pasan | `npm run validate` → exit 0 |
| C7 | La pausa y el giro de la mirada se ven en pantalla | reproduccion visual: `npm run dev`, observar detencion y giro en cada waypoint |

## Evidencia prevista

- Comandos: `npm run test:run -- tests/behavior/guardBehavior.test.ts` y `npm run validate`.
- Reproduccion visual: `npm run dev` (pausa + giro del cono en waypoints; HUD "MIRANDO").
- Diferencias: `git show f80466c` sobre los archivos de alcance.
