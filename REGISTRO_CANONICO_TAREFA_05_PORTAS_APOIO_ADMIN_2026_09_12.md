# Registro canônico — Tarefa 05 — Portas de apoio do Administrador

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E IMPLANTADA — APPS SCRIPT VERSÃO 203

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


## Resultado técnico verificado
- tentativa inicial: workflow `34719025276` interrompido **antes do deploy** por um gate institucional legado que ainda exigia TACS exclusivo;
- correção: o gate legado foi alinhado à regra autorizada da Tarefa 5, sem afrouxar a suíte;
- RETRY: workflow `34719091947` **success**;
- gate `TAREFA_5_ADMIN_PORTAS_APOIO_OK`: **aprovado**;
- suíte integral: **aprovada**;
- versão anterior: `202`;
- nova versão implantada: **`203`**;
- health checks: **aprovados na primeira tentativa**;
- versões ativas após implantação: `6, 7, 9, 203`.

## Fechamento
A **Tarefa 5 está validada internamente e implantada**. O aparelho Administrador permanece livre para usar as quatro portas canônicas e o diagnóstico administrativo do Morador continua reservado às Tarefas 6 e 7.
