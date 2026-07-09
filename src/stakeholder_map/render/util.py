# -*- coding: utf-8 -*-
"""Utilidades de render: escape HTML y carga/ensamblado de assets."""
import html as html_mod
from importlib import resources


def esc(s):
    return html_mod.escape(str(s if s is not None else ''), quote=True)


def _asset(name):
    return resources.files('stakeholder_map.render').joinpath('assets', name).read_text(encoding='utf-8')


def _app_js():
    """Ensambla el JavaScript desde los módulos en assets/js/ (ordenados por
    nombre: 01_, 02_, ...). Cada módulo cubre una responsabilidad (arranque,
    i18n, layout, interacción, exportación, colores/etiquetas, idioma/init) para
    que un cambio en uno no toque el resto. El resultado es un único bloque, el
    mismo que antes vivía en app.js."""
    jsdir = resources.files('stakeholder_map.render').joinpath('assets', 'js')
    names = sorted(p.name for p in jsdir.iterdir() if p.name.endswith('.js'))
    return ''.join(jsdir.joinpath(n).read_text(encoding='utf-8') for n in names)

