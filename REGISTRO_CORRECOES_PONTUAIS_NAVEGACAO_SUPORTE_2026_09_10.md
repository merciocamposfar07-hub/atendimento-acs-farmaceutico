# Registro — Correções pontuais de navegação, suporte e rodapé

Data: 10/09/2026

## Escopo autorizado

Somente as correções pontuais solicitadas pelo usuário, preservando o restante da aplicação.

## Aplicado em sequência

1. **Diagnóstico dos aparelhos**
   - diagnóstico passa a ser exibido dentro de Suporte aos moradores, por acionamento da aba;
   - rota legada de diagnóstico redireciona para a aba integrada;
   - cards de diagnóstico usam o mesmo azul-petróleo da plataforma;
   - o rótulo permanente “Reparo já solicitado” não é mais usado;
   - o estado passa a refletir a fase real: aguardando Portal, detectado, automático em andamento, ação do morador, travado/retomada ou concluído.

2. **Agendas e vagas**
   - sessão da Central é reutilizada;
   - mensagem de segundo PIN fica oculta quando a sessão já existe;
   - botão legado “Atualizar página” do rodapé não faz parte da interface.

3. **Vínculo área/município**
   - após confirmação real do servidor, o botão muda para **“Vínculo salvo”**;
   - ao alterar novamente o município, retorna para “Salvar vínculo”.

4. **Navegação rápida da Central**
   - segundo botão: **Prontuários**, abrindo diretamente o painel de moradores com seletor das áreas disponíveis;
   - sino: **Pendências**, abrindo a visão própria de pendências de moradores e diagnóstico do sistema;
   - Perfil: visão de administradores/TACS disponíveis no contexto e troca rápida de área pelo TACS.

5. **Rodapé institucional**
   - frase: **Conecta Saúde Comunitária - tecnologia aproximando pessoas, serviços e comunidade.**
   - ciclo da plataforma: **Conecta Saúde Comunitária — Plataforma 2026/2027**.

## Validação técnica

O workflow `Aplicar UI App4 canônica aos painéis administrativos` foi executado após os ajustes e concluiu com sucesso. Os testes cobrem diagnóstico inline, ausência do segundo PIN em Agendas, confirmação “Vínculo salvo”, Prontuários, Pendências, Perfil, rodapé e trava de Recados/Campanhas.

A homologação visual e funcional final permanece pendente do teste do usuário no iPhone.
