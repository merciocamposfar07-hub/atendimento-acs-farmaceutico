# Portal TACS — Administração Geral / Moradores V1.1

Branch isolada: `stabilization/moradores-admin-v1`

Base de produção congelada: `2f5136f52d59cc4a6cf188c0527f56cce3858c79`

## Objetivo

Criar o primeiro módulo da futura **Administração Geral do Portal TACS** sem alterar o Portal do Morador, agendas, odontologia, profissionais, recados, campanhas ou notificações push estabilizadas.

O primeiro módulo funcional continua sendo **Moradores — Sítio Japaranduba**. `Agentes e áreas`, `Unidades` e `Permissões` são a próxima camada da mesma Administração Geral; não são projetos separados.

## Decisões estruturais congeladas

### 1. Um sistema, várias áreas — nunca clones do Portal

O Portal TACS continuará tendo uma única identidade visual, um único código-base e regras centrais controladas pelo proprietário/Administrador Geral. Outros agentes usarão instâncias lógicas da mesma plataforma e não poderão alterar layout, identidade, código, segurança ou funcionalidades centrais.

### 2. Fonte de moradores isolada por área

Japaranduba mantém exatamente a planilha de moradores já usada hoje:

`114ObXLQ8sQSDosauEbAdlhQRWNksJ20Kq57CucpKbTg`

A API pública atual procura CPF/CNS nas abas da fonte configurada. Por segurança, futuros moradores de Muntuns ou de outra área **não serão simplesmente misturados nessa planilha pública de Japaranduba**. Cada área terá uma fonte de moradores autorizada pelo servidor. O futuro módulo `Áreas` resolverá essa fonte sem aceitar `areaId` fornecido pelo navegador.

O código já possui o ponto de extensão `tacsAreasV1ResolverFonteMoradores_(contexto)`. Enquanto esse módulo não existir, somente `JAPARANDUBA` é aceita.

### 3. Contexto de acesso resolvido no servidor

O módulo trabalha com:

- `operadorId`
- `perfil`
- `agenteId`
- `areaId`
- `unidadeId`
- `permissoes`

O navegador não escolhe livremente esses valores. O backend deriva o contexto da sessão validada e, enquanto a autenticação multiagente ainda não existe, a sessão administrativa atual é tratada como `ADMIN_GERAL` da configuração inicial.

Configuração inicial:

- agente interno: `AG001`
- área: `JAPARANDUBA`
- unidade: `POSTO_MATIAS`
- perfil: `ADMIN_GERAL`

Esses identificadores são internos e podem ser substituídos por Script Properties sem mudar o código.

### 4. Identidade interna estável do morador

A base pública atual permanece com seus campos usuais. Informações técnicas ficam em uma aba separada `TACS_META_AREA`, com cabeçalhos deliberadamente incompatíveis com o detector da API pública antiga.

Cada morador que passar por uma operação administrativa recebe um `MORADOR_ID` interno estável. O vínculo não depende apenas do número da linha; CPF/CNS e identidade auxiliar são usados para preservar o mesmo morador quando documentos forem acrescentados ou corrigidos.

Metadados incluem, internamente:

- identidade do morador;
- chave de correspondência;
- origem do registro;
- CPF/CNS técnicos;
- situação;
- agente;
- área;
- unidade;
- criado em / atualizado em;
- operador responsável;
- origem do cadastro.

### 5. Auditoria das alterações

A aba técnica `TACS_AUDIT_MORADORES` registra mutações do módulo com:

- evento;
- morador interno;
- ação;
- agente/área/unidade;
- operador;
- campos alterados;
- data/hora.

Ela não duplica toda a ficha clínica/cadastral. O objetivo é saber **quem alterou o quê e quando**.

### 6. Sem exclusão física

Situações previstas:

- `ATIVO`
- `FORA_DA_AREA`
- `TRANSFERIDO`
- `FALECIDO`

A pessoa não é apagada da base. Porém esse gate continua bloqueado até a API pública ser adaptada e testada para não devolver como ativo um cadastro que deixou de pertencer à área.

### 7. CSV não é obrigação do agente

O CSV serve para carga inicial e futura reconciliação em massa. O agente não será obrigado a dominar exportação/importação para usar o Portal.

O **Administrador Geral poderá importar/atualizar o CSV em nome do agente**. Um agente com facilidade tecnológica poderá receber a permissão `CSV_IMPORTAR`, mas isso será opcional.

Nesta fase o painel apenas lê o CSV localmente para prévia; nenhum arquivo é enviado ao servidor.

A futura conciliação deverá classificar:

- novos;
- atualizados;
- inalterados;
- duplicados;
- conflitos para revisão.

Nunca substituir a base inteira cegamente.

## Fluxo futuro de adesão de agentes — especificado, ainda não implementado

1. agente escolhe `Quero utilizar o Portal TACS`;
2. preenche cadastro próprio (nome, identificação funcional/CNS, município, unidade, área, contato);
3. cadastro fica `PENDENTE`;
4. Administrador Geral valida/aprova ou configura assistidamente;
5. o servidor vincula `AGENTE_ID + AREA_ID + UNIDADE_ID + PERMISSOES`;
6. o agente recebe o painel simplificado da própria área;
7. o Administrador Geral pode suspender, reativar e administrar aquela área usando a própria credencial;
8. todas as ações relevantes entram em auditoria.

CNS/matrícula são dados de vínculo, **não senha** e não constituem autenticação suficiente.

Estados de agente previstos: `PENDENTE`, `APROVADO`, `ATIVO`, `SUSPENSO`.

## Perfis e permissões — fundação pronta, cadastro de agentes pendente

O módulo Moradores já entende a ideia de perfil/permissões no contexto do servidor. O Administrador Geral tem acesso integral. Futuramente agentes comuns receberão somente permissões explícitas, por exemplo:

- `MORADORES_LER`
- `MORADORES_EDITAR`
- `MORADORES_SITUACAO`
- `CSV_IMPORTAR`
- permissões de recados/campanhas conforme a política da plataforma.

O painel do agente deverá ser simples. Complexidade de planilha, Apps Script, GitHub e OneSignal não será exposta como requisito de uso.

## Unidade x Área

A arquitetura preserva a separação discutida:

**Área:** moradores, solicitações da área, responsável, informações locais e recados locais.

**Unidade:** profissionais, agendas e conteúdos que podem ser compartilhados por várias áreas vinculadas à mesma unidade.

Assim não será necessário duplicar uma agenda médica para cada agente quando as áreas compartilham a mesma Unidade de Saúde.

## Push multiárea

O OneSignal 1.1.1 estabilizado não será alterado agora. Quando houver mais de uma área, a assinatura do morador será vinculada a `AREA_ID` e o envio deixará de usar um alvo coletivo indiscriminado para conteúdos locais.

Exemplo futuro:

- recado de Muntuns → Muntuns;
- recado de Japaranduba → Japaranduba;
- campanha geral da unidade → áreas vinculadas à unidade.

## Gates de estabilização

### Gate 0 — fonte atual — CONCLUÍDO

- fonte real identificada;
- cabeçalhos e compatibilidade legada conferidos;
- endpoint público preservado.

### Gate 1 — fundação arquitetural — CONCLUÍDO EM CÓDIGO / CI

- contexto servidor;
- `MORADOR_ID` estável;
- escopo agente/área/unidade;
- fonte isolada por área;
- permissões;
- metadados seguros;
- auditoria;
- bloqueios de escrita.

### Gate 2 — leitura administrativa real — PENDENTE

Rotas:

- POST `admin_moradores_status`
- POST `admin_moradores_buscar`
- GET `admin_moradores_result` somente para consultar resultado por `requestId` aleatório.

Token administrativo não é colocado na URL.

### Gate 3 — novo / editar — BLOQUEADO

Rota preparada: `admin_morador_salvar`.

A Script Property `MORADORES_ADMIN_WRITES_ENABLED` começa desligada. Depois da leitura real comprovada, `ativarEscritaMoradoresAdminPortalV1()` prepara as abas técnicas e libera somente cadastro/edição.

### Gate 4 — situação cadastral — BLOQUEADO

`MORADORES_ADMIN_STATUS_ENABLED` permanece desligada. Não existe procedimento de ativação nesta versão. Primeiro será criado e testado o filtro público.

### Gate 5 — reconciliação CSV — NÃO INICIADO

A prévia local existe; escrita em lote ainda não.

### Gate 6 — Agentes/Áreas/Unidades/Permissões — NÃO INICIADO

A fundação de contexto está pronta no módulo Moradores, mas o cadastro/adesão multiagente ainda não foi liberado.

## Itens explicitamente não alterados

- `main`;
- `index.html`;
- `moradores-autofill.js`;
- API pública de moradores;
- push OneSignal 1.1.1;
- agendas/vagas;
- odontologia;
- profissionais/serviços;
- recados/campanhas.

## Próxima validação real

Somente depois do CI verde da revisão 1.1:

1. copiar o arquivo completo `ZZZZ_15_MoradoresAdminPortalV1.gs` para o arquivo vazio já criado no Apps Script real;
2. salvar;
3. executar apenas `testarConfiguracaoMoradoresAdminPortalV1()`;
4. conferir versão `1.1.0`, `areaId:JAPARANDUBA`, `agenteId:AG001`, `unidadeId:POSTO_MATIAS`, aba fonte e quantidade coerente;
5. confirmar `nenhumaAlteracaoRealizada:true`;
6. não executar `ativarEscritaMoradoresAdminPortalV1()` ainda;
7. somente depois da leitura comprovada considerar uma atualização controlada da implantação existente.
