Trabajamos sobre mi repositorio individual de Guardia de Sigilo.

Mi intención de diseño es:

1. El guardia patrulla entre 2 puntos 
2. Al llegar a uno de los puntos mira en las 4 direcciones
3. Si el campo de vision del guardia detecta al jugador este lo sigue
4. Si el jugador sale del campo de vision el guardia se dirige hasta el ultimo punto donde lo vio y mira en las 4 direcciones
5. Si despues de esto no encuentra al jugador vuelve al punto de patrulla mas cercano para continuar su patrulla

El requisito que quiero comprobar es: 

- El dominio no puede importar Phaser, DOM ni APIs del navegador.
- Percepción, memoria, decisión, búsqueda, seguimiento y locomoción deben
  permanecer separados.
- Visión tiene prioridad sobre sonido y la última posición conocida cambia sólo
  ante una percepción válida.
- Cada transición debe producir telemetría observable.
- No agregar dependencias, no usar red, no acceder a secretos ni publicar.

Quiero preparar el upgrade: Sistema_Patrullaje_Guardia.

Explorá sólo en modo lectura. Leé README.md, AGENTS.md, la arquitectura,
los hitos, las pruebas y el código relacionado. No modifiques archivos, no
ejecutes comandos ni instales dependencias.

Decime:
1. Qué ya existe, con rutas o símbolos.
2. Qué podría reutilizarse.
3. Qué restricciones debo respetar.
4. Qué datos faltan para escribir una spec.

Luego usá la herramienta `question` para preguntarme únicamente las decisiones
de diseño que no puedas comprobar en el repositorio.

Cuando responda, redactá una spec breve con objetivo, alcance, restricciones,
criterios de aceptación y evidencia prevista. No generes código todavía.