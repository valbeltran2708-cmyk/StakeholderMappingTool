# Changelog

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
