# Registro canônico — Tarefa 06 — Administrador testa Morador sem vincular o aparelho

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E IMPLANTADA — APPS SCRIPT VERSÃO 204

## Objetivo exclusivo da Tarefa 6
Quando um aparelho já reconhecido como Administrador for usado para consultar/testar um Morador, o Conecta não pode transformar esse aparelho em aparelho residencial.

A consulta administrativa aceita:
- CPF com 11 números;
- CNS com 15 números.

## Regras obrigatórias
- não criar PIN de Morador no aparelho administrativo;
- não criar sessão residencial no aparelho administrativo;
- não salvar quickKey de Morador nesse fluxo;
- não trocar ou assumir o aparelho principal do Morador;
- não criar duplicidade de vínculo;
- não registrar o iPhone/computador administrativo para notificações do Morador;
- não alterar Subscription, preferência Push ou vínculo familiar do Morador;
- a consulta administrativa é somente leitura;
- o backend também bloqueia o fluxo residencial normal quando reconhece que o dispositivo é administrativo.

## Implementação
- `conecta-acesso-unificado-v1.js`: a porta Morador em aparelho Administrador abre consulta por CPF/CNS sem onboarding residencial;
- `apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs`: nova ação `conecta_morador_diagnostico_admin`, validada por aparelho administrativo confiável;
- o diagnóstico retorna explicitamente `somenteLeitura:true`, `vinculoAparelhoCriado:false`, `vinculoMoradorAlterado:false`, `notificacoesAlteradas:false` e `sessaoMoradorCriada:false`;
- identificação, confirmação, criação de PIN, login residencial e confirmação de notificações são bloqueados quando o backend detecta aparelho Administrativo.

## Limite desta tarefa
A Tarefa 6 cria a barreira de segurança e a consulta administrativa separada. A reutilização integral do mesmo formulário/experiência do Morador com um modo central `DIAGNOSTICO_ADMINISTRATIVO` pertence à Tarefa 7 e não é antecipada aqui.

## Gate obrigatório
`scripts/test_tarefa6_admin_morador_sem_vinculo.js`

Saída esperada:
`TAREFA_6_ADMIN_MORADOR_SEM_VINCULO_OK`

A Tarefa 6 só pode ser encerrada depois de gate específico, suíte integral, deploy/health check do Apps Script e GitHub Pages passarem.


## Resultado técnico verificado
- primeira tentativa: workflow `34719436725` interrompido **antes do deploy** porque gates históricos das Tarefas 4 e 5 ainda proibiam qualquer diagnóstico administrativo;
- esses gates foram atualizados apenas para permitir a evolução posterior, preservando seus contratos originais;
- RETRY: workflow `34719509591` **success**;
- gate `TAREFA_6_ADMIN_MORADOR_SEM_VINCULO_OK`: **aprovado**;
- suíte integral: **aprovada**;
- Apps Script: versão anterior `203`, nova versão **`204`**;
- health checks: **aprovados na primeira tentativa**;
- versões ativas após implantação: `6, 7, 9, 204`;
- GitHub Pages: **success**, run `34719505209`.

## Fechamento
A **Tarefa 6 está validada internamente, implantada e publicada**. O aparelho Administrador pode consultar Morador por CPF/CNS sem criar PIN, sessão, quickKey, vínculo de aparelho ou notificações residenciais. A unificação do fluxo visual em um núcleo explícito de diagnóstico permanece para a Tarefa 7.
