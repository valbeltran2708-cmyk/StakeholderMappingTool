# -*- coding: utf-8 -*-
"""Limpieza y normalización de valores de celda del Excel."""
import re
import pandas as pd


def clean(x):
    """Texto limpio: sin NaN, sin espacios duplicados ni no separables."""
    if pd.isna(x):
        return ''
    return re.sub(r'\s+', ' ', str(x).replace('\xa0', ' ').strip())


def cell_val(x):
    """Normaliza un valor de celda a texto legible; 3.0 -> '3', conserva etiquetas."""
    if pd.isna(x):
        return ''
    if isinstance(x, bool):
        return clean(x)
    if isinstance(x, (int, float)):
        return str(int(x)) if float(x).is_integer() else clean(x)
    s = clean(x)
    try:
        f = float(s.replace(',', '.'))
        return str(int(f)) if f.is_integer() else s
    except Exception:
        return s


def norm_pol(x):
    """Polaridad de una relación: 'pos', 'neg' o 'neu'."""
    x = clean(x).lower()
    if any(t in x for t in ('posit', 'apoy', 'favor', 'aliad', 'a favor')):
        return 'pos'
    if any(t in x for t in ('negat', 'opos', 'oppos', 'contra', 'advers', 'bloque')):
        return 'neg'
    return 'neu'


def slug(x):
    """Identificador seguro derivado de un nombre."""
    x = clean(x).translate(str.maketrans('áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'))
    x = re.sub(r'\([^)]*\)', '', x)
    x = re.sub(r'[^A-Za-z0-9]+', '_', x).strip('_').upper()
    return x[:80] or 'NODE'


def is_hex(c):
    return bool(re.fullmatch(r'#[0-9A-Fa-f]{6}', clean(c)))
