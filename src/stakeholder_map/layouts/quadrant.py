# -*- coding: utf-8 -*-
"""Vista cuadrante (matriz de Mendelow): rejilla interés x poder.

Los rangos pueden ser fraccionarios (escala numérica continua); cada nodo
se asigna a la celda de la marca entera más cercana.
"""
import math

from ..config import W, H


def _cell(rank, n):
    if rank is None or rank < 0:
        return 0
    return min(max(n, 1) - 1, max(0, int(round(rank))))


def quadrant_coords(items, NI, NP):
    """items: [{id, ir, pr}] -> {id:{qx,qy}} en una rejilla NI x NP
    (interés = columnas, poder = filas)."""
    ncol = max(NI, 1); nrow = max(NP, 1)
    mx, my = 150, 120
    gw, gh = (W - 2 * mx) / ncol, (H - 2 * my) / nrow
    cells = {}
    for it in items:
        c = _cell(it.get('ir'), ncol)
        pr = _cell(it.get('pr'), nrow)
        rrow = (nrow - 1) - pr  # fila 0 = arriba = mayor poder
        cells.setdefault((c, rrow), []).append(it)
    out = {}
    pad = min(46, gw * 0.16, gh * 0.16)
    for (c, rrow), group in cells.items():
        k = math.ceil(math.sqrt(len(group)))
        x0 = mx + c * gw; y0 = my + rrow * gh
        uw = max(24, gw - 2 * pad); uh = max(24, gh - 2 * pad)
        for idx, it in enumerate(group):
            gx = idx % k; gy = idx // k
            out[it['id']] = {'qx': round(x0 + pad + uw * (gx + 0.5) / k, 2),
                             'qy': round(y0 + pad + uh * (gy + 0.5) / k, 2)}
    return out


def add_quadrant_coords(nodes, scale):
    """Coordenadas de cuadrante consolidadas para todos los nodos."""
    coords = quadrant_coords(
        [{'id': n['id'], 'ir': n.get('ir', -1), 'pr': n.get('pr', -1)} for n in nodes],
        scale['NI'], scale['NP'])
    for n in nodes:
        cc = coords.get(n['id'], {'qx': n['x'], 'qy': n['y']})
        n['qx'] = cc['qx']; n['qy'] = cc['qy']
