# -*- coding: utf-8 -*-
"""Interfaz de línea de comandos.

Sin argumentos abre diálogos para elegir el Excel de entrada Y la carpeta
de resultados, y al terminar abre el HTML en el navegador. Con argumentos
funciona de forma no interactiva (apto para scripts y CI).
"""
import argparse
import webbrowser
from pathlib import Path

from . import __version__
from .core import generate
from .excel_io import ask_file, ask_dir


def main(argv=None):
    ap = argparse.ArgumentParser(
        prog='stakeholder-map',
        description='Genera el mapa interactivo de stakeholders a partir de un Excel.')
    ap.add_argument('--input', '-i', default='',
                    help='Excel de entrada. Si se omite, se abre un selector de archivo.')
    ap.add_argument('--output-dir', '-o', default=None,
                    help='Carpeta de resultados. Si se omite en modo interactivo, '
                         'se abre un selector de carpeta; si no, se usa ./outputs.')
    ap.add_argument('--open', action='store_true',
                    help='Abrir el HTML en el navegador al terminar.')
    ap.add_argument('--version', action='version', version=f'%(prog)s {__version__}')
    args = ap.parse_args(argv)

    interactive = not args.input
    f = args.input or ask_file()
    if not f:
        raise SystemExit('No seleccionaste archivo.')
    outdir = args.output_dir
    if outdir is None:
        outdir = (ask_dir() if interactive else '') or 'outputs'

    res = generate(f, outdir)
    ns, es = res['sheets']
    print('Hoja nodos:', ns, '| Hoja relaciones:', es)
    print('Nodos:', res['n_nodes'], '| Relaciones:', res['n_edges'])
    if res['warnings']:
        print('\nADVERTENCIAS DE VALIDACIÓN:')
        for w in res['warnings']:
            print('  -', w)
    else:
        print('Validación: sin advertencias.')
    print('\nGenerado:')
    print(' ', Path(res['html']).resolve())
    for p in res['tables']:
        print(' ', Path(p).resolve())
    if interactive or args.open:
        webbrowser.open(Path(res['html']).resolve().as_uri())
    return 0
