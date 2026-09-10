# Registro de correção — App institucional R6

Data: 10/09/2026

## Correções desta revisão

A R6 consolida a exigência de **tela única** na área administrativa do Conecta Saúde Comunitária.

- Cabeçalho, corpo, rodapé e dock usam a mesma base `#071827`, sem faixas estruturais de cores diferentes.
- Cards funcionais permanecem na mesma família azul-petróleo do App institucional.
- Nenhum estado cria grandes blocos vermelhos, verdes ou dourados.
- Textos secundários, avisos, manutenção e rodapés receberam contraste reforçado.
- Ícones dos painéis foram ampliados e receberam maior contraste.
- O ícone oficial do Conecta Saúde Comunitária não foi alterado.
- O retorno pelo histórico/BFCache do iPhone restaura imediatamente a Central a partir do contexto salvo e depois realiza a releitura do servidor.
- URLs internas receberam revisão `20260910-app4-r6` para evitar reutilização de HTML antigo pelo Safari.
- A sessão administrativa única e o PIN individual do TACS permanecem preservados.

## Cobertura

Central Administrativa e as 10 superfícies administrativas internas/externas já cobertas pelo injetor canônico, totalizando 11 páginas administrativas.

## Validação técnica

O workflow `Aplicar UI App4 canônica aos painéis administrativos` foi concluído com sucesso na R6 e os 11 arquivos foram confirmados com o contrato `CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10-R6`.

A homologação visual final permanece pendente do teste no iPhone.
