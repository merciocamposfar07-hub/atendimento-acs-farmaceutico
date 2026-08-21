from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]

def replace_once(path,old,new):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: trecho esperado não encontrado de forma única ({count})')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Inclui a camada V9 no pacote oficial do Apps Script.
replace_once(
    Path('scripts/build_apps_script_release.js'),
    "  {\n    source: 'apps-script/ZZZZ_46_EstabilizacaoNotificacoesV8.gs',\n    marker: 'TACS_ESTABILIZACAO_NOTIFICACOES_V8'\n  }\n];",
    "  {\n    source: 'apps-script/ZZZZ_46_EstabilizacaoNotificacoesV8.gs',\n    marker: 'TACS_ESTABILIZACAO_NOTIFICACOES_V8'\n  },\n  {\n    source: 'apps-script/ZZZZ_47_EstabilizacaoReparosV9.gs',\n    marker: 'TACS_ESTABILIZACAO_REPAROS_V9'\n  }\n];"
)

# Coloca a simulação V9 na bateria oficial.
p=ROOT/'package.json'
data=json.loads(p.read_text(encoding='utf-8'))
cmd=data['scripts']['test']
needle='node scripts/test_estabilizacao_notificacoes_v8.js'
extra='node scripts/test_estabilizacao_reparos_v9.js'
if extra not in cmd:
    if needle not in cmd:
        raise SystemExit('package.json: teste V8 não encontrado para inserir V9')
    data['scripts']['test']=cmd.replace(needle,needle+' && '+extra,1)
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Carrega o watchdog após a camada principal de Saúde; o arquivo é separado para não interferir no fluxo legado.
replace_once(
    Path('index.html'),
    '  <script src="portal-notification-health.js?v=20260820-notif-only-v107"></script>',
    '  <script src="portal-notification-health.js?v=20260820-notif-only-v107"></script>\n  <script src="portal-notification-repair-v9.js?v=20260821-repair-v9"></script>'
)

# Força atualização do Portal/PWA após a publicação.
version=ROOT/'portal-version.json'
version.write_text(json.dumps({
  'version':'reparos-estabilizados-v9-20260821-1536',
  'releasedAt':'2026-08-21T18:36:00Z',
  'scope':'Watchdog de reparos, retomada de ciclos travados e distinção entre aguardando Portal e ação do morador'
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('ESTABILIZACAO_REPAROS_V9_PATCH_OK')
