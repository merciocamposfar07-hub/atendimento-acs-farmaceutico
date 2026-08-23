from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'portal-ajustes-finais.js'
s = path.read_text(encoding='utf-8')

old = """  function fixNotificationInstructions() {
    var offer = el('notificationOffer');
    if (!offer || offer.querySelector('.notification-guide-all')) return;
    var guide = document.createElement('div');
    guide.className = 'notification-guide-all';
    guide.innerHTML =
      '<strong>Como configurar no celular</strong>' +
      '<p><b>iPhone:</b> abra no Safari → Compartilhar → Adicionar à Tela de Início → abra pelo novo ícone → toque em ativar avisos.</p>' +
      '<p><b>Android:</b> abra no Chrome → menu ⋮ → Instalar app ou Adicionar à tela inicial → abra o portal → permita as notificações.</p>';
    offer.appendChild(guide);
  }
"""

new = """  function notificationPlatform() {
    var ua = String(navigator.userAgent || '');
    var ios = /iPhone|iPad|iPod/i.test(ua);
    var android = /Android/i.test(ua);
    var standalone = Boolean(
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
    return { ios: ios, android: android, standalone: standalone };
  }

  function notificationGuideHtml(platform) {
    if (platform.ios && !platform.standalone) {
      return '<strong>iPhone — adicione o Portal à Tela de Início primeiro</strong>' +
        '<p><b>1.</b> Abra esta página no Safari.</p>' +
        '<p><b>2.</b> Toque em Compartilhar.</p>' +
        '<p><b>3.</b> Toque em Adicionar à Tela de Início e confirme.</p>' +
        '<p><b>4.</b> Feche esta página e abra o Portal TACS pelo novo ícone.</p>' +
        '<p><b>5.</b> No Portal aberto pelo ícone, role até esta seção, toque em “Ativar avisos neste aparelho” e depois em “Permitir”.</p>' +
        '<p>Enquanto o Portal estiver aberto somente no Safari, ele não tentará pedir a permissão de notificações.</p>';
    }
    if (platform.ios) {
      return '<strong>iPhone — ative os avisos neste aparelho</strong>' +
        '<p><b>1.</b> Você já está no Portal aberto pela Tela de Início.</p>' +
        '<p><b>2.</b> Role até a seção “Receber recados e avisos da Unidade”.</p>' +
        '<p><b>3.</b> Toque em “Ativar avisos neste aparelho” e depois em “Permitir”.</p>';
    }
    if (platform.android) {
      return '<strong>Android — ative os avisos primeiro</strong>' +
        '<p><b>1.</b> No Portal aberto no navegador, role até a seção “Receber recados e avisos da Unidade”.</p>' +
        '<p><b>2.</b> Toque em “Ativar avisos neste aparelho”.</p>' +
        '<p><b>3.</b> Quando o Android perguntar, toque em “Permitir”.</p>' +
        '<p>Pronto: os avisos podem ser ativados antes de instalar o Portal. Se quiser o ícone na tela depois, use o menu ⋮ do navegador → “Instalar app” ou “Adicionar à tela inicial”.</p>';
    }
    return '<strong>Ative os avisos neste aparelho</strong>' +
      '<p>Role até esta seção, toque em “Ativar avisos neste aparelho” e autorize as notificações quando o navegador solicitar.</p>';
  }

  function syncNotificationGuide(guide) {
    if (!guide) return;
    var status = el('notificationStatus');
    var text = normalize(status && status.textContent);
    var active = text.indexOf('avisos ativados neste aparelho') !== -1;
    var checking = text.indexOf('verificando este aparelho') !== -1 || text.indexOf('confirmando a inscricao') !== -1;
    guide.hidden = active || checking;
    if (!guide.hidden) guide.innerHTML = notificationGuideHtml(notificationPlatform());
  }

  function fixNotificationInstructions() {
    var offer = el('notificationOffer');
    if (!offer) return;
    var guide = offer.querySelector('.notification-guide-all');
    if (!guide) {
      guide = document.createElement('div');
      guide.className = 'notification-guide-all';
      guide.hidden = true;
      offer.appendChild(guide);
    }
    syncNotificationGuide(guide);
    var status = el('notificationStatus');
    if (status && status.dataset.portalTacsGuideObserver !== '1') {
      status.dataset.portalTacsGuideObserver = '1';
      new MutationObserver(function () { syncNotificationGuide(guide); }).observe(status, { childList: true, characterData: true, subtree: true });
    }
  }
"""

if old in s:
    s = s.replace(old, new, 1)
elif 'function notificationPlatform()' not in s or 'Android — ative os avisos primeiro' not in s:
    raise SystemExit('Bloco 6: marcador original de instruções não encontrado')

path.write_text(s, encoding='utf-8')
print('BLOCO6_PUSH_ONBOARDING_APLICADO_OK')
