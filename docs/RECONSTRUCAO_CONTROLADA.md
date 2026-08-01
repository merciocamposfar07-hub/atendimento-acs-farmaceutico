# Reconstrução controlada do Portal TACS

## Regra principal

A versão pública em `main` fica congelada. Nenhuma correção nova será publicada diretamente para os moradores até que a nova estrutura passe pelos testes definidos neste documento.

Todo o desenvolvimento será feito na branch:

`reconstrucao-controlada-v1`

O Portal Farmacêutico permanece separado e não será alterado.

## Inventário confirmado em 01/08/2026

Planilhas existentes:

1. `Portal TACS – Banco de Dados` — será a fonte única e oficial do Portal TACS.
2. `Agenda Odontológica TACS` — fonte antiga; seus dados válidos serão migrados para a base principal.
3. `Avisos TACS – Unidade de Saúde Posto Matias` — fonte antiga; seus avisos válidos serão migrados para a base principal.
4. `Cópia de Avisos TACS – Unidade de Saúde...` — cópia de segurança; não será usada como fonte ativa.

## Fonte única de verdade

Depois da migração, o Portal do Morador não poderá criar dias, vagas, serviços ou textos por conta própria.

O que não estiver ativo na planilha principal não aparecerá no portal.

Fluxo obrigatório:

`Modo administrador → Apps Script → Portal TACS – Banco de Dados → Portal do Morador`

## Abas que serão preservadas

O código existente já prevê estas abas e elas serão reaproveitadas:

- `PAINEL_PROFISSIONAIS`
- `RECADOS_PORTAL`
- `CAMPANHAS_PORTAL`

`PAINEL_PROFISSIONAIS` continuará sendo a agenda operacional, com campos para profissional/módulo, dia, ativação, data, horário, situação, mensagem/serviço, encerramento, vagas comuns, vagas emergenciais e dia extra.

## Abas que serão acrescentadas

- `CONFIG_PORTAL`
- `PROFISSIONAIS`
- `SERVICOS`
- `RESERVAS`
- `AUDITORIA`

### CONFIG_PORTAL

Controlará nome da unidade, localidade, WhatsApp, horário de atendimento, textos fixos, rodapé, manutenção e versão pública.

### PROFISSIONAIS

Campos mínimos:

`ID, NOME, MODULO, TITULO_PUBLICO, ICONE, ORDEM, ATIVO, ATUALIZADO_EM`

### SERVICOS

Campos mínimos:

`ID, PROFISSIONAL_ID, NOME, DESCRICAO_AUTOMATICA, ORDEM, ATIVO, PERMITE_VAGA_COMUM, PERMITE_EMERGENCIA, ATUALIZADO_EM`

### PAINEL_PROFISSIONAIS

Campos existentes preservados:

`MODULO, ORDEM, DIA, ATIVO, DATA, HORARIO, SITUACAO, MENSAGEM, ENCERRA_12H, VAGAS_COMUNS, VAGAS_EMERGENCIAIS, DIA_EXTRA, ATUALIZADO_EM`

Na nova leitura, somente linhas ativas e válidas poderão ser mostradas ao morador.

### RESERVAS

Campos mínimos:

`ID, CODIGO, DATA_HORA, PROFISSIONAL_ID, SERVICO_ID, DATA_AGENDA, TIPO_VAGA, NOME, NASCIMENTO, IDADE, CPF_CNS, LOCALIDADE, DESCRICAO, STATUS`

### AUDITORIA

Campos mínimos:

`ID, DATA_HORA, ACAO, TABELA, REGISTRO_ID, VALOR_ANTERIOR, VALOR_NOVO, ORIGEM`

## API única

O projeto principal `Portal TACS – Banco de Dados` terá uma única implantação de aplicativo da Web.

Leitura pública:

- `action=bootstrap`
- `action=status`

Administração:

- `action=salvar_config`
- `action=salvar_profissional`
- `action=salvar_servico`
- `action=salvar_agenda`
- `action=salvar_recado`
- `action=salvar_campanha`
- `action=cancelar_item`

Reservas:

- `action=reservar_vaga`
- `action=cancelar_reserva`

A reserva usará `LockService` para impedir duas reservas simultâneas da última vaga.

## Segurança

O PIN não ficará escrito no JavaScript público.

O PIN desbloqueará a tela administrativa, mas toda gravação será validada no Apps Script. O servidor emitirá uma sessão administrativa temporária. Segredos e hash do PIN ficarão em `PropertiesService`.

## O que será editável

- configurações institucionais;
- profissionais atuais e futuros;
- competências e serviços;
- ordem de exibição;
- profissional ativo ou desativado;
- serviço ativo ou desativado;
- todos os dias de segunda a sexta, mesmo quando desativados;
- datas e horários;
- dias oficiais e extras;
- vagas comuns e emergenciais;
- textos automáticos da descrição;
- recados, campanhas e avisos;
- encerramento automático de agenda;
- cancelamentos.

## Testes obrigatórios antes da publicação

1. Alterar um texto em `CONFIG_PORTAL` e confirmar no ambiente de teste.
2. Desativar um profissional e confirmar seu desaparecimento.
3. Reativar o profissional e confirmar seu retorno.
4. Desativar um serviço e confirmar seu desaparecimento.
5. Adicionar sexta-feira como dia extra e confirmar sua aparição.
6. Remover/desativar sexta-feira e confirmar seu desaparecimento.
7. Alterar vagas comuns e emergenciais e confirmar os valores exatos.
8. Selecionar enfermeira, médica, nutricionista e dentista e verificar a descrição automática correta.
9. Reservar a última vaga e confirmar a redução na planilha.
10. Tentar reservar novamente e confirmar o bloqueio.
11. Testar recados e campanhas com validade.
12. Validar no Safari/iPhone, Chrome/Android e navegador aberto pelo WhatsApp.
13. Simular falha do servidor: o portal deve mostrar erro, nunca inventar dias ou vagas.

## Critério para publicar

A branch só poderá ser incorporada à `main` quando todos os testes estiverem marcados como aprovados. Até lá, o link público não será usado para divulgação aos moradores.
