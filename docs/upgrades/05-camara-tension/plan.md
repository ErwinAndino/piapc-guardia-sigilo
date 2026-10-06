---
id: upgrade-05-camara-tension-plan
titulo: Plan - Camara dinamica de tension
tipo: plan
audiencia: estudiante
acceso: publico
version: 2
---

# Plan — Camara dinamica de tension

- Spec: `./spec.md` (estado: [pendiente / revisada]).
- Estado del plan: [pendiente de aprobacion / aprobado].

## Supuestos de diseno

- El zoom objetivo se deriva del estado de comportamiento ya calculado por el
  dominio (`guardState.behavior.name`): `zoomTargetFor(state)` devuelve 1.0 en
  `patrolling`, `investigating`, `searching` y `returning`, y exactamente 1.15
  (constante `ZOOM_PURSUE`) en `pursuing`. Queda fuera toda decision de tension
  en `src/game/` (C1, restricciones).
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
- Reinicio: `scene.restart()` reusa la instancia de escena, asi que el campo
  `tensionZoom` sobrevive al restart aunque la camara se recrea con zoom 1.
  `create()` resetea el campo a `ZOOM_BASE` y reaplica la camara (C4).
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
| 1 | `src/game/presentation/cameraTension.ts`, `tests/presentation/cameraTension.test.ts` | C1: objetivo 1.0 en patrullar, investigar, buscar y regresar, y 1.15 exacto en perseguir; C2: enfoque = centro del mapa con zoom 1.0 y = jugador con zoom 1.15; C3: iteraciones con estados simulados convergen sin sobrepaso ni valor fuera de [1.0, 1.15]; C4: tras salir de perseguir el zoom retorna a 1.0 y `initialZoom` vale 1.0 sin residual | `npx vitest run tests/presentation/cameraTension.test.ts` | Un factor de avance mal acotado o un enfoque con salto compromete C2 y C3 | Prueba fallida => corregir el modulo antes de tocar la escena |
| 2 | `src/game/scenes/GameScene.ts` (campo `tensionZoom`, reset en `create()`, aplicar zoom/enfoque en `updateGuard()`) | C5 (precondicion): el zoom solo afecta a `cameras.main` y el HUD sigue en la misma posicion y contenido; C6: guardia y jugador visibles con zoom 1.15, tambien persiguiendo cerca de un borde; encuadre identico al actual en PATRULLAR (caso normal 1 y checklist 3) | `npm run typecheck` y `npm run dev` con reproduccion del checklist 1 y 3 de la spec | `centerOn(foco)` mal derivado desplaza el encuadre en calma o el HUD cambia si se toca `hudCamera` | Encuadre distinto al actual en PATRULLAR o HUD alterado => revertir solo `GameScene` |
| 3 | `src/game/scenes/GameScene.ts` (pausa, paso manual y reinicio) | Caso limite: en pausa (P) el zoom no avanza ni retrocede; un paso manual (N) lo avanza un frame; reinicio (R) en pleno PERSEGUIR deja el zoom en 1.0 de inmediato | `npm run dev` con P, N y R durante PERSEGUIR; `npx vitest run tests/presentation/cameraTension.test.ts` | El campo `tensionZoom` persiste entre `create()` de escena y produce valor residual tras R | Zoom residual tras reiniciar o salto al reanudar => corregir el reset en `create()` |
| 4 | `docs/upgrades/05-camara-tension/evidencia.md` | C7 y C8: matriz criterio → evidencia completa, diff sin cambios en `src/domain/` ni `src/application/`, checklist 1–4 registrado | `npm run validate` y `git diff --stat -- src/domain src/application` (vacio) | Documentacion desconectada del codigo | Discrepancia entre criterios y pruebas => detener |

## Validacion

- Prueba enfocada: `npx vitest run tests/presentation/cameraTension.test.ts`.
- Formato, tipos y build: `npm run typecheck && npm run test:run && npm run build`
  (equivale a `npm run validate`), exit 0.
- Reproduccion visual: `npm run dev` → checklist de la spec:
  1. Observar PERSEGUIR => el zoom sube suavemente a 1.15 centrado en el jugador, HUD quieto;
  2. Salir de PERSEGUIR => el zoom regresa suavemente a 1.0;
  3. Estar en PATRULLAR => zoom en 1.0, encuadre identico al actual;
  4. Reiniciar en pleno PERSEGUIR => zoom vuelve a 1.0 al instante.
- Dif: `git diff --stat -- src/domain src/application` sin resultados (C7).

## Riesgos

- No hay tests de `GameScene`: objetivo, enfoque y avance deben vivir completos en
  `src/game/presentation/cameraTension.ts` para probarse sin Phaser.
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