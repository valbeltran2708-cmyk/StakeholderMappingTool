# -*- coding: utf-8 -*-
"""Entrada/salida de Excel y diálogos de selección de archivo y carpeta."""
import pandas as pd

from .config import DEFAULT_CATEGORY_COLORS, DEFAULT_REL_STYLES
from .normalize import clean, cell_val, is_hex


def sheet(path, names):
    """Devuelve (DataFrame, nombre_hoja) para el primer nombre que exista,
    con coincidencia exacta primero y parcial después."""
    xl = pd.ExcelFile(path, engine='openpyxl')
    for n in names:
        if n in xl.sheet_names:
            return pd.read_excel(path, sheet_name=n, engine='openpyxl'), n
    for n in names:
        for s in xl.sheet_names:
            if n.lower() in s.lower():
                return pd.read_excel(path, sheet_name=s, engine='openpyxl'), s
    return pd.DataFrame(), ''


def load_scales(path, warnings):
    """Lee 03D_Escalas si existe: orden explícito de niveles de interés y poder."""
    df, _ = sheet(path, ['03D_Escalas', '03D_Scales', 'Escalas', 'Scales'])
    out = {'interest': [], 'power': [], 'importance': []}
    if df is None or df.empty:
        return out
    for c in df.columns:
        lc = str(c).lower()
        vals = [cell_val(v) for v in df[c].tolist() if cell_val(v)]
        if 'inter' in lc:
            out['interest'] = vals
        elif 'poder' in lc or 'power' in lc:
            out['power'] = vals
        elif 'importan' in lc:
            out['importance'] = vals
    return out


def load_style_config(path, warnings):
    """Colores de categorías (03A) y estilos de relación (03B) desde el Excel."""
    cat_colors = dict(DEFAULT_CATEGORY_COLORS)
    df, _ = sheet(path, ['03A_Categories_Colors', 'Categories_Colors', 'categorias'])
    if not df.empty:
        df = df.rename(columns={'Categoría': 'category', 'Categoria': 'category',
                                'category': 'category', 'Color sugerido HEX': 'hex',
                                'Color HEX': 'hex', 'hex': 'hex'})
        if 'category' in df.columns and 'hex' in df.columns:
            for _, r in df.iterrows():
                k = clean(r.get('category')); v = clean(r.get('hex'))
                if not k:
                    continue
                if is_hex(v):
                    cat_colors[k] = v.upper()
                else:
                    warnings.append(f"Categoría '{k}' sin color HEX válido en 03A; uso color por defecto.")

    rel_styles = dict(DEFAULT_REL_STYLES)
    df, _ = sheet(path, ['03B_Relationship_Types', 'Relationship_Types', 'tipos_relacion'])
    if not df.empty:
        df = df.rename(columns={'Tipo de relación': 'type', 'Tipo de relacion': 'type',
                                'type': 'type', 'Color sugerido HEX': 'hex', 'hex': 'hex',
                                'Estilo de línea': 'style', 'Estilo de linea': 'style',
                                'style': 'style'})
        if 'type' in df.columns:
            for _, r in df.iterrows():
                k = clean(r.get('type'))
                if not k:
                    continue
                v = clean(r.get('hex')); st = clean(r.get('style')).lower()
                color = v.upper() if is_hex(v) else rel_styles.get(k, DEFAULT_REL_STYLES['']).get('color', '#999999')
                if v and not is_hex(v):
                    warnings.append(f"Tipo de relación '{k}' sin color HEX válido en 03B; uso color por defecto.")
                dash = st.startswith(('punte', 'dash', 'dot')) or 'punte' in st
                rel_styles[k] = {'color': color, 'dash': dash}
    return cat_colors, rel_styles


def load_unified_config(path, warnings):
    """Hoja única de configuración (03_Config): categorías + colores, tipos de
    relación + colores + estilo, escalas de interés y poder, y temas, todo en
    una sola hoja organizada por columnas. Devuelve None si no existe (y el
    lector cae a las hojas separadas 03A/03B/03D por compatibilidad).
    """
    df, name = sheet(path, ['03_Config', '03_Configuracion', '03_Configuración',
                            'Config', 'Configuracion', 'Configuración'])
    if df is None or df.empty or not name:
        return None

    cols = list(df.columns)
    low = [str(c).lower() for c in cols]

    def col_values(i):
        return [v for v in (clean(x) for x in df.iloc[:, i].tolist()) if v]

    def find(pred, start=0):
        for i in range(start, len(cols)):
            if pred(low[i]):
                return i
        return -1

    def next_color(i):
        j = find(lambda c: 'hex' in c or 'color' in c, i + 1)
        return j if 0 <= j <= i + 2 else -1

    out = {'cat_colors': {}, 'rel_styles': {},
           'scales': {'interest': [], 'power': [], 'importance': []},
           'themes': [], 'theme_colors': {}, 'sheet': name}

    ci = find(lambda c: 'esfera' in c)
    if ci < 0:
        ci = find(lambda c: 'categor' in c)
    if ci >= 0:
        hexi = next_color(ci)
        for k, r in enumerate(df.iloc[:, ci].tolist()):
            key = clean(r)
            if not key:
                continue
            v = clean(df.iloc[k, hexi]) if hexi >= 0 else ''
            if is_hex(v):
                out['cat_colors'][key] = v.upper()
            else:
                out['cat_colors'][key] = None
                if v:
                    warnings.append(f"Categoría '{key}' sin color HEX válido en {name}; uso color por defecto.")

    ti = find(lambda c: 'tipo' in c and 'relaci' in c)
    if ti < 0:
        ti = find(lambda c: 'relationship' in c or c == 'tipo')
    if ti >= 0:
        hexi = next_color(ti)
        sti = find(lambda c: 'estilo' in c or 'style' in c or 'línea' in c or 'linea' in c, ti + 1)
        if sti > ti + 3:
            sti = -1
        for k, r in enumerate(df.iloc[:, ti].tolist()):
            key = clean(r)
            if not key:
                continue
            v = clean(df.iloc[k, hexi]) if hexi >= 0 else ''
            st = clean(df.iloc[k, sti]).lower() if sti >= 0 else ''
            color = v.upper() if is_hex(v) else None
            if v and color is None:
                warnings.append(f"Tipo de relación '{key}' sin color HEX válido en {name}; uso color por defecto.")
            dash = st.startswith(('punte', 'dash', 'dot')) or 'punte' in st
            out['rel_styles'][key] = {'color': color, 'dash': dash}

    ii = find(lambda c: 'inter' in c and 'tipo' not in c)
    if ii >= 0:
        out['scales']['interest'] = [cell_val(v) for v in df.iloc[:, ii].tolist() if cell_val(v)]
    pi = find(lambda c: 'poder' in c or 'power' in c)
    if pi >= 0:
        out['scales']['power'] = [cell_val(v) for v in df.iloc[:, pi].tolist() if cell_val(v)]
    mi = find(lambda c: 'importan' in c)
    if mi >= 0:
        out['scales']['importance'] = [cell_val(v) for v in df.iloc[:, mi].tolist() if cell_val(v)]

    tj = find(lambda c: 'tema' in c or 'fuente' in c or 'theme' in c or 'dimensi' in c)
    if tj >= 0:
        hexi = next_color(tj)
        for k, r in enumerate(df.iloc[:, tj].tolist()):
            key = clean(r)
            if not key:
                continue
            out['themes'].append(key)
            v = clean(df.iloc[k, hexi]) if hexi >= 0 else ''
            if is_hex(v):
                out['theme_colors'][key] = v.upper()
            elif v:
                warnings.append(f"Tema '{key}' sin color HEX válido en {name}; "
                                f"uso color automático.")
    return out


def ask_file():
    """Diálogo de selección del Excel de entrada. Devuelve '' si se cancela."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk(); root.withdraw()
        f = filedialog.askopenfilename(title='Selecciona el Excel de entrada',
                                       filetypes=[('Excel', '*.xlsx *.xls')])
        root.destroy()
        return f
    except Exception:
        return ''


def ask_dir():
    """Diálogo de selección de la carpeta de resultados. Devuelve '' si se cancela."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk(); root.withdraw()
        d = filedialog.askdirectory(title='Selecciona la carpeta de resultados')
        root.destroy()
        return d
    except Exception:
        return ''
