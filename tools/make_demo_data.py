# -*- coding: utf-8 -*-
"""Genera examples/ejemplo_movilidad.xlsx: dataset FICTICIO de demostración
(contexto de movilidad en Bogotá) que ejercita todas las capacidades:

- Escala NUMÉRICA continua 1-5 con decimales (1.5, 3.7, 4.8...) para
  interés y poder, definida en 03_Config.
- Dos temas (Electrificación de flota, Resiliencia climática) con
  entidades multi-tema evaluadas distinto en cada uno.
- Subdivisiones con entidad padre.
- Una entidad sin relaciones (prueba de la rejilla de aislados en la
  vista de conexiones).

Los datos son inventados con fines de demo; no representan evaluaciones
reales de ninguna institución.

Uso:  python tools/make_demo_data.py [ruta_salida.xlsx]
"""
import sys
from pathlib import Path

import pandas as pd

T1 = 'Electrificación de flota'
T2 = 'Resiliencia climática'
THEME_COLORS = {T1: '#0B5394', T2: '#38761D'}
TAGS = {
    'IDIGER': 'Risk Reduction; Disaster Management',
    'IDEAM': 'Knowledge & Prevention; Risk Reduction',
    'Banca multilateral': 'Climate Finance',
    'Findeter': 'Climate Finance; Risk Reduction',
    'Universidad de los Andes': 'Knowledge & Prevention',
    'TransMilenio S.A.': 'Disaster Management',
}

CATS = {
    'Gobierno nacional': '#1F4E79',
    'Gobierno distrital': '#2E86AB',
    'Operadores y sector privado': '#E67E22',
    'Academia': '#7D3C98',
    'Sociedad civil': '#27AE60',
    'Banca y cooperación': '#B7950B',
}

RELS = [
    ('Coordinación institucional', '#5B9BD5', 'Sólida'),
    ('Regulación / fiscalización', '#D62728', 'Sólida'),
    ('Financiación', '#2CA02C', 'Sólida'),
    ('Provisión de datos', '#8C564B', 'Sólida'),
    ('Participación / diálogo', '#17BECF', 'Sólida'),
    ('Tensión / dependencia', '#FF7F0E', 'Punteada'),
]

# nombre, padre, nivel, tema, categoría, descripción, interés, poder
STK = [
    ('Ministerio de Transporte', '', 'Entidad', T1, 'Gobierno nacional',
     'Rectoría de la política nacional de transporte.', 4.5, 4.8),
    ('Ministerio de Transporte', '', 'Entidad', T2, 'Gobierno nacional',
     'Lineamientos de adaptación en infraestructura.', 3.2, 4.8),
    ('Ministerio de Hacienda', '', 'Entidad', T1, 'Gobierno nacional',
     'Vigencias futuras y cofinanciación.', 2.3, 5.0),
    ('CREG', '', 'Entidad', T1, 'Gobierno nacional',
     'Regulación tarifaria de energía para patios de carga.', 2.8, 4.6),
    ('Alcaldía Mayor de Bogotá', '', 'Entidad', T1, 'Gobierno distrital',
     'Prioridad política del programa.', 4.9, 5.0),
    ('Alcaldía Mayor de Bogotá', '', 'Entidad', T2, 'Gobierno distrital',
     'Plan distrital de adaptación climática.', 4.4, 5.0),
    ('Secretaría Distrital de Movilidad', '', 'Entidad', T1, 'Gobierno distrital',
     'Autoridad de transporte de la ciudad.', 4.8, 4.5),
    ('Secretaría Distrital de Movilidad', '', 'Entidad', T2, 'Gobierno distrital',
     'Gestión de riesgo vial ante eventos climáticos.', 4.1, 4.5),
    ('TransMilenio S.A.', '', 'Entidad', T1, 'Gobierno distrital',
     'Ente gestor del sistema; implementa la flota eléctrica.', 5.0, 4.7),
    ('Dirección Técnica de Buses', 'TransMilenio S.A.', 'Subdivisión', T1,
     'Gobierno distrital', 'Especificaciones técnicas y patios.', 4.7, 3.1),
    ('Dirección de BRT y Cable', 'TransMilenio S.A.', 'Subdivisión', T2,
     'Gobierno distrital', 'Operación troncal ante inundaciones.', 3.9, 2.9),
    ('IDIGER', '', 'Entidad', T2, 'Gobierno distrital',
     'Gestión distrital del riesgo y cambio climático.', 4.2, 3.6),
    ('Grupo Energía Bogotá', '', 'Entidad', T1, 'Operadores y sector privado',
     'Infraestructura eléctrica para patios de carga.', 4.2, 4.4),
    ('Operadores privados de buses', '', 'Entidad', T1, 'Operadores y sector privado',
     'Concesionarios de operación y mantenimiento.', 4.4, 3.9),
    ('Fabricantes de buses eléctricos', '', 'Entidad', T1, 'Operadores y sector privado',
     'Proveen la flota y soporte postventa.', 4.6, 2.9),
    ('IDEAM', '', 'Entidad', T2, 'Gobierno nacional',
     'Información hidrometeorológica oficial.', 3.3, 3.2),
    ('Universidad de los Andes', '', 'Entidad', T1, 'Academia',
     'Evaluación independiente de la transición de flota.', 3.8, 2.4),
    ('Universidad de los Andes', '', 'Entidad', T2, 'Academia',
     'Modelación de vulnerabilidad climática del sistema.', 3.5, 2.2),
    ('ONG de movilidad sostenible', '', 'Entidad', T1, 'Sociedad civil',
     'Incidencia y veeduría técnica ciudadana.', 3.9, 1.8),
    ('Veedurías ciudadanas', '', 'Entidad', T2, 'Sociedad civil',
     'Control social; sin relaciones registradas aún (caso de prueba).', 3.1, 1.5),
    ('Banca multilateral', '', 'Entidad', T1, 'Banca y cooperación',
     'Crédito y asistencia técnica para la flota.', 3.6, 4.3),
    ('Banca multilateral', '', 'Entidad', T2, 'Banca y cooperación',
     'Líneas de financiamiento climático.', 3.4, 4.3),
    ('Findeter', '', 'Entidad', T2, 'Banca y cooperación',
     'Financiación de obras de drenaje y adaptación.', 2.9, 3.7),
]

# origen, destino, tipo, fuerza, dirección, efecto, tema, descripción
REL = [
    ('Ministerio de Transporte', 'Secretaría Distrital de Movilidad',
     'Coordinación institucional', 4, 'Bidireccional', 'Positiva', T1,
     'Articulación nación-distrito del programa.'),
    ('Ministerio de Transporte', 'TransMilenio S.A.', 'Regulación / fiscalización',
     3, 'De origen a destino', 'Neutral', T1, 'Marco normativo del sistema.'),
    ('Ministerio de Hacienda', 'TransMilenio S.A.', 'Financiación', 5,
     'De origen a destino', 'Positiva', T1, 'Cofinanciación de la flota.'),
    ('Ministerio de Hacienda', 'Alcaldía Mayor de Bogotá', 'Tensión / dependencia',
     3, 'Bidireccional', 'Negativa', T1, 'Negociación de vigencias futuras.'),
    ('CREG', 'Grupo Energía Bogotá', 'Regulación / fiscalización', 4,
     'De origen a destino', 'Neutral', T1, 'Tarifas de energía para patios.'),
    ('Alcaldía Mayor de Bogotá', 'Secretaría Distrital de Movilidad',
     'Coordinación institucional', 5, 'De origen a destino', 'Positiva', T1,
     'Dirección política del sector.'),
    ('Secretaría Distrital de Movilidad', 'TransMilenio S.A.',
     'Coordinación institucional', 5, 'Bidireccional', 'Positiva', T1,
     'Planeación y seguimiento de la operación.'),
    ('TransMilenio S.A.', 'Operadores privados de buses', 'Regulación / fiscalización',
     4, 'De origen a destino', 'Neutral', T1, 'Contratos de concesión.'),
    ('Operadores privados de buses', 'Fabricantes de buses eléctricos',
     'Tensión / dependencia', 3, 'Bidireccional', 'Neutral', T1,
     'Compra y garantía de la flota.'),
    ('Grupo Energía Bogotá', 'TransMilenio S.A.', 'Coordinación institucional', 4,
     'Bidireccional', 'Positiva', T1, 'Conexión eléctrica de patios.'),
    ('Banca multilateral', 'TransMilenio S.A.', 'Financiación', 4,
     'De origen a destino', 'Positiva', T1, 'Crédito para flota eléctrica.'),
    ('Banca multilateral', 'Findeter', 'Coordinación institucional', 2,
     'Bidireccional', 'Positiva', T2, 'Estructuración de líneas climáticas.'),
    ('Findeter', 'IDIGER', 'Financiación', 3, 'De origen a destino', 'Positiva',
     T2, 'Obras de mitigación de inundaciones.'),
    ('IDIGER', 'TransMilenio S.A.', 'Coordinación institucional', 3,
     'Bidireccional', 'Positiva', T2, 'Protocolos ante eventos extremos.'),
    ('IDEAM', 'IDIGER', 'Provisión de datos', 4, 'De origen a destino', 'Positiva',
     T2, 'Alertas y series climáticas.'),
    ('IDEAM', 'Universidad de los Andes', 'Provisión de datos', 3,
     'De origen a destino', 'Positiva', T2, 'Datos para modelación.'),
    ('Universidad de los Andes', 'Secretaría Distrital de Movilidad',
     'Provisión de datos', 3, 'De origen a destino', 'Positiva', T1,
     'Evaluación independiente.'),
    ('ONG de movilidad sostenible', 'TransMilenio S.A.', 'Participación / diálogo',
     2, 'Bidireccional', 'Negativa', T1, 'Cuestiona el ritmo de la transición.'),
    ('ONG de movilidad sostenible', 'Alcaldía Mayor de Bogotá',
     'Participación / diálogo', 3, 'De origen a destino', 'Positiva', T1,
     'Mesas de política pública.'),
    ('Alcaldía Mayor de Bogotá', 'IDIGER', 'Coordinación institucional', 4,
     'De origen a destino', 'Positiva', T2, 'Plan distrital de adaptación.'),
]


def build(path):
    st = pd.DataFrame(STK, columns=[
        'Stakeholder / entidad', 'Entidad padre / grupo', 'Nivel', 'Dimensión',
        'Esfera', 'Descripción / función', 'Interés en el proyecto',
        'Poder / influencia'])
    st['Notas'] = ''
    st['Categorías'] = st['Stakeholder / entidad'].map(TAGS).fillna('')
    st = st[['Stakeholder / entidad', 'Entidad padre / grupo', 'Nivel', 'Dimensión',
             'Esfera', 'Categorías', 'Descripción / función',
             'Interés en el proyecto', 'Poder / influencia', 'Notas']]
    rel = pd.DataFrame(REL, columns=[
        'Desde / entidad origen', 'Hacia / entidad destino', 'Tipo de relación',
        'Fuerza de la relación (1-5)', 'Dirección', 'Efecto / polaridad',
        'Dimensión de la relación', 'Descripción de la relación'])

    cats = list(CATS.items())
    n = max(len(cats), len(RELS), 5, 2)

    def pad(seq, fill=''):
        return list(seq) + [fill] * (n - len(seq))

    cfg = pd.DataFrame({
        'Esfera': pad([c for c, _ in cats]),
        'Color HEX': pad([h for _, h in cats]),
        ' ': pad([]),
        'Tipo de relación': pad([t for t, _, _ in RELS]),
        'Color HEX ': pad([c for _, c, _ in RELS]),
        'Estilo de línea': pad([s for _, _, s in RELS]),
        '  ': pad([]),
        'Escala de interés': pad(['1', '2', '3', '4', '5']),
        'Escala de poder': pad(['1', '2', '3', '4', '5']),
        '   ': pad([]),
        'Dimensiones': pad([T1, T2]),
        'Color HEX  ': pad([THEME_COLORS[T1], THEME_COLORS[T2]]),
    })

    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(path, engine='openpyxl') as w:
        st.to_excel(w, sheet_name='01_Stakeholders', index=False)
        rel.to_excel(w, sheet_name='02_Relaciones', index=False)
        cfg.to_excel(w, sheet_name='03_Config', index=False)
    print(f'Demo escrita en {path.resolve()}')


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else \
        Path(__file__).resolve().parents[1] / 'examples' / 'ejemplo_movilidad.xlsx'
    build(out)
