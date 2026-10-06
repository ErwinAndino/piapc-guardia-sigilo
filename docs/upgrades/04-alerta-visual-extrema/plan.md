---
id: upgrade-04-alerta-visual-extrema-plan
titulo: Plan - Impacto visual extremo de alerta
tipo: plan
audiencia: estudiante
acceso: publico
version: 2
---

# Plan — Impacto visual extremo de alerta

- Spec: `./spec.md` (estado: revisada y aprobada el 2026-10-06).
- Estado del plan: aprobado y ejecutado el 2026-10-06; pendiente de
  decision humana (reproduccion visual) y commit.

## Supuestos de diseno

- El disparo se decide en `src/game/presentation/alertImpact.ts` leyendo la
  telemetria ya registrada: `evaluateAlertImpact(state, log, nowMs)` revisa solo
  las entradas nuevas desde la ultima evaluacion, de modo que una transicion
  `investigating -> pursuing` cuenta aunque en el mismo frame se registre ademas
  un evento sonoro (caso limite 5). El estado guarda `processedEntries` y
  `lastBurstAtMs`; no hay estado de enfriamiento fuera del modulo puro.
- Progresos con la convencion elegida: `impactProgress(elapsed, duration)` devuelve
  la fraccion restante, 1 al inicio y 0 al terminar, siempre en [0,1]. El anillo
  base conserva `flashProgress` (0→1) sin cambios.
- Pausa: al entrar se detienen `shakeEffect`, `flashEffect` y el emitter, y se
  congela `impactElapsedMs`; al salir se relanzan shake y flash con el tiempo
  restante (`impactRemainingMs`) y se reanuda el emitter. Esa rama solo corre en
  `update()`, nunca dentro de un paso manual con N.
- El enfriamiento usa el tiempo de escena (`time`), que sigue corriendo en pausa;
  mientras esta pausada no se evalua la telemetria, asi que un estallido pendiente
  se dispara al reanudar.
- HUD en camara propia: `cameras.add()` sin color de fondo (por defecto
  transparente, no borra el render de la camara principal) dibuja solo los dos
  textos de interfaz; `cameras.main.ignore([...])` los excluye y la camara de HUD
  ignora al resto. Shake y flash viven solo en la camara principal: el HUD no se
  desplaza ni se tinta (C5 e intencion de legibilidad).
- Mientras el estallido esta activo se dibuja el anillo ampliado en lugar del
  anillo base; si el disparo es bloqueado por enfriamiento, el estallido anterior
  ya termino (600 ms < 1500 ms) y la transicion muestra el anillo base, que se
  conserva sin cambios para el resto de transiciones (C4).
- Textura de particulas generada por codigo con `Graphics.generateTexture`, sin
  recursos externos ni dependencias nuevas.

## Incrementos

| N. | Archivos previstos | Criterio a comprobar | Comando o prueba | Riesgo | Condicion de detencion |
|---:|---|---|---|---|---|
| 1 | `src/game/presentation/alertImpact.ts`, `tests/presentation/alertImpact.test.ts` | C1: solo las entradas nuevas con destino `pursuing` activan el disparo, tambien si en el mismo frame sigue un evento sonoro; C2: enfriamiento de 1500 ms con marcas de tiempo simuladas, sin redisparo diferido; C3: duraciones exactas (shake 400, flash 250, particulas 500, anillo 600) y progresos de 1 a 0 sin rebasar; C4: anillo ampliado de 11 a 64 con alfa inicial 1.0 | `npx vitest run tests/presentation/alertImpact.test.ts` | Una funcion de progreso mal acotada o un disparo demasiado amplio compromete todos los criterios anteriores | Prueba fallida => corregir el modulo antes de tocar la escena |
| 2 | `src/game/scenes/GameScene.ts` (segunda camara de HUD: `cameras.add` + `ignore`) | C5 (precondicion): los dos textos siguen visibles una sola vez, en la misma posicion y con el mismo contenido que hoy | `npm run typecheck` y `npm run dev` con inspeccion del HUD | Un `ignore` incompleto oculta el HUD o lo dibuja dos veces | HUD ausente o duplicado => revertir solo `GameScene` |
| 3 | `src/game/scenes/GameScene.ts` (disparo, `shake` y `flash` de camara, emitter de particulas precreado, anillo ampliado) | C1–C4 en ejecucion: estallido solo al entrar en `pursuing`, efectos simultaneos dentro de sus ventanas, anillo ampliado visible y anillo base intacto para el resto; C5 durante el estallido; C6 sin tocar `src/domain/` ni `src/application/` | `npm run typecheck` y reproduccion visual con `npm run dev` (checklist 1, 2 y 4 de la spec) | Shake y flash corren en el reloj de la camara; las particulas se dibujarian en la camara de HUD si no se ignoran | Fallo de typecheck, efecto fuera de su ventana o HUD movido => corregir o revertir solo `GameScene` |
| 4 | `src/game/scenes/GameScene.ts` (pausa y reinicio) | Caso limite: en pausa anillo, particulas, shake y flash dejan de avanzar y al reanudar continuan sin reinicio anomalo; reinicio (R) en pleno estallido deja escena limpia | `npm run dev` con P y R durante el estallido; `npx vitest run tests/presentation/alertImpact.test.ts` | Detener y relanzar shake/flash con el tiempo restante es la parte mas fragil del plan | Efecto que se reinicia de forma visible o que sigue tras la pausa => detener y redefinir en la spec |
| 5 | `docs/upgrades/04-alerta-visual-extrema/evidencia.md` | C6 y C7: matriz criterio → evidencia completa, diff sin cambios en `src/domain/` ni `src/application/`, checklist 1–4 registrado | `npm run validate` y `git diff --stat -- src/domain src/application` (vacio) | Documentacion desconectada del codigo | Discrepancia entre criterios y pruebas => detener |

## Validacion

- Prueba enfocada: `npx vitest run tests/presentation/alertImpact.test.ts`.
- Formato, tipos y build: `npm run typecheck && npm run test:run && npm run build`
  (equivale a `npm run validate`), exit 0.
- Reproduccion visual: `npm run dev` → checklist de la spec:
  1. transicion a PERSEGUIR => shake + flash + particulas + anillo ampliado, HUD quieto;
  2. transicion a INVESTIGAR => solo anillo base;
  3. perder y recuperar al jugador antes de 1500 ms => sin segundo estallido;
  4. R en pleno estallido => escena limpia.
- Dif: `git diff --stat -- src/domain src/application` sin resultados (C6).

## Riesgos

- No hay tests de `GameScene`: disparo, enfriamiento y progresos deben vivir
  completos en `src/game/presentation/alertImpact.ts` para probarse sin Phaser.
- Shake, flash y particulas no se pausan solos: la rama de congelar y reanudar
  es manual y depende de `shakeEffect.reset()`, `flashEffect.reset()` y
  `emitter.pause()/resume()`.
- La segunda camara exige `ignore()` de todo lo que no es HUD: cualquier objeto
  nuevo sin ignorar se dibuja dos veces.
- Reproduccion visual manual de C5 y de la pausa: requiere `npm run dev` y una
  transicion provocada por el jugador.
- Build con chunk principal de 1505 kB sobre el limite de 500 kB: preexistente,
  fuera de alcance.

## Condiciones para detenerse

- Ambiguedad de diseno sin resolver en la spec.
- Cambio concurrente que entre en conflicto con el alcance.
- Validacion fallida por causa no comprendida.
- Archivo fuera del plan o permiso faltante.
