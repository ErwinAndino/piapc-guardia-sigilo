Trabajamos sobre mi repositorio individual de Guardia de Sigilo.

Upgrade seleccionado: Cono de visión visible y reactivo - Claridad de alcance y amenaza.

Mi intención de diseño: Que el jugador pueda identificar de forma clara el alcance de la visión del guardia, y que este cambio de manera observable ante un aumento o disminución de la amenaza, sin romper la separación entre dominio y motor.

Requisito inicial: Debe ocurrir lo siguiente de forma observable:

- El guardia presenta un cono de visión visible, dibujado por código, que representa su alcance de detección.
- Al producirse un cambio de estado relevante (ej: patrulla -> alerta -> persecución) o ante un evento de detección, el cono debe cambiar de manera observable (ej: color, opacidad, apertura o longitud) para reflejar el aumento de amenaza.
- Al cesar la amenaza o volver a un estado seguro, el cono debe restaurarse a su estado previo de forma completa.
- Esta representación visual debe ser coherente con las reglas de visión ya existentes dentro del proyecto, sin modificar dichas reglas para adaptarse al efecto.

Explorá sólo en lectura README, AGENTS, arquitectura, código y pruebas
relacionados. No modifiques archivos, ejecutes comandos ni instales dependencias.

Mostrá lo siguiente, con rutas y símbolos concretos:

- Qué existe: ¿Hay algún sistema de visión ya implementado? (ej: FOV, cone, sight, detection, raycast, campo de visión). Indicar archivo, clase, función y como es utilizado.
- Qué se reutiliza: ¿Existen estados de guardia (enum/tipo/state machine) a los cuales se pueda vincular este cambio reactivo? ¿Existe algún sistema de renderizado para dibujar formas por código (Phaser Graphics, draw, debug, etc)? ¿Hay algún debug de visión ya presente?
- Restricciones aplican: Verificá las limitaciones de AGENTS.md y arquitectura (src/domain/ sin Phaser/DOM, src/application/ coordinando, src/game/ adaptando, recursos externos prohibidos - dibujado por código, no agregar dependencias).

Separá tu respuesta en:

- Evidencia: Hallazgos con rutas exactas y fragmentos que lo respalden (ej: "src/game/scene.ts:XX - utiliza Graphics").
- Supuestos: Aquellos que realizaste al leer el código.
- Preguntas: Decisiones de diseño que no puedas comprobar con el repositorio.

Consultame las decisiones de diseño que no puedas comprobar; usá question
si tu herramienta lo permite. No las inventes.

Con mis respuestas, redactá una spec breve con:

- Objetivo
- Alcance
- Exclusiones (fuera de alcance)
- Restricciones
- Caso normal
- Caso límite
- Criterios de aceptación (verificables y observables)
- Evidencia prevista (ej: comandos de validación a utilizar, como `npm run validate`, build, o prueba enfocada, junto a como reproducir el cambio visual de forma observable)

No implementes todavía; esperá mi revisión.
