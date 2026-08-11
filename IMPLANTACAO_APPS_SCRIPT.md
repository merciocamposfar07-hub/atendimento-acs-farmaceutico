# Implantação controlada do Apps Script

O workflow `Implantar Apps Script de Moradores` não é executado automaticamente
por mudanças comuns na `main`. Ele aceita execução manual ou um commit específico
no arquivo `.github/apps-script-release-request`.

## Secrets necessários

Configure em **GitHub → Settings → Secrets and variables → Actions**:

- `CLASPRC_JSON`: conteúdo de `~/.clasprc.json`, criado por `clasp login`;
- `CLASP_JSON`: conteúdo de `.clasp.json` com o `scriptId` do projeto real;
- `APPS_SCRIPT_DEPLOYMENT_ID`: ID da implantação `/exec` que deve manter a URL.

Nunca coloque esses conteúdos em arquivos versionados, issues, prints ou mensagens.

## Proteções do fluxo

1. executa toda a suíte de testes;
2. baixa o projeto real com `clasp pull`;
3. exige localizar exatamente um backend de moradores já existente;
4. preserva todos os outros arquivos e substitui somente os módulos 15–19;
5. bloqueia a publicação se encontrar módulo duplicado;
6. cria uma versão de backup antes do envio;
7. atualiza a implantação existente, mantendo a URL;
8. testa somente rotas de leitura;
9. restaura automaticamente a versão anterior se a validação falhar.

A API do Apps Script deve estar ativada em
`https://script.google.com/home/usersettings` antes do primeiro uso.
