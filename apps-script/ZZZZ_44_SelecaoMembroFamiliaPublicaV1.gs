/**
 * Portal TACS — Seleção segura de integrante da família V1.0.1
 *
 * Não expõe CPF/CNS na lista familiar. Cada integrante recebe um token opaco
 * temporário e o documento de acesso só é devolvido após a seleção daquele
 * integrante, com nova validação de área, família e situação ativa.
 */
var TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1=Object.freeze({
  VERSAO:'1.0.1',
  TOKEN_PREFIX:'tacs_familia_membro_v1_',
  TOKEN_SECONDS:900
});

var selecaoMembroFamiliaPublicaV1DoGetAnterior_;
(function instalarSelecaoMembroFamiliaPublicaV1_(){
  if(typeof doGet==='function'){
    selecaoMembroFamiliaPublicaV1DoGetAnterior_=doGet;
    doGet=function(e){
      var p=e&&e.parameter?e.parameter:{};
      if(String(p.action||'').trim().toLowerCase()==='publico_familia_membro'){
        var resposta;
        try{resposta=selecaoMembroFamiliaPublicaV1Resolver_(p);}catch(erro){resposta={ok:false,message:String(erro&&erro.message?erro.message:erro||'Erro inesperado.').slice(0,500)};}
        return identificacaoFamiliarPublicaV1ResponderJson_(resposta,p.callback);
      }
      return selecaoMembroFamiliaPublicaV1DoGetAnterior_(e);
    };
  }
})();

function selecaoMembroFamiliaPublicaV1CriarLista_(familia,contexto){
  if(typeof buscaEnvioFamiliaV1BuscarExata_!=='function')throw new Error('A busca familiar ainda não está disponível.');
  var lista=buscaEnvioFamiliaV1BuscarExata_(familia,contexto).resultados||[],cache=CacheService.getScriptCache();
  return lista.map(function(item){
    var token='fm_'+Utilities.getUuid().replace(/-/g,'')+'_'+Date.now().toString(36);
    var dados={areaId:contexto.areaId,familiaId:familia,origemAba:String(item.origemAba||''),origemLinha:Number(item.origemLinha||0)};
    cache.put(TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1.TOKEN_PREFIX+token,JSON.stringify(dados),TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1.TOKEN_SECONDS);
    return {token:token,nome:item.nome,nascimento:item.nascimento,temDocumento:Boolean(moradoresAdminV1Digitos_(item.cpf)||moradoresAdminV1Digitos_(item.cns))};
  });
}

function selecaoMembroFamiliaPublicaV1Resolver_(p){
  var token=String(p.token||'').trim();
  if(!/^fm_[A-Za-z0-9_]{20,160}$/.test(token))throw new Error('Seleção inválida ou expirada. Pesquise a família novamente.');
  var bruto=CacheService.getScriptCache().get(TACS_SELECAO_MEMBRO_FAMILIA_PUBLICA_V1.TOKEN_PREFIX+token);
  if(!bruto)throw new Error('Esta seleção expirou. Pesquise a família novamente.');
  var dados=JSON.parse(bruto),contexto=identificacaoFamiliarPublicaV1Contexto_(p.areaId||p.area||'');
  if(String(dados.areaId||'')!==contexto.areaId)throw new Error('A seleção não pertence à área atual.');
  var familia=identificacaoFamiliarPublicaV1NormalizarFamilia_(dados.familiaId);
  var fonte=moradoresAdminV1LocalizarFonte_(contexto);
  if(String(dados.origemAba||'')!==fonte.sheet.getName()||Number(dados.origemLinha||0)<2)throw new Error('O cadastro selecionado não pertence à fonte atual.');
  var registro=moradoresAdminV1LerPorOrigem_(fonte.ss,dados.origemAba,Number(dados.origemLinha));
  if(!registro||!registro.morador||!registro.morador.nome)throw new Error('O cadastro selecionado não foi localizado.');
  var chave=moradoresAdminV1ChaveRegistro_(registro.morador),meta=moradoresAdminV1EncontrarMeta_(fonte.ss,chave,registro.origem,'',contexto);
  if(moradoresAdminV1EstaOculto_(registro.morador,meta))throw new Error('Este cadastro não está ativo para atendimento.');
  if(identificacaoFamiliarPublicaV1CodigoMorador_(registro.morador)!==familia)throw new Error('O cadastro familiar mudou. Pesquise novamente.');
  var cpf=moradoresAdminV1Digitos_(registro.morador.cpf),cns=moradoresAdminV1Digitos_(registro.morador.cns),documento='';
  if(cpf&&moradoresAdminV1CpfValido_(cpf))documento=cpf;else if(/^\d{15}$/.test(cns))documento=cns;
  if(!documento)throw new Error('Este integrante ainda não possui CPF ou Cartão SUS disponível para carregamento automático. Procure seu TACS.');
  return {ok:true,documentoAcesso:documento,tipoDocumento:documento.length===11?'CPF':'CNS',familiaId:familia,nome:registro.morador.nome};
}
