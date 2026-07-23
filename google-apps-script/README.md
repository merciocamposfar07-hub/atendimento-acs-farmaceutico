# Agenda odontológica do TACS

Esta integração usa uma Planilha Google privada para manter as vagas comuns e
emergenciais de segunda, terça e quinta-feira. O portal público recebe somente
datas e quantidades. Nome, data de nascimento, CPF, endereço e descrição da
solicitação continuam sendo enviados somente pelo WhatsApp.

## Estrutura criada

- `AGENDA`: data, dia, vagas comuns e vagas emergenciais.
- `RESERVAS`: código da solicitação, horário, data escolhida, tipo e situação.

## Configuração inicial

1. Crie uma Planilha Google chamada `Agenda Odontológica TACS`.
2. Abra `Extensões` → `Apps Script`.
3. Substitua o conteúdo de `Code.gs` pelo arquivo deste diretório.
4. Abra as configurações do projeto, ative a exibição do manifesto e substitua
   `appsscript.json` pelo arquivo deste diretório.
5. Execute `configurarPlanilha` e aceite as permissões solicitadas pelo Google.
6. Clique em `Implantar` → `Nova implantação` → `Aplicativo da Web`.
7. Selecione `Executar como: você` e acesso para qualquer pessoa.
8. Copie o endereço terminado em `/exec`.
9. Cole esse endereço em `agenda-config.js`.

A planilha continua privada na sua conta Google. A opção “qualquer pessoa” dá
acesso somente ao pequeno aplicativo que consulta e reduz as quantidades; ela
não permite que outras pessoas abram ou editem a planilha.

## Uso diário

Abra a planilha pelo aplicativo Google Planilhas no iPhone. Na aba `AGENDA`,
edite somente:

- `Vagas comuns`;
- `Vagas emergenciais`.

Para abrir novas datas, use o menu `Agenda da dentista` →
`Adicionar próxima semana` e depois informe as quantidades.

Quando houver desistência ou cancelamento, acrescente novamente uma vaga na
coluna correspondente. A aba `RESERVAS` serve apenas para conferência e não
deve ter suas linhas apagadas durante o uso normal.

## Regra da reserva

Ao concluir o formulário odontológico, o portal solicita a reserva antes de
abrir o WhatsApp. O Apps Script usa um bloqueio compartilhado para que duas
pessoas não retirem a mesma última vaga. Uma tentativa repetida com o mesmo
código não reduz a quantidade novamente.

A reserva é registrada sem nome, nascimento ou CPF. Esses dados continuam
somente na mensagem que o próprio paciente envia pelo WhatsApp.
