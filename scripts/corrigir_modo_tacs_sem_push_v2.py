from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
tmp=ROOT/'scripts/.corrigir_v3_main.tmp'
with tmp.open('w',encoding='utf-8') as out:
    subprocess.run(['git','show','HEAD:scripts/corrigir_modo_tacs_sem_push_v3.py'],check=True,stdout=out)
canonical=tmp.read_text(encoding='utf-8')
tmp.unlink(missing_ok=True)
ns={'__file__':str(ROOT/'scripts/corrigir_modo_tacs_sem_push_v3_canonico.py'),'__name__':'__main__'}
exec(compile(canonical,str(ROOT/'scripts/corrigir_modo_tacs_sem_push_v3_canonico.py'),'exec'),ns,ns)