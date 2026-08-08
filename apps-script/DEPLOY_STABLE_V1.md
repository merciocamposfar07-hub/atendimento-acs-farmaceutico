# Implantação controlada — Portal TACS Estável V1

Release esperada: `20260807-estavel-v1`

Este procedimento só deve ser executado depois de a suíte da branch `stabilization/portal-tacs-v1` estar verde.

## Pacote oficial

O projeto Apps Script deve receber exatamente estes quatro módulos da pasta `apps-script/`:

1. `PortalRouterV1.gs`
2. `AdminCoreV1.gs`
3. `PublicCoreV1.gs`
4. `PerformanceCoreV1.gs`

Entre esses quatro arquivos, **somente `PortalRouterV1.gs` declara `doGet` e `doPost`**.

Não reintroduzir `ZZ_11`, `ZZ_12`, `ZZZ_13`, `apps-script-controle-integral.gs` ou outras rotas paralelas substituídas pela estabilização.

## Dependências do projeto Google existente

O pacote foi desenhado para trabalhar com a planilha real via `SPREADSHEET_ID` nas Script Properties ou, em contingência, pela planilha ativa.

Funções antigas de morador podem permanecer no projeto Google quando necessárias. O roteador possui compatibilidade opcional com `buscarMoradorPorDocumento_`/`responderMoradorPorIframe_` se essas funções existirem.

Não apagar módulos externos de reserva odontológica ou busca de morador apenas para implantar este pacote sem antes confirmar que pertencem ao mesmo projeto e que ainda são necessários.

## PIN administrativo

Nunca colocar o PIN em arquivo do GitHub.

Depois de instalar `AdminCoreV1.gs`, executar manualmente no editor do Apps Script:

`configurarAdminCoreV1(SEU_PIN_ATUAL)`

O valor é convertido para SHA-256 e salvo nas Script Properties. Não registrar o PIN em commit, comentário, log ou mensagem de chat.

Se o projeto atual ainda possui `ADMIN_PIN` ou `PIN_ADMIN`, o núcleo também possui migração compatível durante a validação do PIN.

## Nova implantação Web App

Após salvar os quatro módulos:

1. Criar **nova versão** da implantação Web App existente.
2. Manter as mesmas permissões de execução/acesso usadas pelo endpoint atual, salvo revisão explícita de segurança.
3. Não trocar o endpoint no frontend enquanto a nova implantação não estiver validada.

## Validação de identidade

A nova implantação só é considerada correta se as respostas incluírem:

`"releaseId":"20260807-estavel-v1"`

Verificar pelo menos:

- `?action=admin_status`
- `?action=painel_publico`

Se o `releaseId` não aparecer, a implantação não está executando o pacote correto.

## Gate crítico — agenda médica

A auditoria do endpoint anterior mostrou dias configurados com `active:false`. Portanto, validar o caminho de escrita inteiro:

1. Entrar no painel oficial de **Agendas e vagas**.
2. Abrir um dia da médica destinado a publicação.
3. Marcar **Publicar este dia**.
4. Informar data/horário/mensagem/vagas conforme o teste real desejado.
5. Salvar.
6. O painel deve reler a planilha sem exigir novo PIN.
7. Na releitura administrativa, `ATIVO` daquele registro precisa estar `true`.
8. Em `painel_publico`, o mesmo dia precisa aparecer como `"active":true`.
9. No Portal do Morador, ao escolher atendimento médico, o dia precisa aparecer.

Se qualquer passo divergir, não seguir para o merge do frontend.

## Gate crítico — nutricionista

Repetir o mesmo fluxo para um dia da nutricionista:

- checkbox publicado;
- `ATIVO=true` na releitura;
- `active:true` no payload público;
- agenda visível ao morador.

## Gate — profissionais extensíveis

Antes do merge para `main`:

1. Confirmar que o painel de Profissionais e serviços contém **Adicionar profissional**.
2. Preferencialmente testar com um cadastro controlado que não exista, ou validar o psicólogo existente sem duplicá-lo.
3. Um novo profissional deve gerar:
   - 1 profissional;
   - 1 serviço inicial;
   - 5 dias úteis de agenda inativos.
4. O cadastro repetido com o mesmo `requestId` não pode duplicar linhas.
5. Profissional ativo + serviço ativo deve aparecer no `painel_publico` e no Portal.

## Gate — recados e campanhas

Antes e depois do teste:

- conferir qualquer recado ativo existente;
- conferir qualquer campanha ativa existente;
- após salvar agenda/profissional, esses conteúdos não podem desaparecer da resposta pública por efeito colateral.

## Gate — desempenho dos painéis

Validar no aparelho real:

1. primeira abertura de cada um dos três painéis;
2. reabertura poucos segundos depois;
3. login;
4. recarregar dados sem fechar a aba;
5. simular uma falha temporária de rede e confirmar que a sessão não é apagada automaticamente.

Os painéis oficiais estabilizados são páginas diretas e não carregam mais uma segunda página `/teste-v1` nem usam `document.write`.

## Somente depois

Depois de todos os gates acima:

1. abrir/validar a integração da branch com `main`;
2. esperar o GitHub Pages concluir com sucesso;
3. confirmar que o Pages publicou exatamente o commit aprovado;
4. fazer smoke test final do Portal do Morador e dos três painéis.

Nenhuma etapa deve ser considerada concluída apenas porque o código foi mesclado. A versão só é concluída quando **Apps Script + GitHub Pages + comportamento real** apontam para a mesma release validada.
