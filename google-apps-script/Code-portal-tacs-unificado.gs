/*
 * BACKEND INTEGRAL — PORTAL TACS
 * Fonte única: planilha "Portal TACS – Banco de Dados".
 *
 * Este arquivo mantém as agendas profissionais, recados, campanhas e
 * odontologia na mesma aba PAINEL_PROFISSIONAIS.
 */
var TACS_SHEET_NURSE = 'AGENDA_ENFERMEIRA';
var TACS_SHEET_MODULES = 'PAINEL_PROFISSIONAIS';
var TACS_SHEET_NOTICES = 'RECADOS_PORTAL';
var TACS_SHEET_CAMPAIGNS = 'CAMPANHAS_PORTAL';
var TACS_SHEET_CONFIG = 'CONFIGURACOES';
var TACS_SHEET_DENTAL_RESERVATIONS = 'RESERVAS_ODONTOLOGIA';
var TACS_TZ = 'America/Recife';

function doGet(e) {
  var action = String((e && e.parameter && e.parameter.action) || 'painel_publico').trim();
  var callback = String((e && e.parameter && e.parameter.callback) || '').trim();
  var data;
  try {
    if (action === 'agenda_enfermeira') data = tacsGetNurse_();
    else if (action === 'painel_publico') data = tacsGetPublic_();
    else if (action === 'agenda') data = tacsGetDentalAgenda_();
    else if (action === 'status') data = {ok: true, sistema: 'Portal TACS integral', atualizadoEm: tacsNow_()};
    else data = {ok: false, message: 'Ação não reconhecida.'};
  } catch (error) {
    data = {ok: false, message: error && error.message ? error.message : String(error)};
  }
  return tacsReply_(data, callback);
}

function doPost(e) {
  var action = String((e && e.parameter && e.parameter.action) || '').trim();
  var nonce = String((e && e.parameter && e.parameter.nonce) || '');
  var result;
  var dentalAction = action === 'reservar' || action === 'reservar_odontologia' || action === 'salvar_agenda';
  try {
    if (action === 'reservar' || action === 'reservar_odontologia') {
      result = tacsReserveDental_(e.parameter || {});
    } else {
      tacsValidateKey_(e);
      if (action === 'salvar_agenda_enfermeira') result = tacsSaveNurse_(e.parameter.payload);
      else if (action === 'salvar_modulo') result = tacsSaveModule_(e.parameter.payload);
      else if (action === 'salvar_agenda') result = tacsSaveDentalAgenda_(e.parameter.payload);
      else if (action === 'salvar_recado') result = tacsSaveNotice_(e.parameter.payload);
      else if (action === 'cancelar_recados') result = tacsCancelNotices_();
      else if (action === 'salvar_campanha') result = tacsSaveCampaign_(e.parameter.payload);
      else if (action === 'cancelar_campanhas') result = tacsCancelCampaigns_();
      else result = {ok: false, message: 'Ação não reconhecida.'};
    }
  } catch (error) {
    result = {ok: false, message: error && error.message ? error.message : String(error)};
  }

  var source = dentalAction ? 'agenda-odontologica-tacs' : 'painel-tacs-integral';
  var envelope = {source: source, nonce: nonce, result: result};
  if (dentalAction) {
    Object.keys(result || {}).forEach(function (key) {
      if (envelope[key] === undefined) envelope[key] = result[key];
    });
  }

  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><script>parent.postMessage(' +
    JSON.stringify(envelope).replace(/</g, '\\u003c') +
    ',"*");<\\/script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function configurarControleIntegralTacs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abra este Apps Script a partir da planilha Portal TACS – Banco de Dados.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  tacsEnsureNurse_(ss);
  tacsEnsureModules_(ss);
  tacsEnsureNotices_(ss);
  tacsEnsureCampaigns_(ss);
  tacsEnsureDentalReservations_(ss);

  var config = ss.getSheetByName(TACS_SHEET_CONFIG) || ss.insertSheet(TACS_SHEET_CONFIG);
  if (config.getLastRow() === 0) {
    config.getRange(1, 1, 1, 2).setValues([['CHAVE', 'VALOR']]);
    config.getRange(2, 1, 1, 2).setValues([[
      'CHAVE_ADMIN',
      Utilities.getUuid().replace(/-/g, '').slice(0, 20).toUpperCase()
    ]]);
  }
  config.setFrozenRows(1);
  config.autoResizeColumns(1, 2);
  SpreadsheetApp.flush();

  return {
    ok: true,
    message: 'Controle integral configurado na planilha principal.',
    chaveAdmin: tacsConfig_('CHAVE_ADMIN')
  };
}

function tacsSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = String(props.getProperty('SPREADSHEET_ID') || '').trim();
  if (id) return SpreadsheetApp.openById(id);

  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Planilha principal não configurada. Execute configurarControleIntegralTacs() uma vez.');
  }
  props.setProperty('SPREADSHEET_ID', active.getId());
  return active;
}

function tacsGetPublic_() {
  return {
    ok: true,
    atualizadoEm: tacsNow_(),
    modules: tacsReadModules_(),
    recados: tacsReadNotices_(),
    campanhas: tacsReadCampaigns_()
  };
}

function tacsSaveModule_(payloadText) {
  var payload = JSON.parse(String(payloadText || '{}'));
  var module = tacsModuleKey_(payload.module);
  var days = Array.isArray(payload.days) ? payload.days : [];

  if (['medica', 'nutricionista', 'enfermeira', 'odontologia'].indexOf(module) < 0) {
    throw new Error('Módulo inválido.');
  }
  if (days.length !== 5) throw new Error('O módulo deve conter os cinco dias úteis.');

  var ss = tacsSpreadsheet_();
  var sh = tacsEnsureModules_(ss);
  var all = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues() : [];
  all = all.filter(function (row) {
    return tacsModuleKey_(row[0]) !== module;
  });

  var now = new Date();
  days.forEach(function (item, index) {
    all.push([
      tacsStoredModuleName_(module), index + 1, String(item.day || ''), item.active === true,
      String(item.date || ''), String(item.time || ''), String(item.status || ''),
      String(item.message || item.service || ''), item.closeAtNoon === true,
      Number(item.common || 0), Number(item.emergency || 0), item.extra === true, now
    ]);
  });

  tacsRewriteModules_(sh, all);
  return {ok: true, message: 'Módulo publicado.', module: module, days: days};
}

function tacsReadModules_() {
  var sh = tacsEnsureModules_(tacsSpreadsheet_());
  var out = {medica: [], nutricionista: [], enfermeira: [], odontologia: []};
  if (sh.getLastRow() < 2) return out;

  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
  rows.sort(function (a, b) {
    return tacsModuleKey_(a[0]).localeCompare(tacsModuleKey_(b[0])) || Number(a[1]) - Number(b[1]);
  });
  rows.forEach(function (row) {
    var module = tacsModuleKey_(row[0]);
    if (!out[module]) return;
    out[module].push({
      day: String(row[2]), active: tacsBoolean_(row[3]), date: tacsDateValue_(row[4]),
      time: String(row[5] || ''), status: String(row[6] || ''), message: String(row[7] || ''),
      service: String(row[7] || ''), closeAtNoon: tacsBoolean_(row[8]),
      common: tacsNonNegative_(row[9]), emergency: tacsNonNegative_(row[10]),
      extra: tacsBoolean_(row[11]), closedNow: tacsClosedAtNoon_(row[4], tacsBoolean_(row[8]))
    });
  });
  return out;
}

function tacsGetDentalAgenda_() {
  var sh = tacsEnsureModules_(tacsSpreadsheet_());
  var days = [];
  if (sh.getLastRow() >= 2) {
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
    rows.forEach(function (row, index) {
      if (tacsModuleKey_(row[0]) !== 'odontologia') return;
      var date = tacsDateValue_(row[4]);
      if (!date || !tacsBoolean_(row[3])) return;
      days.push({
        id: 'DENTISTA-' + (index + 2) + '-' + date,
        dia: String(row[2] || ''), data: date,
        vagasComuns: tacsNonNegative_(row[9]),
        vagasEmergenciais: tacsNonNegative_(row[10]),
        diaExtra: tacsBoolean_(row[11])
      });
    });
  }
  days.sort(function (a, b) { return a.data.localeCompare(b.data); });
  return {ok: true, atualizadoEm: tacsNow_(), dias: days};
}

function tacsSaveDentalAgenda_(payloadText) {
  var payload = JSON.parse(String(payloadText || '{}'));
  var days = Array.isArray(payload.dias) ? payload.dias : [];
  if (!days.length || days.length > 40) throw new Error('Informe entre 1 e 40 datas odontológicas.');

  var seen = {};
  var now = new Date();
  var dentalRows = days.map(function (item, index) {
    var date = tacsDateKey_(item && (item.data || item.date));
    if (!date) throw new Error('Há uma data odontológica inválida.');
    if (seen[date]) throw new Error('A data ' + date + ' está repetida.');
    seen[date] = true;
    var day = String((item && (item.dia || item.day)) || tacsWeekdayName_(date)).trim();
    var common = tacsRequiredNonNegative_(item && (item.vagasComuns !== undefined ? item.vagasComuns : item.common), 'Vagas comuns');
    var emergency = tacsRequiredNonNegative_(item && (item.vagasEmergenciais !== undefined ? item.vagasEmergenciais : item.emergency), 'Vagas emergenciais');
    return ['DENTISTA', index + 1, day, common > 0 || emergency > 0, date, '', 'ATENDIMENTO',
      'Atendimento odontológico', false, common, emergency, item && item.diaExtra === true, now];
  }).sort(function (a, b) { return String(a[4]).localeCompare(String(b[4])); });

  var sh = tacsEnsureModules_(tacsSpreadsheet_());
  var all = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues() : [];
  all = all.filter(function (row) { return tacsModuleKey_(row[0]) !== 'odontologia'; });
  tacsRewriteModules_(sh, all.concat(dentalRows));
  return tacsGetDentalAgenda_();
}

function tacsReserveDental_(params) {
  var requestId = String(params.requestId || '').trim();
  var date = tacsDateKey_(params.date);
  var type = String(params.type || '').trim().toLowerCase();
  if (!/^[A-Z0-9-]{8,60}$/.test(requestId)) return {ok:false,code:'INVALID_REQUEST',message:'Código da solicitação inválido.'};
  if (!date) return {ok:false,code:'INVALID_DATE',message:'Data da consulta inválida.'};
  if (date < tacsToday_()) return {ok:false,code:'PAST_DATE',message:'Essa data já passou.'};
  if (type !== 'comum' && type !== 'emergencial') return {ok:false,code:'INVALID_TYPE',message:'Tipo de vaga inválido.'};

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return {ok:false,code:'BUSY',message:'A agenda está sendo atualizada. Tente novamente.'};
  try {
    var ss = tacsSpreadsheet_();
    var reservations = tacsEnsureDentalReservations_(ss);
    var existing = tacsFindDentalReservation_(reservations, requestId);
    if (existing) return {ok:true,alreadyReserved:true,requestId:requestId,date:existing.date,type:existing.type,remaining:existing.remaining,message:'Esta solicitação já possui uma vaga reservada.'};

    var sh = tacsEnsureModules_(ss);
    if (sh.getLastRow() < 2) return {ok:false,code:'DATE_NOT_FOUND',message:'Essa data não está disponível.'};
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 13).getValues();
    var targetIndex = -1;
    for (var i = 0; i < rows.length; i += 1) {
      if (tacsModuleKey_(rows[i][0]) === 'odontologia' && tacsDateValue_(rows[i][4]) === date && tacsBoolean_(rows[i][3])) {targetIndex = i; break;}
    }
    if (targetIndex < 0) return {ok:false,code:'DATE_NOT_FOUND',message:'Essa data não está mais disponível na agenda.'};

    var column = type === 'comum' ? 10 : 11;
    var cell = sh.getRange(targetIndex + 2, column);
    var available = Number(cell.getValue());
    if (!Number.isInteger(available) || available <= 0) return {ok:false,code:'NO_SLOTS',message:type === 'emergencial' ? 'A vaga emergencial desse dia acabou.' : 'As vagas comuns desse dia acabaram.'};

    var remaining = available - 1;
    cell.setValue(remaining);
    sh.getRange(targetIndex + 2, 13).setValue(new Date());
    SpreadsheetApp.flush();
    if (Number(cell.getValue()) !== remaining) throw new Error('A planilha não confirmou a redução da vaga.');

    reservations.appendRow([requestId, new Date(), date, type, 'Reservada pelo portal', remaining]);
    var last = reservations.getLastRow();
    reservations.getRange(last, 2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    reservations.getRange(last, 3).setNumberFormat('@');
    SpreadsheetApp.flush();
    return {ok:true,alreadyReserved:false,requestId:requestId,date:date,type:type,remaining:remaining,message:'Vaga reservada e confirmada na planilha principal.'};
  } finally { lock.releaseLock(); }
}

function tacsFindDentalReservation_(sheet, requestId) {
  if (sheet.getLastRow() < 2) return null;
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < rows.length; i += 1) if (String(rows[i][0]) === requestId) return {date:tacsDateValue_(rows[i][2]),type:String(rows[i][3] || ''),remaining:Number(rows[i][5])};
  return null;
}

function tacsSaveNotice_(payloadText) {var item=JSON.parse(String(payloadText||'{}'));if(!String(item.title||item.message||'').trim())throw new Error('Recado vazio.');var sh=tacsEnsureNotices_(tacsSpreadsheet_());sh.appendRow([String(item.id||Utilities.getUuid()),String(item.title||''),String(item.message||''),String(item.priority||'informativo'),String(item.validity||''),true,new Date()]);return {ok:true,message:'Recado publicado.'};}
function tacsCancelNotices_(){var sh=tacsEnsureNotices_(tacsSpreadsheet_());if(sh.getLastRow()>1)sh.getRange(2,6,sh.getLastRow()-1,1).setValue(false);return {ok:true,message:'Recados retirados.'};}
function tacsReadNotices_(){var sh=tacsEnsureNotices_(tacsSpreadsheet_()),out=[];if(sh.getLastRow()<2)return out;var rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues(),today=tacsToday_();rows.forEach(function(r){var active=tacsBoolean_(r[5]),valid=tacsDateValue_(r[4]);if(valid&&valid<today)active=false;if(active)out.push({id:String(r[0]),title:String(r[1]),message:String(r[2]),priority:String(r[3]||'informativo'),validity:valid,active:true});});return out;}
function tacsSaveCampaign_(payloadText){var item=JSON.parse(String(payloadText||'{}'));if(!String(item.title||'').trim())throw new Error('Campanha sem nome.');var sh=tacsEnsureCampaigns_(tacsSpreadsheet_());sh.appendRow([String(item.id||Utilities.getUuid()),String(item.title||''),String(item.message||''),String(item.start||tacsToday_()),Math.max(1,Number(item.days||1)),true,new Date()]);return {ok:true,message:'Campanha publicada.'};}
function tacsCancelCampaigns_(){var sh=tacsEnsureCampaigns_(tacsSpreadsheet_());if(sh.getLastRow()>1)sh.getRange(2,6,sh.getLastRow()-1,1).setValue(false);return {ok:true,message:'Campanhas encerradas.'};}
function tacsReadCampaigns_(){var sh=tacsEnsureCampaigns_(tacsSpreadsheet_()),out=[];if(sh.getLastRow()<2)return out;var rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues(),today=tacsToday_();rows.forEach(function(r){var start=tacsDateValue_(r[3]),days=Math.max(1,Number(r[4]||1)),end=tacsAddDays_(start,days-1),active=tacsBoolean_(r[5])&&(!start||today>=start)&&(!end||today<=end);if(active)out.push({id:String(r[0]),title:String(r[1]),message:String(r[2]),start:start,days:days,end:end,active:true});});return out;}

function tacsGetNurse_(){var sh=tacsEnsureNurse_(tacsSpreadsheet_());if(sh.getLastRow()<2)return {ok:true,dias:[],atualizadoEm:tacsNow_()};var rows=sh.getRange(2,1,sh.getLastRow()-1,6).getValues();rows.sort(function(a,b){return Number(a[0])-Number(b[0]);});return {ok:true,dias:rows.filter(function(r){return r[1];}).map(function(r){return {day:String(r[1]),service:String(r[2]),icon:String(r[3]||''),available:tacsBoolean_(r[4])};}),atualizadoEm:tacsNow_()};}
function tacsSaveNurse_(payloadText){var payload=JSON.parse(String(payloadText||'{}')),days=payload.dias;if(!Array.isArray(days)||days.length!==5)throw new Error('A agenda deve conter cinco dias.');var sh=tacsEnsureNurse_(tacsSpreadsheet_()),rows=days.map(function(x,i){return [i+1,String(x.day||''),String(x.service||''),String(x.icon||''),x.available===true,new Date()];});if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,6).clearContent();sh.getRange(2,1,rows.length,6).setValues(rows);SpreadsheetApp.flush();return {ok:true,message:'Agenda da enfermeira publicada.',dias:days};}

function tacsRewriteModules_(sheet,rows){if(sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,13).clearContent();if(rows.length)sheet.getRange(2,1,rows.length,13).setValues(rows);SpreadsheetApp.flush();}
function tacsEnsureNurse_(ss){var sh=ss.getSheetByName(TACS_SHEET_NURSE)||ss.insertSheet(TACS_SHEET_NURSE);if(sh.getLastRow()===0){sh.getRange(1,1,1,6).setValues([['ORDEM','DIA','ATENDIMENTO','ICONE','DISPONIVEL','ATUALIZADO_EM']]);sh.getRange(2,1,5,6).setValues([[1,'Segunda-feira','Visita','🏠',true,new Date()],[2,'Terça-feira','Pré-natal','🤰',true,new Date()],[3,'Quarta-feira','Folga','❌',false,new Date()],[4,'Quinta-feira','Puericultura - acompanhamento de crianças e adolescentes','👶',true,new Date()],[5,'Sexta-feira','Preventivo','🌸',true,new Date()]])}sh.setFrozenRows(1);return sh;}
function tacsEnsureModules_(ss){var sh=ss.getSheetByName(TACS_SHEET_MODULES)||ss.insertSheet(TACS_SHEET_MODULES);if(sh.getLastRow()===0)sh.getRange(1,1,1,13).setValues([['MODULO','ORDEM','DIA','ATIVO','DATA','HORARIO','SITUACAO','MENSAGEM','ENCERRA_12H','VAGAS_COMUNS','VAGAS_EMERGENCIAIS','DIA_EXTRA','ATUALIZADO_EM']]);sh.setFrozenRows(1);return sh;}
function tacsEnsureNotices_(ss){var sh=ss.getSheetByName(TACS_SHEET_NOTICES)||ss.insertSheet(TACS_SHEET_NOTICES);if(sh.getLastRow()===0)sh.getRange(1,1,1,7).setValues([['ID','TITULO','MENSAGEM','PRIORIDADE','VALIDADE','ATIVO','ATUALIZADO_EM']]);sh.setFrozenRows(1);return sh;}
function tacsEnsureCampaigns_(ss){var sh=ss.getSheetByName(TACS_SHEET_CAMPAIGNS)||ss.insertSheet(TACS_SHEET_CAMPAIGNS);if(sh.getLastRow()===0)sh.getRange(1,1,1,7).setValues([['ID','TITULO','MENSAGEM','INICIO','DIAS','ATIVO','ATUALIZADO_EM']]);sh.setFrozenRows(1);return sh;}
function tacsEnsureDentalReservations_(ss){var sh=ss.getSheetByName(TACS_SHEET_DENTAL_RESERVATIONS)||ss.insertSheet(TACS_SHEET_DENTAL_RESERVATIONS);if(sh.getLastRow()===0)sh.getRange(1,1,1,6).setValues([['CODIGO_SOLICITACAO','REGISTRADA_EM','DATA_CONSULTA','TIPO_VAGA','SITUACAO','VAGAS_RESTANTES']]);sh.setFrozenRows(1);return sh;}

function tacsValidateKey_(e){var saved=String(tacsConfig_('CHAVE_ADMIN')||'').trim();if(!saved)return;var given=String((e&&e.parameter&&e.parameter.adminKey)||'').trim();if(saved!==given)throw new Error('Chave administrativa inválida.');}
function tacsConfig_(key){var sh=tacsSpreadsheet_().getSheetByName(TACS_SHEET_CONFIG);if(!sh||sh.getLastRow()<2)return '';var rows=sh.getRange(2,1,sh.getLastRow()-1,2).getValues();for(var i=0;i<rows.length;i++)if(String(rows[i][0]).trim()===key)return rows[i][1];return '';}
function tacsReply_(data,callback){var json=JSON.stringify(data);if(callback&&/^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(callback))return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function tacsModuleKey_(value){var text=String(value||'').trim().toLowerCase();if(text==='dentista'||text==='odontologia')return 'odontologia';if(text==='medica'||text==='médica')return 'medica';if(text==='enfermeira')return 'enfermeira';if(text==='nutricionista')return 'nutricionista';return text;}
function tacsStoredModuleName_(module){if(module==='odontologia')return 'DENTISTA';if(module==='medica')return 'MEDICA';if(module==='enfermeira')return 'ENFERMEIRA';if(module==='nutricionista')return 'NUTRICIONISTA';return String(module||'').toUpperCase();}
function tacsBoolean_(value){return value===true||String(value).trim().toLowerCase()==='true';}
function tacsNonNegative_(value){var number=Number(value);return Number.isFinite(number)&&number>=0?Math.floor(number):0;}
function tacsRequiredNonNegative_(value,label){var number=Number(value);if(!Number.isInteger(number)||number<0)throw new Error(label+' deve ser um número inteiro igual ou maior que zero.');return number;}
function tacsNow_(){return Utilities.formatDate(new Date(),TACS_TZ,'dd/MM/yyyy HH:mm');}
function tacsToday_(){return Utilities.formatDate(new Date(),TACS_TZ,'yyyy-MM-dd');}
function tacsDateKey_(value){if(!value)return '';if(Object.prototype.toString.call(value)==='[object Date]'){if(isNaN(value.getTime()))return '';return Utilities.formatDate(value,TACS_TZ,'yyyy-MM-dd');}var text=String(value).trim(),m=text.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return tacsValidDateKey_(Number(m[1]),Number(m[2]),Number(m[3]));m=text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);return m?tacsValidDateKey_(Number(m[3]),Number(m[2]),Number(m[1])):'';}
function tacsValidDateKey_(y,m,d){var date=new Date(Date.UTC(y,m-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return '';return String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
function tacsDateValue_(value){return tacsDateKey_(value);}
function tacsWeekdayName_(key){var p=key.split('-').map(Number),day=new Date(Date.UTC(p[0],p[1]-1,p[2])).getUTCDay();return ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'][day];}
function tacsAddDays_(iso,days){if(!iso)return '';var p=iso.split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2]));d.setUTCDate(d.getUTCDate()+Number(days||0));return Utilities.formatDate(d,TACS_TZ,'yyyy-MM-dd');}
function tacsClosedAtNoon_(dateValue,close){if(close!==true)return false;var iso=tacsDateValue_(dateValue);if(iso!==tacsToday_())return false;return Number(Utilities.formatDate(new Date(),TACS_TZ,'HH'))>=12;}
