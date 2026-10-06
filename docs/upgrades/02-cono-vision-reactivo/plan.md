---
id: upgrade-02-cono-vision-reactivo-plan
titulo: Plan - Cono de vision visible y reactivo
tipo: plan
audiencia: estudiante
acceso: publico
version: 2
---

# Plan — Cono de vision visible y reactivo

- Spec: `./spec.md` (estado: revisada y aprobada el 2026-10-06).
- Estado del plan: ejecutado; documentado a posteriori junto con el codigo
  ya commiteado en `ecaa013`.

## Incrementos

| N. | Archivos previstos | Criterio a comprobar | Comando o prueba | Riesgo | Condicion de detencion |
|---:|---|---|---|---|---|
| 1 | `src/game/presentation/coneStyle.ts`, `tests/presentation/coneStyle.test.ts` | C1–C5: cobertura de los 5 estados, niveles distintos, restauracion, claves y rangos | `npx vitest run tests/presentation/coneStyle.test.ts` | Mapa incompleto dejaria `undefined` al dibujar | Prueba fallida => corregir el mapa antes de tocar la escena |
| 2 | `src/game/scenes/GameScene.ts` (uso de `coneStyleFor` en el relleno del cono) | C6: build y suite completa; estilo aplicado en el frame | `npm run validate` | Romper el dibujo del cono o el typecheck | Cualquier fallo => revertir solo ese archivo |
| 3 | `docs/upgrades/02-cono-vision-reactivo/*` | Paquete spec/plan/evidencia completo y versionado | revision humana del diff | Documentacion desconectada del codigo | Discrepancia entre criterios y pruebas => detener |

`Prompts/Req.md` (prompt de exploracion) acompana al incremento 1.

## Validacion

- Prueba enfocada: `npx vitest run tests/presentation/coneStyle.test.ts`
  → 1 archivo / 7 pruebas, exit 0.
- Suite completa: `npm run validate` → exit 0 (10 archivos / 69 pruebas, build OK).

## Riesgos

- C7 (reproduccion visual de la reactividad) sin producir: requiere
  `npm run dev` y transicion patrulla → persecucion → patrulla.
- El estilo no cubre variacion de geometria (fuera de alcance deliberado).

## Condiciones para detenerse

- Ambiguedad de diseno sin resolver en la spec.
- Cambio concurrente que entre en conflicto con el alcance.
- Validacion fallida por causa no comprendida.
- Archivo fuera del plan o permiso faltante.
