# Registro canônico — Correção cirúrgica do Portal do Morador: família + nascimento

Data: 15/09/2026  
Escopo: Portal TACS / Morador  
Tipo: bloco corretivo isolado, sem criação de nova versão funcional do Portal

## Motivo

Foram confirmadas duas regressões no fluxo público do Morador:

1. a data de nascimento retornada pelo preenchimento automático podia aparecer com **um dia a menos** do valor correto exibido na planilha;
2. a identificação por **CPF, Cartão SUS (CNS) ou número do cadastro familiar** não estava concluindo de forma uniforme a abertura da família completa e ainda podia exibir exigência/aviso de confirmação documental indevida.

## Contrato canônico deste bloco

Este bloco possui uma única ligação com o fluxo público de identificação do Morador e não autoriza alterações em agendas, vagas, profissionais, serviços, notificações, Push, painéis administrativos ou demais módulos.

Fluxo canônico:

`CPF OU CNS OU cadastro familiar → localizar referência familiar na área → carregar todos os integrantes ativos da família → permitir selecionar cada integrante → manter preenchimento automático dos dados do integrante selecionado`

Regras obrigatórias:

- qualquer integrante pode iniciar o atendimento usando o próprio CPF ou CNS;
- o CPF/CNS identifica quem iniciou a solicitação, mas **não limita a tela a essa pessoa**;
- localizado o integrante, o sistema resolve o respectivo cadastro familiar e apresenta **a família completa**;
- informar diretamente o número da família também apresenta a família completa;
- **não existe segunda confirmação por CPF/CNS** depois de a família ter sido localizada;
- todos os integrantes retornados permanecem individualmente selecionáveis;
- CPF e CNS não são expostos na lista familiar; a seleção continua usando token temporário;
- integrante inativo/oculto continua fora da lista pública;
- se o CPF informado ainda não estiver cadastrado, mas o morador puder ser localizado pelo CNS/família, o CPF pode ser complementado **na mesma linha do morador selecionado**;
- complemento documental só preenche campo vazio, não substitui CPF/CNS existente, verifica duplicidade nas áreas ativas e mantém auditoria;
- nenhuma nova linha de morador é criada apenas para complementar CPF/CNS.

## Data de nascimento — fonte de verdade

`DATA_NASCIMENTO exibida na planilha → leitura como data civil → Portal`

Regras:

- a data exibida atualmente na planilha é a fonte de verdade;
- data de nascimento é tratada como **data civil**, sem conversão de fuso capaz de alterar o dia;
- a camada histórica de backup não pode substituir a data atual da planilha por um valor anterior;
- este bloco **não soma nem subtrai dias da planilha**;
- este bloco não altera em lote a coluna DATA_NASCIMENTO.

Causa localizada da regressão: a camada histórica `ZZZZ_50_NascimentoCivilBackupGuardV1.gs` ainda podia substituir, durante a leitura, a data atual pelo valor `DATA_ANTES` do backup técnico. Essa intervenção foi desativada para o autofill operacional.

## Arquivos diretamente relacionados

Backend / Apps Script:
- `apps-script/ZZZZ_43_IdentificacaoFamiliarPublicaV1.gs`
- `apps-script/ZZZZ_44_SelecaoMembroFamiliaPublicaV1.gs`
- `apps-script/ZZZZ_41_BuscaEnvioFamiliaMoradoresV1.gs`
- `apps-script/ZZZZ_50_NascimentoCivilBackupGuardV1.gs`

Frontend público:
- `portal-identificacao-familia-v1.js`
- `moradores-autofill.js`
- `portal-auto-update.js`

Testes/contratos:
- `scripts/test_identificacao_familiar_publica_v1.js`
- `scripts/test_matriz_identificacao_morador_v1.js`
- `scripts/test_familia_aparelho_beneficiario_v1.js`
- `scripts/test_nascimento_civil_backup_guard_v1.js`

## Commits desta correção

Família:
- `7005196dbe14c34c2fd9ddd57c23a3ae43916a44` — localizar família direto por CPF/CNS/cadastro;
- `7a1c8d12b9033475d2f1574e1dfc1c9f51f52098` — exibir família sem confirmação adicional;
- `192c6b18266f404a9b33410a9922ea1426a09df1` — teste dos três caminhos de identificação;
- `b0913d9865fecba3cb72d72a072adc42052f2bee` — renovação do cache do bloco familiar;
- `83b969110cccdd5774cb63dd4006a8f4df3b2601` — família operacional passa a seguir o CPF/CNS informado;
- `9093956b92d8ac9c7685f4a57ab2ef1d2f188012` — contrato de teste da família do documento informado.

Nascimento:
- `07513f48fcc9d38c3578af2b71a0954e81f58cd1` — preservar a data civil exibida na planilha;
- `3b99e630ff13a47f0ac7ef5994e063a7eef38ae7` — teste contra recuo de um dia.

Publicação:
- `522275156b1b43936ec030ac0e922b5fff5cbd4a` — solicitação controlada de publicação do bloco;
- `7febbe48e34f615eb7faa05f714b08c402db8137` — registro do deploy concluído.

## Implantação técnica

Workflow: `Implantar Apps Script de Moradores`  
Run: `35031883368`  
Resultado: `success`  
Deployment principal: mantido  
Versão anterior: `218`  
Versão implantada: `219`

Health checks do workflow:
- moradores: aprovado;
- território: aprovado;
- CSV moradores: aprovado;
- manutenção: aprovado;
- isolamento territorial: aprovado;
- agenda Japaranduba: aprovado;
- agenda Sítio Matias: aprovado;
- público Japaranduba: aprovado;
- público Sítio Matias: aprovado;
- conteúdo público: aprovado.

## Estado canônico

**HOMOLOGADO NO DISPOSITIVO, PUBLICADO E CANONIZADO — 15/09/2026.**

Validação real confirmada pelo usuário no iPhone em 15/09/2026.

Ficam homologados neste bloco:

1. a data conhecida na planilha chega ao Portal com o mesmo dia/mês/ano;
2. CPF carrega a família completa;
3. CNS carrega a família completa;
4. número do cadastro familiar carrega a família completa sem segunda confirmação;
5. integrantes aparecem selecionáveis;
6. o fluxo de complemento documental permanece vinculado ao cadastro correto, sem criar pessoa duplicada.

Esta homologação encerra a pendência operacional deste bloco específico. Correções futuras não relacionadas devem preservar este contrato canônico.

## Regra de reversão

Se este bloco precisar ser corrigido ou desfeito, atuar somente nos arquivos e contratos listados acima. Não usar a reversão como autorização para alterar outros painéis ou rotinas do Conecta Saúde Comunitária.
