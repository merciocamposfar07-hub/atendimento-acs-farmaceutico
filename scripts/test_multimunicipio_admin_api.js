'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'apps-script/ZZZZ_33_MultimunicipioAdminApiV1.gs'),'utf8');
const build=fs.readFileSync(path.join(ROOT,'scripts/build_apps_script_release.js'),'utf8');
const cache=new Map();
let perfil='ADMIN_GERAL';
let lastMutation='';
const sandbox={
  CacheService:{getScriptCache(){return{put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)||null};}},
  ContentService:{MimeType:{JAVASCRIPT:'js',JSON:'json'},createTextOutput(text){return{text,setMimeType(){return this;}};}},
  HtmlService:{XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput(html){return{html,setXFrameOptionsMode(){return this;}};}},
  tacsTerritorioV1ValidarAcesso_:()=>({perfil,operadorId:perfil==='ADMIN_GERAL'?'ADMIN_GERAL':'TACS_1',areaId:'AREA_A'}),
  tacsOrganizacoesMunicipiosV1ExigirAdminGeral_:acesso=>{if(!acesso||acesso.perfil!=='ADMIN_GERAL')throw new Error('Somente o administrador geral pode alterar organizações, municípios e vínculos territoriais.');},
  tacsOrganizacoesMunicipiosV1DadosAdmin_:acesso=>({ok:true,versao:'1.1.0',perfil:acesso.perfil,catalogo:{organizacoes:[],municipios:[],areas:{}},areas:[]}),
  tacsOrganizacoesMunicipiosV1SalvarOrganizacao_:(body)=>{lastMutation='organizacao:'+body.organizacaoId;},
  tacsOrganizacoesMunicipiosV1SalvarMunicipio_:(body)=>{lastMutation='municipio:'+body.municipioId;},
  tacsOrganizacoesMunicipiosV1VincularArea_:(area,mun)=>{lastMutation='area:'+area+'>'+mun;},
  console
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);

assert.equal(sandbox.TACS_MULTIMUNICIPIO_ADMIN_API_V1.VERSAO,'1.0.0');
assert.match(build,/ZZZZ_33_MultimunicipioAdminApiV1\.gs/);
assert.match(build,/TACS_MULTIMUNICIPIO_ADMIN_API_V1/);
assert.match(source,/admin_multimunicipio_dados/);
assert.match(source,/admin_multimunicipio_salvar_organizacao/);
assert.match(source,/admin_multimunicipio_salvar_municipio/);
assert.match(source,/admin_multimunicipio_vincular_area/);

let resposta=sandbox.tacsMultimunicipioAdminApiV1TratarPost_({parameter:{action:'admin_multimunicipio_dados',token:'admin',requestId:'request_admin_001'}});
assert.match(resposta.html,/"ok":true/);
assert.equal(JSON.parse(cache.get('tacs_multimunicipio_admin_v1_result_request_admin_001')).ok,true);

sandbox.tacsMultimunicipioAdminApiV1TratarPost_({parameter:{action:'admin_multimunicipio_salvar_organizacao',token:'admin',requestId:'request_admin_002',payload:JSON.stringify({organizacaoId:'ORG_X',nome:'Org X',ativa:true})}});
assert.equal(lastMutation,'organizacao:ORG_X');
sandbox.tacsMultimunicipioAdminApiV1TratarPost_({parameter:{action:'admin_multimunicipio_salvar_municipio',token:'admin',requestId:'request_admin_003',payload:JSON.stringify({municipioId:'MUN_X',organizacaoId:'ORG_X'})}});
assert.equal(lastMutation,'municipio:MUN_X');
sandbox.tacsMultimunicipioAdminApiV1TratarPost_({parameter:{action:'admin_multimunicipio_vincular_area',token:'admin',requestId:'request_admin_004',payload:JSON.stringify({areaId:'AREA_A',municipioId:'MUN_X'})}});
assert.equal(lastMutation,'area:AREA_A>MUN_X');

perfil='TACS';
resposta=sandbox.tacsMultimunicipioAdminApiV1TratarPost_({parameter:{action:'admin_multimunicipio_dados',territorioToken:'tacs',requestId:'request_tacs_001'}});
assert.match(resposta.html,/"ok":false/);
assert.match(resposta.html,/Somente o administrador geral/);
assert.equal(sandbox.tacsMultimunicipioAdminApiV1TratarPost_({parameter:{action:'outra_acao'}}),null);

const result=sandbox.tacsMultimunicipioAdminApiV1TratarGet_({parameter:{action:'admin_multimunicipio_result',requestId:'request_admin_004'}});
assert.match(result.text,/"pendente":false/);
console.log('API multi-município: leitura/mutações somente ADMIN_GERAL e resultado assíncrono validado.');
