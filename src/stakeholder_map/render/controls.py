# -*- coding: utf-8 -*-
"""Controles de color del panel: selectores propios (boton-muestra) para los
anillos y para zonas/celdas del cuadrante, y el gris por defecto de bandas."""
from ..config import (W, H, CX, CY, THEME, APP_TITLE, RING_LABEL_PREFIX,
                      QUAD_MX, QUAD_MY, QUAD_R_MAX, QUAD_R_MIN,
                      R_IN, R_OUT, S_MIN, S_MAX, LABEL_FONT_MIN,
                      UI_LANG, AXIS_LABELS, NET_R_MAX, NET_R_MIN, NET_FILL,
                      MULTI_STROKE, QUAD_ZONE_COLORS, QUAD_CELL_DEFAULT,
                      BAND_GRAY_INNER, BAND_GRAY_OUTER)
from .util import esc


def _band_gray(k, n):
    if n <= 1:
        return '#%02x%02x%02x' % ((BAND_GRAY_INNER,) * 3)
    t = k / (n - 1)
    g = round(BAND_GRAY_OUTER - (BAND_GRAY_OUTER - BAND_GRAY_INNER) * (1 - t))
    return '#%02x%02x%02x' % (g, g, g)


def _color_controls(scale):
    io = scale['interest_order']; n = len(io)
    parts = []
    if 1 < n <= 8:
        parts.append("<div class='formlabel' data-i18n='band_colors'>Colores de anillos (radial)</div>")
        parts.append("<div class='swrow'>")
        for i in range(n):
            level = io[n - 1 - i]      # de mayor interés (interior) a menor
            color = _band_gray(i, n)
            parts.append(f"<label class='swpick'><button type='button' class='swatch bandC' "
                         f"data-kind='band' data-lvl='{i}' data-color='{color}' "
                         f"style='background:{color}' onclick='openSwatch(this)'></button>"
                         f"<span>{esc(str(level))}</span></label>")
        parts.append("</div>")
    # --- Cuadrantes: blanco por defecto; teñir por zona o celda por celda ---
    ni = max(scale['NI'], 1); npw = max(scale['NP'], 1)
    parts.append("<div class='formlabel' data-i18n='zone_colors'>Colores de cuadrantes</div>")
    parts.append("<div class='seg'>"
                 "<button type='button' class='segbtn qcm active' data-m='zone' "
                 "onclick='setQColorMode(\"zone\")' data-i18n='quad_by_zone'>Por zona</button>"
                 "<button type='button' class='segbtn qcm' data-m='cell' "
                 "onclick='setQColorMode(\"cell\")' data-i18n='quad_by_cell'>Por celda</button>"
                 "</div>")
    # por zona (Mendelow): cuatro selectores, blanco por defecto
    parts.append("<div id='qzonePick' class='swcol'>")
    for z, key in (('cm', 'q_cm'), ('ks', 'q_ks'), ('ki', 'q_ki'), ('mo', 'q_mo')):
        parts.append(f"<label class='swpick'><button type='button' class='swatch zoneC' "
                     f"data-kind='zone' data-zone='{z}' data-color='#ffffff' "
                     f"style='background:#ffffff' onclick='openSwatch(this)'></button>"
                     f"<span data-i18n='{key}'></span></label>")
    parts.append("</div>")
    # por celda: clic en la celda del cuadrante y, si la rejilla no es enorme,
    # una mini-rejilla de selectores (arriba = mayor poder; izquierda = menor interés)
    parts.append("<div id='qcellPick' class='hidden'>")
    parts.append("<div class='small' data-i18n='quad_cell_hint' style='margin:2px 0 6px;color:#6b7480'>"
                 "Clic en una celda del cuadrante para colorearla.</div>")
    if ni * npw <= 25:
        po = scale['power_order']
        parts.append(f"<div class='cellgrid' style='grid-template-columns:repeat({ni},1fr)'>")
        for p in range(npw - 1, -1, -1):
            for i in range(ni):
                iv = io[i] if i < len(io) else ''
                pv = po[p] if p < len(po) else ''
                parts.append(f"<label class='cellpick' title='{esc(str(iv))} / {esc(str(pv))}'>"
                             f"<button type='button' class='swatch cellC' data-kind='cell' "
                             f"data-col='{i}' data-row='{p}' data-color='#ffffff' "
                             f"style='background:#ffffff' onclick='openSwatch(this)'></button></label>")
        parts.append("</div>")
    parts.append("</div>")
    return ''.join(parts)

