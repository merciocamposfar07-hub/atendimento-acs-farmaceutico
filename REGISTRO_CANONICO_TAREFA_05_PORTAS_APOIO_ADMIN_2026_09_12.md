# Registro canônico — Tarefa 05 — Portas de apoio do Administrador

Data: 12/09/2026  
Status: IMPLEMENTADA EM CÓDIGO; AGUARDANDO VALIDAÇÃO INTEGRAL

## Objetivo exclusivo da Tarefa 5
Um aparelho já reconhecido como Administrador não pode ficar preso a uma única porta do Conecta. Mesmo quando acessar um fluxo TACS, as quatro portas canônicas continuam disponíveis:

- Administrador / Central Administrativa;
- TACS;
- Morador;
- UBS.

## Regras preservadas
- o reconhecimento do Administrador é usado para impedir bloqueio indevido em modo TACS exclusivo;
- as combinações de perfil não criam portas novas;
- nomes pessoais continuam ocultos antes do PIN;
- esta tarefa não cria diagnóstico administrativo do Morador;
- esta tarefa não altera vínculo de aparelho do Morador;
- a identidade real após autenticação continua regida pela Tarefa 3.

## Implementação
- `central-administrativa-tacs.js`: modo `?acesso=tacs` deixa de aprisionar aparelho reconhecido como Administrador;
- `central-tacs-login-rapido-v1.js`: sessão territorial não força interface TACS exclusiva quando existe reconhecimento administrativo;
- `conecta-acesso-unificado-v1.js`: aparelho Administrador preserva a escolha entre as quatro portas mesmo quando a URL solicita acesso TACS.

## Gate obrigatório
`scripts/test_tarefa5_admin_portas_apoio.js`

Saída esperada:
`TAREFA_5_ADMIN_PORTAS_APOIO_OK`

A Tarefa 5 só será concluída após gate específico, suíte integral, implantação/health checks de integração e GitHub Pages passarem com sucesso.
