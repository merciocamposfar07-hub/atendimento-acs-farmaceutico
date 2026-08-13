const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function file(name) { return path.join(ROOT, name); }
function read(name) { return fs.readFileSync(file(name), 'utf8'); }
function write(name, content) { fs.writeFileSync(file(name), content, 'utf8'); }
function replaceOnce(content, from, to, label) {
  const first = content.indexOf(from);
  if (first < 0) throw new Error(`Trecho não encontrado: ${label}`);
  if (content.indexOf(from, first + from.length) >= 0) throw new Error(`Trecho duplicado: ${label}`);
  return content.slice(0, first) + to + content.slice(first + from.length);
}

function patchWarmup() {
  let s = read('admin-warmup.js');
  s = replaceOnce(s, "var CACHE_MS=2*60*1000;\n  var WARM_MS=45*1000;\n  var TIMEOUT_MS=25000;", "var CACHE_MS=5*60*1000;\n  var WARM_MS=3*60*1000;\n  var TIMEOUT_MS=6000;", 'warmup constants');
  s = replaceOnce(s, "if(document.visibilityState==='visible'&&Date.now()-ultimaConclusao>=2*60*1000){", "if(document.visibilityState==='visible'&&Date.now()-ultimaConclusao>=5*60*1000){", 'warmup visible threshold');
  write('admin-warmup.js', s);
}

function patchAutoUpdate() {
  let s = read('portal-auto-update.js');
  s = replaceOnce(s, 'var CHECK_INTERVAL=15000;', 'var CHECK_INTERVAL=60000;', 'auto-update interval');
  s = replaceOnce(s, `  function clearTransientConnectionState(){\n    [\n      'portalTacsAdminStatusV5',\n      'portalTacsAppsScriptWarmAtV1',\n      'portalTacsPublicDataV3',\n      'portalTacsPublicDataV2',\n      'portalTacsPublicDataV1'\n    ].forEach(function(key){removeStorage(localStorage,key)});\n  }`, `  function clearTransientConnectionState(){\n    [\n      'portalTacsAdminStatusV5',\n      'portalTacsAppsScriptWarmAtV1'\n    ].forEach(function(key){removeStorage(localStorage,key)});\n  }`, 'preserve public caches');

  const marker = `  function installUI(){\n    if(!document.body){setTimeout(installUI,40);return}`;
  const insertion = `  function isAdminPage(){\n    return /(?:^|\\/)(?:painel-oficial-|teste-v1\\/painel-|admin)/.test(window.location.pathname||'');\n  }\n\n  function smartRefresh(button){\n    if(isAdminPage()){\n      clearTransientConnectionState();\n      reloadFresh(Date.now());\n      return;\n    }\n\n    var original=button&&button.textContent;\n    if(button){button.disabled=true;button.textContent='↻ Atualizando…'}\n    var tasks=[];\n    try{\n      var publico=window.PortalTacsPublicData;\n      if(publico&&typeof publico.refresh==='function')tasks.push(Promise.resolve(publico.refresh()).catch(function(){return null}));\n    }catch(e){}\n    try{\n      var dental=window.PortalTacsOdontologiaV98;\n      if(dental&&typeof dental.atualizar==='function')tasks.push(Promise.resolve(dental.atualizar()).catch(function(){return null}));\n    }catch(e){}\n    try{\n      var warm=window.PortalTacsAdminWarmup;\n      if(warm&&typeof warm.iniciar==='function')tasks.push(Promise.resolve(warm.iniciar(true)).catch(function(){return null}));\n    }catch(e){}\n    tasks.push(Promise.resolve(fetchVersion(true)).catch(function(){return null}));\n    Promise.all(tasks).finally(function(){\n      if(button){button.disabled=false;button.textContent=original||'↻ Atualizar página'}\n    });\n  }\n\n` + marker;
  s = replaceOnce(s, marker, insertion, 'smart refresh insert');
  s = replaceOnce(s, "    button.addEventListener('click',function(){reloadFresh(Date.now())});", "    button.addEventListener('click',function(){smartRefresh(button)});", 'smart refresh button');
  s = replaceOnce(s, "  window.addEventListener('online',function(){clearTransientConnectionState();wakeConnection();fetchVersion(true)});", "  window.addEventListener('online',function(){wakeConnection();fetchVersion(true)});", 'online preserve cache');
  write('portal-auto-update.js', s);
}

function patchDental() {
  let s = read('portal-odontologia-segunda-sexta.js');
  s = replaceOnce(s, `  var internalCategoryChange = false;\n  var verifyTimer = null;`, `  var internalCategoryChange = false;\n  var verifyTimer = null;\n  var loadPromise = null;\n  var CACHE_KEY = 'portalTacsDentalAgendaV101';\n  var CACHE_MAX_MS = 6 * 60 * 60 * 1000;\n  var CACHE_ACTIONABLE_MS = 90 * 1000;\n  var cacheSavedAt = 0;\n  var cachedSnapshot = false;`, 'dental cache constants');

  const afterNormalize = `  function normalizeSlot(raw, index) {\n    var day = clean(raw && (raw.dia || raw.day));\n    var date = normalizeDate(raw && (raw.data || raw.date));\n    if (ALLOWED_DAYS.indexOf(day) === -1 || !date || !currentDate(date)) return null;\n    return {\n      id: clean(raw.id || raw.codigo || raw.row || '') || day + '-' + date + '-' + index,\n      day: day,\n      date: date,\n      common: numberValue(raw, 'comum'),\n      emergency: numberValue(raw, 'emergencial')\n    };\n  }`;
  const cacheFunctions = afterNormalize + `\n\n  function normalizeAgendaData(data) {\n    var normalized = [];\n    (Array.isArray(data && data.dias) ? data.dias : []).forEach(function (row, index) {\n      var slot = normalizeSlot(row, index);\n      if (slot) normalized.push(slot);\n    });\n    normalized.sort(function (a, b) { return dateStamp(a.date) - dateStamp(b.date); });\n    return normalized;\n  }\n\n  function readAgendaCache() {\n    try {\n      var item = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');\n      if (!item || !item.data || item.data.ok === false) return null;\n      var age = Date.now() - Number(item.savedAt || 0);\n      if (age < 0 || age > CACHE_MAX_MS) return null;\n      return { data: item.data, savedAt: Number(item.savedAt || 0) };\n    } catch (error) { return null; }\n  }\n\n  function saveAgendaCache(data) {\n    if (!data || data.ok === false) return;\n    cacheSavedAt = Date.now();\n    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: cacheSavedAt, data: data })); }\n    catch (error) {}\n  }\n\n  function saveSlotsCache() {\n    var data = {\n      ok: true,\n      dias: slots.map(function (slot) {\n        return {\n          id: slot.id, dia: slot.day, data: slot.date,\n          vagasComuns: slot.common, vagasEmergenciais: slot.emergency\n        };\n      })\n    };\n    saveAgendaCache(data);\n  }\n\n  function applyAgendaData(data, fromCache, savedAt) {\n    slots = normalizeAgendaData(data);\n    cachedSnapshot = Boolean(fromCache);\n    cacheSavedAt = Number(savedAt || (fromCache ? 0 : Date.now()));\n  }\n\n  function cachedIsActionable() {\n    return !cachedSnapshot || (cacheSavedAt > 0 && Date.now() - cacheSavedAt <= CACHE_ACTIONABLE_MS);\n  }\n\n  function loadCachedAgenda() {\n    var item = readAgendaCache();\n    if (!item) return false;\n    applyAgendaData(item.data, true, item.savedAt);\n    loading = false;\n    renderAgenda();\n    return slots.length > 0;\n  }`;
  s = replaceOnce(s, afterNormalize, cacheFunctions, 'dental cache functions');

  s = replaceOnce(s, `  function statusText() {\n    if (loading) return 'Atualizando a agenda odontológica pela planilha...';`, `  function statusText() {\n    if (loading) return slots.length ? 'Agenda exibida. Confirmando as vagas atuais…' : 'Atualizando a agenda odontológica pela planilha...';\n    if (cachedSnapshot) return 'Última agenda recebida exibida. Confirmando a disponibilidade atual ao selecionar uma vaga.';`, 'dental status cache');

  s = replaceOnce(s, `        button.disabled = Boolean(selection && !same) || (!same && (value === null || value <= 0));`, `        button.disabled = Boolean(selection && !same) || (!same && (value === null || value <= 0 || !cachedIsActionable()));`, 'dental stale disable');

  s = replaceOnce(s, `      var finished = false;\n      var timer = setTimeout(function () { finish(new Error('Tempo de resposta excedido.')); }, 12000);`, `      var finished = false;\n      var timeoutMs = slots.length ? 4500 : 12000;\n      var timer = setTimeout(function () { finish(new Error('Tempo de resposta excedido.')); }, timeoutMs);`, 'dental adaptive timeout');

  const oldLoad = `  function loadAgenda(preserveSelection) {\n    if (!isDental() || loading) return;\n    loading = true;\n    if (!preserveSelection) selection = null;\n    renderAgenda();\n    fetchAgenda().then(function (data) {\n      var normalized = [];\n      (Array.isArray(data.dias) ? data.dias : []).forEach(function (row, index) {\n        var slot = normalizeSlot(row, index);\n        if (slot) normalized.push(slot);\n      });\n      normalized.sort(function (a, b) { return dateStamp(a.date) - dateStamp(b.date); });\n      slots = normalized;\n      loading = false;\n      renderAgenda();\n      refreshSend();\n    }).catch(function (error) {\n      loading = false;\n      if (!preserveSelection) slots = [];\n      renderAgenda();\n      var status = el('dentalStatus');\n      if (status && !selection) {\n        status.textContent = error.message || 'Não foi possível consultar a planilha odontológica.';\n        status.className = 'dental-status error';\n      }\n      refreshSend();\n    });\n  }`;
  const newLoad = `  function loadAgenda(preserveSelection) {\n    if (!isDental()) return Promise.resolve(null);\n    if (loading && loadPromise) return loadPromise;\n    loading = true;\n    if (!preserveSelection) selection = null;\n    renderAgenda();\n    loadPromise = fetchAgenda().then(function (data) {\n      applyAgendaData(data, false, Date.now());\n      saveAgendaCache(data);\n      loading = false;\n      loadPromise = null;\n      renderAgenda();\n      refreshSend();\n      return data;\n    }).catch(function (error) {\n      loading = false;\n      loadPromise = null;\n      renderAgenda();\n      var status = el('dentalStatus');\n      if (status && !selection) {\n        if (slots.length) {\n          cachedSnapshot = true;\n          status.textContent = 'Não foi possível confirmar a agenda agora. A última leitura recebida continua visível.';\n          status.className = 'dental-status';\n        } else {\n          status.textContent = error.message || 'Não foi possível consultar a planilha odontológica.';\n          status.className = 'dental-status error';\n        }\n      }\n      refreshSend();\n      return null;\n    });\n    return loadPromise;\n  }`;
  s = replaceOnce(s, oldLoad, newLoad, 'dental load cache-first');

  s = replaceOnce(s, `    item.optimisticRemaining = Math.max(0, Number(remaining));\n  }`, `    item.optimisticRemaining = Math.max(0, Number(remaining));\n    saveSlotsCache();\n  }`, 'dental save remaining cache');

  s = replaceOnce(s, `    if (isDental()) loadAgenda(false);\n  }\n\n  if (document.readyState === 'loading')`, `    if (isDental()) {\n      loadCachedAgenda();\n      loadAgenda(false);\n    }\n  }\n\n  window.PortalTacsOdontologiaV98 = Object.freeze({\n    atualizar: function () { return loadAgenda(false); },\n    temCache: function () { return Boolean(readAgendaCache()); },\n    cacheKey: CACHE_KEY\n  });\n\n  if (document.readyState === 'loading')`, 'dental public refresh api');
  write('portal-odontologia-segunda-sexta.js', s);
}

function patchAgendasPanel() {
  let s = read('painel-oficial-agendas-vagas.html');
  s = replaceOnce(s, "var TOKEN_KEY='portalTacsAdminTokenV1',DEVICE_KEY='portalTacsDispositivoV1',UNDO_KEY='portalTacsUndoAgendaV1';", "var TOKEN_KEY='portalTacsAdminTokenV1',DEVICE_KEY='portalTacsDispositivoV1',UNDO_KEY='portalTacsUndoAgendaV1',DATA_CACHE_KEY='portalTacsAdminAgendasSnapshotV101';", 'agenda panel cache key');
  s = replaceOnce(s, `var entrar=document.getElementById('entrar'),sair=document.getElementById('sair'),desfazer=document.getElementById('desfazer');`, `var entrar=document.getElementById('entrar'),sair=document.getElementById('sair'),desfazer=document.getElementById('desfazer');\nvar dadosConfirmados=false;\nfunction lerSnapshot(){try{var item=JSON.parse(localStorage.getItem(DATA_CACHE_KEY)||'null');if(!item||!item.data||Date.now()-Number(item.salvoEm||0)>24*60*60*1000)return null;return item}catch(e){return null}}\nfunction salvarSnapshot(r){try{localStorage.setItem(DATA_CACHE_KEY,JSON.stringify({salvoEm:Date.now(),data:{ok:true,profissionais:Array.isArray(r.profissionais)?r.profissionais:[],agendas:Array.isArray(r.agendas)?r.agendas:[]}}))}catch(e){}}\nfunction bloquearEdicaoNaoConfirmada(){document.querySelectorAll('.salvarAgenda').forEach(function(b){b.disabled=!dadosConfirmados});if(desfazer)desfazer.disabled=!dadosConfirmados}\nfunction aplicarSnapshotSeDisponivel(){if(!token)return false;var item=lerSnapshot();if(!item)return false;aplicarDados(item.data,false);status('loginStatus','Última leitura exibida imediatamente. Confirmando com o servidor…','aviso');return true}`, 'agenda panel snapshot helpers');

  s = replaceOnce(s, `function aplicarDados(r){dados.profissionais=Array.isArray(r.profissionais)?r.profissionais:[];dados.agendas=Array.isArray(r.agendas)?r.agendas:[];document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');sair.disabled=false;preencherFiltros();render()}`, `function aplicarDados(r,confirmado){dadosConfirmados=confirmado!==false;dados.profissionais=Array.isArray(r.profissionais)?r.profissionais:[];dados.agendas=Array.isArray(r.agendas)?r.agendas:[];document.getElementById('conteudo').classList.remove('oculto');document.getElementById('resumo').classList.remove('oculto');sair.disabled=false;preencherFiltros();render();bloquearEdicaoNaoConfirmada()}`, 'agenda panel apply data');

  s = replaceOnce(s, `aplicarDados(r);status('loginStatus',mensagem||'Sessão validada e agendas carregadas.','ok');`, `aplicarDados(r,true);salvarSnapshot(r);status('loginStatus',mensagem||'Sessão validada e agendas carregadas.','ok');`, 'agenda panel confirmed snapshot');
  s = replaceOnce(s, `document.getElementById('qVagas').textContent=dados.agendas.reduce(function(t,a){return t+num(a.VAGAS_COMUNS)+num(a.VAGAS_EMERGENCIAIS)},0);atualizarUndo()}`, `document.getElementById('qVagas').textContent=dados.agendas.reduce(function(t,a){return t+num(a.VAGAS_COMUNS)+num(a.VAGAS_EMERGENCIAIS)},0);atualizarUndo();bloquearEdicaoNaoConfirmada()}`, 'agenda panel render lock');
  s = replaceOnce(s, `function salvarAgenda(c){var p=payloadAgenda(c),anterior=achar(p.modulo,p.dia);`, `function salvarAgenda(c){if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação dos dados atuais antes de salvar.','aviso');return}var p=payloadAgenda(c),anterior=achar(p.modulo,p.dia);`, 'agenda panel save guard');
  s = replaceOnce(s, `function restaurar(){var u=lerUndo();`, `function restaurar(){if(!dadosConfirmados){status('statusOperacao','Aguarde a confirmação dos dados atuais antes de restaurar.','aviso');return}var u=lerUndo();`, 'agenda panel undo guard');
  s = replaceOnce(s, `token=r.token;sessionStorage.setItem(TOKEN_KEY,token);status('loginStatus','PIN confirmado. Carregando agendas…','aviso');carregarDados('Sessão validada e agendas carregadas.')`, `token=r.token;sessionStorage.setItem(TOKEN_KEY,token);var mostrouCache=aplicarSnapshotSeDisponivel();if(!mostrouCache)status('loginStatus','PIN confirmado. Carregando agendas…','aviso');carregarDados('Sessão validada e agendas carregadas.')`, 'agenda panel login cache');
  s = replaceOnce(s, `function iniciarPainel(){entrar.disabled=false;if(token){carregarDados('Sessão existente validada e agendas carregadas.',null,true);return}`, `function iniciarPainel(){entrar.disabled=false;if(token){aplicarSnapshotSeDisponivel();carregarDados('Sessão existente validada e agendas carregadas.',null,true);return}`, 'agenda panel existing token cache');
  write('painel-oficial-agendas-vagas.html', s);
}

function patchBuildRelease() {
  let s = read('scripts/build_apps_script_release.js');
  const from = `  {\n    source: 'apps-script/ZZZZ_20_PublicacoesTerritoriaisV1.gs',\n    marker: 'TACS_PUBLICACOES_TERRITORIAIS_V1'\n  }\n];`;
  const to = `  {\n    source: 'apps-script/ZZZZ_20_PublicacoesTerritoriaisV1.gs',\n    marker: 'TACS_PUBLICACOES_TERRITORIAIS_V1'\n  },\n  {\n    source: 'apps-script/ZZZZ_21_PerformanceCacheV101.gs',\n    marker: 'TACS_PERFORMANCE_CACHE_V101'\n  }\n];`;
  s = replaceOnce(s, from, to, 'release performance module');
  write('scripts/build_apps_script_release.js', s);
}

patchWarmup();
patchAutoUpdate();
patchDental();
patchAgendasPanel();
patchBuildRelease();

// O aplicador é temporário: não fica no produto final.
try { fs.unlinkSync(__filename); } catch (e) {}
const workflow = file('.github/workflows/aplicar-desempenho-v101.yml');
try { fs.unlinkSync(workflow); } catch (e) {}

console.log('PERFORMANCE_V101_PATCH_OK');
