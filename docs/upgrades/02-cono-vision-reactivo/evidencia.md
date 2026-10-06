---
id: upgrade-02-cono-vision-reactivo-evidencia
titulo: Evidencia - Cono de vision visible y reactivo
tipo: evidencia
audiencia: estudiante
acceso: publico
version: 2
---

# Evidencia — Cono de vision visible y reactivo

## Version

- Inicial: `f80466c` ("H4: maquina de estados del guardia con telemetria").
- Final: `ecaa013` ("Upgrade 02 en curso: estilo del cono de vision por estado").
- Commits de soporte: `eb16205` (estructura documental).
- Entorno: Windows, node v24.16.0, npm 12.0.2.

## Comandos y resultados

| Orden | Comando | Resultado | Salida relevante |
|---:|---|---|---|
| 1 | `npx vitest run tests/presentation/coneStyle.test.ts` | exit 0 | 1 archivo / 7 pruebas OK |
| 2 | `npm run validate` (2026-10-06, antes de documentar) | exit 0 | typecheck OK; 10 archivos / 69 pruebas; build OK 3.55 s |
| 3 | `npm run validate` (2026-10-06, cierre documental) | exit 0 | typecheck OK; 10 archivos / 69 pruebas; build OK 3.56 s |

## Build y ejecucion

- `npm run build` OK: `dist/index.html`, `dist/assets/index-Bjc2XB3U.js`
  (1505.79 kB), `dist/assets/index-BdusbQAW.css`.
- Ejecucion del producto: `npm run dev` — pendiente de reproduccion visual C7.

## Registro cronologico resumido

| Orden | Accion o herramienta | Resultado observable | Decision humana |
|---:|---|---|---|
| 1 | Prompt de exploracion (`Prompts/Req.md`) | Intencion y requisito del upgrade declarados | Aceptar el enfoque |
| 2 | Exploracion de `guardBehavior.ts`, `GameScene.ts` | 5 estados de conducta; cono relleno con color/opacidad fijos | Vincular estilo al estado |
| 3 | Incremento 1: `coneStyle.ts` + `coneStyle.test.ts` | 7 pruebas nuevas en verde | Aceptar |
| 4 | Incremento 2: `coneStyleFor` en `GameScene.ts:261` | El relleno del cono deriva del estado | Aceptar |
| 5 | Commits `eb16205` y `ecaa013` (autorizados) | Arbol limpio | Integrar |
| 6 | Redaccion de spec/plan/evidencia | Paquete completo | Pendiente de decision final |

## Diff

- `ecaa013`: 4 archivos, 126 inserciones, 28 eliminaciones.
  - `Prompts/Req.md` (+32/−8)
  - `src/game/presentation/coneStyle.ts` (+18, nuevo)
  - `src/game/scenes/GameScene.ts` (+4/−1: import y uso de `coneStyleFor`)
  - `tests/presentation/coneStyle.test.ts` (+72, nuevo)
- `eb16205`: 34 archivos de `docs/` (estructura y plantillas).

## Matriz criterio → evidencia

| Criterio | Comprobacion | Resultado real |
|---|---|---|
| C1: los 5 estados tienen estilo definido | `coneStyle.test.ts` — "covers every guard state" | aprobado (7/7) |
| C2: tres niveles de amenaza distintos | "uses distinct styles for the three threat levels" | aprobado |
| C3: restauracion tras persecucion | "restores the resting style after a pursuit" | aprobado |
| C4: expone solo color y opacidad | "exposes style only, never cone geometry" | aprobado |
| C5: opacidad en (0,1] y color entero | "keeps alpha values inside the graphic range" | aprobado |
| C6: build y suite completa | `npm run validate` | exit 0 |
| C7: cono cambia en pantalla al variar la amenaza | reproduccion visual con `npm run dev` | **pendiente (usuario)** |

## Evidencia visual o telemetria

- Visual (C7): pendiente — `npm run dev`, perseguir al jugador y observar
  azul 0.16 → amarillo 0.24 → rojo 0.32, y el retorno al azul al perder al jugador.
- La reactividad se recalcula por frame en `GameScene.ts:261`
  (`coneStyleFor(this.guardState.behavior.name)`); el estado lo decide el
  dominio, la presentacion solo lo representa.

## Limitaciones

- La spec y el plan se redactaron despues del codigo (trazabilidad declarada
  en la spec); el flujo ideal exigia spec → plan → incremento.
- Sin prueba automatizada del dibujo en escena (Phaser no se testea en el
  laboratorio); C7 es la unica garantia de que el estilo llega a pantalla.
- C7 sin producir.

## Decision humana

- Fecha: [AAAA-MM-DD].
- Resolucion: [ ] integrar  [ ] corregir  [ ] revertir  [ ] descartar
- Notas: [PENDIENTE]
