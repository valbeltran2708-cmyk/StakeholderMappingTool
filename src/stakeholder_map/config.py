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

# El tema controla acentos de la interfaz (botones activos, barra superior).
# No se usa para colorear datos: los datos usan la paleta de categorías,
# porque un solo rojo no distingue seis categorías.
THEME = {
    'accent': ARUP_RED,
    'accent_dark': ARUP_RED_DARK,
    'ink': '#1F2733',
    'bg': '#F7F8FA',
    'panel': '#E7EBF0',
}

APP_TITLE = 'Mapa de Stakeholders · Poder–Interés y Relaciones'

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
R_IN, R_OUT = 150, 470      # radio de la banda más interna / más externa
S_MIN, S_MAX = 26, 56       # radio del círculo para el menor / mayor poder

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
DEFAULT_CATEGORY_COLORS = {
    'Gobierno Central': '#4E79A7',
    'Sector energía / institución pública': '#5B9BD5',
    'Subdivisión institucional': '#B8D7F0',
    'Gobernanza Interinstitucional y territorial': '#8E6BBE',
    'Academia y Centro de Investigación': '#FFC000',
    'Sociedad civil / ONG': '#2FB7C4',
    '': '#BFBFBF',
}

DEFAULT_REL_STYLES = {
    'Coordinación':               {'color': '#5B9BD5', 'dash': False},
    'Regulación / fiscalización': {'color': '#D62728', 'dash': False},
    'Provisión de datos':         {'color': '#2CA02C', 'dash': False},
    'Validación técnica':         {'color': '#9467BD', 'dash': False},
    'Participación / diálogo':    {'color': '#17BECF', 'dash': False},
    'Tensión / dependencia':      {'color': '#FF7F0E', 'dash': True},
    'Subdivisión institucional':  {'color': '#999999', 'dash': True},
    '': {'color': '#999999', 'dash': False},
}

# Paleta para asignar color de borde a CUALQUIER tema/fuente presente
THEME_PALETTE = ['#0B5394', '#38761D', '#7B1FA2', '#B45309', '#0E7490',
                 '#9D174D', '#374151', '#15803D', '#1D4ED8', '#A16207',
                 '#BE123C', '#4338CA']
