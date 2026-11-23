'use strict';
/* Aplicação cirúrgica na cópia real do Apps Script, sem substituir outros módulos. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=process.env.LIVE_DIR;
if(!dir||!fs.existsSync(path.join(dir,'appsscript.json')))throw Error('Cópia real do Apps Script indisponível.');
const root=path.resolve(__dirname,'..');
const file=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const required=[
 {marker:/\bvar\s+PUBLICO_AGENDAS_PORTAL_V1\s*=\s*Object\.freeze\s*\(/,file:'apps-script/ZZ_12_PublicoAgendasPortalV1.gs',type:'public'},
 {marker:/\bvar\s+TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1\s*=\s*Object\.freeze\s*\(/,file:'apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs',type:'admin'}
];
const names=fs.readdirSync(dir).filter(n=>/\.(gs|js)$/.test(n)),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const originalHashes=new Map(names.map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
function once(s,before,after,label){
 const old=(s.split(before).length-1),current=(s.split(after).length-1);
 if(current===1&&after!==before&&after.includes(before))return s;
 if(old===1)return s.replace(before,after);
 if(old===0&&current===1)return s;
 throw Error('Trecho não reconhecido na produção: '+label+' (antes='+old+',depois='+current+'). Nenhuma publicação parcial permitida.');
}
function block(source,start,end,label){
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 if(i<0||j<0||source.indexOf(start,i+start.length)!==-1)throw Error('Fonte ambígua: '+label);
 return source.slice(i,j);
}
function applyPublic(live,source){
 live=once(live,
  "var dataSemanal = modulo !== 'odontologia' && typeof agendasProfissionaisTerritoriaisV1DataSemanal_ === 'function'",
  "var dataSemanal = modulo !== 'odontologia' && modulo !== 'medica' && typeof agendasProfissionaisTerritoriaisV1DataSemanal_ === 'function'",'data médica fixa');
 const doctor=block(source,'    var medicaAutorizada = modulo !==','    var odontologiaAutorizada = modulo !==','autorização médica');
 live=once(live,"    var odontologiaAutorizada = modulo !== 'odontologia' || (",doctor+"    var odontologiaAutorizada = modulo !== 'odontologia' || (",'marca de publicação médica');
 live=once(live,'active: odontologiaAutorizada && publicoAgendasV1Booleano_(',
  'active: odontologiaAutorizada && medicaAutorizada && publicoAgendasV1Booleano_(','data e autorização');
 live=once(live,"      closeAt: encerraHorario,\n      common:",
  "      closeAt: encerraHorario,\n      manualPublished: modulo === 'medica' ? medicaAutorizada : undefined,\n      common:",'publicação na API');
 live=once(live,'closedNow: !odontologiaAutorizada || publicoAgendasV1EncerradoAgora_(dataPublicada, encerraHorario, modulo),',
  'closedNow: !odontologiaAutorizada || !medicaAutorizada || publicoAgendasV1EncerradoAgora_(dataPublicada, encerraHorario, modulo),','expiração da vaga');
 live=once(live,"odontoPublicadaData: indice(['ODONTO_PUBLICADA_DATA'], false),",
  "odontoPublicadaData: indice(['ODONTO_PUBLICADA_DATA'], false),\n    medicaPublicadaData: indice(['MEDICA_PUBLICADA_DATA'], false),",'coluna pública');
 return live;
}
function applyAdmin(live,source){
 live=once(live,
 "if(idxModulo>=0&&agendasProfissionaisTerritoriaisV1Modulo_(modulos[i][0])==='odontologia')continue;",
 "if(idxModulo>=0&&['odontologia','medica'].indexOf(agendasProfissionaisTerritoriaisV1Modulo_(modulos[i][0]))!==-1)continue;",'sem repetição semanal da médica');
 const schema=block(source,"  if(nome===TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS&&headers.indexOf('MEDICA_PUBLICADA_DATA')","   if(nome===TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS&&headers.indexOf('ODONTO_PUBLICADA_DATA')",'coluna de publicação médica');
 const startTable=live.indexOf('function agendasProfissionaisTerritoriaisV1Tabela_(');
 const endTable=live.indexOf('\n}',startTable);
 const valuePos=live.indexOf('var valores=',startTable);
 if(startTable<0||endTable<0||valuePos<=startTable||valuePos>=endTable)throw Error('Tabela de agendas incompatível na produção');
 const tableSection=live.slice(startTable,endTable);
 if(!tableSection.includes("headers.indexOf('MEDICA_PUBLICADA_DATA')")){
  const lineStart=live.lastIndexOf('\n',valuePos)+1;
  live=live.slice(0,lineStart)+schema+live.slice(lineStart);
 }
 const saveOld="    var odontologia=agendasProfissionaisTerritoriaisV1Modulo_(p.modulo)==='odontologia';\n    var dataOdonto=";
 const doctorBlock=block(source,
 "    var odontologia=agendasProfissionaisTerritoriaisV1Modulo_(p.modulo)==='odontologia';",
 "    var dataOdonto=",'validação médica antes de salvar');
 live=once(live,saveOld,doctorBlock+"    var dataOdonto=",'publicação manual obrigatória');
 live=once(live,
 "    if(odontologia)camposAgenda.ODONTO_PUBLICADA_DATA=publicarOdonto?dataOdonto:'';",
 "    if(odontologia)camposAgenda.ODONTO_PUBLICADA_DATA=publicarOdonto?dataOdonto:'';\n    if(medica)camposAgenda.MEDICA_PUBLICADA_DATA=publicarMedica?dataMedica:'';",'gravar autorização por data');
 return live;
}
const found=required.map(item=>{
 const matches=names.filter(name=>item.marker.test(fs.readFileSync(path.join(dir,name),'utf8')));
 if(matches.length!==1)throw Error('Não foi possível identificar um único arquivo '+item.type);
 return {...item,name:matches[0]};
});
if(found[0].name===found[1].name)throw Error('Os dois módulos não podem estar no mesmo arquivo na cópia real.');
const edited=[];
for(const item of found){
 const filename=path.join(dir,item.name),before=fs.readFileSync(filename,'utf8');
 const source=file(item.file);
 const after=item.type==='public'?applyPublic(before,source):applyAdmin(before,source);
 if(after===before)throw Error('O arquivo de '+item.type+' já contém as correções; publicação redundante cancelada.');
 new (require('node:vm').Script)(after,{filename:item.name});
 edited.push([filename,after,item.name]);
}
for(const [filename,after] of edited)fs.writeFileSync(filename,after,'utf8');
for(const name of names){
 const nowHash=hash(fs.readFileSync(path.join(dir,name)));
 if(!edited.some(e=>e[2]===name)&&nowHash!==originalHashes.get(name))throw Error('Outro módulo foi modificado: '+name);
}
console.log('CSC_MEDICA_PATCH_SELETIVO_OK '+edited.map(e=>e[2]).join(', '));
