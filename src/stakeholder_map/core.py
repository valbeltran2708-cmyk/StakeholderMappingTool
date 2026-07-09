# -*- coding: utf-8 -*-
"""Pipeline principal: lee el Excel, normaliza, fusiona multi-tema, valida,
calcula los tres layouts y orquesta la generación de salidas.

La lógica de negocio vive aquí; los algoritmos de posicionamiento están en
`layouts/`, la presentación en `render/` y la configuración en `config.py`.
"""
import math
from pathlib import Path

import pandas as pd

from .config import (CX, CY, THEME_PALETTE, CATEGORY_PALETTE, REL_PALETTE,
                     MULTI_STROKE)
from .normalize import clean, cell_val, norm_pol, slug, parse_tags
from .scales import (build_scale, radius_for_rank, size_for_rank, to_num,
                     order_scale)
from .excel_io import (sheet, load_scales, load_style_config,
                       load_unified_config, load_term_dict)
from .layouts import resolve_overlaps, add_network_layout, add_quadrant_coords

NODE_RENAMES = {
    'entity_id': 'id', 'entity_name': 'label', 'parent_id': 'parent_id',
    'level': 'level', 'case_source': 'source', 'category_primary': 'category',
    'description_or_function': 'description', 'project_interest': 'interest',
    'influence_power': 'power', 'notes': 'notes',
    'Stakeholder / entidad': 'label', 'Entidad padre / grupo': 'parent_name',
    'Nivel': 'level', 'Tema / fuente': 'source', 'Categoría': 'category',
    'Categoria': 'category', 'Esfera': 'category', 'Esferas': 'category',
    'Categorías': 'tags', 'Categorias': 'tags', 'Etiquetas': 'tags',
    'Descripción / función': 'description',
    'Dimensión': 'source', 'Dimension': 'source',
    'Alias / acrónimo': 'alias', 'Alias / acronimo': 'alias', 'Alias': 'alias',
    'Stakeholder / entidad (EN)': 'label_en', 'Nombre (EN)': 'label_en',
    'Name (EN)': 'label_en', 'Entity name (EN)': 'label_en',
    'Alias (EN)': 'alias_en', 'Alias / acrónimo (EN)': 'alias_en',
    'Descripción / función (EN)': 'desc_en', 'Descripción (EN)': 'desc_en',
    'Descripcion (EN)': 'desc_en', 'Description (EN)': 'desc_en',
    'Acrónimo': 'alias', 'Acronimo': 'alias', 'Short name': 'alias',
    'Importancia en el proyecto': 'importance', 'Importancia': 'importance',
    'Importance': 'importance', 'Project importance': 'importance',
    'Descripcion / funcion': 'description', 'Interés en el proyecto': 'interest',
    'Interes en el proyecto': 'interest', 'Poder / influencia': 'power',
    'Notas': 'notes',
}

REL_RENAMES = {
    'source': 'source', 'target': 'target', 'source_id': 'source',
    'target_id': 'target', 'source_name': 'source_name', 'target_name': 'target_name',
    'Desde / entidad origen': 'source_name', 'Hacia / entidad destino': 'target_name',
    'relationship_type': 'type', 'Tipo de relación': 'type', 'Tipo de relacion': 'type',
    'strength': 'strength', 'Fuerza de la relación (1-5)': 'strength',
    'Fuerza de la relacion (1-5)': 'strength', 'direction': 'direction',
    'Dirección': 'direction', 'Direccion': 'direction', 'polarity': 'polarity',
    'Efecto / polaridad': 'polarity', 'theme': 'theme',
    'Tema de la relación': 'theme', 'Tema de la relacion': 'theme',
    'Dimensión de la relación': 'theme', 'Dimension de la relacion': 'theme',
    'description': 'description', 'Descripción de la relación': 'description',
    'Descripcion de la relacion': 'description',
}


def _load_terms(path, warnings):
    try:
        return load_term_dict(path, warnings)
    except Exception:
        return {}


def _load_styles_and_scales(path, warnings):
    """Configuración unificada (03_Config) con prioridad; hojas separadas
    03A/03B/03D como compatibilidad hacia atrás."""
    cat_colors, rel_styles = load_style_config(path, warnings)
    scales_cfg = load_scales(path, warnings)
    theme_colors = {}
    uni = load_unified_config(path, warnings)
    if uni:
        for k, v in uni['cat_colors'].items():
            if v:
                cat_colors[k] = v
        for k, v in uni['rel_styles'].items():
            color = v['color'] or rel_styles.get(k, rel_styles['']).get('color', '#999999')
            rel_styles[k] = {'color': color, 'dash': v['dash']}
        if uni['scales']['interest']:
            scales_cfg['interest'] = uni['scales']['interest']
        if uni['scales']['power']:
            scales_cfg['power'] = uni['scales']['power']
        if uni['scales'].get('importance'):
            scales_cfg['importance'] = uni['scales']['importance']
        theme_colors = dict(uni.get('theme_colors') or {})
    return cat_colors, rel_styles, scales_cfg, theme_colors


def _warn_scale_quality(st, scale, warnings):
    """Advertencias de calidad de las escalas: mezcla de etiquetas y números,
    o valores numéricos fuera de la escala explícita."""
    for col, mode, bounds, nombre in (
            ('interest', scale['i_mode'], scale['i_bounds'], 'interés'),
            ('power', scale['p_mode'], scale['p_bounds'], 'poder')):
        vals = [v for v in st[col] if v]
        nums = [to_num(v) for v in vals]
        n_num = sum(1 for x in nums if x is not None)
        if 0 < n_num < len(vals):
            warnings.append(
                f"La columna de {nombre} mezcla números y etiquetas; el orden puede "
                f"quedar alfabético. Usa solo etiquetas o solo números.")
        if mode == 'num' and bounds:
            t0, t1 = bounds
            fuera = [v for v, x in zip(vals, nums)
                     if x is not None and (x < t0 or x > t1)]
            if fuera:
                warnings.append(
                    f"{len(fuera)} valor(es) de {nombre} fuera de la escala "
                    f"[{cell_val(t0)}–{cell_val(t1)}] definida en la configuración; "
                    f"se recortan al límite.")


def read_data(path):
    """Devuelve (nodes, edges, hoja_nodos, hoja_rel, warnings, cat_colors,
    rel_styles, scale). scale incluye 'net_r' (radio de la vista de red)."""
    warnings = []
    cat_colors, rel_styles, scales_cfg, theme_colors = _load_styles_and_scales(path, warnings)

    # Camino rápido: Excel de coordenadas ya procesado
    nodes_df, ns = sheet(path, ['nodes_for_visualizers', 'nodes_cleaned'])
    edges_df, es = sheet(path, ['edges_for_visualizers', 'relationships_cleaned'])
    if not nodes_df.empty and 'id' in nodes_df.columns and 'x' in nodes_df.columns:
        nodes = nodes_df.fillna('').to_dict('records')
        edges = [] if edges_df.empty else edges_df.fillna('').to_dict('records')
        for n in nodes:
            n['interest'] = cell_val(n.get('interest', ''))
            n['power'] = cell_val(n.get('power', ''))
        scale = build_scale([n.get('interest', '') for n in nodes],
                            [n.get('power', '') for n in nodes], scales_cfg)
        irank, prank = scale['irank'], scale['prank']
        for n in nodes:
            n.setdefault('qx', n.get('x')); n.setdefault('qy', n.get('y'))
            n['ir'] = round(irank(n.get('interest', '')), 3)
            n['pr'] = round(prank(n.get('power', '')), 3)
            n.setdefault('themes', [{'theme': n.get('source', ''),
                                     'interest': n.get('interest', ''),
                                     'power': n.get('power', ''),
                                     'ir': n['ir'], 'pr': n['pr']}])
            n.setdefault('multi', False)
            n['importance'] = cell_val(n.get('importance', ''))
            n.setdefault('alias', '')
            n.setdefault('label_en', ''); n.setdefault('alias_en', '')
            n.setdefault('desc_en', '')
            tv = n.get('tags', [])
            if not isinstance(tv, list):
                tv = str(tv).strip().strip('[]')
                tv = parse_tags(tv.replace("'", '').replace('"', ''))
            n['tags'] = tv
            n['r'] = size_for_rank(n['pr'], scale['NP'])
        scale['terms'] = _load_terms(path, warnings)
        scale['net_r'] = add_network_layout(nodes, edges)
        return nodes, edges, ns, es, warnings, cat_colors, rel_styles, scale

    # Camino friendly
    st, ns = sheet(path, ['01_Stakeholders', '01_nodes_power_interest'])
    rel, es = sheet(path, ['02_Relationships', '02_Relaciones', '02_relationships'])
    if st.empty:
        raise ValueError('No encontré la hoja de stakeholders. Usa 01_Stakeholders '
                         'o el Excel de coordenadas.')

    st = st.rename(columns=NODE_RENAMES)
    for col in ['id', 'label', 'alias', 'label_en', 'alias_en', 'desc_en',
                'parent_id', 'parent_name', 'level', 'source',
                'category', 'tags', 'description', 'interest', 'power',
                'importance', 'notes']:
        if col not in st.columns:
            st[col] = ''
        st[col] = st[col].apply(clean)
    # Categorías (etiquetas múltiples por actor): 'A; B, C' -> ['A', 'B', 'C']
    st['tags'] = st['tags'].apply(parse_tags)
    if 'label' not in st.columns or st['label'].eq('').all():
        raise ValueError("La hoja de stakeholders no tiene columna de nombre "
                         "('Stakeholder / entidad').")
    st = st[st.label != ''].copy()
    st['level'] = st.level.replace({'Entity': 'Entidad', 'Subdivision': 'Subdivisión'})

    st['id'] = st.apply(lambda r: r.id or slug(r.label), axis=1)
    st['interest'] = st.interest.apply(cell_val)
    st['power'] = st.power.apply(cell_val)
    st['importance'] = st.importance.apply(cell_val)

    # Escala dinámica (categórica o numérica continua)
    scale = build_scale(list(st.interest), list(st.power), scales_cfg)
    imp_order = order_scale(list(st.importance), scales_cfg.get('importance'))
    scale['importance_order'] = imp_order
    scale['terms'] = _load_terms(path, warnings)
    _imp_rank = {v: i for i, v in enumerate(imp_order)}

    def imprank(v):
        return _imp_rank.get(v, -1)
    irank, prank = scale['irank'], scale['prank']
    _warn_scale_quality(st, scale, warnings)

    # Multi-tema: una entidad puede aparecer en varias filas (un tema por fila)
    # con puntuaciones distintas. Se fusiona en UN nodo: interés/poder = el
    # mayor de sus temas (criterio de mayor riesgo), borde = tema dominante,
    # y se guarda el desglose por tema para la lente temática.
    rows, tlists = [], []
    for lbl, g in st.groupby('label', sort=False):
        base = g.iloc[0].to_dict()
        tlist = [{'theme': clean(rr['source']), 'interest': rr['interest'],
                  'power': rr['power'],
                  'ir': round(irank(rr['interest']), 3),
                  'pr': round(prank(rr['power']), 3)}
                 for _, rr in g.iterrows()]
        base['interest'] = max(g['interest'], key=irank)
        base['power'] = max(g['power'], key=prank)
        base['importance'] = max(g['importance'], key=imprank)
        gi = g.assign(_sc=g['interest'].map(irank) + g['power'].map(prank))
        base['source'] = gi.sort_values('_sc', ascending=False).iloc[0]['source']
        seen_t = []
        for tl in g['tags']:
            for t in tl:
                if t not in seen_t:
                    seen_t.append(t)
        base['tags'] = seen_t
        for c in ['id', 'alias', 'label_en', 'alias_en', 'desc_en',
                  'description', 'notes', 'category', 'level',
                  'parent_name', 'parent_id']:
            ne = [x for x in g[c] if str(x).strip()]
            base[c] = ne[0] if ne else base.get(c, '')
        base['id'] = base['id'] or slug(lbl)
        rows.append(base)
        tlists.append(tlist if len(g) > 1 else None)
    st = pd.DataFrame(rows)
    seen, ids = {}, []
    for i in st.id:
        seen[i] = seen.get(i, 0) + 1
        ids.append(i if seen[i] == 1 else f'{i}_{seen[i]}')
    st['id'] = ids
    themes_by_id = {st.id.iloc[k]: tlists[k] for k in range(len(tlists)) if tlists[k]}
    if themes_by_id:
        warnings.append(f"{len(themes_by_id)} entidad(es) en varias dimensiones se fusionaron "
                        f"en un nodo (interés/poder = el mayor; desglose por dimensión en el panel).")

    name_id = dict(zip(st.label, st.id))
    st['parent_id'] = st.apply(
        lambda r: r.parent_id or name_id.get(r.parent_name,
                                             slug(r.parent_name) if r.parent_name else ''),
        axis=1)

    # Validaciones de nodos
    idset_tmp = set(st.id)
    for cond, msg in ((st.category == '', 'sin esfera'),
                      (st.interest == '', 'sin interés'),
                      (st.power == '', 'sin poder')):
        faltan = st[cond].label.tolist()
        if faltan:
            warnings.append(f"{len(faltan)} stakeholder(s) {msg}: "
                            f"{', '.join(faltan[:6])}{'…' if len(faltan) > 6 else ''}")
    if st.importance.ne('').any():
        sin_imp = st[st.importance == ''].label.tolist()
        if sin_imp:
            warnings.append(f"{len(sin_imp)} stakeholder(s) sin importancia: "
                            f"{', '.join(sin_imp[:6])}{'…' if len(sin_imp) > 6 else ''}")
    orphan_sub = st[(st.level.str.lower() == 'subdivisión')
                    & (~st.parent_id.isin(idset_tmp))
                    & (st.parent_id != '')].label.tolist()
    if orphan_sub:
        warnings.append(f"{len(orphan_sub)} subdivisión(es) cuyo padre no existe: "
                        f"{', '.join(orphan_sub[:6])}")
    cats_used = set(st[st.category != ''].category)
    no_color = sorted(c for c in cats_used if c not in cat_colors)
    for i, c in enumerate(no_color):
        cat_colors[c] = CATEGORY_PALETTE[i % len(CATEGORY_PALETTE)]
    if no_color:
        warnings.append(f"Esferas sin color en la configuración; se asignó color "
                        f"automático: {', '.join(no_color[:6])}")

    # ---- Layout radial: semilla por categoría/interés, luego resolver solapes ----
    main = st[st.level.str.lower() != 'subdivisión'].copy()
    if main.empty:
        main = st.copy()
    cats = sorted(main.category.unique())
    ci = {k: i for i, k in enumerate(cats)}
    pos = {}
    NI, NP = scale['NI'], scale['NP']
    for (cat, interest), g in main.groupby(['category', 'interest'], dropna=False):
        start = 2 * math.pi * ci.get(cat, 0) / max(len(cats), 1)
        end = 2 * math.pi * (ci.get(cat, 0) + 1) / max(len(cats), 1)
        rad = radius_for_rank(irank(interest), NI)
        n = len(g)
        for j, (_, r) in enumerate(g.iterrows()):
            a = (start + end) / 2 if n == 1 else start + (end - start) * (j + 0.5) / n
            pos[r.id] = {'x': CX + rad * math.cos(a), 'y': CY + rad * math.sin(a), 'a': a}
    for pid, g in st[st.level.str.lower() == 'subdivisión'].groupby('parent_id', dropna=False):
        p = pos.get(pid, {'x': CX, 'y': CY, 'a': 0})
        n = len(g)
        ring = max(95, 26 * n / math.pi)
        for j, (_, r) in enumerate(g.iterrows()):
            a = 2 * math.pi * j / n if n > 6 else p['a'] + (j - (n - 1) / 2) * 0.34
            pos[r.id] = {'x': p['x'] + ring * math.cos(a), 'y': p['y'] + ring * math.sin(a), 'a': a}

    radius_of = {r.id: radius_for_rank(irank(r.interest), NI) for _, r in st.iterrows()}
    size_of = {r.id: size_for_rank(prank(r.power), NP) for _, r in st.iterrows()}
    pos = resolve_overlaps(pos, size_of, radius_of)

    # Borde por tema/fuente: el color definido en 03_Config manda; los temas
    # sin color reciben uno automático de la paleta
    src_present = sorted(s for s in dict.fromkeys(st.source) if s)
    src_colors = {s: THEME_PALETTE[i % len(THEME_PALETTE)] for i, s in enumerate(src_present)}
    src_colors.update({k: v for k, v in theme_colors.items() if v})

    nodes = []
    for _, r in st.iterrows():
        p = pos.get(r.id, {'x': CX, 'y': CY})
        nodes.append({
            'id': r.id, 'label': r.label, 'alias': r.alias,
            'label_en': r.label_en, 'alias_en': r.alias_en, 'desc_en': r.desc_en,
            'parent_id': r.parent_id, 'level': r.level,
            'source': r.source, 'category': r.category, 'description': r.description,
            'interest': r.interest, 'power': r.power, 'notes': r.notes,
            'tags': list(r.tags) if isinstance(r.tags, list) else parse_tags(r.tags),
            'importance': r.importance,
            'x': round(p['x'], 2), 'y': round(p['y'], 2),
            'r': size_for_rank(prank(r.power), NP),
            'ir': round(irank(r.interest), 3), 'pr': round(prank(r.power), 3),
            'fill': cat_colors.get(r.category, '#BFBFBF'),
            'stroke': MULTI_STROKE if r.id in themes_by_id else src_colors.get(r.source, '#667085'),
            'themes': themes_by_id.get(r.id, [{'theme': r.source, 'interest': r.interest,
                                               'power': r.power,
                                               'ir': round(irank(r.interest), 3),
                                               'pr': round(prank(r.power), 3)}]),
            'multi': r.id in themes_by_id,
        })
    add_quadrant_coords(nodes, scale)

    idset = {n['id'] for n in nodes}
    id_label = {n['id']: n['label'] for n in nodes}

    # ---- Relaciones ----
    if rel.empty:
        rel = pd.DataFrame()
    rel = rel.rename(columns=REL_RENAMES)
    for col in ['source', 'target', 'source_name', 'target_name', 'type', 'strength',
                'direction', 'polarity', 'theme', 'description']:
        if col not in rel.columns:
            rel[col] = ''
        rel[col] = rel[col].apply(clean)
    if len(rel):
        rel['source'] = rel.apply(
            lambda r: r.source or name_id.get(r.source_name,
                                              slug(r.source_name) if r.source_name else ''), axis=1)
        rel['target'] = rel.apply(
            lambda r: r.target or name_id.get(r.target_name,
                                              slug(r.target_name) if r.target_name else ''), axis=1)

    # relaciones automáticas padre -> subdivisión
    pairs = set(zip(rel.source, rel.target)) if len(rel) else set()
    add = []
    for n in nodes:
        if n['parent_id'] and n['parent_id'] in idset and (n['parent_id'], n['id']) not in pairs:
            add.append({'source': n['parent_id'], 'target': n['id'],
                        'type': 'Subdivisión institucional', 'strength': '2',
                        'direction': 'De origen a destino', 'polarity': 'Neutral',
                        'theme': 'Estructura institucional',
                        'description': f"{n['label']} pertenece a {id_label.get(n['parent_id'], '')}."})
    if add:
        rel = pd.concat([rel, pd.DataFrame(add)], ignore_index=True)

    edges = []
    bad_endpoints = 0
    no_strength = 0
    for _, r in rel.iterrows():
        if r.source == r.target:
            continue
        if r.source not in idset or r.target not in idset:
            bad_endpoints += 1
            continue
        s = clean(r.strength)
        if s == '':
            no_strength += 1
        try:
            strength = int(float(s)) if s else 2
        except Exception:
            strength = 2
        typ = r.type or 'Relación'
        if typ not in rel_styles:
            rel_styles[typ] = {'color': REL_PALETTE[len([k for k in rel_styles if k]) % len(REL_PALETTE)],
                               'dash': False}
        style = rel_styles.get(typ, rel_styles[''])
        d = clean(r.direction).lower()
        directed = not (('bidirec' in d) or ('no dir' in d) or ('ambas' in d)
                        or ('undirect' in d) or ('sin dir' in d))
        edges.append({'source': r.source, 'target': r.target, 'type': typ,
                      'strength': max(1, min(5, strength)), 'direction': r.direction,
                      'polarity': r.polarity, 'pol': norm_pol(r.polarity),
                      'theme': r.theme, 'description': r.description,
                      'color': style['color'], 'dash': bool(style['dash']),
                      'directed': directed})
    if bad_endpoints:
        warnings.append(f"{bad_endpoints} relación(es) ignorada(s): origen o destino "
                        f"no existe en 01_Stakeholders.")
    if no_strength:
        warnings.append(f"{no_strength} relación(es) sin fuerza; se asumió 2.")

    scale['net_r'] = add_network_layout(nodes, edges)
    return nodes, edges, ns, es, warnings, cat_colors, rel_styles, scale


_LOGO_MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
              '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp'}
_LOGO_NAMES = ('logo.png', 'logo.jpg', 'logo.jpeg', 'logo.svg', 'logo.webp')


def _logo_img(data, ext):
    import base64 as _b64
    mime = _LOGO_MIME.get(str(ext).lower(), 'image/png')
    b = _b64.b64encode(data).decode('ascii')
    return f"<img class='topLogo' src='data:{mime};base64,{b}' alt='logo'/>"


def _logo_html(logo_path):
    if not logo_path:
        return ''
    from pathlib import Path as _P
    q = _P(logo_path)
    if not q.exists() or not q.is_file():
        return ''
    return _logo_img(q.read_bytes(), q.suffix)


def _bundled_logo():
    """Busca un archivo logo.* dentro de los assets del paquete
    (src/stakeholder_map/render/assets/). Si existe, lo devuelve incrustado.
    Permite dejar el logo junto al codigo y que viaje con el."""
    try:
        from importlib import resources
        base = resources.files('stakeholder_map.render').joinpath('assets')
    except Exception:
        return ''
    for name in _LOGO_NAMES:
        try:
            f = base.joinpath(name)
            if f.is_file():
                return _logo_img(f.read_bytes(), '.' + name.rsplit('.', 1)[1])
        except Exception:
            continue
    return ''


def generate(input_path, outdir, logo_path=None, logo_position='right'):
    """Ejecuta el pipeline completo y escribe todas las salidas en `outdir`.
    Devuelve un dict con rutas, conteos y advertencias."""
    from .render.html import build_html
    from .export import write_tables

    nodes, edges, ns, es, warnings, cat_colors, rel_styles, scale = read_data(Path(input_path))
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    from datetime import datetime as _dt
    prefix = _dt.now().strftime('%y%m%d') + '_'
    logo_html = _logo_html(logo_path) or _bundled_logo()
    html_doc = build_html(nodes, edges, warnings, ns, es, scale, rel_styles, logo_html=logo_html, logo_position=logo_position)
    html_path = outdir / f'{prefix}stakeholder_map.html'
    html_path.write_text(html_doc, encoding='utf-8')
    paths = write_tables(nodes, edges, outdir, prefix)
    return {'html': html_path, 'tables': paths, 'warnings': warnings,
            'n_nodes': len(nodes), 'n_edges': len(edges), 'sheets': (ns, es)}
