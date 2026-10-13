---
id: upgrade-05-camara-tension-plan
titulo: Plan - Camara dinamica de tension
tipo: plan
audiencia: estudiante
acceso: publico
version: 3
---

# Plan — Camara dinamica de tension

- Spec: `./spec.md` (estado: revisada y aprobada el 2026-10-06; revision v3 con
  cooldown de salida el 2026-10-13).
- Estado del plan: aprobado y ejecutado el 2026-10-06; revision del cooldown
  ejecutada el 2026-10-13, pendiente de reproduccion visual y decision humana.

## Supuestos de diseno

- El zoom objetivo se deriva del estado de comportamiento ya calculado por el
  dominio (`guardState.behavior.name`) mas el cooldown de presentacion:
  `zoomTargetFor(state, holdRemainingMs)` devuelve 1.15 (constante
  `ZOOM_PURSUE`) en `pursuing` o mientras el hold siga activo, y 1.0 en
  `patrolling`, `investigating`, `searching` y `returning` con el hold agotado.
  Queda fuera toda decision de tension de la simulacion en `src/game/`
  (C1, restricciones).
- Cooldown de salida anti-flicker (`HOLD_AFTER_PURSUIT_MS = 2500`):
  `advancePursuitHold(currentMs, pursuing, deltaMs, holdMs)` recarga el contador
  a `holdMs` mientras se persigue y, al salir, lo descuenta con el `deltaMs` de
  simulacion, recortado a [0, holdMs]. Al medirse en tiempo de simulacion, la
  pausa (P) congela el contador, el paso manual (N) lo descuenta un frame y el
  reinicio (R) lo limpia junto con el zoom (C9). Es histeresis de presentacion
  derivada solo del flujo de estado, no altera la logica del guardia ni la
  telemetria (C7).
- Punto de enfoque proporcional al zoom: como el mapa (960x640) llena
  exactamente la ventana, centrar la camara en el jugador con zoom 1.0
  desplazaria el encuadre y romperia "el encuadre es el actual" (caso normal 1)
  y el punto 3 de la checklist. Por eso `cameraFocus(zoom, player, mapCenter)`
  interpola el punto entre el centro del mapa (zoom 1.0 → encuadre identico al
  actual, scroll 0) y la posicion del jugador (zoom 1.15 → C2). La interpolacion
  comparte la misma variable de estado que el zoom: no hay salto de encuadre y
  en pleno PERSEGUIR el centro es exactamente el jugador.
- Avance por frame acotado: `advanceZoom(current, target, factor)` aplica
  `current + (target - current) * factor` con `factor` recortado a [0,1] y el
  resultado a [ZOOM_BASE, ZOOM_PURSUE]; al no rebasar nunca el objetivo ni el
  rango, no hay sobrepaso ni oscilacion (C3).
- La aplicacion de zoom y enfoque corre en `updateGuard()`, que solo se ejecuta
  cuando la simulacion avanza (no esta pausada o llego un paso manual). Con eso
  la pausa (P) congela el zoom y el paso manual (N) lo avanza exactamente un
  frame, igual que el resto de la simulacion (caso limite de pausa, decision
  declarada). `render()`, que tambien corre en pausa, no toca la camara.
- En Phaser el centro de vista es `scroll + viewport/2`, independiente del zoom;
  `camera.centerOn(x, y)` fija ese centro y `setZoom(z)` amplia alrededor del
  centro del viewport (verificado en `Camera.js` preRender y `BaseCamera.js`
  `centerOn`). Por eso `centerOn(foco) + setZoom(zoom)` centra el encuadre en el
  punto deseado sin calculo adicional de scroll.
- Reinicio: `scene.restart()` reusa la instancia de escena, asi que los campos
  `tensionZoom` y `pursuitHoldMs` sobreviven al restart aunque la camara se
  recrea con zoom 1. `create()` resetea `tensionZoom` a `ZOOM_BASE` y
  `pursuitHoldMs` a `initialPursuitHoldMs` (0), y reaplica la camara (C4).
- HUD: los dos textos ya viven en `hudCamera` (zoom 1, creada por la mejora 04),
  separada de `cameras.main`; el zoom solo se aplica a la camara principal, asi
  que el HUD queda fuera del zoom sin cambios (C5). Esta mejora no depende de la
  04: si la 04 no existiera, el zoom funciona igual.
- Shake y flash de la mejora 04 (ya implementados) operan sobre la misma camara
  principal; el shake desplaza la matriz en `preRender` y no usa `scroll`, por lo
  que el `centerOn` por frame no lo anula.

## Incrementos

| N. | Archivos previstos | Criterio a comprobar | Comando o prueba | Riesgo | Condicion de detencion |
|---:|---|---|---|---|---|
| 1 | `src/game/presentation/cameraTension.ts`, `tests/presentation/cameraTension.test.ts` | C1: objetivo 1.0 en patrullar, investigar, buscar y regresar, y 1.15 exacto en perseguir o con hold activo; C2: enfoque = centro del mapa con zoom 1.0 y = jugador con zoom 1.15; C3: iteraciones con estados simulados convergen sin sobrepaso ni valor fuera de [1.0, 1.15]; C4: tras agotar el hold el zoom retorna a 1.0 y `initialZoom` vale 1.0 sin residual; C9: `advancePursuitHold` dura 2500 ms de simulacion y se recarga con cada deteccion | `npx vitest run tests/presentation/cameraTension.test.ts` | Un factor de avance o un contador de hold mal acotado compromete C3 y C9 | Prueba fallida => corregir el modulo antes de tocar la escena |
| 2 | `src/game/scenes/GameScene.ts` (campos `tensionZoom` y `pursuitHoldMs`, reset en `create()`, hold + zoom/enfoque en `applyTensionZoom(delta)`) | C5 (precondicion): el zoom solo afecta a `cameras.main` y el HUD sigue en la misma posicion y contenido; C6: guardia y jugador visibles con zoom 1.15, tambien persiguiendo cerca de un borde; encuadre identico al actual en PATRULLAR (caso normal 1 y checklist 4) | `npm run typecheck` y `npm run dev` con reproduccion del checklist 1, 3 y 4 de la spec | `centerOn(foco)` mal derivado o un hold mal aplicado desplaza el encuadre en calma o rebota al perder/recuperar vision | Encuadre distinto al actual en PATRULLAR o rebote al perder vision => revertir solo `GameScene` |
| 3 | `src/game/scenes/GameScene.ts` (pausa, paso manual y reinicio) | Caso limite: en pausa (P) el zoom y el hold no avanzan ni retroceden; un paso manual (N) los avanza un frame; reinicio (R) en pleno PERSEGUIR deja el zoom en 1.0 y el hold en 0 de inmediato | `npm run dev` con P, N y R durante PERSEGUIR y durante el hold; `npx vitest run tests/presentation/cameraTension.test.ts` | Los campos de escena persisten entre `create()` y producen valor residual tras R, o el hold usa tiempo real y expira en pausa | Zoom o hold residuales tras reiniciar, o salto al reanudar => corregir el reset en `create()` |
| 4 | `docs/upgrades/05-camara-tension/evidencia.md` | C7 y C8: matriz criterio → evidencia completa (C1–C9), diff sin cambios en `src/domain/` ni `src/application/`, checklist 1–5 registrado | `npm run validate` y `git diff --stat -- src/domain src/application` (vacio) | Documentacion desconectada del codigo | Discrepancia entre criterios y pruebas => detener |

## Validacion

- Prueba enfocada: `npx vitest run tests/presentation/cameraTension.test.ts`.
- Formato, tipos y build: `npm run typecheck && npm run test:run && npm run build`
  (equivale a `npm run validate`), exit 0.
- Reproduccion visual: `npm run dev` → checklist de la spec:
  1. Observar PERSEGUIR => el zoom sube suavemente a 1.15 centrado en el jugador, HUD quieto;
  2. Salir de PERSEGUIR => el zoom se mantiene durante el cooldown y luego regresa suavemente a 1.0;
  3. Perder y recuperar la vision dentro del cooldown => el encuadre no rebota ni vuelve a 1.0;
  4. Estar en PATRULLAR => zoom en 1.0, encuadre identico al actual;
  5. Reiniciar en pleno PERSEGUIR => zoom vuelve a 1.0 al instante.
- Dif: `git diff --stat -- src/domain src/application` sin resultados (C7).

## Riesgos

- No hay tests de `GameScene`: objetivo, enfoque, avance y cooldown deben vivir
  completos en `src/game/presentation/cameraTension.ts` para probarse sin Phaser.
- El cooldown debe medirse con el `deltaMs` de simulacion (no con `time` real):
  si usara tiempo de escena expiraria durante una pausa larga y romperia el caso
  limite de pausa. El contador se recarga solo mientras el estado es `pursuing`.
- Zoom no entero (1.15) con `pixelArt: true`: posible suavizado o parpadeo
  subpixel del dibujo; observable pero fuera de alcance.
- Sin `setBounds` en la camara, cerca de los bordes el viewport muestra fondo
  fuera del mapa: aceptado por la spec (caso limite), pero C6 exige revision
  visual persiguiendo al jugador en una esquina.
- Shake y flash de la mejora 04 comparten `cameras.main`: aplicar el zoom y
  `centerOn` no debe anularlos; verificar en reproduccion que el estallido sigue
  visible con el zoom activo.
- HUD dependiente de `hudCamera` con zoom 1 y de los `ignore()` ya creados: no
  mover esa segunda camara.
- Build con chunk principal de 1505 kB sobre el limite de 500 kB: preexistente,
  fuera de alcance.

## Condiciones para detenerse

- Ambiguedad de diseno sin resolver en la spec.
- Cambio concurrente que entre en conflicto con el alcance.
- Validacion fallida por causa no comprendida.
- Archivo fuera del plan o permiso faltante.