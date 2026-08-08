# Portal TACS — Auditoria do endpoint implantado

Data/hora observada pelo Apps Script: **07/08/2026 23:12 — America/Recife**

Endpoint auditado: o mesmo `exec` configurado atualmente no Portal e nos painéis.

A auditoria foi somente leitura, executada pelo GitHub Actions sem credenciais administrativas e sem qualquer POST.

## `admin_status`

O endpoint respondeu:

- `ok: true`
- `versaoAdmin: 1.0.0`
- `pinConfigurado: true`
- `setupTemporarioAtivo: false`

Isso prova que existe um núcleo administrativo implantado e respondendo no endpoint atual.

## `painel_publico`

### O que já funciona na implantação atual

A resposta pública já normaliza os módulos e devolve:

- `medica`
- `nutricionista`
- `enfermeira`
- `odontologia`
- `psicologo`

A resposta também contém a lista pública de profissionais ativos, incluindo o psicólogo. Portanto, a extensão de profissionais dinâmicos já está presente no Apps Script implantado, embora a interface nova do painel não tenha chegado ao GitHub Pages durante as falhas de publicação.

### Causa observada para médica e nutricionista não aparecerem ao morador

Na fotografia real, os registros da médica e da nutricionista possuem datas/horários/mensagens em alguns dias, mas chegam ao payload público com `active: false`.

Exemplos observados:

- Médica, sexta-feira: data `2026-08-07`, horário `08:00 as 12:00`, mensagem `Atendimento médico`, 15 vagas, **`active: false`**.
- Nutricionista, segunda-feira: data `2026-08-10`, horário `08:00 as 12:00`, mensagem `Nutri`, 15 vagas, **`active: false`**.

O Portal filtra agendas inativas. Logo, com o estado atual da API, ele está correto ao não exibir esses dias.

**Conclusão técnica atual:** o problema que resta investigar/validar no ambiente real é o caminho de gravação do campo `ATIVO` no painel administrativo. O problema histórico de normalização `MEDICA`/`medica` já não explica a falha atual do endpoint implantado.

### Comparação útil

O psicólogo foi devolvido com sexta-feira configurada como `active: true`, mostrando que a leitura pública é capaz de publicar um profissional quando a linha está efetivamente ativa.

A enfermeira também possui dias `active: true`, e a odontologia possui dias ativos.

## Recados e campanhas nesta fotografia

No instante da auditoria, a resposta retornou:

- `recados: []`
- `campanhas: []`

Isso não prova falha dessas funções; apenas registra que não havia conteúdo ativo retornado nesse instante. Testes reais posteriores à implantação estabilizada devem preservar qualquer recado/campanha que esteja ativo no momento do teste.

## Como a linha de estabilização trata o campo `ATIVO`

O painel de agendas monta o payload a partir do checkbox `Agenda ativa` e envia `ativo: 'true'` ou `ativo: 'false'`.

O `AdminCoreV1.gs` grava esse valor na coluna `ATIVO`, e a suíte integrada valida o fluxo completo:

1. enviar agenda médica usando `MÉDICA`;
2. enviar `ativo: true`;
3. gravar a linha;
4. reler a planilha simulada;
5. obter a médica como ativa no payload público.

Esse comportamento deverá ser conferido no Apps Script real antes do merge para `main`.
