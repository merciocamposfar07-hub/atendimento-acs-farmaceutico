# Registro — Atalho do Portal TACS sem tela azul

Data: 13/09/2026

## Escopo autorizado
Correção limitada ao atalho **Portal do Morador / Portal TACS** aberto a partir da Central Administrativa.

Não foram alterados os demais painéis, permissões, PIN, UBS, TACS, Moradores, agendas, profissionais, serviços, notificações, regras de gravação ou backend Apps Script.

## Diagnóstico
No iPhone, ao tocar no atalho do Portal TACS, a Central colocava a rota pública dentro do viewer genérico de painéis. Esse viewer escondia o iframe até considerá-lo pronto. Ao mesmo tempo, o contrato visual da Central ocultava o aviso de abertura do viewer. Durante esse estado, sobrava apenas o fundo azul-petróleo, sem o conteúdo do Portal.

O Portal TACS é uma página pública completa e não precisa passar pelo mesmo ciclo de hidratação dos painéis administrativos.

## Bloco isolado
Marcador: `CORRECAO_CIRURGICA_ATALHO_PORTAL_TACS_20260913_V1`.

Fluxo corrigido:
`Central Administrativa → tocar Portal do Morador / Portal TACS → salvar URL atual da Central → navegar diretamente para o Portal público real com área selecionada e from=central → Portal TACS visível → Voltar à Central retorna à URL administrativa salva`.

Regras:
- o Portal TACS não usa mais `ensureShellFrame('portal', ...)`;
- o Portal TACS não usa mais `showShellFrame('portal', ...)`;
- a navegação utiliza a rota pública real na mesma aba;
- a sessão administrativa permanece em `sessionStorage`;
- a URL atual da Central é preservada em `portalTacsCentralReturnUrlV1`;
- o botão existente `Voltar à Central` continua sendo o mecanismo de retorno;
- nenhum outro módulo foi alterado.

## Validação interna
- sintaxe de `central-administrativa-tacs.js`: válida;
- marcador da correção: presente;
- `showPortalTacs` não chama mais o viewer genérico;
- URL de retorno administrativo é salva antes da navegação;
- rota pública recebe `from=central`;
- versão de navegação: `20260913-portal-shortcut-v1`.

## Estado
**PUBLICADA PARA TESTE NO DISPOSITIVO.**

Não marcar como concluída operacionalmente até o usuário confirmar no iPhone que o atalho mostra o Portal TACS e que o retorno volta à Central autenticada.
