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

O código operacional atual já possui a regra correta:

`CPF/CNS → localizar morador na área → resolver código familiar do morador → listar integrantes`.

Também não contém mais a mensagem legada acima e não exige segunda confirmação documental.

O defeito estava no carregador do navegador: `portal-auto-update.js` continuava chamando `portal-identificacao-familia-v1.js` com a mesma chave de cache usada antes da correção do fluxo familiar. Em aparelhos que já haviam aberto o Portal, uma cópia anterior do JavaScript podia permanecer reutilizada.

Isso explica o comportamento reaparecer de forma dependente do aparelho/cache mesmo com o arquivo-fonte atual correto.

## Correção aplicada

Alterado somente o carregamento do módulo familiar:

Antes:
`portal-identificacao-familia-v1.js?v=20260915-familia-direta-v1`

Agora:
`portal-identificacao-familia-v1.js?v=20260915-familia-documento-direto-v2`

Não foi alterada a lógica de vagas, agendas, serviços, profissionais, UBS, TACS, login, PIN ou demais módulos.

A consolidação do Portal também renovou a referência de `portal-auto-update.js` no `index.html`, obrigando os aparelhos a buscar o carregador atualizado.

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

- `35f0ef71a968dd622b3858db0334ee280071b155` — invalida cache antigo do módulo familiar;
- `d7e829994f3dafaf6730d48b3c6080869d745b2c` — consolidação integral automática do Portal;
- `29acb6fa5310179aff135596ff5c3ff99798b67b` — teste de regressão contra retorno do cache familiar legado.

## Publicação

GitHub Pages run `35035689197`: **success**.

Nenhum novo deploy de Apps Script foi necessário nesta correção, porque o backend operacional já contém a regra correta e a falha localizada era de entrega/cache do módulo JavaScript no navegador.

## Estado

**CORRIGIDO NO CÓDIGO E PUBLICADO — validação real do usuário no dispositivo pendente.**
