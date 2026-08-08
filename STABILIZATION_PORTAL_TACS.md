# Portal TACS — Linha de Estabilização

Branch: `stabilization/portal-tacs-v1`

## Objetivo

Transformar o Portal TACS em uma base previsível, rápida, versionada e testável, sem continuar acumulando correções sobre correções.

Esta branch **não é produção**. Nenhuma alteração desta linha deve chegar ao Portal do Morador ou aos painéis oficiais publicados sem cumprir os gates de implantação descritos abaixo.

## Problemas confirmados e eliminados na branch

### 1. GitHub Pages e `main` ficaram desencontrados

A `main` avançou enquanto o Pages permaneceu em uma publicação anterior durante falhas de Actions/Pages. Isso explicou recursos presentes no repositório que não apareciam na interface publicada.

### 2. Agenda pública podia descartar `MEDICA`/`MÉDICA`

A leitura antiga comparava valores de planilha sem normalização consistente. A arquitetura estabilizada normaliza os identificadores na fonte e aceita variações equivalentes antes de montar o payload público.

### 3. Havia mais de uma implementação de `painel_publico`

Arquivos auxiliares `ZZ_...` disputavam a mesma rota e podiam devolver somente parte do conteúdo. Eles foram retirados. Existe agora uma única fonte pública para agendas, profissionais, recados e campanhas.

### 4. O frontend público fazia leituras redundantes

`portal-public-data.js` é o transporte público compartilhado. Os módulos de agenda e conteúdo reutilizam a mesma leitura; não existe mais uma consulta silenciosa paralela apenas para recados/campanhas.

### 5. O núcleo administrativo não estava integralmente versionado

As rotas `admin_login`, `admin_dados`, `admin_result` e as gravações eram usadas pelos painéis, mas a implementação completa não era reproduzível pelo repositório. Esse gap foi fechado com `AdminCoreV1.gs`.

### 6. Havia workflows que aplicavam patches automaticamente

Quatorze workflows históricos de correção/diagnóstico foram retirados da branch. A pasta `.github/workflows` contém somente `stabilization-tests.yml`.

### 7. Os painéis oficiais eram wrappers de páginas de teste

Cada painel oficial abria uma tela provisória, fazia `fetch` de `/teste-v1/...`, alterava o HTML e executava `document.write`. Isso acrescentava uma etapa inteira antes de o painel real existir e duplicava inicializações.

Os três painéis oficiais agora são páginas diretas. Nenhum deles depende de `/teste-v1/`, `fetch(origem)` ou `document.write`.

### 8. Falha de rede era confundida com sessão expirada

A lógica antiga apagava o token local quando `admin_dados` falhava por qualquer motivo. Assim uma oscilação temporária obrigava novo PIN.

`admin-client-v1.js` separa falha temporária de falha de autenticação. A sessão só é apagada quando o servidor informa sessão ausente, inválida ou expirada.

### 9. O pré-aquecimento era incompleto

O aquecimento antigo chamava apenas `admin_status`: acordava o Apps Script, mas ainda deixava a leitura das abas para depois do PIN.

`admin_status?prewarm=1` agora prepara um snapshot administrativo curto no servidor. Quando a sessão é validada, `admin_dados` pode reutilizar esse snapshot. Gravações invalidam os caches administrativo e público.

## Arquitetura oficial

### Frontend público

- `index.html`
- `agenda-config.js`
- `portal-public-data.js` — transporte público compartilhado
- `agenda-enfermeira.js` — agendas e profissionais exibidos ao morador
- `portal-controle-integral.js` — compatibilidade de conteúdo público
- `assets/js/portal-conteudo-publico-v1.js` — compatibilidade sem leitura paralela

### Frontend administrativo

- `painel-oficial-profissionais-servicos.html`
- `painel-oficial-agendas-vagas.html`
- `painel-oficial-recados-campanhas.html`
- `admin-client-v1.js` — transporte, sessão, POST único, polling e tratamento de erro comum aos três painéis
- `admin-warmup.js` — pré-aquecimento em segundo plano
- `admin-official.css` — estilo e acessibilidade comuns

Os arquivos em `teste-v1/` não são dependência dos painéis oficiais e não participam do caminho normal de abertura.

### Apps Script estabilizado

A implantação oficial do Portal TACS é composta por **quatro módulos**:

1. `apps-script/PortalRouterV1.gs`
   - único arquivo desta arquitetura que declara `doGet` e `doPost`;
   - roteia cada ação ao núcleo correto;
   - integra cache sem criar rotas concorrentes.

2. `apps-script/AdminCoreV1.gs`
   - PIN armazenado como hash;
   - sessão vinculada ao dispositivo, renovada durante uso válido;
   - `requestId` idempotente e `admin_result` para confirmação sem reenvio;
   - leitura e gravação de profissionais, serviços, agendas, recados e campanhas;
   - criação integrada de profissional + primeiro serviço + cinco dias úteis.

3. `apps-script/PublicCoreV1.gs`
   - somente leitura;
   - payload único de agendas + profissionais + recados + campanhas;
   - normalização de módulos;
   - profissionais futuros sem lista fixa;
   - `DIAS` de campanha preservado como texto atual, mantendo compatibilidade com duração numérica histórica.

4. `apps-script/PerformanceCoreV1.gs`
   - snapshot administrativo e público de curta duração;
   - pré-aquecimento dos dados;
   - validação da sessão antes de servir cache administrativo;
   - invalidação após criar/salvar/remover.

Os backends substituídos `apps-script-controle-integral.gs`, `ZZ_11...`, `ZZ_12...`, `ZZZ_13...` e `08_AdminEscritaControladaV1.gs` não pertencem à arquitetura estabilizada.

## Contrato administrativo

### GET

- `admin_status`
- `admin_result`
- `painel_publico`
- `agenda_enfermeira`
- `status_publico`

`admin_status` aceita `prewarm=1`.

### POST

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

## Política de desempenho e confiabilidade

- O HTML administrativo aparece sem esperar resposta do Google.
- O pré-aquecimento acontece em segundo plano.
- Leitura administrativa normal tem teto menor que gravação.
- Uma operação POST é enviada **uma única vez**.
- A confirmação pode ser recuperada por `admin_result`; polling nunca reenvia a gravação.
- Erro temporário preserva a sessão e mantém a aba utilizável.
- Erro real de autenticação encerra a sessão.
- Após mutação, os caches são invalidados antes da releitura.
- Os três painéis compartilham o mesmo cliente de transporte; mudança de conexão é feita em um único arquivo.

## Suíte obrigatória

O workflow `Portal TACS - Stabilization Tests` executa `npm test` com cobertura para:

- reservas odontológicas e idempotência;
- Apps Script integrado: login, sessão, leitura, agenda, profissional dinâmico, recado/campanha, payload público e logout;
- normalização de módulos;
- novo profissional sem duplicação e criação de cinco dias úteis;
- recados/campanhas preservados;
- `DIAS` textual preservado;
- ausência de PIN/token no payload público;
- pré-aquecimento e reutilização do cache;
- invalidação de caches depois de gravação;
- leitura pública compartilhada;
- cliente administrativo único;
- sessão preservada após falha temporária;
- sessão apagada após autenticação realmente inválida;
- um único envio por operação;
- ausência de `/teste-v1/`, `fetch(origem)` e `document.write` nos painéis oficiais;
- sintaxe dos três painéis oficiais;
- fluxos DOM públicos e profissionais dinâmicos.

## Ordem obrigatória de implantação

1. Manter `main`/Pages intactos enquanto a branch é validada.
2. Conferir a planilha real e as colunas esperadas pelos quatro módulos.
3. Implantar no projeto Apps Script os quatro módulos estabilizados, mantendo apenas **um** `doGet/doPost` oficial.
4. Configurar/migrar o PIN administrativo sem colocá-lo no GitHub.
5. Atualizar a implantação Web App e validar no mesmo endpoint usado pelo frontend.
6. Validar diretamente:
   - `admin_status?prewarm=1`;
   - login e `admin_dados`;
   - `painel_publico`;
   - agenda médica e nutricionista;
   - recado e campanha existentes;
   - criação de profissional de teste sem duplicação.
7. Medir no aparelho real a primeira abertura e a reabertura dos três painéis.
8. Só depois abrir/validar a integração da branch com `main`.
9. Confirmar que GitHub Pages publicou exatamente o commit aprovado.
10. Fazer smoke test final no Portal do Morador e nos três painéis.

## O que ainda não deve ser afirmado

A suíte verde prova a coerência do código versionado e dos fluxos simulados. Ela **não prova que o Apps Script real já recebeu estes quatro arquivos**, nem que o Web App real já está rodando esta versão. Essa confirmação só existe depois da implantação controlada e do teste no endpoint real.

## Regra de manutenção após estabilização

Mudança funcional deve ser feita na fonte oficial correspondente e acompanhada de teste de regressão. Não criar arquivos `fix`, `corrigido`, `ZZ_`, `vXX` ou workflows que reescrevam a aplicação como mecanismo permanente.

Uma produção válida deve ser rastreável por:

- commit exato do GitHub;
- versão exata do Apps Script;
- endpoint validado;
- suíte de regressão verde para o mesmo conjunto.
