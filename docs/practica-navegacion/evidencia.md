# Evidencia — práctica de navegación

Repositorio: [PENDIENTE: sin remoto confirmado]
Commit inicial: 74c33ba80108932ecab7976ec806e60e84db6e39
Commit de implementación: [PENDIENTE]
Versión de entrega: commit informado por el estudiante en la plataforma.
Variante: A
Herramienta/modelo o trabajo manual: opencode (agente de desarrollo) + revisión humana.
Cambios previos: repositorio del laboratorio con 10 upgrades previos (FSM, percepción, presentación, puertas). Navegación BFS/A* ya existente, sin costos.
Línea base: `npm run typecheck` sin errores; `npm run test:run` = 17 archivos / 158 pruebas en verde; sin fallos previos conocidos.

## Exploración mínima
| Capa | Ruta/símbolo | Capacidad comprobada |
|---|---|---|
| Búsqueda | `src/domain/navigation/search.ts` | `findPathBfs` y `findPathAStar` devuelven `SearchResult` con `status`, `path`, `totalCost`, `expandedNodes`, `maximumFrontier`, `explored`. A* es de costo unitario (`current.cost + 1`) y `totalCost = path.length - 1`. |
| Grafo | `src/domain/navigation/gridGraph.ts` | Cuatro vecinos cardinales N/E/S/W, sin diagonales; `manhattanDistance`. |
| Seguimiento | `src/domain/navigation/pathFollower.ts` | `advanceAlongPath` consume varios waypoints por actualización; sin Phaser. |
| Consumidor | `src/application/simulation/navigationDemo.ts` | `calculateRoute(map, start, goal, algorithm)` ya acepta configuración; delega en A*/BFS. Consumidor de simulación `guardSimulation.updateGuardSimulation` invalida y replanifica. |
| Pruebas | `tests/navigation/search.test.ts`, `tests/navigation/pathFollower.test.ts`, `tests/application/guardSimulation.test.ts` | Contrato actual de navegación, seguimiento y simulación. |

Contraste y decisión humana: la exploración confirmó que A* usa costo unitario fijo (`candidateCost = current.cost + 1`) y que `totalCost = path.length - 1` cuenta pasos, no suma costos; no existe soporte de costos ponderados ni máscara. El anexo A supone costos de entrada ponderados. No hay conflicto de contrato para el caso unitario porque con todos los costos en 1 la suma coincide con los pasos. Decisión humana (2026-10-13): reutilizar el A* existente añadiendo un parámetro opcional de costos de entrada (celda→costo) en `findPathAStar` y propagarlo desde `calculateRoute` con un parámetro opcional, en vez de crear una interfaz o un algoritmo nuevo; BFS permanece unitario.
Spec/plan aprobados: spec y plan aprobados el 2026-10-13 en la revisión de planificación; se eligió la variante A, consumidor `calculateRoute` y costos como parámetro opcional, sin cambios de alcance posteriores.

## Comparación común — fixture libre 5x3
Comando: `npx vitest run tests/navigation/fixture5x3.test.ts` (10 pruebas en verde).
Vecinos y desempate reales: cuatro vecinos cardinales en orden N, E, S, W, sin diagonales. BFS usa cola FIFO; A* usa `costo + Manhattan`, y a igual score desempata por menor heurística y luego por orden de inserción.
| Algoritmo | Estado | Ruta | Pasos | Costo | Expandidos | Frontera máxima |
|---|---|---|---:|---:|---|---|
| BFS | success | (0,1)→(1,1)→(2,1)→(3,1)→(4,1) | 4 | 4 | 12 | 4 |
| A* | success | (0,1)→(1,1)→(2,1)→(3,1)→(4,1) | 4 | 4 | 5 | 9 |
Casos límite reales: inicio=meta → success, ruta `[(0,1)]`, costo 0, expandidos 1, frontera 1; barrera en x=2 → `unreachable`, ruta `[]`, costo `null`; inicio (-1,1) → `invalid-start` y meta (5,1) → `invalid-goal`, ambos sin expandir.
DFS: usa una pila y sigue una sola rama hasta el fondo; en la traza provista llega a la meta en 4 pasos (S, A, C, X, G) mientras BFS la encuentra en 3 (S, B, D, G), así que encontrar antes una meta no demuestra que sea la de menor cantidad de aristas.
Dijkstra: extraer S=0 descubre A=1 y B=3; extraer A=1 descubre G=10; extraer B=3 mejora G=6; al extraer la entrada válida de G queda la ruta S-B-G con costo 6. No se debe terminar al descubrir G por primera vez (habría dado 10): hay que extraer el mínimo de la frontera para garantizar el costo óptimo, y ambas rutas tienen dos acciones pero BFS no distingue sus costos por contar acciones.

## Criterio → evidencia
| Criterio | Prueba/archivo y comando o reproducción | Observado | Cumple/pendiente |
|---|---|---|---|
| BASE-AC1 | commit `74c33ba`, tabla de exploración, línea base `npm run typecheck` + `npm run test:run` (158 passed) | repo/commit, capas, cambios previos y resultado inicial identificados; observado vs. supuesto separado | cumple |
| BASE-AC2 | `npx vitest run tests/navigation/fixture5x3.test.ts` | BFS y A* devuelven ruta cardinal de 4 pasos y costo 4; métricas reales registradas; trazas DFS/Dijkstra concluidas | cumple |
| BASE-AC3 | `npx vitest run tests/navigation/fixture5x3.test.ts` | inicio=meta éxito costo 0; barrera x=2 = unreachable; extremos (-1,1)/(5,1) = invalid-start/invalid-goal | cumple |
| BASE-AC4 | spec `Estado: Aprobada` y plan `Estado: Aprobado`; contraste y decisión humana registrados arriba | spec y plan aprobados antes de editar código; sólo se desarrolló el anexo A | cumple |
| A-AC1 | `npx vitest run tests/navigation/search.test.ts` (`A-AC1`) | directa unitaria = 4 pasos y costo ponderado 16; ponderada = rodeo de 6 pasos, costo 6, sin celdas de la franja | cumple |
| A-AC2 | `npx vitest run tests/navigation/search.test.ts` (`A-AC2`) | sin costos, A* conserva 4 pasos y costo 4 | cumple |
| A-AC3 | `npx vitest run tests/application/navigationDemo.test.ts` | `calculateRoute` con costos obtiene 6/6; sin costos conserva 4/4; BFS ignora costos | cumple |
| BASE-AC5 | `npm run validate` + `git diff --stat` | 19 archivos / 178 pruebas y build OK; diff acotado a navegación, su consumidor y pruebas previstas | cumple |
| BASE-AC6 | URL y commit final | repositorio pendiente de remoto; commit final a cargo del estudiante | pendiente |

## Registro mínimo de intervención
Prompts: recorrido completo de los pasos 1 a 8 de la guía con la variante A; el único cambio relevante respecto del A* previo es un parámetro opcional de costos de entrada (`entryCosts`) y la suma real de `totalCost`.
Decisión tras incremento 1: aceptar — A* ponderado con prueba de franja, restauración y caso unitario; 15 pruebas en `tests/navigation/search.test.ts`, diff mínimo y typecheck limpio.
Decisión tras incremento 2: aceptar — `calculateRoute` propaga los costos de forma explícita; prueba de consumidor 4/4 y el modo unitario existente intacto.
Validación final: `npm run validate` = typecheck + `vitest run` (19 archivos / 178 pruebas) + `vite build`, todo correcto.
Diff revisado: `src/domain/navigation/search.ts`, `src/application/simulation/navigationDemo.ts`, `tests/navigation/search.test.ts`; nuevos `tests/navigation/fixture5x3.test.ts`, `tests/application/navigationDemo.test.ts` y `docs/practica-navegacion/`. Sin cambios en FSM, percepción, grid, puertas ni escena.
Conclusión: en el mapa libre unitario BFS y A* coinciden en 4 pasos y costo 4, pero A* expande menos nodos (5 frente a 12). Con la franja lenta de costo 5, la ruta más corta por pasos (4 pasos, costo 16) deja de ser la preferida y el A* ponderado elige un rodeo de 6 pasos con costo 6, respetando la intención de minimizar costo. La capacidad se reutilizó extendiendo el A* existente con un mapa opcional de costos de entrada, sin algoritmo nuevo y sin alterar BFS ni el caso unitario. Por eso, para terreno lento conviene A* ponderado y no BFS, que sólo cuenta pasos.
Limitaciones: el repositorio sigue sin remoto confirmado y el commit final lo crea el estudiante; la simulación completa (`guardSimulation`) no consume todavía perfiles de costo, ya que el alcance fija `calculateRoute` como consumidor de navegación. No se agregó instrumentación de telemetría.
