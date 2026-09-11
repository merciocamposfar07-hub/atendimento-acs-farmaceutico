# Fluxograma — Abertura Canônica do Conecta Saúde Comunitária

Data de canonização: 2026-09-08.
Versão de homologação: v10.

## Decisão canonizada

A abertura oficial do Conecta Saúde Comunitária deve seguir exatamente o modelo visual aprovado pelo usuário em 2026-09-08, com fundo azul-escuro profundo, ícone central oficial C+ e oito pictogramas oficiais orbitais.

## Composição obrigatória da tela inicial

1. Fundo azul-escuro profundo, com efeito de profundidade tecnológica e linhas orbitais/hexagonais discretas.
2. Ícone central C+ em 3D, com brilho azul ao redor, ocupando o centro superior da tela.
3. Oito pictogramas circulares em 3D ao redor do ícone central.
4. Texto superior em verde-ciano: `CONECTA SAÚDE COMUNITÁRIA`.
5. Chamada principal: `Saúde, comunidade e cuidado conectados.`
6. Linha luminosa horizontal separando a chamada dos três blocos conceituais.
7. Três blocos inferiores: `CONECTA PESSOAS`, `PROMOVE SAÚDE`, `FORTALECE A COMUNIDADE`.
8. Linha final obrigatória: `TACS + COMUNIDADE + UNIDADE`.
9. Botão principal obrigatório: `Acessar conta`.

## Movimento obrigatório

Os pictogramas não podem ficar apenas estáticos. O comportamento canônico é um loop contínuo:

1. Os pictogramas surgem de dentro do ícone central.
2. Eles se expandem até a órbita ao redor do C+.
3. Eles giram em movimento orbital, tomando como referência a fluidez da abertura do app Mercado Bitcoin.
4. Eles retornam para dentro do ícone central.
5. O ciclo se repete continuamente enquanto a tela inicial estiver aberta.

## Restrições

É proibido:

- trocar o ícone central C+ sem aprovação expressa;
- trocar os pictogramas sem aprovação expressa;
- usar emoji no lugar dos pictogramas;
- voltar ao layout laranja;
- cortar botão, título, pictogramas ou linha `TACS + COMUNIDADE + UNIDADE`;
- separar Conecta Saúde em aplicativos diferentes.

## Estrutura do app

O Conecta Saúde Comunitária é um aplicativo único. Após o acesso, o sistema identifica o perfil autorizado e exibe o painel correspondente:

- Morador;
- TACS;
- Profissional da unidade;
- Administrador.

Os painéis administrativos do projeto anterior permanecem como base administrativa dentro do app único, não como aplicativo separado.

## Status

Esta decisão está registrada como padrão canônico da abertura e não deve ser alterada por tentativa visual sem nova aprovação do usuário.

## Fluxo canônico de acesso após a abertura

Depois de `Acessar conta`, o app segue dois caminhos.

### Primeiro acesso
`Selecionar perfil → identificação necessária → servidor confirma vínculo → criar PIN → reconhecer aparelho → preparar contexto/snapshot local cifrado → sincronizar dados iniciais → abrir área correspondente.`

### Segundo acesso e seguintes
`Selecionar perfil → digitar PIN → destravar contexto/snapshot local do aparelho → abrir imediatamente identidade + área + último estado confirmado → criar sessão remota nova e sincronizar em segundo plano.`

Por perfil:
- **Administrador:** abre a Central e somente as estruturas administrativas autorizadas.
- **TACS:** abre exclusivamente a própria área, unidade e permissões.
- **Morador:** abre exclusivamente seu portal/vínculo familiar/área.

### Desempenho contínuo obrigatório
`Ícone do Conecta → tela de PIN imediata → preparação assíncrona não bloqueante já iniciada → PIN local → perfil/área exibidos imediatamente → Saúde Geral mostra a última leitura confirmada → servidor atualiza somente o que mudou em segundo plano.`

Regras:
- a abertura da tela de PIN nunca espera Apps Script;
- depois do primeiro paint, o app pode aquecer o backend e pré-carregar arquivos/leituras públicas sem bloquear Safari;
- o nome real do Administrador, TACS ou Morador autenticado faz parte do contexto local confirmado e deve aparecer com alto contraste;
- a Saúde Geral usa stale-while-revalidate: último valor confirmado primeiro, atualização remota depois;
- falha transitória não apaga um valor confirmado nem obriga o usuário a tocar em `Atualizar`;
- cache e pré-carregamento permanecem isolados por perfil e área;
- **PIN único por entrada:** depois que o PIN válido abriu Administrador/TACS, nenhum painel administrativo interno pede PIN novamente; se a nova sessão remota ainda estiver sendo criada, o toque fica aguardando na Central e o painel abre automaticamente quando a sessão estiver pronta; um painel nunca deve exibir formulário legado de PIN como continuação do acesso.

### Operações críticas
`Tela local → usuário solicita alteração/reserva → servidor valida estado atual + sessão + território/permissão → servidor confirma → interface marca como concluída.`

O cache não substitui a autoridade do servidor. Ele elimina a espera desnecessária para desenhar e navegar pela interface.
