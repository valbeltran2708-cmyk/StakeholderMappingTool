# -*- coding: utf-8 -*-
"""Salidas tabulares: XLSX de coordenadas (reutilizable como entrada rápida)
y CSVs de nodos y relaciones."""
import pandas as pd


def write_tables(nodes, edges, outdir):
    xlsx = outdir / 'stakeholder_map_coordinates.xlsx'
    with pd.ExcelWriter(xlsx, engine='openpyxl') as writer:
        pd.DataFrame(nodes).to_excel(writer, sheet_name='nodes_for_visualizers', index=False)
        pd.DataFrame(edges).to_excel(writer, sheet_name='edges_for_visualizers', index=False)
    csv_n = outdir / 'stakeholder_nodes_coordinates.csv'
    csv_e = outdir / 'stakeholder_edges.csv'
    pd.DataFrame(nodes).to_csv(csv_n, index=False, encoding='utf-8-sig')
    pd.DataFrame(edges).to_csv(csv_e, index=False, encoding='utf-8-sig')
    return [xlsx, csv_n, csv_e]
