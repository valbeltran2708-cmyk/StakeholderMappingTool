# Changelog

## 1.10.8 - Numeros uniformes de verdad, espaciado separado, rects mas anchos, dashboard con aire

- Numeros dentro de los circulos "del mismo tamano": ahora son realmente iguales
  en todos los cuadrantes. Antes los de bajo poder salian mas grandes porque el
  numero heredaba la escala del circulo; se neutraliza esa escala.
- Espaciado entre columnas de la leyenda en DOS controles separados: uno para
  esferas/dimensiones/relaciones y otro para el indice de actores.
- Los rectangulos de los nodos son un poco mas anchos que altos (mejor para el
  texto), en vez de cuadrados.
- Mas separacion vertical entre los bloques del resumen ejecutivo.

## 1.10.6 - Forma de los nodos (circulo o rectangulo redondeado)

- Nueva opcion en el panel Vista: "Forma de los nodos" con Circulo (por defecto)
  o Rectangulo de esquinas levemente redondeadas. Pensada para mejorar la
  lectura en la vista de cuadrante, pero funciona en todas las vistas y se
  refleja al exportar la figura.

## 1.10.5 - Tamano uniforme de los numeros en los circulos

- Al exportar con "Numero" dentro de los circulos, se puede elegir un tamano
  unico para todos los numeros y ajustarlo manualmente (antes cada numero
  tomaba el tamano de su circulo, por eso se veian de distinto tamano).
  Control nuevo en la pestana Etiquetas: "Numeros del mismo tamano" + tamano.

## 1.10.4 - Logo, fecha en salidas, pie en Contenido y columnas mas juntas

### Logo en la barra superior
- Nuevo: se puede mostrar un logo (Arup u otro) en la barra superior del HTML.
  Basta con dejar un archivo `logo.png` (o .jpg/.svg) en la carpeta desde donde
  se ejecuta el comando y el codigo lo detecta e incrusta solo. Tambien
  `--logo RUTA` para indicar otra ubicacion y `--logo-position left|right` para
  elegir el lado (por defecto: derecha).

### Salidas con fecha
- Los archivos de salida se nombran con la fecha del dia como prefijo
  (formato AAMMDD, p. ej. `260709_stakeholder_map.html`).

### Exportar
- El "Pie de figura" se movio a la pestana Contenido (junto a titulo, subtitulo
  y extras); se elimino la pestana "Pie" separada.
- El espaciado entre columnas ahora admite valores negativos: se pueden juntar
  las columnas del indice al maximo, incluso encimandolas, asi la imagen no se
  ensancha de mas por culpa de los nombres largos.

## 1.10.3 - Arreglos: color de cuadrante en pantalla y espaciado de columnas

### Cuadrante (Mendelow)
- Blancos por defecto (como se pidio). Y ahora, al cambiar un color por zona o
  por celda en el panel Vista, el cambio SE VE en el HTML en pantalla, no solo
  al exportar. La causa era una regla CSS (.qcell{fill:#ffffff}) que
  sobrescribia el color elegido en el navegador; se elimino, y el blanco por
  defecto ahora viene del atributo, que si se puede cambiar.

### Exportar: espaciado entre columnas
- Las columnas de la leyenda y del indice ahora usan ancho POR COLUMNA (cada una
  solo lo que necesita su contenido), asi el espaciado bajo las junta de verdad
  y no quedan lejos por culpa del nombre mas largo. El valor por defecto bajo a
  12 y admite hasta 0 (bien juntas).

## 1.10.2 - Colores de cuadrante y del panel

### Vista de cuadrante (Mendelow)
- Las celdas ya muestran color por defecto, con un tinte sutil por zona
  (gestionar de cerca / mantener satisfecho / mantener informado / monitorear),
  asi se distinguen de un vistazo sin tener que colorearlas a mano. Los
  selectores "por zona" y "por celda" parten de esos tintes y siguen
  permitiendo personalizar; la imagen exportada hereda los colores.

### Panel derecho
- Se reemplazaron los colores sueltos por los tokens de marca: la nota de
  estrategia usa el azul primario y las listas de relaciones un gris neutro,
  coherente con el resto de la interfaz.

## 1.10.1 - Panel derecho y espaciado de columnas

### Panel derecho (detalle del actor)
- Encabezado propio con la X (cierra el panel y le da todo el ancho al mapa) y
  cuerpo con scroll y mas aire entre secciones.
- Mini-mapa de conexiones directas (ego-red): el actor al centro y sus vecinos
  alrededor, coloreados por esfera y unidos por lineas segun efecto
  (apoyo/oposicion/neutral). Clic en un vecino abre su ficha. Actores sin
  relaciones no muestran mini-mapa.

### Exportar: espaciado entre columnas
- El control de espaciado ahora separa las columnas de verdad (antes, en
  Automatico, subir el valor reducia el numero de columnas en vez de
  separarlas). El conteo de columnas ya no depende del espaciado, y la figura
  se ensancha para alojar las columnas separadas. Aplica tanto al indice de
  convenciones como a las columnas de la leyenda (esferas, dimensiones,
  relaciones). La previsualizacion responde al instante.

## No publicado - rama refactor/modular

### Estructura (sin cambios de comportamiento; salida byte a byte idéntica)
- El `app.js` monolítico (~1150 líneas) se dividió en módulos por
  responsabilidad en `render/assets/js/`, que `render/html.py` concatena en
  orden al generar: `01_boot`, `02_i18n`, `03_layout_view`, `04_interaction`,
  `05_export`, `06_colors_labels`, `07_lang_init`. Ver `assets/js/README.md`.
- `render/html.py` (~456 líneas) se dividió en `render/util.py` (assets/escape),
  `render/typography.py` (color de letra, ajuste de fuente, salto de línea: "la
  letra"), `render/svg_parts.py` (aristas, anillos, rejilla de cuadrante, nodos,
  leyendas), `render/controls.py` (selectores de color del panel) y un
  `render/html.py` que solo orquesta.
- Objetivo: que un cambio de letra, formato, color, exportación o layout quede
  contenido en su archivo y no arrastre el resto. Los tests generan el mismo
  Hex/HTML que antes, así que la red de seguridad valida que nada cambió.
- Se eliminó la carpeta `examples/` y los datos de muestra: la herramienta es
  replicable y genérica; la plantilla en blanco se genera con
  `tools/make_template.py` y cada quien trae sus propios datos.

## 1.9.7 (2026-07-08)

### Corregido
- Los selectores de color ya NO usan el `<input type="color">` nativo, que en
  visores embebidos abría un diálogo del sistema y dejaba la página inerte
  (solo respondía al tabulador, el mouse dejaba de clickear). En su lugar hay
  un selector propio dentro del HTML: un botón-muestra que abre un popover con
  una paleta y un campo hexadecimal. Nunca abre un diálogo del sistema, así que
  no atrapa el foco. Aplica a anillos, zonas de cuadrante y celdas.

### Nuevo
- El botón de idioma ES/EN ahora también cambia las etiquetas de los círculos
  (los nombres de los actores): en inglés muestra el Nombre (EN) / Alias (EN)
  de cada entidad; si una entidad no tiene versión en inglés, se queda con el
  texto en español.
- En la tarjeta Vista hay un control "Etiqueta de los nodos" para alternar en
  vivo entre Alias y Nombre completo en el mapa (antes solo se elegía en la
  imagen exportada). Se combina con el idioma: alias/nombre en español o en
  inglés según corresponda.

## 1.9.6 (2026-07-07)

### Corregido
- Los selectores de color (anillos y cuadrantes) usaban `oninput`, que dispara
  en cada micro-cambio mientras el selector nativo está abierto y re-renderiza
  sin parar; en visores embebidos eso podía dejar el selector "pegado". Ahora
  aplican con `onchange` (al cerrar el selector), lo que elimina ese problema.

### Cambiado
- Las celdas del cuadrante ahora son BLANCAS por defecto (antes un semáforo
  tenue). El color es opcional y manual, con dos formas:
  - Por zona de Mendelow: cuatro selectores (gestionar de cerca, mantener
    satisfecho, mantener informado, monitorear) que tiñen todas las celdas de
    esa zona.
  - Por celda: cada celda interés x poder se puede colorear por separado, ya
    sea con clic sobre la celda en el cuadrante o desde la mini-rejilla de
    selectores del panel. El fondo del cuadrante se dibuja como una celda por
    combinación de niveles, con su zona de Mendelow asociada.
- La imagen exportada hereda estos colores (se clona el SVG en vivo).

## 1.9.5 (2026-07-07)

### Nuevo
- El índice de "Convenciones" de la imagen ahora deja elegir qué muestra cada
  entrada: nombre completo con sigla (por defecto), solo el nombre completo, o
  solo el acrónimo. Aplica en cualquier modo de círculo que genere índice
  (Número, o Acrónimo/Nombre con la numeración de largos activada) y el ancho
  de columnas se ajusta al texto elegido.

## 1.9.4 (2026-07-07)

### Nuevo
- En la imagen exportada, la etiqueta dentro de los círculos es un selector de
  tres modos intercambiables: Acrónimo (la sigla, o el nombre si no hay sigla),
  Nombre completo, o Número (todos los círculos numerados, con el glosario
  completo de "Convenciones" mapeando número a nombre y sigla). La casilla
  "Numerar si supera N caracteres" sigue disponible como refinamiento de los
  modos Acrónimo y Nombre (numera solo los que se pasan de largo); en el modo
  Número se numeran todos.

## 1.9.3 (2026-07-07)

### Nuevo
- El diálogo de imagen permite elegir a mano el número de columnas del índice
  de "Convenciones" (o dejarlo en Automático) y el tamaño de letra del índice.
  Al fijar columnas, el reparto las respeta: a la derecha el panel se ensancha
  para alojarlas sin cortar nombres; abajo se divide el ancho de la figura. El
  modo Automático se adapta al tamaño de letra elegido (una letra más grande
  ocupa más y dispara antes el paso a varias columnas).

## 1.9.2 (2026-07-07)

### Cambiado
- El reparto en varias columnas del índice de "Convenciones" ahora aplica
  también cuando la leyenda de la imagen se coloca a la derecha, no solo
  abajo. El panel derecho crece lo necesario para alojar las columnas sin
  cortar los nombres, y el número de columnas se limita para no exceder el
  alto de la figura (mismo criterio que en la leyenda inferior).

## 1.9.1 (2026-07-07)

### Corregido
- La leyenda de "Convenciones" (índice número → nombre completo, que aparece al
  numerar nombres largos en la imagen) se reparte ahora en varias columnas
  cuando la lista se alarga, acotada al alto de la figura (el cuadro en
  cuadrante, los anillos en radial), sin cortar nunca los nombres. El número de
  columnas se elige para no exceder ese alto y, a la vez, para que cada columna
  sea suficientemente ancha para el nombre más largo; si ambas condiciones no
  caben, prima no truncar. Listas cortas siguen en una sola columna.
- La entrada "En ambas dimensiones" / "En varias dimensiones" (borde de las
  entidades que aparecen en más de una dimensión) volvió a mostrar su texto en
  la leyenda lateral y en el filtro. En la refactorización bilingüe había
  quedado ligada a una clave vacía; ahora usa la etiqueta correcta según el
  número de dimensiones y se traduce con el botón ES/EN.

## 1.9.0 (2026-07-07)

### Nuevo
- Interfaz bilingüe español / inglés con un botón ES/EN en la barra superior.
  Cambia todos los rótulos de la herramienta (paneles, filtros, "cómo leer",
  leyendas, buscador, ficha de detalle, diálogo de imagen, mensajes) y también
  las etiquetas de las vistas: cuadrante de Mendelow y ejes se muestran en el
  idioma activo, y la figura exportada hereda ese idioma.
- Traducción de los términos de datos (esferas, dimensiones, categorías, tipos
  de relación) mediante un bloque "Traducciones" en 03_Config con columnas
  "Término (ES)" y "Término (EN)". El valor interno permanece en español, así
  que los filtros siguen funcionando; solo cambia el texto visible.
- Nombres de entidad bilingües mediante columnas "Nombre (EN)", "Alias (EN)" y
  "Descripción (EN)" en 01_Stakeholders, que el usuario llena. La herramienta
  NO traduce automáticamente nombres de instituciones: mostrar una traducción
  inventada de un nombre propio sería un dato falso. Si una celda EN está
  vacía, se usa el nombre en español.
- Fondo de color por zona de Mendelow en la vista de cuadrante (semáforo
  tenue): gestionar de cerca, mantener satisfecho, mantener informado y
  monitorear, cada una con su tinte, para leer la estrategia sin recorrer los
  ejes. El fondo tiñe la zona sin competir con el color de esfera de los
  círculos.
- Control dinámico de colores en pantalla y en la exportación: un selector por
  cada anillo de interés (radial) y uno por cada zona de cuadrante. Como la
  imagen se genera clonando el SVG en vivo, lo que se ve en el mapa es lo que
  se exporta. Los colores de anillos y zonas son andamiaje (nivel de interés,
  zona de Mendelow), no datos por actor; por eso son configurables, mientras
  que el recoloreo por actor sigue sin permitirse.

### Notas
- El buscador indexa también los nombres en inglés, de modo que una entidad se
  puede encontrar por su nombre en cualquiera de los dos idiomas.
- Con fondo transparente en la exportación, los textos en gris oscuro pueden
  perderse sobre diapositivas oscuras; usar fondo blanco en ese caso.

## 1.8.0 (2026-07-07)

### Nuevo
- Bandas de fondo grises por nivel de interés en la vista radial: un disco
  por nivel, del interior oscuro (interés mayor) al exterior claro (interés
  menor), para identificar de un vistazo a qué anillo pertenece cada actor.
  El color del nodo sigue siendo su esfera; el gris va solo en el fondo. Se
  ocultan con la casilla de anillos y en cuadrante/red, escalan con la
  separación de anillos, van detrás de los nodos y se exportan sin cortarse
  (los discos que no caben se eliminan, no se amputan). Efecto útil con
  escalas de pocos niveles; con muchos, los tonos quedan muy juntos.
- Índice de "Convenciones" (numeración de nombres largos) a dos columnas
  cuando la leyenda va abajo, hay al menos 6 entradas y el ancho de columna
  alcanza para el nombre completo; en otro caso, una columna. Los nombres
  se muestran íntegros, nunca truncados.

### Nota
- No hay recoloreo manual por actor: el color del círculo representa la
  esfera (dato del Excel). La exportación permite Color o Escala de grises
  de toda la figura, pero no repintar actores individuales.


## 1.7.0 (2026-07-07)

### Exportación de imagen
- Nada se corta: en radial el marco se centra en el origen y cubre todos
  los nodos; los anillos de interés que no caben completos se eliminan
  del archivo en lugar de quedar amputados en el borde. Margen ampliado
  para que las curvas de las relaciones tampoco se recorten.
- Posición de la leyenda: abajo (como antes) o a la derecha en columna.
- Leyenda de tamaño = poder como círculos concéntricos con degradado de
  grises (interior oscuro = menor poder, exterior claro = mayor); también
  en la tarjeta "Cómo leer" del panel.
- Fondo del PNG y del SVG: blanco o transparente.
- Numeración de nombres largos: si la etiqueta elegida supera N
  caracteres (configurable), el círculo muestra un número y se añade un
  bloque "Convenciones" con el índice "N. Nombre completo (Alias)",
  ordenado alfabéticamente. Los nombres cortos conservan su etiqueta.
- Tipografía Times New Roman añadida a las opciones.
- Pie de figura con interruptor para incluirlo u omitirlo.


## 1.6.0 (2026-07-06)

### Nuevo
- Campo "Alias / acrónimo" (columna L de 01_Stakeholders, opcional, al
  final para no mover columnas existentes): el alias se muestra dentro
  del círculo y en la lista de actores clave; el nombre completo aparece
  en la ficha, el tooltip y el buscador (que también encuentra por
  alias).
- Diálogo "Imagen para reporte" para exportar o copiar la imagen (botón
  en la tarjeta Exportar y en la barra del mapa). Controla propiedades de
  la IMAGEN sin tocar el mapa en pantalla: título y subtítulo editables,
  etiquetas con alias o nombre completo, color o escala de grises,
  tipografía (Arial, Georgia, Calibri), bloques de leyenda a incluir
  (esferas, dimensiones, relaciones, tamaño = poder), tipos de relación a
  incluir solo en la imagen, resolución PNG 2x o 3x, y pie de figura con
  número, fuente y fecha. Salida SVG (vectorial, para informes) o PNG.
  Tonos neutros. Qué actores se ven lo siguen decidiendo los filtros del
  panel: lo que ves es lo que se exporta.
- Las aristas llevan data-type, lo que corrige la identificación ambigua
  de tipo cuando hay varias relaciones entre el mismo par.


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
