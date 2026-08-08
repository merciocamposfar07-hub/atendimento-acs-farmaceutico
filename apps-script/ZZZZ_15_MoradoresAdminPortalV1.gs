/**
 * ZZZZ_15_MoradoresAdminPortalV1.gs
 * Portal TACS — Administração de Moradores V1
 *
 * Módulo isolado para o cadastro de moradores da área Japaranduba.
 * Regras de segurança:
 * - usa a mesma planilha já consultada pelo Portal do Morador;
 * - exige sessão administrativa válida do Portal TACS;
 * - GET é somente leitura;
 * - escrita diária fica bloqueada até ativação explícita por Script Property;
 * - mudança de situação fica bloqueada separadamente até o filtro público ser instalado;
 * - não exclui fisicamente moradores;
 * - não altera agendas, odontologia, profissionais, recados, campanhas ou push.
 */
var TACS_MORADORES_ADMIN_V1 = Object.freeze({
  VERSAO: '1.0.0',
  SPREADSHEET_ID: '114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg',
  META_SHEET: 'TACS_META_AREA',
  AREA_ID: 'JAPARANDUBA',
  AREA_NOME: 'Sítio Japaranduba',
  TIMEZONE: 'America/Recife',
  MAX_HEADER_ROWS: 12,
  MAX_SEARCH_RESULTS: 80,
  WRITES_PROPERTY: 'MORADORES_ADMIN_WRITES_ENABLED',
  STATUS_PROPERTY: 'MORADORES_ADMIN_STATUS_ENABLED',
  RESULT_PREFIX: 'tacs_moradores_v1_result_',
  RESULT_SECONDS: 300
});

var moradoresAdminV1DoGetAnterior_;
var moradoresAdminV1DoPostAnterior_;
var moradoresAdminV1GetAnterior_;
var moradoresAdminV1PostAnterior_;

(function instalarMoradoresAdminPortalV1_(){
  if(typeof doGet==='function'){
    moradoresAdminV1DoGetAnterior_=doGet;
    doGet=function(e){
      var resposta=moradoresAdminV1TratarGet_(e);
      return resposta||moradoresAdminV1DoGetAnterior_(e);
    };
  }

  if(typeof doPost==='function'){
    moradoresAdminV1DoPostAnterior_=doPost;
    doPost=function(e){
      var resposta=moradoresAdminV1TratarPost_(e);
      return resposta||moradoresAdminV1DoPostAnterior_(e);
    };
  }

  if(typeof tratarGetPainelTacs_==='function'){
    moradoresAdminV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){
      var resposta=moradoresAdminV1TratarGet_(e);
      return resposta||moradoresAdminV1GetAnterior_(e);
    };
  }

  if(typeof tratarPostPainelTacs_==='function'){
    moradoresAdminV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){
      var resposta=moradoresAdminV1TratarPost_(e);
      return resposta||moradoresAdminV1PostAnterior_(e);
    };
  }
})();

function moradoresAdminV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=moradoresAdminV1Texto_(p.action).toLowerCase();

  if(action!=='admin_moradores_result'){
    return null;
  }

  var callback=p.callback;

  try{
    // O requestId é aleatório e de alta entropia. O token administrativo não vai na URL.
    var requestId=moradoresAdminV1ValidarRequestId_(p.requestId);
    var resultado=moradoresAdminV1LerResultado_(requestId);

    return moradoresAdminV1ResponderJson_({
      ok:true,
      pendente:!resultado,
      requestId:requestId,
      result:resultado||null
    },callback);
  }catch(erro){
    return moradoresAdminV1ResponderJson_({
      ok:false,
      message:moradoresAdminV1MensagemErro_(erro)
    },callback);
  }
}

function moradoresAdminV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=moradoresAdminV1Texto_(p.action).toLowerCase();

  if([
    'admin_moradores_status',
    'admin_moradores_buscar',
    'admin_morador_salvar',
    'admin_morador_situacao'
  ].indexOf(action)===-1){
    return null;
  }

  var resultado;

  try{
    moradoresAdminV1ValidarSessao_(p);

    if(action==='admin_moradores_status'){
      resultado=moradoresAdminV1Status_();
    }else if(action==='admin_moradores_buscar'){
      resultado=moradoresAdminV1Buscar_(p.q||p.busca||'');
    }else if(action==='admin_morador_salvar'){
      moradoresAdminV1ExigirEscrita_();
      resultado=moradoresAdminV1Salvar_(p);
    }else{
      moradoresAdminV1ExigirSituacao_();
      resultado=moradoresAdminV1Situacao_(p);
    }
  }catch(erro){
    resultado={
      ok:false,
      message:moradoresAdminV1MensagemErro_(erro)
    };
  }

  var requestId=moradoresAdminV1Texto_(p.requestId);
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId)){
    moradoresAdminV1GuardarResultado_(requestId,resultado);
  }

  return moradoresAdminV1ResponderPost_(requestId,resultado);
}

/** Leitura de estado: sem escrita. */
function moradoresAdminV1Status_(){
  var fonte=moradoresAdminV1LocalizarFonte_();
  var meta=fonte.ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET);
  return {
    ok:true,
    versao:TACS_MORADORES_ADMIN_V1.VERSAO,
    areaId:TACS_MORADORES_ADMIN_V1.AREA_ID,
    areaNome:TACS_MORADORES_ADMIN_V1.AREA_NOME,
    planilhaConfigurada:true,
    abaFonte:fonte.sheet.getName(),
    linhaCabecalho:fonte.headerRow+1,
    totalRegistros:Math.max(0,fonte.sheet.getLastRow()-(fonte.headerRow+1)),
    metaExiste:Boolean(meta),
    escritaHabilitada:moradoresAdminV1EscritaHabilitada_(),
    situacaoHabilitada:moradoresAdminV1SituacaoHabilitada_(),
    csvImportacao:'NAO_HABILITADA_NESTA_FASE'
  };
}

function moradoresAdminV1Buscar_(busca){
  var q=moradoresAdminV1NormalizarBusca_(busca);
  if(q.length<2)throw new Error('Digite pelo menos 2 caracteres para buscar.');
  var fonte=moradoresAdminV1LocalizarFonte_();
  var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss);
  var lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();
  if(lastRow<=fonte.headerRow+1)return {ok:true,resultados:[],total:0,limitado:false};
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol);
  var raw=range.getValues(),display=range.getDisplayValues(),resultados=[];
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(!morador.nome)continue;
    var hay=moradoresAdminV1NormalizarBusca_([morador.nome,morador.cpf,morador.cns,morador.nascimento,morador.localidade,morador.nomeMae,morador.nomePai].join(' '));
    if(hay.indexOf(q)===-1)continue;
    var origem={aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i};
    var chave=moradoresAdminV1ChaveRegistro_(morador);
    var meta=metaMap.porChave[chave]||metaMap.porOrigem[moradoresAdminV1ChaveOrigem_(origem)]||null;
    resultados.push(moradoresAdminV1ComMeta_(morador,origem,meta,chave));
    if(resultados.length>=TACS_MORADORES_ADMIN_V1.MAX_SEARCH_RESULTS)break;
  }
  return {ok:true,resultados:resultados,total:resultados.length,limitado:resultados.length>=TACS_MORADORES_ADMIN_V1.MAX_SEARCH_RESULTS};
}

function moradoresAdminV1Salvar_(p){
  var body=moradoresAdminV1ParsePayload_(p.payload);
  var fonte=moradoresAdminV1LocalizarFonte_();
  var dados={
    nome:moradoresAdminV1Texto_(body.nome),
    nascimento:moradoresAdminV1DataBr_(body.nascimento),
    cpf:moradoresAdminV1Digitos_(body.cpf),
    cns:moradoresAdminV1Digitos_(body.cns),
    localidade:moradoresAdminV1Texto_(body.localidade)||TACS_MORADORES_ADMIN_V1.AREA_NOME,
    nomeMae:moradoresAdminV1Texto_(body.nomeMae),
    nomePai:moradoresAdminV1Texto_(body.nomePai)
  };
  moradoresAdminV1ValidarDadosMorador_(dados);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(15000))throw new Error('O cadastro está sendo atualizado. Tente novamente.');
  try{
    var origemAba=moradoresAdminV1Texto_(body.origemAba),origemLinha=Number(body.origemLinha||0),existing=null;
    if(origemAba&&origemLinha>0)existing=moradoresAdminV1LerPorOrigem_(fonte.ss,origemAba,origemLinha);
    if(!existing&&(dados.cpf||dados.cns)){
      var porDocumento=moradoresAdminV1LocalizarTodosPorDocumento_(fonte.ss,dados.cpf,dados.cns);
      if(porDocumento.length>1)throw new Error('Há mais de um cadastro com este CPF/CNS. Faça a revisão antes de editar.');
      if(porDocumento.length===1)existing=porDocumento[0];
    }
    if(!existing&&!dados.cpf&&!dados.cns&&moradoresAdminV1LocalizarPorIdentidade_(fonte,dados)){
      throw new Error('Existe um possível cadastro da mesma pessoa sem CPF/CNS. Abra esse cadastro e edite, em vez de criar outro.');
    }
    var ignorar=existing&&existing.origem?existing.origem:null;
    if(moradoresAdminV1LocalizarDuplicado_(fonte.ss,dados.cpf,dados.cns,ignorar))throw new Error('Já existe outro cadastro com este CPF/CNS. Revise antes de salvar.');
    var origem,criado=false,metaAnterior=null,chaveAnterior='';
    if(existing){
      origem=existing.origem;
      chaveAnterior=moradoresAdminV1ChaveRegistro_(existing.morador);
      metaAnterior=moradoresAdminV1EncontrarMeta_(fonte.ss,chaveAnterior,origem,moradoresAdminV1Texto_(body.moradorId));
      moradoresAdminV1EscreverLinha_(fonte.ss,origem.aba,origem.linha,dados);
    }else{
      origem=moradoresAdminV1AdicionarLinha_(fonte,dados);
      criado=true;
    }
    var novaChave=moradoresAdminV1ChaveRegistro_(dados);
    var meta=moradoresAdminV1UpsertMeta_(fonte.ss,{
      chave:novaChave,
      chaveAnterior:chaveAnterior,
      moradorId:moradoresAdminV1Texto_(body.moradorId)||(metaAnterior&&metaAnterior.moradorId)||'',
      origem:origem,
      dados:dados,
      situacao:(metaAnterior&&metaAnterior.situacao)||'ATIVO',
      motivo:(metaAnterior&&metaAnterior.motivo)||''
    });
    SpreadsheetApp.flush();
    return {ok:true,criado:criado,message:criado?'Morador cadastrado.':'Cadastro do morador atualizado.',morador:moradoresAdminV1ComMeta_(dados,origem,meta,novaChave)};
  }finally{lock.releaseLock();}
}

function moradoresAdminV1Situacao_(p){
  var body=moradoresAdminV1ParsePayload_(p.payload),situacao=moradoresAdminV1Texto_(body.situacao).toUpperCase();
  if(['ATIVO','FORA_DA_AREA','FALECIDO','TRANSFERIDO'].indexOf(situacao)===-1)throw new Error('Situação cadastral inválida.');
  var origem={aba:moradoresAdminV1Texto_(body.origemAba),linha:Number(body.origemLinha||0)};
  if(!origem.aba||origem.linha<1)throw new Error('Origem do cadastro ausente.');
  var fonte=moradoresAdminV1LocalizarFonte_(),registro=moradoresAdminV1LerPorOrigem_(fonte.ss,origem.aba,origem.linha);
  if(!registro)throw new Error('O cadastro não foi localizado na planilha.');
  var chave=moradoresAdminV1ChaveRegistro_(registro.morador);
  var metaAnterior=moradoresAdminV1EncontrarMeta_(fonte.ss,chave,origem,moradoresAdminV1Texto_(body.moradorId));
  var meta=moradoresAdminV1UpsertMeta_(fonte.ss,{
    chave:chave,
    chaveAnterior:chave,
    moradorId:moradoresAdminV1Texto_(body.moradorId)||(metaAnterior&&metaAnterior.moradorId)||'',
    origem:origem,
    dados:registro.morador,
    situacao:situacao,
    motivo:moradoresAdminV1Texto_(body.motivo)
  });
  SpreadsheetApp.flush();
  return {ok:true,message:'Situação cadastral atualizada.',morador:moradoresAdminV1ComMeta_(registro.morador,origem,meta,chave)};
}

function moradoresAdminV1ValidarDadosMorador_(dados){
  if(!dados.nome)throw new Error('Informe o nome do morador.');
  if(!dados.nascimento)throw new Error('Informe uma data de nascimento válida.');
  if(dados.cpf&&(!/^[0-9]{11}$/.test(dados.cpf)||!moradoresAdminV1CpfValido_(dados.cpf)))throw new Error('CPF inválido.');
  if(dados.cns&&!/^[0-9]{15}$/.test(dados.cns))throw new Error('O CNS deve conter 15 números.');
  if(!dados.cpf&&!dados.cns&&!dados.nomeMae)throw new Error('Morador sem CPF/CNS: informe ao menos o nome da mãe para reduzir risco de duplicidade.');
}

function moradoresAdminV1LocalizarFonte_(){
  var ss=SpreadsheetApp.openById(TACS_MORADORES_ADMIN_V1.SPREADSHEET_ID),sheets=ss.getSheets(),best=null;
  sheets.forEach(function(sheet){
    if(sheet.getName()===TACS_MORADORES_ADMIN_V1.META_SHEET)return;
    var lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
    if(lastRow<2||lastCol<2)return;
    var scan=sheet.getRange(1,1,Math.min(lastRow,TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues();
    var header=moradoresAdminV1DetectarCabecalho_(scan);
    if(!header)return;
    var score=header.score+moradoresAdminV1PrioridadeAba_(sheet.getName());
    if(!best||score>best.score)best={ss:ss,sheet:sheet,headerRow:header.row,map:moradoresAdminV1CompletarMapa_(header.map,lastCol),score:score};
  });
  if(!best)throw new Error('Não foi possível localizar a tabela de moradores na planilha atual.');
  return best;
}

function moradoresAdminV1DetectarCabecalho_(rows){
  var best=null;
  for(var i=0;i<rows.length;i++){
    var map=moradoresAdminV1MapearCabecalhos_(rows[i]),score=0;
    if(map.cpf>=0||map.cns>=0)score+=6;
    if(map.nome>=0)score+=4;
    if(map.nascimento>=0)score+=2;
    if(map.localidade>=0)score+=1;
    if(map.nomeMae>=0)score+=3;
    if(map.nomePai>=0)score+=3;
    if(!best||score>best.score)best={row:i,map:map,score:score};
  }
  return best&&best.score>=8?best:null;
}

function moradoresAdminV1MapearCabecalhos_(headers){
  return {
    nome:moradoresAdminV1Coluna_(headers,['nome','nome completo','nome do morador','morador','nome da pessoa','usuario','usuário']),
    nascimento:moradoresAdminV1Coluna_(headers,['data de nascimento','nascimento','data nascimento','dt nascimento','dn','data nasc']),
    cpf:moradoresAdminV1Coluna_(headers,['cpf','numero do cpf','número do cpf','cpf do morador','documento cpf']),
    cns:moradoresAdminV1Coluna_(headers,['cns','cartao nacional de saude','cartão nacional de saúde','cartao sus','cartão sus','numero do cns','número do cns','numero do cartao sus','número do cartão sus']),
    localidade:moradoresAdminV1Coluna_(headers,['localidade','comunidade','endereco','endereço','endereco completo','endereço completo','onde mora','sitio','sítio','area','área','microarea','microárea']),
    nomeMae:moradoresAdminV1Coluna_(headers,['nome da mae','nome da mãe','mae','mãe','nome mae','nome mãe','genitora','nome da genitora','filiacao mae','filiação mãe','filiacao materna','filiação materna','filiacao 1','filiação 1']),
    nomePai:moradoresAdminV1Coluna_(headers,['nome do pai','pai','nome pai','genitor','nome do genitor','filiacao pai','filiação pai','filiacao paterna','filiação paterna','filiacao 2','filiação 2'])
  };
}

function moradoresAdminV1Coluna_(headers,aliases){
  var wanted=aliases.map(moradoresAdminV1NormalizarChave_);
  for(var i=0;i<headers.length;i++)if(wanted.indexOf(moradoresAdminV1NormalizarChave_(headers[i]))!==-1)return i;
  for(var c=0;c<headers.length;c++){
    var key=moradoresAdminV1NormalizarChave_(headers[c]);if(!key)continue;
    for(var a=0;a<wanted.length;a++)if(wanted[a].length>=6&&(key.indexOf(wanted[a])!==-1||wanted[a].indexOf(key)!==-1))return c;
  }
  return -1;
}

function moradoresAdminV1CompletarMapa_(map,total){
  var out={nome:map.nome,nascimento:map.nascimento,cpf:map.cpf,cns:map.cns,localidade:map.localidade,nomeMae:map.nomeMae,nomePai:map.nomePai};
  if(total>=8){if(out.nome<0)out.nome=0;if(out.nascimento<0)out.nascimento=1;if(out.cpf<0)out.cpf=2;if(out.cns<0)out.cns=3;if(out.localidade<0)out.localidade=4;if(out.nomeMae<0)out.nomeMae=6;if(out.nomePai<0)out.nomePai=7;}
  return out;
}

function moradoresAdminV1PrioridadeAba_(name){
  var key=moradoresAdminV1NormalizarChave_(name);
  if(key.indexOf('morador')!==-1)return 5;
  if(key.indexOf('cadastro')!==-1)return 4;
  if(key.indexOf('famil')!==-1)return 3;
  if(key.indexOf('usuario')!==-1)return 2;
  return 0;
}

function moradoresAdminV1MontarMorador_(display,raw,map){
  return {
    nome:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.nome)),
    nascimento:moradoresAdminV1FormatarNascimento_(moradoresAdminV1Valor_(raw,map.nascimento),moradoresAdminV1Valor_(display,map.nascimento)),
    cpf:moradoresAdminV1Digitos_(moradoresAdminV1Valor_(display,map.cpf)),
    cns:moradoresAdminV1Digitos_(moradoresAdminV1Valor_(display,map.cns)),
    localidade:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.localidade)),
    nomeMae:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.nomeMae)),
    nomePai:moradoresAdminV1Texto_(moradoresAdminV1Valor_(display,map.nomePai))
  };
}

function moradoresAdminV1EscreverLinha_(ss,aba,row,dados){
  var sheet=ss.getSheetByName(aba);if(!sheet)throw new Error('A aba de origem não existe mais.');
  var lastCol=sheet.getLastColumn();
  var scan=sheet.getRange(1,1,Math.min(sheet.getLastRow(),TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues();
  var header=moradoresAdminV1DetectarCabecalho_(scan);if(!header)throw new Error('Cabeçalho de moradores não localizado.');
  var map=moradoresAdminV1CompletarMapa_(header.map,lastCol);if(row<=header.row+1||row>sheet.getLastRow())throw new Error('Linha de morador inválida.');
  moradoresAdminV1SetCell_(sheet,row,map.nome,dados.nome);
  moradoresAdminV1SetCell_(sheet,row,map.nascimento,moradoresAdminV1DataObjeto_(dados.nascimento),'dd/MM/yyyy');
  moradoresAdminV1SetCell_(sheet,row,map.cpf,dados.cpf,'@');
  moradoresAdminV1SetCell_(sheet,row,map.cns,dados.cns,'@');
  moradoresAdminV1SetCell_(sheet,row,map.localidade,dados.localidade);
  moradoresAdminV1SetCell_(sheet,row,map.nomeMae,dados.nomeMae);
  moradoresAdminV1SetCell_(sheet,row,map.nomePai,dados.nomePai);
}

function moradoresAdminV1AdicionarLinha_(fonte,dados){
  var sheet=fonte.sheet,row=sheet.getLastRow()+1,width=sheet.getLastColumn(),values=new Array(width).fill('');
  function put(index,value){if(index>=0&&index<values.length)values[index]=value;}
  put(fonte.map.nome,dados.nome);put(fonte.map.nascimento,moradoresAdminV1DataObjeto_(dados.nascimento));put(fonte.map.cpf,dados.cpf);put(fonte.map.cns,dados.cns);put(fonte.map.localidade,dados.localidade);put(fonte.map.nomeMae,dados.nomeMae);put(fonte.map.nomePai,dados.nomePai);
  sheet.getRange(row,1,1,width).setValues([values]);
  if(fonte.map.nascimento>=0)sheet.getRange(row,fonte.map.nascimento+1).setNumberFormat('dd/MM/yyyy');
  if(fonte.map.cpf>=0)sheet.getRange(row,fonte.map.cpf+1).setNumberFormat('@');
  if(fonte.map.cns>=0)sheet.getRange(row,fonte.map.cns+1).setNumberFormat('@');
  return {aba:sheet.getName(),linha:row};
}

function moradoresAdminV1SetCell_(sheet,row,index,value,format){if(index<0)return;var cell=sheet.getRange(row,index+1);cell.setValue(value);if(format)cell.setNumberFormat(format);}

function moradoresAdminV1LerPorOrigem_(ss,aba,row){
  var sheet=ss.getSheetByName(aba);if(!sheet||row<1||row>sheet.getLastRow())return null;
  var lastCol=sheet.getLastColumn(),scan=sheet.getRange(1,1,Math.min(sheet.getLastRow(),TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues();
  var header=moradoresAdminV1DetectarCabecalho_(scan);if(!header||row<=header.row+1)return null;
  var map=moradoresAdminV1CompletarMapa_(header.map,lastCol),range=sheet.getRange(row,1,1,lastCol),raw=range.getValues()[0],display=range.getDisplayValues()[0],morador=moradoresAdminV1MontarMorador_(display,raw,map);
  return morador.nome?{origem:{aba:aba,linha:row},morador:morador}:null;
}

function moradoresAdminV1LocalizarTodosPorDocumento_(ss,cpf,cns){
  if(!cpf&&!cns)return [];
  var out=[];
  ss.getSheets().forEach(function(sheet){
    if(sheet.getName()===TACS_MORADORES_ADMIN_V1.META_SHEET)return;
    var lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();if(lastRow<2||lastCol<2)return;
    var scan=sheet.getRange(1,1,Math.min(lastRow,TACS_MORADORES_ADMIN_V1.MAX_HEADER_ROWS),lastCol).getDisplayValues(),header=moradoresAdminV1DetectarCabecalho_(scan);if(!header)return;
    var map=moradoresAdminV1CompletarMapa_(header.map,lastCol),count=lastRow-(header.row+1);if(count<=0)return;
    var range=sheet.getRange(header.row+2,1,count,lastCol),raw=range.getValues(),display=range.getDisplayValues();
    for(var i=0;i<display.length;i++){
      var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],map);
      if((cpf&&morador.cpf===cpf)||(cns&&morador.cns===cns))out.push({origem:{aba:sheet.getName(),linha:header.row+2+i},morador:morador});
    }
  });
  return out;
}

function moradoresAdminV1LocalizarDuplicado_(ss,cpf,cns,ignore){
  if(!cpf&&!cns)return false;
  return moradoresAdminV1LocalizarTodosPorDocumento_(ss,cpf,cns).some(function(item){return !ignore||item.origem.aba!==ignore.aba||item.origem.linha!==ignore.linha;});
}

function moradoresAdminV1LocalizarPorIdentidade_(fonte,dados){
  var target=moradoresAdminV1ChaveIdentidade_(dados);if(!target)return null;
  var lastRow=fonte.sheet.getLastRow(),lastCol=fonte.sheet.getLastColumn();if(lastRow<=fonte.headerRow+1)return null;
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,lastRow-(fonte.headerRow+1),lastCol),raw=range.getValues(),display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(moradoresAdminV1ChaveIdentidade_(morador)===target)return {origem:{aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i},morador:morador};
  }
  return null;
}

function moradoresAdminV1GarantirMeta_(ss){
  var sheet=ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET);
  var headers=['ID_INTERNO','CHAVE_INTERNA','ABA_ORIGEM','LINHA_ORIGEM','DOC_PRIMARIO','DOC_SECUNDARIO','SITUACAO_PORTAL','MOTIVO_SITUACAO','AREA_INTERNA','ATUALIZADO_EM'];
  if(!sheet)sheet=ss.insertSheet(TACS_MORADORES_ADMIN_V1.META_SHEET);
  if(sheet.getLastRow()===0)sheet.getRange(1,1,1,headers.length).setValues([headers]);
  else{
    var atual=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
    if(headers.some(function(valor,index){return String(atual[index]||'')!==valor;}))throw new Error('A aba de metadados existe com estrutura diferente. Nenhuma alteração foi feita.');
  }
  sheet.setFrozenRows(1);return sheet;
}

function moradoresAdminV1LerMetaMap_(ss){
  var sheet=ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET),out={porChave:{},porOrigem:{},porId:{}};
  if(!sheet||sheet.getLastRow()<2)return out;
  var rows=sheet.getRange(2,1,sheet.getLastRow()-1,10).getValues();
  rows.forEach(function(row,index){
    var meta=moradoresAdminV1MetaDeLinha_(row,index+2);
    if(meta.chave)out.porChave[meta.chave]=meta;
    if(meta.aba&&meta.linha>0)out.porOrigem[moradoresAdminV1ChaveOrigem_({aba:meta.aba,linha:meta.linha})]=meta;
    if(meta.moradorId)out.porId[meta.moradorId]=meta;
  });
  return out;
}

function moradoresAdminV1EncontrarMeta_(ss,chave,origem,moradorId){
  var map=moradoresAdminV1LerMetaMap_(ss);
  if(moradorId&&map.porId[moradorId])return map.porId[moradorId];
  if(chave&&map.porChave[chave])return map.porChave[chave];
  var origemKey=moradoresAdminV1ChaveOrigem_(origem);
  return origemKey&&map.porOrigem[origemKey]?map.porOrigem[origemKey]:null;
}

function moradoresAdminV1MetaDeLinha_(row,sheetRow){
  return {sheetRow:sheetRow,moradorId:moradoresAdminV1Texto_(row[0]),chave:moradoresAdminV1Texto_(row[1]),aba:moradoresAdminV1Texto_(row[2]),linha:Number(row[3]||0),cpf:moradoresAdminV1Digitos_(row[4]),cns:moradoresAdminV1Digitos_(row[5]),situacao:moradoresAdminV1Texto_(row[6])||'ATIVO',motivo:moradoresAdminV1Texto_(row[7]),areaId:moradoresAdminV1Texto_(row[8])||TACS_MORADORES_ADMIN_V1.AREA_ID,atualizadoEm:row[9]};
}

function moradoresAdminV1UpsertMeta_(ss,input){
  var sheet=moradoresAdminV1GarantirMeta_(ss),map=moradoresAdminV1LerMetaMap_(ss),existing=null;
  if(input.moradorId&&map.porId[input.moradorId])existing=map.porId[input.moradorId];
  else if(input.chaveAnterior&&map.porChave[input.chaveAnterior])existing=map.porChave[input.chaveAnterior];
  else if(input.chave&&map.porChave[input.chave])existing=map.porChave[input.chave];
  else{var origemKey=moradoresAdminV1ChaveOrigem_(input.origem);if(origemKey&&map.porOrigem[origemKey])existing=map.porOrigem[origemKey];}
  var moradorId=(existing&&existing.moradorId)||input.moradorId||('MOR-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase());
  var values=[moradorId,input.chave,input.origem.aba,input.origem.linha,input.dados.cpf||'',input.dados.cns||'',input.situacao||'ATIVO',input.motivo||'',TACS_MORADORES_ADMIN_V1.AREA_ID,new Date()];
  var row=existing&&existing.sheetRow?existing.sheetRow:sheet.getLastRow()+1;
  sheet.getRange(row,1,1,10).setValues([values]);sheet.getRange(row,10).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  return {moradorId:moradorId,chave:input.chave,aba:input.origem.aba,linha:input.origem.linha,situacao:input.situacao||'ATIVO',motivo:input.motivo||'',areaId:TACS_MORADORES_ADMIN_V1.AREA_ID,atualizadoEm:new Date()};
}

function moradoresAdminV1ChaveRegistro_(morador){if(morador.cpf)return 'CPF:'+morador.cpf;if(morador.cns)return 'CNS:'+morador.cns;return 'SEM_DOC:'+moradoresAdminV1Hash_(moradoresAdminV1ChaveIdentidade_(morador));}
function moradoresAdminV1ChaveIdentidade_(morador){return [moradoresAdminV1NormalizarBusca_(morador.nome),moradoresAdminV1DataBr_(morador.nascimento),moradoresAdminV1NormalizarBusca_(morador.nomeMae),moradoresAdminV1NormalizarBusca_(morador.localidade)].join('|');}
function moradoresAdminV1ChaveOrigem_(origem){if(!origem||!origem.aba||!Number(origem.linha||0))return '';return moradoresAdminV1Texto_(origem.aba)+'#'+Number(origem.linha);}
function moradoresAdminV1ComMeta_(morador,origem,meta,chave){return {moradorId:meta&&meta.moradorId||'',chave:chave,origemAba:origem.aba,origemLinha:origem.linha,nome:morador.nome,nascimento:morador.nascimento,cpf:morador.cpf,cns:morador.cns,localidade:morador.localidade,nomeMae:morador.nomeMae,nomePai:morador.nomePai,situacao:meta&&meta.situacao||'ATIVO',motivo:meta&&meta.motivo||'',areaId:meta&&meta.areaId||TACS_MORADORES_ADMIN_V1.AREA_ID};}

function moradoresAdminV1EscritaHabilitada_(){return moradoresAdminV1FlagProperty_(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY);}
function moradoresAdminV1SituacaoHabilitada_(){return moradoresAdminV1FlagProperty_(TACS_MORADORES_ADMIN_V1.STATUS_PROPERTY);}
function moradoresAdminV1FlagProperty_(nome){var valor=String(PropertiesService.getScriptProperties().getProperty(nome)||'').trim().toUpperCase();return ['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(valor)!==-1;}
function moradoresAdminV1ExigirEscrita_(){if(!moradoresAdminV1EscritaHabilitada_())throw new Error('A escrita de moradores ainda está bloqueada pela etapa de estabilização.');}
function moradoresAdminV1ExigirSituacao_(){moradoresAdminV1ExigirEscrita_();if(!moradoresAdminV1SituacaoHabilitada_())throw new Error('A mudança de situação ainda está bloqueada até o filtro do Portal do Morador ser validado.');}

function moradoresAdminV1ValidarSessao_(p){
  if(typeof profissionaisDinamicosV1ValidarSessao_==='function')return profissionaisDinamicosV1ValidarSessao_(p);
  if(typeof tacsPushV1ValidarSessao_==='function')return tacsPushV1ValidarSessao_(p);
  throw new Error('Não foi possível validar a sessão administrativa. Entre novamente com o PIN.');
}

function moradoresAdminV1ValidarRequestId_(valor){var id=moradoresAdminV1Texto_(valor);if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da operação de moradores inválido.');return id;}
function moradoresAdminV1GuardarResultado_(requestId,resultado){try{CacheService.getScriptCache().put(TACS_MORADORES_ADMIN_V1.RESULT_PREFIX+requestId,JSON.stringify(resultado),TACS_MORADORES_ADMIN_V1.RESULT_SECONDS);}catch(erro){}}
function moradoresAdminV1LerResultado_(requestId){try{var texto=CacheService.getScriptCache().get(TACS_MORADORES_ADMIN_V1.RESULT_PREFIX+requestId);return texto?JSON.parse(texto):null;}catch(erro){return null;}}

function moradoresAdminV1ResponderPost_(requestId,resultado){
  var mensagem={source:'admin-moradores-tacs-v1',requestId:requestId,result:resultado};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function moradoresAdminV1ResponderJson_(dados,callback){
  var json=JSON.stringify(dados),cb=moradoresAdminV1Texto_(callback);
  if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function moradoresAdminV1ParsePayload_(text){try{return JSON.parse(String(text||'{}'));}catch(erro){throw new Error('Dados enviados ao servidor são inválidos.');}}
function moradoresAdminV1Valor_(arr,index){return !arr||index<0||index>=arr.length?'':arr[index];}
function moradoresAdminV1Texto_(valor){return String(valor==null?'':valor).replace(/\s+/g,' ').trim();}
function moradoresAdminV1Digitos_(valor){return String(valor==null?'':valor).replace(/\D/g,'');}
function moradoresAdminV1NormalizarChave_(valor){var texto=String(valor==null?'':valor).toLowerCase();if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return texto.replace(/[^a-z0-9]/g,'');}
function moradoresAdminV1NormalizarBusca_(valor){var texto=String(valor==null?'':valor).toLowerCase();if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return texto.replace(/[^a-z0-9]+/g,' ').trim();}
function moradoresAdminV1DataBr_(valor){
  var texto=moradoresAdminV1Texto_(valor),match=texto.match(/^(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})$/);
  if(!match){var iso=texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(iso)match=[texto,iso[3],iso[2],iso[1]];}
  if(!match)return '';
  var dia=Number(match[1]),mes=Number(match[2]),ano=Number(match[3]),data=new Date(ano,mes-1,dia,12,0,0);
  if(data.getFullYear()!==ano||data.getMonth()!==mes-1||data.getDate()!==dia)return '';
  return ('0'+dia).slice(-2)+'/'+('0'+mes).slice(-2)+'/'+ano;
}
function moradoresAdminV1DataObjeto_(br){var partes=moradoresAdminV1DataBr_(br).split('/');if(partes.length!==3)return '';return new Date(Number(partes[2]),Number(partes[1])-1,Number(partes[0]),12,0,0);}
function moradoresAdminV1FormatarNascimento_(raw,display){if(Object.prototype.toString.call(raw)==='[object Date]'&&!isNaN(raw.getTime()))return Utilities.formatDate(raw,TACS_MORADORES_ADMIN_V1.TIMEZONE,'dd/MM/yyyy');return moradoresAdminV1DataBr_(display||raw)||moradoresAdminV1Texto_(display||raw);}
function moradoresAdminV1Hash_(valor){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(valor),Utilities.Charset.UTF_8);return bytes.map(function(byte){var n=byte<0?byte+256:byte;return ('0'+n.toString(16)).slice(-2);}).join('').slice(0,24);}
function moradoresAdminV1MensagemErro_(erro){return moradoresAdminV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500);}
function moradoresAdminV1CpfValido_(cpf){
  var d=moradoresAdminV1Digitos_(cpf);if(!/^\d{11}$/.test(d)||/^(\d)\1{10}$/.test(d))return false;
  var soma=0,i;for(i=0;i<9;i++)soma+=Number(d.charAt(i))*(10-i);var primeiro=(soma*10)%11;if(primeiro===10)primeiro=0;if(primeiro!==Number(d.charAt(9)))return false;
  soma=0;for(i=0;i<10;i++)soma+=Number(d.charAt(i))*(11-i);var segundo=(soma*10)%11;if(segundo===10)segundo=0;return segundo===Number(d.charAt(10));
}

/** Diagnóstico seguro: não grava nem altera moradores. */
function testarConfiguracaoMoradoresAdminPortalV1(){
  var fonte=moradoresAdminV1LocalizarFonte_(),meta=fonte.ss.getSheetByName(TACS_MORADORES_ADMIN_V1.META_SHEET);
  var resultado={ok:true,versao:TACS_MORADORES_ADMIN_V1.VERSAO,areaId:TACS_MORADORES_ADMIN_V1.AREA_ID,abaFonte:fonte.sheet.getName(),linhaCabecalho:fonte.headerRow+1,totalRegistros:Math.max(0,fonte.sheet.getLastRow()-(fonte.headerRow+1)),metaExiste:Boolean(meta),escritaHabilitada:moradoresAdminV1EscritaHabilitada_(),situacaoHabilitada:moradoresAdminV1SituacaoHabilitada_(),nenhumaAlteracaoRealizada:true};
  console.log(JSON.stringify(resultado));return resultado;
}

function ativarEscritaMoradoresAdminPortalV1(){
  var teste=testarConfiguracaoMoradoresAdminPortalV1();
  PropertiesService.getScriptProperties().setProperty(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY,'TRUE');
  return {ok:true,message:'Escrita diária de moradores habilitada.',versao:teste.versao,situacaoContinuaBloqueada:!moradoresAdminV1SituacaoHabilitada_()};
}

function desativarEscritaMoradoresAdminPortalV1(){
  PropertiesService.getScriptProperties().setProperty(TACS_MORADORES_ADMIN_V1.WRITES_PROPERTY,'FALSE');
  return {ok:true,message:'Escrita de moradores bloqueada.'};
}
