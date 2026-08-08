# Portal TACS — Administração Geral / Moradores V1

Branch isolada: `stabilization/moradores-admin-v1`

Base de produção congelada: `2f5136f52d59cc4a6cf188c0527f56cce3858c79`

## Objetivo

Criar o primeiro módulo da futura **Administração Geral do Portal TACS** sem alterar o Portal do Morador, agendas, odontologia, profissionais, recados, campanhas ou notificações push já estabilizadas.

O primeiro módulo funcional é **Moradores — Sítio Japaranduba**. Os módulos `Agentes e áreas`, `Unidades` e `Permissões` aparecem apenas como direção arquitetural e permanecem bloqueados nesta fase.

## Fonte real de moradores auditada

A consulta pública atual usa uma API Apps Script independente ligada à mesma planilha de moradores. A estrutura auditada reconhece Nome, Nascimento, CPF, CNS, Localidade, Nome da mãe e Nome do pai e mantém compatibilidade com o arranjo legado:

`A Nome | B Nascimento | C CPF | D CNS | E Localidade | G Mãe | H Pai`

O novo backend administrativo usa a **mesma planilha**, mas é instalado como módulo isolado dentro do Apps Script administrativo do Portal TACS para reutilizar a sessão administrativa já existente.

## Regra de instalação

Não criar outro Web App. O backend é acrescentado ao projeto Apps Script administrativo existente e, somente após teste de leitura, a implantação existente poderá receber uma única atualização controlada.

A API pública de moradores continua no endpoint independente atual nesta primeira etapa.

## Gates de estabilização

### Gate 0 — Auditoria da fonte — CONCLUÍDO

- fonte de moradores identificada;
- planilha real identificada;
- cabeçalhos e compatibilidade legada conferidos;
- endpoint público atual preservado.

### Gate 1 — Leitura administrativa — CÓDIGO PRONTO / TESTE REAL PENDENTE

Rotas protegidas por sessão:

- `admin_moradores_status`
- `admin_moradores_buscar`
- `admin_moradores_result`

Status e busca usam POST autenticado. Somente `admin_moradores_result` usa GET com um `requestId` aleatório de alta entropia, evitando colocar o token administrativo na URL. A leitura não cria aba e não grava dados. A escrita começa bloqueada por `MORADORES_ADMIN_WRITES_ENABLED`.

### Gate 2 — Novo / editar morador — BLOQUEADO ATÉ VALIDAR GATE 1

Rota já preparada, mas recusa gravação enquanto o gate estiver fechado:

- `admin_morador_salvar`

Regras:

- sem exclusão física;
- CPF validado quando informado;
- CNS exige 15 dígitos quando informado;
- recém-nascido pode ser cadastrado sem CPF/CNS se houver nome da mãe;
- documento duplicado bloqueia a operação;
- possível duplicidade de pessoa sem documento exige revisão manual;
- alteração de CPF/CNS preserva a identidade interna quando já houver metadado.

Depois da leitura real validada, a função administrativa `ativarEscritaMoradoresAdminPortalV1()` libera novo/editar por Script Property, sem precisar mudar o código novamente.

### Gate 3 — Situação cadastral — BLOQUEADO

Situações previstas:

- `ATIVO`
- `FORA_DA_AREA`
- `TRANSFERIDO`
- `FALECIDO`

Esse gate permanece separado (`MORADORES_ADMIN_STATUS_ENABLED`) porque a API pública atual ainda precisa ser atualizada e validada para não retornar cadastros inativos. Não liberar situação antes dessa proteção.

A aba técnica de metadados se chama `TACS_META_AREA` e usa cabeçalhos deliberadamente incompatíveis com o detector da API pública antiga, evitando que ela seja confundida com uma tabela de moradores.

### Gate 4 — Atualização CSV — SOMENTE PRÉVIA LOCAL NESTA FASE

O painel já consegue abrir um CSV no próprio aparelho, detectar separador e reconhecer cabeçalhos para prévia. **Nenhum CSV é enviado ao servidor nesta fase.**

A importação real só será implementada depois do CRUD diário estabilizado, com índice em memória e conciliação em lote:

- novos;
- atualizados;
- inalterados;
- duplicados;
- conflitos para revisão.

Nunca substituir a base inteira cegamente.

### Gate 5 — Administração Geral multiárea — PROJETADO, NÃO IMPLEMENTADO

Depois de Japaranduba estabilizada, a mesma Administração Geral receberá:

- cadastro/adesão de agentes;
- áreas e microáreas;
- unidades de saúde;
- permissões;
- configuração assistida pelo Administrador Geral;
- isolamento por `AGENTE_ID`, `AREA_ID` e `UNIDADE_ID`;
- futura segmentação de push por área.

O agente comum não poderá alterar identidade visual, código ou regras centrais do Portal TACS.

## Arquivos desta fase

- `apps-script/ZZZZ_15_MoradoresAdminPortalV1.gs`
- `teste-v1/painel-moradores-v1.html`
- `scripts/test_moradores_admin_v1.js`
- `MORADORES_RELEASE_GATE_V1.json`
- `.github/workflows/moradores-admin-tests.yml`

## Itens explicitamente não alterados

- `index.html`
- `moradores-autofill.js`
- push OneSignal 1.1.1
- agendas e vagas
- odontologia
- profissionais e serviços
- recados e campanhas
- `main`

## Próxima validação real

1. instalar **somente** `ZZZZ_15_MoradoresAdminPortalV1.gs` no Apps Script administrativo real;
2. executar `testarConfiguracaoMoradoresAdminPortalV1()`;
3. confirmar `ok:true`, versão `1.0.0`, área `JAPARANDUBA`, aba fonte e quantidade coerente;
4. ainda não ativar escrita;
5. atualizar a implantação existente apenas quando a leitura estiver comprovada;
6. testar o painel em modo somente leitura;
7. somente então abrir Gate 2.
