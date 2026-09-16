# Registro canônico — PIN TACS com um único responsável

Data: 2026-09-16

## Sintoma
O campo mostrava quatro dígitos, mas a tela ainda podia exibir aviso de PIN inválido.

## Causa
O botão "Entrar na minha área" possuía duas rotinas de validação TACS concorrentes:
- rotina base da Central;
- rotina específica do login rápido TACS.

## Correção isolada
Bloco: `DONO_UNICO_PIN_TACS_2026_09_16_V1`

Arquivos funcionais:
- `central-tacs-login-rapido-v1.js`
- `central-administrativa-tacs.js`

Regra:
- o módulo de login rápido é o único dono do clique e da validação quando carregado;
- a rotina da Central permanece somente como fallback se o módulo específico não carregar;
- a leitura continua usando o campo `#tacsPin` atualmente montado no DOM;
- o status visual passa a controlar corretamente o atributo `hidden`.

## Fora do escopo
Não altera painéis administrativos, pré-carregamento, layout dos painéis, permissões, UBS, áreas, isolamento territorial ou dados.
