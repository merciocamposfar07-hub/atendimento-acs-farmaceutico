# Registro canônico — Correção de apresentação dos painéis e WhatsApp

Data: 12/09/2026

## Escopo

Correção exclusivamente de apresentação visual e restauração de controles de compartilhamento já existentes.

Não altera:
- sessão;
- PIN;
- permissões;
- áreas;
- regras de vagas;
- gravações;
- backend;
- Apps Script.

## Regras canônicas restauradas

1. **Sem botão flutuante “Atualizar página”**
   - O botão flutuante inferior não faz parte do padrão aprovado da Central.
   - O controle foi removido de `central-tacs-login-rapido-v1.js`.

2. **Cabeçalho no fluxo normal da página**
   - O cabeçalho App4 não é `position:sticky` nem `position:fixed`.
   - Ao rolar a tela, ele sobe junto com o conteúdo.
   - Não existe barra superior fixa criada pela migração.

3. **Tela única sem divisão estrutural de cor**
   - Fundo estrutural contínuo `#071827`.
   - Cabeçalho, corpo e rodapé não criam faixas estruturais de cores diferentes.
   - Cards internos podem manter contraste funcional, mas a página não pode ser dividida em blocos estruturais de fundo diferentes.

4. **Cabeçalho obrigatório em todos os painéis**
   - ícone oficial canônico do Conecta Saúde Comunitária;
   - marca `CONECTA SAÚDE COMUNITÁRIA`;
   - descrição/título específico do painel;
   - retorno único à Central no padrão App4.

5. **Rodapé obrigatório em todos os painéis**
   - `Conecta Saúde Comunitária — tecnologia para tornar o acesso à saúde comunitária mais simples, organizado e acessível.`
   - `Plataforma institucional de saúde comunitária.`

6. **Agendas dos profissionais**
   - botão por agenda: `📲 Postar no Status do WhatsApp`;
   - botão por profissional: `📲 Postar agenda completa no Status do WhatsApp`;
   - geração dos cards utiliza o ícone oficial canônico do Conecta;
   - nenhuma lógica de salvar agenda foi alterada.

7. **Recados e campanhas**
   - Recados mantêm `Postar recado no Status do WhatsApp`;
   - Campanhas mantêm publicação no Status do WhatsApp;
   - card individual e card mensal usam o ícone oficial canônico do Conecta.

## Arquivos de apresentação envolvidos

- `central-tacs-login-rapido-v1.js`
- `central-administrativa-tacs.html`
- `central-administrativa-tacs.js`
- `admin-ui-standard.inline.css`
- `conecta-agendas-native-v1.js`
- `agenda-whatsapp-card-v1.js`
- `recados-campanhas-whatsapp-card-v9.js`
- `recados-campanhas-whatsapp-mensal-v12.js`
- painéis oficiais de Agendas e Recados/Campanhas.

## Gate de regressão

`APRESENTACAO_PAINEIS_WHATSAPP_OK`

Teste:
`scripts/test_apresentacao_paineis_whatsapp_v1.js`

O gate exige:
- ausência do botão flutuante `Atualizar página`;
- cabeçalho App4 não sticky/fixed;
- ícone oficial no cabeçalho;
- rodapé institucional;
- ausência de sticky/fixed nos módulos nativos;
- WhatsApp Status em Agendas;
- WhatsApp Status em Recados/Campanhas;
- ícone oficial nos cards gerados;
- preservação das Tarefas 16, 17 e 18.

## Validação

Workflow oficial:
- run `34735145289`
- resultado: `success`

GitHub Pages:
- run `34735139837`
- resultado: `success`

Backend:
- não alterado;
- Apps Script permanece versão `208`.

## Estado

**CORREÇÃO DE APRESENTAÇÃO E WHATSAPP VALIDADA E PUBLICADA.**

Esta correção não cria nova tarefa e não altera a sequência original 1–18.
