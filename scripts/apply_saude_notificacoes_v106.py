from pathlib import Path
import json

ROOT = Path('.')

def replace_once(path, old, new, label):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 marcador, encontrado {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

# 1) Portal do morador: evento explícito após reparo técnico concluído.
agenda = ROOT / 'agenda-enfermeira.js'
replace_once(
    agenda,
    "            mostrarEstado(estadoInscricao(), true);\n            help.textContent = confirmacaoErro",
    "            mostrarEstado(estadoInscricao(), true);\n            document.dispatchEvent(new CustomEvent('tacs:notificacao-reparo-concluido',{detail:{areaId:areaAtualDaUnidade(),subscriptionId:estadoInscricao().subscriptionId}}));\n            help.textContent = confirmacaoErro",
    'agenda reparo permanente'
)
replace_once(
    agenda,
    "              if (deveConfirmarReparo && areaConfirmada) {\n                try {",
    "              if (deveConfirmarReparo && areaConfirmada) {\n                document.dispatchEvent(new CustomEvent('tacs:notificacao-reparo-concluido',{detail:{areaId:areaAtualDaUnidade(),subscriptionId:estadoInscricao().subscriptionId}}));\n                try {",
    'agenda reparo primario'
)

# 2) Carrega o módulo de check-in logo após o módulo OneSignal existente.
index = ROOT / 'index.html'
replace_once(
    index,
    '  <script src="agenda-enfermeira.js?v=20260813-portal-v104"></script>',
    '  <script src="agenda-enfermeira.js?v=20260813-notif-health-v106"></script>\n  <script src="portal-notification-health.js?v=20260813-notif-health-v106"></script>',
    'index notificacoes'
)

# 3) Inclui o novo módulo no empacotamento seguro do Apps Script.
builder = ROOT / 'scripts' / 'build_apps_script_release.js'
replace_once(
    builder,
    "  {\n    source: 'apps-script/ZZZZ_21_PerformanceCacheV101.gs',\n    marker: 'TACS_PERFORMANCE_CACHE_V101'\n  }\n];",
    "  {\n    source: 'apps-script/ZZZZ_21_PerformanceCacheV101.gs',\n    marker: 'TACS_PERFORMANCE_CACHE_V101'\n  },\n  {\n    source: 'apps-script/ZZZZ_22_SaudeNotificacoesV1.gs',\n    marker: 'TACS_SAUDE_NOTIFICACOES_V1'\n  }\n];",
    'builder modulo 22'
)

# 4) Painel de recados/campanhas: quadro administrativo de saúde por área.
panel = ROOT / 'teste-v1' / 'painel-recados-campanhas-v1.html'
style = '''
<style id="saudeNotificacoesEstilo">
.saude-notificacoes .cabecalho-saude{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
.saude-notificacoes .cabecalho-saude h2{margin:0 0 5px}
.saude-resumo{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0}
.saude-resumo .saude-numero{background:#f2f8fb;border:2px solid #bad0da;border-radius:15px;padding:12px;text-align:center}
.saude-resumo strong{display:block;font-size:1.65rem;color:#073a55}.saude-resumo span{font-size:.82rem;font-weight:850}
.saude-acoes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
.saude-lista{display:grid;gap:10px;margin-top:14px}.saude-aparelho{border:2px solid #bfd1da;border-radius:16px;padding:13px;background:#fff}
.saude-aparelho-topo{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.saude-aparelho h3{margin:0;font-size:1.05rem}.saude-meta{margin-top:5px;color:#526d7b;font-size:.9rem;line-height:1.4}
.saude-status{display:inline-flex;align-items:center;border-radius:999px;padding:6px 9px;font-size:.78rem;font-weight:950;white-space:nowrap}.saude-status.ATIVO{background:#d9f4e2;color:#17602e}.saude-status.INATIVO{background:#fde1e1;color:#9b2828}.saude-status.REPARO{background:#fff0c7;color:#805b00}.saude-status.SEM_CONFIRMACAO{background:#e5eef4;color:#36586a}
.saude-vazio{border:2px dashed #b9cbd4;border-radius:16px;padding:18px;text-align:center;color:#526d7b}.saude-nota{font-size:.86rem;color:#526d7b;line-height:1.45}
body.tema-petroleo .saude-resumo .saude-numero,body.tema-petroleo .saude-aparelho,body.tema-petroleo .saude-vazio{background:#073a55;border-color:#0b5878;color:#fff}body.tema-petroleo .saude-resumo strong{color:#9de8ff}body.tema-petroleo .saude-meta,body.tema-petroleo .saude-nota{color:#d8edf5}
@media(max-width:650px){.saude-resumo{grid-template-columns:1fr 1fr}.saude-acoes{grid-template-columns:1fr}.saude-aparelho-topo{display:block}.saude-status{margin-top:8px}}
</style>
'''
replace_once(panel, '</head>', style + '</head>', 'painel estilo saude')
health_html = '''</section>
<section id="saudeNotificacoes" class="card saude-notificacoes oculto">
<div class="cabecalho-saude"><div><h2 id="saudeTitulo">Saúde das notificações</h2><p class="muted">Mostra os aparelhos que já se identificaram no Portal e o estado técnico da inscrição Push.</p></div></div>
<div class="saude-resumo"><div class="saude-numero"><strong id="saudeAtivos">0</strong><span>Aptos</span></div><div class="saude-numero"><strong id="saudeInativos">0</strong><span>Inativos</span></div><div class="saude-numero"><strong id="saudeReparo">0</strong><span>Precisam de reparo</span></div><div class="saude-numero"><strong id="saudeSemConfirmacao">0</strong><span>Sem confirmação</span></div></div>
<div class="saude-acoes"><button id="atualizarSaudeNotificacoes" class="botao" type="button">↻ Atualizar situação</button><button id="solicitarReparoNotificacoes" class="botao verde" type="button">🔧 Solicitar reparo das notificações da área</button></div>
<div id="saudeNotificacoesStatus" class="status">Entre no painel para consultar os aparelhos desta área.</div>
<p class="saude-nota">O estado técnico não comprova a entrega física de cada mensagem. O telefone exibido vem do cadastro de moradores, não do OneSignal.</p>
<div id="saudeNotificacoesLista" class="saude-lista"></div>
</section>
<section id="conteudo" class="card oculto">'''
replace_once(panel, '</section>\n<section id="conteudo" class="card oculto">', health_html, 'painel html saude')
replace_once(
    panel,
    "function resultadoPadrao(action){action=txt(action);if(/^admin_publicacoes_/.test(action))return'admin_publicacoes_result';if(/^admin_territorio_/.test(action))return'admin_territorio_result';return'admin_result'}",
    "function resultadoPadrao(action){action=txt(action);if(/^admin_publicacoes_/.test(action))return'admin_publicacoes_result';if(/^admin_notificacoes_/.test(action))return'admin_notificacoes_saude_result';if(/^admin_territorio_/.test(action))return'admin_territorio_result';return'admin_result'}",
    'painel result action'
)
health_js = r'''
function esconderSaudeNotificacoes(){var box=document.getElementById('saudeNotificacoes');if(box)box.classList.add('oculto');document.getElementById('saudeNotificacoesLista').innerHTML=''}
function renderSaudeNotificacoes(r){
  var box=document.getElementById('saudeNotificacoes'),lista=document.getElementById('saudeNotificacoesLista'),c=r&&r.contagens||{},aparelhos=Array.isArray(r&&r.aparelhos)?r.aparelhos:[];
  box.classList.remove('oculto');document.getElementById('saudeTitulo').textContent='Saúde das notificações — '+txt(r&&r.areaNome||areaId);document.getElementById('saudeAtivos').textContent=Number(c.ativos||0);document.getElementById('saudeInativos').textContent=Number(c.inativos||0);document.getElementById('saudeReparo').textContent=Number(c.reparo||0);document.getElementById('saudeSemConfirmacao').textContent=Number(c.semConfirmacao||0);
  if(!aparelhos.length){lista.innerHTML='<div class="saude-vazio">Nenhum aparelho foi associado a um morador nesta versão ainda. O morador precisa abrir o Portal TACS, identificar-se e manter os avisos configurados ao menos uma vez.</div>';status('saudeNotificacoesStatus','Nenhum aparelho identificado nesta área ainda.','aviso');return}
  lista.innerHTML=aparelhos.map(function(a){var telefone=txt(a.telefone),meta=[txt(a.dispositivo),txt(a.navegador),txt(a.sistema)].filter(Boolean).join(' • '),ultima=txt(a.ultimoCheckin),ref=txt(a.subscriptionRef);return'<div class="saude-aparelho"><div class="saude-aparelho-topo"><div><h3>'+esc(a.nome)+'</h3><div class="saude-meta">'+esc(meta||'Aparelho identificado')+(telefone?'<br>Contato cadastrado: '+esc(telefone):'')+(ultima?'<br>Última checagem: '+esc(ultima):'')+(ref?'<br>Referência técnica: …'+esc(ref):'')+'</div></div><span class="saude-status '+esc(a.status)+'">'+esc(a.statusTexto||a.status)+'</span></div><div class="saude-meta">'+esc(a.motivo||'')+'</div></div>'}).join('');
  var msg=r.oneSignalConsultado===true?'Situação atualizada com a consulta técnica ao OneSignal.':'Aparelhos listados pelo Portal, mas o OneSignal não pôde ser consultado agora.';status('saudeNotificacoesStatus',msg,r.oneSignalConsultado===true?'ok':'aviso');
}
function carregarSaudeNotificacoes(){if(!(token||territorioToken)||ativa)return;status('saudeNotificacoesStatus','Consultando aparelhos da área '+areaId+'…','aviso');post('admin_notificacoes_saude',sessao(),function(r){if(!r||r.ok!==true){document.getElementById('saudeNotificacoes').classList.remove('oculto');status('saudeNotificacoesStatus',txt(r&&r.message||'Não foi possível consultar a saúde das notificações.'),'erro');return}renderSaudeNotificacoes(r)},'admin_notificacoes_saude_result')}
function solicitarReparoNotificacoesArea(){if(!(token||territorioToken)||ativa)return;var atual=areas.find(function(a){return txt(a.areaId)===areaId}),nome=txt(atual&&atual.areaNome||areaId);if(!confirm('Solicitar reparo das notificações para os aparelhos identificados de '+nome+'? Cada aparelho será orientado quando abrir o Portal TACS.'))return;status('saudeNotificacoesStatus','Registrando solicitação de reparo para '+nome+'…','aviso');post('admin_notificacoes_solicitar_reparo_area',sessao(),function(r){if(!r||r.ok!==true){status('saudeNotificacoesStatus',txt(r&&r.message||'Não foi possível solicitar o reparo.'),'erro');return}status('saudeNotificacoesStatus','Reparo solicitado. Os aparelhos serão orientados na próxima abertura do Portal.','ok');setTimeout(carregarSaudeNotificacoes,250)},'admin_notificacoes_saude_result')}
'''
replace_once(panel, '\nfunction render(){', '\n' + health_js + '\nfunction render(){', 'painel funcoes saude')
replace_once(
    panel,
    "aplicar(r);status('loginStatus',msg||'Sessão validada e publicações da área carregadas.','ok');if(cb)cb(true,r)",
    "aplicar(r);status('loginStatus',msg||'Sessão validada e publicações da área carregadas.','ok');setTimeout(carregarSaudeNotificacoes,80);if(cb)cb(true,r)",
    'painel carrega saude'
)
replace_once(
    panel,
    "document.getElementById('manutencaoBox').classList.add('oculto');sair.disabled=true;",
    "document.getElementById('manutencaoBox').classList.add('oculto');esconderSaudeNotificacoes();sair.disabled=true;",
    'painel falha sessao esconde saude'
)
replace_once(
    panel,
    "document.getElementById('manutencaoBox').classList.add('oculto');manutencaoConhecida=false;sair.disabled=true;",
    "document.getElementById('manutencaoBox').classList.add('oculto');esconderSaudeNotificacoes();manutencaoConhecida=false;sair.disabled=true;",
    'painel logout esconde saude'
)
replace_once(
    panel,
    "document.getElementById('alternarManutencao').addEventListener('click',alternarManutencao);contraste.addEventListener('click',alternarTemaVisual);",
    "document.getElementById('alternarManutencao').addEventListener('click',alternarManutencao);document.getElementById('atualizarSaudeNotificacoes').addEventListener('click',carregarSaudeNotificacoes);document.getElementById('solicitarReparoNotificacoes').addEventListener('click',solicitarReparoNotificacoesArea);contraste.addEventListener('click',alternarTemaVisual);",
    'painel listeners saude'
)

# 5) O painel oficial sempre baixa a base atualizada.
official = ROOT / 'painel-oficial-recados-campanhas.html'
text = official.read_text(encoding='utf-8')
if text.count('20260813-admin-v103') != 2:
    raise SystemExit('painel oficial: cache-buster v103 não apareceu exatamente duas vezes')
official.write_text(text.replace('20260813-admin-v103','20260813-notif-health-v106'), encoding='utf-8')

# 6) Teste permanente.
test_path = ROOT / 'scripts' / 'test_notification_health_registry.js'
test_path.write_text(r'''const fs=require('fs');const vm=require('vm');const assert=require('assert');
const backend=fs.readFileSync('apps-script/ZZZZ_22_SaudeNotificacoesV1.gs','utf8');
const front=fs.readFileSync('portal-notification-health.js','utf8');
const agenda=fs.readFileSync('agenda-enfermeira.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const panel=fs.readFileSync('teste-v1/painel-recados-campanhas-v1.html','utf8');
const official=fs.readFileSync('painel-oficial-recados-campanhas.html','utf8');
const builder=fs.readFileSync('scripts/build_apps_script_release.js','utf8');
assert(backend.includes("var TACS_SAUDE_NOTIFICACOES_V1 = Object.freeze"));
assert(backend.includes("REGISTRY_SHEET:'TACS_NOTIFICACOES_DISPOSITIVOS'"));
assert(backend.includes("'SUBSCRIPTION_ID','AREA_ID','ID_PORTAL','ONESIGNAL_ID'"));
assert(!backend.match(/REGISTRY_HEADERS[\\s\\S]{0,500}'CPF'/));assert(!backend.match(/REGISTRY_HEADERS[\\s\\S]{0,500}'CNS'/));assert(!backend.match(/REGISTRY_HEADERS[\\s\\S]{0,500}'CELULAR'/));
assert(backend.includes("action==='publico_notificacao_checkin'"));assert(backend.includes("action==='admin_notificacoes_saude'"));assert(backend.includes("admin_notificacoes_solicitar_reparo_area"));
assert(backend.includes("/subscriptions/'+encodeURIComponent(subscriptionId)+'/user/identity"));assert(backend.includes("/users/by/onesignal_id/"));
assert(front.includes("add('action','publico_notificacao_checkin')"));assert(front.includes("add('documento'" )===false);assert(front.includes("documento:doc"));assert(!front.includes('localStorage.setItem')&&!front.includes('sessionStorage.setItem'));
assert(front.includes("repair.textContent='🔧 Reparar agora'"));assert(front.includes("tacs:notificacao-reparo-concluido"));
assert(agenda.includes("document.dispatchEvent(new CustomEvent('tacs:notificacao-reparo-concluido'"));
assert(index.includes('portal-notification-health.js?v=20260813-notif-health-v106'));
assert(panel.includes('Saúde das notificações'));assert(panel.includes('Solicitar reparo das notificações da área'));assert(panel.includes("post('admin_notificacoes_saude'"));assert(panel.includes("post('admin_notificacoes_solicitar_reparo_area'"));
assert(!panel.includes('SUBSCRIPTION_ID</'));assert(official.includes('20260813-notif-health-v106'));assert(builder.includes("marker: 'TACS_SAUDE_NOTIFICACOES_V1'"));
const context={Object:Object,Number:Number,String:String,Boolean:Boolean,Array:Array,Date:Date,JSON:JSON,Math:Math,RegExp:RegExp,Error:Error,console:console};vm.createContext(context);vm.runInContext(backend,context);
let x=context.saudeNotificacoesV1Classificar_({permission:true,optedIn:true,tokenAtivo:true,areaConfirmada:true,ultimoCheckin:'2026-08-13 08:00:00'}, {enabled:true,notification_types:1}, false);assert.equal(x.status,'ATIVO');
x=context.saudeNotificacoesV1Classificar_({permission:true,optedIn:true,tokenAtivo:true,areaConfirmada:true,ultimoCheckin:'2026-08-13 08:00:00'}, {enabled:false,notification_types:-2}, false);assert.equal(x.status,'INATIVO');
x=context.saudeNotificacoesV1Classificar_({permission:true,optedIn:true,tokenAtivo:true,areaConfirmada:true,ultimoCheckin:'2026-08-13 08:00:00'}, {enabled:true,notification_types:1}, true);assert.equal(x.status,'REPARO');
x=context.saudeNotificacoesV1Classificar_({permission:false,optedIn:false,tokenAtivo:false,areaConfirmada:false,ultimoCheckin:'2026-08-13 08:00:00'}, null, false);assert.equal(x.status,'REPARO');
console.log('Saúde das notificações: vínculo interno, isolamento, estados e reparo administrativo validados.');
''',encoding='utf-8')

# 7) Inclui o teste na bateria sem alterar dependências.
package = ROOT / 'package.json'
data = json.loads(package.read_text(encoding='utf-8'))
cmd = data['scripts']['test']
needle = 'node scripts/test_notification_repair_confirmation.js'
addition = needle + ' && node scripts/test_notification_health_registry.js'
if 'test_notification_health_registry.js' not in cmd:
    if needle not in cmd:
        raise SystemExit('package.json: marcador de teste de reparo não encontrado')
    data['scripts']['test'] = cmd.replace(needle, addition, 1)
package.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('Aplicação de saúde das notificações V106 concluída no workspace.')
