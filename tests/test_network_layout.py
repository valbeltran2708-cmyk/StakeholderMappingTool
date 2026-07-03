# -*- coding: utf-8 -*-
"""La vista de conexiones no debe tener círculos solapados (bug corregido de v8)."""
import math
import random

from stakeholder_map.config import W, H, NET_R_MAX
from stakeholder_map.layouts.network import add_network_layout


def _mkdata(n, extra_edges=60, seed=7):
    nodes = [{'id': f'n{i}'} for i in range(n)]
    rnd = random.Random(seed)
    edges = [{'source': f'n{i}', 'target': f'n{(i + 1) % n}'} for i in range(n - 5)]
    for _ in range(extra_edges):
        a, b = rnd.sample(range(n), 2)
        edges.append({'source': f'n{a}', 'target': f'n{b}'})
    return nodes, edges


def test_no_overlap_dense_graph():
    nodes, edges = _mkdata(70)
    urad = add_network_layout(nodes, edges)
    assert urad >= 8
    mind = 2 * urad
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            d = math.hypot(nodes[i]['nx'] - nodes[j]['nx'],
                           nodes[i]['ny'] - nodes[j]['ny'])
            assert d >= mind - 1.0, f"solape entre {nodes[i]['id']} y {nodes[j]['id']}: {d:.1f} < {mind}"


def test_nodes_inside_canvas():
    nodes, edges = _mkdata(70)
    urad = add_network_layout(nodes, edges)
    for nd in nodes:
        assert 60 - 1e-6 <= nd['nx'] <= W - 60 + 1e-6
        assert 60 - 1e-6 <= nd['ny'] <= H - 60 + 1e-6


def test_isolated_nodes_get_positions():
    nodes = [{'id': f'n{i}'} for i in range(12)]
    edges = [{'source': 'n0', 'target': 'n1'}, {'source': 'n1', 'target': 'n2'}]
    urad = add_network_layout(nodes, edges)
    assert all('nx' in nd and 'ny' in nd for nd in nodes)
    mind = 2 * urad
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            d = math.hypot(nodes[i]['nx'] - nodes[j]['nx'],
                           nodes[i]['ny'] - nodes[j]['ny'])
            assert d >= mind - 1.0


def test_small_graph_keeps_max_radius():
    nodes = [{'id': f'n{i}'} for i in range(5)]
    edges = [{'source': 'n0', 'target': 'n1'}]
    assert add_network_layout(nodes, edges) == NET_R_MAX
