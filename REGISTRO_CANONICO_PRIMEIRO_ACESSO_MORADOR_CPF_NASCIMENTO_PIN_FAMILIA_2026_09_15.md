# Registro canônico — Primeiro acesso do Morador: CPF ausente → nascimento → PIN familiar

Data: 15/09/2026  
Escopo: Conecta Saúde Comunitária / porta Morador  
Tipo: bloco funcional isolado no fluxo de primeiro acesso, sem criação de nova versão funcional do projeto

## Regra autorizada

Quando o Morador informa um CPF válido que ainda não existe no cadastro territorial:

`CPF não localizado → confirmar pela data de nascimento → localizar o cadastro existente → salvar o CPF no campo vazio da mesma pessoa → criar PIN de 4 números → confirmar o mesmo PIN → abrir o Portal do Morador`

No acesso seguinte:

`PIN de 4 números → reconhecer o acesso do Morador/família → abrir o Portal → mostrar todos os integrantes ativos da família → permitir selecionar qualquer integrante para a solicitação do serviço`

## Regras obrigatórias

- o CPF informado não cria uma pessoa nova;
- se o CPF ainda estiver vazio no cadastro localizado, ele é salvo na mesma linha do morador;
- data de nascimento é usada para confirmar/localizar o cadastro existente;
- quando houver mais de uma pessoa com a mesma data, a identificação adicional por nome continua permitida para evitar vinculação errada;
- CPF já associado a outro cadastro continua bloqueado;
- CPF existente diferente no cadastro localizado não pode ser sobrescrito silenciosamente;
- após confirmação segura do CPF pela data de nascimento, não deve existir a etapa intermediária **Salvar e continuar**;
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

Arquivo funcional alterado:
- `conecta-acesso-unificado-v1.js`

Mudanças estritas:
1. registrar no estado quando o CPF não foi localizado e a confirmação por nascimento foi necessária;
2. após a confirmação segura por nascimento, seguir diretamente para criação do PIN;
3. trocar a mensagem genérica de criação do PIN pela mensagem canônica autorizada;
4. explicitar os dois campos de quatro dígitos.

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
- `59f2041046d692d716780ad5c8111c43ab0888be` — cache-buster final do primeiro acesso seguro.

## Proteção de reversão

Se esta etapa precisar ser alterada ou desfeita, atuar somente no ramo de primeiro acesso do Morador descrito acima. Não usar esta correção como autorização para alterar o fluxo já homologado de família completa/nascimento civil nem os demais perfis/painéis.

## Estado

**IMPLEMENTADO EM MAIN — PUBLICAÇÃO E VALIDAÇÃO REAL NO IPHONE PENDENTES.**

Não considerar homologado antes de o usuário confirmar no dispositivo:
1. CPF ausente pede data de nascimento;
2. confirmação correta leva diretamente à mensagem **Agora crie o seu PIN com quatro números.**;
3. confirmação do PIN é exigida;
4. no próximo acesso o PIN entra sem pedir CPF novamente;
5. a família completa aparece;
6. qualquer integrante pode ser selecionado para a solicitação.
