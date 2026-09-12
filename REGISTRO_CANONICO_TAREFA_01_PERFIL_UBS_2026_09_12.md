# Registro canônico — Tarefa 01 — Perfil UBS

Data: 12/09/2026  
Status: VALIDADA — código, suíte integral, Apps Script e GitHub Pages conferidos em 12/09/2026  
Autorização: usuário autorizou execução sequencial das tarefas 1 a 16, uma por vez, com teste e registro antes de avançar.

## Objetivo exclusivo da Tarefa 1

Adicionar **UBS** como quarto perfil do Conecta Saúde Comunitária sem antecipar a Tarefa 2.

Primeiro acesso:

`Administrador | TACS | Morador | UBS`

Cadastro administrativo:

`Administrador / TACS / UBS`

## Contrato do perfil UBS nesta tarefa

O cadastro UBS identifica a pessoa responsável pela utilização na unidade e registra:

- nome completo;
- CPF e dados cadastrais já existentes na base de acessos;
- função na UBS;
- unidade de saúde vinculada;
- PIN;
- permissões selecionadas explicitamente;
- estado ativo/inativo.

O CNS e a microárea continuam sendo exigências do vínculo TACS, não do perfil UBS.

Um cadastro UBS isolado **não é TACS responsável por área** e não pode ser usado como responsável territorial apenas por possuir perfil UBS.

## Primeiro acesso UBS

A porta de entrada passa a apresentar o quarto perfil **UBS**.

Nesta Tarefa 1 o primeiro acesso UBS:

1. recebe CPF e PIN do responsável previamente cadastrado;
2. confirma no servidor que existe exatamente um perfil UBS ativo correspondente;
3. confere PIN, função e unidade vinculada;
4. devolve a identidade UBS confirmada;
5. **não cria vínculo permanente do computador**.

O reconhecimento persistente do computador, a segunda entrada exclusiva UBS e o ambiente operacional UBS pertencem às tarefas posteriores já previstas.

## Proteção de escopo

Esta tarefa não cria:

- `ADMIN_UBS`;
- `TACS_UBS`;
- `UBS_MORADOR`;
- `ADMIN_TACS_UBS`;
- qualquer outra combinação envolvendo UBS.

Essas combinações pertencem à **Tarefa 2**.

Também não altera conteúdo, agendas, vagas, moradores, profissionais, campanhas ou regras internas dos painéis.

## Arquivos funcionais alterados

- `conecta-acesso-unificado-v1.js` — quarto perfil UBS no primeiro acesso e confirmação de identidade;
- `teste-v1/painel-tacs-areas-v1.html` — cadastro Administrador / TACS / UBS e campo Função na UBS;
- `teste-v1/painel-tacs-areas-v1.js` — comportamento/validação do cadastro UBS;
- `apps-script/ZZZZ_17_TacsAreasAdminV1.gs` — perfil UBS, função, unidade e permissões persistidas;
- `apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs` — confirmação segura do primeiro acesso UBS sem vínculo de aparelho.

## Evolução da estrutura de dados

A coluna `FUNCAO_UBS` foi acrescentada **ao final** da estrutura existente `TACS_PROFISSIONAIS_AREA`, preservando todas as colunas atuais e permitindo migração aditiva sem deslocar dados preexistentes.

## Gates específicos da Tarefa 1

- sintaxe dos JavaScripts/Apps Script alterados;
- quatro perfis visíveis no primeiro acesso;
- UBS presente no cadastro administrativo;
- função UBS obrigatória;
- unidade UBS obrigatória;
- permissões UBS configuráveis e sem concessão automática em cadastro novo;
- UBS não exige CNS/microárea de TACS;
- UBS não aparece como TACS responsável por área;
- primeiro acesso UBS não grava vínculo permanente de aparelho;
- nenhuma combinação UBS da Tarefa 2 é criada;
- suíte integral do repositório antes da implantação.

## Documentos canônicos associados

- `conecta-saude-homologacao/FLUXOGRAMA_ABERTURA_CANONICA.md`;
- `PLANO_CANONICO_MIGRACAO_PAINÉIS_APP_INSTITUCIONAL.md`;
- `CANON_UI_CENTRAL_ADMINISTRATIVA.json`.

## Regra de conclusão

A Tarefa 1 só muda para **VALIDADA** depois de:

1. gates específicos aprovados;
2. suíte integral aprovada;
3. backend Apps Script implantado com validação do workflow;
4. GitHub Pages publicado;
5. arquivos servidos conferidos.

A validação visual/operacional final no aparelho do usuário permanece necessária antes de declarar a experiência de produção concluída.


## Evidências de validação

Validação concluída em 12/09/2026 sem avanço para a Tarefa 2.

- gate específico: `TAREFA_1_PERFIL_UBS_OK`;
- suíte integral do repositório: **aprovada**;
- workflow de implantação Apps Script: execução `34710566535`, **success**;
- Apps Script publicado e validado: **versão 196**;
- health check pós-implantação: moradores, território, CSV, manutenção, isolamento, agendas territoriais, portais públicos e conteúdo territorial = **sim**;
- GitHub Pages: execução `34710674013`, **success**;
- artefato Pages `github-pages`: conferido diretamente; contém `conecta-acesso-unificado-v1.js` com `tabUbs`, formulário `Administrador / TACS / UBS`, `tacsUbsRole`, contrato canônico, fluxograma e este registro;
- proteção de escopo confirmada: nenhuma combinação UBS da Tarefa 2 foi introduzida;
- primeiro acesso UBS confirmado sem criação de vínculo permanente de aparelho nesta tarefa.

A validação em aparelho real continua sendo a confirmação visual final da experiência, mas não há pendência técnica conhecida da Tarefa 1 nos gates automatizados e na implantação publicada.
