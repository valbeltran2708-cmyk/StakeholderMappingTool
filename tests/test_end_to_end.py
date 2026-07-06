# -*- coding: utf-8 -*-
"""Flujo completo: Excel (hoja unificada, escala numérica decimal) -> salidas."""
import json
import re

import pandas as pd

from stakeholder_map import generate, read_data


def _demo_xlsx(path):
    st = pd.DataFrame({
        'Stakeholder / entidad': ['Ministerio', 'Alcaldía', 'Operador', 'Operador',
                                  'Dirección Técnica', 'ONG aislada'],
        'Entidad padre / grupo': ['', '', '', '', 'Operador', ''],
        'Nivel': ['Entidad', 'Entidad', 'Entidad', 'Entidad', 'Subdivisión', 'Entidad'],
        'Tema / fuente': ['Tema A', 'Tema A', 'Tema A', 'Tema B', 'Tema A', 'Tema B'],
        'Categoría': ['Gobierno', 'Gobierno', 'Privado', 'Privado', 'Privado', 'Sociedad'],
        'Descripción / función': ['d1', 'd2', 'd3', 'd3', 'd4', 'd5'],
        'Interés en el proyecto': [4.5, 3.2, 5, 4.1, 2.7, 1.4],
        'Poder / influencia': [4.8, 5, 3.3, 3.1, 2.2, 1.1],
        'Notas': [''] * 6,
    })
    rel = pd.DataFrame({
        'Desde / entidad origen': ['Ministerio', 'Alcaldía'],
        'Hacia / entidad destino': ['Alcaldía', 'Operador'],
        'Tipo de relación': ['Coordinación', 'Coordinación'],
        'Fuerza de la relación (1-5)': [4, 3],
        'Dirección': ['Bidireccional', 'De origen a destino'],
        'Efecto / polaridad': ['Positiva', 'Neutral'],
        'Tema de la relación': ['Tema A', 'Tema A'],
        'Descripción de la relación': ['x', 'y'],
    })
    cfg = pd.DataFrame({
        'Categoría': ['Gobierno', 'Privado', 'Sociedad', '', ''],
        'Color HEX': ['#1F4E79', '#E67E22', '#27AE60', '', ''],
        'Tipo de relación': ['Coordinación', '', '', '', ''],
        'Color HEX ': ['#5B9BD5', '', '', '', ''],
        'Estilo de línea': ['Sólida', '', '', '', ''],
        'Escala de interés': ['1', '2', '3', '4', '5'],
        'Escala de poder': ['1', '2', '3', '4', '5'],
        'Temas / fuentes': ['Tema A', 'Tema B', '', '', ''],
        'Color HEX  ': ['#0B5394', '#38761D', '', '', ''],
    })
    with pd.ExcelWriter(path, engine='openpyxl') as w:
        st.to_excel(w, sheet_name='01_Stakeholders', index=False)
        rel.to_excel(w, sheet_name='02_Relaciones', index=False)
        cfg.to_excel(w, sheet_name='03_Config', index=False)


def test_generate_end_to_end(tmp_path):
    src = tmp_path / 'in.xlsx'
    _demo_xlsx(src)
    out = tmp_path / 'out'
    res = generate(src, out)

    html = (out / 'stakeholder_map.html').read_text(encoding='utf-8')
    assert (out / 'stakeholder_map_coordinates.xlsx').exists()
    assert (out / 'stakeholder_nodes_coordinates.csv').exists()

    # Etiquetas de anillo: solo el nivel, sin el prefijo 'INTERÉS'
    labs = re.findall(r"class='ringlab'[^>]*>([^<]+)</text>", html)
    assert labs == ['1', '2', '3', '4', '5']
    assert 'INTERÉS' not in ''.join(labs)

    # Payload de datos: rangos continuos y radio de red presentes
    m = re.search(r"<script id='data' type='application/json'>(.*?)</script>",
                  html, re.S)
    data = json.loads(m.group(1).replace('\\u003c', '<')
                      .replace('\\u003e', '>').replace('\\u0026', '&'))
    assert data['net_r'] >= 8
    by_label = {n['label']: n for n in data['nodes']}
    assert 0 < by_label['ONG aislada']['ir'] < 1      # 1.4 en escala 1..5 -> rango fraccionario
    assert by_label['Operador']['multi'] is True      # fusión multi-dimensión
    assert by_label['Operador']['stroke'] == '#111111'  # borde propio de multi
    assert "value='__multi__'" in html                 # opción de filtro
    assert len(by_label['Operador']['themes']) == 2

    # Nodo Operador toma el interés MÁXIMO de sus temas (5 > 4.1)
    assert by_label['Operador']['interest'] == '5'

    # Relación automática padre -> subdivisión
    assert res['n_edges'] == 3

    # Color de tema definido en 03_Config aplicado al borde del nodo
    assert by_label['Ministerio']['stroke'] == '#0B5394'
    assert by_label['ONG aislada']['stroke'] == '#38761D'

    # Títulos de eje del cuadrante bilingües y separados de las marcas
    assert 'Project interest' in html
    assert 'Interés en el proyecto' in html


def test_read_data_warns_on_mixed_scale(tmp_path):
    src = tmp_path / 'mix.xlsx'
    st = pd.DataFrame({
        'Stakeholder / entidad': ['A', 'B'],
        'Nivel': ['Entidad', 'Entidad'],
        'Tema / fuente': ['T', 'T'],
        'Categoría': ['C1', 'C1'],
        'Interés en el proyecto': ['Alto', 3.5],
        'Poder / influencia': [2, 4],
    })
    with pd.ExcelWriter(src, engine='openpyxl') as w:
        st.to_excel(w, sheet_name='01_Stakeholders', index=False)
    *_, warnings, _cc, _rs, scale = read_data(src)
    assert any('mezcla números y etiquetas' in w for w in warnings)
    assert scale['p_mode'] == 'num'


def test_new_dimension_headers(tmp_path):
    """Las cabeceras 'Dimensión' / 'Dimensiones' funcionan igual que las antiguas."""
    src = tmp_path / 'dim.xlsx'
    st = pd.DataFrame({
        'Stakeholder / entidad': ['A', 'B'],
        'Nivel': ['Entidad', 'Entidad'],
        'Dimensión': ['D1', 'D2'],
        'Esfera': ['C1', 'C1'],
        'Categorías': ['Risk Reduction; Climate Finance', ''],
        'Interés en el proyecto': [2, 4],
        'Poder / influencia': [3, 5],
    })
    cfg = pd.DataFrame({
        'Esfera': ['C1', ''],
        'Color HEX': ['#1F4E79', ''],
        'Escala de interés': ['1', '5'],
        'Escala de poder': ['1', '5'],
        'Dimensiones': ['D1', 'D2'],
        'Color HEX  ': ['#0B5394', '#38761D'],
    })
    with pd.ExcelWriter(src, engine='openpyxl') as w:
        st.to_excel(w, sheet_name='01_Stakeholders', index=False)
        cfg.to_excel(w, sheet_name='03_Config', index=False)
    nodes, *_ = read_data(src)
    by = {n['label']: n for n in nodes}
    assert by['A']['source'] == 'D1' and by['A']['stroke'] == '#0B5394'
    assert by['A']['category'] == 'C1'
    assert by['A']['tags'] == ['Risk Reduction', 'Climate Finance']
    assert by['B']['tags'] == []
    assert by['B']['source'] == 'D2' and by['B']['stroke'] == '#38761D'
