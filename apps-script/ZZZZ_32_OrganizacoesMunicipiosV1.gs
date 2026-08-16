/**
 * ZZZZ_32_OrganizacoesMunicipiosV1.gs
 * Portal TACS — camada estrutural de organizações e municípios V1.0.0
 *
 * Princípios:
 * - nenhuma área atual é deslocada automaticamente;
 * - o TACS nunca escolhe organização/município pelo navegador;
 * - o contexto municipal é derivado da área já validada pelo servidor;
 * - a camada é aditiva e compatível com o modelo territorial existente;
 * - novos municípios poderão ser vinculados a áreas sem reutilizar AREA_ID.
 */
var TACS_ORGANIZACOES_MUNICIPIOS_V1=Object.freeze({
  VERSAO:'1.0.0',
  CATALOGO_PROPERTY:'TACS_ORGANIZACOES_MUNICIPIOS_V1_CATALOGO',
  ORGANIZACAO_PADRAO:'ORG_ATUAL',
  MUNICIPIO_PADRAO:'MUN_ATUAL'
});

function tacsOrganizacoesMunicipiosV1Id_(valor){
  var texto=String(valor==null?'':valor).trim().toUpperCase();
  if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return texto.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
}

function tacsOrganizacoesMunicipiosV1Texto_(valor){
  return String(valor==null?'':valor).replace(/\s+/g,' ').trim();
}

function tacsOrganizacoesMunicipiosV1CatalogoPadrao_(){
  return {
    versao:TACS_ORGANIZACOES_MUNICIPIOS_V1.VERSAO,
    organizacoes:[{
      organizacaoId:TACS_ORGANIZACOES_MUNICIPIOS_V1.ORGANIZACAO_PADRAO,
      nome:'Organização atual',ativa:true
    }],
    municipios:[{
      municipioId:TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO,
      organizacaoId:TACS_ORGANIZACOES_MUNICIPIOS_V1.ORGANIZACAO_PADRAO,
      nome:'Município atual',uf:'',ativo:true
    }],
    areas:{}
  };
}

function tacsOrganizacoesMunicipiosV1ValidarCatalogo_(entrada){
  var catalogo=entrada&&typeof entrada==='object'?entrada:{};
  var organizacoes=Array.isArray(catalogo.organizacoes)?catalogo.organizacoes:[];
  var municipios=Array.isArray(catalogo.municipios)?catalogo.municipios:[];
  var areas=catalogo.areas&&typeof catalogo.areas==='object'?catalogo.areas:{};
  if(!organizacoes.length)throw new Error('O catálogo precisa possuir ao menos uma organização.');
  if(!municipios.length)throw new Error('O catálogo precisa possuir ao menos um município.');

  var orgMap={};
  organizacoes.forEach(function(item){
    var id=tacsOrganizacoesMunicipiosV1Id_(item.organizacaoId||item.id);
    if(!id)throw new Error('Organização sem identificador válido.');
    if(orgMap[id])throw new Error('Organização duplicada: '+id+'.');
    orgMap[id]={
      organizacaoId:id,
      nome:tacsOrganizacoesMunicipiosV1Texto_(item.nome)||id,
      ativa:item.ativa!==false
    };
  });

  var munMap={};
  municipios.forEach(function(item){
    var id=tacsOrganizacoesMunicipiosV1Id_(item.municipioId||item.id);
    var org=tacsOrganizacoesMunicipiosV1Id_(item.organizacaoId);
    if(!id)throw new Error('Município sem identificador válido.');
    if(munMap[id])throw new Error('Município duplicado: '+id+'.');
    if(!orgMap[org])throw new Error('O município '+id+' aponta para uma organização inexistente.');
    munMap[id]={
      municipioId:id,organizacaoId:org,
      nome:tacsOrganizacoesMunicipiosV1Texto_(item.nome)||id,
      uf:tacsOrganizacoesMunicipiosV1Id_(item.uf).slice(0,2),
      ativo:item.ativo!==false
    };
  });

  var areaMap={};
  Object.keys(areas).forEach(function(chave){
    var areaId=tacsOrganizacoesMunicipiosV1Id_(chave);
    var municipioId=tacsOrganizacoesMunicipiosV1Id_(areas[chave]&&areas[chave].municipioId||areas[chave]);
    if(!areaId)throw new Error('Vínculo municipal possui AREA_ID inválido.');
    if(!munMap[municipioId])throw new Error('A área '+areaId+' aponta para município inexistente.');
    if(areaMap[areaId])throw new Error('A área '+areaId+' aparece mais de uma vez no catálogo municipal.');
    areaMap[areaId]={municipioId:municipioId};
  });

  return {
    versao:TACS_ORGANIZACOES_MUNICIPIOS_V1.VERSAO,
    organizacoes:Object.keys(orgMap).map(function(id){return orgMap[id];}),
    municipios:Object.keys(munMap).map(function(id){return munMap[id];}),
    areas:areaMap
  };
}

function tacsOrganizacoesMunicipiosV1LerCatalogo_(){
  var props=PropertiesService.getScriptProperties();
  var raw=props.getProperty(TACS_ORGANIZACOES_MUNICIPIOS_V1.CATALOGO_PROPERTY)||'';
  if(!raw)return tacsOrganizacoesMunicipiosV1CatalogoPadrao_();
  var parsed;
  try{parsed=JSON.parse(raw);}catch(erro){throw new Error('O catálogo de organizações e municípios está inválido.');}
  return tacsOrganizacoesMunicipiosV1ValidarCatalogo_(parsed);
}

function tacsOrganizacoesMunicipiosV1SalvarCatalogo_(catalogo,acesso){
  if(!acesso||['ADMIN_GERAL','ADMIN_MUNICIPAL'].indexOf(acesso.perfil)===-1){
    throw new Error('Somente administração autorizada pode alterar o catálogo municipal.');
  }
  var validado=tacsOrganizacoesMunicipiosV1ValidarCatalogo_(catalogo);
  PropertiesService.getScriptProperties().setProperty(
    TACS_ORGANIZACOES_MUNICIPIOS_V1.CATALOGO_PROPERTY,
    JSON.stringify(validado)
  );
  return validado;
}

function tacsOrganizacoesMunicipiosV1ContextoArea_(areaId){
  areaId=tacsOrganizacoesMunicipiosV1Id_(areaId);
  if(!areaId)throw new Error('A área não foi identificada para resolver o município.');
  if(typeof tacsTerritorioV1EncontrarArea_==='function'){
    var area=tacsTerritorioV1EncontrarArea_(areaId);
    if(!area||area.ativa===false)throw new Error('A área não está ativa ou não foi encontrada.');
  }
  var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();
  var vinculo=catalogo.areas[areaId]||{municipioId:TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO};
  var municipioId=tacsOrganizacoesMunicipiosV1Id_(vinculo.municipioId);
  var municipio=null,organizacao=null;
  for(var i=0;i<catalogo.municipios.length;i++)if(catalogo.municipios[i].municipioId===municipioId){municipio=catalogo.municipios[i];break;}
  if(!municipio||municipio.ativo===false)throw new Error('O município vinculado à área está inativo ou não existe.');
  for(var j=0;j<catalogo.organizacoes.length;j++)if(catalogo.organizacoes[j].organizacaoId===municipio.organizacaoId){organizacao=catalogo.organizacoes[j];break;}
  if(!organizacao||organizacao.ativa===false)throw new Error('A organização vinculada ao município está inativa ou não existe.');
  return {
    organizacaoId:organizacao.organizacaoId,organizacaoNome:organizacao.nome,
    municipioId:municipio.municipioId,municipioNome:municipio.nome,uf:municipio.uf,
    areaId:areaId
  };
}

function tacsOrganizacoesMunicipiosV1ContextoAcesso_(acesso,areaSolicitada){
  if(!acesso||!acesso.perfil)throw new Error('Acesso territorial ausente.');
  var areaId;
  if(acesso.perfil==='TACS'){
    areaId=tacsOrganizacoesMunicipiosV1Id_(acesso.areaId);
    var solicitada=tacsOrganizacoesMunicipiosV1Id_(areaSolicitada);
    if(solicitada&&solicitada!==areaId)throw new Error('O TACS não pode mudar de município ou área pelo navegador.');
  }else{
    areaId=tacsOrganizacoesMunicipiosV1Id_(areaSolicitada||acesso.areaId);
  }
  return tacsOrganizacoesMunicipiosV1ContextoArea_(areaId);
}

function tacsOrganizacoesMunicipiosV1VincularArea_(areaId,municipioId,acesso){
  if(!acesso||['ADMIN_GERAL','ADMIN_MUNICIPAL'].indexOf(acesso.perfil)===-1){
    throw new Error('Somente administração autorizada pode vincular áreas a municípios.');
  }
  areaId=tacsOrganizacoesMunicipiosV1Id_(areaId);
  municipioId=tacsOrganizacoesMunicipiosV1Id_(municipioId);
  if(!areaId||!municipioId)throw new Error('Área e município são obrigatórios.');
  var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();
  var existe=false;
  for(var i=0;i<catalogo.municipios.length;i++)if(catalogo.municipios[i].municipioId===municipioId&&catalogo.municipios[i].ativo!==false){existe=true;break;}
  if(!existe)throw new Error('O município informado não existe ou está inativo.');
  if(typeof tacsTerritorioV1EncontrarArea_==='function'){
    var area=tacsTerritorioV1EncontrarArea_(areaId);
    if(!area)throw new Error('A área informada não existe.');
  }
  catalogo.areas[areaId]={municipioId:municipioId};
  return tacsOrganizacoesMunicipiosV1SalvarCatalogo_(catalogo,acesso);
}
