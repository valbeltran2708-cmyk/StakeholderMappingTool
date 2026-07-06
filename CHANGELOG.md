# Changelog

## 1.5.0 (2026-07-06)

### Nuevo
- Filtro "Importancia en el proyecto" por casillas: un checkbox por nivel
  de la escala (seleccionables individualmente) más "(Sin valor)" cuando
  hay actores sin dato. Compone con los demás filtros y el mapa se
  reordena con la selección. El filtro solo aparece si los datos traen la
  columna.
- Nueva columna J "Importancia en el proyecto" en 01_Stakeholders (Notas
  pasa a K) con desplegable, y columna J "Escala de importancia" en
  03_Config (Dimensiones pasa a L y su color a M), con niveles de menor a
  mayor (sugerencia: Baja / Media / Alta). Los archivos con el orden
  antiguo de columnas siguen funcionando porque la lectura es por nombre
  de cabecera.
- La importancia se muestra en la ficha del actor y se exporta en el CSV
  de estrategia. En actores presentes en varias dimensiones se toma la
  MAYOR importancia entre sus filas (mismo criterio de riesgo que interés
  y poder). Se avisa en validación si la columna se usa pero quedan
  actores sin valor.


## 1.4.0 (2026-07-06)

### Cambiado
- La agrupación por esferas en la vista radial se mantiene como criterio de
  ORGANIZACIÓN, pero ya no se dibujan líneas divisorias ni rótulos de
  sector (se elimina también la casilla "Sectores por esfera").
- Buscador rediseñado: lista de sugerencias con esfera y dimensión de cada
  coincidencia, búsqueda insensible a tildes, Enter selecciona la primera,
  Escape y botón × limpian, y si el actor está oculto por los filtros se
  abre igual su ficha con un aviso.
- Al aislar los actores clave (u otro filtro pequeño) en la vista radial,
  el zoom conserva el contexto de los anillos en lugar de cerrarse sobre
  el grupo (piso de zoom solo en radial).
- Panel izquierdo más ancho (352px) y lista de actores clave con más aire.

### Nuevo
- Entidades presentes en varias dimensiones: borde negro propio con
  entrada "En ambas dimensiones" (o "En varias" si hay más de dos) en la
  leyenda, y opción equivalente en el filtro de Dimensión para ver SOLO
  esas entidades. Con una dimensión filtrada siguen apareciendo, como
  hasta ahora.

### Limpieza
- El repositorio queda general, sin datos ni residuos de ejemplo: se
  elimina tools/make_demo_data.py y el mapeo legado de dimensiones del
  proyecto original; los colores por defecto cableados desaparecen y las
  esferas o tipos de relación sin color en 03_Config reciben color
  automático de una paleta neutra; la plantilla trae sugerencias
  genéricas y ya no incluye fila de ejemplo.


## 1.3.0 (2026-07-06)

### Nuevo
- Vista radial dividida en sectores por esfera, con arco PROPORCIONAL al
  número de actores visibles de cada una (con un piso mínimo para esferas
  pequeñas). Líneas divisorias y rótulo de cada sector; casilla "Sectores
  por esfera" para ocultarlos. Con filtros activos los sectores se
  recalculan sobre lo visible.
- El interés máximo llega ahora casi al centro (R_IN pasa de 150 a 70 en
  config.py): desaparece el disco vacío central.
- Leyenda flotante sobre el mapa: botón "Leyenda" en la barra inferior
  abre un panel con esferas, dimensiones, relaciones y efecto; sus
  elementos también filtran al hacer click.
- Terminología: "Categoría" pasa a llamarse "Esfera" en toda la interfaz,
  plantilla y CSV de estrategia. Los Excel con la columna antigua siguen
  funcionando.
- Nueva columna "Categorías" en 01_Stakeholders: etiquetas temáticas
  múltiples por actor (separadas por ";" o ","), por ejemplo Knowledge &
  Prevention, Risk Reduction, Disaster Management, Climate Finance. Se
  muestran como etiquetas en el panel de detalle, habilitan un filtro
  propio (solo aparece si hay etiquetas en los datos) y se exportan en el
  CSV de estrategia. En la fusión multi-dimensión se unen las etiquetas
  de todas las filas del actor.


## 1.2.0 (2026-07-06)

### Nuevo
- Panel izquierdo reorganizado en tarjetas plegables: abiertas por defecto
  solo Vista, Filtros y Actores clave; Cómo leer, Leyendas, Exportar y
  Validación quedan plegadas para navegar menos.
- Tarjeta "Actores clave": shortlist Top 5 / Top 10 por interés + poder
  (normalizados y sumados) o por número de conexiones, con la opción
  "Mostrar solo estos en el mapa" que aísla la shortlist en la vista
  activa (se compone con los demás filtros y respeta la dimensión
  seleccionada). Reemplaza la tarjeta "Más conectados".
- Terminología: "Fuente / tema" pasa a llamarse "Dimensión" en toda la
  interfaz, la plantilla y el CSV de estrategia. Los Excel existentes con
  las columnas antiguas ("Tema / fuente", "Tema de la relación",
  "Temas / fuentes") siguen funcionando sin cambios.


## 1.1.1 (2026-07-03)

### Corregido
- Vista de conexiones: eliminada una ruta en la que el recorte al lienzo
  podía reintroducir un solape tras el último ciclo de separación, y la
  falta de verificación final en grafos densos. Ahora (en Python y en el
  JS) el radio uniforme se adapta al número de nodos VISIBLES, se verifica
  el resultado y, si queda algún roce, se reduce el radio y se repite
  hasta garantizar cero solapes dentro del lienzo. Con pocos nodos
  filtrados el radio crece para mejorar la lectura.
- Etiquetas de nodo sin halo: texto negro o blanco puro según la
  luminancia del relleno.
- Etiquetas de los anillos de interés (leyenda del eje radial) dibujadas
  por encima de los nodos, con halo blanco propio, para que los círculos
  que caen sobre el anillo no las tapen.


## 1.1.0 (2026-07-03)

### Nuevo
- Motor de layout dinámico en el navegador: las tres vistas recalculan
  posiciones con el subconjunto visible al cambiar cualquier filtro
  (categoría, tema, subdivisiones), sin huecos y sin solapes.
- Cuadrante: círculos de tamaño uniforme empaquetados en rejilla dentro
  de cada celda (la posición ya codifica interés y poder); títulos de eje
  "Interés en el proyecto" y "Poder e influencia sobre el proyecto" en
  español, inglés o bilingüe (`UI_LANG` en config.py), colocados fuera de
  las marcas para que nunca se crucen.
- Colores de tema definidos en el Excel: nueva columna "Color HEX" junto a
  "Temas / fuentes" en 03_Config; define el borde de los nodos y la
  leyenda de temas (con color automático si se deja vacía).

### Corregido
- Radial: los nodos ya no se salen de su banda de interés al resolver
  colisiones (separación tangencial + resorte fuerte); un actor con
  interés máximo queda pegado al centro.
- Cuadrante: eliminados los solapes entre círculos en todos los casos.
- Etiquetas de nodo: fuente mínima de 8px con truncado "…" en lugar de
  texto ilegible.

### Interno
- Eliminados los precálculos por tema y por subdivisión en Python
  (themes.py, ex/ey, tpos/tquad): el JS los reemplaza con layout en vivo.


## 1.0.0 (2026-07-03)

Primera versión modular (antes: script único `stakeholder_map_v8.py`).

### Nuevo
- Repositorio con paquete instalable (`pip install -e .`) y comando
  `stakeholder-map`; código separado por módulos (config, escalas,
  lectura, layouts, render, export, CLI).
- Hoja única de configuración `03_Config` (categorías + colores, tipos de
  relación + estilo, escalas y temas). Las hojas separadas 03A/03B/03D
  del formato antiguo siguen funcionando.
- Escalas en dos modos: etiquetas (Bajo/Medio/Alto...) o **numéricas
  continuas** con decimales (1, 1.1, 3.5) para desagregar la importancia
  relativa; anillos y matriz usan marcas enteras; valores fuera de la
  escala explícita se recortan con aviso.
- Selector de carpeta de resultados en modo interactivo y `--open` para
  abrir el HTML al terminar.
- Plantilla Excel rediseñada: 3 hojas, desplegables alimentados desde
  03_Config con validación tipo aviso (permite decimales y valores
  nuevos), comentarios de ayuda en cabeceras y muestras de color.
- Tema visual con el rojo de Arup como acento configurable en
  `config.py`.

### Corregido
- Vista "Conexiones": los círculos ya no quedan montados unos sobre
  otros. La separación de colisiones ahora se aplica después del
  reescalado al lienzo, el radio uniforme es adaptativo al número de
  nodos y el control de separación reescala el radio para no reintroducir
  solapes.
- Etiquetas de anillo sin el prefijo "INTERÉS" (configurable con
  `RING_LABEL_PREFIX` en `config.py`).
- Contraste de las etiquetas de nodo: color de texto y halo se calculan
  por nodo según la luminancia del relleno.
- El JSON incrustado ya no se escapa como HTML (evita fallos de
  `JSON.parse` con datos que contengan comillas).

### Pruebas
- Suite pytest: escalas (categórica, numérica, comas decimales, recorte),
  red sin solapes en grafos densos, parseo de 03_Config y flujo completo.
