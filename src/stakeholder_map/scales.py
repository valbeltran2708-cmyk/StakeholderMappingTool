# -*- coding: utf-8 -*-
"""Escalas dinámicas de interés y poder, en dos modos:

- Categórico: etiquetas como Bajo / Medio / Alto (español o inglés) o el
  orden explícito definido en la configuración. Cada nivel es un rango.
- Numérico continuo: si TODOS los valores de la columna son números
  (enteros o decimales: 1, 1.1, 3.5, 5), la posición y el tamaño se
  interpolan de forma continua. Así 1.1 queda apenas por encima de 1.0,
  lo que permite desagregar la importancia relativa entre entidades sin
  inventar etiquetas. Los anillos y la matriz usan marcas enteras.

No mezclar etiquetas y números en la misma columna: en ese caso se cae al
orden alfabético y se emite una advertencia desde el pipeline.
"""
import math

from .config import R_IN, R_OUT, S_MIN, S_MAX
from .normalize import cell_val

KNOWN_LEVELS = {
    'muy bajo': 0, 'bajo': 1, 'baja': 1, 'medio bajo': 2, 'medio': 3,
    'media': 3, 'moderado': 3, 'moderada': 3, 'medio alto': 4, 'alto': 5,
    'alta': 5, 'muy alto': 6, 'muy alta': 6, 'ninguno': 0, 'nulo': 0,
    'very low': 0, 'low': 1, 'medium low': 2, 'medium': 3, 'med': 3,
    'medium high': 4, 'high': 5, 'very high': 6, 'none': 0,
}


def to_num(x):
    """float o None. Acepta coma decimal ('1,5')."""
    try:
        return float(str(x).replace(',', '.'))
    except Exception:
        return None


def nice_ticks(vmin, vmax, max_ticks=9):
    """Marcas enteras 'bonitas' que cubren [vmin, vmax] para anillos y matriz."""
    lo, hi = math.floor(vmin), math.ceil(vmax)
    if hi <= lo:
        return [lo]
    span = hi - lo
    step = max(1, math.ceil(span / (max_ticks - 1)))
    ticks = list(range(lo, hi + 1, step))
    if ticks[-1] < hi:
        ticks.append(hi)
    return ticks


def order_scale(values, explicit=None):
    """Niveles categóricos distintos ordenados de MENOR a MAYOR.
    Prioridad: orden explícito -> numérico -> etiquetas conocidas -> alfabético."""
    uniq = [v for v in dict.fromkeys(cell_val(v) for v in values) if v != '']
    if not uniq:
        return []
    if explicit:
        ex = [cell_val(e) for e in explicit if cell_val(e)]
        exset, uset = set(ex), set(uniq)
        return [e for e in ex if e in uset] + [u for u in uniq if u not in exset]
    if all(to_num(v) is not None for v in uniq):
        return sorted(uniq, key=to_num)
    low = [str(v).strip().lower() for v in uniq]
    if all(l in KNOWN_LEVELS for l in low):
        return sorted(uniq, key=lambda v: KNOWN_LEVELS[str(v).strip().lower()])
    return sorted(uniq, key=lambda v: str(v).lower())


def _axis(values, explicit):
    vals = [cell_val(v) for v in values if cell_val(v) != '']
    ex = [cell_val(e) for e in (explicit or []) if cell_val(e)]
    nums = [to_num(v) for v in vals]
    ex_nums = [to_num(e) for e in ex]
    numeric = bool(vals) and all(n is not None for n in nums) \
        and (not ex or all(n is not None for n in ex_nums))

    if numeric:
        pool = [n for n in nums] + [n for n in ex_nums]
        vmin, vmax = min(pool), max(pool)
        # La escala explícita (p. ej. 1..5 en la configuración) fija las marcas
        # aunque los datos solo lleguen a 4.2; sin explícita, marcas enteras.
        ticks = sorted(set(ex_nums)) if ex else nice_ticks(vmin, vmax)
        order = [cell_val(t) for t in ticks]
        n = max(len(order), 1)
        t0, t1 = ticks[0], ticks[-1]

        def rank(v):
            x = to_num(v)
            if x is None:
                return -1
            if t1 == t0:
                return 0.0
            return min(n - 1.0, max(0.0, (x - t0) / (t1 - t0) * (n - 1)))

        return {'mode': 'num', 'order': order, 'n': n, 'rank': rank,
                'bounds': (t0, t1)}

    order = order_scale(vals, explicit=ex or None)
    idx = {v: i for i, v in enumerate(order)}

    def rank(v):
        return idx.get(cell_val(v), -1)

    return {'mode': 'cat', 'order': order, 'n': len(order), 'rank': rank,
            'bounds': None}


def build_scale(interest_vals, power_vals, cfg=None):
    cfg = cfg or {}
    ai = _axis(interest_vals, cfg.get('interest'))
    ap = _axis(power_vals, cfg.get('power'))
    return {'interest_order': ai['order'], 'power_order': ap['order'],
            'NI': ai['n'], 'NP': ap['n'],
            'irank': ai['rank'], 'prank': ap['rank'],
            'i_mode': ai['mode'], 'p_mode': ap['mode'],
            'i_bounds': ai['bounds'], 'p_bounds': ap['bounds']}


def radius_for_rank(rank, n):
    """Radio de la banda para un rango de interés (mayor interés = más cerca).
    Acepta rangos fraccionarios en modo numérico continuo."""
    if rank is None or rank < 0:
        return R_OUT + 30
    if n <= 1:
        return (R_IN + R_OUT) / 2
    return R_OUT - (R_OUT - R_IN) * (rank / (n - 1))


def size_for_rank(rank, n):
    """Radio del círculo para un rango de poder (mayor poder = más grande)."""
    if rank is None or rank < 0:
        return S_MIN - 2
    if n <= 1:
        return round((S_MIN + S_MAX) / 2)
    return round(S_MIN + (S_MAX - S_MIN) * (rank / (n - 1)))
