# Registro — Ciclo de carregamento dos painéis

Data: 13/09/2026

## Escopo autorizado
Correção limitada ao carregamento das informações internas dos painéis administrativos e aos avisos de carregamento que permaneciam visíveis depois que os dados já estavam desenhados.

Não foram alterados: layout funcional dos painéis, permissões, PIN, perfis, cadastro, regras de UBS, regras de TACS, agendas/vagas, dados de moradores, regras de gravação ou backend Apps Script.

## Diagnóstico
O fluxo local-first já exibia o último snapshot confirmado para reduzir a espera. Porém, em vários módulos, o mesmo callback que desenhava esse snapshot mantinha a mensagem `Aguarde enquanto os dados carregam…` até a confirmação remota terminar.

Também existia um intervalo entre o toque no painel e a montagem dos módulos nativos em que o shell ocultava seu próprio estado de abertura. Nesse intervalo, o usuário podia ver somente o fundo do aplicativo.

## Bloco isolado
Marcador principal: `CORRECAO_CIRURGICA_LOADER_SHELL_20260913_V2`.

Fluxo corrigido:
`toque no painel → aviso curto de abertura somente enquanto o módulo ainda não montou → snapshot/dados aparecem → aviso de carregamento é encerrado → confirmação remota continua em segundo plano → escrita permanece bloqueada até confirmação real`.

Regras:
- se ainda não existe conteúdo para mostrar, o aviso `Aguarde enquanto os dados carregam…` continua permitido;
- se um snapshot válido já foi desenhado, o painel não permanece visualmente em estado de carregamento;
- falha temporária não apaga o conteúdo confirmado que já está visível;
- confirmação remota continua obrigatória para habilitar escrita;
- mensagens de erro e mensagens de salvamento não são ocultadas por esta correção;
- nenhuma alteração em backend ou modelo de dados.

## Painéis abrangidos
- Agendas e vagas;
- Moradores;
- Profissionais e serviços;
- Recados e campanhas;
- Suporte aos moradores;
- Organizações e municípios;
- shell comum de abertura dos painéis.

TACS e áreas foi conferido e já encerrava `territoryLoading` quando cache ou resposta eram aplicados; sua lógica não foi modificada.

## Cache do iPhone/Safari
As referências de carregamento foram renovadas para `20260913-loading-lifecycle-v2` para impedir reutilização da versão anterior dos scripts alterados.

## Validação interna
- sintaxe do JavaScript principal da Central: válida;
- sintaxe dos módulos nativos de Agendas, Moradores e Profissionais: válida;
- sintaxe do transporte de Moradores: válida;
- scripts inline de Recados/Campanhas, Suporte e Organizações/Municípios: válidos;
- marcadores e referências da correção permaneceram presentes após os workflows automáticos do repositório;
- service worker do projeto permanece desabilitado/desregistrado e não mantém cache próprio antigo.

O workflow geral `Testar desempenho v101` continua acusando um gate antigo da Tarefa 14 por procurar uma expressão de reset de sessão anterior à inclusão de UBS; essa falha não foi criada por este bloco e não foi alterada nesta correção.

## Estado
**PUBLICADA PARA TESTE NO DISPOSITIVO.**

Não marcar como concluída operacionalmente até o usuário testar os painéis no iPhone e confirmar que:
1. o painel não fica em tela vazia durante a montagem;
2. a mensagem de carregamento desaparece quando os dados aparecem;
3. erros e operações de gravação continuam exibindo seus estados normalmente.

## Correção isolada V2 — mensagem residual no painel Moradores
Marcador: `CORRECAO_CIRURGICA_LOADER_MORADORES_20260913_V2`.

Motivo: no iPhone/Safari, a mensagem `Aguarde enquanto os dados carregam...` ainda podia permanecer visível mesmo depois de o snapshot de Moradores já estar desenhado.

Ramo isolado:
`snapshot de Moradores visível → limpar somente loginStatus/operationStatus quando ainda contiverem a mensagem de carregamento → manter dados, permissões e demais estados intactos`.

Alterações limitadas a:
- esconder explicitamente o status residual quando o snapshot já está visível;
- aceitar tanto reticências `...` quanto o caractere `…`;
- repetir a limpeza por 120 ms para eliminar uma reescrita tardia do mesmo aviso;
- renovar apenas as referências de cache do módulo Moradores até a Central.

Não foram alterados: backend, dados, PIN, perfis, UBS, permissões, cadastro, busca, edição, consolidação, layout dos demais painéis ou regras de negócio.

Validação interna:
- sintaxe de `painel-moradores-transport-v2.js`: válida;
- sintaxe de `conecta-moradores-native-v1.js`: válida;
- sintaxe de `central-administrativa-tacs.js`: válida.

Estado: **PUBLICADA PARA TESTE NO DISPOSITIVO — confirmação do usuário ainda pendente.**
