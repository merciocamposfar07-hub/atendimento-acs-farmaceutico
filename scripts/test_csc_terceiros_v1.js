'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
const backend=read('apps-script/ZZZZ_56_SolicitacaoTerceirosMoradorV1.gs');
const frontend=read('csc-solicitacao-terceiros-v1.js');
const html=read('index.html');
const official=read('portal-solicitacao-card-oficial-v1.js');
new vm.Script(backend);
new vm.Script(frontend);
new vm.Script(official);
assert.match(html,/CSC_TERCEIROS_ENABLED=(?:true|false)/);
assert.match(html,/portal-solicitacao-card-oficial-v1\.js/);
assert.match(frontend,/PortalCscSolicitacaoCardOficialV1/);
assert.match(frontend,/document\.addEventListener\('click',nativeClick,true\)/);
assert.match(frontend,/csc_terceiros_confirmar_cpf/);
assert.match(frontend,/csc_terceiros_membro/);
assert.match(frontend,/restoreOriginal\(\)/);
assert.doesNotMatch(frontend,/(localStorage|sessionStorage)\.setItem\s*\(/);
for(const legacy of ['moradores-autofill.js','portal-identificacao-familia-v1.js','portal-solicitacoes-ubs-v1.js','conecta-morador-session-v1.js'])
 assert(html.includes(legacy),'Arquivo legado mantido: '+legacy);

const reqRows=[],cache=new Map(),tokens=new Map(),audits=[];
const people=[
 {chave:'SELF',family:'001',row:2,morador:{nome:'Solange Oliveira',cpf:'11144477735',cns:'',nascimento:'28/12/1984',endereco:'Sítio Japaranduba',idPortal:'RES-01'}},
 {chave:'OTHER',family:'002',row:3,morador:{nome:'Ana Silva',cpf:'52998224725',cns:'',nascimento:'29/03/1960',endereco:'Sítio Japaranduba',idPortal:'RES-02'}},
 {chave:'SIBLING',family:'002',row:4,morador:{nome:'Pedro Silva',cpf:'',cns:'123456789012345',nascimento:'20/03/1964',endereco:'Sítio Japaranduba',idPortal:'RES-03'}},
 {chave:'NO_DOC',family:'002',row:5,morador:{nome:'Maria de Souza',cpf:'',cns:'',nascimento:'21/04/1966',endereco:'Sítio Japaranduba',idPortal:'RES-04'}},
 {chave:'MISSING',family:'033',row:6,morador:{nome:'Maria Dina de Oliveira Silva',cpf:'',cns:'898000167812426',nascimento:'10/10/1945',endereco:'Sítio Japaranduba',idPortal:'RES-05'}},
 {chave:'DUP1',family:'034',row:7,morador:{nome:'Joana Alves',cpf:'',cns:'',nascimento:'02/02/1950',endereco:'Sítio Japaranduba',idPortal:'RES-06'}},
 {chave:'DUP2',family:'035',row:8,morador:{nome:'Marta Alves',cpf:'',cns:'',nascimento:'02/02/1950',endereco:'Sítio Japaranduba',idPortal:'RES-07'}}
];
const master={getRange:(row,col)=>({
 getDisplayValue:()=>String((people.find(p=>p.row===row)||{}).morador?.cpf||'')
})};
people.forEach(p=>p.fonte={sheet:master,ss:{},map:{cpf:0,ultimaAtualizacao:1}});
const reqSheet={
 getLastRow:()=>reqRows.length+1,
 getRange:()=>({setValues:a=>reqRows.push(a[0]),setNumberFormat(){return this;},setValue(){return this;}})
};
const acc=Array(18).fill('');
acc[0]='ACCESS-1';acc[1]='JAPARANDUBA';acc[2]='SELF';acc[3]='11144477735';acc[4]='Solange Oliveira';acc[15]=true;
let tokenSeq=0,pushes=0;
const ctx={
 CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
 TACS_CONECTA_ACESSO_V1:{ACCESS_SHEET:'ACCESS',ACCESS_HEADERS:['ID']},
 TACS_SOLICITACOES_UBS_V1:{FUSO:'America/Recife'},
 conectaAcessoV1Hash_:v=>'hash'+v,
 conectaAcessoV1Id_:v=>String(v||''),
 conectaAcessoV1Texto_:v=>String(v||''),
 conectaAcessoV1Bool_:Boolean,
 conectaAcessoV1ValidarSessao_:p=>{
  if(p.token==='invalid')throw Error('Sessão inválida');
  return {accessId:'ACCESS-1',areaId:'JAPARANDUBA',cpf:'11144477735'};
 },
 conectaAcessoV1Sheet_:()=>reqSheet,
 conectaAcessoV1AcessoPorId_:()=>({values:acc}),
 conectaAcessoV1Areas_:()=>[{areaId:'JAPARANDUBA',areaNome:'Japaranduba',unidadeId:'UBS Matias',agenteId:'TACS',planilhaId:'SHEET'}],
 conectaAcessoV1RegistrosArea_:()=>people,
 conectaAcessoV1CodigoFamiliaItem_:p=>p.family,
 conectaAcessoV1Nascimento_:v=>v,
 conectaAcessoV1Nome_:v=>String(v).toUpperCase().trim(),
 moradoresAdminV1CpfValido_:v=>/^\d{11}$/.test(v),
 moradoresAdminV1SetCell_:(sheet,row,column,value)=>{
  if(column===0)people.find(p=>p.row===row).morador.cpf=String(value);
 },
 moradoresAdminV1Auditar_:(ss,d,c)=>audits.push({d,c}),
 moradoresAdminV1InvalidarResumo_:()=>{},
 conectaAcessoV1BuscarCpf_:v=>people.filter(p=>p.morador.cpf===v),
 conectaAcessoV1Limitar_:()=>{},
 conectaAcessoV1TokenCache_:(prefix,key,payload)=>{
  const t=prefix+'.'+(++tokenSeq);tokens.set(t,payload);return t;
 },
 conectaAcessoV1LerTokenCache_:(t,key,prefix)=>{
  if(!t.startsWith(prefix+'.')||!tokens.has(t))throw Error('Token inválido');
  return tokens.get(t);
 },
 solicitacoesUbsV1Codigo_:v=>String(v),
 solicitacoesUbsV1Data_:v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'',
 solicitacoesUbsV1Hora_:v=>/^\d\d:\d\d$/.test(v)?v:'',
 solicitacoesUbsV1AgendaCard_:v=>{const m=String(v).match(/(\d\d)\/(\d\d)\/(\d{4})/);return {data:m?m[3]+'-'+m[2]+'-'+m[1]:'',horaFinal:''};},
 solicitacoesUbsV1ExpiraEm_:(d,h)=>d?new Date(d+'T'+(h||'00:00')+':00'):null,
 solicitacoesUbsV1Sheet_:()=>reqSheet,
 solicitacoesUbsV1LocalizarCodigo_:(sh,area,code)=>{const row=reqRows.find(r=>r[1]===area&&r[4]===code);return row?{data:row}:null;},
 solicitacoesUbsV1Id_:()=>('REQ-'+(reqRows.length+1)),
 solicitacoesUbsV1EnviarPush_:()=>{pushes++;return {push:true,id:'PUSH-1'};},
 identificacaoFamiliarPublicaV1Contexto_:area=>({areaId:area}),
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 Utilities:{formatDate:()=>('22/11/2026 14:00')},
 SpreadsheetApp:{flush(){}},
 conectaAcessoV1ResponderJson_:r=>r,
 conectaAcessoV1ResponderPost_:(id,result)=>({id,result})
};
vm.runInNewContext(backend,ctx,{timeout:5000});
const actor=ctx.cscTerceirosV1Ator_({token:'valid',areaId:'JAPARANDUBA'});
assert.equal(actor.familiaId,'001');
assert.throws(()=>ctx.cscTerceirosV1Ator_({token:'invalid'}),/Sessão inválida/);
assert.throws(()=>ctx.cscTerceirosV1Ator_({areaId:'OUTRA'}),/exclusivo/);
const lookup=ctx.cscTerceirosV1Buscar_({documento:'52998224725'},actor);
assert.equal(lookup.beneficiario.nome,'Ana Silva');
assert.equal(lookup.familia.length,3);
assert.equal(lookup.familia.find(m=>m.nome==='Maria de Souza').temDocumento,false);
const sibling=ctx.cscTerceirosV1EscolherMembro_({membroToken:lookup.familia.find(m=>m.nome==='Pedro Silva').membroToken},actor);
assert.equal(sibling.beneficiario.nome,'Pedro Silva');
assert.throws(()=>ctx.cscTerceirosV1EscolherMembro_({membroToken:lookup.familia.find(m=>m.nome==='Maria de Souza').membroToken},actor),/sem CPF nem Cartão SUS|sem CPF\/CNS/);
assert.equal(ctx.cscTerceirosV1Buscar_({documento:'39053344705'},actor).precisaNascimento,true);
const toConfirm=ctx.cscTerceirosV1Buscar_({documento:'39053344705',nascimento:'10/10/1945'},actor);
assert.equal(toConfirm.confirmaCpf,true);
assert.equal(people[4].morador.cpf,'');
assert.throws(()=>ctx.cscTerceirosV1ConfirmarCpf_({confirmacaoToken:toConfirm.confirmacaoToken,confirmado:'NAO'},actor),/Confirme/);
const confirmed=ctx.cscTerceirosV1ConfirmarCpf_({confirmacaoToken:toConfirm.confirmacaoToken,confirmado:'SIM'},actor);
assert.equal(confirmed.cpfSalvo,true);
assert.equal(people[4].morador.cpf,'39053344705');
assert.equal(audits.length,1);
assert.equal(audits[0].d.acao,'VINCULAR_CPF_SOLICITACAO_TERCEIROS');
const foundAgain=ctx.cscTerceirosV1Buscar_({documento:'39053344705'},actor);
assert.equal(foundAgain.beneficiario.nome,'Maria Dina de Oliveira Silva');
assert.equal(foundAgain.confirmaCpf,undefined);
assert.throws(()=>ctx.cscTerceirosV1Buscar_({documento:'11144477735'},actor),/já pertence à sua família/);
const ambiguous=ctx.cscTerceirosV1Buscar_({documento:'12312312312',nascimento:'02/02/1950'},actor);
assert.equal(ambiguous.precisaNome,true);
const request={selecaoToken:foundAgain.selecaoToken,autorizado:'SIM',documento:'39053344705',
 codigoSolicitacao:'CSC-T-001',categoria:'Solicitar consulta Médica',descricao:'Consulta médica para sexta-feira',
 dataServico:'2026-12-04',horarioExpiracao:'15:30',tipoVaga:'AGENDADA',
 tacsResponsavel:'TACS',unidadeNome:'Posto Matias'};
assert.throws(()=>ctx.cscTerceirosV1Enviar_({...request,documento:'52998224725'},actor),/Beneficiário mudou/);
assert.throws(()=>ctx.cscTerceirosV1Enviar_({...request,autorizado:'NAO'},actor),/Confirme/);
const sent=ctx.cscTerceirosV1Enviar_(request,actor);
assert.equal(sent.ok,true);
assert.equal(reqRows.length,1);
assert.equal(reqRows[0][6],'Maria Dina de Oliveira Silva');
assert.equal(reqRows[0][13],'AGENDADA');
assert.equal(reqRows[0][14],'2026-12-04');
assert.equal(reqRows[0][15],'15:30');
assert.match(reqRows[0][12],/Solange Oliveira/);
assert.equal(pushes,1);
const again=ctx.cscTerceirosV1Enviar_(request,actor);
assert.equal(again.duplicada,true);
assert.equal(reqRows.length,1);
const collision={...request,selecaoToken:lookup.selecaoToken,documento:'52998224725'};
assert.throws(()=>ctx.cscTerceirosV1Enviar_(collision,actor),/outra solicitação/);
assert.equal(reqRows.length,1,'Código de um morador não pode ser usado para outro');
assert.match(official,/block\('CPF ou CNS',formatDocument\(data.document\)/);
console.log('CSC terceiros: proteção de identidade por solicitação, CPF/CNS e UBS: OK');
