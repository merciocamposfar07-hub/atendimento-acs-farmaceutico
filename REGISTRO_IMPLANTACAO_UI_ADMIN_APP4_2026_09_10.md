# Registro de implantação — UI administrativa App4

Data: 10/09/2026
Contrato visual: `CSC-CENTRAL-ADMIN-UI-APP4-2026-09-10`
Status: **CAMADA VISUAL GERAL IMPLANTADA NA MAIN**

## Decisão aplicada
Após aprovação da opção **4 • App institucional**, a linguagem visual antiga dos painéis administrativos passou a ser substituída pela fonte visual canônica `admin-ui-standard.inline.css`.

A mudança é exclusivamente de apresentação nesta etapa: IDs, classes funcionais, `data-*`, campos, seletores JavaScript, regras de negócio, autenticação, sessão, isolamento territorial, APIs, leituras e gravações foram preservados.

O Portal do Morador / Portal TACS público permanece fora desta migração, conforme decisão do usuário.

## Superfícies administrativas abrangidas
- `central-administrativa-tacs.html`
- `painel-oficial-organizacoes-municipios.html`
- `painel-oficial-agendas-vagas.html`
- `painel-oficial-profissionais-servicos.html`
- `painel-oficial-recados-campanhas.html`
- `painel-oficial-tacs-areas.html`
- `teste-v1/painel-moradores-v2.html`
- `teste-v1/painel-profissionais-servicos-v1.html`
- `teste-v1/painel-tacs-areas-v1.html`

Os wrappers de Profissionais/Serviços e TACS/Áreas carregam fontes internas; por isso as fontes internas também estão no contrato de injeção, evitando que a tela volte ao visual antigo depois do carregamento.

## Elementos canônicos aplicados
- fundo `#071827` e topo `#0b263d`;
- superfícies `#102d46` / `#153b58`;
- cards institucionais em azul-petróleo com profundidade e borda ciano controlada;
- acento verde `#83efa9` e ciano `#62c8e8`;
- campos claros de alta legibilidade sobre superfícies escuras;
- botões, abas, estados, listas, details, tabelas e áreas de edição harmonizados;
- cabeçalho administrativo com o ícone oficial `CSC-CENTRAL-ICON-2026-09-09`;
- tratamento responsivo para iPhone/Android/browser;
- estados semânticos de erro, alerta e sucesso preservados.

## Mecanismo de manutenção
A fonte única é `admin-ui-standard.inline.css`.
O injetor `scripts/injetar_admin_ui_standard_v1.py` distribui o padrão somente aos HTMLs administrativos declarados em `TARGETS`.
O workflow `.github/workflows/aplicar-admin-ui-app4-main.yml` executa injeção, validação, `git diff --check` e grava somente os HTMLs administrativos.

## Validação automatizada
O teste `scripts/test_admin_ui_app4_canonical.py` exige:
- presença do contrato canônico;
- tokens centrais da opção App4;
- referência ao ícone oficial;
- marcador único de injeção em cada painel;
- presença do padrão App4 em todas as superfícies administrativas-alvo;
- exclusão de páginas públicas do injetor.

Execução inicial do workflow: `34499718394`
Resultado: `success`.
Commit de distribuição gerado pelo workflow: `32dc9eec33c425468f81d4b361a6d509998993eb`.

## Próxima etapa
A implantação visual geral não é uma declaração de que a arquitetura antiga de dados/desempenho foi substituída. A etapa seguinte continua sendo a migração funcional painel por painel para o app shell persistente, começando por **Agendas e vagas**, com cache por área, deduplicação, atualização em segundo plano e confirmação real de gravação.
