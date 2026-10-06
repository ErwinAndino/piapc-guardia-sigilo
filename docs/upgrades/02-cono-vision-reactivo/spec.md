---
id: upgrade-02-cono-vision-reactivo-spec
titulo: Spec - Cono de vision visible y reactivo
tipo: especificacion
audiencia: estudiante
acceso: publico
version: 1
---

# Spec — Cono de vision visible y reactivo

- Upgrade de catalogo: 02.
- Aporte del catalogo: Claridad de alcance y amenaza.
- Estado: revisada y aprobada por el humano el 2026-10-06.
- Nota de trazabilidad: el codigo se implemento antes que este documento
  (`ecaa013`: `src/game/presentation/coneStyle.ts`,
  `tests/presentation/coneStyle.test.ts`, cambio en `src/game/scenes/GameScene.ts`).
  El documento lo cubre a posteriori; la aprobacion humana y la evidencia
  registrada en `evidencia.md` son el respaldo de aceptacion.

## Problema

El cono de vision del guardia se dibuja con un color y opacidad fijos. El
jugador no puede distinguir, por la representacion visual, en que nivel de
amenaza se encuentra el guardia aunque el dominio ya lo modela.

## Intencion de diseno

Que el jugador identifique de forma clara el alcance de la vision del guardia
y que el cono cambie de manera observable ante un aumento o disminucion de la
amenaza, sin romper la separacion entre dominio y motor.

## Objetivo

Vincular la representacion del cono al estado de conducta del guardia mediante
una capa de presentacion, de modo que el estilo sea una funcion derivada del
estado y no una decision del dominio.

## Alcance

- Mapa de estilo por estado de conducta en `src/game/presentation/`.
- Uso de ese estilo al rellenar el cono en `src/game/scenes/GameScene.ts`.
- Pruebas unitarias del mapeo estilo-estado en `tests/presentation/`.

## Fuera de alcance

- Cambiar reglas de vision, campo de vision, alcance ni oclusion.
- Cambiar la maquina de estados, la navegacion o la percepcion.
- Geometria del cono (apertura, longitud, forma); sólo estilo (color/opacidad).
- Interfaz, HUD, camara o animaciones.

## Restricciones

- `src/domain/` sin Phaser, DOM ni APIs de navegador; el estilo vive en `game/presentation/`.
- `src/game/` adapta y no decide reglas de comportamiento.
- Formas dibujadas por codigo; sin dependencias nuevas.
- Revision del diff por incremento; sin commits sin autorizacion.

## Caso normal

El cono se dibuja en cada frame con el estilo que corresponde al estado actual
del guardia. Al pasar de patrulla a alerta o persecucion, el color y la
opacidad cambian; al volver a patrulla, el estilo vuelve al original.

## Caso limite

- Todos los estados del tipo `GuardStateName` deben tener estilo definido
  (sin `undefined` ni excepcion al dibujar).
- Transicion directa entre estados intermedios (p. ej. investigar → perseguir)
  produce un estilo distinto en cada salto.

## Criterios de aceptacion

| N. | Criterio verificable | Prueba prevista |
|---|---|---|
| C1 | Cada estado del guardia tiene un estilo definido | `tests/presentation/coneStyle.test.ts` — cobertura de los 5 estados |
| C2 | Los tres niveles de amenaza son visualmente distintos (descanso / alerta / maximo) | prueba de estilos distintos entre niveles |
| C3 | Tras una persecucion, el estilo de patrulla se restaura identico | prueba de restauracion |
| C4 | El estilo expone sólo color y opacidad, sin geometria del cono | prueba de claves expuestas |
| C5 | La opacidad queda en rango (0,1] y el color es entero | prueba de rangos |
| C6 | El build y la suite completa pasan | `npm run validate` → exit 0 |
| C7 | El cono en pantalla refleja el estado durante la ejecucion | reproduccion visual: `npm run dev`, perseguir al jugador y observar el cambio de color/opacidad |

## Evidencia prevista

- Comandos: `npm run test:run` (prueba enfocada `tests/presentation/coneStyle.test.ts`) y `npm run validate`.
- Reproduccion visual: `npm run dev` y transicion patrulla → persecucion → patrulla.
- Diff de los archivos de alcance y registro en `evidencia.md`.
