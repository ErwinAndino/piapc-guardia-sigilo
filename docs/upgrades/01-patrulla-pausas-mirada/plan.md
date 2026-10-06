---
id: upgrade-01-patrulla-pausas-mirada-plan
titulo: Plan - Patrulla con pausas y mirada direccional
tipo: plan
audiencia: estudiante
acceso: publico
version: 2
---

# Plan — Patrulla con pausas y mirada direccional

- Spec: `./spec.md` (estado: redactada, pendiente de revision humana).
- Estado del plan: cerrado sin incrementos de codigo — el comportamiento es
  preexistente del baseline `f80466c`.

## Incrementos

| N. | Archivos previstos | Criterio a comprobar | Comando o prueba | Riesgo | Condicion de detencion |
|---:|---|---|---|---|---|
| 1 | Ninguno (adopcion retroactiva) | C1–C4 en pruebas de dominio existentes | `npm run test:run` → ver Validacion | Ninguno: sin cambios de codigo | Si alguna prueba fallara, detener y documentar el fallo en evidencia.md |
| 2 | Solo `docs/upgrades/01-*/` | Spec, plan y evidencia completos y versionados | revision humana del diff | Documentacion inconexa con el codigo | Detener ante cualquier discrepancia entre criterios y pruebas reales |

Nota: no se modifico ningun archivo de `src/` ni `tests/` para este upgrade.

## Validacion

- Tipos, pruebas y build: `npm run validate` → exit 0 (10 archivos / 69 pruebas).
- Prueba enfocada: `npm run test:run -- tests/behavior/guardBehavior.test.ts` (15 pruebas).

## Riesgos

- La evidencia depende de pruebas escritas para H4, no para este upgrade:
  se mitiga referenciandolas explicitamente en la matriz criterio → evidencia.
- C5 (facing) no tiene prueba automatizada; queda apoyada en inspeccion de
  codigo y en la reproduccion visual C7.

## Condiciones para detenerse

- Ambiguedad de diseno sin resolver en la spec.
- Cambio concurrente que entre en conflicto con el alcance.
- Validacion fallida por causa no comprendida.
- Archivo fuera del plan o permiso faltante.
