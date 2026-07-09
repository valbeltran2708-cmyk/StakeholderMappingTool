# -*- coding: utf-8 -*-
"""Tipografia/formato del texto de los nodos: color de letra por luminancia,
ajuste de fuente al circulo y particion de lineas. Aqui se edita 'la letra'."""
from ..config import LABEL_FONT_MIN


def text_color(hexc):
    """Negro o blanco puro según la luminancia del relleno (sin halo)."""
    h = str(hexc or '#bfbfbf').lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    try:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except Exception:
        r = g = b = 180
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return '#000000' if lum > 0.6 else '#FFFFFF'


def _wrap(text, max_chars):
    words = str(text or '').split(); lines = []; line = ''
    for w in words:
        while len(w) > max_chars:
            if line:
                lines.append(line); line = ''
            lines.append(w[:max_chars - 1] + '-'); w = w[max_chars - 1:]
        cand = (line + ' ' + w).strip()
        if len(cand) > max_chars:
            if line:
                lines.append(line)
            line = w
        else:
            line = cand
    if line:
        lines.append(line)
    return lines


def fit_label(label, r, fmax=14, fmin=LABEL_FONT_MIN):
    """Mayor fuente (<= fmax) cuyas líneas caben dentro del círculo de radio r.
    Trunca con elipsis solo como último recurso."""
    label = str(label or '').strip()
    if not label:
        return fmin, []
    usable_w = 1.62 * r
    usable_h = 1.58 * r
    f = fmax
    while f >= fmin:
        max_chars = max(3, int(usable_w / (0.58 * f)))
        max_lines = max(1, int(usable_h / (1.18 * f)))
        lines = _wrap(label, max_chars)
        widest = max((len(ln) for ln in lines), default=0)
        if len(lines) <= max_lines and widest <= max_chars:
            return f, lines
        f -= 1
    f = fmin
    max_chars = max(3, int(usable_w / (0.58 * f)))
    max_lines = max(1, int(usable_h / (1.18 * f)))
    lines = _wrap(label, max_chars)[:max_lines]
    if lines:
        last = lines[-1]
        if len(_wrap(label, max_chars)) > max_lines or len(last) > max_chars:
            lines[-1] = (last[:max_chars - 1].rstrip() + '…')
    return f, lines

