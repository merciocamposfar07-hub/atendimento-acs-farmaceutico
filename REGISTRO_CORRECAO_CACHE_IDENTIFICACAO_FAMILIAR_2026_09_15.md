# Registro de correção — cache legado da identificação familiar

Data: 15/09/2026  
Escopo: Portal TACS / Morador  
Tipo: correção cirúrgica de carregamento do módulo familiar; nenhuma nova versão funcional do Portal foi criada.

## Sintoma observado

Após CPF ou Cartão SUS (CNS) ser reconhecido e os dados pessoais carregarem corretamente, o Portal ainda podia exibir:

**“Informe um número de cadastro familiar válido.”**

Nesse estado, a lista dos integrantes da família deixava de aparecer.

## Causa confirmada

A frase exibida pertence à lógica antiga do módulo familiar. Ela existe nas revisões anteriores do backend familiar, nas quais a consulta pública exigia obrigatoriamente um número de família antes de prosseguir.

O fluxo atual correto é:

`CPF/CNS → localizar morador na área → resolver código familiar do próprio morador → listar integrantes`.

Foram encontrados dois pontos específicos que permitiam a regressão:

1. `moradores-autofill.js` recebia `familiaBeneficiario/familiaId` do backend, mas o evento `tacs:morador` repassava apenas o objeto interno `morador`. Assim, o módulo familiar perdia a família já resolvida e precisava tentar resolvê-la novamente pelo documento;
2. `portal-auto-update.js` ainda reutilizava uma chave de cache anterior do módulo familiar, permitindo que aparelhos que já haviam aberto o Portal mantivessem uma cópia anterior da lógica.

A combinação desses dois pontos explica o comportamento intermitente entre aparelhos e o reaparecimento da mensagem antiga.

## Correção aplicada

Foram alterados somente os pontos do fluxo familiar responsáveis pela regressão:

- `moradores-autofill.js` agora inclui `familiaBeneficiario/familiaId` no próprio evento `tacs:morador`;
- `portal-identificacao-familia-v1.js` passa a usar primeiro essa família já resolvida e envia **família + CPF/CNS** juntos na consulta;
- se a família não vier no payload, a busca direta pelo documento permanece como fallback;
- `portal-auto-update.js` recebeu nova chave de cache para obrigar os aparelhos a baixar a correção.

Chave atual:
`portal-identificacao-familia-v1.js?v=20260915-familia-resolvida-v3`

Não foi alterada a lógica de vagas, agendas, serviços, profissionais, UBS, TACS, login, PIN ou demais módulos.

## Contrato preservado

- CPF reconhecido deve carregar a família correspondente;
- CNS reconhecido deve carregar a família correspondente;
- número do cadastro familiar continua localizando a família diretamente;
- nenhum desses três caminhos exige uma segunda confirmação por CPF/CNS;
- integrantes ativos permanecem selecionáveis;
- a mensagem legada **“Informe um número de cadastro familiar válido.”** não pode reaparecer após CPF/CNS reconhecido.

## Verificações de código

Confirmado em `main`:
- `searchFamilyByDocument(documento)` presente;
- evento `tacs:morador` chama busca familiar pelo documento reconhecido;
- backend resolve documento por `moradoresAdminV1BuscarPublico_(documento,contexto.areaId)`;
- texto legado ausente no backend atual;
- controles `data-family-confirm` / `Confirmar família` ausentes;
- chave antiga de cache removida do carregador;
- nova chave de cache presente;
- `index.html` aponta para `portal-auto-update.js?v=35f0ef71a968`.

## Commits

- `35f0ef71a968dd622b3858db0334ee280071b155` — primeira invalidação do cache antigo;
- `29acb6fa5310179aff135596ff5c3ff99798b67b` — teste contra retorno do cache legado;
- `46de505e21bd5fb2509f411b2e74f1b14ce3c233` — repassa a família resolvida no evento do autofill;
- `9cf2d8df16aa2f74a64a35170058007b4cce27ca` — usa família resolvida + CPF/CNS na consulta familiar;
- `00b25f44dc844322b8082eec7f7a710c4544eda7` — renova o cache da família resolvida;
- `55c1e8702b031945faf03eb4c877f6b791117e9c` — consolidação integral automática do Portal;
- `702954d87aed7a541440273e1f3f8f68b84c13e7` — contrato de regressão da família resolvida.

## Publicação

GitHub Pages run `35035689197`: **success**.

Nenhum novo deploy de Apps Script foi necessário nesta correção, porque o backend operacional já contém a regra correta e a falha localizada era de entrega/cache do módulo JavaScript no navegador.

## Estado

**CORRIGIDO NO CÓDIGO E PUBLICADO — validação real do usuário no dispositivo pendente.**
