'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pub=read('apps-script/ZZ_12_PublicoAgendasPortalV1.gs'),back=read('apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs');
const ui=read('agenda-enfermeira.js'),admin=read('conecta-agendas-native-v1.js');
new vm.Script(pub);new vm.Script(back);new vm.Script(ui);new vm.Script(admin);
const rows=[
 ['MODULO','ORDEM','DIA','ATIVO','DATA','HORARIO','SITUACAO','MENSAGEM','ENCERRA_12H','VAGAS_COMUNS','VAGAS_EMERGENCIAIS','DIA_EXTRA','AREA_ID','ENCERRA_HORARIO','MEDICA_PUBLICADA_DATA'],
 ['MEDICA',1,'Segunda-feira',true,'2026-11-16','08:00 as 11:30','ATENDIMENTO','Atendimento médico',true,10,0,false,'JAPARANDUBA','12:00','2026-11-16'],
 ['NUTRICIONISTA',1,'Segunda-feira',true,'2026-11-16','08:00 as 11:30','ATENDIMENTO','Nutrição',false,10,0,false,'JAPARANDUBA','12:00','']
];
const sheet={
 getName:()=> 'PAINEL_PROFISSIONAIS',
 getLastRow:()=>rows.length,
 getLastColumn:()=>rows[0].length,
 getRange:(r,c,rc,cc)=>{
  const selected=rows.slice(r-1,r-1+rc).map(a=>a.slice(c-1,c-1+cc));
  return {getValues:()=>selected,getDisplayValues:()=>selected.map(a=>a.map(String))};
 }
};
let now='2026-11-16T14:59:00Z';
function formatted(_date,tz,fmt){
 const p={};
 new Intl.DateTimeFormat('en-US',{timeZone:tz||'America/Recife',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).forEach(x=>p[x.type]=x.value);
 if(fmt==='yyyy-MM-dd')return p.year+'-'+p.month+'-'+p.day;
 if(fmt==='HH:mm')return p.hour+':'+p.minute;
 return p.day+'/'+p.month+'/'+p.year+' '+p.hour+':'+p.minute;
}
const spreadsheet={getSheets:()=>[sheet],getSheetByName:()=>null};
const context={
 console,Date,JSON,Number,String,Math,Object,Array,Utilities:{formatDate:formatted},
 adminTacsV1Planilha_:()=>spreadsheet,
 SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet},
 ContentService:{MimeType:{JAVASCRIPT:'js',JSON:'json'},createTextOutput:()=>({setMimeType(){return this}})},
 agendasProfissionaisTerritoriaisV1DataSemanal_:()=> '2026-11-23'
};
vm.createContext(context);vm.runInContext(pub,context);
function doctor(){return context.publicoAgendasV1Montar_('JAPARANDUBA').modules.medica[0]}
let d=doctor();
assert.equal(d.date,'2026-11-16','Data médica deve ser imutável entre as semanas');
assert.equal(d.active,true);assert.equal(d.closedNow,false);assert.equal(d.manualPublished,true);
assert.equal(context.publicoAgendasV1Montar_().modules.nutricionista[0].date,'2026-11-23','Outras agendas seguem inalteradas');
now='2026-11-16T15:00:00Z';
assert.equal(doctor().closedNow,true,'A expiração deve valer exatamente às 12:00 em Recife');
now='2026-11-23T14:24:00Z';
assert.equal(doctor().closedNow,true,'Não pode reabrir automaticamente na segunda-feira seguinte');
rows[1][4]='2026-11-23';
d=doctor();
assert.equal(d.active,false,'A data nova sem publicação manual deve permanecer fechada');
assert.equal(d.closedNow,true);
assert.equal(d.manualPublished,false);
rows[1][14]='2026-11-23';
d=doctor();
assert.equal(d.active,true,'Apenas a publicação manual da data nova reabre vagas');
assert.equal(d.closedNow,false);
now='2026-11-23T15:00:00Z';
assert.equal(doctor().closedNow,true,'Expiração da nova data também é exata');
rows[1][14]='';assert.equal(doctor().active,false,'Sem marcador de publicação, fechar preventivamente');
assert.match(back,/\['odontologia','medica'\]\.indexOf\(agendasProfissionaisTerritoriaisV1Modulo_/);
assert.match(back,/MEDICA_PUBLICADA_DATA=publicarMedica\?dataMedica:''/);
assert.match(back,/p\.publicacaoMedica/,'Publicação precisa de confirmação manual');
assert.match(admin,/function medicaVigente\(a\)/);
assert.match(admin,/publicacaoMedica:ehMedica/);
assert.match(ui,/module !== 'medica' \|\| item\.manualPublished === true/);
assert.match(ui,/refreshExpiredAgendas\('medica'\);\},1000/);
console.log('AGENDA_MEDICA_EXPIRACAO_MANUAL_OK: 16/11 11:59, 16/11 12:00, 23/11 sem republicacao, 23/11 apos republicacao, outras agendas preservadas');
