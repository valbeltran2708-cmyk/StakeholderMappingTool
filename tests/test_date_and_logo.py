import base64
import pandas as pd
from datetime import datetime
from stakeholder_map.core import generate, _logo_html

_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")


def _demo(path):
    st = pd.DataFrame({
        'Stakeholder / entidad': ['Ministerio', 'Alcaldía', 'Operador'],
        'Nivel': ['Entidad', 'Entidad', 'Entidad'],
        'Tema / fuente': ['Tema A', 'Tema A', 'Tema B'],
        'Categoría': ['Gobierno', 'Gobierno', 'Privado'],
        'Interés en el proyecto': [4.5, 3.2, 5],
        'Poder / influencia': [4.8, 5, 3.3],
    })
    rel = pd.DataFrame({
        'Desde / entidad origen': ['Ministerio'],
        'Hacia / entidad destino': ['Alcaldía'],
        'Tipo de relación': ['Coordinación'],
        'Fuerza de la relación (1-5)': [4],
    })
    with pd.ExcelWriter(path, engine='openpyxl') as w:
        st.to_excel(w, sheet_name='01_Stakeholders', index=False)
        rel.to_excel(w, sheet_name='02_Relationships', index=False)


def test_outputs_have_date_prefix(tmp_path):
    src = tmp_path / 'in.xlsx'; _demo(src)
    out = tmp_path / 'out'
    generate(str(src), str(out))
    pref = datetime.now().strftime('%y%m%d') + '_'
    assert (out / f'{pref}stakeholder_map.html').exists()
    assert (out / f'{pref}stakeholder_nodes_coordinates.csv').exists()
    assert (out / f'{pref}stakeholder_map_coordinates.xlsx').exists()


def test_logo_helper():
    import tempfile, os
    fd, path = tempfile.mkstemp(suffix='.png'); os.write(fd, _PNG); os.close(fd)
    try:
        assert _logo_html(path).startswith("<img class='topLogo'")
        assert 'data:image/png;base64' in _logo_html(path)
        assert _logo_html(None) == ''
        assert _logo_html('/no/existe.png') == ''
    finally:
        os.unlink(path)


def test_logo_embeds_and_position(tmp_path):
    logo = tmp_path / 'logo.png'; logo.write_bytes(_PNG)
    src = tmp_path / 'in.xlsx'; _demo(src)
    pref = datetime.now().strftime('%y%m%d') + '_'
    out = tmp_path / 'outL'
    generate(str(src), str(out), logo_path=str(logo), logo_position='left')
    html = (out / f'{pref}stakeholder_map.html').read_text(encoding='utf-8')
    assert "class='topLogo'" in html and 'data:image/png;base64' in html
    # posición izquierda: el logo va antes del título
    top = html.split("<div class='top'>", 1)[1].split('</div>', 1)[0]
    assert top.index('topLogo') < top.index('app_title')


def test_logo_img_mime():
    from stakeholder_map.core import _logo_img
    assert 'image/svg+xml' in _logo_img(b'<svg/>', '.svg')
    assert 'image/png' in _logo_img(b'x', '.png')


def test_bundled_logo_default_empty():
    from stakeholder_map.core import _bundled_logo
    # sin logo en los assets del paquete, no debe devolver nada
    assert _bundled_logo() == ''


def test_bundled_logo_reads_from_assets(tmp_path):
    from importlib import resources
    from pathlib import Path
    from stakeholder_map.core import _bundled_logo
    base = Path(str(resources.files('stakeholder_map.render').joinpath('assets')))
    if not base.is_dir():
        import pytest; pytest.skip('assets no es un directorio en disco')
    target = base / 'logo.png'
    if target.exists():
        import pytest; pytest.skip('ya hay un logo en assets')
    try:
        target.write_bytes(_PNG)
        html = _bundled_logo()
        assert "class='topLogo'" in html and 'data:image/png;base64' in html
    finally:
        if target.exists():
            target.unlink()
