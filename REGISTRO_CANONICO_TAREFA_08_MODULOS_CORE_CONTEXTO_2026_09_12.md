# Registro canônico — Tarefa 08 — Painéis como módulos do núcleo Conecta

Data: 12/09/2026  
Status: VALIDADA INTERNAMENTE E IMPLANTADA — APPS SCRIPT VERSÃO 206

## Objetivo exclusivo da Tarefa 8
Transformar progressivamente os painéis antigos em módulos consumidores do contexto único do Conecta Saúde Comunitária, sem ainda executar a remoção definitiva de todos os logins legados nem a migração final painel a painel.

## Contrato validado
- a Central publica o contexto único do Conecta;
- o bridge oficial é `conecta-module-core-v1.js`;
- o contexto entregue aos módulos contempla identidade, perfil, função/unidade UBS, área, permissões, sessão, estado e política de cache;
- tokens remotos não são persistidos dentro do snapshot de contexto;
- Agendas, Moradores, Profissionais, Recados/Campanhas, Suporte aos Moradores, TACS/Áreas e Municípios/Organizações consomem o núcleo;
- decisões de autenticação, perfil e contexto passam a pertencer ao core;
- logins legados restantes permanecem somente como compatibilidade transitória até a Tarefa 9;
- shell persistente permanece reservado à Tarefa 10;
- migração definitiva painel a painel, iniciando por Agendas e vagas, permanece reservada à Tarefa 16.

## Gate obrigatório
`scripts/test_tarefa8_modulos_core_contexto.js`

Saída validada:
`TAREFA_8_MODULOS_CORE_CONTEXTO_OK`

## Ajustes de compatibilidade durante a validação
Duas falhas de testes legados foram identificadas antes do deploy, sem alteração funcional indevida do aplicativo:

1. o cenário JSDOM de sessão administrativa expirada não carregava o `ConectaModuleCoreV1`, apesar de o painel real carregá-lo;
2. o gate territorial de Recados ainda exigia que o próprio painel decidisse entre sessão TACS e Administrador, regra transferida ao core pela Tarefa 8.

Os dois testes foram alinhados ao comportamento real da nova arquitetura. Nenhum login legado foi removido antecipadamente; essa remoção continua pertencendo à Tarefa 9.

## Resultado técnico verificado
- gate específico `TAREFA_8_MODULOS_CORE_CONTEXTO_OK`: **aprovado**;
- suíte integral: **aprovada**;
- quality gate interno: **100% dos critérios automatizados desta homologação**;
- workflow Apps Script final: **success**, run `34721946917`;
- versão anterior: `205`;
- nova versão criada e implantada no mesmo deployment: **`206`**;
- health check: **aprovado na primeira tentativa**, incluindo moradores, território, CSV, manutenção, isolamento, agendas Japaranduba/Matias, painéis públicos e conteúdo;
- versões em uso após o deploy: `6, 7, 9, 206`;
- GitHub Pages: **build, deploy e report aprovados**, run `34722041965`.

## Fechamento
A **Tarefa 8 está validada internamente, implantada, publicada e canonizada**. A Tarefa 9 está liberada para remover dos módulos a responsabilidade por PIN/login/perfil/sessão própria, sem antecipar a Tarefa 10 ou a migração definitiva da Tarefa 16.
