# Portal TACS — Linha de Estabilização

Branch: `stabilization/portal-tacs-v1`

## Objetivo

Transformar o Portal TACS em uma base previsível, versionada e testável, sem continuar acumulando correções sobre correções.

Esta branch **não é produção**. Nenhuma alteração desta linha deve chegar ao Portal do Morador ou aos painéis oficiais sem cumprir os gates descritos abaixo.

## Diagnóstico confirmado

### 1. GitHub Pages e `main` ficaram desencontrados

O código da `main` avançou com profissionais dinâmicos e desempenho, mas o GitHub Pages permaneceu em uma publicação anterior durante a indisponibilidade de Actions/Pages. Por isso recursos existentes no repositório não apareceram na interface em produção.

### 2. A agenda pública tinha uma falha estrutural de normalização

A planilha administrativa pode conter valores como `MEDICA` ou `MÉDICA`, enquanto o Portal trabalha com a chave `medica`. A leitura antiga comparava o valor bruto da planilha com a chave pública e podia descartar a linha inteira.

A arquitetura estabilizada normaliza o módulo na própria fonte de leitura. Não existe uma segunda rota de agenda para contornar esse problema.

### 3. Existiam rotas públicas concorrentes

Arquivos auxiliares como `ZZ_12_PublicoAgendasPortalV1.gs` e `ZZ_11_PublicoConteudoPortalV1.gs` podiam disputar a mesma responsabilidade pública. Um deles chegava a interceptar `painel_publico` e montar uma resposta exclusiva de agendas.

Essas rotas foram retiradas da linha de estabilização.

A regra agora é:

**uma única resposta `painel_publico` carrega agendas + profissionais + recados + campanhas.**

### 4. O Portal fazia leituras e renderizações redundantes

A versão histórica tinha mais de um módulo consultando o Apps Script de forma independente. Além disso, `portal-controle-integral.js` ainda continha lógica antiga para renderizar agendas de médica/nutricionista em elementos que já nem existem mais no `index.html`.

A linha de estabilização separa responsabilidades:

- `portal-public-data.js` — única leitura pública compartilhada e atualização periódica centralizada;
- `agenda-enfermeira.js` — única renderização das agendas profissionais e profissionais dinâmicos;
- `portal-controle-integral.js` — somente recados/campanhas;
- `assets/js/portal-conteudo-publico-v1.js` — compatibilidade sem leitura silenciosa concorrente.

### 5. O núcleo administrativo não estava integralmente versionado

Os painéis oficiais dependiam de `admin_status`, `admin_login`, `admin_dados`, `admin_result` e das rotas de gravação, mas a implementação completa dessas rotas não estava reproduzível no repositório.

Esse gap foi fechado na linha de estabilização com `apps-script/AdminCoreV1.gs`.

### 6. Existiam workflows que funcionavam como aplicadores de patch

A branch herdou 14 workflows históricos de correção/diagnóstico, vários com `contents: write`, edição de arquivos e `git push` automático.

Todos foram retirados da linha de estabilização. A pasta `.github/workflows` mantém apenas `stabilization-tests.yml`.

### 7. Os painéis oficiais impediam cache do próprio HTML

Os três painéis oficiais carregavam seu HTML interno com `fetch(...,{cache:'no-store'})`, forçando novo download a cada abertura. Como a URL já possui identificador de versão, o `no-store` era desperdício.

Na linha estabilizada os três painéis usam o cache normal do navegador e continuam controlados pela versão da URL.

## Arquitetura oficial da linha estabilizada

### Frontend público

- `index.html`
- `agenda-config.js`
- `portal-public-data.js` — transporte público compartilhado, cache local e atualização centralizada
- `agenda-enfermeira.js` — renderização exclusiva das agendas e profissionais
- `portal-controle-integral.js` — renderização exclusiva de recados e campanhas
- `assets/js/portal-conteudo-publico-v1.js` — compatibilidade de conteúdo sem leitura paralela

### Painéis administrativos

- `painel-oficial-profissionais-servicos.html`
- `painel-oficial-agendas-vagas.html`
- `painel-oficial-recados-campanhas.html`
- arquivos correspondentes em `teste-v1/`
- `admin-warmup.js`

### Apps Script estabilizado

A fonte oficial é composta por quatro módulos:

1. `apps-script/PortalRouterV1.gs`
   - único arquivo que declara `doGet` e `doPost`;
   - encaminha cada ação ao núcleo correto;
   - serializa JSON/JSONP e respostas por iframe;
   - integra o cache/preaquecimento sem duplicar rotas.

2. `apps-script/AdminCoreV1.gs`
   - PIN administrativo com hash;
   - sessão vinculada ao dispositivo e com expiração;
   - `requestId` e resultado reaproveitável para evitar gravação duplicada;
   - leitura administrativa única;
   - profissionais, serviços, agendas, recados e campanhas;
   - criação integrada de novos profissionais, primeiro serviço e cinco dias úteis de agenda.

3. `apps-script/PublicCoreV1.gs`
   - somente leitura;
   - normalização de `MEDICA`/`MÉDICA`/`medica` e equivalentes;
   - agendas de qualquer profissional;
   - profissionais ativos e primeiro serviço ativo;
   - recados e campanhas no mesmo payload;
   - compatibilidade de `DIAS` da campanha tanto como texto atual quanto como duração numérica antiga.

4. `apps-script/PerformanceCoreV1.gs`
   - cache curto do snapshot administrativo e público;
   - pré-aquecimento explícito durante a abertura visual do painel;
   - reutilização do snapshot somente depois de validar a sessão;
   - invalidação dos caches após criar/salvar/remover dados;
   - não declara `doGet`/`doPost` e não altera regras de negócio.

Os backends substituídos `apps-script-controle-integral.gs`, `ZZ_11...`, `ZZ_12...`, `ZZZ_13...` e `08_AdminEscritaControladaV1.gs` não fazem parte da linha estabilizada.

## Contrato administrativo versionado

### Leitura GET

- `admin_status`
- `admin_result`
- `painel_publico`
- `agenda_enfermeira`
- `status_publico`

`admin_status` aceita `prewarm=1` para preparar o snapshot administrativo em segundo plano, sem bloquear a abertura visual do painel.

### Escrita POST

- `admin_login`
- `admin_logout`
- `admin_dados`
- `admin_salvar_profissional`
- `admin_salvar_servico`
- `admin_criar_profissional`
- `admin_salvar_agenda`
- `admin_salvar_recado`
- `admin_remover_recado`
- `admin_salvar_campanha`
- `admin_remover_campanha`

## Testes obrigatórios

O workflow `Portal TACS - Stabilization Tests` executa a suíte de regressão da branch. A cobertura atual inclui:

- reservas odontológicas e idempotência;
- login correto e rejeição de PIN incorreto;
- PIN não armazenado em texto simples pelo novo núcleo;
- sessão vinculada ao dispositivo;
- `admin_dados` com todas as coleções administrativas;
- publicação de agenda médica com módulo acentuado/caixa alta;
- criação idempotente de novo profissional;
- criação automática de cinco dias úteis;
- novo profissional presente na leitura pública;
- recados preservados;
- campanhas preservadas;
- `DIAS` textual preservado sem conversão indevida para duração;
- `admin_result` recuperando a mesma operação;
- logout invalidando a sessão;
- ausência de PIN/token no payload público;
- leitura pública compartilhada no navegador;
- atualização periódica feita por um único transporte;
- ausência de renderização legada duplicada de médica/nutricionista;
- pré-aquecimento administrativo e reutilização do cache servidor;
- invalidação do cache após gravações;
- abertura imediata e transporte dos três painéis;
- cache normal/versionado no HTML interno dos três painéis;
- fluxos DOM de médica, enfermeira, nutricionista, odontologia e profissionais dinâmicos.

O HEAD atual da branch passou a suíte completa depois da consolidação do transporte público e da otimização dos três painéis.

## Gates que ainda faltam antes de produção

1. Revisar o pacote exato dos quatro arquivos do Apps Script contra a planilha real.
2. Configurar o PIN atual no `AdminCoreV1` durante a implantação controlada, sem expô-lo no repositório.
3. Implantar os quatro módulos no Apps Script como uma única versão e validar o endpoint.
4. Testar no ambiente real, antes do merge:
   - segunda-feira da médica publicada chegando ao Portal;
   - agenda da nutricionista chegando ao Portal;
   - recado atual permanecendo visível;
   - campanha atual permanecendo visível;
   - criação de um profissional de teste sem duplicação;
   - reabertura dos três painéis sem espera bloqueante.
5. Definir um identificador único de release/cache para a versão estabilizada.
6. Somente depois abrir/validar PR da branch para `main`.
7. Confirmar que o GitHub Pages publicou exatamente o commit aprovado.
8. Fazer smoke test final em produção.

## Regra de manutenção depois da estabilização

Uma mudança funcional deve ser feita na fonte principal e acompanhada de teste de regressão. Não criar arquivos `fix`, `corrigido`, `ZZ_`, `vXX` ou workflows que reescrevam a aplicação como mecanismo permanente de manutenção.

A produção deve ser identificável por:

- um commit exato do GitHub;
- uma versão exata do Apps Script;
- uma suíte de regressão verde para esse mesmo conjunto.
