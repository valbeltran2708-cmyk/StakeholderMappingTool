# Módulos JavaScript (se ensamblan en orden por nombre)

`render/html.py` concatena estos archivos (01_, 02_, ...) en un único bloque
`<script>` embebido. Cada uno cubre una responsabilidad, para que un cambio en
uno no afecte a los demás:

- `01_boot.js`         Apertura del IIFE, parseo de datos, índices de nodos/aristas.
- `02_i18n.js`         Diccionario de idiomas ES/EN, traducción de términos y de nombres de nodo.
- `03_layout_view.js`  Estado, geometría, layouts (radial/cuadrante/red), posiciones, aristas, anillos, zoom.
- `04_interaction.js`  Filtros, foco en entidad, cambio de vista, ficha de detalle, buscador, actores clave.
- `05_export.js`       Imagen para reporte (SVG/PNG), CSV, numeración e índice de convenciones.
- `06_colors_labels.js` Selector de color propio, modos de color del cuadrante, etiqueta de nodo (alias/nombre).
- `07_lang_init.js`    Aplicación del idioma en toda la interfaz, arranque y cierre del IIFE.

Comparten un mismo ámbito (todo va dentro de un IIFE), así que el orden importa:
`01_` abre y `07_` cierra. No renumeres sin cuidado.
