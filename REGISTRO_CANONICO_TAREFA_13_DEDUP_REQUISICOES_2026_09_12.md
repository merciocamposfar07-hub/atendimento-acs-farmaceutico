# Registro canônico — Tarefa 13 — Deduplicação de requisições ao servidor

Data: 12/09/2026  
Status: IMPLEMENTADA EM CÓDIGO; AGUARDANDO VALIDAÇÃO INTEGRAL

## Objetivo exclusivo
Uma leitura idêntica não deve gerar várias chamadas ao Apps Script quando módulos do shell precisam da mesma informação. A Central permanece a origem do contexto e não depende do bridge consumidor.

Fluxo:
`consumidor solicita leitura → core calcula chave por ação + modo + área + sessão/aparelho em hash → se já existe voo, compartilhar → se houve resposta remota recente válida, distribuir → senão executar uma única leitura remota → entregar aos consumidores`.

## Contrato
- broker oficial: `ConectaModuleCoreV1.requests`;
- registro do broker existe apenas em memória no `window.top` do shell persistente;
- nenhuma credencial, PIN ou chave de confiança é persistida pelo broker;
- token/dispositivo não entram em texto puro na chave: o escopo usa hash;
- `escopo` do módulo é metadado local e não diferencia a mesma leitura remota;
- leituras simultâneas idênticas compartilham um único voo;
- uma resposta remota bem-sucedida pode ser distribuída por até 5 segundos aos consumidores da mesma leitura;
- escritas nunca são deduplicadas;
- qualquer mutação invalida imediatamente as leituras recentes e incrementa a geração;
- resposta antiga que terminar depois de uma mutação não repovoa a janela compartilhada;
- o cache versionado da Tarefa 12 continua não autoritativo e continua separado do broker;
- regras de timeout/sessão continuam reservadas à Tarefa 14.

## Cobertura
Central:
- permanece autoridade/origem do contexto;
- não carrega `ConectaModuleCoreV1` como consumidor.

Módulos:
- Agendas e Profissionais compartilham `admin_dados`;
- Moradores usa broker em `admin_moradores_status`;
- Recados/Campanhas em `admin_publicacoes_dados`;
- Suporte em `admin_suporte_chamados_listar`;
- TACS/Áreas em `admin_territorio_dados`;
- Municípios/Organizações em `admin_multimunicipio_dados`.

## Gate obrigatório
`scripts/test_tarefa13_dedup_requisicoes.js`

Saída esperada:
`TAREFA_13_DEDUP_REQUISICOES_OK`

Esta tarefa é de frontend/core. Nenhuma alteração de backend Apps Script foi necessária; a versão de produção deve permanecer em **208** se a validação passar.
