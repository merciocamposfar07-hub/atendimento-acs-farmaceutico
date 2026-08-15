/**
 * ZZZZ_18_ImportacaoCsvMoradoresV1.gs
 * Portal TACS — importação auditável de moradores por CSV V1.0.1
 *
 * Fluxo obrigatório: prévia no servidor -> confirmação -> gravação em lote.
 * Duplicidades e conflitos nunca são resolvidos silenciosamente. Registros
 * existentes recebem somente campos que estavam vazios. A reversão não apaga
 * linhas: restaura campos preenchidos e marca novos registros como
 * IMPORTACAO_DESFEITA, preservando IDs, linhas e auditoria.
 */
var TACS_CSV_MORADORES_V1 = Object.freeze({
  VERSAO:'1.0.1',
  TIMEZONE:'America/Recife',
  RESULT_PREFIX:'tacs_csv_moradores_v1_result_',
  RESULT_SECONDS:300,
  PREVIEW_PREFIX:'tacs_csv_moradores_v1_previa_',
  PREVIEW_SECONDS:600,
  MAX_BYTES:2097152,
  MAX_ROWS:5000,
  MAX_COMMIT_ROWS:1000,
  MAX_PREVIEW_ROWS:200,
  BATCH_SHEET:'TACS_IMPORTACOES_MORADORES',
  ITEM_SHEET:'TACS_IMPORTACOES_ITENS',
  REVERTED_STATUS:'IMPORTACAO_DESFEITA',
  BATCH_HEADERS:Object.freeze([
    'LOTE_ID','AREA_ID','ARQUIVO','OPERADOR_ID','STATUS','TOTAL_SELECIONADO',
    'NOVOS','MESCLADOS','IGNORADOS','CRIADO_EM','DESFEITO_EM','RESUMO'
  ]),
  ITEM_HEADERS:Object.freeze([
    'LOTE_ID','TIPO','ABA','LINHA','ID_PORTAL','MORADOR_ID','CAMPOS_JSON',
    'VALORES_JSON','ASSINATURA','REGISTRADO_EM'
  ]),
  FIELDS:Object.freeze([
    'idPortal','id','cpf','cns','nome','nascimento','idade','sexo','endereco','celular',
    'telefoneContato','microarea','equipe','origem','ultimaAtualizacao','status',
    'consentimentoWhatsapp','dataConsentimento','dataCadastroPortal','observacoes'
  ]),
  MERGE_FIELDS:Object.freeze([
    'cpf','cns','nome','nascimento','sexo','endereco','celular','telefoneContato',
    'microarea','equipe','consentimentoWhatsapp','dataConsentimento','observacoes'
  ])
});

var TACS_CSV_MORADORES_V1_HEADER_ALIASES = Object.freeze({
  idPortal:['IDPORTAL'],id:['ID','IDCIDADAO','CODIGOCIDADAO','PRONTUARIO'],
  cpf:['CPF','CPFCIDADAO','CPFDOCIDADAO'],
  cns:['CNS','CNSCIDADAO','CNSDOCIDADAO','CARTAOSUS','CARTAONACIONALDESAUDE','CARTAONACIONALSUS'],
  nome:['NOME','NOMECOMPLETO','NOMECIDADAO','NOMEDOCIDADAO','CIDADAO'],
  nascimento:['DATANASCIMENTO','DATADENASCIMENTO','NASCIMENTO','DTNASCIMENTO'],
  idade:['IDADE'],sexo:['SEXO','SEXOBIOLOGICO'],
  endereco:['ENDERECO','ENDERECOCOMPLETO','ENDERECODODOMICILIO','LOCALIDADE','LOGRADOURO'],
  celular:['CELULAR','TELEFONECELULAR','TELEFONESCELULARES'],
  telefoneContato:['TELEFONECONTATO','TELEFONESDECONTATO','TELEFONE','TELEFONES'],
  microarea:['MICROAREA','MICROAREARESPONSAVEL'],
  equipe:['EQUIPE','NOMEDAEQUIPE','EQUIPEVINCULADA','EQUIPERESPONSAVEL'],
  origem:['ORIGEM'],ultimaAtualizacao:['ULTIMAATUALIZACAO','DATAULTIMAATUALIZACAO'],
  status:['STATUS','SITUACAO'],consentimentoWhatsapp:['CONSENTIMENTOWHATSAPP'],
  dataConsentimento:['DATACONSENTIMENTO'],dataCadastroPortal:['DATACADASTROPORTAL'],
  observacoes:['OBSERVACOES','OBSERVACAO']
});

var csvMoradoresV1DoGetAnterior_;
var csvMoradoresV1DoPostAnterior_;
var csvMoradoresV1GetAnterior_;
var csvMoradoresV1PostAnterior_;

(function instalarCsvMoradoresV1_(){
  if(typeof doGet==='function'){
    csvMoradoresV1DoGetAnterior_=doGet;
    doGet=function(e){var r=csvMoradoresV1TratarGet_(e);return r||csvMoradoresV1DoGetAnterior_(e);};
  }
  if(typeof doPost==='function'){
    csvMoradoresV1DoPostAnterior_=doPost;
    doPost=function(e){var r=csvMoradoresV1TratarPost_(e);return r||csvMoradoresV1DoPostAnterior_(e);};
  }
  if(typeof tratarGetPainelTacs_==='function'){
    csvMoradoresV1GetAnterior_=tratarGetPainelTacs_;
    tratarGetPainelTacs_=function(e){var r=csvMoradoresV1TratarGet_(e);return r||csvMoradoresV1GetAnterior_(e);};
  }
  if(typeof tratarPostPainelTacs_==='function'){
    csvMoradoresV1PostAnterior_=tratarPostPainelTacs_;
    tratarPostPainelTacs_=function(e){var r=csvMoradoresV1TratarPost_(e);return r||csvMoradoresV1PostAnterior_(e);};
  }
})();

function csvMoradoresV1TratarGet_(e){
  var p=e&&e.parameter?e.parameter:{};
  if(csvMoradoresV1Texto_(p.action).toLowerCase()!=='admin_csv_result')return null;
  try{
    var id=csvMoradoresV1ValidarRequestId_(p.requestId);
    var resultado=csvMoradoresV1LerResultado_(id);
    return csvMoradoresV1ResponderJson_({ok:true,pendente:!resultado,requestId:id,result:resultado||null},p.callback);
  }catch(erro){return csvMoradoresV1ResponderJson_({ok:false,message:csvMoradoresV1Erro_(erro)},p.callback);}
}

function csvMoradoresV1TratarPost_(e){
  var p=e&&e.parameter?e.parameter:{};
  var action=csvMoradoresV1Texto_(p.action).toLowerCase();
  if(['admin_csv_previa','admin_csv_importar','admin_csv_lotes','admin_csv_desfazer'].indexOf(action)===-1)return null;
  var resultado;
  try{
    var acesso=csvMoradoresV1Acesso_(p);
    var contexto=csvMoradoresV1Contexto_(acesso,p.areaId||p.area||'');
    if(action==='admin_csv_previa')resultado=csvMoradoresV1Previa_(p,contexto,acesso);
    else if(action==='admin_csv_importar')resultado=csvMoradoresV1Importar_(p,contexto,acesso);
    else if(action==='admin_csv_lotes')resultado=csvMoradoresV1Lotes_(contexto,acesso);
    else resultado=csvMoradoresV1Desfazer_(p,contexto,acesso);
  }catch(erro){resultado={ok:false,message:csvMoradoresV1Erro_(erro)};}
  var id=csvMoradoresV1Texto_(p.requestId);
  if(/^[A-Za-z0-9_-]{8,160}$/.test(id))csvMoradoresV1GuardarResultado_(id,resultado);
  return csvMoradoresV1ResponderPost_(id,resultado);
}

function csvMoradoresV1Acesso_(p){
  if(typeof tacsTerritorioV1ValidarAcesso_!=='function')throw new Error('O módulo de TACS e áreas precisa estar instalado antes da importação CSV.');
  var acesso=tacsTerritorioV1ValidarAcesso_(p,false);
  if(acesso.perfil==='TACS'&&(acesso.permissoes||[]).indexOf('MORADORES_IMPORTAR_CSV')===-1){
    throw new Error('Seu cadastro não possui permissão para importar CSV.');
  }
  return acesso;
}

function csvMoradoresV1Contexto_(acesso,areaId){
  if(typeof moradoresAdminV1ResolverContexto_!=='function')throw new Error('O backend de moradores 1.4.5 não está disponível.');
  var contexto=moradoresAdminV1ResolverContexto_(acesso,areaId||acesso.areaId);
  if(typeof tacsTerritorioV1EncontrarArea_==='function'){
    var area=tacsTerritorioV1EncontrarArea_(contexto.areaId);
    if(area){
      contexto.microareaPadrao=csvMoradoresV1Texto_(area.microareaPadrao)||'1';
      contexto.equipe=csvMoradoresV1Texto_(area.equipe);
    }
  }
  return contexto;
}

function csvMoradoresV1Previa_(p,contexto,acesso){
  var body=csvMoradoresV1Payload_(p.payload);
  var texto=csvMoradoresV1Decodificar_(body);
  var arquivo=csvMoradoresV1NomeArquivo_(body.arquivo||body.nomeArquivo);
  var parsed=csvMoradoresV1Parse_(texto,body.delimitador);
  var mapping=csvMoradoresV1Mapping_(parsed.headers,body.mapeamento);
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var analise=csvMoradoresV1Analisar_(parsed.rows,mapping,fonte,contexto,parsed.firstDataLine);
  var assinatura=csvMoradoresV1Token_(texto,mapping,contexto.areaId);
  var token=csvMoradoresV1CriarPrevia_(assinatura,contexto,acesso);
  return {
    ok:true,versao:TACS_CSV_MORADORES_V1.VERSAO,areaId:contexto.areaId,
    areaNome:contexto.areaNome,arquivo:arquivo,delimitador:parsed.delimiter,
    linhaCabecalho:parsed.headerRow+1,
    headers:parsed.headers,mapeamento:mapping,previewToken:token,
    resumo:analise.resumo,linhas:analise.itens.slice(0,TACS_CSV_MORADORES_V1.MAX_PREVIEW_ROWS).map(csvMoradoresV1ItemPublico_),
    limitado:analise.itens.length>TACS_CSV_MORADORES_V1.MAX_PREVIEW_ROWS,
    totalLinhas:analise.itens.length,nenhumaAlteracaoRealizada:true,
    regra:'Duplicidades e conflitos ficam ignorados até correção e nova prévia.'
  };
}

function csvMoradoresV1Importar_(p,contexto,acesso){
  if(typeof moradoresAdminV1ExigirEscrita_==='function')moradoresAdminV1ExigirEscrita_();
  var body=csvMoradoresV1Payload_(p.payload);
  var texto=csvMoradoresV1Decodificar_(body);
  var arquivo=csvMoradoresV1NomeArquivo_(body.arquivo||body.nomeArquivo);
  var parsed=csvMoradoresV1Parse_(texto,body.delimitador);
  var mapping=csvMoradoresV1Mapping_(parsed.headers,body.mapeamento);
  var esperado=csvMoradoresV1Token_(texto,mapping,contexto.areaId);
  csvMoradoresV1ValidarPrevia_(body.previewToken,esperado,contexto,acesso);
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Outra atualização de moradores está em andamento. Tente novamente.');
  try{
    var fonte=moradoresAdminV1LocalizarFonte_(contexto);
    var analise=csvMoradoresV1Analisar_(parsed.rows,mapping,fonte,contexto,parsed.firstDataLine);
    if(
      analise.itens.length>TACS_CSV_MORADORES_V1.MAX_PREVIEW_ROWS&&
      !csvMoradoresV1Booleano_(body.confirmarTodosImportaveis)
    ){
      throw new Error('A prévia possui mais linhas do que a tabela exibida. Confirme explicitamente a importação de todos os registros válidos do arquivo.');
    }
    var decisoes=csvMoradoresV1Decisoes_(body.decisoes);
    var selecionados=[];
    analise.itens.forEach(function(item){
      var acao=decisoes[String(item.linhaCsv)]||csvMoradoresV1AcaoPadrao_(item.status);
      if(acao==='IGNORAR')return;
      if(item.status==='NOVO'||item.status==='NOVO_SEM_DOCUMENTO'){
        if(acao!=='CRIAR')throw new Error('A linha '+item.linhaCsv+' só pode ser criada ou ignorada.');
      }else if(item.status==='MESCLAR'){
        if(acao!=='MESCLAR')throw new Error('A linha '+item.linhaCsv+' só pode ser mesclada ou ignorada.');
      }else{
        throw new Error('A linha '+item.linhaCsv+' possui '+item.status+' e precisa ser corrigida ou ignorada antes da importação.');
      }
      item.acao=acao;selecionados.push(item);
    });
    if(!selecionados.length)throw new Error('Nenhuma linha válida foi selecionada para importar.');
    if(selecionados.length>TACS_CSV_MORADORES_V1.MAX_COMMIT_ROWS)throw new Error('Importe no máximo '+TACS_CSV_MORADORES_V1.MAX_COMMIT_ROWS+' registros por lote.');

    var lote='CSV-'+Utilities.formatDate(new Date(),TACS_CSV_MORADORES_V1.TIMEZONE,'yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();
    csvMoradoresV1GarantirLogs_(fonte.ss);
    moradoresAdminV1GarantirMeta_(fonte.ss);
    moradoresAdminV1GarantirAuditoria_(fonte.ss);
    var novosPlanejados=[];
    var mesclasPlanejadas=[];
    var proximo=csvMoradoresV1NumeroId_(moradoresAdminV1ProximoIdPortal_(fonte));
    selecionados.forEach(function(item){
      if(item.acao==='CRIAR'){
        var dados=csvMoradoresV1Novo_(item.dados,fonte,lote,proximo++);
        novosPlanejados.push({tipo:'NOVO',dados:dados,campos:[],valores:{}});
      }else{
        var registro=item.existing;
        if(!registro||!registro.morador||!registro.raw){
          throw new Error('O cadastro da linha '+item.linhaCsv+' mudou durante a importação.');
        }
        var mescla=csvMoradoresV1MesclarVazios_(registro.morador,item.dados);
        if(!mescla.campos.length)return;
        var dadosMesclados=csvMoradoresV1PreservarMescla_(mescla,registro.morador,fonte);
        mesclasPlanejadas.push({
          tipo:'MESCLAR',dados:dadosMesclados,origem:registro.origem,antes:registro.morador,
          raw:registro.raw,campos:mescla.campos,valores:mescla.valores,assinatura:''
        });
      }
    });
    var operacoes=csvMoradoresV1AdicionarNovosEmLote_(fonte,novosPlanejados)
      .concat(csvMoradoresV1EscreverMesclasEmLote_(fonte,mesclasPlanejadas));
    if(!operacoes.length)throw new Error('Os registros selecionados não possuíam informações novas para gravar.');
    csvMoradoresV1MetasEAuditoria_(fonte,operacoes,contexto,lote);
    csvMoradoresV1RegistrarLote_(fonte.ss,lote,contexto,acesso,arquivo,selecionados.length,operacoes,analise.resumo);
    SpreadsheetApp.flush();
    moradoresAdminV1InvalidarResumo_(contexto);
    csvMoradoresV1ConsumirPrevia_(body.previewToken);
    var novos=operacoes.filter(function(x){return x.tipo==='NOVO';}).length;
    var mesclados=operacoes.filter(function(x){return x.tipo==='MESCLAR';}).length;
    return {
      ok:true,loteId:lote,areaId:contexto.areaId,novos:novos,mesclados:mesclados,
      ignorados:analise.itens.length-selecionados.length,
      message:'CSV importado. '+novos+' novo(s), '+mesclados+' mesclado(s). O lote pode ser desfeito sem excluir linhas.'
    };
  }finally{lock.releaseLock();}
}

function csvMoradoresV1Analisar_(rows,mapping,fonte,contexto,firstDataLine){
  var existentes=csvMoradoresV1IndexarFonte_(fonte);
  var preparados=[];
  firstDataLine=Number(firstDataLine||2);
  rows.forEach(function(row,index){
    if(row.every(function(v){return !csvMoradoresV1Texto_(v);} ))return;
    var item={linhaCsv:index+firstDataLine,status:'',erros:[],conflitos:[],dados:null,existing:null};
    try{
      item.dados=csvMoradoresV1Dados_(row,mapping,contexto);
      moradoresAdminV1ValidarDadosMorador_(item.dados,false);
    }catch(erro){item.status='ERRO_VALIDACAO';item.erros.push(csvMoradoresV1Erro_(erro));}
    preparados.push(item);
  });
  var contagens={},identidadesCsv={};
  preparados.forEach(function(item){
    if(!item.dados||item.status)return;
    csvMoradoresV1ChavesDocumento_(item.dados).forEach(function(chave){contagens[chave]=(contagens[chave]||0)+1;});
    var identidade=moradoresAdminV1ChaveIdentidade_(item.dados);
    if(identidade)identidadesCsv[identidade]=(identidadesCsv[identidade]||0)+1;
  });
  preparados.forEach(function(item){
    if(!item.dados||item.status)return;
    var chaves=csvMoradoresV1ChavesDocumento_(item.dados);
    if(chaves.some(function(chave){return contagens[chave]>1;})){
      item.status='DUPLICADO_NO_CSV';item.erros.push('CPF/CNS aparece em mais de uma linha deste CSV.');return;
    }
    var identidadeCsv=moradoresAdminV1ChaveIdentidade_(item.dados);
    if(identidadeCsv&&identidadesCsv[identidadeCsv]>1){
      item.status='DUPLICADO_NO_CSV';item.erros.push('Nome, nascimento e endereço aparecem em mais de uma linha deste CSV.');return;
    }
    var encontrados=[];
    chaves.forEach(function(chave){(existentes.documentos[chave]||[]).forEach(function(reg){if(!encontrados.some(function(x){return csvMoradoresV1Origem_(x.origem)===csvMoradoresV1Origem_(reg.origem);})){encontrados.push(reg);}});});
    if(encontrados.length>1){item.status='DUPLICIDADE_BASE';item.erros.push('O documento já aponta para mais de um cadastro na base.');return;}
    if(encontrados.length===1){
      item.existing=encontrados[0];
      item.conflitos=csvMoradoresV1Conflitos_(encontrados[0].morador,item.dados);
      if(item.conflitos.length){item.status='CONFLITO_DADOS';item.erros.push('Campos divergentes: '+item.conflitos.join(', ')+'.');}
      else{
        var possivelMescla=csvMoradoresV1MesclarVazios_(encontrados[0].morador,item.dados);
        item.status=possivelMescla.campos.length?'MESCLAR':'JA_EXISTE';
      }
      return;
    }
    if(!chaves.length){
      var identidade=moradoresAdminV1ChaveIdentidade_(item.dados);
      if(identidade&&existentes.identidades[identidade]){
        item.status='POSSIVEL_DUPLICADO';item.erros.push('Mesmo nome, nascimento e endereço já encontrados.');
      }else item.status='NOVO_SEM_DOCUMENTO';
      return;
    }
    item.status='NOVO';
  });
  var resumo={total:preparados.length};
  ['NOVO','NOVO_SEM_DOCUMENTO','MESCLAR','JA_EXISTE','CONFLITO_DADOS','DUPLICADO_NO_CSV','DUPLICIDADE_BASE','POSSIVEL_DUPLICADO','ERRO_VALIDACAO'].forEach(function(status){resumo[status]=preparados.filter(function(x){return x.status===status;}).length;});
  resumo.importaveis=resumo.NOVO+resumo.NOVO_SEM_DOCUMENTO+resumo.MESCLAR;
  resumo.bloqueados=resumo.total-resumo.importaveis-resumo.JA_EXISTE;
  return {itens:preparados,resumo:resumo};
}

function csvMoradoresV1IndexarFonte_(fonte){
  var out={documentos:{},identidades:{}};
  var last=fonte.sheet.getLastRow();
  if(last<=fonte.headerRow+1)return out;
  var range=fonte.sheet.getRange(fonte.headerRow+2,1,last-(fonte.headerRow+1),fonte.sheet.getLastColumn());
  var raw=range.getValues(),display=range.getDisplayValues();
  for(var i=0;i<display.length;i++){
    var morador=moradoresAdminV1MontarMorador_(display[i],raw[i],fonte.map);
    if(!morador.nome||moradoresAdminV1SituacaoOculta_(morador.status))continue;
    var reg={
      origem:{aba:fonte.sheet.getName(),linha:fonte.headerRow+2+i},
      morador:morador,raw:raw[i].slice()
    };
    csvMoradoresV1ChavesDocumento_(morador).forEach(function(chave){if(!out.documentos[chave])out.documentos[chave]=[];out.documentos[chave].push(reg);});
    var identidade=moradoresAdminV1ChaveIdentidade_(morador);if(identidade&&!out.identidades[identidade])out.identidades[identidade]=reg;
  }
  return out;
}

function csvMoradoresV1Dados_(row,mapping,contexto){
  var get=function(campo){var idx=mapping[campo];return idx==null||idx<0?'':row[idx];};
  var microareaCsv=get('microarea');
  var equipeCsv=get('equipe');
  var dados=moradoresAdminV1NormalizarDadosEntrada_({
    idPortal:get('idPortal'),id:get('id'),cpf:get('cpf'),cns:get('cns'),nome:get('nome'),
    nascimento:get('nascimento'),sexo:get('sexo'),endereco:get('endereco'),celular:get('celular'),
    telefoneContato:get('telefoneContato'),microarea:get('microarea'),equipe:get('equipe'),
    origem:get('origem'),status:get('status'),consentimentoWhatsapp:get('consentimentoWhatsapp'),
    dataConsentimento:get('dataConsentimento'),dataCadastroPortal:get('dataCadastroPortal'),
    observacoes:get('observacoes')
  },contexto);
  dados.id=csvMoradoresV1Texto_(get('id'));
  if(!csvMoradoresV1Texto_(microareaCsv)){
    dados.microarea=csvMoradoresV1Texto_(contexto.microareaPadrao)||'1';
  }
  if(!csvMoradoresV1Texto_(equipeCsv)){
    dados.equipe=csvMoradoresV1Texto_(contexto.equipe);
  }
  return dados;
}

function csvMoradoresV1Mapping_(headers,recebido){
  var map={};
  var manual=recebido&&typeof recebido==='object'?recebido:{};
  if(typeof recebido==='string'&&recebido){try{manual=JSON.parse(recebido);}catch(erro){throw new Error('O mapeamento de colunas é inválido.');}}
  TACS_CSV_MORADORES_V1.FIELDS.forEach(function(campo){
    var valor=manual[campo];
    if(Object.prototype.hasOwnProperty.call(manual,campo)){
      if(valor===undefined||valor===null||valor===''||Number(valor)===-1){map[campo]=-1;return;}
      var indice=Number(valor);
      if(!isFinite(indice)||indice<0||indice>=headers.length){
        indice=headers.indexOf(String(valor));
      }
      if(indice<0)throw new Error('A coluna mapeada para '+campo+' não existe no CSV.');
      map[campo]=indice;return;
    }
    map[campo]=csvMoradoresV1IndiceCabecalho_(campo,headers);
  });
  ['nome','nascimento','sexo'].forEach(function(campo){if(map[campo]<0)throw new Error('Mapeie a coluna obrigatória '+campo+'.');});
  return map;
}

function csvMoradoresV1Parse_(texto,delimitador){
  texto=String(texto||'').replace(/^\uFEFF/,'');
  if(!texto.trim())throw new Error('O arquivo CSV está vazio.');
  var delimiter=csvMoradoresV1Texto_(delimitador);
  if([',',';','\t','|'].indexOf(delimiter)===-1)delimiter=csvMoradoresV1DetectarDelimitador_(texto);
  var rows=Utilities.parseCsv(texto,delimiter);
  var located=csvMoradoresV1EncontrarCabecalho_(rows);
  if(!located){
    var redetected=csvMoradoresV1DetectarDelimitador_(texto);
    if(redetected!==delimiter){delimiter=redetected;rows=Utilities.parseCsv(texto,delimiter);located=csvMoradoresV1EncontrarCabecalho_(rows);}
  }
  if(!located)throw new Error('Não foi possível localizar a linha com os nomes das colunas neste CSV do e-SUS.');
  var headers=rows[located.index].map(function(v){return csvMoradoresV1Texto_(v);});
  rows=rows.slice(located.index+1);
  if(rows.length>TACS_CSV_MORADORES_V1.MAX_ROWS)throw new Error('O CSV ultrapassa o limite de '+TACS_CSV_MORADORES_V1.MAX_ROWS+' linhas por arquivo.');
  return {headers:headers,rows:rows,delimiter:delimiter==='\t'?'TAB':delimiter,headerRow:located.index,firstDataLine:located.index+2};
}

function csvMoradoresV1DetectarDelimitador_(texto){
  var candidatos=[',',';','\t','|'],melhor=null,pontuacao=-1,colunas=-1;
  candidatos.forEach(function(sep){
    var rows;try{rows=Utilities.parseCsv(String(texto),sep);}catch(erro){return;}
    var located=csvMoradoresV1EncontrarCabecalho_(rows);if(!located)return;
    if(located.score>pontuacao||(located.score===pontuacao&&located.columns>colunas)){melhor=sep;pontuacao=located.score;colunas=located.columns;}
  });
  if(melhor)return melhor;
  var linhas=String(texto).split(/\r?\n/).slice(0,250),quantidade=-1;melhor=';';
  candidatos.forEach(function(sep){linhas.forEach(function(linha){var aspas=false,total=0;for(var i=0;i<linha.length;i++){if(linha.charAt(i)==='"')aspas=!aspas;else if(!aspas&&linha.charAt(i)===sep)total++;}if(total>quantidade){quantidade=total;melhor=sep;}});});
  return melhor;
}

function csvMoradoresV1AliasCombina_(chave,alias){if(chave===alias)return true;if(alias.length<10)return false;return chave.indexOf(alias)===0||chave.slice(-alias.length)===alias||chave.indexOf(alias)!==-1;}
function csvMoradoresV1IndiceCabecalho_(campo,headers){
  var normal=headers.map(csvMoradoresV1Chave_),aliases=TACS_CSV_MORADORES_V1_HEADER_ALIASES[campo]||[],found=-1;
  aliases.some(function(alias){return normal.some(function(chave,index){if(csvMoradoresV1AliasCombina_(chave,alias)){found=index;return true;}return false;});});
  return found;
}
function csvMoradoresV1PontuarCabecalho_(headers){
  var campos=['cpf','cns','nome','nascimento','sexo','endereco','celular','telefoneContato','microarea','equipe'];
  var usados={},matches=0,score=0;
  campos.forEach(function(campo){var index=csvMoradoresV1IndiceCabecalho_(campo,headers);if(index<0||usados[index])return;usados[index]=true;matches++;score+=10;if(campo==='nome'||campo==='nascimento'||campo==='sexo')score+=12;if(campo==='cpf'||campo==='cns')score+=6;});
  return {matches:matches,score:score};
}
function csvMoradoresV1EncontrarCabecalho_(rows){
  var melhor=null,limite=Math.min(rows.length,250);
  for(var i=0;i<limite;i++){
    var headers=(rows[i]||[]).map(function(v){return csvMoradoresV1Texto_(v);});if(headers.length<3)continue;
    var resultado=csvMoradoresV1PontuarCabecalho_(headers);if(resultado.matches<2)continue;
    var atual={index:i,score:resultado.score,matches:resultado.matches,columns:headers.length};
    if(!melhor||atual.score>melhor.score||(atual.score===melhor.score&&atual.matches>melhor.matches)||(atual.score===melhor.score&&atual.matches===melhor.matches&&atual.columns>melhor.columns))melhor=atual;
  }
  return melhor;
}

function csvMoradoresV1Decodificar_(body){
  var bytes;
  if(body.csvBase64){
    try{bytes=Utilities.base64Decode(String(body.csvBase64));}catch(erro){throw new Error('O conteúdo do CSV está corrompido.');}
    if(bytes.length>TACS_CSV_MORADORES_V1.MAX_BYTES)throw new Error('O CSV deve ter no máximo 2 MB.');
    var blob=Utilities.newBlob(bytes),textoUtf8;
    if(bytes.length>=2&&Number(bytes[0]&255)===255&&Number(bytes[1]&255)===254)return blob.getDataAsString('UTF-16LE').replace(/^\uFEFF/,'');
    if(bytes.length>=2&&Number(bytes[0]&255)===254&&Number(bytes[1]&255)===255)return blob.getDataAsString('UTF-16BE').replace(/^\uFEFF/,'');
    textoUtf8=blob.getDataAsString('UTF-8');
    if(textoUtf8.indexOf('\uFFFD')!==-1){try{return blob.getDataAsString('windows-1252');}catch(erroWindows){return blob.getDataAsString('ISO-8859-1');}}
    return textoUtf8;
  }
  var texto=String(body.csvTexto||'');
  if(Utilities.newBlob(texto).getBytes().length>TACS_CSV_MORADORES_V1.MAX_BYTES)throw new Error('O CSV deve ter no máximo 2 MB.');
  return texto;
}

function csvMoradoresV1Conflitos_(existente,novo){
  var conflitos=[];
  ['cpf','cns','nome','nascimento','sexo'].forEach(function(campo){
    var a=csvMoradoresV1Comparavel_(campo,existente[campo]);
    var b=csvMoradoresV1Comparavel_(campo,novo[campo]);
    if(a&&b&&a!==b)conflitos.push(campo);
  });
  return conflitos;
}

function csvMoradoresV1MesclarVazios_(antes,importado){
  var dados={},campos=[],valores={};
  Object.keys(antes).forEach(function(k){dados[k]=antes[k];});
  TACS_CSV_MORADORES_V1.MERGE_FIELDS.forEach(function(campo){
    if(!csvMoradoresV1Texto_(dados[campo])&&csvMoradoresV1Texto_(importado[campo])){
      dados[campo]=importado[campo];campos.push(campo);valores[campo]=importado[campo];
    }
  });
  return {dados:dados,campos:campos,valores:valores};
}

function csvMoradoresV1PreservarMescla_(mescla,anterior,fonte){
  var dados=moradoresAdminV1PreservarCamposSistema_(mescla.dados,anterior,false,fonte);
  /*
   * O CRUD diário preserva consentimento como campo de sistema. Na importação
   * auditável, porém, esses campos podem ser preenchidos quando estavam vazios.
   * Reaplica somente os campos explicitamente aprovados pela mesclagem.
   */
  mescla.campos.forEach(function(campo){dados[campo]=mescla.dados[campo];});
  return dados;
}

function csvMoradoresV1Novo_(entrada,fonte,lote,numero){
  var agora=new Date(),dados={};Object.keys(entrada).forEach(function(k){dados[k]=entrada[k];});
  dados.idPortal='TACS-'+('000000'+numero).slice(-6);
  dados.id=csvMoradoresV1Texto_(entrada.id);
  dados.origem='CSV_PORTAL:'+lote;
  dados.status='ATIVO';
  dados.consentimentoWhatsapp=dados.consentimentoWhatsapp||'NÃO';
  dados.dataCadastroPortal=agora;dados.ultimaAtualizacao=agora;
  dados.idade=moradoresAdminV1IdadeTexto_(dados.nascimento,agora);
  return dados;
}

function csvMoradoresV1ValorCelula_(campo,valor){
  if(campo==='nascimento')return moradoresAdminV1DataObjeto_(valor);
  return valor==null?'':valor;
}

function csvMoradoresV1LinhaNova_(fonte,dados,totalColunas){
  var linha=new Array(totalColunas).fill('');
  TACS_CSV_MORADORES_V1.FIELDS.forEach(function(campo){
    var index=fonte.map[campo];
    if(index>=0)linha[index]=csvMoradoresV1ValorCelula_(campo,dados[campo]);
  });
  return linha;
}

function csvMoradoresV1LinhaMesclada_(fonte,plano,totalColunas){
  var linha=plano.raw.slice(0,totalColunas);
  while(linha.length<totalColunas)linha.push('');
  var campos=plano.campos.concat(['idade','ultimaAtualizacao']);
  campos.forEach(function(campo){
    var index=fonte.map[campo];
    if(index>=0)linha[index]=csvMoradoresV1ValorCelula_(campo,plano.dados[campo]);
  });
  return linha;
}

function csvMoradoresV1FormatarFaixa_(fonte,inicio,quantidade){
  var formatos={
    idPortal:'@',id:'@',cpf:'@',cns:'@',nascimento:'dd/MM/yyyy',
    celular:'@',telefoneContato:'@',ultimaAtualizacao:'dd/MM/yyyy HH:mm:ss',
    dataConsentimento:'dd/MM/yyyy HH:mm:ss',dataCadastroPortal:'dd/MM/yyyy HH:mm:ss'
  };
  Object.keys(formatos).forEach(function(campo){
    var index=fonte.map[campo];
    if(index>=0)fonte.sheet.getRange(inicio,index+1,quantidade,1).setNumberFormat(formatos[campo]);
  });
}

function csvMoradoresV1GarantirLinhas_(sheet,ultimaLinha){
  var maximo=sheet.getMaxRows();
  if(ultimaLinha>maximo)sheet.insertRowsAfter(maximo,ultimaLinha-maximo);
}

function csvMoradoresV1AdicionarNovosEmLote_(fonte,planos){
  if(!planos.length)return [];
  var inicio=fonte.sheet.getLastRow()+1;
  var fim=inicio+planos.length-1;
  csvMoradoresV1GarantirLinhas_(fonte.sheet,fim);
  var totalColunas=fonte.sheet.getLastColumn();
  var linhas=planos.map(function(plano,index){
    plano.origem={aba:fonte.sheet.getName(),linha:inicio+index};
    plano.assinatura=csvMoradoresV1Assinatura_(plano.dados);
    return csvMoradoresV1LinhaNova_(fonte,plano.dados,totalColunas);
  });
  csvMoradoresV1FormatarFaixa_(fonte,inicio,linhas.length);
  fonte.sheet.getRange(inicio,1,linhas.length,totalColunas).setValues(linhas);
  return planos;
}

function csvMoradoresV1EscreverMesclasEmLote_(fonte,planos){
  if(!planos.length)return [];
  var totalColunas=fonte.sheet.getLastColumn();
  var ordenados=planos.slice().sort(function(a,b){return a.origem.linha-b.origem.linha;});
  var grupos=[];
  ordenados.forEach(function(plano){
    var ultimo=grupos.length?grupos[grupos.length-1]:null;
    if(!ultimo||plano.origem.linha!==ultimo.inicio+ultimo.linhas.length){
      ultimo={inicio:plano.origem.linha,linhas:[]};
      grupos.push(ultimo);
    }
    ultimo.linhas.push(csvMoradoresV1LinhaMesclada_(fonte,plano,totalColunas));
  });
  grupos.forEach(function(grupo){
    csvMoradoresV1FormatarFaixa_(fonte,grupo.inicio,grupo.linhas.length);
    fonte.sheet.getRange(grupo.inicio,1,grupo.linhas.length,totalColunas).setValues(grupo.linhas);
  });
  return planos;
}

function csvMoradoresV1MetasEAuditoria_(fonte,operacoes,contexto,lote){
  var metaSheet=moradoresAdminV1GarantirMeta_(fonte.ss);
  var auditSheet=moradoresAdminV1GarantirAuditoria_(fonte.ss);
  var metaMap=moradoresAdminV1LerMetaMap_(fonte.ss,contexto);
  var agora=new Date();
  var novasMetas=[];
  var metasExistentes=[];
  var auditorias=[];
  var proximaMeta=metaSheet.getLastRow()+1;

  operacoes.forEach(function(op){
    var chave=moradoresAdminV1ChaveRegistro_(op.dados);
    var chaveAnterior=op.antes?moradoresAdminV1ChaveRegistro_(op.antes):'';
    var origemKey=moradoresAdminV1ChaveOrigem_(op.origem);
    var anterior=(chaveAnterior&&metaMap.porChave[chaveAnterior])||
      metaMap.porChave[chave]||metaMap.porOrigem[origemKey]||null;
    var moradorId=anterior&&anterior.moradorId||
      ('MOR-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase());
    var criadoEm=anterior&&anterior.criadoEm||agora;
    var situacao=op.dados.status||(anterior&&anterior.situacao)||'ATIVO';
    var origemCadastro=anterior&&anterior.origemCadastro||('CSV_PORTAL:'+lote);
    var valores=[
      moradorId,chave,op.origem.aba,op.origem.linha,op.dados.cpf||'',op.dados.cns||'',
      situacao,anterior&&anterior.motivo||'',contexto.agenteId,contexto.areaId,
      contexto.unidadeId,criadoEm,agora,contexto.operadorId,origemCadastro
    ];
    var linha=anterior&&anterior.sheetRow?anterior.sheetRow:proximaMeta++;
    if(anterior&&anterior.sheetRow)metasExistentes.push({linha:linha,valores:valores});
    else novasMetas.push(valores);
    var metaAtual={
      sheetRow:linha,moradorId:moradorId,chave:chave,aba:op.origem.aba,
      linha:op.origem.linha,situacao:situacao,motivo:anterior&&anterior.motivo||'',
      agenteId:contexto.agenteId,areaId:contexto.areaId,unidadeId:contexto.unidadeId,
      criadoEm:criadoEm,atualizadoEm:agora,operadorId:contexto.operadorId,
      origemCadastro:origemCadastro
    };
    metaMap.porChave[chave]=metaAtual;
    metaMap.porOrigem[origemKey]=metaAtual;
    metaMap.porId[moradorId]=metaAtual;
    op.moradorId=moradorId;
    auditorias.push([
      'EVT-'+Utilities.getUuid().replace(/-/g,'').slice(0,18).toUpperCase(),
      moradorId,op.tipo==='NOVO'?'IMPORTAR_CSV_NOVO':'IMPORTAR_CSV_MESCLAR',
      contexto.agenteId,contexto.areaId,contexto.unidadeId,contexto.operadorId,
      ('LOTE:'+lote+';CAMPOS:'+(op.campos.length?op.campos.join(','):'NOVO_CADASTRO')).slice(0,600),
      agora
    ]);
  });

  metasExistentes.forEach(function(item){
    metaSheet.getRange(item.linha,1,1,15).setValues([item.valores]);
    metaSheet.getRange(item.linha,12,1,2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  });
  if(novasMetas.length){
    var inicioMeta=metaSheet.getLastRow()+1;
    csvMoradoresV1GarantirLinhas_(metaSheet,inicioMeta+novasMetas.length-1);
    metaSheet.getRange(inicioMeta,1,novasMetas.length,15).setValues(novasMetas);
    metaSheet.getRange(inicioMeta,12,novasMetas.length,2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
  if(auditorias.length){
    var inicioAudit=auditSheet.getLastRow()+1;
    csvMoradoresV1GarantirLinhas_(auditSheet,inicioAudit+auditorias.length-1);
    auditSheet.getRange(inicioAudit,1,auditorias.length,9).setValues(auditorias);
    auditSheet.getRange(inicioAudit,9,auditorias.length,1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
}

function csvMoradoresV1RegistrarLote_(ss,lote,contexto,acesso,arquivo,totalSelecionado,operacoes,resumo){
  var batches=csvMoradoresV1LogSheet_(ss,TACS_CSV_MORADORES_V1.BATCH_SHEET,TACS_CSV_MORADORES_V1.BATCH_HEADERS);
  var items=csvMoradoresV1LogSheet_(ss,TACS_CSV_MORADORES_V1.ITEM_SHEET,TACS_CSV_MORADORES_V1.ITEM_HEADERS);
  var agora=new Date();
  var novos=operacoes.filter(function(x){return x.tipo==='NOVO';}).length;
  var mesclados=operacoes.filter(function(x){return x.tipo==='MESCLAR';}).length;
  batches.appendRow([lote,contexto.areaId,arquivo,acesso.operadorId,'CONFIRMADO',totalSelecionado,novos,mesclados,resumo.total-totalSelecionado,agora,'',JSON.stringify(resumo)]);
  batches.getRange(batches.getLastRow(),10,1,2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  var rows=operacoes.map(function(op){return [
    lote,op.tipo,op.origem.aba,op.origem.linha,op.dados.idPortal||'',op.moradorId||'',
    JSON.stringify(op.campos),JSON.stringify(op.valores),op.assinatura||'',agora
  ];});
  if(rows.length){
    var start=items.getLastRow()+1;
    csvMoradoresV1GarantirLinhas_(items,start+rows.length-1);
    items.getRange(start,1,rows.length,rows[0].length).setValues(rows);
    items.getRange(start,10,rows.length,1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
}

function csvMoradoresV1Lotes_(contexto,acesso){
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  var sheet=fonte.ss.getSheetByName(TACS_CSV_MORADORES_V1.BATCH_SHEET);
  if(!sheet||sheet.getLastRow()<2)return {ok:true,areaId:contexto.areaId,lotes:[]};
  var rows=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_CSV_MORADORES_V1.BATCH_HEADERS.length).getDisplayValues();
  var lotes=rows.filter(function(row){return csvMoradoresV1Texto_(row[1])===contexto.areaId;}).slice(-30).reverse().map(function(row){return {
    loteId:row[0],areaId:row[1],arquivo:row[2],operadorId:row[3],status:row[4],
    total:Number(row[5]||0),novos:Number(row[6]||0),mesclados:Number(row[7]||0),
    ignorados:Number(row[8]||0),criadoEm:row[9],desfeitoEm:row[10]
  };});
  return {ok:true,areaId:contexto.areaId,lotes:lotes};
}

function csvMoradoresV1Desfazer_(p,contexto,acesso){
  if(typeof moradoresAdminV1ExigirEscrita_==='function')moradoresAdminV1ExigirEscrita_();
  var body=csvMoradoresV1Payload_(p.payload);
  var lote=csvMoradoresV1Texto_(body.loteId||p.loteId);
  if(!/^CSV-[A-Za-z0-9-]{12,80}$/.test(lote))throw new Error('Identificador do lote inválido.');
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Outra atualização de moradores está em andamento.');
  try{
    var fonte=moradoresAdminV1LocalizarFonte_(contexto);
    var batches=csvMoradoresV1LogSheet_(fonte.ss,TACS_CSV_MORADORES_V1.BATCH_SHEET,TACS_CSV_MORADORES_V1.BATCH_HEADERS);
    var batch=csvMoradoresV1EncontrarLog_(batches,lote);
    if(!batch||csvMoradoresV1Texto_(batch.values[1])!==contexto.areaId)throw new Error('O lote não pertence a esta área.');
    if(csvMoradoresV1Texto_(batch.values[4])!=='CONFIRMADO')throw new Error('Este lote já foi desfeito ou não está confirmado.');
    var itemsSheet=csvMoradoresV1LogSheet_(fonte.ss,TACS_CSV_MORADORES_V1.ITEM_SHEET,TACS_CSV_MORADORES_V1.ITEM_HEADERS);
    var all=itemsSheet.getLastRow()>1?itemsSheet.getRange(2,1,itemsSheet.getLastRow()-1,TACS_CSV_MORADORES_V1.ITEM_HEADERS.length).getValues():[];
    var itens=all.map(function(values,index){return {row:index+2,values:values};}).filter(function(item){return csvMoradoresV1Texto_(item.values[0])===lote;});
    if(!itens.length)throw new Error('Os itens deste lote não foram encontrados.');
    var verificacoes=[];
    itens.forEach(function(item){
      var tipo=csvMoradoresV1Texto_(item.values[1]),aba=csvMoradoresV1Texto_(item.values[2]),linha=Number(item.values[3]||0);
      var registro=moradoresAdminV1LerPorOrigem_(fonte.ss,aba,linha);
      if(!registro)throw new Error('A linha '+linha+' do lote não foi encontrada.');
      if(tipo==='NOVO'){
        if(csvMoradoresV1Assinatura_(registro.morador)!==csvMoradoresV1Texto_(item.values[8]))throw new Error('O cadastro '+(registro.morador.idPortal||linha)+' foi alterado depois da importação. A reversão foi bloqueada.');
        verificacoes.push({tipo:tipo,registro:registro,item:item});
      }else{
        var campos=csvMoradoresV1Json_(item.values[6],[]),valores=csvMoradoresV1Json_(item.values[7],{});
        campos.forEach(function(campo){if(csvMoradoresV1Comparavel_(campo,registro.morador[campo])!==csvMoradoresV1Comparavel_(campo,valores[campo]))throw new Error('O campo '+campo+' do cadastro '+(registro.morador.idPortal||linha)+' mudou depois da importação. A reversão foi bloqueada.');});
        var chaveAnterior=moradoresAdminV1ChaveRegistro_(registro.morador);
        var metaAnterior=moradoresAdminV1EncontrarMeta_(
          fonte.ss,chaveAnterior,registro.origem,
          csvMoradoresV1Texto_(item.values[5]),contexto
        );
        verificacoes.push({
          tipo:tipo,registro:registro,item:item,campos:campos,
          chaveAnterior:chaveAnterior,metaAnterior:metaAnterior
        });
      }
    });
    verificacoes.forEach(function(v){
      if(v.tipo==='NOVO'){
        v.registro.morador.status=TACS_CSV_MORADORES_V1.REVERTED_STATUS;
        v.registro.morador.ultimaAtualizacao=new Date();
        moradoresAdminV1SetCell_(fonte.sheet,v.registro.origem.linha,fonte.map.status,TACS_CSV_MORADORES_V1.REVERTED_STATUS);
        moradoresAdminV1SetCell_(fonte.sheet,v.registro.origem.linha,fonte.map.ultimaAtualizacao,v.registro.morador.ultimaAtualizacao,'dd/MM/yyyy HH:mm:ss');
        moradoresAdminV1UpsertMeta_(fonte.ss,{
          chave:moradoresAdminV1ChaveRegistro_(v.registro.morador),
          chaveAnterior:moradoresAdminV1ChaveRegistro_(v.registro.morador),
          moradorId:csvMoradoresV1Texto_(v.item.values[5]),origem:v.registro.origem,
          dados:v.registro.morador,situacao:TACS_CSV_MORADORES_V1.REVERTED_STATUS,
          motivo:'LOTE_DESFEITO:'+lote,origemCadastro:'CSV_PORTAL:'+lote
        },contexto);
      }else{
        v.campos.forEach(function(campo){moradoresAdminV1SetCell_(fonte.sheet,v.registro.origem.linha,fonte.map[campo],'');v.registro.morador[campo]='';});
        v.registro.morador.ultimaAtualizacao=new Date();
        moradoresAdminV1SetCell_(fonte.sheet,v.registro.origem.linha,fonte.map.ultimaAtualizacao,v.registro.morador.ultimaAtualizacao,'dd/MM/yyyy HH:mm:ss');
        moradoresAdminV1UpsertMeta_(fonte.ss,{
          chave:moradoresAdminV1ChaveRegistro_(v.registro.morador),
          chaveAnterior:v.chaveAnterior,
          moradorId:csvMoradoresV1Texto_(v.item.values[5]),
          origem:v.registro.origem,dados:v.registro.morador,
          situacao:v.registro.morador.status||'ATIVO',
          motivo:v.metaAnterior&&v.metaAnterior.motivo||'',
          origemCadastro:v.metaAnterior&&v.metaAnterior.origemCadastro||'BASE_EXISTENTE'
        },contexto);
      }
      moradoresAdminV1Auditar_(fonte.ss,{moradorId:csvMoradoresV1Texto_(v.item.values[5]),acao:'DESFAZER_IMPORTACAO_CSV',campos:'LOTE:'+lote+';TIPO:'+v.tipo},contexto);
    });
    batch.values[4]='DESFEITO';batch.values[10]=new Date();
    batches.getRange(batch.row,1,1,TACS_CSV_MORADORES_V1.BATCH_HEADERS.length).setValues([batch.values]);
    batches.getRange(batch.row,10,1,2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    SpreadsheetApp.flush();moradoresAdminV1InvalidarResumo_(contexto);
    return {ok:true,loteId:lote,message:'Importação desfeita sem excluir linhas. Cadastros novos foram inativados e campos mesclados foram restaurados.'};
  }finally{lock.releaseLock();}
}

function csvMoradoresV1GarantirLogs_(ss){csvMoradoresV1LogSheet_(ss,TACS_CSV_MORADORES_V1.BATCH_SHEET,TACS_CSV_MORADORES_V1.BATCH_HEADERS);csvMoradoresV1LogSheet_(ss,TACS_CSV_MORADORES_V1.ITEM_SHEET,TACS_CSV_MORADORES_V1.ITEM_HEADERS);}
function csvMoradoresV1LogSheet_(ss,nome,headers){
  var sheet=ss.getSheetByName(nome);if(!sheet)sheet=ss.insertSheet(nome);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers.slice()]);sheet.setFrozenRows(1);}
  var current=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
  if(headers.some(function(v,i){return current[i]!==v;}))throw new Error('A aba '+nome+' possui estrutura diferente.');
  return sheet;
}

function csvMoradoresV1EncontrarLog_(sheet,lote){
  if(sheet.getLastRow()<2)return null;var rows=sheet.getRange(2,1,sheet.getLastRow()-1,TACS_CSV_MORADORES_V1.BATCH_HEADERS.length).getValues();
  for(var i=0;i<rows.length;i++)if(csvMoradoresV1Texto_(rows[i][0])===lote)return {row:i+2,values:rows[i]};return null;
}

function csvMoradoresV1ItemPublico_(item){return {linhaCsv:item.linhaCsv,status:item.status,erros:item.erros,conflitos:item.conflitos,dados:item.dados?{id:item.dados.id,cpf:item.dados.cpf,cns:item.dados.cns,nome:item.dados.nome,nascimento:item.dados.nascimento,sexo:item.dados.sexo,endereco:item.dados.endereco}:null,existente:item.existing?{idPortal:item.existing.morador.idPortal,nome:item.existing.morador.nome,nascimento:item.existing.morador.nascimento,origemLinha:item.existing.origem.linha}:null,acaoPadrao:csvMoradoresV1AcaoPadrao_(item.status)};}
function csvMoradoresV1AcaoPadrao_(status){return status==='NOVO'||status==='NOVO_SEM_DOCUMENTO'?'CRIAR':(status==='MESCLAR'?'MESCLAR':'IGNORAR');}
function csvMoradoresV1Decisoes_(valor){if(!valor)return {};if(typeof valor==='object')return valor;try{return JSON.parse(valor);}catch(erro){throw new Error('As decisões da prévia são inválidas.');}}
function csvMoradoresV1ChavesDocumento_(dados){var out=[];if(dados.cpf)out.push('CPF:'+dados.cpf);if(dados.cns)out.push('CNS:'+dados.cns);return out;}
function csvMoradoresV1Origem_(origem){return csvMoradoresV1Texto_(origem&&origem.aba)+'#'+Number(origem&&origem.linha||0);}
function csvMoradoresV1Comparavel_(campo,valor){if(['cpf','cns','celular','telefoneContato'].indexOf(campo)!==-1)return csvMoradoresV1Digitos_(valor);return moradoresAdminV1NormalizarBusca_(valor);}
function csvMoradoresV1Assinatura_(dados){return moradoresAdminV1Hash_(TACS_CSV_MORADORES_V1.FIELDS.map(function(k){return csvMoradoresV1Texto_(dados[k]);}).join('|'));}
function csvMoradoresV1NumeroId_(id){var m=String(id||'').match(/(\d+)$/);return m?Number(m[1]):1;}
function csvMoradoresV1Token_(texto,mapping,areaId){return moradoresAdminV1Hash_(areaId+'|'+JSON.stringify(mapping)+'|'+texto);}
function csvMoradoresV1CriarPrevia_(assinatura,contexto,acesso){
  var token='CSVPRV_'+Utilities.getUuid().replace(/-/g,'');
  var registro={
    assinatura:assinatura,
    areaId:contexto.areaId,
    operadorId:csvMoradoresV1Texto_(acesso&&acesso.operadorId)
  };
  CacheService.getScriptCache().put(
    TACS_CSV_MORADORES_V1.PREVIEW_PREFIX+moradoresAdminV1Hash_(token),
    JSON.stringify(registro),
    TACS_CSV_MORADORES_V1.PREVIEW_SECONDS
  );
  return token;
}
function csvMoradoresV1ValidarPrevia_(token,assinatura,contexto,acesso){
  token=csvMoradoresV1Texto_(token);
  if(!/^CSVPRV_[A-Za-z0-9]{20,80}$/.test(token)){
    throw new Error('Gere a prévia no servidor antes de confirmar a importação.');
  }
  var raw=CacheService.getScriptCache().get(
    TACS_CSV_MORADORES_V1.PREVIEW_PREFIX+moradoresAdminV1Hash_(token)
  );
  if(!raw)throw new Error('A prévia expirou. Gere outra prévia antes de importar.');
  var registro;
  try{registro=JSON.parse(raw);}catch(erro){throw new Error('A prévia armazenada é inválida. Gere outra prévia.');}
  if(
    registro.assinatura!==assinatura||
    registro.areaId!==contexto.areaId||
    registro.operadorId!==csvMoradoresV1Texto_(acesso&&acesso.operadorId)
  ){
    throw new Error('O CSV, o mapeamento, a área ou a sessão mudou depois da prévia. Gere uma nova prévia.');
  }
  return true;
}
function csvMoradoresV1ConsumirPrevia_(token){
  try{
    CacheService.getScriptCache().remove(
      TACS_CSV_MORADORES_V1.PREVIEW_PREFIX+moradoresAdminV1Hash_(token)
    );
  }catch(erro){}
}
function csvMoradoresV1NomeArquivo_(nome){var out=csvMoradoresV1Texto_(nome||'moradores.csv').replace(/[^A-Za-z0-9À-ÿ._ -]/g,'').slice(0,180);return out||'moradores.csv';}
function csvMoradoresV1Chave_(valor){var texto=csvMoradoresV1Texto_(valor).toUpperCase();if(texto.normalize)texto=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return texto.replace(/[^A-Z0-9]/g,'');}
function csvMoradoresV1Texto_(valor){return String(valor==null?'':valor).replace(/\s+/g,' ').trim();}
function csvMoradoresV1Digitos_(valor){return String(valor==null?'':valor).replace(/\D/g,'');}
function csvMoradoresV1Booleano_(valor){return valor===true||['TRUE','1','SIM','YES','ATIVO','ATIVA'].indexOf(csvMoradoresV1Texto_(valor).toUpperCase())!==-1;}
function csvMoradoresV1Payload_(texto){if(texto&&typeof texto==='object')return texto;try{return JSON.parse(String(texto||'{}'));}catch(erro){throw new Error('Os dados da importação CSV são inválidos.');}}
function csvMoradoresV1Json_(texto,padrao){try{return JSON.parse(String(texto||''));}catch(erro){return padrao;}}
function csvMoradoresV1ValidarRequestId_(valor){var id=csvMoradoresV1Texto_(valor);if(!/^[A-Za-z0-9_-]{8,160}$/.test(id))throw new Error('Identificador da importação inválido.');return id;}
function csvMoradoresV1GuardarResultado_(id,r){try{CacheService.getScriptCache().put(TACS_CSV_MORADORES_V1.RESULT_PREFIX+id,JSON.stringify(r),TACS_CSV_MORADORES_V1.RESULT_SECONDS);}catch(erro){}}
function csvMoradoresV1LerResultado_(id){try{var raw=CacheService.getScriptCache().get(TACS_CSV_MORADORES_V1.RESULT_PREFIX+id);return raw?JSON.parse(raw):null;}catch(erro){return null;}}

function csvMoradoresV1ResponderPost_(requestId,resultado){
  var mensagem={source:'admin-csv-moradores-v1',requestId:requestId,result:resultado};
  var html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body><script>parent.postMessage('+JSON.stringify(mensagem).replace(/</g,'\\u003c')+',"*");<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function csvMoradoresV1ResponderJson_(dados,callback){var json=JSON.stringify(dados),cb=csvMoradoresV1Texto_(callback);if(cb&&/^[A-Za-z_$][0-9A-Za-z_$.]{0,100}$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}
function csvMoradoresV1Erro_(erro){return csvMoradoresV1Texto_(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,700);}
