# -*- coding: utf-8 -*-
"""Vista 'Conexiones' (systems thinking): posiciona los nodos por sus
relaciones con un layout force-directed y tamaño uniforme.

Corrección del solape de círculos (bug de v8): la versión anterior
resolvía las colisiones ANTES de reescalar el layout para que cupiera en
el lienzo. Cuando el reescalado reducía las distancias (factor < 1), los
círculos de radio fijo volvían a montarse unos sobre otros. Ahora:

1. El radio uniforme es adaptativo: se reduce con muchos nodos para que
   la suma de áreas siempre quepa en el lienzo (config.NET_FILL).
2. La pasada de separación de colisiones se ejecuta DESPUÉS del
   reescalado, sobre las coordenadas finales, con sujeción a un marco
   más holgado que el marco de ajuste (deja espacio para separar).

Devuelve el radio uniforme usado, que el HTML necesita para dibujar.
"""
import math
import random

from ..config import W, H, CX, CY, NET_R_MAX, NET_R_MIN, NET_FILL


def add_network_layout(nodes, edges):
    ids = [n['id'] for n in nodes]
    n = len(ids)
    if n == 0:
        return NET_R_MAX
    margin_fit, margin_clamp = 120, 60

    # Radio uniforme adaptativo: garantiza que los círculos caben sin solape
    avail = (W - 2 * margin_fit) * (H - 2 * margin_fit)
    urad = int(round(min(NET_R_MAX, max(NET_R_MIN, NET_FILL * math.sqrt(avail / n)))))

    idset = set(ids)
    deg = {}
    adj = []
    for e in edges:
        if e['source'] in idset and e['target'] in idset:
            adj.append((e['source'], e['target']))
            deg[e['source']] = deg.get(e['source'], 0) + 1
            deg[e['target']] = deg.get(e['target'], 0) + 1
    connected = [i for i in ids if deg.get(i, 0) > 0]
    isolated = [i for i in ids if deg.get(i, 0) == 0]
    sim = connected if connected else ids
    ns = len(sim)

    rnd = random.Random(42)
    P = {}
    for i, nid in enumerate(sim):
        ang = 2 * math.pi * i / max(ns, 1)
        P[nid] = [CX + 240 * math.cos(ang) + rnd.uniform(-6, 6),
                  CY + 240 * math.sin(ang) + rnd.uniform(-6, 6)]

    # Fruchterman-Reingold simplificado
    area = (W * 0.7) * (H * 0.7)
    k = math.sqrt(area / max(ns, 1))
    iters = 300 if ns <= 120 else 160
    t = W * 0.10
    for _ in range(iters):
        disp = {nid: [0.0, 0.0] for nid in sim}
        for i in range(ns):
            a = sim[i]; ax, ay = P[a]
            for j in range(i + 1, ns):
                b = sim[j]; bx, by = P[b]
                dx = ax - bx; dy = ay - by
                d = math.hypot(dx, dy) or 0.01
                f = k * k / d; ux, uy = dx / d, dy / d
                disp[a][0] += ux * f; disp[a][1] += uy * f
                disp[b][0] -= ux * f; disp[b][1] -= uy * f
        for s, tt in adj:
            ax, ay = P[s]; bx, by = P[tt]
            dx = ax - bx; dy = ay - by
            d = math.hypot(dx, dy) or 0.01
            f = d * d / k; ux, uy = dx / d, dy / d
            disp[s][0] -= ux * f; disp[s][1] -= uy * f
            disp[tt][0] += ux * f; disp[tt][1] += uy * f
        for nid in sim:
            disp[nid][0] += (CX - P[nid][0]) * 0.04
            disp[nid][1] += (CY - P[nid][1]) * 0.04
        for nid in sim:
            dx, dy = disp[nid]
            dd = math.hypot(dx, dy) or 0.01
            P[nid][0] += dx / dd * min(dd, t)
            P[nid][1] += dy / dd * min(dd, t)
        t *= 0.97

    # Aislados: rejilla ordenada, no dispersión física
    gap = urad * 2 + 14
    if connected and isolated:
        xs = [P[i][0] for i in connected]; ys = [P[i][1] for i in connected]
        cols = max(1, int(round(math.sqrt(len(isolated)))))
        startx = max(xs) + gap * 1.6; starty = min(ys)
        for idx, nid in enumerate(isolated):
            P[nid] = [startx + (idx % cols) * gap, starty + (idx // cols) * gap]
    elif isolated:
        cols = max(1, int(round(math.sqrt(len(isolated)))))
        rows = math.ceil(len(isolated) / cols)
        for idx, nid in enumerate(isolated):
            P[nid] = [CX + ((idx % cols) - (cols - 1) / 2) * gap,
                      CY + ((idx // cols) - (rows - 1) / 2) * gap]

    # Reescalado para caber en el lienzo (marco interior)
    xs = [P[i][0] for i in ids]; ys = [P[i][1] for i in ids]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    bw = (maxx - minx) or 1; bh = (maxy - miny) or 1
    sc = min((W - 2 * margin_fit) / bw, (H - 2 * margin_fit) / bh, 1.0)
    cxr = (minx + maxx) / 2; cyr = (miny + maxy) / 2
    for nid in ids:
        P[nid][0] = CX + (P[nid][0] - cxr) * sc
        P[nid][1] = CY + (P[nid][1] - cyr) * sc

    # Separación de colisiones SOBRE LAS COORDENADAS FINALES, con sujeción a
    # un marco más holgado que el de ajuste. Al terminar se VERIFICA el
    # resultado: el clamp del último ciclo puede reintroducir un roce y la
    # convergencia no está garantizada en grafos densos. Si queda algún
    # solape, se reduce el radio y se repite (hasta 5 pasadas).
    def _separate(rad):
        mind = rad * 2 + 6
        for _ in range(400):
            moved = False
            for i in range(n):
                a = ids[i]
                for j in range(i + 1, n):
                    b = ids[j]
                    dx = P[a][0] - P[b][0]; dy = P[a][1] - P[b][1]
                    d = math.hypot(dx, dy) or 0.01
                    if d < mind:
                        push = (mind - d) / 2
                        ux, uy = dx / d, dy / d
                        P[a][0] += ux * push; P[a][1] += uy * push
                        P[b][0] -= ux * push; P[b][1] -= uy * push
                        moved = True
            for nid in ids:
                P[nid][0] = min(W - margin_clamp, max(margin_clamp, P[nid][0]))
                P[nid][1] = min(H - margin_clamp, max(margin_clamp, P[nid][1]))
            if not moved:
                break
        for i in range(n):
            for j in range(i + 1, n):
                if math.hypot(P[ids[i]][0] - P[ids[j]][0],
                              P[ids[i]][1] - P[ids[j]][1]) < rad * 2 + 1:
                    return False
        return True

    tries = 0
    while not _separate(urad) and tries < 5:
        urad = max(9, int(round(urad * 0.9)))
        tries += 1

    for nd in nodes:
        p = P[nd['id']]
        nd['nx'] = round(p[0], 2)
        nd['ny'] = round(p[1], 2)
    return urad
