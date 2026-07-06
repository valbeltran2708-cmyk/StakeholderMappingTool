# -*- coding: utf-8 -*-
"""Layout radial: resolución de solapes preservando la semántica
interés = distancia al centro.

La versión anterior usaba un resorte de banda muy débil (0.05), así que
las colisiones empujaban a los nodos lejos de su anillo: un actor con
interés máximo podía terminar a medio camino del borde. Ahora el resorte
es fuerte (config.BAND_SPRING) y la separación de colisiones se sesga
hacia la dirección tangencial, de modo que los nodos se deslizan
ALREDEDOR de su anillo en lugar de salirse de él.
"""
import math

from ..config import W, H, CX, CY, BAND_SPRING


def resolve_overlaps(pos, size_of, radius_of, iters=240, pad=10):
    """Separa nodos solapados manteniéndolos sobre su banda de interés.

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
                    # sesgo tangencial: se reduce la componente radial del
                    # empuje para que los nodos se deslicen por el anillo
                    for p, s in ((a, -1), (b, 1)):
                        rx, ry = p['x'] - CX, p['y'] - CY
                        rd = math.hypot(rx, ry) or 0.01
                        rux, ruy = rx / rd, ry / rd
                        dot = ux * rux + uy * ruy
                        tx = ux - dot * rux * 0.65
                        ty = uy - dot * ruy * 0.65
                        p['x'] += s * tx * push
                        p['y'] += s * ty * push
                    moved = True
        # resorte fuerte hacia la banda radial
        for k in ids:
            p = pos[k]
            vx, vy = p['x'] - CX, p['y'] - CY
            d = math.hypot(vx, vy) or 0.01
            target = radius_of.get(k, 540)
            corr = (target - d) * BAND_SPRING
            p['x'] += vx / d * corr; p['y'] += vy / d * corr
            p['x'] = min(W - 30, max(30, p['x']))
            p['y'] = min(H - 30, max(30, p['y']))
        if not moved:
            break
    # Fase 2: separación pura. Si una banda está sobrepoblada es imposible
    # mantener a todos sobre el anillo; se deja que los sobrantes se desvíen
    # lo mínimo para garantizar cero solapes en la semilla exportada.
    for _ in range(160):
        moved = False
        for i in range(len(ids)):
            a = pos[ids[i]]
            for j in range(i + 1, len(ids)):
                b = pos[ids[j]]
                dx = b['x'] - a['x']; dy = b['y'] - a['y']
                dist = math.hypot(dx, dy) or 0.01
                mind = size_of.get(ids[i], 28) + size_of.get(ids[j], 28) + 6
                if dist < mind:
                    push = (mind - dist) / 2
                    ux, uy = dx / dist, dy / dist
                    a['x'] -= ux * push; a['y'] -= uy * push
                    b['x'] += ux * push; b['y'] += uy * push
                    moved = True
        for k in ids:
            p = pos[k]
            p['x'] = min(W - 30, max(30, p['x']))
            p['y'] = min(H - 30, max(30, p['y']))
        if not moved:
            break
    return pos
