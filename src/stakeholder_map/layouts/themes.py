# -*- coding: utf-8 -*-
"""Lente temática: para cada tema, posición radial y tamaño REALES de cada
actor según su puntuación en ese tema."""
import math

from ..config import CX, CY
from ..scales import radius_for_rank, size_for_rank
from .radial import resolve_overlaps
from .quadrant import quadrant_coords


def add_theme_layouts(nodes, scale):
    irank, prank = scale['irank'], scale['prank']
    NI, NP = scale['NI'], scale['NP']
    themes_all = sorted({t.get('theme', '') for n in nodes
                         for t in n.get('themes', []) if t.get('theme')})
    for n in nodes:
        n['tpos'] = {}; n['tquad'] = {}
    for T in themes_all:
        items = []
        for n in nodes:
            te = [t for t in n.get('themes', []) if t.get('theme') == T]
            if te:
                items.append({'id': n['id'], 'category': n.get('category', ''),
                              'interest': te[0].get('interest', ''),
                              'power': te[0].get('power', ''),
                              'ir': irank(te[0].get('interest', '')),
                              'pr': prank(te[0].get('power', ''))})
        if not items:
            continue
        cats = sorted({it['category'] for it in items})
        ci = {k: i for i, k in enumerate(cats)}
        groups = {}
        for it in items:
            groups.setdefault((it['category'], it['interest']), []).append(it)
        pos = {}
        for (cat, interest), g in groups.items():
            start = 2 * math.pi * ci.get(cat, 0) / max(len(cats), 1)
            end = 2 * math.pi * (ci.get(cat, 0) + 1) / max(len(cats), 1)
            rad = radius_for_rank(irank(interest), NI)
            ng = len(g)
            for j, it in enumerate(g):
                a = (start + end) / 2 if ng == 1 else start + (end - start) * (j + 0.5) / ng
                pos[it['id']] = {'x': CX + rad * math.cos(a), 'y': CY + rad * math.sin(a), 'a': a}
        size_of = {it['id']: size_for_rank(it['pr'], NP) for it in items}
        radius_of = {it['id']: radius_for_rank(it['ir'], NI) for it in items}
        pos = resolve_overlaps(pos, size_of, radius_of)
        qc = quadrant_coords(items, NI, NP)
        by_id = {n['id']: n for n in nodes}
        for it in items:
            p = pos.get(it['id'])
            if p:
                by_id[it['id']]['tpos'][T] = {'x': round(p['x'], 2), 'y': round(p['y'], 2),
                                              'r': size_for_rank(it['pr'], NP)}
            q = qc.get(it['id'])
            if q:
                by_id[it['id']]['tquad'][T] = {'qx': q['qx'], 'qy': q['qy']}
