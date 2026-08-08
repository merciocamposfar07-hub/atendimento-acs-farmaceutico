# Portal TACS — Linha de Estabilização

Branch: `stabilization/portal-tacs-v1`

## Objetivo

Transformar o Portal TACS em uma base previsível, versionada e testável, sem continuar acumulando correções sobre correções.

Esta branch **não é produção**. Nenhuma alteração desta linha deve chegar ao Portal do Morador ou aos painéis oficiais sem cumprir todos os gates descritos abaixo.

## Estado identificado

### 1. GitHub Pages e `main` estavam desencontrados

O código da `main` avançou com profissionais dinâmicos e desempenho, mas o GitHub Pages permaneceu em uma publicação anterior durante a indisponibilidade de Actions/Pages. Isso explica por que recursos presentes no repositório não apareceram na interface em produção.

### 2. A agenda pública tinha uma falha estrutural de normalização

A planilha administrativa pode conter valores como `MEDICA` ou `MÉDICA`, enquanto a leitura pública usa a chave `medica`. A leitura anterior comparava o valor bruto da planilha com a chave pública e podia descartar a linha inteira.

A correção desta branch ocorre na leitura central, via `tacsModuleKey_()`. Não existe mais uma segunda rota pública criada apenas para contornar esse problema.

### 3. Existiam rotas públicas concorrentes

O arquivo `apps-script/ZZ_12_PublicoAgendasPortalV1.gs` interceptava `painel_publico` e montava uma resposta exclusiva de agendas. Essa abordagem poderia ocultar recados e campanhas retornados pela camada integral.

Esse arquivo foi removido da linha de estabilização. A regra agora é:

**uma única resposta `painel_publico` deve carregar agendas + recados + campanhas e ser enriquecida com profissionais dinâmicos sem apagar os dados existentes.**

### 4. O Portal fazia leituras redundantes

A versão histórica tinha mais de um módulo consultando o Apps Script de forma independente. A linha de estabilização usa `portal-public-data.js` como leitura compartilhada. O módulo de compatibilidade de recados/campanhas não dispara mais uma leitura silenciosa própria.

### 5. Profissionais precisam ser extensíveis

O painel atual da linha de estabilização contém `Adicionar profissional`, com criação do profissional, primeiro serviço e agenda básica. O backend dinâmico permanece em `apps-script/ZZZ_13_ProfissionaisDinamicosPortalV1.gs` e deve enriquecer a resposta pública sem substituir a resposta integral.

## Fonte de verdade pretendida

### Frontend público

- `index.html`
- `agenda-config.js`
- `portal-public-data.js` — transporte público compartilhado
- `agenda-enfermeira.js` — renderização das agendas profissionais
- `portal-controle-integral.js` — compatibilidade pública
- `assets/js/portal-conteudo-publico-v1.js` — compatibilidade de recados/campanhas sem leitura paralela

### Painéis administrativos

- `painel-oficial-profissionais-servicos.html`
- `painel-oficial-agendas-vagas.html`
- `painel-oficial-recados-campanhas.html`
- arquivos correspondentes em `teste-v1/`
- `admin-warmup.js`

### Backend público central

- `apps-script-controle-integral.gs`
- `apps-script/ZZZ_13_ProfissionaisDinamicosPortalV1.gs`

`apps-script-controle-integral.gs` é a referência central para o payload público. Extensões podem enriquecer esse payload, mas não devem criar outra implementação concorrente de `painel_publico`.

## Gap ainda não resolvido: fonte completa do Apps Script administrativo

O aplicativo da Web em produção possui rotas administrativas como `admin_status`, `admin_login`, `admin_dados` e `admin_result`. A implementação completa dessas rotas não está integralmente versionada no repositório atual.

Há evidência histórica de um `Portal.gs` roteando para `tratarGetControleIntegralTacs_`, `tratarGetPainelTacs_`, `tratarPostControleIntegralTacs_` e `tratarPostPainelTacs_`, mas o núcleo administrativo implantado precisa ser recuperado antes de declarar o backend do Apps Script como uma fonte de verdade reproduzível.

**Consequência:** nenhum arquivo Apps Script desta branch deve ser implantado isoladamente sobre o aplicativo da Web atual enquanto esse núcleo não estiver recuperado e testado em conjunto.

## Política para workflows antigos

Existem workflows históricos que foram usados para aplicar correções diretamente no repositório, alguns com `contents: write`, edição de arquivos e `git push` automático.

Esses workflows são considerados **legado de manutenção** e não fazem parte da arquitetura definitiva. Eles não serão usados como mecanismo de evolução da linha estabilizada.

Antes de remoção em massa, cada workflow deve ser classificado em uma das categorias:

1. teste/diagnóstico ainda útil;
2. implantação necessária;
3. patch automático já incorporado ao código e portanto obsoleto;
4. rotina insegura ou redundante.

## Gates obrigatórios antes de produção

1. `npm test` completo verde no workflow `Portal TACS - Stabilization Tests`.
2. Recuperar e versionar o núcleo administrativo real do Apps Script.
3. Montar uma versão única do Apps Script sem `doGet`/`doPost` concorrentes.
4. Testar localmente/simulado:
   - agenda médica ativa chegando ao payload público;
   - agenda nutricionista ativa chegando ao payload público;
   - recados preservados;
   - campanhas preservadas;
   - profissional novo criado uma única vez;
   - profissional novo aparecendo no Portal;
   - nenhum PIN/token/dado privado no payload público.
5. Testar abertura dos três painéis sem bloquear a interface à espera do Apps Script.
6. Testar que uma abertura do Portal compartilha a mesma leitura pública entre módulos.
7. Implantar o Apps Script de forma controlada e validar sua versão/endpoint.
8. Somente depois abrir/validar PR para `main`.
9. Confirmar que o GitHub Pages publicou o mesmo commit aprovado.
10. Fazer smoke test em produção antes de considerar a versão encerrada.

## Regra de manutenção após estabilização

Uma mudança funcional deve ser feita na fonte principal, acompanhada de teste de regressão. Não criar arquivos `fix`, `corrigido`, `vXX` ou workflows que reescrevam a aplicação como forma permanente de manutenção.

A produção deve ser identificável por um commit do GitHub e por uma versão do Apps Script compatível com esse commit.
