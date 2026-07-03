# -*- coding: utf-8 -*-
"""Genera la plantilla Excel de entrada (examples/stakeholder_input_TEMPLATE.xlsx).

Diseño pensado para que el llenado sea difícil de hacer mal:

- Solo 3 hojas: 01_Stakeholders (datos), 02_Relaciones (datos) y
  03_Config (TODA la configuración en una hoja: categorías + colores,
  tipos de relación + colores + estilo, escalas y temas).
- Listas desplegables en las celdas, alimentadas desde 03_Config. Las de
  interés/poder, categoría, tema, tipo y origen/destino son SUGERENCIA,
  no bloqueo (errorStyle='warning'): puedes escribir un valor nuevo o un
  número decimal y Excel solo pregunta si estás seguro. Nivel, dirección
  y efecto sí son listas cerradas porque el lector las interpreta.
- Comentarios en cada cabecera explicando qué va en la columna.
- Las celdas de color HEX se pintan con su propio color (muestra visual).

Uso:  python tools/make_template.py [ruta_salida.xlsx]
"""
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from stakeholder_map.config import (ARUP_INK, ARUP_RED, DEFAULT_CATEGORY_COLORS,
                                    DEFAULT_REL_STYLES)  # noqa: E402

MAXR = 400  # filas cubiertas por las validaciones

HEAD_FILL = PatternFill('solid', fgColor=ARUP_INK.lstrip('#'))
HEAD_FONT = Font(bold=True, color='FFFFFF', size=11)
NOTE_FONT = Font(italic=True, color='6B7480', size=10)


def _head(ws, headers, widths, comments=None):
    for j, h in enumerate(headers, start=1):
        c = ws.cell(row=1, column=j, value=h)
        c.fill = HEAD_FILL
        c.font = HEAD_FONT
        c.alignment = Alignment(vertical='center', wrap_text=True)
        if comments and h in comments:
            cm = Comment(comments[h], 'Plantilla')
            cm.width = 320
            cm.height = 150
            c.comment = cm
        ws.column_dimensions[get_column_letter(j)].width = widths[j - 1]
    ws.row_dimensions[1].height = 30
    ws.freeze_panes = 'A2'


def _dv(ws, rng, formula, *, strict=False, prompt='', title=''):
    dv = DataValidation(
        type='list', formula1=formula, allow_blank=True,
        showErrorMessage=True,
        errorStyle=('stop' if strict else 'warning'),
        errorTitle=('Valor no válido' if strict else 'Valor fuera de la lista'),
        error=('Elige un valor de la lista.' if strict else
               'No está en la lista de 03_Config. Puedes continuar (Sí) si es '
               'intencional, por ejemplo un valor numérico decimal.'),
        promptTitle=title, prompt=prompt, showInputMessage=bool(prompt))
    ws.add_data_validation(dv)
    dv.add(rng)


def build(path):
    wb = Workbook()

    # ---------- 03_Config (se crea primero para poder referenciarla) ----------
    cfg = wb.active
    cfg.title = '03_Config'
    _head(cfg,
          ['Categoría', 'Color HEX', '', 'Tipo de relación', 'Color HEX',
           'Estilo de línea', '', 'Escala de interés', 'Escala de poder', '',
           'Temas / fuentes'],
          [26, 12, 3, 30, 12, 16, 3, 18, 18, 3, 28],
          comments={
              'Categoría': 'Una categoría por fila (columna A) con su color en la '
                           'columna B (#RRGGBB). Añade o cambia libremente: las '
                           'listas desplegables de 01_Stakeholders se actualizan solas.',
              'Tipo de relación': 'Tipos de relación disponibles en 02_Relaciones, '
                                  'con color (col. E) y estilo de línea (col. F: '
                                  'Sólida o Punteada).',
              'Escala de interés': 'Niveles de MENOR a MAYOR, uno por fila.\n\n'
                                   'Dos modos:\n'
                                   '1) Etiquetas: Bajo / Medio / Alto (o las que quieras).\n'
                                   '2) Números: escribe la escala (ej. 1,2,3,4,5) y en '
                                   '01_Stakeholders usa valores con decimales (1.1, 3.5) '
                                   'para diferenciar entidades de forma continua.\n\n'
                                   'No mezcles etiquetas y números.',
              'Escala de poder': 'Igual que la escala de interés: etiquetas O números, '
                                 'de menor a mayor.',
              'Temas / fuentes': 'Temas o fuentes de análisis (ej. Electrificación de '
                                 'flota, Resiliencia climática). Alimenta el desplegable '
                                 'de "Tema / fuente" en las dos hojas de datos.',
          })

    for i, (cat, col) in enumerate(DEFAULT_CATEGORY_COLORS.items(), start=2):
        cfg.cell(row=i, column=1, value=cat)
        c = cfg.cell(row=i, column=2, value=col)
        c.fill = PatternFill('solid', fgColor=col.lstrip('#'))
        c.font = Font(color='FFFFFF', bold=True, size=9)
    r = 2
    for typ, sty in DEFAULT_REL_STYLES.items():
        if not typ:
            continue
        cfg.cell(row=r, column=4, value=typ)
        c = cfg.cell(row=r, column=5, value=sty['color'])
        c.fill = PatternFill('solid', fgColor=sty['color'].lstrip('#'))
        c.font = Font(color='FFFFFF', bold=True, size=9)
        cfg.cell(row=r, column=6, value='Punteada' if sty['dash'] else 'Sólida')
        r += 1
    for i, v in enumerate(['Bajo', 'Medio', 'Alto'], start=2):
        cfg.cell(row=i, column=8, value=v)
        cfg.cell(row=i, column=9, value=v)
    cfg.cell(row=6, column=8, value='(o números: 1,2,3,4,5)').font = NOTE_FONT
    for i, t in enumerate(['Tema A', 'Tema B'], start=2):
        cfg.cell(row=i, column=11, value=t)
    _dv(cfg, f'F2:F{MAXR}', '"Sólida,Punteada"', strict=True)

    # ---------- 01_Stakeholders ----------
    st = wb.create_sheet('01_Stakeholders')
    st_headers = ['Stakeholder / entidad', 'Entidad padre / grupo', 'Nivel',
                  'Tema / fuente', 'Categoría', 'Descripción / función',
                  'Interés en el proyecto', 'Poder / influencia', 'Notas']
    _head(st, st_headers, [34, 26, 14, 22, 26, 44, 20, 20, 34], comments={
        'Stakeholder / entidad': 'Nombre visible del actor. Obligatorio.\n\n'
                                 'Multi-tema: repite el MISMO nombre en otra fila con '
                                 'otro "Tema / fuente" y sus propios interés/poder; la '
                                 'herramienta los fusiona en un nodo con desglose por tema.',
        'Entidad padre / grupo': 'Solo para subdivisiones: nombre EXACTO de la entidad '
                                 'a la que pertenece (debe existir en esta hoja).',
        'Nivel': 'Entidad (por defecto) o Subdivisión (área interna de una entidad).',
        'Tema / fuente': 'Tema o fuente de esta evaluación. La lista sale de 03_Config.',
        'Categoría': 'Categoría del actor. La lista y su color salen de 03_Config.',
        'Interés en el proyecto': 'Dos modos (definidos por la escala en 03_Config):\n'
                                  '1) Etiqueta: Bajo / Medio / Alto...\n'
                                  '2) Número con decimales (1.1, 3.5, 4.8) para '
                                  'diferenciar finamente entre entidades.\n\n'
                                  'El desplegable sugiere la escala; puedes escribir '
                                  'decimales y aceptar el aviso. No mezcles etiquetas '
                                  'y números en la columna.',
        'Poder / influencia': 'Igual que Interés: etiqueta de la escala o número con '
                              'decimales. Define el TAMAÑO del círculo.',
        'Notas': 'Contexto adicional; aparece en el panel de detalle.',
    })
    _dv(st, f'C2:C{MAXR}', '"Entidad,Subdivisión"', strict=True)
    _dv(st, f'D2:D{MAXR}', f"'03_Config'!$K$2:$K${MAXR}",
        prompt='Tema/fuente definido en 03_Config (puedes escribir uno nuevo).')
    _dv(st, f'E2:E{MAXR}', f"'03_Config'!$A$2:$A${MAXR}",
        prompt='Categoría definida en 03_Config (puedes escribir una nueva).')
    for col in ('G', 'H'):
        ref = '$H' if col == 'G' else '$I'
        _dv(st, f'{col}2:{col}{MAXR}', f"'03_Config'!{ref}$2:{ref}${MAXR}",
            title='Etiqueta o número',
            prompt='Elige un nivel de la escala O escribe un número con decimales '
                   '(ej. 3.5) para diferenciar entidades. Acepta el aviso al salir '
                   'de la lista.')
    _dv(st, f'B2:B{MAXR}', f"'01_Stakeholders'!$A$2:$A${MAXR}",
        prompt='Nombre exacto de la entidad padre (de la columna A).')
    ejemplo = ['(Ejemplo) Ministerio de Transporte', '', 'Entidad', 'Tema A',
               list(DEFAULT_CATEGORY_COLORS)[0], 'Rectoría de la política sectorial',
               'Alto', 'Alto', 'Borra esta fila al llenar la plantilla']
    for j, v in enumerate(ejemplo, start=1):
        st.cell(row=2, column=j, value=v).font = NOTE_FONT

    # ---------- 02_Relaciones ----------
    rel = wb.create_sheet('02_Relaciones')
    rel_headers = ['Desde / entidad origen', 'Hacia / entidad destino',
                   'Tipo de relación', 'Fuerza de la relación (1-5)', 'Dirección',
                   'Efecto / polaridad', 'Tema de la relación',
                   'Descripción de la relación']
    _head(rel, rel_headers, [32, 32, 30, 22, 24, 20, 24, 46], comments={
        'Desde / entidad origen': 'Nombre EXACTO del actor origen (columna A de '
                                  '01_Stakeholders). El desplegable ayuda a evitar typos.',
        'Hacia / entidad destino': 'Nombre EXACTO del actor destino.',
        'Tipo de relación': 'Tipo definido en 03_Config (color y estilo de la línea).',
        'Fuerza de la relación (1-5)': 'Entero de 1 (débil) a 5 (fuerte). '
                                       'Define el grosor de la línea. Vacío = 2.',
        'Dirección': 'De origen a destino, o Bidireccional (sin flecha).',
        'Efecto / polaridad': 'Positiva (apoya), Negativa (se opone) o Neutral. '
                              'Se usa en la capa "Color por efecto".',
        'Tema de la relación': 'Tema al que pertenece la relación (opcional).',
    })
    _dv(rel, f'A2:A{MAXR}', f"'01_Stakeholders'!$A$2:$A${MAXR}",
        prompt='Debe existir en 01_Stakeholders; si no, la relación se ignora con aviso.')
    _dv(rel, f'B2:B{MAXR}', f"'01_Stakeholders'!$A$2:$A${MAXR}",
        prompt='Debe existir en 01_Stakeholders; si no, la relación se ignora con aviso.')
    _dv(rel, f'C2:C{MAXR}', f"'03_Config'!$D$2:$D${MAXR}",
        prompt='Tipo definido en 03_Config (puedes escribir uno nuevo).')
    dvf = DataValidation(type='whole', operator='between', formula1='1', formula2='5',
                         allow_blank=True, showErrorMessage=True, errorStyle='warning',
                         errorTitle='Fuera de rango',
                         error='Se espera un entero de 1 a 5; otros valores se recortan.')
    rel.add_data_validation(dvf)
    dvf.add(f'D2:D{MAXR}')
    _dv(rel, f'E2:E{MAXR}', '"De origen a destino,Bidireccional"', strict=True)
    _dv(rel, f'F2:F{MAXR}', '"Positiva,Negativa,Neutral"', strict=True)
    _dv(rel, f'G2:G{MAXR}', f"'03_Config'!$K$2:$K${MAXR}",
        prompt='Tema definido en 03_Config (puedes escribir uno nuevo).')

    top = PatternFill('solid', fgColor=ARUP_RED.lstrip('#'))
    for ws in (st, rel, cfg):
        ws.sheet_properties.tabColor = ARUP_RED.lstrip('#')
        _ = top  # tab color como marca visual; sin más decoración

    wb.move_sheet('03_Config', offset=2)  # orden final: 01, 02, 03
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    print(f'Plantilla escrita en {path.resolve()}')


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else \
        Path(__file__).resolve().parents[1] / 'examples' / 'stakeholder_input_TEMPLATE.xlsx'
    build(out)
