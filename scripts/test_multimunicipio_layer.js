'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'apps-script/ZZZZ_32_OrganizacoesMunicipiosV1.gs'),'utf8');
const build=fs.readFileSync(path.join(ROOT,'scripts/build_apps_script_release.js'),'utf8');

const props=new Map();
const areaState=new Map([
  ['AREA_A',{areaId:'AREA_A',areaNome:'Área A',ativa:true}],
  ['AREA_B',{areaId:'AREA_B',areaNome:'Área B',ativa:true}],
  ['AREA_C',{areaId:'AREA_C',areaNome:'Área C',ativa:true}]
]);
const fakeLock={locked:false,tryLock(){if(this.locked)return false;this.locked=true;return true;},releaseLock(){this.locked=false;}};
const sandbox={
  PropertiesService:{getScriptProperties(){return{
    getProperty:key=>props.get(key)||'',
    setProperty:(key,value)=>props.set(key,String(value))
  }}},
  LockService:{getScriptLock(){return fakeLock;}},
  tacsTerritorioV1EncontrarArea_:areaId=>areaState.get(areaId)||null,
  tacsTerritorioV1LerAreas_:()=>Array.from(areaState.values()).map(x=>({...x})),
  console
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);

assert.equal(sandbox.TACS_ORGANIZACOES_MUNICIPIOS_V1.VERSAO,'1.2.0');
assert.match(source,/function tacsOrganizacoesMunicipiosV1MigrarLegadoChaGrande_\(\)/);
assert.match(source,/destinoId!=='CHA_GRANDE'&&destinoNome!=='CHA_GRANDE'/);
assert.match(source,/if\(!usaMunLegado\)/);
assert.match(source,/if\(!usaOrgLegado\)/);
assert.match(source,/O TACS não pode mudar de município ou área pelo navegador/);
assert.match(source,/Somente o administrador geral pode alterar organizações, municípios e vínculos territoriais/);
assert.match(build,/ZZZZ_32_OrganizacoesMunicipiosV1\.gs/);
assert.match(build,/TACS_ORGANIZACOES_MUNICIPIOS_V1/);

let ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_A'},'AREA_A');
assert.equal(ctx.areaId,'AREA_A');
assert.equal(ctx.municipioId,'MUN_ATUAL');
assert.equal(ctx.organizacaoId,'ORG_ATUAL');
assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_A'},'AREA_B'),/não pode mudar/i);
assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'ADMIN_MUNICIPAL',areaId:'AREA_A'},'AREA_A'),/não possui escopo/i);

// Migração real do legado atual: placeholders + único município real Chã Grande/PE.
const migrationCatalog={
  versao:'1.1.0',atualizadaEm:'',
  organizacoes:[
    {organizacaoId:'ORG_ATUAL',nome:'Organização atual',ativa:true},
    {organizacaoId:'SECRETARIA_SAUDE_CHA_GRANDE',nome:'Secretaria Municipal de Saúde de Chã Grande',ativa:true}
  ],
  municipios:[
    {municipioId:'MUN_ATUAL',organizacaoId:'ORG_ATUAL',nome:'Município atual',uf:'',ativo:true},
    {municipioId:'CHA_GRANDE',organizacaoId:'SECRETARIA_SAUDE_CHA_GRANDE',nome:'Chã Grande',uf:'PE',ativo:true}
  ],
  areas:{AREA_A:{municipioId:'MUN_ATUAL'}}
};
props.set(sandbox.TACS_ORGANIZACOES_MUNICIPIOS_V1.CATALOGO_PROPERTY,JSON.stringify(migrationCatalog));
const migrated=sandbox.tacsOrganizacoesMunicipiosV1DadosAdmin_({perfil:'ADMIN_GERAL'});
assert.equal(migrated.versao,'1.2.0');
assert.equal(migrated.catalogo.municipios.some(x=>x.municipioId==='MUN_ATUAL'),false,'MUN_ATUAL deve ser removido após migrar todas as áreas');
assert.equal(migrated.catalogo.organizacoes.some(x=>x.organizacaoId==='ORG_ATUAL'),false,'ORG_ATUAL deve ser removido quando nenhum município depender dele');
assert.equal(migrated.areas.find(x=>x.areaId==='AREA_A').contexto.municipioId,'CHA_GRANDE');
assert.equal(migrated.areas.find(x=>x.areaId==='AREA_B').contexto.municipioId,'CHA_GRANDE','área sem vínculo explícito deve adotar o único município real');
assert.equal(migrated.areas.find(x=>x.areaId==='AREA_C').contexto.municipioId,'CHA_GRANDE','todas as áreas sem vínculo devem ser migradas para Chã Grande');

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
    AREA_B:{municipioId:'MUN_2'},
    AREA_C:{municipioId:'MUN_2'}
  }
};
const admin={perfil:'ADMIN_GERAL'};
const adminMunicipal={perfil:'ADMIN_MUNICIPAL',municipioId:'MUN_1'};
sandbox.tacsOrganizacoesMunicipiosV1SalvarCatalogo_(catalog,admin);
ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_A'},'AREA_A');
assert.equal(ctx.municipioId,'MUN_1');
assert.equal(ctx.organizacaoId,'ORG_1');
ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_(admin,'AREA_B');
assert.equal(ctx.municipioId,'MUN_2');
assert.equal(ctx.organizacaoId,'ORG_2');

assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1SalvarCatalogo_(catalog,adminMunicipal),/Somente o administrador geral/i);
assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1VincularArea_('AREA_A','MUN_2',adminMunicipal),/Somente o administrador geral/i);
assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1SalvarMunicipio_({municipioId:'MUN_1',organizacaoId:'ORG_1',nome:'Município 1',uf:'PE',ativo:false},adminMunicipal),/Somente o administrador geral/i);

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
assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1ValidarCatalogo_({
  organizacoes:[{organizacaoId:'ORG_1',ativa:false}],
  municipios:[{municipioId:'MUN_1',organizacaoId:'ORG_1',ativo:true}],areas:{}
}),/organização inativa/i);

assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1SalvarMunicipio_({
  municipioId:'MUN_1',organizacaoId:'ORG_1',nome:'Município 1',uf:'PE',ativo:false
},admin),/área ativa AREA_A ficaria sem município ativo/i);
ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_A'},'AREA_A');
assert.equal(ctx.municipioId,'MUN_1','a tentativa inválida não deve alterar o vínculo existente');

assert.throws(()=>sandbox.tacsOrganizacoesMunicipiosV1VincularArea_('AREA_INEXISTENTE','MUN_2',admin),/área informada não existe/i);

sandbox.tacsOrganizacoesMunicipiosV1SalvarOrganizacao_({organizacaoId:'ORG_3',nome:'Organização 3',ativa:true},admin);
sandbox.tacsOrganizacoesMunicipiosV1SalvarMunicipio_({municipioId:'MUN_3',organizacaoId:'ORG_3',nome:'Município 3',uf:'AL',ativo:true},admin);
sandbox.tacsOrganizacoesMunicipiosV1VincularArea_('AREA_C','MUN_3',admin);
ctx=sandbox.tacsOrganizacoesMunicipiosV1ContextoAcesso_({perfil:'TACS',areaId:'AREA_C'},'AREA_C');
assert.equal(ctx.municipioId,'MUN_3');
assert.equal(ctx.organizacaoId,'ORG_3');

const dados=sandbox.tacsOrganizacoesMunicipiosV1DadosAdmin_(admin);
assert.equal(dados.ok,true);
assert.equal(dados.versao,'1.2.0');
assert.equal(dados.areas.length,3);
assert.equal(dados.areas.find(x=>x.areaId==='AREA_C').contexto.municipioId,'MUN_3');

console.log('Camada multi-município V1.2: migração de placeholders para Chã Grande, organização → município → área, mutação só pelo administrador geral e TACS preso ao território validados.');
