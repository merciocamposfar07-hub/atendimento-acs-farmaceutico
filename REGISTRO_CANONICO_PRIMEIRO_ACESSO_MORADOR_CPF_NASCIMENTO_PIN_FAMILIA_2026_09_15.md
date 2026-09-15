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

## Estado

**IMPLEMENTADO EM MAIN — PUBLICAÇÃO E VALIDAÇÃO REAL NO IPHONE PENDENTES.**

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
