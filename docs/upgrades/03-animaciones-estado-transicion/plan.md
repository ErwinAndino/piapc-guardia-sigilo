---
id: upgrade-03-animaciones-estado-transicion-plan
titulo: Plan - Animaciones por estado y transicion
tipo: plan
audiencia: estudiante
acceso: publico
version: 2
---

# Plan — Animaciones por estado y transicion

- Spec: `./spec.md` (estado: revisada y aprobada el 2026-10-06).
- Estado del plan: aprobado y ejecutado el 2026-10-06; pendiente de
  decision humana (C7 visual) y commit.

## Incrementos

| N. | Archivos previstos | Criterio a comprobar | Comando o prueba | Riesgo | Condicion de detencion |
|---:|---|---|---|---|---|
| 1 | `src/game/presentation/guardStyle.ts`, `tests/presentation/guardStyle.test.ts` | C1–C5: cobertura de los 5 estados, niveles distintos, filtro de transiciones, progreso acotado y restauracion | `npx vitest run tests/presentation/guardStyle.test.ts` | Un mapa incompleto dejaria `undefined` al dibujar; un filtro erroneo dispararia destellos en `reset` o `navigation-unreachable` | Prueba fallida => corregir el modulo antes de tocar la escena |
| 2 | `src/game/scenes/GameScene.ts` (color de cuerpo + anillo de destello, reloj congelado en pausa) | C7: estilo aplicado, anillo visible al transicionar, pausa congela el destello | `npm run typecheck` y reproduccion visual con `npm run dev` | Romper el dibujo existente o el typecheck | Cualquier fallo => revertir solo ese archivo |
| 3 | `docs/upgrades/03-animaciones-estado-transicion/evidencia.md` | C6: paquete spec/plan/evidencia completo; matriz criterio → evidencia | `npm run validate` y revision humana del diff | Documentacion desconectada del codigo | Discrepancia entre criterios y pruebas => detener |

## Validacion

- Prueba enfocada: `npx vitest run tests/presentation/guardStyle.test.ts`.
- Formato, tipos y build: `npm run typecheck && npm run test:run && npm run build`
  (equivale a `npm run validate`), exit 0.
- Reproduccion visual: `npm run dev` → transicion patrulla → persecucion →
  patrulla; observar color del cuerpo y anillo (C7).

## Riesgos

- C7 (reproduccion visual de color y destello) sin producir: requiere
  `npm run dev` y una transicion provocada por el jugador.
- No hay tests de `GameScene`; toda logica con estado debe vivir en
  `src/game/presentation/` para poder probarse sin Phaser.
- La pausa congela el reloj del destello: si la escena acumula el tiempo con
  `delta` propio, hay que asegurarse de no avanzarlo con `this.paused`.

## Condiciones para detenerse

- Ambiguedad de diseno sin resolver en la spec.
- Cambio concurrente que entre en conflicto con el alcance.
- Validacion fallida por causa no comprendida.
- Archivo fuera del plan o permiso faltante.
