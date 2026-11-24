#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera as versoes MOBILE das imagens de topo (hero / subhero) e a logo leve do header.

- Descobre sozinho as imagens de topo lendo os HTML gerados (padrao `__bg"><img src="...`),
  mais as que forem passadas como argumento.
- Para cada uma grava `<nome>-m.webp` ao lado do original (NUNCA sobrescreve o original)
  e atualiza o manifesto `images/hero-responsive.json`, que o _build_pages.py le para montar
  srcset/sizes + width/height + preload.
- Logo do header: `images/logo-header.webp` (2x da altura de 52px) a partir de images/logo.png.

Regras de tamanho (a imagem do subhero aparece com opacity .4 atras de um gradiente escuro):
- retrato com largura > 840 -> 800px de largura; retrato 761..840 -> 740px; <= 760 -> sem variante
- paisagem com largura > 1040 -> 1000px (mantem altura suficiente pro recorte "cover" no celular)
- sem recorte: a proporcao e a mesma do original, entao o enquadramento nao muda.

Uso:
  /usr/bin/python3 _tools/gerar_hero_responsivo.py            # gera o que falta
  /usr/bin/python3 _tools/gerar_hero_responsivo.py --force    # regera tudo
  /usr/bin/python3 _tools/gerar_hero_responsivo.py images/x.webp --q 60
"""
import argparse, glob, json, os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "images", "hero-responsive.json")
RX = re.compile(r'__bg"><img src="(?:\.\./)*([^"]+)"')
Q_DEFAULT = 60
Q_FULL = {"images/hero/hero-main.webp": 65}  # hero da home aparece sem a opacidade .4


def descobrir():
    achados = set()
    for f in glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True):
        if "/_" in f.replace(ROOT, ""):
            continue
        achados.update(RX.findall(open(f, encoding="utf-8").read()))
    return sorted(achados)


def largura_mobile(w, h):
    if w >= h:
        return 1000 if w > 1040 else None
    if w > 840:
        return 800
    if w > 760:
        return 740
    return None


def gerar(rel, q, force, manifest):
    src = os.path.join(ROOT, rel)
    im = Image.open(src)
    w, h = im.size
    ent = {"w": w, "h": h}
    mw = largura_mobile(w, h)
    if mw:
        base, _ = os.path.splitext(rel)
        mrel = base + "-m.webp"
        dst = os.path.join(ROOT, mrel)
        mh = round(h * mw / w)
        if force or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            out = im.convert("RGB").resize((mw, mh), Image.LANCZOS)
            out.save(dst, "WEBP", quality=q, method=6)
        ent.update({"m": mrel, "mw": mw, "mh": mh})
        print(f"{rel:42s} {w}x{h} {os.path.getsize(src)//1024:4d} KB -> {mrel} {mw}x{mh} {os.path.getsize(dst)//1024:4d} KB (q{q})")
    else:
        print(f"{rel:42s} {w}x{h} {os.path.getsize(src)//1024:4d} KB -> sem variante (ja pequena)")
    manifest[rel] = ent


def logo_header(force):
    src = os.path.join(ROOT, "images", "logo.png")
    dst = os.path.join(ROOT, "images", "logo-header.webp")
    if not os.path.exists(src):
        return
    im = Image.open(src).convert("RGBA")
    h = 104  # 2x dos 52px do header
    w = round(im.width * h / im.height)
    if force or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        im.resize((w, h), Image.LANCZOS).save(dst, "WEBP", quality=90, method=6)
    print(f"images/logo.png {im.width}x{im.height} {os.path.getsize(src)//1024} KB -> images/logo-header.webp {w}x{h} {os.path.getsize(dst)//1024} KB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("imagens", nargs="*")
    ap.add_argument("--q", type=int, default=None)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    alvo = sorted(set(descobrir()) | set(a.imagens) | {"images/hero/hero-main.webp"})
    for rel in alvo:
        if not os.path.exists(os.path.join(ROOT, rel)):
            print("nao existe:", rel)
            continue
        gerar(rel, a.q or Q_FULL.get(rel, Q_DEFAULT), a.force, manifest)
    json.dump(dict(sorted(manifest.items())), open(MANIFEST, "w"), indent=1)
    logo_header(a.force)
    print("manifesto:", os.path.relpath(MANIFEST, ROOT), len(manifest), "imagens")


if __name__ == "__main__":
    main()
