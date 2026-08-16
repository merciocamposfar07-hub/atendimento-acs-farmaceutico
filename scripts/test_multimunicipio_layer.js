'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'apps-script/ZZZZ_32_OrganizacoesMunicipiosV1.gs'),'utf8');
const build=fs.readFileSync(path.join(ROOT,'scripts/build_apps_script_release.js'),'utf8');

const props=new Map();
const areas=new Set(['AREA_A','AREA_B','AREA_C']);
const sandbox={
  PropertiesService:{getScriptProperties(){return{
    getProperty:key=>props.get(key)||'',
    setProperty:(key,value)=>props.set(key,String(value))
  }}},
  tacsTerritorioV1EncontrarArea_:areaId=>areas.has(areaId)?{areaId,ativa:true}:null,
  console
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);

assert.equal(sandbox.TACS_ORGANIZACOES_MUNICIPIOS_V1.VERSAO,'1.0.0');
assert.match(source,/O TACS não pode mudar de município ou área pelo navegador/);
assert.match(build,/ZZZZ_32_OrganizacoesMunicipiosV1\.gs/);
assert.match(build,/TACS_ORGANIZACOES_MUNICIPIOS_V1/);

let ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_A'},'AREA_A');
assert.equal(ctx.areaId,'AREA_A');
assert.equal(ctx.municipioId,'MUN_ATUAL');
assert.equal(ctx.organizacaoId,'ORG_ATUAL');
assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_A'},'AREA_B'),/não pode mudar/i);

const catalog={
  organizacoes:[
    {organizacaoId:'ORG_1',nome:'Organização 1',ativa:true},
    {organizacaoId:'ORG_2',nome:'Organização 2',ativa:true}
  ],
  municipios:[
    {municipioId:'MUN_1',organizacaoId:'ORG_1',nome:'Município 1',uf:'PE',ativo:true},
    {municipioId:'MUN_2',organizacaoId:'ORG_2',nome:'Município 2',uf:'PB',ativo:true}
  ],
  areas:{
    AREA_A:{municipioId:'MUN_1'},
    AREA_B:{municipioId:'MUN_2'}
  }
};
const admin={perfil:'ADMIN_GERAL'};
sandbox.tacsOrganizacoesMunicipiosV1SalvarCatalogo_(catalog,admin);
ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_A'},'AREA_A');
assert.equal(ctx.municipioId,'MUN_1');
assert.equal(ctx.organizacaoId,'ORG_1');
ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_(admin,'AREA_B');
assert.equal(ctx.municipioId,'MUN_2');
assert.equal(ctx.organizacaoId,'ORG_2');

assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1ValidarCatalogo_({
  organizacoes:[{organizacaoId:'ORG_1'},{organizacaoId:'ORG_1'}],
  municipios:[{municipioId:'MUN_1',organizacaoId:'ORG_1'}],areas:{}
}),/duplicada/i);
assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1ValidarCatalogo_({
  organizacoes:[{organizacaoId:'ORG_1'}],
  municipios:[{municipioId:'MUN_1',organizacaoId:'ORG_INEXISTENTE'}],areas:{}
}),/organização inexistente/i);
assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1ValidarCatalogo_({
  organizacoes:[{organizacaoId:'ORG_1'}],
  municipios:[{municipioId:'MUN_1',organizacaoId:'ORG_1'}],areas:{AREA_A:{municipioId:'MUN_X'}}
}),/município inexistente/i);

sandbox.tacsOrganizacoesMunicipiosV1VincularArea_('AREA_C','MUN_2',admin);
ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_C'},'AREA_C');
assert.equal(ctx.municipioId,'MUN_2');
assert.equal(ctx.organizacaoId,'ORG_2');

console.log('Camada multi-município V1: organização → município → área validada sem permitir troca territorial pelo TACS.');
