# Plan — práctica de navegación

Estado: Aprobado
Variante: A
Spec: spec.md

| Incremento | Trabajo | Archivos reales | Criterios | Comprobación |
|---|---|---|---|---|
| 1 | Configurar/ajustar dominio y probar caso normal/límite de mi variante | `src/domain/navigation/search.ts`, `tests/navigation/search.test.ts` | A-01, A-02, A-AC1, A-AC2 | `npx vitest run tests/navigation/search.test.ts` |
| 2 | Conectar con consumidor existente y probar contrato anterior | `src/application/simulation/navigationDemo.ts`, `tests/application/navigationDemo.test.ts` | A-03, A-04, A-AC3, BASE-AC5 | `npx vitest run tests/application/navigationDemo.test.ts` |
| 3 | Terreno lento del laboratorio y su marca visual | `src/application/simulation/labLevel.ts`, `src/game/presentation/slowTerrainStyle.ts`, `tests/application/labLevel.test.ts`, `tests/presentation/slowTerrainStyle.test.ts` | E-01, E-AC3 | `npx vitest run tests/application/labLevel.test.ts tests/presentation/slowTerrainStyle.test.ts` |
| 4 | Conectar costos con la simulación y la escena | `src/application/simulation/guardSimulation.ts`, `src/game/scenes/GameScene.ts`, `tests/application/guardSimulation.test.ts` | E-02, E-AC1, E-AC2 | `npx vitest run tests/application/guardSimulation.test.ts` |
| 5 | Validación final, diff y cierre de evidencia | `docs/practica-navegacion/*` | BASE-AC1 a BASE-AC6, E-AC1 a E-AC3 | `npm run validate` |

Referencia previa: comparación y casos comunes BASE-01 a BASE-04 completados en `tests/navigation/fixture5x3.test.ts` (fixture 5x3, sin modificar la implementación).
Extensión aprobada (2026-10-13): terreno lento visible y consumido por la simulación (`guardSimulation`), ver `spec.md` §Extensión.
Riesgos: (1) que `totalCost` siga contando pasos en vez de sumar costos — la ruta directa de costo 16 lo delata; (2) heurística inadmisible si algún costo de entrada es menor que 1; (3) filtrar costos a BFS o alterar el caso unitario existente; (4) que la franja lenta del laboratorio coincida con muros o puertas — se filtra a celdas transitables.
Detenerse si: faltan permisos, hay cambios ajenos, conflicto de contrato,
regresión nueva o se requiere dependencia/UI/refactorización fuera del alcance.
No crear commits ni publicar automáticamente.
