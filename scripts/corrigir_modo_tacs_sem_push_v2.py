from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
backend=(ROOT/'apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs').read_text(encoding='utf-8') if (ROOT/'apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs').exists() else ''
admin=(ROOT/'admin-aparelho-tacs-teste-v1.js').read_text(encoding='utf-8') if (ROOT/'admin-aparelho-tacs-teste-v1.js').exists() else ''
family=(ROOT/'portal-identificacao-familia-v1.js').read_text(encoding='utf-8') if (ROOT/'portal-identificacao-familia-v1.js').exists() else ''

# Depois que a base V1.2 já foi incorporada ao main, não a reescreva a partir do
# gerador antigo. As revisões V4/V5/V6 são aplicadas na etapa de finalização.
base_pronta=("VERSAO:'1.2.0'" in backend and 'portalTacsAparelhoTesteTokenV3:' in admin and 'chaveTacsTeste:technicalToken()' in family)
if base_pronta:
    print('Base TACS V1.2 já presente; preparação canônica ignorada para preservar revisões posteriores.')
else:
    tmp=ROOT/'scripts/.corrigir_v3_main.tmp'
    with tmp.open('w',encoding='utf-8') as out:
        subprocess.run(['git','show','HEAD:scripts/corrigir_modo_tacs_sem_push_v3.py'],check=True,stdout=out)
    canonical=tmp.read_text(encoding='utf-8')
    tmp.unlink(missing_ok=True)
    ns={'__file__':str(ROOT/'scripts/corrigir_modo_tacs_sem_push_v3_canonico.py'),'__name__':'__main__'}
    exec(compile(canonical,str(ROOT/'scripts/corrigir_modo_tacs_sem_push_v3_canonico.py'),'exec'),ns,ns)