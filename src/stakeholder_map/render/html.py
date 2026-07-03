# -*- coding: utf-8 -*-
"""Construcción del HTML interactivo.

El esqueleto (template.html), los estilos (styles.css) y la lógica
(app.js) viven como archivos en `assets/` y se incrustan aquí en el
momento de generar, de modo que el HTML de salida sigue siendo un único
archivo portable pero cada pieza se edita por separado.
"""
import html as html_mod
import json
import math
from importlib import resources

from ..config import W, H, CX, CY, THEME, APP_TITLE, RING_LABEL_PREFIX
from ..scales import radius_for_rank


def esc(s):
    return html_mod.escape(str(s if s is not None else ''), quote=True)


def _asset(name):
    return resources.files('stakeholder_map.render').joinpath('assets', name).read_text(encoding='utf-8')


def text_color(hexc):
    """(color de texto, color de halo) legibles sobre el relleno del nodo."""
    h = str(hexc or '#bfbfbf').lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    try:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except Exception:
        r = g = b = 180
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return ('#15212b', '#ffffff') if lum > 0.62 else ('#ffffff', '#10202c')


def _wrap(text, max_chars):
    words = str(text or '').split(); lines = []; line = ''
    for w in words:
        while len(w) > max_chars:
            if line:
                lines.append(line); line = ''
            lines.append(w[:max_chars - 1] + '-'); w = w[max_chars - 1:]
        cand = (line + ' ' + w).strip()
        if len(cand) > max_chars:
            if line:
                lines.append(line)
            line = w
        else:
            line = cand
    if line:
        lines.append(line)
    return lines


def fit_label(label, r, fmax=14, fmin=6):
    """Mayor fuente (<= fmax) cuyas líneas caben dentro del círculo de radio r.
    Trunca con elipsis solo como último recurso."""
    label = str(label or '').strip()
    if not label:
        return fmin, []
    usable_w = 1.62 * r
    usable_h = 1.58 * r
    f = fmax
    while f >= fmin:
        max_chars = max(3, int(usable_w / (0.58 * f)))
        max_lines = max(1, int(usable_h / (1.18 * f)))
        lines = _wrap(label, max_chars)
        widest = max((len(ln) for ln in lines), default=0)
        if len(lines) <= max_lines and widest <= max_chars:
            return f, lines
        f -= 1
    f = fmin
    max_chars = max(3, int(usable_w / (0.58 * f)))
    max_lines = max(1, int(usable_h / (1.18 * f)))
    lines = _wrap(label, max_chars)[:max_lines]
    if lines:
        last = lines[-1]
        if len(_wrap(label, max_chars)) > max_lines or len(last) > max_chars:
            lines[-1] = (last[:max_chars - 1].rstrip() + '…')
    return f, lines


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
    circles = ''.join(f"<circle class='ring' cx='{CX}' cy='{CY}' r='{r}' data-r='{r}'/>" for r in bounds)
    labels = ''.join(
        f"<text class='ringlab' x='{CX}' y='{round(CY - rad, 1)}' data-r='{round(rad, 1)}' "
        f"text-anchor='middle'>{esc((RING_LABEL_PREFIX + str(v)).strip().upper())}</text>"
        for v, rad in centers)
    return f"<g id='rings'>{circles}</g>", f"<g id='ringLabels'>{labels}</g>"


def _qgrid_svg(scale):
    mxq, myq = 150, 120
    ncol = max(scale['NI'], 1); nrow = max(scale['NP'], 1)
    gwq = (W - 2 * mxq) / ncol; ghq = (H - 2 * myq) / nrow
    parts = ["<g id='qgrid' class='hidden'>"]
    for i in range(1, ncol):
        x = mxq + i * gwq
        parts.append(f"<line x1='{round(x, 1)}' y1='{myq}' x2='{round(x, 1)}' y2='{H - myq}' class='qline'/>")
    for j in range(1, nrow):
        y = myq + j * ghq
        parts.append(f"<line x1='{mxq}' y1='{round(y, 1)}' x2='{W - mxq}' y2='{round(y, 1)}' class='qline'/>")
    for i, v in enumerate(scale['interest_order']):
        cx = mxq + (i + 0.5) * gwq
        parts.append(f"<text class='qtick' x='{round(cx, 1)}' y='{H - 92}' text-anchor='middle'>{esc(str(v))}</text>")
    for p, v in enumerate(scale['power_order']):
        cy = myq + (nrow - 1 - p + 0.5) * ghq
        parts.append(f"<text class='qtick' x='128' y='{round(cy + 4, 1)}' text-anchor='end'>{esc(str(v))}</text>")
    parts.append(f"<text class='qlab' x='{W - 160}' y='150' text-anchor='end'>Gestionar de cerca</text>")
    parts.append("<text class='qlab' x='160' y='150'>Mantener satisfecho</text>")
    parts.append(f"<text class='qlab' x='{W - 160}' y='{H - 130}' text-anchor='end'>Mantener informado</text>")
    parts.append(f"<text class='qlab' x='160' y='{H - 130}'>Monitorear</text>")
    parts.append(f"<text class='qaxis' x='{CX}' y='{H - 70}' text-anchor='middle'>Interés →</text>")
    parts.append(f"<text class='qaxis' transform='translate(104,{CY}) rotate(-90)' text-anchor='middle'>Poder →</text>")
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
            f"data-curv='{offset}' data-pol='{esc(e.get('pol', 'neu'))}' data-typecolor='{esc(e.get('color', '#999'))}' "
            f"d='{edge_path(a, b, offset)}' stroke='{esc(e.get('color', '#999'))}' "
            f"stroke-width='{max(1.5, e.get('strength', 2))}' fill='none' {dash} {marker}/>")
    return ''.join(out)


def _nodes_svg(nodes):
    out = []
    for n in nodes:
        f, lines = fit_label(n['label'], n['r'])
        lh = f * 1.18
        sy = -(len(lines) - 1) * lh / 2
        style = "fill:#ffffff;stroke:none;paint-order:normal;stroke-width:0"
        text = ''.join(
            f"<text text-anchor='middle' dominant-baseline='middle' y='{round(sy + j * lh, 1)}' "
            f"font-size='{f}' style='{style}'>{esc(line)}</text>"
            for j, line in enumerate(lines))
        marker2 = (f"<circle class='marker2' r='{max(4, n['r'] - 5)}' fill='none' stroke='#ffffff' "
                   f"stroke-width='1.6' stroke-dasharray='3 3' opacity='.85'/>") if n.get('multi') else ''
        out.append(
            f"<g class='node' data-id='{esc(n['id'])}' data-category='{esc(n.get('category', ''))}' "
            f"data-source='{esc(n.get('source', ''))}' data-level='{esc(n.get('level', ''))}' "
            f"data-x='{n['x']}' data-y='{n['y']}' data-ex='{n['ex']}' data-ey='{n['ey']}' "
            f"data-qx='{n.get('qx', n['x'])}' data-qy='{n.get('qy', n['y'])}' "
            f"transform='translate({n['x']},{n['y']})'>"
            f"<circle r='{n['r']}' fill='{esc(n['fill'])}' stroke='{esc(n['stroke'])}' stroke-width='3'/>{marker2}"
            f"<g class='lbl'>{text}</g></g>")
    return ''.join(out)


def _legends(nodes, edges, rel_styles):
    cats = {n.get('category', ''): n.get('fill', '#aaa') for n in nodes if n.get('category', '')}
    legend_cat = ''.join(
        f"<div class='legend clk' data-cat=\"{esc(k)}\" onclick='filterCat(this.dataset.cat)'>"
        f"<span class='sw' style='background:{esc(v)}'></span>{esc(k)}</div>"
        for k, v in sorted(cats.items()))
    srcs = {}
    for n in nodes:
        s = n.get('source', '')
        if s and s not in srcs:
            srcs[s] = n.get('stroke', '#667085')
    legend_src = ''.join(
        f"<div class='legend clk' data-src=\"{esc(s)}\" onclick='filterSrc(this.dataset.src)'>"
        f"<span class='sw' style='border:3px solid {esc(c)};background:#fff'></span>{esc(s)}</div>"
        for s, c in sorted(srcs.items()))
    types_used = sorted({e['type'] for e in edges})
    legend_rel = ''.join(
        f"<div class='legend clk' data-type=\"{esc(t)}\" onclick='filterType(this.dataset.type)'>"
        f"<span class='line' style='border-top:3px "
        f"{('dashed' if rel_styles.get(t, {}).get('dash') else 'solid')} "
        f"{esc(rel_styles.get(t, {}).get('color', '#999'))}'></span>{esc(t)}</div>"
        for t in types_used)
    options_cat = ''.join(f"<option value='{esc(k)}'>{esc(k)}</option>" for k in sorted(cats))
    sources = sorted({n.get('source', '') for n in nodes if n.get('source', '')})
    options_src = ''.join(f"<option value='{esc(s)}'>{esc(s)}</option>" for s in sources)
    types_opts = ''.join(f"<option value='{esc(t)}'>{esc(t)}</option>" for t in types_used)
    return legend_cat, legend_src, legend_rel, options_cat, options_src, types_opts


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

    warn_html = ('<p class="small ok">Sin advertencias de validación.</p>' if not warnings
                 else ''.join(f"<div class='warn'>{esc(w)}</div>" for w in warnings[:14]))

    # Bloque JSON de datos. NO escapar como HTML: el contenido de <script> es
    # texto crudo y no se decodifican entidades, así que &quot; rompería
    # JSON.parse. Solo se neutralizan <, > y & con escapes unicode (JSON
    # válido) para que el payload no pueda cerrar la etiqueta <script>.
    data_json = (json.dumps({'nodes': nodes, 'edges': edges,
                             'NI': scale['NI'], 'NP': scale['NP'],
                             'interest_order': scale['interest_order'],
                             'power_order': scale['power_order'],
                             'net_r': scale.get('net_r', 34)},
                            ensure_ascii=False)
                 .replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026'))

    styles = (_asset('styles.css')
              .replace('%%ACCENT_DARK%%', THEME['accent_dark'])
              .replace('%%ACCENT%%', THEME['accent'])
              .replace('%%INK%%', THEME['ink'])
              .replace('%%BG%%', THEME['bg'])
              .replace('%%PANEL%%', THEME['panel']))

    doc = _asset('template.html')
    for token, value in (
            ('%%TITLE%%', esc(APP_TITLE)),
            ('%%STYLES%%', styles),
            ('%%NODE_COUNT%%', str(len(nodes))),
            ('%%EDGE_COUNT%%', str(len(edges))),
            ('%%OPTIONS_CAT%%', options_cat),
            ('%%OPTIONS_SRC%%', options_src),
            ('%%TYPES_OPTS%%', types_opts),
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
            ('%%APP_JS%%', _asset('app.js')),
    ):
        doc = doc.replace(token, value)
    return doc
