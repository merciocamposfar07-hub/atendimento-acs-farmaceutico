from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 trecho, encontrado {count}')
    return text.replace(old, new, 1)


backend = Path('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs')
s = backend.read_text(encoding='utf-8')
s = replace_once(s, "  VERSAO:'1.0.3',", "  VERSAO:'1.0.4',", 'versão do backend de notificações')
s = replace_once(
    s,
    "  RESULT_SECONDS:300,\n  IDEMPOTENCY_PREFIX:'tacs_notificacao_area_v1_evento_'\n});",
    "  RESULT_SECONDS:300,\n  IDEMPOTENCY_PREFIX:'tacs_notificacao_area_v1_evento_',\n  REPAIR_RATE_PREFIX:'tacs_notificacao_reparo_v1_',\n  REPAIR_RATE_SECONDS:20,\n  REPAIR_TITLE:'Portal TACS — avisos restabelecidos',\n  REPAIR_MESSAGE:'Conexão restabelecida. Este aparelho está pronto para receber novos recados e avisos do Portal TACS.'\n});",
    'constantes da confirmação de reparo'
)
s = replace_once(
    s,
    "function notificacoesAreaV1TratarGet_(e){\n  var p=e&&e.parameter?e.parameter:{};\n  if(notificacoesAreaV1Texto_(p.action).toLowerCase()!=='admin_result')return null;",
    "function notificacoesAreaV1TratarGet_(e){\n  var p=e&&e.parameter?e.parameter:{};\n  var action=notificacoesAreaV1Texto_(p.action).toLowerCase();\n  if(['admin_result','publico_notificacao_reparo_result'].indexOf(action)===-1)return null;",
    'rota GET de resultado do reparo'
)
s = replace_once(
    s,
    "function notificacoesAreaV1TratarPost_(e){\n  var p=e&&e.parameter?e.parameter:{};\n  if(notificacoesAreaV1Texto_(p.action).toLowerCase()!=='admin_publicar_notificacao')return null;",
    "function notificacoesAreaV1TratarPost_(e){\n  var p=e&&e.parameter?e.parameter:{};\n  var action=notificacoesAreaV1Texto_(p.action).toLowerCase();\n  if(action==='publico_confirmar_reparo_notificacao')return notificacoesAreaV1ConfirmarReparoPost_(p);\n  if(action!=='admin_publicar_notificacao')return null;",
    'rota POST pública de confirmação'
)

insertion = r'''
function notificacoesAreaV1ConfirmarReparoPost_(p){
  var props=PropertiesService.getScriptProperties();
  var appId=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.APP_ID_PROPERTIES)||TACS_NOTIFICACOES_AREA_V1.DEFAULT_APP_ID;
  var apiKey=notificacoesAreaV1PrimeiraPropriedade_(props,TACS_NOTIFICACOES_AREA_V1.API_KEY_PROPERTIES);
  var requestId=notificacoesAreaV1Texto_(p.requestId);
  var resultado;
  try{
    requestId=notificacoesAreaV1ValidarRequestId_(requestId);
    if(!apiKey)throw new Error('O serviço de confirmação das notificações não está configurado.');
    var subscriptionId=notificacoesAreaV1Texto_(p.subscriptionId||p.subscription_id).toLowerCase();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subscriptionId)){
      throw new Error('A inscrição deste aparelho não pôde ser validada.');
    }
    var areaId=moradoresAdminV1NormalizarAreaId_(p.areaId||p.area||TACS_NOTIFICACOES_AREA_V1.DEFAULT_AREA_ID);
    var area=moradoresAdminV1EncontrarAreaConfigurada_(areaId);
    if(!area||area.publica===false)throw new Error('A área deste aparelho não está disponível para notificações.');
    resultado=notificacoesAreaV1EnviarConfirmacaoReparo_(appId,apiKey,subscriptionId,area);
  }catch(erro){
    resultado={ok:false,push:false,message:notificacoesAreaV1Erro_(erro)};
  }
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId))notificacoesAreaV1GuardarResultado_(requestId,resultado);
  return notificacoesAreaV1ResponderPost_(requestId,resultado);
}

function notificacoesAreaV1EnviarConfirmacaoReparo_(appId,apiKey,subscriptionId,area){
  var cache=CacheService.getScriptCache();
  var hash=(typeof moradoresAdminV1Hash_==='function')
    ?moradoresAdminV1Hash_(subscriptionId)
    :subscriptionId.replace(/-/g,'').slice(0,32);
  var chave=TACS_NOTIFICACOES_AREA_V1.REPAIR_RATE_PREFIX+hash;
  var anterior=cache.get(chave);
  if(anterior){
    try{return JSON.parse(anterior);}catch(erroCache){}
  }
  var payload={
    app_id:appId,
    target_channel:'push',
    headings:{pt:TACS_NOTIFICACOES_AREA_V1.REPAIR_TITLE,en:TACS_NOTIFICACOES_AREA_V1.REPAIR_TITLE},
    contents:{pt:TACS_NOTIFICACOES_AREA_V1.REPAIR_MESSAGE,en:TACS_NOTIFICACOES_AREA_V1.REPAIR_MESSAGE},
    include_subscription_ids:[subscriptionId],
    url:TACS_NOTIFICACOES_AREA_V1.PORTAL_URL,
    data:{tipo:'REPARO_NOTIFICACAO',areaId:area.areaId}
  };
  var resposta=UrlFetchApp.fetch(TACS_NOTIFICACOES_AREA_V1.ENDPOINT,{
    method:'post',contentType:'application/json',payload:JSON.stringify(payload),
    headers:{Authorization:'Key '+apiKey},muteHttpExceptions:true
  });
  var code=Number(resposta.getResponseCode());
  var texto=resposta.getContentText();
  var data={};try{data=JSON.parse(texto||'{}');}catch(erroJson){}
  if(code<200||code>=300){
    var detalhe=data&&data.errors?JSON.stringify(data.errors):('HTTP '+code);
    throw new Error('O OneSignal recusou a confirmação individual: '+detalhe);
  }
  var destinatarios=(data.recipients===null||typeof data.recipients==='undefined'||data.recipients==='')
    ?null:Number(data.recipients);
  if(!data.id||destinatarios===0){
    throw new Error('O OneSignal não encontrou uma inscrição ativa para este aparelho.');
  }
  var resultado={
    ok:true,push:true,areaId:area.areaId,onesignalId:String(data.id),
    destinatarios:destinatarios,
    message:'A notificação de confirmação foi enviada somente para este aparelho.'
  };
  cache.put(chave,JSON.stringify(resultado),TACS_NOTIFICACOES_AREA_V1.REPAIR_RATE_SECONDS);
  return resultado;
}

'''
marker = "function notificacoesAreaV1ExigirPublicacao_(acesso){"
if s.count(marker) != 1:
    raise SystemExit('Ponto de inserção do backend não foi localizado exatamente uma vez.')
s = s.replace(marker, insertion + marker, 1)
backend.write_text(s, encoding='utf-8')

client = Path('agenda-enfermeira.js')
c = client.read_text(encoding='utf-8')
transport = r'''
        function confirmarReparoPorPush(subscriptionId, areaId) {
          return new Promise(function (resolve, reject) {
            var sub = String(subscriptionId || '').trim().toLowerCase();
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sub)) {
              reject(new Error('A inscrição deste aparelho ainda não está pronta para confirmação.'));
              return;
            }
            var requestId = 'reparo_push_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            var frame = document.createElement('iframe');
            var form = document.createElement('form');
            var frameName = 'portalReparoPush' + Date.now() + Math.floor(Math.random() * 1000);
            var finished = false;
            var submitted = false;
            var pollTimer = null;
            var timeout = null;
            frame.name = frameName;
            frame.setAttribute('name', frameName);
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;border:0;opacity:.01;pointer-events:none';
            frame.src = 'about:blank';
            form.method = 'POST';
            form.action = API + '?_=' + Date.now();
            form.target = frameName;
            form.style.display = 'none';
            function add(name, value) {
              var input = document.createElement('input');
              input.type = 'hidden';
              input.name = name;
              input.value = value;
              form.appendChild(input);
            }
            function cleanup() {
              clearTimeout(pollTimer);
              clearTimeout(timeout);
              window.removeEventListener('message', onMessage);
              if (form.parentNode) form.remove();
              setTimeout(function () { if (frame.parentNode) frame.remove(); }, 100);
            }
            function finish(error, result) {
              if (finished) return;
              finished = true;
              cleanup();
              if (error) reject(error); else resolve(result);
            }
            function acceptResult(result) {
              if (!result || result.ok !== true || result.push !== true) {
                finish(new Error((result && result.message) || 'A notificação de confirmação não foi aceita.'));
                return;
              }
              finish(null, result);
            }
            function onMessage(event) {
              if (event.source !== frame.contentWindow) return;
              var data = event.data;
              if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (error) { return; }
              }
              if (!data || data.source !== 'notificacoes-area-tacs-v1' || data.requestId !== requestId) return;
              acceptResult(data.result);
            }
            function poll() {
              if (finished) return;
              var callback = '__portalReparoPush_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
              var script = document.createElement('script');
              var settled = false;
              var pollTimeout = setTimeout(function () { settle(null); }, 5000);
              function settle(data) {
                if (settled) return;
                settled = true;
                clearTimeout(pollTimeout);
                try { delete window[callback]; } catch (error) { window[callback] = undefined; }
                if (script.parentNode) script.remove();
                if (data && data.ok === true && data.pendente === false && data.result) {
                  acceptResult(data.result);
                  return;
                }
                if (!finished) pollTimer = setTimeout(poll, 1200);
              }
              window[callback] = settle;
              script.onerror = function () { settle(null); };
              script.src = API + (API.indexOf('?') === -1 ? '?' : '&') +
                'action=publico_notificacao_reparo_result&requestId=' + encodeURIComponent(requestId) +
                '&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
              document.head.appendChild(script);
            }
            function submitOnce() {
              if (submitted || finished) return;
              submitted = true;
              try { form.submit(); }
              catch (error) { finish(new Error('Não foi possível solicitar a confirmação do aparelho.')); return; }
              pollTimer = setTimeout(poll, 900);
            }
            add('action', 'publico_confirmar_reparo_notificacao');
            add('requestId', requestId);
            add('subscriptionId', sub);
            add('areaId', areaId || 'JAPARANDUBA');
            window.addEventListener('message', onMessage);
            document.body.appendChild(frame);
            document.body.appendChild(form);
            frame.addEventListener('load', submitOnce, { once: true });
            setTimeout(submitOnce, 160);
            timeout = setTimeout(function () { finish(new Error('A confirmação por notificação demorou demais.')); }, 25000);
          });
        }

'''
marker_client = "        async function repararRecebimento() {"
if c.count(marker_client) != 1:
    raise SystemExit('Ponto de inserção do transporte de confirmação não foi localizado.')
c = c.replace(marker_client, transport + marker_client, 1)
old_success = """            var areaConfirmada = await marcarAreaDaUnidade();
            if (!areaConfirmada) {
              throw new Error('A área do aparelho não pôde ser confirmada.');
            }
            repairInProgress = false;
            mostrarEstado(estadoInscricao(), true);
            help.textContent =
              'Reparo concluído. A inscrição foi renovada e este aparelho está vinculado à área do morador.';"""
new_success = """            var areaConfirmada = await marcarAreaDaUnidade();
            if (!areaConfirmada) {
              throw new Error('A área do aparelho não pôde ser confirmada.');
            }
            var confirmacaoErro = '';
            try {
              await confirmarReparoPorPush(estadoInscricao().subscriptionId, areaAtualDaUnidade());
            } catch (erroConfirmacao) {
              confirmacaoErro = erroConfirmacao && erroConfirmacao.message
                ? erroConfirmacao.message
                : 'A confirmação por notificação não foi concluída.';
            }
            repairInProgress = false;
            mostrarEstado(estadoInscricao(), true);
            help.textContent = confirmacaoErro
              ? 'A inscrição foi renovada e a área foi vinculada, mas a notificação de confirmação não chegou a ser enviada agora. Tente o reparo novamente em alguns instantes.'
              : 'Reparo concluído. Enviamos uma notificação de confirmação somente para este aparelho. Se ela aparecer, o canal de avisos está funcionando.';"""
c = replace_once(c, old_success, new_success, 'confirmação após reparo permanente')
old_click = """        button.addEventListener('click', async function () {
          button.disabled = true;
          status.textContent = 'Confirmando a inscrição deste aparelho...';
          try {"""
new_click = """        button.addEventListener('click', async function () {
          var estadoAntes = estadoInscricao();
          var deveConfirmarReparo = estadoAntes.permission || inscricaoAtiva(estadoAntes);
          button.disabled = true;
          status.textContent = 'Confirmando a inscrição deste aparelho...';
          try {"""
c = replace_once(c, old_click, new_click, 'detecção de reparo no botão principal')
old_area_click = """            if (inscricaoAtiva(atual)) {
              var areaConfirmada = await marcarAreaDaUnidade();
              mostrarEstado(estadoInscricao(), areaConfirmada);
            } else {"""
new_area_click = """            if (inscricaoAtiva(atual)) {
              var areaConfirmada = await marcarAreaDaUnidade();
              mostrarEstado(estadoInscricao(), areaConfirmada);
              if (deveConfirmarReparo && areaConfirmada) {
                try {
                  await confirmarReparoPorPush(estadoInscricao().subscriptionId, areaAtualDaUnidade());
                  help.textContent =
                    'Conexão restabelecida. Enviamos uma notificação de confirmação somente para este aparelho. Se ela aparecer, o canal de avisos está funcionando.';
                } catch (erroConfirmacao) {
                  help.textContent =
                    'O vínculo foi reparado, mas a notificação de confirmação não pôde ser enviada agora. Tente o reparo novamente em alguns instantes.';
                }
              }
            } else {"""
c = replace_once(c, old_area_click, new_area_click, 'confirmação após reparo de vínculo/inscrição')
client.write_text(c, encoding='utf-8')

index = Path('index.html')
h = index.read_text(encoding='utf-8')
h = replace_once(h, 'agenda-enfermeira.js?v=20260812-reparo-push-v4', 'agenda-enfermeira.js?v=20260812-confirmacao-reparo-push-v5', 'cache bust do cliente')
index.write_text(h, encoding='utf-8')

test_button = Path('scripts/test_notification_repair_button.js')
t = test_button.read_text(encoding='utf-8')
t = t.replace(
    "assert.match(source, /Reparo concluído\\. A inscrição foi renovada/);",
    "assert.match(source, /async function confirmarReparoPorPush\\(subscriptionId, areaId\\)/);\nassert.match(source, /publico_confirmar_reparo_notificacao/);\nassert.match(source, /publico_notificacao_reparo_result/);\nassert.match(source, /Reparo concluído\\. Enviamos uma notificação de confirmação/);"
)
t = t.replace(
    "assert.match(index, /agenda-enfermeira\\.js\\?v=20260812-reparo-push-v4/);",
    "assert.match(index, /agenda-enfermeira\\.js\\?v=20260812-confirmacao-reparo-push-v5/);"
)
test_button.write_text(t, encoding='utf-8')

Path('scripts/test_notification_repair_confirmation.js').write_text(r'''\
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('apps-script/ZZZZ_19_NotificacoesSegmentadasV1.gs', 'utf8');
new vm.Script(source, {filename: 'ZZZZ_19_NotificacoesSegmentadasV1.gs'});
const cache = new Map();
const fetched = [];
const context = vm.createContext({
  console, JSON, Date, Math, Object, Array, String, Number, RegExp,
  doGet() { return {legacy: 'get'}; },
  doPost() { return {legacy: 'post'}; },
  PropertiesService: {getScriptProperties() {return {getProperty(key) {
    if (key === 'TACS_ONESIGNAL_API_KEY') return 'secret-test-key';
    if (key === 'TACS_ONESIGNAL_APP_ID') return 'e2294b98-c72b-4f8c-a055-de28979676dc';
    return null;
  }};}},
  CacheService: {getScriptCache() {return {get(key) {return cache.has(key) ? cache.get(key) : null;}, put(key, value) {cache.set(key, String(value));}};}},
  UrlFetchApp: {fetch(url, options) {fetched.push({url, options}); return {getResponseCode() {return 200;}, getContentText() {return JSON.stringify({id: 'confirmacao-001', recipients: 1});}};}},
  moradoresAdminV1NormalizarAreaId_(value) {return String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');},
  moradoresAdminV1EncontrarAreaConfigurada_(areaId) {return areaId === 'JAPARANDUBA' ? {areaId: 'JAPARANDUBA', areaNome: 'Sítio Japaranduba', publica: true} : null;},
  moradoresAdminV1Hash_(value) {return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24);},
  HtmlService: {XFrameOptionsMode: {ALLOWALL: 'ALLOWALL'}, createHtmlOutput(content) {return {content, setXFrameOptionsMode() {return this;}};}},
  ContentService: {MimeType: {JSON: 'JSON', JAVASCRIPT: 'JAVASCRIPT'}, createTextOutput(content) {return {content, setMimeType() {return this;}};}}
});
vm.runInContext(source, context);
const subscriptionId = '12345678-1234-4abc-8def-1234567890ab';
const requestId = 'reparo_test_001';
const response = context.doPost({parameter: {action: 'publico_confirmar_reparo_notificacao', requestId, subscriptionId, areaId: 'JAPARANDUBA'}});
assert.match(response.content, /notificacoes-area-tacs-v1/);
assert.match(response.content, /confirmacao-001/);
assert.equal(fetched.length, 1);
const payload = JSON.parse(fetched[0].options.payload);
assert.deepEqual(Array.from(payload.include_subscription_ids), [subscriptionId]);
assert.equal(Object.prototype.hasOwnProperty.call(payload, 'filters'), false);
assert.equal(payload.headings.pt, 'Portal TACS — avisos restabelecidos');
assert.match(payload.contents.pt, /Este aparelho está pronto para receber novos recados e avisos/);
assert.equal(payload.data.areaId, 'JAPARANDUBA');
context.doPost({parameter: {action: 'publico_confirmar_reparo_notificacao', requestId: 'reparo_test_002', subscriptionId, areaId: 'JAPARANDUBA'}});
assert.equal(fetched.length, 1);
const invalid = context.doPost({parameter: {action: 'publico_confirmar_reparo_notificacao', requestId: 'reparo_test_003', subscriptionId: 'nao-e-uuid', areaId: 'JAPARANDUBA'}});
assert.match(invalid.content, /não pôde ser validada/);
assert.equal(fetched.length, 1);
const result = context.doGet({parameter: {action: 'publico_notificacao_reparo_result', requestId, callback: 'cbTeste'}});
assert.match(result.content, /^cbTeste\(/);
assert.match(result.content, /confirmacao-001/);
console.log('Confirmação individual de reparo: alvo único, texto fixo, limite e resultado público validados.');
''', encoding='utf-8')

package = Path('package.json')
p = __import__('json').loads(package.read_text(encoding='utf-8'))
extra = 'node scripts/test_notification_repair_confirmation.js'
if extra not in p['scripts']['test']:
    p['scripts']['test'] += ' && ' + extra
package.write_text(__import__('json').dumps(p, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
