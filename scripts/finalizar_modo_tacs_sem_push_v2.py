from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
tmp=ROOT/'scripts/.finalizar_v3_main.tmp'
with tmp.open('w',encoding='utf-8') as out:
    subprocess.run(['git','show','HEAD:scripts/finalizar_modo_tacs_sem_push_v3.py'],check=True,stdout=out)
canonical=tmp.read_text(encoding='utf-8')
tmp.unlink(missing_ok=True)
ns={'__file__':str(ROOT/'scripts/finalizar_modo_tacs_sem_push_v3_canonico.py'),'__name__':'__main__'}
exec(compile(canonical,str(ROOT/'scripts/finalizar_modo_tacs_sem_push_v3_canonico.py'),'exec'),ns,ns)
subprocess.run(['python3',str(ROOT/'scripts/restaurar_complemento_documental_tacs_v3.py')],check=True)
subprocess.run(['python3',str(ROOT/'scripts/corrigir_reconhecimento_aparelho_tacs_v4.py')],check=True)
subprocess.run(['python3',str(ROOT/'scripts/corrigir_cache_aparelho_tacs_v5.py')],check=True)
subprocess.run(['python3',str(ROOT/'scripts/corrigir_migracao_legada_tacs_v6.py')],check=True)