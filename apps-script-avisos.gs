/*
 * GOOGLE APPS SCRIPT — AVISOS DA UNIDADE DE SAÚDE POSTO MATIAS
 *
 * 1. Crie uma Planilha Google vazia.
 * 2. Abra Extensões > Apps Script.
 * 3. Cole este código e salve.
 * 4. Implante como Aplicativo da Web:
 *    - Executar como: você
 *    - Quem pode acessar: qualquer pessoa
 * 5. Copie o endereço terminado em /exec para POSTO_MATIAS_AVISOS_API_URL no arquivo agenda-config.js.
 */

const SHEET_NAME = 'Avisos';

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'avisos');
  if (action !== 'avisos') return jsonp_(e, {ok:false, message:'Ação inválida'});
  return jsonp_(e, readNotices_());
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.action !== 'publicarAvisos') return text_({ok:false, message:'Ação inválida'});
    saveNotices_(data);
    return text_({ok:true});
  } catch (error) {
    return text_({ok:false, message:String(error && error.message || error)});
  }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1,1,2,12).setValues([
      ['atualizadoEm','unidade','area','medicalStatus','medicalDate','medicalTime','medicalNote','priority','validity','title','message','active'],
      ['', 'Unidade de Saúde Posto Matias','Sítio Japaranduba','aguardando','','','','informativo','','','',true]
    ]);
  }
  return sh;
}

function saveNotices_(data) {
  const sh = sheet_();
  const now = Utilities.formatDate(new Date(), 'America/Recife', "dd/MM/yyyy 'às' HH:mm");
  sh.getRange(2,1,1,12).setValues([[
    now,
    data.unidade || 'Unidade de Saúde Posto Matias',
    data.area || 'Sítio Japaranduba',
    data.medicalStatus || 'aguardando',
    data.medicalDate || '',
    data.medicalTime || '',
    data.medicalNote || '',
    data.priority || 'informativo',
    data.validity || '',
    data.title || '',
    data.message || '',
    true
  ]]);
}

function readNotices_() {
  const values = sheet_().getRange(2,1,1,12).getValues()[0];
  const [updated, unit, area, medicalStatus, medicalDate, medicalTime, medicalNote, priority, validity, title, message, active] = values;
  const notices = title || message ? [{
    id:'aviso-atual', ativo:active !== false, prioridade:priority || 'informativo',
    titulo:title || 'Aviso', mensagem:message || '', validade:formatDate_(validity)
  }] : [];
  return {
    ok:true,
    atualizadoEm:updated || '',
    unidade:unit || 'Unidade de Saúde Posto Matias',
    area:area || 'Sítio Japaranduba',
    atendimentoMedico:{
      ativo:Boolean(medicalDate || medicalTime || medicalNote),
      situacao:medicalStatus || 'aguardando',
      titulo:'Atendimento médico',
      data:medicalDate || '',
      horario:medicalTime || '',
      observacao:medicalNote || ''
    },
    avisos:notices
  };
}

function formatDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, 'America/Recife', 'yyyy-MM-dd');
  }
  return String(value);
}

function jsonp_(e, data) {
  const callback = String((e && e.parameter && e.parameter.callback) || '').replace(/[^A-Za-z0-9_.$]/g,'');
  const body = callback ? callback + '(' + JSON.stringify(data) + ');' : JSON.stringify(data);
  return ContentService.createTextOutput(body).setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function text_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
