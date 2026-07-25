/*
 * AVISOS DO SERVIÇO TACS — SÍTIO JAPARANDUBA
 *
 * Edite somente os textos entre aspas e os campos true/false.
 * Sempre altere versao e atualizadoEm ao publicar algo novo.
 * Não coloque dados pessoais de moradores neste arquivo.
 */
window.PORTAL_TACS_AVISOS = {
  versao: '2026-07-25-02',
  area: 'Sítio Japaranduba',
  atualizadoEm: '25/07/2026 às 23h35',

  atendimentoMedico: {
    ativo: true,
    situacao: 'aguardando',
    titulo: 'Dia de atendimento médico',
    data: 'Aguardando confirmação da unidade de saúde',
    horario: '',
    observacao: 'Assim que o dia for confirmado ou alterado, a informação será atualizada aqui.'
  },

  avisos: [
    {
      id: 'mural-tacs-2026-07-25',
      ativo: true,
      prioridade: 'informativo',
      titulo: 'Avisos da sua área',
      mensagem: 'Este espaço será atualizado pelo TACS quando houver mudança nos serviços da unidade de saúde.',
      validade: ''
    }
  ]
};