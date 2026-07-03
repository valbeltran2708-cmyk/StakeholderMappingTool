# -*- coding: utf-8 -*-
"""Tests del módulo de escalas: modo categórico y numérico continuo."""
from stakeholder_map.scales import build_scale, radius_for_rank, size_for_rank


def test_numeric_continuous_with_explicit_scale():
    sc = build_scale(['1', '1.1', '3.5', '5'], ['2', '4'],
                     {'interest': ['1', '2', '3', '4', '5'],
                      'power': ['1', '2', '3', '4', '5']})
    assert sc['i_mode'] == 'num' and sc['p_mode'] == 'num'
    assert sc['interest_order'] == ['1', '2', '3', '4', '5']
    assert sc['NI'] == 5
    r0 = sc['irank']('1'); r11 = sc['irank']('1.1'); r35 = sc['irank']('3.5')
    assert r0 == 0
    assert 0 < r11 < 0.2          # 1.1 apenas por encima de 1
    assert abs(r35 - 2.5) < 1e-9  # 3.5 queda a mitad entre las marcas 3 y 4
    # mayor interés = radio menor (más cerca del centro), de forma continua
    assert radius_for_rank(r35, 5) < radius_for_rank(r11, 5) < radius_for_rank(r0, 5)
    # mayor poder = círculo mayor
    assert size_for_rank(sc['prank']('4'), 5) > size_for_rank(sc['prank']('2'), 5)


def test_numeric_accepts_comma_decimals_and_clamps():
    sc = build_scale(['1,5', '4'], ['1', '5'],
                     {'interest': ['1', '5'], 'power': []})
    assert sc['i_mode'] == 'num'
    assert 0 < sc['irank']('1,5') < sc['irank']('4')
    # fuera de la escala explícita: se recorta al límite
    assert sc['irank']('9') == sc['NI'] - 1
    assert sc['irank']('0') == 0


def test_numeric_without_explicit_uses_integer_ticks():
    sc = build_scale(['1.2', '2.4', '4.9'], ['1', '2'], {})
    assert sc['i_mode'] == 'num'
    assert sc['interest_order'] == ['1', '2', '3', '4', '5']


def test_categorical_known_labels_order():
    sc = build_scale(['Alto', 'Bajo', 'Medio'], ['Low', 'High'], {})
    assert sc['i_mode'] == 'cat'
    assert sc['interest_order'] == ['Bajo', 'Medio', 'Alto']
    assert sc['power_order'] == ['Low', 'High']
    assert sc['irank']('Alto') == 2
    assert sc['irank']('desconocido') == -1


def test_explicit_categorical_order_wins():
    sc = build_scale(['B', 'A', 'C'], ['x'], {'interest': ['C', 'B', 'A']})
    assert sc['interest_order'] == ['C', 'B', 'A']
    assert sc['irank']('C') == 0 and sc['irank']('A') == 2
