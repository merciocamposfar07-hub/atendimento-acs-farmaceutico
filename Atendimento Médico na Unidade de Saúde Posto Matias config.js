/*
 * AVISOS DO SERVIÇO TACS — SÍTIO JAPARANDUBA
 *
 * Para publicar uma alteração:
 * 1. Troque os textos necessários.
 * 2. Altere "versao" para um valor novo (ex.: "2026-07-25-02").
 * 3. Atualize "atualizadoEm".
 * 4. Salve/Confirme a alteração no GitHub.
 *
 * Use ativo: true para mostrar e ativo: false para ocultar.
 * Não coloque dados pessoais de moradores neste arquivo.
 */
window.PORTAL_TACS_AVISOS = {
  versao: '2026-07-25-01',
  area: 'Sítio Japaranduba',
  atualizadoEm: '24/07/2026 às 22h50',

  atendimentoMedico: {
    ativo: true,
    situacao: 'aguardando', // confirmado | alterado | cancelado | aguardando
    titulo: 'Dia de atendimento médico',
    data: 'Aguardando confirmação da unidade de saúde',
    horario: '',
    observacao: 'Assim que o dia for confirmado ou alterado, a informação será atualizada aqui.'
  },

  avisos: [
    {
      id: 'mural-tacs-2026-07-25',
      ativo: true,
      prioridade: 'informativo', // informativo | importante | urgente
      titulo: 'Avisos da sua área',
      mensagem: 'Este espaço será atualizado pelo TACS quando houver mudança nos serviços da unidade de saúde.',
      validade: '' // opcional, no formato AAAA-MM-DD
    }
  ]
};
