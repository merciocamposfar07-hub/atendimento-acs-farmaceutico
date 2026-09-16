# Registro canônico — leitura do PIN TACS no iPhone

Data: 2026-09-16

## Sintoma observado
O campo PIN individual exibe quatro dígitos no iPhone, porém o acesso devolve mensagem de PIN ausente/inválido.

## Correção isolada
Bloco: `LEITURA_PIN_TACS_ATIVO_IPHONE_2026_09_16_V1`

Arquivo funcional: `central-tacs-login-rapido-v1.js`

Regra:
- no toque em “Entrar na minha área”, ler o elemento `#tacsPin` atualmente montado no DOM;
- manter somente em memória, durante a tentativa corrente, o último valor numérico digitado;
- não persistir o PIN;
- limpar campo e memória ao concluir a tentativa;
- remover a mensagem de formato inválido assim que o valor atual tiver 4 a 8 números.

## Fora do escopo
Não altera layout, permissões, isolamento territorial, dados, UBS, painéis, pré-carregamento ou regras de autenticação do servidor.
