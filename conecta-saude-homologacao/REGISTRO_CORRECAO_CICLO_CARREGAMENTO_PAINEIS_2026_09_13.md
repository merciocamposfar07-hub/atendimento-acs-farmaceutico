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


## Correção isolada V3 — tela azul vazia durante a montagem
Marcador: `CORRECAO_CIRURGICA_LOADER_SHELL_VISIVEL_20260913_V3`.

### Evidência no dispositivo
Dois registros em vídeo de 13/09/2026 confirmaram o mesmo comportamento em rotas diferentes:
- ao abrir **Pendências da área**, o shell permanecia apenas com o fundo azul por vários segundos antes da interface aparecer;
- ao abrir **Prontuários / Moradores**, o mesmo fundo azul permanecia visível durante a montagem do painel.

### Diagnóstico
O JavaScript do shell já executava corretamente:
`setShellOpening(..., true) → remover hidden → escrever "Aguarde enquanto os dados carregam…"`.

Entretanto, a camada visual canônica da Central continha a regra global:
`#cscModuleOpening { display:none!important; }`.

Essa regra anulava a abertura solicitada pelo JavaScript. O viewer era exibido, porém o único elemento destinado a representar a transição continuava invisível; por isso o usuário via somente `#071827` até o painel terminar de montar.

### Correção
A regra incondicional foi substituída por controle explícito de estado:
- `#cscModuleOpening[hidden]` permanece invisível;
- `#cscModuleOpening:not([hidden])` fica visível;
- o JavaScript existente continua sendo a autoridade para iniciar e encerrar o ciclo.

Fluxo:
`toque no painel → shell visível → aviso de carregamento visível imediatamente → interface do painel monta → aviso some → sincronização dos dados continua conforme o módulo`.

### Escopo
Correção restrita ao **shell visual comum de abertura dos painéis**.

Não foram alterados:
- backend Apps Script;
- consultas, cache de dados ou otimização de backend;
- PIN, sessão ou reconhecimento de aparelho;
- permissões;
- regras de UBS/TACS/Morador/Administrador;
- vagas, agendas, profissionais, moradores ou gravações;
- layout funcional interno dos painéis.

Como o defeito estava no shell compartilhado, a correção se aplica às rotas administrativas que usam esse shell sem implementar otimização nova em cada perfil.

### Publicação
- commit funcional: `ffa72697b1a9a64c19ce2282f4d0b2eeb63b3281`.

### Estado
**PUBLICADA PARA TESTE NO DISPOSITIVO — validação real do usuário pendente.**

Não marcar como concluída operacionalmente até confirmar no iPhone que, ao tocar em diferentes painéis, não existe mais intervalo de tela azul vazia.
