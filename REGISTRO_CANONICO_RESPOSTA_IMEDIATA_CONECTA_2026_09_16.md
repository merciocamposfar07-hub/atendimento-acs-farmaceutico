# Registro canônico — resposta imediata de toque, cache primeiro e sincronização em segundo plano

Data: 2026-09-16

## Regra canônica

Fluxo obrigatório de interação do Conecta Saúde Comunitária:

```
Toque
↓
resposta visual imediata
↓
tela/shell já disponível
↓
último conteúdo válido em cache/estado local
↓
Apps Script consulta em segundo plano
↓
somente diferenças confirmadas atualizam a tela
```

A interface não deve aguardar Apps Script, planilha, filtragem ou retorno remoto para responder ao toque.

## Painéis administrativos

O contrato já existente permanece preservado:
- shell persistente;
- pré-carregamento escalonado;
- `performance.prime` para pintura local;
- `performance.commit` para atualização remota por diferença;
- deduplicação de leituras;
- reset apenas em mudança de escopo, logoff ou recusa real de autenticação.

Nenhuma regra funcional dos painéis foi alterada neste bloco.

## Portal do Morador

Bloco funcional: `RESPOSTA_IMEDIATA_MORADOR_2026_09_16_V1`.

Correção:
- integrantes com documento começam a ser resolvidos em segundo plano assim que a família é exibida;
- resultados ficam somente em memória e são isolados por área + família + token;
- toque no integrante muda o estado visual e aplica nome/nascimento imediatamente;
- se o integrante já estiver aquecido, o documento é aplicado sem nova espera;
- se ainda não estiver aquecido, a consulta remota ocorre como fallback sem bloquear a resposta visual;
- nenhum CPF/CNS novo é persistido por este cache;
- Apps Script continua como autoridade remota.

## Isolamento

Este bloco não altera:
- permissões;
- isolamento territorial;
- UBS;
- vagas;
- agendas;
- regras de cadastro;
- regras de escrita;
- autenticação por PIN;
- estrutura das planilhas;
- backend Apps Script.

## Gate de regressão

Arquivo: `scripts/test_resposta_imediata_conecta_v1.js`

Saída obrigatória:

`RESPOSTA_IMEDIATA_CONECTA_OK`

O gate impede que uma alteração futura volte a colocar a consulta remota antes da resposta local nos caminhos protegidos.
