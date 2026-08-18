from pathlib import Path

agenda = Path('agenda-enfermeira.js')
index = Path('index.html')

js = agenda.read_text(encoding='utf-8')
html = index.read_text(encoding='utf-8')

old = """    if (isIos() && !isStandalone()) {
      status.textContent =
        'No iPhone, adicione primeiro o Portal TACS à Tela de Início.';
      help.textContent =
        'Safari → Compartilhar → Adicionar à Tela de Início. Depois abra pelo ícone e volte a este botão.';
      button.textContent = 'Ver instruções para iPhone';
      button.addEventListener('click', function () {
        help.textContent =
          'No Safari: toque no botão Compartilhar, escolha “Adicionar à Tela de Início”, confirme em Adicionar e abra o portal pelo novo ícone.';
      });
      return;
    }
"""

new = """    if (isIos() && !isStandalone()) {
      status.textContent =
        'Ative os avisos neste aparelho para receber recados, campanhas e alterações de agenda.';
      help.textContent =
        'No iPhone, a ativação é concluída pelo Portal TACS aberto a partir do ícone da Tela de Início.';
      button.textContent = 'Ativar avisos neste aparelho';
      button.addEventListener('click', function () {
        status.textContent =
          'Para ativar os avisos no iPhone, abra o Portal TACS pelo ícone da Tela de Início.';
        help.textContent =
          'Compartilhar → Adicionar à Tela de Início → abra o Portal TACS pelo novo ícone → toque novamente em “Ativar avisos neste aparelho”.';
      });
      return;
    }
"""

if old not in js:
    raise SystemExit('Bloco iOS de notificações não encontrado; nenhuma alteração aplicada.')

js = js.replace(old, new, 1)

old_src = 'agenda-enfermeira.js?v=20260814-receipt-v110'
new_src = 'agenda-enfermeira.js?v=20260818-notif-all-devices-v1'
if old_src not in html:
    raise SystemExit('Versão atual de agenda-enfermeira.js não encontrada no index.html.')
html = html.replace(old_src, new_src, 1)

# Validações de escopo e preservação funcional.
assert "button.textContent = 'Ativar avisos neste aparelho';" in js
assert "Ver instruções para iPhone" not in js
assert 'await OneSignal.Notifications.requestPermission();' in js
assert "typeof push.optIn === 'function'" in js
assert 'window.OneSignalDeferred' in js
assert 'notificationRepairButton' in js
assert new_src in html

agenda.write_text(js, encoding='utf-8')
index.write_text(html, encoding='utf-8')
print('Correção do botão de ativação de notificações preparada com sucesso.')
