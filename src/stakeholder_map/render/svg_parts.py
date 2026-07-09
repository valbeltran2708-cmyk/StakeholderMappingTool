# -*- coding: utf-8 -*-
"""Constructores de las piezas SVG: aristas, anillos de interes, rejilla del
cuadrante (celdas + zonas Mendelow), nodos y leyendas."""
import math
from ..normalize import clean
from ..scales import radius_for_rank
from ..config import (W, H, CX, CY, THEME, APP_TITLE, RING_LABEL_PREFIX,
                      QUAD_MX, QUAD_MY, QUAD_R_MAX, QUAD_R_MIN,
                      R_IN, R_OUT, S_MIN, S_MAX, LABEL_FONT_MIN,
                      UI_LANG, AXIS_LABELS, NET_R_MAX, NET_R_MIN, NET_FILL,
                      MULTI_STROKE, QUAD_ZONE_COLORS, QUAD_CELL_DEFAULT,
                      BAND_GRAY_INNER, BAND_GRAY_OUTER)
from .util import esc
from .typography import text_color, fit_label


def edge_path(a, b, offset=0):
    dx = b['x'] - a['x']; dy = b['y'] - a['y']
    mx = (a['x'] + b['x']) / 2; my = (a['y'] + b['y']) / 2
    ln = math.hypot(dx, dy) or 1; nx = -dy / ln; ny = dx / ln
    return f"M {a['x']} {a['y']} Q {mx + nx * (40 + offset)} {my + ny * (40 + offset)} {b['x']} {b['y']}"


def _rings_svg(scale):
    io = scale['interest_order']; NIv = scale['NI']
    centers = [(v, radius_for_rank(i, NIv)) for i, v in enumerate(io)]
    radii = sorted(c[1] for c in centers)
    bounds = [round((a + b) / 2, 1) for a, b in zip(radii, radii[1:])]
    if radii:
        outer = radii[-1] + ((radii[-1] - radii[-2]) / 2 if len(radii) > 1 else 70)
        bounds.append(round(outer, 1))

    # Bandas de fondo grises: un disco por nivel, del más externo (claro) al
    # más interno (oscuro), apilados. Ayudan a leer a qué nivel de interés
    # pertenece cada actor sin recolorear los nodos (el color del nodo sigue
    # siendo su esfera). Se dibujan detrás de todo. Solo tienen sentido con
    # pocos niveles; con muchos, los tonos quedan demasiado juntos.
    bands = ''
    n = len(bounds)
    if 1 < n <= 8:
        outer_r = bounds[-1]
        for k in range(n - 1, -1, -1):     # de fuera hacia dentro
            r = bounds[k]
            t = k / (n - 1)                 # 0 interior, 1 exterior
            g = round(228 - 56 * (1 - t))   # 172 (interior) .. 228 (exterior)
            fill = '#%02x%02x%02x' % (g, g, g)
            bands += (f"<circle class='band' cx='{CX}' cy='{CY}' r='{r}' "
                      f"data-r='{r}' data-lvl='{k}' fill='{fill}'/>")
    circles = ''.join(f"<circle class='ring' cx='{CX}' cy='{CY}' r='{r}' data-r='{r}'/>" for r in bounds)
    labels = ''.join(
        f"<text class='ringlab' x='{CX}' y='{round(CY - rad, 1)}' data-r='{round(rad, 1)}' "
        f"text-anchor='middle'>{esc((RING_LABEL_PREFIX + str(v)).strip().upper())}</text>"
        for v, rad in centers)
    return (f"<g id='ringBands'>{bands}</g><g id='rings'>{circles}</g>",
            f"<g id='ringLabels'>{labels}</g>")


def _axis_title(key):
    if UI_LANG == 'both':
        return f"{AXIS_LABELS['es'][key]} / {AXIS_LABELS['en'][key]}"
    return AXIS_LABELS.get(UI_LANG, AXIS_LABELS['es'])[key]


def _qgrid_svg(scale):
    mxq, myq = QUAD_MX, QUAD_MY
    ncol = max(scale['NI'], 1); nrow = max(scale['NP'], 1)
    gwq = (W - 2 * mxq) / ncol; ghq = (H - 2 * myq) / nrow
    parts = ["<g id='qgrid' class='hidden'>"]
    def _hi(rank, nn):
        return (rank >= (nn - 1) / 2) if nn > 1 else (rank >= 0)
    # Fondo por celda (interés x poder), blanco por defecto. data-zone = zona de
    # Mendelow de la celda (para teñir por zona); data-col/data-row para teñir
    # celda por celda. Las celdas van detrás de la rejilla y los nodos.
    parts.append("<g id='qcells'>")
    for p in range(nrow):
        for i in range(ncol):
            x = mxq + i * gwq
            y = myq + (nrow - 1 - p) * ghq
            iH = _hi(i, ncol); pH = _hi(p, nrow)
            zone = 'cm' if (pH and iH) else ('ks' if (pH and not iH) else ('ki' if ((not pH) and iH) else 'mo'))
            parts.append(f"<rect class='qcell' data-col='{i}' data-row='{p}' data-zone='{zone}' "
                         f"x='{round(x, 1)}' y='{round(y, 1)}' width='{round(gwq, 1)}' "
                         f"height='{round(ghq, 1)}' fill='{QUAD_CELL_DEFAULT}'/>")
    parts.append("</g>")
    parts.append(f"<rect x='{mxq}' y='{myq}' width='{W - 2 * mxq}' height='{H - 2 * myq}' "
                 f"fill='none' class='qline'/>")
    for i in range(1, ncol):
        x = mxq + i * gwq
        parts.append(f"<line x1='{round(x, 1)}' y1='{myq}' x2='{round(x, 1)}' y2='{H - myq}' class='qline'/>")
    for j in range(1, nrow):
        y = myq + j * ghq
        parts.append(f"<line x1='{mxq}' y1='{round(y, 1)}' x2='{W - mxq}' y2='{round(y, 1)}' class='qline'/>")
    for i, v in enumerate(scale['interest_order']):
        cx = mxq + (i + 0.5) * gwq
        parts.append(f"<text class='qtick' x='{round(cx, 1)}' y='{H - myq + 30}' "
                     f"text-anchor='middle'>{esc(str(v))}</text>")
    for p, v in enumerate(scale['power_order']):
        cy = myq + (nrow - 1 - p + 0.5) * ghq
        parts.append(f"<text class='qtick' x='{mxq - 16}' y='{round(cy + 4, 1)}' "
                     f"text-anchor='end'>{esc(str(v))}</text>")
    # etiquetas Mendelow y de eje: data-i18n para el botón de idioma
    parts.append(f"<text class='qlab' data-i18n='q_cm' x='{W - mxq - 14}' y='{myq + 28}' text-anchor='end'>Gestionar de cerca</text>")
    parts.append(f"<text class='qlab' data-i18n='q_ks' x='{mxq + 14}' y='{myq + 28}'>Mantener satisfecho</text>")
    parts.append(f"<text class='qlab' data-i18n='q_ki' x='{W - mxq - 14}' y='{H - myq - 16}' text-anchor='end'>Mantener informado</text>")
    parts.append(f"<text class='qlab' data-i18n='q_mo' x='{mxq + 14}' y='{H - myq - 16}'>Monitorear</text>")
    parts.append(f"<text class='qaxis' data-i18n='axis_interest' data-suffix=' \u2192' x='{CX}' y='{H - myq + 74}' "
                 f"text-anchor='middle'>{esc(AXIS_LABELS['es']['interest'])} \u2192</text>")
    parts.append(f"<text class='qaxis' data-i18n='axis_power' data-suffix=' \u2192' transform='translate({mxq - 130},{CY}) rotate(-90)' "
                 f"text-anchor='middle'>{esc(AXIS_LABELS['es']['power'])} \u2192</text>")
    parts.append("</g>")
    return ''.join(parts)


def _edges_svg(nodes, edges):
    node_by_id = {n['id']: n for n in nodes}
    pair_seen = {}
    out = []
    for e in edges:
        a = node_by_id.get(e['source']); b = node_by_id.get(e['target'])
        if not a or not b:
            continue
        key = tuple(sorted([e['source'], e['target']]))
        k = pair_seen.get(key, 0); pair_seen[key] = k + 1
        sign = 1 if (k % 2 == 0) else -1
        offset = sign * (8 + (k // 2) * 16)
        dash = "stroke-dasharray='8 6'" if e.get('dash') else ''
        marker = "marker-end='url(#arrow)'" if e.get('directed', True) else ''
        out.append(
            f"<path class='edge' data-source='{esc(e['source'])}' data-target='{esc(e['target'])}' "
            f"data-curv='{offset}' data-pol='{esc(e.get('pol', 'neu'))}' "
            f"data-type='{esc(e.get('type', ''))}' data-typecolor='{esc(e.get('color', '#999'))}' "
            f"d='{edge_path(a, b, offset)}' stroke='{esc(e.get('color', '#999'))}' "
            f"stroke-width='{max(1.5, e.get('strength', 2))}' fill='none' {dash} {marker}/>")
    return ''.join(out)


def _nodes_svg(nodes):
    out = []
    for n in nodes:
        tf = text_color(n.get('fill'))
        style = f"fill:{tf}"

        def _lbl_group(texto, cls):
            f, lines = fit_label(texto, n['r'])
            lh = f * 1.18
            sy = -(len(lines) - 1) * lh / 2
            inner = ''.join(
                f"<text text-anchor='middle' dominant-baseline='middle' "
                f"y='{round(sy + j * lh, 1)}' font-size='{f}' style='{style}'>"
                f"{esc(line)}</text>" for j, line in enumerate(lines))
            return f"<g class='{cls}'>{inner}</g>"

        alias = clean(n.get('alias'))
        label = n['label']
        disp = alias or label
        text = _lbl_group(disp, 'lbl lblA')
        if alias and alias != label:
            text += _lbl_group(label, 'lbl lblF')
        # Etiquetas en inglés (si la entidad tiene nombre/alias EN); el toggle de
        # idioma y el de alias/nombre eligen cuál se ve. Si no hay EN, en modo
        # inglés se cae a la etiqueta en español.
        le = clean(n.get('label_en'))
        ae = clean(n.get('alias_en'))
        if le or ae:
            text += _lbl_group(ae or le or disp, 'lbl lblAen')
            text += _lbl_group(le or label, 'lbl lblFen')
        marker2 = (f"<circle class='marker2' r='{max(4, n['r'] - 5)}' fill='none' stroke='#ffffff' "
                   f"stroke-width='1.6' stroke-dasharray='3 3' opacity='.85'/>") if n.get('multi') else ''
        out.append(
            f"<g class='node' data-id='{esc(n['id'])}' data-category='{esc(n.get('category', ''))}' "
            f"data-source='{esc(n.get('source', ''))}' data-level='{esc(n.get('level', ''))}' "
            f"transform='translate({n['x']},{n['y']})'>"
            f"<circle r='{n['r']}' fill='{esc(n['fill'])}' stroke='{esc(n['stroke'])}' stroke-width='3'/>{marker2}"
            f"{text}</g>")
    return ''.join(out)


def _legends(nodes, edges, rel_styles):
    cats = {n.get('category', ''): n.get('fill', '#aaa') for n in nodes if n.get('category', '')}
    legend_cat = ''.join(
        f"<div class='legend clk' data-cat=\"{esc(k)}\" onclick='filterCat(this.dataset.cat)'>"
        f"<span class='sw' style='background:{esc(v)}'></span>"
        f"<span class='ltxt' data-term=\"{esc(k)}\">{esc(k)}</span></div>"
        for k, v in sorted(cats.items()))
    srcs = {}
    for n in nodes:
        s = n.get('source', '')
        if s and s not in srcs:
            srcs[s] = n.get('stroke', '#667085')
    legend_src = ''.join(
        f"<div class='legend clk' data-src=\"{esc(s)}\" onclick='filterSrc(this.dataset.src)'>"
        f"<span class='sw' style='border:3px solid {esc(c)};background:#fff'></span>"
        f"<span class='ltxt' data-term=\"{esc(s)}\">{esc(s)}</span></div>"
        for s, c in sorted(srcs.items()))
    multi_label = ('En ambas dimensiones' if len(srcs) == 2 else 'En varias dimensiones')
    multi_key = 'multi_both' if len(srcs) == 2 else 'multi_several'
    if any(n.get('multi') for n in nodes):
        legend_src += (f"<div class='legend clk' data-src='__multi__' "
                       f"onclick='filterSrc(this.dataset.src)'>"
                       f"<span class='sw' style='border:3px solid {MULTI_STROKE};"
                       f"background:#fff'></span>"
                       f"<span class='ltxt' data-i18n='{multi_key}'>{esc(multi_label)}</span></div>")
    types_used = sorted({e['type'] for e in edges})
    legend_rel = ''.join(
        f"<div class='legend clk' data-type=\"{esc(t)}\" onclick='filterType(this.dataset.type)'>"
        f"<span class='line' style='border-top:3px "
        f"{('dashed' if rel_styles.get(t, {}).get('dash') else 'solid')} "
        f"{esc(rel_styles.get(t, {}).get('color', '#999'))}'></span>"
        f"<span class='ltxt' data-term=\"{esc(t)}\">{esc(t)}</span></div>"
        for t in types_used)
    options_cat = ''.join(f"<option value='{esc(k)}' data-term=\"{esc(k)}\">{esc(k)}</option>" for k in sorted(cats))
    sources = sorted({n.get('source', '') for n in nodes if n.get('source', '')})
    options_src = ''.join(f"<option value='{esc(s)}' data-term=\"{esc(s)}\">{esc(s)}</option>" for s in sources)
    if any(n.get('multi') for n in nodes):
        options_src += f"<option value='__multi__' data-i18n='{multi_key}'>{esc(multi_label)}</option>"
    types_opts = ''.join(f"<option value='{esc(t)}' data-term=\"{esc(t)}\">{esc(t)}</option>" for t in types_used)
    return legend_cat, legend_src, legend_rel, options_cat, options_src, types_opts


