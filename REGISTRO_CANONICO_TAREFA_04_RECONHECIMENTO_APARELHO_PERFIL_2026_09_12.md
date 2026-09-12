# Registro canônico — Tarefa 04 — Reconhecimento do aparelho e perfil no segundo acesso

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E IMPLANTADA — APPS SCRIPT VERSÃO 202

## Objetivo exclusivo da Tarefa 4
Após o primeiro acesso já confirmado, o Conecta Saúde Comunitária deve reconhecer o perfil disponível naquele aparelho e preparar a porta correspondente para entrada por PIN:

- Administrador → Administrador + PIN;
- TACS → TACS + PIN;
- Morador → Morador + PIN;
- UBS → UBS + PIN.

As combinações de perfis continuam sendo identidade/permissões do mesmo cadastro e **não viram novas portas de entrada**.

## Regras preservadas
- a tela pré-autenticação não revela o nome da pessoa reconhecida;
- o nome completo + perfil real continuam aparecendo somente após autenticação, conforme Tarefa 3;
- Administrador continua com as demais portas de apoio disponíveis; a Tarefa 5 ainda não é implementada aqui;
- Morador real continua usando o vínculo próprio do aparelho;
- modo diagnóstico administrativo de Morador não é criado nesta tarefa; permanece reservado às Tarefas 6 e 7;
- o PIN continua sendo a credencial digitada no segundo acesso.

## Implementação
- reconhecimento local do último perfil usado;
- Administrador e TACS reaproveitam o cofre local cifrado já existente;
- Morador reaproveita o vínculo rápido já existente, sem exibir nome antes do PIN;
- UBS passa a registrar prova segura do aparelho no primeiro acesso e, nos acessos seguintes, valida PIN + aparelho + chave de confiança;
- a chave de confiança UBS é armazenada somente em forma hash no backend;
- uma sessão remota UBS nova é criada após PIN válido;
- perfil combinado UBS é preservado após autenticação.

## Gate obrigatório
`scripts/test_tarefa4_reconhecimento_aparelho_perfil.js`

Saída esperada:
`TAREFA_4_RECONHECIMENTO_APARELHO_PERFIL_OK`

A Tarefa 4 só será concluída após gate específico, suíte integral, implantação Apps Script, health checks e GitHub Pages passarem com sucesso.


## Resultado técnico verificado
- gate específico `TAREFA_4_RECONHECIMENTO_APARELHO_PERFIL_OK`: **aprovado**;
- suíte integral: **aprovada**;
- workflow Apps Script: **success**, run `34718800583`;
- versão anterior: `201`;
- nova versão criada e implantada: **`202`**;
- health checks: **aprovados na primeira tentativa** para moradores, território, CSV, manutenção, isolamento, agendas Japaranduba/Matias, painéis públicos e conteúdo;
- GitHub Pages: **success**, run `34718794886`;
- versões ativas após a implantação: `6, 7, 9, 202`.

## Fechamento
A **Tarefa 4 está validada internamente, implantada e registrada canonicamente**. Nenhuma porta adicional para combinações foi criada, a identidade nominal continua protegida antes do PIN e o modo diagnóstico administrativo de Morador permanece fora desta tarefa.
