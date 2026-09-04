#!/usr/bin/env python3
"""
Filtro-padrao das fotos de servico do site da JPN.
Deixa a foto mais bonita (exposicao, cor, contraste suave e nitidez) SEM redesenhar
nem mudar o conteudo: e melhoria fotografica, nao IA generativa. Mesmo "look" pra todas
as fotos -> visual consistente no grid "What We Do".

Uso:
  python3 _tools/enhance_svc.py <imagem_de_entrada> <slug>
    -> gera  images/svc/svc-<slug>.webp   (ex.: slug "installation" -> svc-installation.webp)

  python3 _tools/enhance_svc.py <imagem_de_entrada> <slug> --crop43
    -> corta no centro em 4/3 (formato exato do card) antes de otimizar

Requer ImageMagick (magick).
"""
import os, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, "images", "svc")

# ---- receita do padrao (ajuste aqui e vale pra TODAS as fotos) ----
MAX_W       = 1400          # largura maxima (so reduz, nunca amplia demais)
BRIGHTNESS  = 104           # +4% de luz
SATURATION  = 110           # +10% de cor (madeira mais viva, sem exagero)
CONTRAST    = "2.5x48%"    # curva S suave (mais profundidade, sem estourar)
SHARPEN     = "0x0.75+0.6+0.01"  # nitidez fina
QUALITY     = 86            # webp

def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    src  = sys.argv[1]
    slug = sys.argv[2].strip().lstrip("-")
    crop43 = "--crop43" in sys.argv[3:]
    if not os.path.isfile(src):
        print(f"ERRO: nao achei {src}"); sys.exit(1)
    os.makedirs(OUTDIR, exist_ok=True)
    out = os.path.join(OUTDIR, f"svc-{slug}.webp")

    cmd = ["magick", src, "-auto-orient"]
    if crop43:
        cmd += ["-resize", f"{MAX_W}x{MAX_W}^", "-gravity", "center",
                "-extent", f"{MAX_W}x{int(MAX_W*3/4)}"]
    else:
        cmd += ["-resize", f"{MAX_W}x{MAX_W}>"]
    cmd += [
        "-modulate", f"{BRIGHTNESS},{SATURATION},100",
        "-sigmoidal-contrast", CONTRAST,
        "-unsharp", SHARPEN,
        "-strip",
        "-quality", str(QUALITY),
        out,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("ERRO magick:", r.stderr); sys.exit(1)
    sz = os.path.getsize(out) // 1024
    dim = subprocess.run(["identify", "-format", "%wx%h", out], capture_output=True, text=True).stdout
    print(f"OK -> {out}  ({dim}, {sz} KB)")

if __name__ == "__main__":
    main()
