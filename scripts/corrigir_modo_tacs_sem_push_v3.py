from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def write_text(path, content):
    p = ROOT / path
    p.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_any(path, olds, new):
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    if new in text:
        return
    found = [old for old in olds if old in text]
    if len(found) != 1:
        raise SystemExit(f"{path}: não foi possível localizar de forma única o trecho esperado ({len(found)} variantes encontradas)")
    p.write_text(text.replace(found[0], new, 1), encoding="utf-8")

# A versão completa deste gerador é mantida em main. Na branch de validação,
# carregamos o conteúdo canônico diretamente do mesmo repositório antes de aplicar.
import subprocess
subprocess.run(['git','show','origin/main:scripts/corrigir_modo_tacs_sem_push_v3.py'],check=True,stdout=open(ROOT/'scripts/.corrigir_v3_main.tmp','w',encoding='utf-8'))
canonical=(ROOT/'scripts/.corrigir_v3_main.tmp').read_text(encoding='utf-8')
(ROOT/'scripts/.corrigir_v3_main.tmp').unlink(missing_ok=True)
# Evita recursão: executa o gerador canônico em um namespace próprio removendo este bootstrap.
ns={'__file__':str(ROOT/'scripts/corrigir_modo_tacs_sem_push_v3_canonico.py'),'__name__':'__main__'}
exec(compile(canonical,str(ROOT/'scripts/corrigir_modo_tacs_sem_push_v3_canonico.py'),'exec'),ns,ns)