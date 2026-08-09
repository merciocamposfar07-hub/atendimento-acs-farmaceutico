# Portal TACS — Administração Geral / Moradores V1.2

Branch isolada: `stabilization/moradores-admin-v1`

Base de produção congelada: `2f5136f52d59cc4a6cf188c0527f56cce3858c79`

## Objetivo

Criar o primeiro módulo da futura **Administração Geral do Portal TACS** sem alterar o Portal do Morador, agendas, odontologia, profissionais, recados, campanhas ou notificações push já estabilizadas.

O primeiro módulo funcional continua sendo **Moradores — Sítio Japaranduba**. `Agentes e áreas`, `Unidades` e `Permissões` são a próxima camada da mesma Administração Geral.

## Decisões estruturais congeladas

### 1. Cadastro de cidadão, não ficha familiar

A aba `MORADORES` representa **uma pessoa por linha**. Um bebê recém-nascido é um cidadão próprio; mãe e pai, quando moradores da área, também possuem cadastros próprios.

Não serão criadas colunas artificiais `NOME_MAE` ou `NOME_PAI` na tabela principal. A relação entre bebê, responsáveis, domicílio e família será uma **camada separada de vínculo familiar**, usando IDs dos cidadãos. Isso evita duplicação de nomes e mantém o cadastro individual limpo.

Um recém-nascido pode ser cadastrado mesmo sem CPF e sem CNS. Para reduzir duplicidade enquanto ainda não existe vínculo familiar, a checagem provisória usa `nome + data de nascimento + endereço`.

### 2. Schema real da base Japaranduba

A leitura real confirmou a aba `MORADORES`, 20 colunas, no seguinte schema oficial:

1. `ID_PORTAL`
2. `ID`
3. `CPF`
4. `CNS`
5. `NOME`
6. `DATA_NASCIMENTO`
7. `IDADE`
8. `SEXO`
9. `ENDERECO`
10. `CELULAR`
11. `TELEFONE_CONTATO`
12. `MICROAREA`
13. `EQUIPE`
14. `ORIGEM`
15. `ULTIMA_ATUALIZACAO`
16. `STATUS`
17. `CONSENTIMENTO_WHATSAPP`
18. `DATA_CONSENTIMENTO`
19. `DATA_CADASTRO_PORTAL`
20. `OBSERVACOES`

A V1.2 **não usa mais detecção aproximada/fuzzy** para decidir em qual coluna escrever. O backend exige os nomes oficiais. Se um cabeçalho crítico faltar ou houver duplicidade, a operação para com segurança; nenhuma posição é presumida.

### 3. Um sistema, várias áreas — nunca clones do Portal

O Portal TACS continuará tendo uma única identidade visual, um único código-base e regras centrais controladas pelo proprietário/Administrador Geral. Outros agentes usarão instâncias lógicas da mesma plataforma e não poderão alterar layout, identidade, código, segurança ou funcionalidades centrais.

### 4. Fonte de moradores isolada por área

Japaranduba mantém a planilha atual:

`114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg`

Futuros moradores de Muntuns ou outra área não serão misturados na fonte pública de Japaranduba. Cada área terá uma fonte de moradores autorizada pelo servidor. O ponto de extensão é `tacsAreasV1ResolverFonteMoradores_(contexto)`.

### 5. Contexto de acesso resolvido no servidor

O módulo trabalha com `operadorId`, `perfil`, `agenteId`, `areaId`, `unidadeId` e `permissoes`. O navegador não escolhe livremente esses valores.

Configuração inicial:

- agente: `AG001`
- área: `JAPARANDUBA`
- unidade: `POSTO_MATIAS`
- perfil: `ADMIN_GERAL`

### 6. Identidade e auditoria

A base mantém o `ID_PORTAL` visível e o módulo também prepara um `MORADOR_ID` técnico estável na aba `TACS_META_AREA` quando a escrita for liberada.

A aba `TACS_AUDIT_MORADORES` registrará quem alterou o quê e quando. Nenhuma exclusão física é permitida.

### 7. Novo cidadão manual

Quando o gate de escrita for liberado, um novo cidadão criado pelo painel receberá:

- `ID_PORTAL` sequencial `TACS-xxxxxx` sob `LockService`;
- `ORIGEM = PAINEL_TACS`;
- `STATUS = ATIVO`;
- `CONSENTIMENTO_WHATSAPP = NÃO` inicialmente;
- `DATA_CADASTRO_PORTAL` no momento do cadastro;
- `ULTIMA_ATUALIZACAO` atualizada;
- `IDADE` calculada a partir de `DATA_NASCIMENTO`;
- microárea/equipe da configuração inicial, editáveis no formulário administrativo.

Campos de sistema de um cadastro existente (`ID_PORTAL`, `ID`, origem, status, consentimento e data de cadastro) não são reescritos por uma edição comum.

### 8. Sem exclusão física

Situações previstas: `ATIVO`, `FORA_DA_AREA`, `TRANSFERIDO`, `FALECIDO`.

A mudança de situação continua bloqueada até a API/Portal do Morador ser testado para não tratar cadastro inativo como morador ativo.

### 9. CSV não é obrigação do agente

O CSV serve para carga inicial e futura reconciliação em massa. O agente não será obrigado a dominar exportação/importação.

O **Administrador Geral poderá importar/atualizar o CSV em nome do agente**. Um agente com facilidade tecnológica poderá receber `CSV_IMPORTAR`, opcionalmente.

A futura conciliação deverá separar novos, atualizados, inalterados, duplicados e conflitos; nunca substituir a base inteira cegamente.

## Fluxo futuro de adesão de agentes — especificado, ainda não implementado

1. agente solicita adesão;
2. informa nome, identificação funcional/CNS, município, unidade, área e contato;
3. cadastro fica `PENDENTE`;
4. Administrador Geral valida/aprova ou configura assistidamente;
5. servidor vincula `AGENTE_ID + AREA_ID + UNIDADE_ID + PERMISSOES`;
6. agente recebe painel simplificado da própria área;
7. Administrador Geral pode suspender, reativar e administrar aquela área;
8. ações relevantes entram em auditoria.

CNS/matrícula são dados de vínculo, **não senha**.

Estados previstos: `PENDENTE`, `APROVADO`, `ATIVO`, `SUSPENSO`.

## Unidade x Área

**Área:** moradores, solicitações, responsável e conteúdos locais.

**Unidade:** profissionais, agendas e conteúdos compartilháveis por várias áreas vinculadas à mesma Unidade de Saúde.

## Push multiárea

O OneSignal estabilizado não será alterado nesta etapa. Quando houver mais de uma área, a assinatura do morador será vinculada a `AREA_ID` para separar avisos locais e campanhas gerais da unidade.

## Gates de estabilização

### Gate 0 — produção atual — CONCLUÍDO

Fonte real identificada e produção preservada.

### Gate 1 — fundação arquitetural — CONCLUÍDO EM CÓDIGO / CI

Contexto servidor, escopo, fonte por área, permissões, identidade, auditoria e bloqueios.

### Gate 2A — primeira leitura real V1.1 — CONCLUÍDA COM ACHADO

A leitura real identificou corretamente `MORADORES`, 263 registros e 20 colunas, mas revelou que o detector aproximado associava campos inexistentes de mãe/pai à coluna `NOME`. Nenhuma escrita ocorreu.

### Gate 2B — correção V1.2 / revalidação real — PENDENTE

A V1.2 exige o schema oficial A:T. É necessário substituir a V1.1 no Apps Script e executar novamente somente `testarConfiguracaoMoradoresAdminPortalV1()`.

Resultado esperado: colunas 1 a 20 exatamente na ordem oficial, `schemaValido:true`, `modeloCadastro:CIDADAO_INDIVIDUAL`, escrita e situação `false`, `nenhumaAlteracaoRealizada:true`.

### Gate 3 — novo / editar — BLOQUEADO

`MORADORES_ADMIN_WRITES_ENABLED` continua desligada. Não ativar antes da revalidação V1.2 e de uma busca real aprovada.

### Gate 4 — situação cadastral — BLOQUEADO

`MORADORES_ADMIN_STATUS_ENABLED` continua desligada. Primeiro adaptar/testar filtro público.

### Gate 5 — reconciliação CSV — NÃO INICIADO

### Gate 6 — Agentes/Áreas/Unidades/Permissões — NÃO INICIADO

## Itens explicitamente não alterados

- `main`;
- `index.html`;
- `moradores-autofill.js`;
- API pública de moradores;
- push OneSignal;
- agendas/vagas;
- odontologia;
- profissionais/serviços;
- recados/campanhas.
