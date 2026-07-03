# Mapa interactivo de stakeholders

Herramienta en Python que convierte un Excel estructurado en un mapa
interactivo de stakeholders en un solo archivo HTML (sin servidor, sin
dependencias en el navegador), con tres vistas:

1. **Poder–interés (radial)**: distancia al centro = interés, tamaño del
   círculo = poder, color = categoría, borde = tema/fuente.
2. **Conexiones (red)**: distribución por relaciones (systems thinking),
   círculos de tamaño uniforme.
3. **Cuadrante (Mendelow)**: matriz interés x poder con las cuatro zonas
   de estrategia.

Además exporta tablas (XLSX de coordenadas y CSVs) y, desde el propio
HTML, imágenes PNG/SVG y un CSV de estrategia por actor.

Los datos de `examples/` son ficticios, solo para demostración.

## Instalación

Requiere Python 3.9+.

```bash
git clone https://github.com/TU_USUARIO/stakeholder-map.git
cd stakeholder-map
pip install -e .
```

`-e` (editable) hace que cualquier cambio en el código se refleje sin
reinstalar. Para correr los tests: `pip install -e .[dev]` y `pytest`.

## Uso

```bash
# Interactivo: diálogo para elegir el Excel y la carpeta de resultados,
# y abre el HTML en el navegador al terminar
stakeholder-map

# No interactivo (scripts, CI)
stakeholder-map -i datos.xlsx -o resultados/
stakeholder-map -i datos.xlsx -o resultados/ --open
```

También funciona `python -m stakeholder_map ...`.

## Formato del Excel de entrada

Genera la plantilla con `python tools/make_template.py` (queda en
`examples/stakeholder_input_TEMPLATE.xlsx`). Son solo 3 hojas:

| Hoja | Contenido |
|---|---|
| `01_Stakeholders` | Un actor por fila: nombre, nivel (Entidad/Subdivisión), entidad padre, tema/fuente, categoría, descripción, interés, poder, notas. |
| `02_Relaciones` | Una relación por fila: origen, destino, tipo, fuerza 1-5, dirección, efecto (positiva/negativa/neutral), tema, descripción. |
| `03_Config` | TODA la configuración en una hoja: categorías + color, tipos de relación + color + estilo de línea, escalas de interés y poder, y temas. Las listas desplegables de las hojas de datos se alimentan de aquí. |

Reglas que conviene conocer:

- **Escalas en dos modos.** Etiquetas (`Bajo`, `Medio`, `Alto`, en español
  o inglés, o las que definas en `03_Config`) O números. Si la columna es
  100% numérica, el posicionamiento y el tamaño son **continuos**: puedes
  escribir `1`, `1.1`, `3.5`, `4.8` para desagregar la importancia
  relativa entre entidades; los anillos y la matriz usan las marcas
  enteras de la escala. No mezcles etiquetas y números en una misma
  columna (la herramienta lo detecta y avisa).
- **Multi-tema.** Repite el mismo nombre de actor en varias filas, una por
  tema, con puntuaciones propias. Se fusionan en un nodo (interés/poder =
  el mayor, criterio de mayor riesgo) y el desglose por tema queda
  disponible en el panel de detalle y en el filtro "Fuente / tema", que
  reposiciona y redimensiona cada actor según ese tema.
- **Subdivisiones.** `Nivel = Subdivisión` + nombre exacto del padre en
  `Entidad padre / grupo`. Click en la entidad padre abre su mapa local.
- **Validaciones amables.** Los desplegables de interés/poder, categoría,
  tema, tipo y origen/destino son sugerencia, no bloqueo: Excel pregunta
  antes de aceptar un valor fuera de lista (así puedes escribir decimales
  o valores nuevos). Nivel, dirección y efecto sí son listas cerradas.
- La herramienta también acepta el Excel de coordenadas que ella misma
  exporta (`stakeholder_map_coordinates.xlsx`) como entrada rápida, y las
  hojas separadas `03A/03B/03D` del formato antiguo.

Prueba todo con el dataset de ejemplo:

```bash
python tools/make_demo_data.py
stakeholder-map -i examples/ejemplo_movilidad.xlsx -o outputs/ --open
```

## Estructura del repositorio: qué tocar para qué

```
stakeholder-map/
├── pyproject.toml                  Metadatos, dependencias, comando stakeholder-map
├── README.md
├── CHANGELOG.md
├── src/stakeholder_map/
│   ├── config.py                   ← Colores, tema UI (rojo Arup), tamaños, prefijo de anillos
│   ├── cli.py                      ← Argumentos de línea de comandos y diálogos
│   ├── core.py                     ← Pipeline: lectura, fusión multi-tema, validaciones
│   ├── excel_io.py                 ← Lectura de hojas y de la configuración (03_Config y legado)
│   ├── scales.py                   ← Escalas categóricas y numéricas continuas
│   ├── normalize.py                Limpieza de celdas, slugs, polaridad
│   ├── export.py                   Salidas XLSX/CSV
│   ├── layouts/
│   │   ├── radial.py               ← Resolución de solapes en la vista radial
│   │   ├── network.py              ← Vista de conexiones (radio adaptativo, sin solapes)
│   │   ├── quadrant.py             ← Matriz de Mendelow
│   │   └── themes.py               Lente temática (posiciones por tema)
│   └── render/
│       ├── html.py                 ← Ensamblado del HTML (SVG de nodos, anillos, leyendas)
│       └── assets/
│           ├── template.html       ← Estructura y textos del panel izquierdo
│           ├── styles.css          ← Aspecto (variables de color al inicio)
│           └── app.js              ← Interacción: filtros, vistas, exports, foco
├── tools/
│   ├── make_template.py            Genera la plantilla Excel
│   └── make_demo_data.py           Genera el dataset ficticio de ejemplo
├── tests/                          pytest: escalas, red sin solapes, config, end-to-end
├── examples/                       Plantilla y demo (datos ficticios)
└── docs/                           Presentación explicativa (.pptx) y material de apoyo
```

Casos típicos:

- Cambiar el color de acento o el título: `config.py` (`ARUP_RED`, `THEME`,
  `APP_TITLE`).
- Cambiar tamaños de círculo o radios de anillos: `config.py` (`S_MIN`,
  `S_MAX`, `R_IN`, `R_OUT`).
- Cambiar textos o tarjetas del panel: `render/assets/template.html`.
- Cambiar el aspecto (fuentes, bordes, sombras): `render/assets/styles.css`.
- Cambiar el comportamiento interactivo: `render/assets/app.js`.
- Cambiar cómo se leen los Excel: `excel_io.py` y los mapeos de columnas
  al inicio de `core.py`.

El HTML de salida sigue siendo un único archivo portable: los assets se
incrustan al generar.

## Tests

```bash
pytest
```

Cubren la escala numérica continua (decimales, recorte a la escala,
comas decimales), la ausencia de solapes en la vista de red con grafos
densos, el parseo de `03_Config` y el flujo completo Excel → HTML.

## Publicar en GitHub

```bash
cd stakeholder-map
git init
git add .
git commit -m "v1.0.0: herramienta modular de stakeholder mapping"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/stakeholder-map.git
git push -u origin main
```

Recomendaciones:

- Crea el repositorio **privado** si va a contener la presentación o
  cualquier material del proyecto; los mapas de stakeholders son
  información sensible.
- No subas Excel con datos reales: `outputs/` y `*.html` ya están en
  `.gitignore`, pero los `.xlsx` de datos reales debes excluirlos tú
  (deja solo la plantilla y la demo ficticia en `examples/`).
- Coloca la presentación en `docs/` (ver `docs/README.md`; usa Git LFS si
  supera 100 MB).

## Limitaciones conocidas

- La escala continua asume interpolación lineal entre el mínimo y el
  máximo de la escala; no hay transformaciones logarítmicas.
- En la fusión multi-tema, el consolidado toma el MAYOR interés/poder
  entre temas (criterio conservador de riesgo); otros criterios (promedio,
  ponderado) requerirían tocar `core.py`.
- El modelo poder-interés no captura actitud/sentimiento del actor
  (apoyo u oposición se registra por relación, no por nodo); está en el
  roadmap.
