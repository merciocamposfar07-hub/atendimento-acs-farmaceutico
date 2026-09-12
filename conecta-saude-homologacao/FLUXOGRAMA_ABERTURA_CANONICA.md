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

O Conecta Saúde Comunitária é um aplicativo único. Após o acesso, o sistema identifica o perfil autorizado e exibe o ambiente correspondente.

Perfis de entrada canônicos a partir da Tarefa 1 autorizada em 12/09/2026:

- Administrador;
- TACS;
- Morador;
- UBS.

O perfil UBS representa uma pessoa responsável identificada na unidade (por exemplo, gestor ou atendente), com nome, função, unidade vinculada, PIN e permissões cadastradas.

Os painéis administrativos do projeto anterior permanecem como base administrativa dentro do app único, não como aplicativo separado.

## Status

Esta decisão está registrada como padrão canônico da abertura e não deve ser alterada por tentativa visual sem nova aprovação do usuário.

## Fluxo canônico de acesso após a abertura

Depois de `Acessar conta`, o app segue dois caminhos.

### Primeiro acesso
`Selecionar perfil → identificação necessária → servidor confirma vínculo → criar PIN → reconhecer aparelho → preparar contexto/snapshot local cifrado → sincronizar dados iniciais → abrir área correspondente.`

### Segundo acesso e seguintes
`Selecionar perfil → digitar PIN → destravar contexto/snapshot local do aparelho → abrir imediatamente o último estado confirmado → criar sessão remota nova e sincronizar em segundo plano.`

Por perfil:
- **Administrador:** abre a Central e as estruturas autorizadas.
- **TACS:** abre exclusivamente a própria área, unidade e permissões.
- **Morador:** abre exclusivamente seu portal/vínculo familiar/área.
- **UBS:** no primeiro acesso, seleciona UBS e confirma o cadastro previamente criado do responsável da unidade. A Tarefa 1 não cria ainda o reconhecimento persistente do computador nem restringe a segunda entrada somente à UBS; isso pertence à etapa posterior de reconhecimento do aparelho.

### Registro canônico — Tarefa 1 / Perfil UBS
A Tarefa 1 autorizada em 12/09/2026 acrescenta **UBS** como quarto perfil de entrada e amplia o cadastro administrativo de **Administrador / TACS** para **Administrador / TACS / UBS**. O cadastro UBS exige responsável identificado, função na UBS, unidade vinculada, PIN e permissões explícitas. Nesta tarefa, UBS existe somente como perfil isolado; combinações como Administrador + UBS, TACS + UBS ou UBS + Morador não são criadas antecipadamente.

### Operações críticas
`Tela local → usuário solicita alteração/reserva → servidor valida estado atual + sessão + território/permissão → servidor confirma → interface marca como concluída.`

O cache não substitui a autoridade do servidor. Ele elimina a espera desnecessária para desenhar e navegar pela interface.


### Status da Tarefa 1: VALIDADA — 12/09/2026
A inclusão do perfil UBS no primeiro acesso e no cadastro administrativo foi validada por gate específico, suíte integral, implantação Apps Script versão 196 e GitHub Pages publicado. O escopo permanece limitado ao perfil UBS isolado; combinações de perfis UBS e reconhecimento persistente do computador ficam fora desta tarefa.


### Registro canônico — Tarefa 2 / Combinações de perfis com UBS
A Tarefa 2 autorizada em 12/09/2026 amplia o cadastro de identidade funcional sem alterar as quatro portas de entrada do aplicativo.

Portas de entrada permanecem:
`Administrador | TACS | Morador | UBS`

Perfis válidos no cadastro de acesso:
- Administrador + TACS + UBS + Morador;
- Administrador + TACS + UBS;
- Administrador + UBS + Morador;
- TACS + UBS + Morador;
- Administrador + UBS;
- TACS + UBS;
- UBS + Morador;
- Administrador + TACS + Morador;
- Administrador + TACS;
- Administrador + Morador;
- TACS + Morador;
- TACS;
- Administrador;
- UBS.

**UBS pura permanece válida.**

As combinações são identidade/permissões do mesmo cadastro, não novos botões de entrada. Se o perfil contém TACS, preserva exigências de CNS, microárea e vínculo territorial; se contém UBS, exige função na UBS e unidade vinculada; se contém ambos, exige os dois conjuntos.

A Tarefa 2 não implementa reconhecimento persistente do aparelho, segunda entrada exclusiva por perfil nem modo diagnóstico administrativo.


### Status da Tarefa 2: VALIDADA INTERNAMENTE E PUBLICADA — 12/09/2026
Matriz de 14 perfis validada, incluindo **UBS pura**. Gate específico e suíte integral aprovados. Apps Script versão 200 implantado com health checks aprovados e GitHub Pages publicado. A validação visual final no aparelho do usuário permanece pendente. A Tarefa 3 não foi iniciada.


## Tarefa 3 — Identidade real após autenticação (12/09/2026)
Autorizada pelo usuário. Fluxo: PIN validado → identidade pessoal confirmada pelo servidor → nome completo + perfis cadastrados legíveis. O responsável territorial não substitui a pessoa autenticada. Identidade ausente/ambígua gera mensagem explícita sem encerrar sessão. UBS mostra combinações completas; Morador mostra nome e perfil. Rodapé preservado e carregamento visível no cadastro de acessos.
Status: validação no GitHub e implantação pendentes. Ver `REGISTRO_CANONICO_TAREFA_03_IDENTIDADE_REAL_2026_09_12.md`. Tarefa 4 depende do encerramento comprovado desta etapa.
