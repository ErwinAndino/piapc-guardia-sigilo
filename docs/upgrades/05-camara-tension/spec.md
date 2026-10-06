---
id: upgrade-05-camara-tension-spec
titulo: Spec - Camara dinamica de tension
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 2
---

# Spec — Camara dinamica de tension

- Upgrade de catalogo: 05.
- Aporte del catalogo: Encuadre util durante un momento de riesgo.
- Estado: revisada y aprobada el 2026-10-06.

## Problema

La camara es fija y siempre muestra el mapa completo (960x640) con la misma prioridad visual, tanto cuando el guardia patrulla en calma como cuando persigue al jugador. El encuadre no refleja el nivel de tension ni ayuda a enfocar el momento de riesgo.

## Intencion de diseno

Un zoom suave y sostenido, centrado en el jugador, que sube de 1.0 a 1.15 mientras el estado es PERSEGUIR y regresa con la misma suavidad al salir. Es un encuadre complementario: no desplaza el mapa, no supera un limite que mantenga al guardia y al jugador a la vista, y deja el HUD fuera del zoom para conservar la legibilidad. El valor objetivo por estado y el avance por frame son funciones puras, testeables; `GameScene` solo aplica el resultado a la camara.

## Objetivo

Que el encuadre comunique de forma continua y no invasiva que la escena esta en su momento de maximo peligro, sin perder informacion observable.

## Alcance

- Zoom objetivo por estado: 1.0 en todos los estados excepto PERSEGUIR, donde vale 1.15 (constante `ZOOM_PURSUE`).
- Centro del zoom: la posicion del jugador.
- Avance suave sin sobrepaso: el zoom actual converge hacia el objetivo mediante un factor por frame acotado, nunca rebasa el objetivo ni oscila.
- Entrada y salida gradual: al entrar o salir de PERSEGUIR el zoom transiciona; no hay saltos.
- El HUD (texto de estado, vision, sonido, memoria y transiciones) queda fuera del zoom y se mantiene estable.
- Constantes de zoom y suavizado exportadas y con nombre.
- Funciones puras en `src/game/presentation/` para el zoom objetivo, el punto de enfoque y el avance por frame.
- Aplicacion del zoom y del centro en `src/game/scenes/GameScene.ts`.

## Fuera de alcance

- Shake de camara, flash de pantalla, particulas y anillos (mejora 04).
- Medidor o niveles de alerta (mejora 08).
- Desplazamiento de camara (follow) o cambio del tamano del mapa: el mapa completo debe seguir siendo visible dentro del zoom.
- Zoom superior a 1.15, efectos de viñeta, filtros o interpolacion de color.
- Captura del jugador: no existe mecanica de captura en el codigo y no se agrega aqui.
- Cambios en `src/domain/`, `src/application/`, la maquina de estados o la telemetria.
- Depender de la mejora 04: esta mejora debe funcionar con o sin la 04 implementada.

## Restricciones

- `src/domain/` no importa Phaser, DOM ni APIs del navegador.
- `src/application/` coordina; `src/game/` adapta y no decide reglas de comportamiento.
- El valor de zoom es derivado del estado ya calculado por el dominio: `src/game/` no decide que hay tension, solo la representa.
- Formas dibujadas por codigo; sin dependencias nuevas.
- Cambios pequanos con revision de diff despues de cada incremento.
- Sin commits, publicacion ni despliegue sin autorizacion humana.

## Caso normal

1. El guardia patrulla o investiga: el zoom vale 1.0 y el encuadre es el actual.
2. La telemetria registra una transicion hacia PERSEGUIR: el objetivo pasa a 1.15 y el zoom converge suavemente, centrado en el jugador.
3. Mientras dure PERSEGUIR el zoom se mantiene en 1.15 con ajustes continuos para seguir al jugador.
4. El guardia sale de PERSEGUIR (perdida, u otra transicion): el objetivo vuelve a 1.0 y el zoom regresa con la misma suavidad.
5. En todo momento guardia y jugador permanecen visibles y el HUD no escala ni se desplaza.

## Caso limite

- Transicion rapida perseguir → no perseguir → perseguir: el zoom amortigua los cambios y no oscila mas alla de su rango 1.0–1.15.
- Reinicio durante el zoom activo: el zoom vuelve a 1.0 de inmediato, sin degradacion acumulada.
- Pausa durante PERSEGUIR: el zoom no avanza ni retrocede mientras la simulacion esta pausada.
- PERSEGUIR en un borde del mapa: el centro en el jugador no produce encuadres invalidos; al estar el mapa completo dentro de la ventana, el zoom solo recorta bordes y el guardia permanece visible.
- Sin la mejora 04: el zoom funciona igual, sin requerir shake ni otros efectos.

## Criterios de aceptacion

| N. | Criterio verificable | Prueba prevista |
|---|---|---|
| C1 | El zoom objetivo es 1.0 en patrullar, investigar, buscar y regresar, y 1.15 exactamente en perseguir | Test unitario de la funcion de zoom objetivo por estado |
| C2 | El enfoque del zoom es la posicion del jugador | Test unitario de la funcion de punto de enfoque |
| C3 | El avance por frame converge al objetivo sin sobrepaso ni oscilacion fuera de [1.0, 1.15] | Test unitario que itera la funcion de avance con estados simulados |
| C4 | Tras salir de PERSEGUIR el zoom regresa a 1.0 y un reinicio lo deja en 1.0 sin valor residual | Test unitario de la funcion de avance + checklist visual |
| C5 | Durante el zoom el HUD permanece estable (no escala ni se desplaza) | Checklist manual de reproduccion |
| C6 | El mapa completo sigue visible: guardia y jugador nunca quedan fuera de pantalla con zoom 1.15 | Checklist manual de reproduccion |
| C7 | El dominio, la maquina de estados y la telemetria no cambian | Revision de diff (`src/domain/`, `src/application/` sin modificaciones) |
| C8 | `npm run validate` finaliza correctamente | `npm run validate` |

## Evidencia prevista

- Comandos: `npm run validate` y la(s) prueba(s) enfocada(s) nuevas en `tests/presentation/`.
- Reproduccion visual o telemetria: checklist manual en `evidencia.md`:
  1. Observar PERSEGUIR → el zoom sube suavemente a 1.15 centrado en el jugador, HUD quieto.
  2. Salir de PERSEGUIR → el zoom regresa suavemente a 1.0.
  3. Estar en PATRULLAR → zoom en 1.0, encuadre identico al actual.
  4. Reiniciar en pleno PERSEGUIR → zoom vuelve a 1.0 al instante.
