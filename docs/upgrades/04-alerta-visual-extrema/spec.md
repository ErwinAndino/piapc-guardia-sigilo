---
id: upgrade-04-alerta-visual-extrema-spec
titulo: Spec - Impacto visual extremo de alerta
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 2
---

# Spec — Impacto visual extremo de alerta

- Upgrade de catalogo: 04.
- Aporte del catalogo: Shake, flash, zoom, particulas o respuesta equivalente.
- Estado: revisada y aprobada el 2026-10-06.

## Problema

La transicion a PERSEGUIR es el momento de maximo peligro de la escena, pero hoy solo se senala con un cambio de color y un anillo de 400 ms igual al de cualquier otra transicion. Quien observa la demostracion no percibe de forma inequivoca que acaba de ocurrir el evento mas importante de la maquina de estados.

## Intencion de diseno

Un estallido visual unico, corto y denso, disparado exclusivamente por la entrada en PERSEGUIR: shake de camara, flash de pantalla rojo, particulas en el guardia y un anillo ampliado. La intensidad es fija y explicita en constantes nombradas; la logica vive en funciones puras de presentacion, testeables con Vitest, y `GameScene` solo las aplica. El HUD no participa: se mantiene estable para que la informacion siga siendo legible durante el impacto.

## Objetivo

Producir una respuesta visual inequivoca, repetible y verificable en la transicion a PERSEGUIR sin modificar el dominio, la telemetria ni el comportamiento del guardia.

## Alcance

- Disparo unico en la transicion hacia el estado `pursuing`, con enfriamiento minimo de 1500 ms entre estallidos.
- Efectos simultaneos en el estallido, con duraciones fijas:
  - Shake de camara: 400 ms.
  - Flash de pantalla rojo: 250 ms.
  - Particulas en la posicion del guardia: 500 ms.
  - Anillo ampliado en la posicion del guardia: 600 ms, de radio 11 a 64, alfa inicial 1.0.
- Constantes de intensidad y duracion exportadas y con nombre, sin configuracion en tiempo real.
- Funciones puras en `src/game/presentation/` para el disparo (con enfriamiento), los progresos temporales de cada efecto y el anillo diferenciado.
- Aplicacion de los efectos en `src/game/scenes/GameScene.ts` (shake y flash de camara, emision de particulas, anillo).
- El anillo base de 400 ms para las demas transiciones se conserva sin cambios.

## Fuera de alcance

- Zoom de camara, seguimiento o encuadre (mejora 05).
- Medidor o niveles de alerta (mejora 08).
- Captura del jugador: no existe mecanica de captura en el codigo y no se agrega aqui.
- Audio, vibracion o efectos sobre el HUD.
- Cambios en `src/domain/`, `src/application/`, la maquina de estados o la telemetria.
- Interruptores, ajustes de intensidad o accesibilidad en tiempo real.
- Dependencias nuevas o recursos externos.

## Restricciones

- `src/domain/` no importa Phaser, DOM ni APIs del navegador.
- `src/application/` coordina; `src/game/` adapta y no decide reglas de comportamiento.
- El enfriamiento y los progresos son reglas de presentacion (feedback visual): funciones puras en `src/game/presentation/`, sin tocar `guardBehavior` ni el registro de telemetria.
- Formas dibujadas por codigo; sin dependencias nuevas.
- Cambios pequanos con revision de diff despues de cada incremento.
- Sin commits, publicacion ni despliegue sin autorizacion humana.

## Caso normal

1. El guardia esta en PATRULLAR o INVESTIGAR y la telemetria registra una transicion cuyo destino es PERSEGUIR.
2. La funcion de disparo valida que haya transicion nueva y que hayan pasado al menos 1500 ms desde el ultimo estallido.
3. Si procede, `GameScene` inicia en el mismo instante: shake de camara 400 ms, flash rojo 250 ms, particulas en el guardia 500 ms y anillo ampliado 600 ms.
4. El HUD (texto de estado, vision, sonido, memoria y transiciones) no se desplaza ni se escala durante el estallido.
5. Al concluir cada efecto la escena vuelve exactamente a su estado anterior; el color de guardia y cono por estado sigue mostrando la informacion continua.

## Caso limite

- Redisparo: el guardia pierde y recupera al jugador antes de 1500 ms; no se genera un segundo estallido y el primero continua hasta terminar.
- Otras transiciones: `sound-heard`, `lost-sight`, `search-timeout`, etc. disparan solo el anillo base actual, nunca shake, flash ni particulas.
- Reinicio durante el estallido: al reiniciar el escenario los efectos se cancelan y la escena queda limpia, sin shake residual.
- Pausa durante el estallido: con la simulacion pausada los efectos visuales no avanzan ni se reinician de forma anomala.
- Transicion inmediata investigar → perseguir en el mismo frame que otro evento sonoro: solo cuenta la transicion hacia perseguir.
- El estallido no añade, altera ni omite entradas en la telemetria.

## Criterios de aceptacion

| N. | Criterio verificable | Prueba prevista |
|---|---|---|
| C1 | Solo la transicion hacia `pursuing` dispara el estallido; las demas transiciones no lo activan | Test unitario de la funcion pura de disparo con distintas transiciones |
| C2 | El enfriamiento de 1500 ms bloquea redisparos; pasado el plazo se permite uno nuevo | Test unitario con marcas de tiempo simuladas |
| C3 | Cada efecto dura exactamente su constante (shake 400, flash 250, particulas 500, anillo 600 ms) y sus progresos van de 1 a 0 sin rebasar | Test unitario de las funciones de progreso |
| C4 | El anillo ampliado (radio 11→64, alfa 1.0) solo acompana la transicion a perseguir; el anillo base se conserva para el resto | Test unitario de la funcion de anillo + revision visual |
| C5 | Durante el estallido el HUD permanece estable (no tiembla ni escala) | Checklist manual de reproduccion |
| C6 | El dominio, la maquina de estados y la telemetria no cambian | Revision de diff (`src/domain/`, `src/application/` sin modificaciones) |
| C7 | `npm run validate` finaliza correctamente | `npm run validate` |

## Evidencia prevista

- Comandos: `npm run validate` y la(s) prueba(s) enfocada(s) nuevas en `tests/presentation/`.
- Reproduccion visual o telemetria: checklist manual en `evidencia.md`:
  1. Forzar transicion a PERSEGUIR → shake + flash rojo + particulas + anillo ampliado visibles, HUD quieto.
  2. Transicion a INVESTIGAR → solo anillo base, sin shake/flash/particulas.
  3. Perder y recuperar al jugador en menos de 1500 ms → sin segundo estallido.
  4. Reiniciar en pleno estallido → escena limpia.
