# -*- coding: utf-8 -*-
"""Layout radial: resolución de solapes preservando la semántica
interés = distancia al centro."""
import math

from ..config import W, H, CX, CY


def resolve_overlaps(pos, size_of, radius_of, iters=220, pad=10):
    """Empuja nodos solapados manteniéndolos cerca de su anillo (banda de interés).

    pos: {id: {'x','y',...}} se modifica in situ y se devuelve.
    size_of: {id: radio del círculo}
    radius_of: {id: radio objetivo de la banda}
    """
    ids = list(pos.keys())
    for _ in range(iters):
        moved = False
        for i in range(len(ids)):
            a = pos[ids[i]]
            for j in range(i + 1, len(ids)):
                b = pos[ids[j]]
                dx = b['x'] - a['x']; dy = b['y'] - a['y']
                dist = math.hypot(dx, dy) or 0.01
                mind = size_of.get(ids[i], 28) + size_of.get(ids[j], 28) + pad
                if dist < mind:
                    push = (mind - dist) / 2
                    ux, uy = dx / dist, dy / dist
                    a['x'] -= ux * push; a['y'] -= uy * push
                    b['x'] += ux * push; b['y'] += uy * push
                    moved = True
        # resorte suave hacia la banda radial (preserva semántica interés=distancia)
        for k in ids:
            p = pos[k]
            vx, vy = p['x'] - CX, p['y'] - CY
            d = math.hypot(vx, vy) or 0.01
            target = radius_of.get(k, 540)
            corr = (target - d) * 0.05
            p['x'] += vx / d * corr; p['y'] += vy / d * corr
            p['x'] = min(W - 30, max(30, p['x']))
            p['y'] = min(H - 30, max(30, p['y']))
        if not moved:
            break
    return pos
