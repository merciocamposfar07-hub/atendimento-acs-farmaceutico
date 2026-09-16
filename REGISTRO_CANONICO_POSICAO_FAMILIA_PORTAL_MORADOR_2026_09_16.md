# Correção isolada — posição da família no Portal do Morador

Data: 16/09/2026.

Pedido: exibir os integrantes na identificação, abaixo da área do PIN, em vez de acima do cabeçalho TACS.

Fluxo: PIN validado → sessão do morador → identificação / área do PIN → seleção familiar → solicitação.

Ponto único de ligação: renderFamily em conecta-morador-session-v1.js. A seção cscFamilySession é inserida após portalResidentPinV1; se a área do PIN ainda não existir, após o label do CPF, na mesma identificação. Ocupa todas as colunas da grade. Não altera autenticação, busca familiar, seleção, cadastro, cache de dados ou backend.

Entrega: ajuste de posição e versão do arquivo na entrada index.html. Reversão: restaurar o ponto de inserção anterior em renderFamily.

Verificação: sintaxe JavaScript; teste existente de núcleo familiar; simulação de DOM para posição com/sem caixa PIN, clique preservado e ausência de duplicação ao renderizar novamente. Não representa validação visual no iPhone da moradora.
