#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kevin 18-11-26 (Core Web Vitals): gera versoes '-s.webp' (720px de largura) das fotos de CONTEUDO
(cards de servico, galeria, fotos no meio do texto), que hoje descem no celular em 900-1400px.

- Nunca sobrescreve o original nem as '-m.webp' (essas sao do topo, com opacidade .4).
- Mesma proporcao do original (sem recorte) -> o enquadramento nao muda.
- Grava o manifesto images/img-responsive.json, que o _build_pages.py le pra montar srcset/sizes.

Uso: /usr/bin/python3 _tools/gerar_img_responsivo.py [--force] [--q 72]
"""
import argparse, glob, json, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "images", "img-responsive.json")
SW = 720
ap = argparse.ArgumentParser(); ap.add_argument("--force", action="store_true"); ap.add_argument("--q", type=int, default=72)
a = ap.parse_args()
man = {}
for f in sorted(glob.glob(os.path.join(ROOT, "images", "svc", "*.webp")) + glob.glob(os.path.join(ROOT, "images", "work", "*.webp"))):
    if f.endswith("-m.webp") or f.endswith("-s.webp"):
        continue
    rel = os.path.relpath(f, ROOT)
    im = Image.open(f); w, h = im.size
    if w <= SW + 40:
        continue
    out = f[:-5] + "-s.webp"
    sh = round(h * SW / w)
    if a.force or not os.path.exists(out):
        im.convert("RGB").resize((SW, sh), Image.LANCZOS).save(out, "WEBP", quality=a.q, method=6)
    o, s = os.path.getsize(f), os.path.getsize(out)
    if s >= o * 0.9:          # nao compensa
        os.remove(out); continue
    man[rel] = {"w": w, "h": h, "s": os.path.relpath(out, ROOT), "sw": SW, "sh": sh}
    print(f"{rel}: {w}px {o//1024}KB -> {SW}px {s//1024}KB")
json.dump(man, open(MANIFEST, "w"), indent=1)
print("manifesto:", len(man), "imagens")
