# -*- coding: utf-8 -*-
"""Construcción del HTML interactivo.

El esqueleto (template.html), los estilos (styles.css) y la lógica
(app.js) viven como archivos en `assets/` y se incrustan aquí en el
momento de generar, de modo que el HTML de salida sigue siendo un único
archivo portable pero cada pieza se edita por separado.
"""
import json
import math
from ..normalize import clean
from ..scales import radius_for_rank
from ..config import (W, H, CX, CY, THEME, APP_TITLE, RING_LABEL_PREFIX,
                      QUAD_MX, QUAD_MY, QUAD_R_MAX, QUAD_R_MIN,
                      R_IN, R_OUT, S_MIN, S_MAX, LABEL_FONT_MIN,
                      UI_LANG, AXIS_LABELS, NET_R_MAX, NET_R_MIN, NET_FILL,
                      MULTI_STROKE, QUAD_ZONE_COLORS, QUAD_CELL_DEFAULT,
                      BAND_GRAY_INNER, BAND_GRAY_OUTER)
from .util import esc, _asset, _app_js
from .svg_parts import _rings_svg, _qgrid_svg, _edges_svg, _nodes_svg, _legends
from .controls import _color_controls


def build_html(nodes, edges, warnings, ns, es, scale, rel_styles):
    rings, ring_labels = _rings_svg(scale)
    qgrid = _qgrid_svg(scale)
    legend_cat, legend_src, legend_rel, options_cat, options_src, types_opts = \
        _legends(nodes, edges, rel_styles)

    po = scale['power_order']
    pw_lo = po[0] if po else 'menor'
    pw_hi = po[-1] if po else 'mayor'
    pw_mid = po[len(po) // 2] if len(po) >= 3 else ''
    interest_levels = ', '.join(str(v) for v in reversed(scale['interest_order'])) or 'n/d'

    tags_all = sorted({t for n in nodes for t in (n.get('tags') or [])})
    if tags_all:
        topts = ''.join(f"<option value='{esc(t)}'>{esc(t)}</option>" for t in tags_all)
        tag_filter = ("<label>Categoría</label><select id='tagF' onchange='filters()'>"
                      f"<option value=''>Todas</option>{topts}</select>")
    else:
        tag_filter = ''

    imp_levels = [v for v in (scale.get('importance_order') or [])]
    any_imp = any((n.get('importance') or '') != '' for n in nodes)
    if imp_levels and any_imp:
        none_needed = any((n.get('importance') or '') == '' for n in nodes)
        rows = ''.join(
            f"<label class='chk'><input type='checkbox' class='impF' "
            f"value=\"{esc(v)}\" checked onchange='filters()'> {esc(v)}</label>"
            for v in imp_levels)
        if none_needed:
            rows += ("<label class='chk'><input type='checkbox' class='impF' "
                     "value='__none__' checked onchange='filters()'> (Sin valor)</label>")
        imp_filter = ("<label class='formlabel'>Importancia en el proyecto</label>" + rows)
    else:
        imp_filter = ''

    warn_html = ('<p class="small ok">Sin advertencias de validación.</p>' if not warnings
                 else ''.join(f"<div class='warn'>{esc(w)}</div>" for w in warnings[:14]))

    # Bloque JSON de datos. NO escapar como HTML: el contenido de <script> es
    # texto crudo y no se decodifican entidades, así que &quot; rompería
    # JSON.parse. Solo se neutralizan <, > y & con escapes unicode (JSON
    # válido) para que el payload no pueda cerrar la etiqueta <script>.
    slim = [{k: v for k, v in n.items() if k not in ('qx', 'qy')} for n in nodes]
    data_json = (json.dumps({'nodes': slim, 'edges': edges,
                             'NI': scale['NI'], 'NP': scale['NP'],
                             'interest_order': scale['interest_order'],
                             'power_order': scale['power_order'],
                             'terms': scale.get('terms', {}),
                             'net_r': scale.get('net_r', 34),
                             'geo': {'R_IN': R_IN, 'R_OUT': R_OUT,
                                     'S_MIN': S_MIN, 'S_MAX': S_MAX,
                                     'QMX': QUAD_MX, 'QMY': QUAD_MY,
                                     'QRMAX': QUAD_R_MAX, 'QRMIN': QUAD_R_MIN,
                                     'NRMAX': NET_R_MAX, 'NRMIN': NET_R_MIN,
                                     'NFILL': NET_FILL}},
                            ensure_ascii=False)
                 .replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026'))

    # Los tokens de color del CSS (:root) se alimentan del THEME de config.py.
    # Cada clave 'foo_bar' del THEME sustituye a %%FOO_BAR%% en styles.css, así
    # que agregar un color nuevo es solo agregarlo al THEME y usar su var().
    styles = _asset('styles.css')
    for key, value in THEME.items():
        styles = styles.replace('%%' + key.upper() + '%%', value)

    doc = _asset('template.html')
    for token, value in (
            ('%%TITLE%%', esc(APP_TITLE)),
            ('%%STYLES%%', styles),
            ('%%NODE_COUNT%%', str(len(nodes))),
            ('%%EDGE_COUNT%%', str(len(edges))),
            ('%%OPTIONS_CAT%%', options_cat),
            ('%%TAG_FILTER%%', tag_filter),
            ('%%IMP_FILTER%%', imp_filter),
            ('%%OPTIONS_SRC%%', options_src),
            ('%%TYPES_OPTS%%', types_opts),
            ('%%COLOR_CONTROLS%%', _color_controls(scale)),
            ('%%LEGEND_CAT%%', legend_cat),
            ('%%LEGEND_SRC%%', legend_src),
            ('%%LEGEND_REL%%', legend_rel),
            ('%%PW_LO%%', esc(str(pw_lo))),
            ('%%PW_MID%%', esc(str(pw_mid))),
            ('%%PW_HI%%', esc(str(pw_hi))),
            ('%%INTEREST_LEVELS%%', esc(interest_levels)),
            ('%%WARN_COUNT%%', str(len(warnings))),
            ('%%WARN_HTML%%', warn_html),
            ('%%SHEET_NODES%%', esc(ns)),
            ('%%SHEET_EDGES%%', esc(es)),
            ('%%W%%', str(W)),
            ('%%H%%', str(H)),
            ('%%QGRID%%', qgrid),
            ('%%RINGS%%', rings),
            ('%%RING_LABELS%%', ring_labels),
            ('%%EDGES%%', _edges_svg(nodes, edges)),
            ('%%NODES%%', _nodes_svg(nodes)),
            ('%%DATA_JSON%%', data_json),
            ('%%APP_JS%%', _app_js()),
    ):
        doc = doc.replace(token, value)
    return doc
