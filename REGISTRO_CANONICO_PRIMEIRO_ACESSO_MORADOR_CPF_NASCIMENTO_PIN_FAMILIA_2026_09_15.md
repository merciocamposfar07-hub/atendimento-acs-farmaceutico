# Registro canônico — Primeiro acesso do Morador: CPF ausente → nascimento → PIN familiar

Data: 15/09/2026  
Escopo: Conecta Saúde Comunitária / porta Morador  
Tipo: bloco funcional isolado no fluxo de primeiro acesso, sem criação de nova versão funcional do projeto

## Regra autorizada

Quando o Morador informa um CPF válido que ainda não existe no cadastro territorial:

`CPF não localizado → confirmar pela data de nascimento → localizar o cadastro existente → mostrar revisão do CPF + nascimento → Corrigir OU Confirmar e continuar → salvar automaticamente o CPF validado no campo vazio da mesma pessoa → criar PIN de 4 números → confirmar o mesmo PIN → abrir o Portal do Morador`

Quando o CPF já existe no cadastro territorial:

`CPF localizado → criar PIN de 4 números → confirmar o mesmo PIN → abrir o Portal do Morador`

Nesse segundo caminho, **não se pede data de nascimento**.

No acesso seguinte:

`PIN de 4 números → reconhecer o acesso do Morador/família → abrir o Portal → mostrar todos os integrantes ativos da família → permitir selecionar qualquer integrante para a solicitação do serviço`

## Regras obrigatórias

- o CPF informado não cria uma pessoa nova;
- se o CPF ainda estiver vazio no cadastro localizado, ele só é gravado depois da tela de revisão e da confirmação do morador;
- antes da gravação, a tela mostra o CPF e a data de nascimento e oferece **Corrigir** ou **Confirmar e continuar**;
- a mensagem de revisão deve chamar atenção para conferir os **11 números do CPF** e a data de nascimento;
- a gravação aceita somente CPF válido com exatamente 11 números;
- data de nascimento é usada para confirmar/localizar o cadastro existente somente quando o CPF ainda não está no banco;
- quando houver mais de uma pessoa com a mesma data, a identificação adicional por nome continua permitida para evitar vinculação errada;
- CPF já associado a outro cadastro continua bloqueado;
- CPF existente diferente no cadastro localizado não pode ser sobrescrito silenciosamente;
- CPF já localizado no banco segue diretamente para a criação do PIN, sem confirmação por nascimento;
- CPF ainda ausente exige nascimento e revisão antes da gravação;
- depois da confirmação da revisão e do salvamento automático do CPF, não existe etapa intermediária **Salvar e continuar**;
- a próxima tela deve informar exatamente: **“Agora crie o seu PIN com quatro números.”**;
- devem existir os campos **PIN de 4 números** e **Confirmar PIN de 4 números**;
- os dois valores precisam ser exatamente quatro dígitos e iguais;
- o PIN não é persistido em texto;
- o PIN continua vinculado ao acesso reconhecido no aparelho e à identidade territorial que resolve o vínculo familiar;
- após autenticação por PIN, a sessão do Morador devolve a família vinculada e o Portal apresenta **Quem precisa do atendimento?**;
- todos os integrantes ativos retornados permanecem selecionáveis;
- a seleção de integrante não altera a identidade principal nem o vínculo do aparelho;
- nenhuma mudança é autorizada em agendas, vagas, profissionais, serviços, UBS, TACS, permissões administrativas, Push ou demais painéis.

## O que já existia e foi preservado

O backend já possuía:
- `conecta_morador_identificar` para detectar CPF ausente;
- `conecta_morador_confirmar` para conferir data de nascimento;
- gravação do CPF em campo vazio por `conectaAcessoV1SalvarCpf_`;
- `conecta_morador_criar_pin` com PIN de exatamente quatro dígitos;
- `conecta_morador_login_pin` para reentrada;
- `conecta_morador_sessao` devolvendo a família vinculada;
- Portal autenticado com lista familiar selecionável.

Essas rotinas foram mantidas. Não foi criado backend paralelo.

## Correção aplicada nesta etapa

Arquivos funcionais alterados:
- `conecta-acesso-unificado-v1.js`
- `apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs`

Mudanças estritas:
1. CPF já existente segue diretamente para a criação do PIN;
2. CPF ausente continua usando data de nascimento para localizar o cadastro existente;
3. antes de gravar um CPF ausente, mostrar uma tela de revisão com CPF + nascimento;
4. disponibilizar o botão **Corrigir** e o botão **Confirmar e continuar**;
5. somente após **Confirmar e continuar** o backend revalida CPF, nascimento e cadastro e grava o CPF no campo vazio;
6. CPF continua passando pela validação canônica de 11 dígitos e CPF válido;
7. após a gravação confirmada, seguir diretamente para **“Agora crie o seu PIN com quatro números.”**;
8. preservar os dois campos de criação/confirmação do PIN com exatamente quatro dígitos.

Arquivo de teste atualizado:
- `scripts/test_conecta_acesso_unificado_v1.js`

Cache da Central renovado em:
- `central-administrativa-tacs.html`

## Commits

- `c21f13091b7b66ff60758f82cc78db81742235f0` — fluxo direto da confirmação por nascimento para criação do PIN;
- `fd479647b0046a04972d9c672c8bab23619174e4` — contrato automatizado inicial da etapa;
- `0b77d9f60e1e80b39f0e058f736ee46a1536bc34` — primeira renovação de cache da Central;
- `83e9d3b77b31e727b2b18cb8f06fdea8e461cc38` — consolidação integral automática após a primeira alteração;
- `0e6da5f8cdc173d3a832f26abd1f367d69284f30` — proteção: criação direta do PIN somente quando o vínculo territorial foi confirmado, nunca em identidade provisória;
- `e27326c450e41c6dab88fc089d830fb5a47255a1` — gate correspondente da proteção;
- `59f2041046d692d716780ad5c8111c43ab0888be` — cache-buster do primeiro acesso seguro;
- `b9e586583c37d9dbdb8e78be249441c91bbb42e8` — CPF já cadastrado passa direto para criação do PIN;
- `009d76d2e5cb972efcdfbc34c10e0a878d170abb` — ligação dos controles de revisão/correção;
- `d82ed0f235d93a0512832f84d5c725fc641bbac9` — separação entre identificação e revisão;
- `a2e2b2424f693c5692ee254bc165dd6614a51748` — tela de conferência + botão Corrigir;
- `4913144615cfca13240407e9e97511821afe1b36` — backend passa a salvar CPF somente depois da revisão confirmada;
- `9c00b877afbf3bb4ae8cd89053380d92a0b87f90` — testes do contrato CPF/nascimento/PIN;
- `0b0dc6e142726b264425a9b53cc15e459919985d` — cache-buster da revisão de CPF.

## Proteção de reversão

Se esta etapa precisar ser alterada ou desfeita, atuar somente no ramo de primeiro acesso do Morador descrito acima. Não usar esta correção como autorização para alterar o fluxo já homologado de família completa/nascimento civil nem os demais perfis/painéis.

## Implantação técnica

- GitHub Pages: run `35034630527` — **success**;
- Apps Script: workflow `35034644793` — **success**;
- deployment principal preservado;
- versão Apps Script anterior: `219`;
- versão Apps Script implantada: `220`;
- health checks de moradores, território, CSV, manutenção, isolamento, Japaranduba, Sítio Matias e conteúdo público: aprovados;
- registro do deploy: `374af0e517721afc678d5822b5547324dc4d99eb`.

## Estado

**IMPLEMENTADO, PUBLICADO E CANONIZADO — VALIDAÇÃO REAL NO IPHONE PENDENTE.**

Não considerar homologado antes de o usuário confirmar no dispositivo:
1. CPF já existente não pede nascimento e segue para criação do PIN;
2. CPF ausente pede data de nascimento;
3. após localizar o cadastro, aparece a revisão com CPF + nascimento e botão **Corrigir**;
4. **Confirmar e continuar** grava o CPF correto com 11 números na mesma pessoa;
5. em seguida aparece **Agora crie o seu PIN com quatro números.**;
6. confirmação do PIN é exigida;
7. no próximo acesso o PIN entra sem pedir CPF novamente;
8. a família completa aparece;
9. qualquer integrante pode ser selecionado para a solicitação.

## Correção complementar — PIN também no Portal TACS público
### Proteção preservada — aparelho administrativo não vira aparelho residencial
A gravação real de validação mostrou um aparelho já reconhecido como Administrador tentando executar o onboarding residencial do PIN no Portal público.

Esse comportamento não deve remover a barreira canônica já homologada nas Tarefas 6 e 7:
- aparelho administrativo permanece em diagnóstico/consulta;
- não cria PIN de Morador;
- não cria sessão residencial;
- não grava quickKey residencial;
- não assume notificações do Morador.

A correção desta etapa foi estritamente no frontend público: antes de iniciar o onboarding residencial por CPF, o Portal verifica se o aparelho já é administrativo e, nesse caso, não chama as actions residenciais. O backend permanece intacto como segunda barreira.

Commits:
- `a798da89afc80ace061c75b0e8d8df5102fe5973` — preserva a barreira administrativa no Portal público;
- `92f66fda30a0addbdd5c6219c5a34f758b64fad4` — cache-buster;
- `5279583cc4baa3d934c6636b0873645edc2b53fe` — teste de regressão.

A regra de PIN continua válida para **Morador real em aparelho não administrativo**.

Data: 15/09/2026

Falha confirmada por gravação real:
o fluxo de criação/reentrada por PIN havia sido implementado na porta unificada do Conecta, porém **não estava ligado ao Portal TACS público onde o morador efetivamente digitava o CPF**. Por isso o CPF e a família eram reconhecidos, mas a criação do PIN não aparecia.

Correção no mesmo módulo existente `portal-identificacao-familia-v1.js`:

Ramo A — CPF já existe:
`CPF reconhecido → autofill + família → conecta_morador_identificar → “Agora crie o seu PIN com quatro números.” → PIN + confirmação → conecta_morador_criar_pin → salvar quickKey/sessão`.

Ramo B — CPF ainda não existe:
`CPF não localizado → data de nascimento → nome se necessário → revisão CPF + nascimento → Corrigir OU Confirmar e continuar → backend salva CPF na mesma pessoa → criação/confirmação do PIN`.

Reentrada no próprio Portal:
`aparelho já reconhecido → “Acesse com seu PIN” → conecta_morador_login_pin → sessão → Portal autenticado → família vinculada`.

Chaves canônicas reaproveitadas:
- `portalConectaMoradorQuickV1`;
- `portalConectaMoradorTokenV1`;
- `portalTacsDispositivoV1`.

Nenhum backend paralelo, nova página ou nova versão funcional foi criado. As actions já existentes de `ZZZZ_51_AcessoUnificadoConectaV1.gs` foram reaproveitadas.

Commits:
- `4d999fe2485d0bb5792d9e196cb5e97c47cea4b1` — cria PIN após CPF reconhecido diretamente no Portal;
- `7899478c9873fb8a1469118e03541bc3a90efc4c` — liga CPF ausente → nascimento → revisão → PIN no Portal;
- `09924e75057e3c3d95c7686b9158d3469f19642d` — cache-buster do fluxo completo;
- `cbf2e28ea6e98874c7da22c95efa822e9eaa203b` — contrato de regressão.

Status: **IMPLEMENTADO EM MAIN — publicação Pages e validação real no aparelho pendentes.**
