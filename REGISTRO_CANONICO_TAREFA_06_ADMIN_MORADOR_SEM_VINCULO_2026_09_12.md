# Registro canônico — Tarefa 06 — Administrador testa Morador sem vincular o aparelho

Data: 12/09/2026  
Status: IMPLEMENTADA EM CÓDIGO; AGUARDANDO VALIDAÇÃO INTEGRAL

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
