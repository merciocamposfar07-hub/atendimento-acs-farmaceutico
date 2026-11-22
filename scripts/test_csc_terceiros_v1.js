'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const backend=fs.readFileSync(path.join(root,'apps-script/ZZZZ_56_SolicitacaoTerceirosMoradorV1.gs'),'utf8');
const frontend=fs.readFileSync(path.join(root,'csc-solicitacao-terceiros-v1.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const build=fs.readFileSync(path.join(root,'scripts/build_apps_script_release.js'),'utf8');
new vm.Script(backend,{filename:'ZZZZ_56_SolicitacaoTerceirosMoradorV1.gs'});
new vm.Script(frontend,{filename:'csc-solicitacao-terceiros-v1.js'});
assert.match(html,/csc-solicitacao-terceiros-v1\.js/);
assert.match(html,/csc-solicitacao-terceiros-v1\.css/);
assert.match(build,/ZZZZ_56_SolicitacaoTerceirosMoradorV1\.gs/);
assert.match(html,/CSC_TERCEIROS_ENABLED=false/);
assert.match(frontend,/CSC_TERCEIROS_ENABLED!==true/);
for (const script of ['moradores-autofill.js','portal-identificacao-familia-v1.js','portal-solicitacoes-ubs-v1.js','conecta-morador-session-v1.js']) {
 assert.ok ? assert.ok(html.includes(script)) : assert.match(html,new RegExp(script.replace(/[.*+?^${}()|[\]\\]/g,'\\assert.match(build,/ZZZZ_56_SolicitacaoTerceirosMoradorV1\.gs/);')));
}
assert.doesNotMatch(backend,/conecta_morador_criar_pin|renderResidentPinCreate/);
assert.doesNotMatch(frontend,/localStorage\.setItem|sessionStorage\.setItem/);
const cache=new Map(),rows=[],issued=new Map();
let tokenSeq=0,pushes=0;
const values=Array(18).fill('');
values[0]='ACCESS-1';values[1]='JAPARANDUBA';values[3]='11144477735';values[4]='Solange Oliveira';values[15]=true;
const fixtures=[
 {chave:'OTHER',family:'002',morador:{nome:'Ana Silva',cpf:'52998224725',cns:'',nascimento:'29/03/1960',endereco:'Sítio Japaranduba',idPortal:'BR02'}},
 {chave:'MISSING',family:'003',morador:{nome:'Maria Souza',cpf:'',cns:'',nascimento:'28/12/1946',endereco:'Sítio Japaranduba',idPortal:'BR03'}},
 {chave:'DUP1',family:'004',morador:{nome:'Joana Alves',cpf:'',cns:'',nascimento:'02/02/1950',endereco:'Sítio Japaranduba',idPortal:'BR04'}},
 {chave:'DUP2',family:'005',morador:{nome:'Marta Alves',cpf:'',cns:'',nascimento:'02/02/1950',endereco:'Sítio Japaranduba',idPortal:'BR05'}},
 {chave:'SELF',family:'001',morador:{nome:'Solange Oliveira',cpf:'11144477735',cns:'',nascimento:'28/12/1984',endereco:'Sítio Japaranduba',idPortal:'BR01'}}
];
const sheet={
 getLastRow:()=>rows.length+1,
 getRange:(line,col)=>({
  setValues:a=>{rows.push(a[0]);},
  setNumberFormat:()=>{},
  setValue:()=>{}
 })
};
const context={
 CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
 TACS_CONECTA_ACESSO_V1:{ACCESS_SHEET:'ACCESS',ACCESS_HEADERS:['ID']},
 TACS_SOLICITACOES_UBS_V1:{FUSO:'America/Recife'},
 conectaAcessoV1Hash_:s=>'hash:'+s,
 conectaAcessoV1Id_:s=>String(s||''),
 conectaAcessoV1Texto_:s=>String(s||''),
 conectaAcessoV1Bool_:Boolean,
 conectaAcessoV1ValidarSessao_:p=>{
  if(p.token==='invalid')throw Error('Sessão inválida');
  return {accessId:'ACCESS-1',areaId:'JAPARANDUBA',cpf:'11144477735'};
 },
 conectaAcessoV1Sheet_:()=>sheet,
 conectaAcessoV1AcessoPorId_:()=>({values}),
 conectaAcessoV1Areas_:()=>[{areaId:'JAPARANDUBA',areaNome:'Japaranduba',unidadeId:'UBS Matias'}],
 conectaAcessoV1NucleoFamiliar_:()=>({familiaId:'001'}),
 conectaAcessoV1RegistrosArea_:()=>fixtures,
 conectaAcessoV1CodigoFamiliaItem_:i=>i.family,
 conectaAcessoV1Nascimento_:s=>s,
 conectaAcessoV1Nome_:s=>String(s).trim().toUpperCase(),
 moradoresAdminV1CpfValido_:s=>/^\d{11}$/.test(s),
 conectaAcessoV1Limitar_:()=>{},
 conectaAcessoV1TokenCache_:(prefix,k,payload)=>{
  const t=prefix+'.'+(++tokenSeq);
  issued.set(t,payload);return t;
 },
 conectaAcessoV1LerTokenCache_:(t,k,prefix)=>{
  if(!t.startsWith(prefix+'.')||!issued.has(t))throw Error('Token inválido');
  return issued.get(t);
 },
 solicitacoesUbsV1Codigo_:s=>String(s),
 solicitacoesUbsV1Sheet_:()=>sheet,
 solicitacoesUbsV1LocalizarCodigo_:(sh,area,code)=>{
  const r=rows.find(x=>x[1]===area&&x[4]===code);
  return r?{data:r}:null;
 },
 solicitacoesUbsV1Id_:()=>('SOL-'+(rows.length+1)),
 solicitacoesUbsV1EnviarPush_:()=>{pushes++;return {push:true,id:'PUSH-1'};},
 identificacaoFamiliarPublicaV1Contexto_:area=>({areaId:area}),
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 SpreadsheetApp:{flush(){}},
 Utilities:{formatDate:()=>('22/11/2026 11:15')},
 conectaAcessoV1ResponderJson_:r=>r,
 conectaAcessoV1ResponderPost_:(id,r)=>({id,result:r})
};
vm.runInNewContext(backend,context,{timeout:2000});
const actor=context.cscTerceirosV1Ator_({token:'valid',areaId:'JAPARANDUBA'});
assert.equal(actor.familiaId,'001');
const one=context.cscTerceirosV1Buscar_({documento:'52998224725'},actor);
assert.equal(one.beneficiario.nome,'Ana Silva');
const needsBirth=context.cscTerceirosV1Buscar_({documento:'39053344705'},actor);
assert.equal(needsBirth.precisaNascimento,true);
const byBirth=context.cscTerceirosV1Buscar_({documento:'39053344705',nascimento:'28/12/1946'},actor);
assert.equal(byBirth.beneficiario.nome,'Maria Souza');
assert.equal(byBirth.beneficiario.documentoPendente,true);
const dup=context.cscTerceirosV1Buscar_({documento:'39053344705',nascimento:'02/02/1950'},actor);
assert.equal(dup.precisaNome,true);
const resolved=context.cscTerceirosV1Buscar_({documento:'39053344705',nascimento:'02/02/1950',nome:'Joana Alves'},actor);
assert.equal(resolved.beneficiario.nome,'Joana Alves');
assert.throws(()=>context.cscTerceirosV1Buscar_({documento:'11144477735'},actor),/já pertence à sua família/);
assert.throws(()=>context.cscTerceirosV1Ator_({token:'invalid',areaId:'JAPARANDUBA'}),/Sessão inválida/);
assert.throws(()=>context.cscTerceirosV1Ator_({token:'valid',areaId:'OUTRA_AREA'}),/exclusivo/);
const request={
 selecaoToken:byBirth.selecaoToken,autorizado:'SIM',codigoSolicitacao:'CSC-T-ABC123',
 categoria:'Solicitar consulta Médica',descricao:'Precisa de consulta com a médica',
 tacsResponsavel:'TACS Japaranduba',unidadeNome:'Unidade de Saúde Posto Matias'
};
assert.throws(()=>context.cscTerceirosV1Enviar_({...request,autorizado:'NAO'},actor),/Confirme/);
const sent=context.cscTerceirosV1Enviar_(request,actor);
assert.equal(sent.ok,true);
assert.equal(sent.reservaConfirmada,false);
assert.equal(rows.length,1);
assert.equal(rows[0][1],'JAPARANDUBA');
assert.equal(rows[0][6],'Maria Souza');
assert.equal(rows[0][10],'003');
assert.match(rows[0][12],/Solange Oliveira/);
assert.match(rows[0][12],/SEM RESERVA AUTOMÁTICA/);
assert.equal(pushes,1);
const repeated=context.cscTerceirosV1Enviar_(request,actor);
assert.equal(repeated.duplicada,true);
assert.equal(repeated.beneficiario.nome,'Maria Souza');
assert.equal(repeated.solicitante.nome,'Solange Oliveira');
assert.equal(rows.length,1);
console.log('CSC terceiros: sintaxe, login, família distinta, CPF existente/ausente, nascimento, ambiguidade, consentimento, UBS e idempotência: OK');
