# Ativação hoje — Supervisor IA do Conecta Saúde Comunitária (LAB)

## Estado atual do código
- Branch isolada: `laboratorio-ia-autorreparo`
- Cliente Supervisor carregado somente na Central experimental.
- Fila offline e retomada automática.
- Painel técnico visível.
- Backend Apps Script isolado em `laboratorio-ia/apps-script/Code.gs`.
- OpenAI Responses API com function calling estruturado.
- Modelo primário: `gpt-5.6-terra`.
- Escalonamento: `gpt-5.6-sol`.
- Autorreparo de código limitado à branch do laboratório.
- Substituição exata no mesmo arquivo causal; sem criar v2/v3/v4.
- Commit Git serve como backup/rollback.
- Nenhuma credencial fica no GitHub ou no navegador.

## O que falta para ficar operacional
### 1. Criar um Apps Script separado para o laboratório
Criar um projeto Apps Script novo, sem reutilizar o deployment oficial.
Copiar para ele o conteúdo de:
`laboratorio-ia/apps-script/Code.gs`

Implantar como Web App e copiar a URL `.../exec`.

### 2. Script Properties do Apps Script LAB
Configurar:
- `OPENAI_API_KEY` = chave da API OpenAI
- `OPENAI_MODEL` = `gpt-5.6-terra`
- `OPENAI_ESCALATION_MODEL` = `gpt-5.6-sol`
- `GITHUB_TOKEN` = token fine-grained com Contents: Read and write apenas para o repositório do Conecta
- `GITHUB_REPO` = `merciocamposfar07-hub/atendimento-acs-farmaceutico`
- `GITHUB_BRANCH` = `laboratorio-ia-autorreparo`

NUNCA colocar essas chaves em arquivo JS, HTML ou commit.

### 3. Abrir a Central experimental com o endpoint
Na URL do clone, adicionar:
`?supervisorApi=URL_DO_APPS_SCRIPT_LAB`

O cliente guarda essa URL apenas na sessão do navegador e inicia o Supervisor.

## Teste inicial real
Não fabricar erro.
Usar o Conecta normalmente no iPhone.
Quando ocorrer uma inconsistência real:
1. painel técnico mostra incidente;
2. erro é salvo localmente;
3. Supervisor recebe telemetria sanitizada;
4. IA localiza módulo/arquivo/função;
5. recuperação runtime é tentada;
6. se exigir código e as credenciais GitHub estiverem configuradas, a IA propõe substituição mínima no arquivo causal;
7. backend valida que o trecho existe exatamente uma vez;
8. commit é aplicado somente na branch LAB;
9. estado fica `REPARO_APLICADO_AGUARDANDO_VALIDACAO`;
10. somente após teste funcional real pode virar `RESOLVIDO_VALIDADO` e `ESTADO_NORMAL_RESTAURADO`.

## Regra de segurança
A branch `main` não é alvo de escrita do Supervisor. O backend bloqueia qualquer `GITHUB_BRANCH` diferente de `laboratorio-ia-autorreparo`.
