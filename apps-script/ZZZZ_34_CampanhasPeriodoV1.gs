/**
 * ZZZZ_34_CampanhasPeriodoV1.gs
 * Portal TACS — Campanhas por ano/mês V1.0.0
 *
 * Extensão aditiva do módulo de publicações territoriais:
 * - mantém a gravação territorial existente;
 * - acrescenta ANO, MES e VALIDADE às campanhas;
 * - grava contexto Área → Município → Organização no mesmo registro;
 * - dados antigos continuam válidos e recebem período derivado de INICIO;
 * - o território continua vindo da sessão validada no servidor.
 */
var TACS_CAMPANHAS_PERIODO_V1=Object.freeze({
  VERSAO:'1.0.0',
  COLUNAS:['ANO','MES','VALIDADE','HORARIO','MUNICIPIO_ID','MUNICIPIO_NOME','UF','ORGANIZACAO_ID','ORGANIZACAO_NOME']
});

var campanhasPeriodoV1SalvarBase_=typeof publicacoesTerritoriaisV1Salvar_==='function'?publicacoesTerritoriaisV1Salvar_:null;
var campanhasPeriodoV1DadosBase_=typeof publicacoesTerritoriaisV1Dados_==='function'?publicacoesTerritoriaisV1Dados_:null;

(function instalarCampanhasPeriodoV1_(){
  if(campanhasPeriodoV1SalvarBase_){
    publicacoesTerritoriaisV1Salvar_=function(contexto,acesso,tipo,p){
      if(tipo!=='campanha')return campanhasPeriodoV1SalvarBase_(contexto,acesso,tipo,p);
      return campanhasPeriodoV1SalvarCampanha_(contexto,acesso,p);
    };
  }
  if(campanhasPeriodoV1DadosBase_){
    publicacoesTerritoriaisV1Dados_=function(contexto,acesso){
      return campanhasPeriodoV1EnriquecerDados_(campanhasPeriodoV1DadosBase_(contexto,acesso),contexto);
    };
  }
})();

function campanhasPeriodoV1Agora_(){
  var tz='America/Recife';
  var agora=new Date();
  return {
    ano:Number(Utilities.formatDate(agora,tz,'yyyy')),
    mes:Number(Utilities.formatDate(agora,tz,'MM'))
  };
}

function campanhasPeriodoV1Periodo_(p,inicio){
  p=p&&typeof p==='object'?p:{};
  var ano=parseInt(publicacoesTerritoriaisV1Texto_(p.ano),10);
  var mes=parseInt(publicacoesTerritoriaisV1Texto_(p.mes),10);
  var m=publicacoesTerritoriaisV1Texto_(inicio).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if((!ano||ano<2000||ano>2200)&&m)ano=Number(m[1]);
  if((!mes||mes<1||mes>12)&&m)mes=Number(m[2]);
  var atual=campanhasPeriodoV1Agora_();
  if(!ano||ano<2000||ano>2200)ano=atual.ano;
  if(!mes||mes<1||mes>12)mes=atual.mes;
  return {ano:ano,mes:mes};
}

function campanhasPeriodoV1ContextoMunicipal_(areaId){
  try{
    if(typeof tacsOrganizacoesMunicipiosV1ContextoArea_==='function'){
      return tacsOrganizacoesMunicipiosV1ContextoArea_(areaId)||{};
    }
  }catch(erro){}
  return {areaId:areaId};
}

function campanhasPeriodoV1GarantirColunas_(sheet){
  if(!sheet)throw new Error('A aba de campanhas não está disponível.');
  var last=Math.max(1,sheet.getLastColumn());
  var atuais=sheet.getRange(1,1,1,last).getDisplayValues()[0].map(publicacoesTerritoriaisV1Normalizar_);
  TACS_CAMPANHAS_PERIODO_V1.COLUNAS.forEach(function(coluna){
    if(atuais.indexOf(coluna)!==-1)return;
    last++;
    sheet.getRange(1,last).setValue(coluna);
    atuais.push(coluna);
  });
  return true;
}

function campanhasPeriodoV1SalvarCampanha_(contexto,acesso,p){
  p=p&&typeof p==='object'?p:{};
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('Outra publicação está sendo atualizada. Tente novamente.');
  try{
    var ss=publicacoesTerritoriaisV1Planilha_();
    var nomeAba=TACS_PUBLICACOES_TERRITORIAIS_V1.ABA_CAMPANHAS;
    var tabela=publicacoesTerritoriaisV1Tabela_(ss,nomeAba,'campanha',true);
    campanhasPeriodoV1GarantirColunas_(tabela.sheet);
    tabela=publicacoesTerritoriaisV1Tabela_(ss,nomeAba,'campanha',true);

    var id=publicacoesTerritoriaisV1Id_(p.id);
    var linha=id?publicacoesTerritoriaisV1Encontrar_(tabela,id,contexto.areaId):null;
    if(id&&!linha)throw new Error('A campanha informada não foi encontrada nesta área. Atualize o painel.');
    if(!id)id='CAMPANHA_'+contexto.areaId+'_'+Date.now();

    var anterior=linha?publicacoesTerritoriaisV1Objeto_(tabela.headers,linha.values):null;
    var titulo=publicacoesTerritoriaisV1Texto_(p.titulo).slice(0,220);
    var mensagem=publicacoesTerritoriaisV1Texto_(p.mensagem).slice(0,5000);
    if(!titulo||!mensagem)throw new Error('Título e conteúdo são obrigatórios.');

    var inicio=publicacoesTerritoriaisV1Data_(p.inicio);
    var validade=publicacoesTerritoriaisV1Data_(p.validade);
    if(inicio&&validade&&validade<inicio)throw new Error('A validade não pode ser anterior à data de início.');
    var periodo=campanhasPeriodoV1Periodo_(p,inicio);
    var municipal=campanhasPeriodoV1ContextoMunicipal_(contexto.areaId);

    var registro={
      ID:id,
      AREA_ID:contexto.areaId,
      TITULO:titulo,
      MENSAGEM:mensagem,
      INICIO:inicio,
      DIAS:publicacoesTerritoriaisV1Texto_(p.dias).slice(0,300),
      ATIVO:publicacoesTerritoriaisV1Booleano_(p.ativo),
      ANO:String(periodo.ano),
      MES:String(periodo.mes).padStart(2,'0'),
      VALIDADE:validade,
      HORARIO:publicacoesTerritoriaisV1Texto_(p.horario).slice(0,160),
      MUNICIPIO_ID:publicacoesTerritoriaisV1Texto_(municipal.municipioId),
      MUNICIPIO_NOME:publicacoesTerritoriaisV1Texto_(municipal.municipioNome),
      UF:publicacoesTerritoriaisV1Texto_(municipal.uf).slice(0,2),
      ORGANIZACAO_ID:publicacoesTerritoriaisV1Texto_(municipal.organizacaoId),
      ORGANIZACAO_NOME:publicacoesTerritoriaisV1Texto_(municipal.organizacaoNome)
    };

    var values=tabela.headers.map(function(h){
      if(Object.prototype.hasOwnProperty.call(registro,h))return registro[h];
      if(anterior&&Object.prototype.hasOwnProperty.call(anterior,h))return anterior[h];
      return '';
    });
    var row=linha?linha.row:tabela.sheet.getLastRow()+1;
    tabela.sheet.getRange(row,1,1,tabela.headers.length).setValues([values]);
    SpreadsheetApp.flush();
    var depois=publicacoesTerritoriaisV1Objeto_(tabela.headers,values);
    publicacoesTerritoriaisV1Auditar_(ss,'SALVAR_CAMPANHA',contexto,acesso,anterior,depois);
    return {
      ok:true,id:id,areaId:contexto.areaId,criado:!linha,
      ano:periodo.ano,mes:periodo.mes,validade:validade,
      message:'Campanha salva na área e vinculada ao período selecionado.'
    };
  }finally{lock.releaseLock();}
}

function campanhasPeriodoV1EnriquecerDados_(resultado,contexto){
  if(!resultado||resultado.ok!==true)return resultado;
  var municipal=campanhasPeriodoV1ContextoMunicipal_(contexto.areaId);
  resultado.contextoMunicipal={
    areaId:contexto.areaId,
    areaNome:contexto.areaNome||contexto.areaId,
    municipioId:publicacoesTerritoriaisV1Texto_(municipal.municipioId),
    municipioNome:publicacoesTerritoriaisV1Texto_(municipal.municipioNome),
    uf:publicacoesTerritoriaisV1Texto_(municipal.uf),
    organizacaoId:publicacoesTerritoriaisV1Texto_(municipal.organizacaoId),
    organizacaoNome:publicacoesTerritoriaisV1Texto_(municipal.organizacaoNome)
  };
  resultado.campanhas=(resultado.campanhas||[]).map(function(item){
    var inicio=publicacoesTerritoriaisV1Texto_(item.INICIO);
    var periodo=campanhasPeriodoV1Periodo_({ano:item.ANO,mes:item.MES},inicio);
    item.ANO=String(periodo.ano);
    item.MES=String(periodo.mes).padStart(2,'0');
    item.VALIDADE=publicacoesTerritoriaisV1Texto_(item.VALIDADE);
    item.MUNICIPIO_ID=publicacoesTerritoriaisV1Texto_(item.MUNICIPIO_ID)||resultado.contextoMunicipal.municipioId;
    item.MUNICIPIO_NOME=publicacoesTerritoriaisV1Texto_(item.MUNICIPIO_NOME)||resultado.contextoMunicipal.municipioNome;
    item.UF=publicacoesTerritoriaisV1Texto_(item.UF)||resultado.contextoMunicipal.uf;
    item.ORGANIZACAO_ID=publicacoesTerritoriaisV1Texto_(item.ORGANIZACAO_ID)||resultado.contextoMunicipal.organizacaoId;
    item.ORGANIZACAO_NOME=publicacoesTerritoriaisV1Texto_(item.ORGANIZACAO_NOME)||resultado.contextoMunicipal.organizacaoNome;
    return item;
  });
  resultado.campanhasPeriodoVersao=TACS_CAMPANHAS_PERIODO_V1.VERSAO;
  return resultado;
}
