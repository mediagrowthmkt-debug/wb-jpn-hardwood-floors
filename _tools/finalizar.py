#!/usr/bin/env python3
"""
Passo FINAL do padrao de fotos do site JPN (rodar DEPOIS da IA).
Uniformiza cor/contraste/nitidez e otimiza em webp. Leve de proposito: nao re-estiliza,
so da o mesmo 'acabamento de site' pra todas as fotos.
Uso: python3 _tools/finalizar.py <img_entrada> <slug>   (ex.: slug 'vinyl' -> svc-vinyl.webp)
     flag opcional --work  -> salva em images/work/ (galeria) em vez de images/svc/
"""
import os, sys, subprocess
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def main():
    a=[x for x in sys.argv[1:] if not x.startswith("--")]
    work="--work" in sys.argv
    src,slug=a[0],a[1]
    outdir=os.path.join(ROOT,"images","work" if work else "svc")
    os.makedirs(outdir,exist_ok=True)
    out=os.path.join(outdir,f"{'work-' if work else 'svc-'}{slug}.webp")
    cmd=["magick",src,"-auto-orient","-resize","1400x1400>",
         "-modulate","101,105,100","-sigmoidal-contrast","1.2x50%",
         "-unsharp","0x0.6+0.4+0.01","-strip","-quality","88",out]
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode!=0: print("ERRO",r.stderr); sys.exit(1)
    dim=subprocess.run(["identify","-format","%wx%h",out],capture_output=True,text=True).stdout
    print(f"OK -> {out} ({dim}, {os.path.getsize(out)//1024} KB)")
if __name__=="__main__": main()
