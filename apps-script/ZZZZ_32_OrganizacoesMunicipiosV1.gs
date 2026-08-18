/**
 * ZZZZ_32_OrganizacoesMunicipiosV1.gs
 * Portal TACS — camada estrutural de organizações e municípios V1.1.0
 *
 * Princípios:
 * - nenhuma área atual é deslocada automaticamente;
 * - o TACS nunca escolhe organização/município pelo navegador;
 * - o contexto municipal é derivado da área já validada pelo servidor;
 * - a camada é aditiva e compatível com o modelo territorial existente;
 * - novos municípios poderão ser vinculados a áreas sem reutilizar AREA_ID;
 * - nesta etapa, somente ADMIN_GERAL pode alterar organização/município/vínculo;
 * - alterações estruturais são bloqueadas se deixarem uma área ativa sem contexto válido.
 */
var TACS_ORGANIZACOES_MUNICIPIOS_V1=Object.freeze({
  VERSAO:'1.2.0',
  CATALOGO_PROPERTY:'TACS_ORGANIZACOES_MUNICIPIOS_V1_CATALOGO',
  ORGANIZACAO_PADRAO:'ORG_ATUAL',
  MUNICIPIO_PADRAO:'MUN_ATUAL',
  ADMIN_PERFIL:'ADMIN_GERAL'
});

function tacsOrganizacoesMunicipiosV1Id_(valor){
  var texto=String(valor==null?'':valor).trim().toUpperCase();
  if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return texto.replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
}

function tacsOrganizacoesMunicipiosV1Texto_(valor){
  return String(valor==null?'':valor).replace(/\s+/g,' ').trim();
}

function tacsOrganizacoesMunicipiosV1Booleano_(valor,padrao){
  if(valor===true||valor===1)return true;
  if(valor===false||valor===0)return false;
  var texto=tacsOrganizacoesMunicipiosV1Texto_(valor).toLowerCase();
  if(['true','1','sim','ativo','ativa','yes'].indexOf(texto)!==-1)return true;
  if(['false','0','nao','não','inativo','inativa','no'].indexOf(texto)!==-1)return false;
  return padrao!==false;
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
      ativa:tacsOrganizacoesMunicipiosV1Booleano_(item.ativa,true)
    };
  });

  var munMap={};
  municipios.forEach(function(item){
    var id=tacsOrganizacoesMunicipiosV1Id_(item.municipioId||item.id);
    var org=tacsOrganizacoesMunicipiosV1Id_(item.organizacaoId);
    if(!id)throw new Error('Município sem identificador válido.');
    if(munMap[id])throw new Error('Município duplicado: '+id+'.');
    if(!orgMap[org])throw new Error('O município '+id+' aponta para uma organização inexistente.');
    var ativo=tacsOrganizacoesMunicipiosV1Booleano_(item.ativo,true);
    if(ativo&&orgMap[org].ativa===false){
      throw new Error('O município '+id+' não pode ficar ativo dentro de uma organização inativa.');
    }
    munMap[id]={
      municipioId:id,organizacaoId:org,
      nome:tacsOrganizacoesMunicipiosV1Texto_(item.nome)||id,
      uf:tacsOrganizacoesMunicipiosV1Id_(item.uf).slice(0,2),
      ativo:ativo
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

function tacsOrganizacoesMunicipiosV1Mapas_(catalogo){
  var orgs={},muns={};
  (catalogo.organizacoes||[]).forEach(function(item){orgs[item.organizacaoId]=item;});
  (catalogo.municipios||[]).forEach(function(item){muns[item.municipioId]=item;});
  return {organizacoes:orgs,municipios:muns};
}

function tacsOrganizacoesMunicipiosV1MunicipioDaArea_(catalogo,areaId){
  areaId=tacsOrganizacoesMunicipiosV1Id_(areaId);
  var vinculo=catalogo.areas&&catalogo.areas[areaId];
  var explicito=tacsOrganizacoesMunicipiosV1Id_(vinculo&&vinculo.municipioId||'');
  if(explicito)return explicito;

  var ativosReais=(catalogo.municipios||[]).filter(function(item){
    return item&&item.ativo!==false&&
      tacsOrganizacoesMunicipiosV1Id_(item.municipioId)!==TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO;
  });
  if(ativosReais.length===1){
    return tacsOrganizacoesMunicipiosV1Id_(ativosReais[0].municipioId);
  }

  if(ativosReais.length===0){
    var legado=(catalogo.municipios||[]).filter(function(item){
      return item&&item.ativo!==false&&
        tacsOrganizacoesMunicipiosV1Id_(item.municipioId)===TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO;
    });
    if(legado.length===1)return TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO;
  }
  return '';
}

function tacsOrganizacoesMunicipiosV1ValidarIntegridadeTerritorial_(catalogo){
  var mapas=tacsOrganizacoesMunicipiosV1Mapas_(catalogo);
  var areasVinculadas=Object.keys(catalogo.areas||{});

  if(typeof tacsTerritorioV1EncontrarArea_==='function'){
    areasVinculadas.forEach(function(areaId){
      var area=tacsTerritorioV1EncontrarArea_(areaId);
      if(!area)throw new Error('O vínculo municipal aponta para uma área inexistente: '+areaId+'.');
    });
  }

  if(typeof tacsTerritorioV1LerAreas_==='function'){
    var areas=tacsTerritorioV1LerAreas_()||[];
    areas.forEach(function(area){
      if(!area||area.ativa===false)return;
      var areaId=tacsOrganizacoesMunicipiosV1Id_(area.areaId||area.AREA_ID);
      if(!areaId)return;
      var municipioId=tacsOrganizacoesMunicipiosV1MunicipioDaArea_(catalogo,areaId);
      var municipio=mapas.municipios[municipioId];
      if(!municipio||municipio.ativo===false){
        throw new Error('A área ativa '+areaId+' ficaria sem município ativo.');
      }
      var organizacao=mapas.organizacoes[municipio.organizacaoId];
      if(!organizacao||organizacao.ativa===false){
        throw new Error('A área ativa '+areaId+' ficaria vinculada a uma organização inativa.');
      }
    });
  }
  return true;
}

function tacsOrganizacoesMunicipiosV1LerCatalogo_(){
  var props=PropertiesService.getScriptProperties();
  var raw=props.getProperty(TACS_ORGANIZACOES_MUNICIPIOS_V1.CATALOGO_PROPERTY)||'';
  if(!raw)return tacsOrganizacoesMunicipiosV1CatalogoPadrao_();
  var parsed;
  try{parsed=JSON.parse(raw);}catch(erro){throw new Error('O catálogo de organizações e municípios está inválido.');}
  return tacsOrganizacoesMunicipiosV1ValidarCatalogo_(parsed);
}

function tacsOrganizacoesMunicipiosV1ExigirAdminGeral_(acesso){
  if(!acesso||acesso.perfil!==TACS_ORGANIZACOES_MUNICIPIOS_V1.ADMIN_PERFIL){
    throw new Error('Somente o administrador geral pode alterar organizações, municípios e vínculos territoriais.');
  }
}

function tacsOrganizacoesMunicipiosV1ComLock_(fn){
  if(typeof LockService!=='object'||!LockService||typeof LockService.getScriptLock!=='function')return fn();
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('Outra alteração estrutural está em andamento. Tente novamente.');
  try{return fn();}finally{lock.releaseLock();}
}

function tacsOrganizacoesMunicipiosV1PersistirSemLock_(catalogo){
  var validado=tacsOrganizacoesMunicipiosV1ValidarCatalogo_(catalogo);
  tacsOrganizacoesMunicipiosV1ValidarIntegridadeTerritorial_(validado);
  PropertiesService.getScriptProperties().setProperty(
    TACS_ORGANIZACOES_MUNICIPIOS_V1.CATALOGO_PROPERTY,
    JSON.stringify(validado)
  );
  return validado;
}

function tacsOrganizacoesMunicipiosV1SalvarCatalogo_(catalogo,acesso){
  tacsOrganizacoesMunicipiosV1ExigirAdminGeral_(acesso);
  return tacsOrganizacoesMunicipiosV1ComLock_(function(){
    return tacsOrganizacoesMunicipiosV1PersistirSemLock_(catalogo);
  });
}

function tacsOrganizacoesMunicipiosV1SalvarOrganizacao_(dados,acesso){
  tacsOrganizacoesMunicipiosV1ExigirAdminGeral_(acesso);
  dados=dados&&typeof dados==='object'?dados:{};
  var id=tacsOrganizacoesMunicipiosV1Id_(dados.organizacaoId||dados.id);
  if(!id)throw new Error('Informe o identificador da organização.');
  return tacsOrganizacoesMunicipiosV1ComLock_(function(){
    var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();
    var indice=-1;
    for(var i=0;i<catalogo.organizacoes.length;i++){
      if(catalogo.organizacoes[i].organizacaoId===id){indice=i;break;}
    }
    var item={
      organizacaoId:id,
      nome:tacsOrganizacoesMunicipiosV1Texto_(dados.nome)||id,
      ativa:tacsOrganizacoesMunicipiosV1Booleano_(dados.ativa,true)
    };
    if(indice>=0)catalogo.organizacoes[indice]=item;else catalogo.organizacoes.push(item);
    return tacsOrganizacoesMunicipiosV1PersistirSemLock_(catalogo);
  });
}

function tacsOrganizacoesMunicipiosV1SalvarMunicipio_(dados,acesso){
  tacsOrganizacoesMunicipiosV1ExigirAdminGeral_(acesso);
  dados=dados&&typeof dados==='object'?dados:{};
  var id=tacsOrganizacoesMunicipiosV1Id_(dados.municipioId||dados.id);
  var organizacaoId=tacsOrganizacoesMunicipiosV1Id_(dados.organizacaoId);
  if(!id)throw new Error('Informe o identificador do município.');
  if(!organizacaoId)throw new Error('Informe a organização do município.');
  return tacsOrganizacoesMunicipiosV1ComLock_(function(){
    var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();
    var indice=-1;
    for(var i=0;i<catalogo.municipios.length;i++){
      if(catalogo.municipios[i].municipioId===id){indice=i;break;}
    }
    var item={
      municipioId:id,organizacaoId:organizacaoId,
      nome:tacsOrganizacoesMunicipiosV1Texto_(dados.nome)||id,
      uf:tacsOrganizacoesMunicipiosV1Id_(dados.uf).slice(0,2),
      ativo:tacsOrganizacoesMunicipiosV1Booleano_(dados.ativo,true)
    };
    if(indice>=0)catalogo.municipios[indice]=item;else catalogo.municipios.push(item);
    return tacsOrganizacoesMunicipiosV1PersistirSemLock_(catalogo);
  });
}

function tacsOrganizacoesMunicipiosV1ContextoArea_(areaId){
  areaId=tacsOrganizacoesMunicipiosV1Id_(areaId);
  if(!areaId)throw new Error('A área não foi identificada para resolver o município.');
  if(typeof tacsTerritorioV1EncontrarArea_==='function'){
    var area=tacsTerritorioV1EncontrarArea_(areaId);
    if(!area||area.ativa===false)throw new Error('A área não está ativa ou não foi encontrada.');
  }
  var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();
  var mapas=tacsOrganizacoesMunicipiosV1Mapas_(catalogo);
  var municipioId=tacsOrganizacoesMunicipiosV1MunicipioDaArea_(catalogo,areaId);
  var municipio=mapas.municipios[municipioId]||null;
  if(!municipio||municipio.ativo===false)throw new Error('O município vinculado à área está inativo ou não existe.');
  var organizacao=mapas.organizacoes[municipio.organizacaoId]||null;
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
  }else if(acesso.perfil===TACS_ORGANIZACOES_MUNICIPIOS_V1.ADMIN_PERFIL){
    areaId=tacsOrganizacoesMunicipiosV1Id_(areaSolicitada||acesso.areaId);
  }else{
    throw new Error('O perfil informado não possui escopo multi-município válido.');
  }
  return tacsOrganizacoesMunicipiosV1ContextoArea_(areaId);
}

function tacsOrganizacoesMunicipiosV1VincularArea_(areaId,municipioId,acesso){
  tacsOrganizacoesMunicipiosV1ExigirAdminGeral_(acesso);
  areaId=tacsOrganizacoesMunicipiosV1Id_(areaId);
  municipioId=tacsOrganizacoesMunicipiosV1Id_(municipioId);
  if(!areaId||!municipioId)throw new Error('Área e município são obrigatórios.');
  if(typeof tacsTerritorioV1EncontrarArea_==='function'){
    var area=tacsTerritorioV1EncontrarArea_(areaId);
    if(!area)throw new Error('A área informada não existe.');
  }
  return tacsOrganizacoesMunicipiosV1ComLock_(function(){
    var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();
    var existe=false;
    for(var i=0;i<catalogo.municipios.length;i++){
      if(catalogo.municipios[i].municipioId===municipioId&&catalogo.municipios[i].ativo!==false){
        existe=true;break;
      }
    }
    if(!existe)throw new Error('O município informado não existe ou está inativo.');
    catalogo.areas[areaId]={municipioId:municipioId};
    return tacsOrganizacoesMunicipiosV1PersistirSemLock_(catalogo);
  });
}

function tacsOrganizacoesMunicipiosV1MigrarLegadoChaGrande_(){
  var leitura=tacsOrganizacoesMunicipiosV1LerCatalogo_();
  var legadoOrg=TACS_ORGANIZACOES_MUNICIPIOS_V1.ORGANIZACAO_PADRAO;
  var legadoMun=TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO;
  var temLegado=(leitura.organizacoes||[]).some(function(item){
    return tacsOrganizacoesMunicipiosV1Id_(item&&item.organizacaoId)===legadoOrg;
  })||(leitura.municipios||[]).some(function(item){
    return tacsOrganizacoesMunicipiosV1Id_(item&&item.municipioId)===legadoMun;
  });
  if(!temLegado)return leitura;

  var reaisAtivos=(leitura.municipios||[]).filter(function(item){
    return item&&item.ativo!==false&&tacsOrganizacoesMunicipiosV1Id_(item.municipioId)!==legadoMun;
  });
  if(reaisAtivos.length!==1)return leitura;
  var destino=reaisAtivos[0];
  var destinoId=tacsOrganizacoesMunicipiosV1Id_(destino.municipioId);
  var destinoNome=tacsOrganizacoesMunicipiosV1Id_(destino.nome);
  var destinoUf=tacsOrganizacoesMunicipiosV1Id_(destino.uf);
  if(destinoId!=='CHA_GRANDE'&&destinoNome!=='CHA_GRANDE')return leitura;
  if(destinoUf&&destinoUf!=='PE')return leitura;
  var orgDestinoId=tacsOrganizacoesMunicipiosV1Id_(destino.organizacaoId);
  if(!orgDestinoId||orgDestinoId===legadoOrg)return leitura;
  var orgDestino=(leitura.organizacoes||[]).filter(function(item){
    return item&&item.ativa!==false&&tacsOrganizacoesMunicipiosV1Id_(item.organizacaoId)===orgDestinoId;
  })[0]||null;
  if(!orgDestino)return leitura;

  return tacsOrganizacoesMunicipiosV1ComLock_(function(){
    var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();
    var reais=(catalogo.municipios||[]).filter(function(item){
      return item&&item.ativo!==false&&tacsOrganizacoesMunicipiosV1Id_(item.municipioId)!==legadoMun;
    });
    if(reais.length!==1)return catalogo;
    var real=reais[0];
    var realId=tacsOrganizacoesMunicipiosV1Id_(real.municipioId);
    var realNome=tacsOrganizacoesMunicipiosV1Id_(real.nome);
    var realUf=tacsOrganizacoesMunicipiosV1Id_(real.uf);
    if(realId!=='CHA_GRANDE'&&realNome!=='CHA_GRANDE')return catalogo;
    if(realUf&&realUf!=='PE')return catalogo;
    var realOrg=tacsOrganizacoesMunicipiosV1Id_(real.organizacaoId);
    if(!realOrg||realOrg===legadoOrg)return catalogo;
    var orgOk=(catalogo.organizacoes||[]).some(function(item){
      return item&&item.ativa!==false&&tacsOrganizacoesMunicipiosV1Id_(item.organizacaoId)===realOrg;
    });
    if(!orgOk)return catalogo;

    catalogo.areas=catalogo.areas&&typeof catalogo.areas==='object'?catalogo.areas:{};
    var areaIds={};
    Object.keys(catalogo.areas).forEach(function(areaId){
      areaIds[tacsOrganizacoesMunicipiosV1Id_(areaId)]=true;
    });
    if(typeof tacsTerritorioV1LerAreas_==='function'){
      (tacsTerritorioV1LerAreas_()||[]).forEach(function(area){
        var areaId=tacsOrganizacoesMunicipiosV1Id_(area&& (area.areaId||area.AREA_ID));
        if(areaId)areaIds[areaId]=true;
      });
    }

    var mudou=false;
    Object.keys(areaIds).forEach(function(areaId){
      var vinculo=catalogo.areas[areaId];
      var municipioAtual=tacsOrganizacoesMunicipiosV1Id_(vinculo&&vinculo.municipioId||'');
      if(!municipioAtual||municipioAtual===legadoMun){
        catalogo.areas[areaId]={municipioId:realId};
        mudou=true;
      }
    });

    var usaMunLegado=Object.keys(catalogo.areas).some(function(areaId){
      var vinculo=catalogo.areas[areaId];
      return tacsOrganizacoesMunicipiosV1Id_(vinculo&&vinculo.municipioId||'')===legadoMun;
    });
    if(!usaMunLegado){
      var antesMun=catalogo.municipios.length;
      catalogo.municipios=catalogo.municipios.filter(function(item){
        return tacsOrganizacoesMunicipiosV1Id_(item&&item.municipioId)!==legadoMun;
      });
      if(catalogo.municipios.length!==antesMun)mudou=true;
    }

    var usaOrgLegado=(catalogo.municipios||[]).some(function(item){
      return tacsOrganizacoesMunicipiosV1Id_(item&&item.organizacaoId)===legadoOrg;
    });
    if(!usaOrgLegado){
      var antesOrg=catalogo.organizacoes.length;
      catalogo.organizacoes=catalogo.organizacoes.filter(function(item){
        return tacsOrganizacoesMunicipiosV1Id_(item&&item.organizacaoId)!==legadoOrg;
      });
      if(catalogo.organizacoes.length!==antesOrg)mudou=true;
    }

    return mudou?tacsOrganizacoesMunicipiosV1PersistirSemLock_(catalogo):catalogo;
  });
}

function tacsOrganizacoesMunicipiosV1DadosAdmin_(acesso){
  tacsOrganizacoesMunicipiosV1ExigirAdminGeral_(acesso);
  var catalogo=tacsOrganizacoesMunicipiosV1MigrarLegadoChaGrande_();
  var areas=[];
  if(typeof tacsTerritorioV1LerAreas_==='function'){
    areas=(tacsTerritorioV1LerAreas_()||[]).map(function(area){
      var areaId=tacsOrganizacoesMunicipiosV1Id_(area.areaId||area.AREA_ID);
      var contexto=null,erro='';
      try{contexto=tacsOrganizacoesMunicipiosV1ContextoArea_(areaId);}catch(e){erro=tacsOrganizacoesMunicipiosV1Texto_(e&&e.message||e);}
      return {
        areaId:areaId,
        areaNome:tacsOrganizacoesMunicipiosV1Texto_(area.areaNome||area.AREA_NOME||areaId),
        ativa:area.ativa!==false,
        contexto:contexto,
        erro:erro
      };
    });
  }
  return {ok:true,versao:TACS_ORGANIZACOES_MUNICIPIOS_V1.VERSAO,catalogo:catalogo,areas:areas};
}
