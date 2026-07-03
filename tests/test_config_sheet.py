# -*- coding: utf-8 -*-
"""La hoja unificada 03_Config alimenta colores, estilos y escalas."""
import pandas as pd

from stakeholder_map.excel_io import load_unified_config


def _write(path):
    cfg = pd.DataFrame({
        'Categoría': ['Gobierno', 'Academia', ''],
        'Color HEX': ['#112233', 'no-es-hex', ''],
        ' ': ['', '', ''],
        'Tipo de relación': ['Coordinación', 'Tensión', ''],
        'Color HEX ': ['#AABBCC', '#DDEEFF', ''],
        'Estilo de línea': ['Sólida', 'Punteada', ''],
        '  ': ['', '', ''],
        'Escala de interés': ['1', '3', '5'],
        'Escala de poder': ['Bajo', 'Medio', 'Alto'],
        '   ': ['', '', ''],
        'Temas / fuentes': ['Tema A', 'Tema B', ''],
    })
    st = pd.DataFrame({'Stakeholder / entidad': ['X'],
                       'Interés en el proyecto': ['3'],
                       'Poder / influencia': ['Alto']})
    with pd.ExcelWriter(path, engine='openpyxl') as w:
        st.to_excel(w, sheet_name='01_Stakeholders', index=False)
        cfg.to_excel(w, sheet_name='03_Config', index=False)


def test_unified_config_parsed(tmp_path):
    f = tmp_path / 'cfg.xlsx'
    _write(f)
    warnings = []
    uni = load_unified_config(f, warnings)
    assert uni is not None
    assert uni['cat_colors']['Gobierno'] == '#112233'
    assert uni['cat_colors']['Academia'] is None       # hex inválido -> aviso
    assert any('Academia' in w for w in warnings)
    assert uni['rel_styles']['Coordinación'] == {'color': '#AABBCC', 'dash': False}
    assert uni['rel_styles']['Tensión']['dash'] is True
    assert uni['scales']['interest'] == ['1', '3', '5']
    assert uni['scales']['power'] == ['Bajo', 'Medio', 'Alto']
    assert uni['themes'] == ['Tema A', 'Tema B']
