# Bloco isolado — reentrada por PIN expande o núcleo familiar

Data: 16/09/2026

## Regra canônica

PIN → identifica a pessoa → identifica o núcleo familiar → carrega todos os familiares vinculados → permite escolher qualquer um deles.

A regra vale independentemente de qual integrante da família criou o PIN.

## Escopo do bloco

- `apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs`: criação, login e validação de sessão passam a devolver `familiaId` e a lista completa `familia`.
- `conecta-morador-pin-local-v2.js`: o snapshot local preserva o núcleo familiar recebido no login.
- `conecta-morador-session-v1.js`: a reentrada mantém a lista familiar durante a confirmação remota e não a substitui por uma resposta temporariamente incompleta.
- `index.html` e `central-administrativa-tacs.html`: revisão de cache somente para os dois arquivos alterados.

## Isolamento preservado

Este bloco não altera CPF, confirmação por nascimento, criação do PIN, isolamento territorial, UBS, TACS, vagas, agendas ou outros painéis.

## Validação automatizada

`scripts/test_reentrada_pin_nucleo_familiar_v1.js` simula Sandrielle e Ricardo no cadastro familiar 053 e confirma que qualquer um dos dois, como titular do PIN, recebe os dois integrantes na reentrada.
