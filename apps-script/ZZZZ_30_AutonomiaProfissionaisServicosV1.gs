/**
 * ZZZZ_30_AutonomiaProfissionaisServicosV1.gs
 * Portal TACS — estabilização de autonomia do TACS na própria área V1.0.0
 *
 * Objetivos:
 * - permitir salvar/ativar/desativar qualquer serviço da própria área mesmo
 *   quando um vínculo legado não foi selecionado corretamente no painel;
 * - manter o isolamento territorial: nunca aceita profissional de outra área;
 * - reparar mensagens antigas de agenda com "Atendimento Atendimento ...".
 */
var TACS_AUTONOMIA_PROFISSIONAIS_SERVICOS_V1=Object.freeze({
  VERSAO:'1.0.0'
});

var tacsAutonomiaProfissionaisServicosV1DoPostAnterior_;
(function instalarTacsAutonomiaProfissionaisServicosV1_(){
  if(typeof doPost!=='function')return;
  tacsAutonomiaProfissionaisServicosV1DoPostAnterior_=doPost;
  doPost=function(e){
    var p=e&&e.parameter?e.parameter:{};
    var action=String(p.action==null?'':p.action).trim().toLowerCase();

    if(action==='admin_salvar_servico'){
      return tacsAutonomiaProfissionaisServicosV1SalvarServicoPost_(p);
    }

    if(action==='admin_dados'&&String(p.escopo||'').trim().toLowerCase()==='agendas'){
      try{
        var contexto=agendasProfissionaisTerritoriaisV1Contexto_(p,action);
        tacsAutonomiaProfissionaisServicosV1RepararMensagensAgenda_(contexto.areaId);
      }catch(ignorarReparo){
        // A validação oficial continua sendo feita pelo fluxo original.
      }
    }

    return tacsAutonomiaProfissionaisServicosV1DoPostAnterior_(e);
  };
})();

function tacsAutonomiaProfissionaisServicosV1SalvarServicoPost_(p){
  var requestId=String(p.requestId==null?'':p.requestId).trim();
  var resultado;
  try{
    requestId=agendasProfissionaisTerritoriaisV1RequestId_(requestId);
    var contexto=agendasProfissionaisTerritoriaisV1Contexto_(p,'admin_salvar_servico');
    resultado=tacsAutonomiaProfissionaisServicosV1SalvarServico_(contexto,p);
  }catch(erro){
    resultado={ok:false,message:agendasProfissionaisTerritoriaisV1Erro_(erro)};
  }
  if(/^[A-Za-z0-9_-]{8,160}$/.test(requestId)){
    agendasProfissionaisTerritoriaisV1GuardarResultado_(requestId,resultado);
  }
  return agendasProfissionaisTerritoriaisV1ResponderPost_(requestId,resultado);
}

function tacsAutonomiaProfissionaisServicosV1SalvarServico_(contexto,p){
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(20000))throw new Error('Outra gravação está em andamento. Tente novamente.');
  try{
    var ss=agendasProfissionaisTerritoriaisV1Planilha_();
    var tabela=agendasProfissionaisTerritoriaisV1Tabela_(
      ss,
      TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_SERVICOS,
      TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.SERV_HEADERS,
      true
    );
    var linha=agendasProfissionaisTerritoriaisV1Encontrar_(tabela,'ID',p.id,contexto.areaId);
    if(!linha)throw new Error('Serviço não encontrado nesta área.');

    var atual=agendasProfissionaisTerritoriaisV1Objeto_(tabela.headers,linha.values);
    var prof=agendasProfissionaisTerritoriaisV1Tabela_(
      ss,
      TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_PROFISSIONAIS,
      TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.PROF_HEADERS,
      true
    );

    var profissionalSolicitado=agendasProfissionaisTerritoriaisV1Texto_(p.profissionalId);
    var profissionalLinha=profissionalSolicitado
      ?agendasProfissionaisTerritoriaisV1Encontrar_(prof,'ID',profissionalSolicitado,contexto.areaId)
      :null;

    // Se o navegador perdeu a seleção do vínculo, preserva o vínculo que já
    // existe no próprio serviço. A validação continua restrita à mesma área.
    if(!profissionalLinha){
      var profissionalAtual=agendasProfissionaisTerritoriaisV1Texto_(atual.PROFISSIONAL_ID);
      if(profissionalAtual){
        profissionalLinha=agendasProfissionaisTerritoriaisV1Encontrar_(prof,'ID',profissionalAtual,contexto.areaId);
      }
    }

    if(!profissionalLinha)throw new Error('O profissional associado não pertence a esta área.');
    var profissionalObjeto=agendasProfissionaisTerritoriaisV1Objeto_(prof.headers,profissionalLinha.values);
    var profissionalId=agendasProfissionaisTerritoriaisV1Texto_(profissionalObjeto.ID);

    var nome=agendasProfissionaisTerritoriaisV1Texto_(p.nome);
    var descricao=agendasProfissionaisTerritoriaisV1Texto_(p.descricaoAutomatica);
    if(!nome||!descricao)throw new Error('Nome e descrição automática são obrigatórios.');

    agendasProfissionaisTerritoriaisV1Atualizar_(tabela,linha,{
      PROFISSIONAL_ID:profissionalId,
      NOME:nome,
      DESCRICAO_AUTOMATICA:descricao,
      ORDEM:agendasProfissionaisTerritoriaisV1Positivo_(p.ordem,1),
      ATIVO:agendasProfissionaisTerritoriaisV1Booleano_(p.ativo),
      PERMITE_VAGA_COMUM:agendasProfissionaisTerritoriaisV1Booleano_(p.permiteVagaComum),
      PERMITE_EMERGENCIA:agendasProfissionaisTerritoriaisV1Booleano_(p.permiteEmergencia),
      AREA_ID:contexto.areaId,
      ATUALIZADO_EM:new Date()
    });
    SpreadsheetApp.flush();
    return{
      ok:true,
      id:agendasProfissionaisTerritoriaisV1Texto_(p.id),
      profissionalId:profissionalId,
      areaId:contexto.areaId,
      message:'Serviço salvo somente nesta área.'
    };
  }finally{
    lock.releaseLock();
  }
}

function tacsAutonomiaProfissionaisServicosV1RepararMensagensAgenda_(areaId){
  var ss=agendasProfissionaisTerritoriaisV1Planilha_();
  var tabela=agendasProfissionaisTerritoriaisV1Tabela_(
    ss,
    TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.ABA_AGENDAS,
    TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1.AGENDA_HEADERS,
    true
  );
  var alteradas=0;
  agendasProfissionaisTerritoriaisV1LinhasArea_(tabela,areaId).forEach(function(linha){
    var item=agendasProfissionaisTerritoriaisV1Objeto_(tabela.headers,linha.values);
    var mensagem=agendasProfissionaisTerritoriaisV1Texto_(item.MENSAGEM);
    var corrigida=mensagem.replace(/^\s*Atendimento\s+Atendimento\s+/i,'Atendimento ');
    if(corrigida===mensagem)return;
    agendasProfissionaisTerritoriaisV1Atualizar_(tabela,linha,{
      MENSAGEM:corrigida,
      AREA_ID:areaId,
      ATUALIZADO_EM:new Date()
    });
    alteradas++;
  });
  if(alteradas)SpreadsheetApp.flush();
  return alteradas;
}
