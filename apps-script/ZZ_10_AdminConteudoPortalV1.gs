/**
 * ZZ_10_AdminConteudoPortalV1.gs
 *
 * Complemento administrativo para Recados e Campanhas.
 * Mantém as rotas existentes e acrescenta:
 * - POST admin_conteudo_status
 * - POST admin_remover_recado
 * - POST admin_remover_campanha
 *
 * A remoção exige sessão válida, confirmação no cliente e registro no HISTORICO.
 * Não altera Portal.gs e não modifica o Portal do Morador por si só.
 */

var ADMIN_CONTEUDO_PORTAL_V1 = Object.freeze({
  VERSAO: '1.0.0',
  ABA_RECADOS: 'RECADOS_PORTAL',
  ABA_CAMPANHAS: 'CAMPANHAS_PORTAL'
});

var adminConteudoPortalV1PostAnterior_ = adminTacsV1Post;

adminTacsV1Post = function (e) {
  var dados = apiTacsV1LerPost_(e);
  var action = adminTacsV1Texto_(dados.action).toLowerCase();

  if (action === 'admin_conteudo_status') {
    var sessaoStatus = adminTacsV1ExigirSessao_(dados);
    return {
      ok: true,
      modulo: 'Recados e Campanhas',
      versao: ADMIN_CONTEUDO_PORTAL_V1.VERSAO,
      sessaoValidada: true,
      expiraEm: new Date(sessaoStatus.expiraEm).toISOString()
    };
  }

  if (action === 'admin_remover_recado') {
    return adminConteudoPortalV1Remover_(
      dados,
      adminTacsV1ExigirSessao_(dados),
      ADMIN_CONTEUDO_PORTAL_V1.ABA_RECADOS,
      'REMOVER_RECADO'
    );
  }

  if (action === 'admin_remover_campanha') {
    return adminConteudoPortalV1Remover_(
      dados,
      adminTacsV1ExigirSessao_(dados),
      ADMIN_CONTEUDO_PORTAL_V1.ABA_CAMPANHAS,
      'REMOVER_CAMPANHA'
    );
  }

  return adminConteudoPortalV1PostAnterior_(e);
};

function adminConteudoPortalV1Remover_(dados, sessao, nomeAba, acaoHistorico) {
  var id = adminTacsV1IdLivre_(dados.id);
  if (!id) throw new Error('Registro não informado.');

  var ss = adminTacsV1Planilha_();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var aba = ss.getSheetByName(nomeAba);
    if (!aba) throw new Error('A aba ' + nomeAba + ' não foi encontrada.');

    var estrutura = adminTacsV1EstruturaAba_(aba);
    var indiceId = estrutura.cabecalhos.indexOf('ID');
    if (indiceId === -1) throw new Error('A coluna ID não foi encontrada em ' + nomeAba + '.');

    var linhaEncontrada = 0;
    var anterior = null;

    estrutura.linhas.some(function (linha, indice) {
      if (adminTacsV1Texto_(linha[indiceId]) === id) {
        linhaEncontrada = indice + 2;
        anterior = adminTacsV1ObjetoLinha_(estrutura.cabecalhos, linha);
        return true;
      }
      return false;
    });

    if (!linhaEncontrada) {
      return {
        ok: true,
        id: id,
        removido: false,
        jaRemovido: true,
        message: 'O registro já não existe.'
      };
    }

    aba.deleteRow(linhaEncontrada);

    adminTacsV1Historico_(
      ss,
      acaoHistorico,
      nomeAba,
      id,
      JSON.stringify(adminTacsV1Serializar_(anterior)),
      '',
      'Portal Admin • ' + sessao.dispositivo
    );

    SpreadsheetApp.flush();

    return {
      ok: true,
      id: id,
      removido: true,
      message: nomeAba === ADMIN_CONTEUDO_PORTAL_V1.ABA_RECADOS
        ? 'Recado removido.'
        : 'Campanha removida.'
    };
  } finally {
    lock.releaseLock();
  }
}

function testarAdminConteudoPortalV1() {
  var anteriorDisponivel = typeof adminConteudoPortalV1PostAnterior_ === 'function';
  var substituicaoAtiva =
    typeof adminTacsV1Post === 'function' &&
    String(adminTacsV1Post).indexOf('admin_remover_recado') !== -1 &&
    String(adminTacsV1Post).indexOf('admin_remover_campanha') !== -1 &&
    String(adminTacsV1Post).indexOf('admin_conteudo_status') !== -1;

  var abasCorretas =
    ADMIN_CONTEUDO_PORTAL_V1.ABA_RECADOS === 'RECADOS_PORTAL' &&
    ADMIN_CONTEUDO_PORTAL_V1.ABA_CAMPANHAS === 'CAMPANHAS_PORTAL';

  var funcoesBaseDisponiveis =
    typeof apiTacsV1LerPost_ === 'function' &&
    typeof adminTacsV1ExigirSessao_ === 'function' &&
    typeof adminTacsV1Planilha_ === 'function' &&
    typeof adminTacsV1EstruturaAba_ === 'function' &&
    typeof adminTacsV1ObjetoLinha_ === 'function' &&
    typeof adminTacsV1Historico_ === 'function' &&
    typeof adminTacsV1Serializar_ === 'function';

  var resposta = {
    ok: anteriorDisponivel && substituicaoAtiva && abasCorretas && funcoesBaseDisponiveis,
    versao: ADMIN_CONTEUDO_PORTAL_V1.VERSAO,
    rotaAnteriorPreservada: anteriorDisponivel,
    substituicaoAtiva: substituicaoAtiva,
    abasCorretas: abasCorretas,
    funcoesBaseDisponiveis: funcoesBaseDisponiveis,
    gravacaoRealExecutada: false,
    remocaoRealExecutada: false
  };

  Logger.log(JSON.stringify(resposta, null, 2));

  if (!resposta.ok) {
    throw new Error('O módulo de Recados e Campanhas falhou no teste interno.');
  }

  return resposta;
}
