# -*- coding: utf-8 -*-
"""Configuración editable de la herramienta.

Este módulo concentra TODO lo que un usuario querría ajustar sin tocar la
lógica: colores de marca, paletas por defecto, dimensiones del lienzo,
escalas visuales y textos fijos. Cambiar un valor aquí no exige entender
el resto del código.

Los colores de categorías (03A) y de tipos de relación (03B) definidos en
el Excel de entrada SIEMPRE tienen prioridad sobre estos valores.
"""

# ---------------------------------------------------------------------------
# Marca Arup (interfaz)
# ---------------------------------------------------------------------------
# Rojo Arup. Valor usado: RGB 230, 30, 40 (#E61E28), el rojo digital que se
# cita habitualmente para la marca. Si la guía interna de marca (brand hub)
# indica otro valor, por ejemplo RGB 230, 30, 70 (#E61E46), cámbialo aquí:
# es la única línea que hay que tocar.
ARUP_RED = '#E61E28'
ARUP_RED_DARK = '#B4121B'   # variante oscura para hover / estados activos
ARUP_INK = '#1D1D1B'        # casi negro corporativo

# El tema controla TODO el color de la interfaz (botones, paneles, bordes,
# texto). No se usa para colorear datos: los datos usan la paleta de categorías,
# porque un solo color no distingue seis categorías.
#
# Roles: 'accent' = color de MARCA (franja superior, detalle de actores clave).
#        'primary' = color de INTERACCIÓN unificado (todo botón activo/primario,
#        hover y foco). Si quieres que todo sea del color de marca, pon
#        'primary'/'primary_dark' iguales a 'accent'/'accent_dark'.
PRIMARY = '#E61E28'         # azul de interacción (botones activos, acciones)
PRIMARY_DARK = '#B4121B'    # variante oscura para hover / activo
THEME = {
    # marca (identidad Arup)
    'accent': ARUP_RED,
    'accent_dark': ARUP_RED_DARK,
    # interacción (unificado en todos los botones activos/primarios)
    'primary': PRIMARY,
    'primary_dark': PRIMARY_DARK,
    # texto
    'ink': '#1F2733',        # texto principal
    'muted': '#5B6675',      # texto secundario / etiquetas
    'faint': '#8A93A0',      # texto tenue / iconos
    # superficies
    'bg': '#F7F8FA',         # fondo de página
    'panel': '#E7EBF0',      # panel lateral
    'surface': '#FFFFFF',    # tarjetas / botones
    'surface_2': '#F1F4F8',  # botón inactivo / filas (un gris frío y neutro)
    'hover': '#E7EEF6',      # fondo al pasar el cursor
    # bordes
    'border': '#D5DCE5',     # borde estándar (unifica los grises dispersos)
    'border_soft': '#E7EBF0',# borde suave (tarjetas, separadores)
}

APP_TITLE = 'Mapa de Stakeholders · Poder–Interés y Relaciones'

# Idioma de los títulos de eje del cuadrante: 'es', 'en' o 'both' (bilingüe).
UI_LANG = 'both'
AXIS_LABELS = {
    'es': {'interest': 'Interés en el proyecto',
           'power': 'Poder e influencia sobre el proyecto'},
    'en': {'interest': 'Project interest',
           'power': 'Power / influence on the project'},
}

# Prefijo de las etiquetas de los anillos de interés. Vacío por defecto para
# que funcione igual con escalas en español, inglés o numéricas
# ('ALTO', 'HIGH', '5'). Si prefieres el prefijo antiguo usa 'INTERÉS '.
RING_LABEL_PREFIX = ''

# ---------------------------------------------------------------------------
# Lienzo
# ---------------------------------------------------------------------------
W, H = 1600, 1100
CX, CY = W / 2, H / 2

# ---------------------------------------------------------------------------
# Escala visual de la vista radial (poder–interés)
# ---------------------------------------------------------------------------
R_IN, R_OUT = 70, 470       # radio de la banda más interna / más externa
                            # (70 acerca el interés máximo al centro real;
                            # sube el valor si prefieres un anillo interior amplio)
S_MIN, S_MAX = 26, 56       # radio del círculo para el menor / mayor poder
BAND_SPRING = 0.35          # fuerza con la que un nodo vuelve a su banda de
                            # interés cuando las colisiones lo empujan; mayor
                            # valor = posiciones más fieles al eje, deslizando
                            # los solapes de forma tangencial

# Tamaño mínimo de fuente de las etiquetas dentro de los círculos. Por debajo
# de esto el texto se trunca con '…' en lugar de volverse ilegible.
LABEL_FONT_MIN = 8

# ---------------------------------------------------------------------------
# Vista cuadrante (matriz de Mendelow)
# ---------------------------------------------------------------------------
# En el cuadrante la POSICIÓN ya codifica interés y poder, así que los
# círculos son de tamaño uniforme (se adapta a la celda más llena, entre
# estos límites) y se empaquetan en rejilla dentro de cada celda.
QUAD_MX, QUAD_MY = 190, 130   # márgenes del área de la matriz en el lienzo
QUAD_R_MAX, QUAD_R_MIN = 40, 14

# Colores por defecto de las cuatro zonas de Mendelow. Ahora BLANCO: el usuario
# decide si tiñe por zona (gestionar de cerca, mantener satisfecho, mantener
# informado, monitorear) o celda por celda. El fondo no compite con el color de
# esfera de los círculos salvo que se coloree a propósito.
QUAD_ZONE_COLORS = {
    'cm': '#ffffff',   # gestionar de cerca (alto poder + alto interés)
    'ks': '#ffffff',   # mantener satisfecho (alto poder + bajo interés)
    'ki': '#ffffff',   # mantener informado (bajo poder + alto interés)
    'mo': '#ffffff',   # monitorear (bajo poder + bajo interés)
}
QUAD_CELL_DEFAULT = '#ffffff'
# Degradado por defecto de las bandas de interés (gris): interior oscuro a
# exterior claro. Se calcula por nivel; estos son los extremos.
BAND_GRAY_INNER, BAND_GRAY_OUTER = 172, 228

# ---------------------------------------------------------------------------
# Vista de conexiones (red force-directed)
# ---------------------------------------------------------------------------
NET_R_MAX = 34   # radio uniforme máximo
NET_R_MIN = 12   # radio uniforme mínimo con muchos nodos
NET_FILL = 0.36  # factor de ocupación: menor valor = círculos más pequeños
                 # pero con garantía de que caben sin solaparse

# ---------------------------------------------------------------------------
# Paletas por defecto (03A / 03B del Excel las sobreescriben)
# ---------------------------------------------------------------------------
# Sin colores de ejemplo cableados: las esferas y los tipos de relación
# toman su color de 03_Config; a lo que no tenga color se le asigna uno
# automático de estas paletas (determinista por orden alfabético).
DEFAULT_CATEGORY_COLORS = {}
CATEGORY_PALETTE = ['#4E79A7', '#F28E2B', '#59A14F', '#E15759', '#B07AA1',
                    '#76B7B2', '#EDC948', '#FF9DA7', '#9C755F', '#6B8ABC']
DEFAULT_REL_STYLES = {
    '': {'color': '#999999', 'dash': False},
}
REL_PALETTE = ['#5B9BD5', '#D62728', '#2CA02C', '#9467BD', '#17BECF',
               '#FF7F0E', '#8C564B', '#7F7F7F']

# Borde de las entidades presentes en varias dimensiones a la vez
# (etiqueta "En ambas/varias dimensiones" en la leyenda y el filtro).
MULTI_STROKE = '#111111'

# Tipo de relación que la herramienta genera automáticamente (padre -> subdivisión)
DEFAULT_REL_STYLES['Subdivisión institucional'] = {'color': '#999999', 'dash': True}

# Paleta para asignar color de borde a CUALQUIER tema/fuente presente
THEME_PALETTE = ['#0B5394', '#38761D', '#7B1FA2', '#B45309', '#0E7490',
                 '#9D174D', '#374151', '#15803D', '#1D4ED8', '#A16207',
                 '#BE123C', '#4338CA']
