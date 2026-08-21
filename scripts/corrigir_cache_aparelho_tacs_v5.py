from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
OLD='20260821-tacs-device-v3'
NEW='20260821-tacs-device-v5'


def replace_once(path, old, new):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return
    if text.count(old)!=1:
        raise SystemExit(f'{path}: trecho esperado não encontrado de forma única ({text.count(old)})')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# O código da correção já estava publicado, mas o iPhone podia continuar reutilizando
# os mesmos URLs versionados de JS. Trocar o cache-buster força Safari/GitHub Pages
# a baixar o script que persiste a chave técnica devolvida pelo servidor.
replace_once(
    Path('recados-campanhas-whatsapp-mensal-v12.js'),
    'admin-aparelho-tacs-teste-v1.js?v='+OLD,
    'admin-aparelho-tacs-teste-v1.js?v='+NEW
)
replace_once(
    Path('painel-oficial-recados-campanhas.html'),
    'recados-campanhas-whatsapp-mensal-v12.js?v='+OLD,
    'recados-campanhas-whatsapp-mensal-v12.js?v='+NEW
)
replace_once(
    Path('portal-auto-update.js'),
    'portal-identificacao-familia-v1.js?v='+OLD,
    'portal-identificacao-familia-v1.js?v='+NEW
)
replace_once(
    Path('index.html'),
    'portal-auto-update.js?v='+OLD,
    'portal-auto-update.js?v='+NEW
)

# Nova versão pública para o atualizador automático recarregar o Portal no aparelho.
(ROOT/'portal-version.json').write_text(json.dumps({
    'version':'modo-tacs-device-v5-20260821-1117',
    'releasedAt':'2026-08-21T14:17:00Z',
    'scope':'Reconhecimento do aparelho TACS/teste sem confirmação por CPF/CNS e atualização de cache no iPhone'
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Ajusta somente contratos de cache-buster dos testes; regras funcionais permanecem iguais.
p=ROOT/'scripts/test_aparelho_tacs_teste_v1.js'
t=p.read_text(encoding='utf-8')
t=t.replace('admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v3','admin-aparelho-tacs-teste-v1\\.js\\?v=20260821-tacs-device-v5')
# Garante que o navegador administrativo realmente salve a chave recebida ao CONSULTAR.
needle="if(r.chaveTecnica){salvarChave(r.chaveTecnica);r.autorizadoNesteAparelho=true}"
if needle not in (ROOT/'admin-aparelho-tacs-teste-v1.js').read_text(encoding='utf-8'):
    raise SystemExit('admin-aparelho-tacs-teste-v1.js: persistência da chave técnica não encontrada')
if "assert.match(admin,/salvarChave\\(r\\.chaveTecnica\\)/);" not in t:
    marker="assert.match(admin,/Ativar modo TACS \\/ teste/);"
    if marker not in t: raise SystemExit('test_aparelho_tacs_teste_v1.js: marcador não encontrado')
    t=t.replace(marker,marker+"\nassert.match(admin,/salvarChave\\(r\\.chaveTecnica\\)/);",1)
p.write_text(t,encoding='utf-8')

p=ROOT/'scripts/test_identificacao_familiar_publica_v1.js'
t=p.read_text(encoding='utf-8')
t=t.replace('portal-identificacao-familia-v1\\.js\\?v=202608(?:20-v1|21-tacs-device-v3)','portal-identificacao-familia-v1\\.js\\?v=202608(?:20-v1|21-tacs-device-v3|21-tacs-device-v5)')
p.write_text(t,encoding='utf-8')

p=ROOT/'scripts/test_quality_gate_v101.js'
t=p.read_text(encoding='utf-8')
t=t.replace('portal-auto-update\\.js\\?v=202608(?:12-v101|21-tacs-device-v3)','portal-auto-update\\.js\\?v=202608(?:12-v101|21-tacs-device-v3|21-tacs-device-v5)')
p.write_text(t,encoding='utf-8')

print('Cache TACS V5 aplicado: Safari receberá a versão que persiste a autorização técnica do aparelho.')