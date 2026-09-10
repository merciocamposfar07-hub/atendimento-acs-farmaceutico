# Registro de correção — UI administrativa App institucional R2

Data: 10/09/2026

## Situação da entrega anterior

A implantação administrativa anterior que apenas aplicou parte da linguagem visual App4 sobre a estrutura antiga fica registrada como **REJEITADA / SUPERADA**. Ela não constitui homologação visual do Conecta Saúde Comunitária.

O motivo da rejeição foi a permanência de elementos visuais do modelo anterior: molduras externas expressivas, contornos azul-claro espessos, apresentação de cards divergente do protótipo, cabeçalhos repetitivos e identidade institucional insuficientemente destacada.

## Referência canônica preservada

A referência visual continua sendo a opção **4 • App institucional**, aprovada em 10/09/2026 e registrada em `DECISAO_CANONICA_UI_CENTRAL_APP_INSTITUCIONAL_2026_09_10.md`.

Protótipo-fonte: `homologacao-ui-corporativa/comparativo-app.html`.

Commit de referência visual aprovado: `2ad1d133d19cf8484f3d0f7204889e98eed574f4`.

Contrato atual: `CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10-R2`.

## Regras obrigatórias da R2

- Tela administrativa contínua, com aspecto de aplicativo, sem moldura estrutural externa nas laterais, no topo ou na base.
- Paleta e hierarquia do protótipo App institucional, com fundo `#071827`, topo `#0b263d`, cards `#102d46` / `#153b58`, linhas discretas `#2b5a76`, verde `#83efa9` e azul `#62c8e8`.
- Ícone oficial do Conecta Saúde Comunitária em destaque no cabeçalho, maior que na implementação rejeitada.
- Texto `CONECTA SAÚDE COMUNITÁRIA` destacado no cabeçalho de todos os painéis administrativos.
- Cada módulo exibe o seu próprio título; não repetir genericamente `Central Administrativa` dentro de todos os módulos.
- O PIN é digitado no acesso inicial. Enquanto a sessão administrativa validada permanecer ativa, os módulos reutilizam o token existente e não apresentam novamente os controles de PIN.
- A remoção visual do PIN não cria nem contorna autenticação: se o token deixar de existir ou for invalidado pelo fluxo do módulo, os controles voltam a ficar disponíveis.
- Botões, cards acionáveis e abas devem apresentar reação visual ao toque; em dispositivos compatíveis, há feedback háptico curto.
- O Portal do Morador / Portal TACS público permanece fora desta alteração visual.
- Lógica de dados, IDs funcionais, permissões do servidor e integrações existentes não devem ser substituídas pela camada de layout.

## Painéis cobertos

1. Central Administrativa.
2. Moradores.
3. Suporte aos moradores.
4. Diagnóstico dos aparelhos.
5. Recados e campanhas.
6. Agendas e vagas.
7. Profissionais e serviços.
8. TACS e áreas.
9. Municípios e organizações.
10. Versões internas correspondentes de Profissionais/Serviços e TACS/Áreas usadas pelos fluxos existentes.

## Estado de homologação

A R2 pode ser considerada **implantada somente após os testes automatizados e o deploy do GitHub Pages concluírem com sucesso**.

A **homologação visual final permanece pendente da conferência do usuário no iPhone**. Nenhum registro técnico deve substituir essa validação visual final.
