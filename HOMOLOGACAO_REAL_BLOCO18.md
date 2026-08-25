# Bloco 18 — homologação final em iPhone e Android físicos

Data de abertura: 2026-08-24

## Regra de conclusão

Este bloco **não pode ser considerado concluído apenas por Playwright/WebKit**.

A matriz Chromium + Firefox + WebKit é a pré-homologação automatizada obrigatória. A conclusão do Bloco 18 exige também evidência de execução no Portal TACS atual em:

- um iPhone físico usando Safari e, quando aplicável, o Portal instalado na Tela de Início;
- um aparelho Android físico usando navegador/PWA compatível.

Até as duas execuções físicas serem confirmadas, o status deste arquivo permanece `PENDENTE_APARELHOS_FISICOS`.

## Status

- Pré-homologação automatizada: **PENDENTE DO GATE DESTA BRANCH**
- iPhone físico: **PENDENTE**
- Android físico: **PENDENTE**
- Status global: **PENDENTE_APARELHOS_FISICOS**

## Critérios obrigatórios no iPhone físico

1. Abrir o Portal TACS pelo endereço atual e confirmar que a interface aparece completa, sem tela quebrada ou versão antiga.
2. No Safari, antes de instalar, o fluxo de notificações deve orientar a adicionar o Portal à Tela de Início; não deve solicitar Push de forma indevida nessa etapa.
3. Abrir o Portal pelo ícone da Tela de Início e confirmar que a ativação de avisos pode ser executada pelo fluxo normal.
4. Abrir a Central Administrativa e entrar em cada painel administrativo disponível.
5. Voltar à Central e reabrir um painel já acessado: a tela deve reaparecer imediatamente, sem branco, spinner de reinicialização ou novo carregamento perceptível.
6. Repetir a navegação entre painéis várias vezes. O painel anterior deve preservar seu estado e posição útil; painéis inativos não podem interceptar toque.
7. Em painel longo, rolar até conteúdo abaixo da primeira tela e confirmar rolagem normal, sem sobreposição de outro painel.
8. Confirmar que dados local-first/snapshot aparecem quando disponíveis sem bloquear a abertura da interface enquanto a atualização remota ocorre em segundo plano.
9. Confirmar que nenhuma ação administrativa já funcional deixou de responder ao toque após as otimizações.
10. Confirmar que não existe vazamento visual ou de dados de outra área/TACS durante abertura, retorno ou atualização.

## Critérios obrigatórios no Android físico

1. Abrir o Portal TACS pelo endereço atual e confirmar interface completa e responsiva.
2. Em aparelho novo, o fluxo deve oferecer **Ativar avisos** e permitir a autorização antes de exigir instalação do app/PWA.
3. Após autorização, confirmar que o Portal reconhece o aparelho como inscrito e não repete indevidamente o onboarding.
4. Abrir a Central Administrativa e alternar entre os painéis disponíveis.
5. Voltar a um painel já aberto: a resposta deve ser imediata e o painel não deve reinicializar.
6. Rolar painéis longos e confirmar que somente o painel ativo recebe toque.
7. Repetir rapidamente: painel A → Central → painel B → Central → painel A. O painel A deve continuar pronto.
8. Confirmar que atualização de dados em segundo plano não bloqueia a navegação.
9. Confirmar que ações existentes continuam funcionais e que nenhuma otimização alterou regras de agenda, moradores, família, Push ou território.
10. Confirmar ausência de mistura de área/TACS durante todo o percurso.

## Escrita crítica — validação física

Em teste controlado de odontologia, quando houver uma vaga de teste apropriada:

- tocar na vaga não deve criar sucesso visual antes da confirmação do servidor;
- o envio deve permanecer bloqueado enquanto a confirmação estiver pendente;
- após confirmação, a quantidade exibida deve refletir a resposta do servidor;
- uma retentativa de rede não pode gerar abatimento duplicado.

Não executar esse item em vaga real de morador apenas para homologação se isso puder consumir atendimento real.

## Identificação e família — validação física

Em dados de teste apropriados:

- CPF/CNS de uma área não pode carregar morador de outra área;
- aparelho novo sem contexto familiar não pode revelar integrantes da família a partir de documento desconhecido;
- selecionar outro beneficiário da mesma família não pode trocar a identidade Push do aparelho;
- documento novo só pode ser associado ao integrante escolhido e nunca substituir documento existente automaticamente.

## Evidência mínima aceita para fechar o bloco

Para cada plataforma física, registrar:

- plataforma e navegador;
- data do teste;
- resultado dos critérios (`APROVADO` ou item que falhou);
- evidência observável, preferencialmente gravação de tela curta do percurso Central → painel A → Central → painel B → Central → painel A e do onboarding Push correspondente.

A evidência não precisa conter CPF, CNS, PIN, token ou dados pessoais reais. Esses dados devem permanecer fora da gravação sempre que possível.

## Condição final

Somente após:

1. gate automatizado integral verde;
2. Chromium verde;
3. Firefox verde;
4. WebKit verde;
5. iPhone físico aprovado;
6. Android físico aprovado;

este documento poderá mudar para `CONCLUIDO` e o plano de 18 blocos será considerado encerrado.
