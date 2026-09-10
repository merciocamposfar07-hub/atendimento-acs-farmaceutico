# Registro — correções pontuais de UI, diagnóstico, Perfil e Agendas

Data: 10/09/2026  
Status: APROVADO PELO USUÁRIO PARA IMPLEMENTAÇÃO  
Validação visual final: PENDENTE DE TESTE NO IPHONE DO USUÁRIO

## Escopo aprovado
1. Remover os balões brancos remanescentes, especialmente o contêiner de seleção da área de moradores.
2. Remover do rodapé a faixa estática “2026/2027”; ela não representa dado funcional do sistema.
3. No diagnóstico, manter apenas os quatro indicadores visíveis por padrão. Os cartões detalhados dos aparelhos só aparecem quando o usuário toca em Aptos, Inativos, Reparo ou Sem confirmação.
4. O filtro dos detalhes usa o status oficial devolvido pelo backend: ATIVO, INATIVO, REPARO e SEM_CONFIRMACAO.
5. Em Perfil, “Administrador geral” passa a ser um controle expansível. Ao tocar, são exibidos os nomes de administradores encontrados nos cadastros administrativos existentes; nenhuma credencial ou PIN é exposto.
6. Corrigir o travamento ao abrir Agendas e vagas: o módulo passa a abrir por navegação direta a partir da Central e a limpeza de elementos legados deixa de usar MutationObserver contínuo.

## Limites da alteração
- Não alterar cadastros de moradores, agendas, vagas ou conteúdo clínico.
- Não apagar, recriar ou reassociar vínculos Push.
- Não alterar o ícone oficial canônico.
- Não alterar o isolamento territorial.
- Não considerar a correção validada visualmente até teste do usuário no iPhone.

## Implementação
A camada visual canônica continua sendo a App institucional R6. As alterações acima são correções pontuais sobre a mesma base e devem ser reinjetadas apenas nos painéis administrativos previstos pelo fluxo existente.
