from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]

def replace_once(path, old, new):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return
    if text.count(old)!=1:
        raise SystemExit(f'{path}: trecho esperado não encontrado de forma única ({text.count(old)})')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Inclui o módulo de estabilização no pacote oficial do Apps Script.
replace_once(
    Path('scripts/build_apps_script_release.js'),
    "  {\n    source: 'apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs',\n    marker: 'TACS_APARELHO_TACS_TESTE_V1'\n  }\n];",
    "  {\n    source: 'apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs',\n    marker: 'TACS_APARELHO_TACS_TESTE_V1'\n  },\n  {\n    source: 'apps-script/ZZZZ_46_EstabilizacaoNotificacoesV8.gs',\n    marker: 'TACS_ESTABILIZACAO_NOTIFICACOES_V8'\n  }\n];"
)

# Coloca a simulação integrada na bateria oficial.
p=ROOT/'package.json'
data=json.loads(p.read_text(encoding='utf-8'))
cmd=data['scripts']['test']
needle='node scripts/test_aparelho_tacs_teste_v1.js'
extra='node scripts/test_estabilizacao_notificacoes_v8.js'
if extra not in cmd:
    if needle not in cmd: raise SystemExit('package.json: ponto de inserção do teste TACS não encontrado')
    cmd=cmd.replace(needle,needle+' && '+extra,1)
    data['scripts']['test']=cmd
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Testes antigos não podem congelar números históricos de cache-buster.
replace_once(
    Path('scripts/test_identificacao_familiar_publica_v1.js'),
    "assert.match(loader,/portal-identificacao-familia-v1\\.js\\?v=20260820-v1/);",
    "assert.match(loader,/portal-identificacao-familia-v1\\.js\\?v=[^\\\"']+/,'O carregador familiar precisa ter cache-buster explícito.');"
)
replace_once(
    Path('scripts/test_quality_gate_v101.js'),
    "registrar('usabilidade', 'Portal público mantém atualização sem recarga forçada', /portal-auto-update\\.js\\?v=202608(?:12-v101|21-tacs-device-v3)/.test(index));",
    "registrar('usabilidade', 'Portal público mantém atualização sem recarga forçada', /portal-auto-update\\.js\\?v=[^\\\"']+/.test(index));"
)

panel=Path('painel-oficial-recados-campanhas.html')
replace_once(panel,'<strong id="saudeAtivos">0</strong><span>Aptos</span>','<strong id="saudeAtivos">0</strong><span>Aptos p/ mensagem</span>')

old_func="function carregarSaudeNotificacoes(){if(!(token||territorioToken)||ativa)return;status('saudeNotificacoesStatus','Consultando aparelhos da área '+areaId+'…','aviso');post('admin_notificacoes_saude',sessao(),function(r){if(!r||r.ok!==true){document.getElementById('saudeNotificacoes').classList.remove('oculto');status('saudeNotificacoesStatus',txt(r&&r.message||'Não foi possível consultar a saúde das notificações.'),'erro');return}renderSaudeNotificacoes(r)},'admin_notificacoes_saude_result')}"
new_func="function carregarSaudeNotificacoes(){if(!(token||territorioToken)||ativa)return;document.getElementById('saudeNotificacoes').classList.remove('oculto');status('saudeNotificacoesStatus','Carregando o último estado conhecido dos aparelhos…','aviso');post('admin_notificacoes_saude_rapida',sessao(),function(r){if(!r||r.ok!==true){status('saudeNotificacoesStatus',txt(r&&r.message||'Não foi possível carregar a Saúde das notificações.'),'erro');return}renderSaudeNotificacoes(r);status('saudeNotificacoesStatus','Dados carregados. Conferindo o estado atual no OneSignal em segundo plano…','aviso');setTimeout(function(){if(ativa)return;post('admin_notificacoes_saude_remota',sessao(),function(remoto){if(remoto&&remoto.ok===true){renderSaudeNotificacoes(remoto);return}status('saudeNotificacoesStatus','Os últimos dados continuam visíveis. A conferência do OneSignal não terminou agora; toque em Atualizar situação para tentar novamente.','aviso')},'admin_notificacoes_saude_result')},20)},'admin_notificacoes_saude_result')}"
replace_once(panel,old_func,new_func)

# Exibe explicitamente o vínculo familiar no cartão do aparelho.
p=ROOT/panel
text=p.read_text(encoding='utf-8')
old="+(ref?'<br>Referência técnica: …'+esc(ref):'')+'</div></div><span class=\"saude-status '+esc(a.status)+'\">'"
new="+(ref?'<br>Referência técnica: …'+esc(ref):'')+(a.familiaId?'<br>Cadastro familiar: '+esc(a.familiaId):'<br>Cadastro familiar: não vinculado')+'</div></div><span class=\"saude-status '+esc(a.status)+'\">'"
if new not in text:
    if text.count(old)!=1: raise SystemExit('painel: cartão de Saúde não encontrado para vínculo familiar')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Marca uma versão de publicação específica para quebrar caches do Pages/PWA.
version=ROOT/'portal-version.json'
version.write_text(json.dumps({
  'version':'notificacoes-estabilizadas-v8-20260821-1427',
  'releasedAt':'2026-08-21T17:27:00Z',
  'scope':'Saúde rápida, vínculo familiar consistente e simulação de envio individual'
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('ESTABILIZACAO_NOTIFICACOES_V8_PATCH_OK')
