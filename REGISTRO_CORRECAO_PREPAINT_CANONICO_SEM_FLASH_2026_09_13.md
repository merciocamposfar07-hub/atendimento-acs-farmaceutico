# Registro — Correção de prepaint canônico e eliminação do lampejo legado

**Data:** 13/09/2026  
**Escopo:** frontend da Central e abertura dos painéis legados dentro do shell.  
**Natureza:** correção isolada de apresentação/ordem de renderização.

## Problema observado

Na navegação real pelo Safari/iPhone, uma interface anterior aparecia por frações de segundo antes da interface atual da Central. O mesmo comportamento podia ocorrer em painéis carregados por iframe.

## Diagnóstico fechado

A interface antiga **não estava sendo consultada novamente no backend**.

A causa era a ordem de pintura do frontend:

```
HTML legado já presente no documento
→ Safari faz o primeiro paint
→ JavaScript executa
→ sessão/contexto são reconhecidos
→ shell App4 normaliza/oculta o legado
→ interface atual aparece
```

Nos painéis ainda hospedados em iframe havia um segundo problema: o frame nascia em `about:blank` e o evento `load` podia marcá-lo como pronto antes de a rota real do painel carregar e receber a normalização canônica.

## Correção isolada

### 1. Prepaint canônico da Central

Antes do primeiro paint, o documento passa a ler **somente a presença local** das sessões já existentes:

- `portalTacsAdminTokenV1`;
- `portalTacsTerritorioTokenV1`;
- `portalConectaUbsTokenV1`.

Essa leitura não autentica, não cria token e não concede permissão. Ela serve apenas para escolher o estado visual inicial correto.

Quando uma sessão já existe, o bloco antigo de login não é pintado antes da restauração do contexto.

O cabeçalho institucional do Conecta Saúde Comunitária também passa a existir no HTML inicial, evitando depender de criação tardia após `DOMContentLoaded`.

### 2. Painéis legados em iframe

O iframe só pode ser considerado pronto quando:

- deixou `about:blank`;
- a URL atual corresponde à rota esperada do painel;
- a normalização canônica foi aplicada.

Enquanto isso, o iframe permanece visualmente oculto e o shell mostra somente:

`Aguarde enquanto os dados carregam…`

Depois da carga real e da normalização, o mesmo iframe é revelado. Não há troca para uma segunda interface.

### 3. Sessão UBS no shell visual

O reconhecedor visual de sessão foi alinhado à lógica funcional já existente e passa a considerar também `portalConectaUbsTokenV1`.

## Fluxo canônico após a correção

### Central

```
URL da Central
→ prepaint canônico síncrono
→ detectar somente presença de sessão local
→ mostrar estado visual correto no primeiro paint
→ restaurar contexto
→ sincronizar servidor em segundo plano
```

### Painéis legados

```
Central
→ toque no painel
→ shell abre imediatamente
→ iframe oculto
→ about:blank NÃO é considerado pronto
→ rota real carrega
→ normalização App4
→ painel é revelado
```

## O que não foi alterado

- Apps Script/backend;
- PIN;
- regras de autenticação;
- permissões;
- áreas e UBS;
- moradores;
- agendas e vagas;
- gravações;
- distribuição territorial;
- lógica dos painéis nativos;
- dados persistidos.

## Arquivos alterados

- `central-administrativa-tacs.html`
- `central-administrativa-tacs.js`

## Segurança de rollback

Antes da alteração foi criada a branch:

`backup-pre-flash-canonical-20260913-2031`

Ela preserva o estado imediatamente anterior à correção.

## Commits funcionais

- `9756b7f6e6ad0ca6f8242bd6c1d49f77fb94479e` — prepaint/cabeçalho canônico;
- `0ebede5a2a0a0f48f089ee356ffe962ae6a4caa6` — guarda de prontidão dos frames;
- `63db6e39a170949154671f507e55f2b275da815b` — alinhamento da sessão UBS no shell visual.

## Validação

Validação estática do código:

- prepaint presente antes do corpo da Central;
- três tipos de sessão cobertos;
- `about:blank` explicitamente recusado como frame pronto;
- painel legado oculto até a rota real ser normalizada;
- nenhum arquivo de backend alterado.

**Status:** código funcional publicado em `main`; validação da publicação e teste visual no dispositivo permanecem requisitos antes de declarar a correção encerrada.


## Consolidação na fonte canônica App4

Após o primeiro ajuste, o workflow canônico App4 regenerou `central-administrativa-tacs.html` a partir de `admin-ui-behavior.inline.js` e demonstrou que alterações feitas somente no HTML gerado podem ser sobrescritas.

A correção foi então levada para a fonte canônica:

- arquivo: `admin-ui-behavior.inline.js`;
- commit: `7ea70c998842ebe1e960fea8b6d7b26e42e241dc`;
- efeito: o reconhecedor visual de sessão passa a considerar ADMIN, TACS e UBS na própria fonte usada pelo gerador;
- workflow canônico App4: `34790372078` — **success**.

O HTML regenerado foi conferido depois do workflow e manteve simultaneamente:

- prepaint antes do `<body>`;
- cabeçalho canônico estático;
- sessão UBS;
- guarda contra `about:blank`;
- ocultação do frame até a rota real estar pronta.

Isso impede que uma execução futura do gerador App4 remova novamente essa parte da correção.
