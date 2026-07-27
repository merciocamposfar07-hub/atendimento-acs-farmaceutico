# Matriz Oficial — Portal TACS

Versão inicial da arquitetura modular do Portal TACS.

## Público e finalidade

Portal voltado exclusivamente aos moradores da zona rural do Sítio Japaranduba, vinculados à Unidade de Saúde Posto Matias, em Chã Grande/PE.

Princípio central:

> Máxima simplicidade para o comunitário. Máxima organização para o TACS.

## Identidade visual

- Cor principal: azul-petróleo `#062c46`.
- Fundo claro: off-white/cinza muito claro.
- Solicitações recebidas: card azul-petróleo.
- Confirmações: card verde.
- Avisos: card amarelo.
- Urgências e cancelamentos: card vermelho.
- Layout mobile-first, com letras e botões grandes.

## Módulos ativos de solicitação

### Odontologia comum e emergencial

- Dias e vagas vêm da planilha `AGENDA`.
- O comunitário vê somente vagas disponíveis.
- Ao concluir, a vaga é reservada automaticamente.
- A disponibilidade é atualizada imediatamente.
- A solicitação chega ao WhatsApp do TACS em card azul-petróleo.
- Não depende de confirmação posterior do TACS ao comunitário.

### Vacinação

- O comunitário informa qual vacina deseja.
- Não escolhe data nem horário.
- A Unidade de Saúde define a programação.
- O TACS pode gerar um card individual com vacina, dia, data, hora e local.
- Orientação do card: levar somente o cartão de vacinação.

### Enfermeira Chefe

- O comunitário escolhe apenas um dia disponibilizado pela unidade.
- Não escolhe horário, salvo mudança futura na programação.
- A agenda deve ser configurável separadamente.

### Visita médica domiciliar

- É uma solicitação ativa e própria do portal.
- O comunitário informa para quem é a visita.
- O comunitário descreve resumidamente o motivo.
- Não escolhe dia nem horário.
- A solicitação chega ao WhatsApp do TACS em card azul-petróleo.
- O TACS encaminha a demanda para a Unidade de Saúde.
- A data da visita é definida posteriormente pela Unidade e pode ser comunicada ao comunitário por card.

### Declarações

Opções:

- Aposentadoria.
- Benefício.
- Auxílio-maternidade.

### Outras solicitações ao TACS

- Campo simples para descrição do motivo.

### Implanon

Mantido como módulo ativo conforme a estrutura atual do portal.

## Módulos informativos

Não geram solicitação de marcação. São publicados no Mural de Avisos como texto, card ou banner.

- Nutricionista.
- Outubro Rosa.
- Novembro Azul.
- Campanhas de vacinação.
- Comunicados gerais da Unidade de Saúde.

O nutricionista comparece em data específica informada pela unidade. Portanto, sua programação aparece no mural e não como solicitação de agendamento.

## Mural de Avisos

Cada aviso pode conter:

- título;
- categoria;
- mensagem;
- data;
- hora;
- local;
- prioridade;
- início da publicação;
- fim da publicação;
- formato: texto, card ou banner.

Ao vencer a validade, o aviso deixa de aparecer automaticamente.

Os avisos podem ser reutilizados para:

- portal;
- conversa individual no WhatsApp;
- grupos;
- Status do WhatsApp.

## Cards

### Card recebido pelo TACS

Deve reunir, conforme os dados disponíveis:

- nome;
- CPF ou CNS;
- nascimento;
- idade em anos e meses;
- mãe;
- pai;
- comunidade;
- unidade;
- solicitação;
- data, tipo de vaga ou informação específica do serviço.

### Card enviado ao comunitário

Pode ser gerado pelo painel administrativo e compartilhado pelo WhatsApp. O portal prepara o card e abre o WhatsApp; o TACS confirma o envio.

## Painel Administrativo

Estrutura planejada:

- Dashboard.
- Solicitações.
- Comunitários.
- Agendas.
- Mural e campanhas.
- Convocações individuais.
- Histórico.
- Relatórios.
- Configurações.
- Módulos.

## Histórico e status

As solicitações não devem ser apagadas, apenas arquivadas.

Estados possíveis:

- recebida;
- em análise;
- encaminhada à unidade;
- aguardando resposta da unidade;
- concluída;
- cancelada.

A odontologia é uma exceção operacional: a vaga já é reservada pelo próprio portal no momento da solicitação.

## Arquitetura modular

O arquivo `portal-modules.js` registra módulos ativos, informativos e futuros.

Cada módulo pode definir:

- identificador;
- nome;
- ícone;
- tipo;
- ativo ou inativo;
- ordem;
- campos;
- agenda;
- reserva automática;
- card;
- regras específicas.

Módulos futuros já previstos:

- Psicologia.
- Fisioterapia.
- Bolsa Família.
- Calendário de exames.
- Transporte sanitário.

A inclusão futura de um módulo não deve exigir reescrever o núcleo do portal nem modificar os módulos existentes.
