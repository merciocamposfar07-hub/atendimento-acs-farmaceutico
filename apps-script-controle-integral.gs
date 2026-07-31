/*
 * BACKEND INTEGRAL — PAINEL ADMINISTRATIVO DO PORTAL TACS
 * Substitui o conteúdo do Apps Script administrativo atual.
 * Depois de colar, execute configurarControleIntegralTacs() uma vez e publique uma nova versão do aplicativo da Web.
 */
var TACS_SHEET_NURSE='AGENDA_ENFERMEIRA';
var TACS_SHEET_MODULES='PAINEL_PROFISSIONAIS';
var TACS_SHEET_NOTICES='RECADOS_PORTAL';
var TACS_SHEET_CAMPAIGNS='CAMPANHAS_PORTAL';
var TACS_SHEET_CONFIG='CONFIGURACOES';
var TACS_TZ='America/Recife';

function doGet(e){
  var action=String((e&&e.parameter&&e.parameter.action)||'painel_publico').trim();
  var callback=String((e&&e.parameter&&e.parameter.callback)||'').trim();
  var data;
  try{
    if(action==='agenda_enfermeira')data=tacsGetNurse_();
    else if(action==='painel_publico')data=tacsGetPublic_();
    else if(action==='status')data={ok:true,sistema:'Portal TACS integral',atualizadoEm:tacsNow_()};
    else data={ok:false,message:'Ação não reconhecida.'};
  }catch(error){data={ok:false,message:error&&error.message?error.message:String(error)}}
  return tacsReply_(data,callback);
}

function doPost(e){
  var action=String((e&&e.parameter&&e.parameter.action)||'').trim();
  var nonce=String((e&&e.parameter&&e.parameter.nonce)||'');
  var result;
  try{
    tacsValidateKey_(e);
    if(action==='salvar_agenda_enfermeira')result=tacsSaveNurse_(e.parameter.payload);
    else if(action==='salvar_modulo')result=tacsSaveModule_(e.parameter.payload);
    else if(action==='salvar_recado')result=tacsSaveNotice_(e.parameter.payload);
    else if(action==='cancelar_recados')result=tacsCancelNotices_();
    else if(action==='salvar_campanha')result=tacsSaveCampaign_(e.parameter.payload);
    else if(action==='cancelar_campanhas')result=tacsCancelCampaigns_();
    else result={ok:false,message:'Ação não reconhecida.'};
  }catch(error){result={ok:false,message:error&&error.message?error.message:String(error)}}
  var message={source:'painel-tacs-integral',nonce:nonce,result:result};
  var safeMessage=JSON.stringify(message).replace(/</g,'\\u003c').replace(/-->/g,'--\\>');
  return HtmlService
    .createHtmlOutput('<!doctype html><meta charset="utf-8"><script>parent.postMessage('+safeMessage+',"*");<\/script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function configurarControleIntegralTacs(){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  tacsEnsureNurse_(ss);
  tacsEnsureModules_(ss);
  tacsEnsureNotices_(ss);
  tacsEnsureCampaigns_(ss);
  var config=ss.getSheetByName(TACS_SHEET_CONFIG)||ss.insertSheet(TACS_SHEET_CONFIG);
  if(config.getLastRow()===0){config.getRange(1,1,1,2).setValues([['CHAVE','VALOR']]);config.getRange(2,1,1,2).setValues([['CHAVE_ADMIN',Utilities.getUuid().replace(/-/g,'').slice(0,20).toUpperCase()]])}
  config.setFrozenRows(1);config.autoResizeColumns(1,2);
  return {ok:true,message:'Controle integral configurado.',chaveAdmin:tacsConfig_('CHAVE_ADMIN')};
}

function tacsGetPublic_(){
  var modules=tacsReadModules_();
  var notices=tacsReadNotices_();
  var campaigns=tacsReadCampaigns_();
  return {ok:true,atualizadoEm:tacsNow_(),modules:modules,recados:notices,campanhas:campaigns};
}

function tacsSaveModule_(payloadText){
  var payload=JSON.parse(String(payloadText||'{}'));
  var module=String(payload.module||'').trim();
  var days=Array.isArray(payload.days)?payload.days:[];
  if(['medica','nutricionista'].indexOf(module)<0)throw new Error('Módulo inválido.');
  if(days.length!==5)throw new Error('O módulo deve conter os cinco dias úteis.');
  var ss=SpreadsheetApp.getActiveSpreadsheet();var sh=tacsEnsureModules_(ss);
  var all=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,13).getValues():[];
  all=all.filter(function(r){return String(r[0])!==module});
  var now=new Date();
  days.forEach(function(item,index){all.push([
    module,index+1,String(item.day||''),item.active===true,String(item.date||''),String(item.time||''),String(item.status||''),String(item.message||item.service||''),item.closeAtNoon===true,Number(item.common||0),Number(item.emergency||0),item.extra===true,now
  ])});
  if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,13).clearContent();
  if(all.length)sh.getRange(2,1,all.length,13).setValues(all);
  SpreadsheetApp.flush();return {ok:true,message:'Módulo publicado.',module:module,days:days};
}

function tacsReadModules_(){
  var sh=tacsEnsureModules_(SpreadsheetApp.getActiveSpreadsheet());
  var out={medica:[],nutricionista:[]};
  if(sh.getLastRow()<2)return out;
  var rows=sh.getRange(2,1,sh.getLastRow()-1,13).getValues();
  rows.sort(function(a,b){return String(a[0]).localeCompare(String(b[0]))||Number(a[1])-Number(b[1])});
  rows.forEach(function(r){var module=String(r[0]);if(!out[module])return;out[module].push({day:String(r[2]),active:r[3]===true,date:tacsDateValue_(r[4]),time:String(r[5]||''),status:String(r[6]||''),message:String(r[7]||''),service:String(r[7]||''),closeAtNoon:r[8]===true,common:Number(r[9]||0),emergency:Number(r[10]||0),extra:r[11]===true,closedNow:tacsClosedAtNoon_(r[4],r[8])})});
  return out;
}

function tacsSaveNotice_(payloadText){
  var item=JSON.parse(String(payloadText||'{}'));if(!String(item.title||item.message||'').trim())throw new Error('Recado vazio.');
  var sh=tacsEnsureNotices_(SpreadsheetApp.getActiveSpreadsheet());
  sh.appendRow([String(item.id||Utilities.getUuid()),String(item.title||''),String(item.message||''),String(item.priority||'informativo'),String(item.validity||''),true,new Date()]);
  return {ok:true,message:'Recado publicado.'};
}
function tacsCancelNotices_(){var sh=tacsEnsureNotices_(SpreadsheetApp.getActiveSpreadsheet());if(sh.getLastRow()>1)sh.getRange(2,6,sh.getLastRow()-1,1).setValue(false);return {ok:true,message:'Recados retirados.'}}
function tacsReadNotices_(){var sh=tacsEnsureNotices_(SpreadsheetApp.getActiveSpreadsheet()),out=[];if(sh.getLastRow()<2)return out;var rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues(),today=tacsToday_();rows.forEach(function(r){var active=r[5]===true,valid=tacsDateValue_(r[4]);if(valid&&valid<today)active=false;if(active)out.push({id:String(r[0]),title:String(r[1]),message:String(r[2]),priority:String(r[3]||'informativo'),validity:valid,active:true})});return out}

function tacsSaveCampaign_(payloadText){
  var item=JSON.parse(String(payloadText||'{}'));if(!String(item.title||'').trim())throw new Error('Campanha sem nome.');
  var sh=tacsEnsureCampaigns_(SpreadsheetApp.getActiveSpreadsheet());
  sh.appendRow([String(item.id||Utilities.getUuid()),String(item.title||''),String(item.message||''),String(item.start||tacsToday_()),Math.max(1,Number(item.days||1)),true,new Date()]);
  return {ok:true,message:'Campanha publicada.'};
}
function tacsCancelCampaigns_(){var sh=tacsEnsureCampaigns_(SpreadsheetApp.getActiveSpreadsheet());if(sh.getLastRow()>1)sh.getRange(2,6,sh.getLastRow()-1,1).setValue(false);return {ok:true,message:'Campanhas encerradas.'}}
function tacsReadCampaigns_(){var sh=tacsEnsureCampaigns_(SpreadsheetApp.getActiveSpreadsheet()),out=[];if(sh.getLastRow()<2)return out;var rows=sh.getRange(2,1,sh.getLastRow()-1,7).getValues(),today=tacsToday_();rows.forEach(function(r){var start=tacsDateValue_(r[3]),days=Math.max(1,Number(r[4]||1)),end=tacsAddDays_(start,days-1),active=r[5]===true&&(!start||today>=start)&&(!end||today<=end);if(active)out.push({id:String(r[0]),title:String(r[1]),message:String(r[2]),start:start,days:days,end:end,active:true})});return out}

function tacsGetNurse_(){
  var sh=tacsEnsureNurse_(SpreadsheetApp.getActiveSpreadsheet());if(sh.getLastRow()<2)return {ok:true,dias:[],atualizadoEm:tacsNow_()};
  var rows=sh.getRange(2,1,sh.getLastRow()-1,6).getValues();rows.sort(function(a,b){return Number(a[0])-Number(b[0])});
  return {ok:true,dias:rows.filter(function(r){return r[1]}).map(function(r){return {day:String(r[1]),service:String(r[2]),icon:String(r[3]||''),available:r[4]===true}}),atualizadoEm:tacsNow_()};
}
function tacsSaveNurse_(payloadText){
  var payload=JSON.parse(String(payloadText||'{}')),days=payload.dias;if(!Array.isArray(days)||days.length!==5)throw new Error('A agenda deve conter cinco dias.');
  var sh=tacsEnsureNurse_(SpreadsheetApp.getActiveSpreadsheet()),rows=days.map(function(x,i){return [i+1,String(x.day||''),String(x.service||''),String(x.icon||''),x.available===true,new Date()]});
  if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,6).clearContent();sh.getRange(2,1,rows.length,6).setValues(rows);SpreadsheetApp.flush();return {ok:true,message:'Agenda da enfermeira publicada.',dias:days};
}

function tacsEnsureNurse_(ss){var sh=ss.getSheetByName(TACS_SHEET_NURSE)||ss.insertSheet(TACS_SHEET_NURSE);if(sh.getLastRow()===0){sh.getRange(1,1,1,6).setValues([['ORDEM','DIA','ATENDIMENTO','ICONE','DISPONIVEL','ATUALIZADO_EM']]);sh.getRange(2,1,5,6).setValues([[1,'Segunda-feira','Visita','🏠',true,new Date()],[2,'Terça-feira','Pré-natal','🤰',true,new Date()],[3,'Quarta-feira','Folga','❌',false,new Date()],[4,'Quinta-feira','Puericultura - acompanhamento de crianças e adolescentes','👶',true,new Date()],[5,'Sexta-feira','Preventivo','🌸',true,new Date()]])}sh.setFrozenRows(1);return sh}
function tacsEnsureModules_(ss){var sh=ss.getSheetByName(TACS_SHEET_MODULES)||ss.insertSheet(TACS_SHEET_MODULES);if(sh.getLastRow()===0)sh.getRange(1,1,1,13).setValues([['MODULO','ORDEM','DIA','ATIVO','DATA','HORARIO','SITUACAO','MENSAGEM','ENCERRA_12H','VAGAS_COMUNS','VAGAS_EMERGENCIAIS','DIA_EXTRA','ATUALIZADO_EM']]);sh.setFrozenRows(1);return sh}
function tacsEnsureNotices_(ss){var sh=ss.getSheetByName(TACS_SHEET_NOTICES)||ss.insertSheet(TACS_SHEET_NOTICES);if(sh.getLastRow()===0)sh.getRange(1,1,1,7).setValues([['ID','TITULO','MENSAGEM','PRIORIDADE','VALIDADE','ATIVO','ATUALIZADO_EM']]);sh.setFrozenRows(1);return sh}
function tacsEnsureCampaigns_(ss){var sh=ss.getSheetByName(TACS_SHEET_CAMPAIGNS)||ss.insertSheet(TACS_SHEET_CAMPAIGNS);if(sh.getLastRow()===0)sh.getRange(1,1,1,7).setValues([['ID','TITULO','MENSAGEM','INICIO','DIAS','ATIVO','ATUALIZADO_EM']]);sh.setFrozenRows(1);return sh}
function tacsValidateKey_(e){var saved=String(tacsConfig_('CHAVE_ADMIN')||'').trim();if(!saved)return;var given=String((e&&e.parameter&&e.parameter.adminKey)||'').trim();if(saved!==given)throw new Error('Chave administrativa inválida.')}
function tacsConfig_(key){var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TACS_SHEET_CONFIG);if(!sh||sh.getLastRow()<2)return '';var rows=sh.getRange(2,1,sh.getLastRow()-1,2).getValues();for(var i=0;i<rows.length;i++)if(String(rows[i][0]).trim()===key)return rows[i][1];return ''}
function tacsReply_(data,callback){var json=JSON.stringify(data);if(callback&&/^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(callback))return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)}
function tacsNow_(){return Utilities.formatDate(new Date(),TACS_TZ,'dd/MM/yyyy HH:mm')}
function tacsToday_(){return Utilities.formatDate(new Date(),TACS_TZ,'yyyy-MM-dd')}
function tacsDateValue_(value){if(!value)return '';if(Object.prototype.toString.call(value)==='[object Date]')return Utilities.formatDate(value,TACS_TZ,'yyyy-MM-dd');return String(value)}
function tacsAddDays_(iso,days){if(!iso)return '';var p=iso.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2]);d.setDate(d.getDate()+Number(days||0));return Utilities.formatDate(d,TACS_TZ,'yyyy-MM-dd')}
function tacsClosedAtNoon_(dateValue,close){if(close!==true)return false;var iso=tacsDateValue_(dateValue);if(iso!==tacsToday_())return false;return Number(Utilities.formatDate(new Date(),TACS_TZ,'HH'))>=12}
