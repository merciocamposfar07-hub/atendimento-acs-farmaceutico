/*
 * COMUNICADOS DO TACS - TÉCNICO AGENTE COMUNITÁRIO DE SAÚDE
 * UNIDADE DE SAÚDE POSTO MATIAS - SÍTIO JAPARANDUBA
 *
 * Este arquivo continua provisório até a integração com o Google Apps Script.
 * Não coloque dados pessoais de moradores neste arquivo.
 */
window.PORTAL_TACS_AVISOS = {
  versao: '2026-07-25-03',
  area: 'Sítio Japaranduba - Unidade de Saúde Posto Matias',
  atualizadoEm: '',

  atendimentoMedico: {
    ativo: false,
    situacao: 'aguardando',
    titulo: 'Dia de atendimento médico',
    data: '',
    horario: '',
    observacao: ''
  },

  avisos: []
};

(function () {
  'use strict';

  if (window.__TACS_POSTO_MATIAS_APLICADO__) return;
  window.__TACS_POSTO_MATIAS_APLICADO__ = true;

  var FULL_NAME = 'TACS - Técnico Agente Comunitário de Saúde';
  var UNIT = 'Unidade de Saúde Posto Matias';

  function hide(element) {
    if (element) {
      element.hidden = true;
      element.style.display = 'none';
      element.setAttribute('aria-hidden', 'true');
    }
  }

  function setText(selector, text) {
    var element = document.querySelector(selector);
    if (element) element.textContent = text;
  }

  function applyIdentity() {
    document.title = FULL_NAME + ' - ' + UNIT;

    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', 'Portal comunitário do ' + FULL_NAME + ', vinculado à ' + UNIT + ', para moradores do Sítio Japaranduba - Chã Grande/PE.');

    hide(document.getElementById('openPharma'));
    hide(document.getElementById('pharma'));
    hide(document.getElementById('pix'));
    hide(document.getElementById('success'));

    var choiceGrid = document.querySelector('.choice-grid');
    if (choiceGrid) choiceGrid.style.gridTemplateColumns = 'minmax(0, 1fr)';

    var brandStrong = document.querySelector('.brand strong');
    var brandSmall = document.querySelector('.brand small');
    var professionalId = document.querySelector('.brand .professional-id');
    if (brandStrong) brandStrong.textContent = FULL_NAME;
    if (brandSmall) brandSmall.textContent = UNIT + ' - Sítio Japaranduba';
    hide(professionalId);

    setText('#pageTitle', 'Serviços da Unidade de Saúde Posto Matias');
    var heroParagraph = document.querySelector('.hero-copy p');
    if (heroParagraph) heroParagraph.textContent = 'Canal comunitário do ' + FULL_NAME + ' para moradores do Sítio Japaranduba.';

    var acsCard = document.getElementById('openAcs');
    if (acsCard) {
      var meta = acsCard.querySelector('.choice-meta b');
      var detail = acsCard.querySelector('.choice-meta-detail');
      var title = acsCard.querySelector('.choice-content > strong');
      var small = acsCard.querySelector('.choice-content > small');
      if (meta) meta.textContent = FULL_NAME;
      if (detail) detail.textContent = UNIT + ' - atendimento gratuito das 08h às 16h';
      if (title) title.textContent = 'Solicitar serviço da Unidade de Saúde Posto Matias';
      if (small) small.textContent = 'Dentista, vacinação, atendimento médico, nutricionista, visita, cadastro, Implanon e outros serviços da unidade.';
    }

    setText('#acsTitle', 'Atendimento do ' + FULL_NAME);
    setText('#acs .step', FULL_NAME + ' - gratuito');

    var headingParagraph = document.querySelector('#acs .section-heading p');
    if (headingParagraph) headingParagraph.textContent = UNIT + ' - de segunda a sexta-feira, das 08h às 16h.';

    var territory = document.querySelector('#acs .territory-note');
    if (territory) territory.innerHTML = '<strong>Área atendida:</strong> moradores da zona rural do Sítio Japaranduba - Chã Grande/PE.<br><strong>Unidade de referência:</strong> ' + UNIT + '.';

    var schedule = document.getElementById('acsSchedule');
    if (schedule) {
      var updateScheduleCopy = function () {
        var outside = schedule.classList.contains('amber-strip');
        schedule.innerHTML = outside
          ? '<strong>Você está escrevendo fora do horário do ' + FULL_NAME + '.</strong> A mensagem será respondida no próximo expediente, das 08h às 16h.<br><strong>Este canal é exclusivo para serviços da ' + UNIT + '.</strong>'
          : '<strong>Atendimento gratuito do ' + FULL_NAME + '.</strong> Este canal é exclusivo para solicitações e informações relacionadas aos serviços da ' + UNIT + '.';
      };
      updateScheduleCopy();
      new MutationObserver(function () { updateScheduleCopy(); }).observe(schedule, { attributes: true, attributeFilter: ['class'] });
    }

    var categoryLabel = document.querySelector('.acs-category');
    if (categoryLabel && categoryLabel.firstChild) categoryLabel.firstChild.nodeValue = 'Tipo de serviço da ' + UNIT + ' ';

    var cpfHelp = document.getElementById('acsCpfStatus');
    if (cpfHelp && !cpfHelp.classList.contains('valid') && !cpfHelp.classList.contains('invalid')) cpfHelp.textContent = 'CPF para identificação na ' + UNIT;

    var privacy = document.querySelector('.acs-privacy-note');
    if (privacy) privacy.textContent = 'Nome, data de nascimento, idade e CPF serão enviados pelo WhatsApp para identificação na ' + UNIT + ' e não ficam armazenados neste portal.';

    var routing = document.getElementById('acsRoutingAlert');
    if (routing) {
      routing.innerHTML = '<strong>Este assunto não pertence ao serviço do ' + FULL_NAME + '.</strong><p>Orientações sobre medicamentos, receitas, exames, suplementos ou manipulados devem ser solicitadas no portal separado de atendimento farmacêutico e suplementação. Esse atendimento particular não está disponível nesta página.</p>';
    }

    var sendButton = document.getElementById('sendAcs');
    if (sendButton) sendButton.innerHTML = 'Enviar solicitação à ' + UNIT + ' pelo WhatsApp <span aria-hidden="true">→</span>';

    var footer = document.querySelector('footer');
    if (footer) footer.innerHTML = '<span>' + FULL_NAME + '</span><span>' + UNIT + ' - Sítio Japaranduba</span>';

    var config = window.PORTAL_TACS_AVISOS || {};
    var hasMedical = Boolean(config.atendimentoMedico && config.atendimentoMedico.ativo !== false && (config.atendimentoMedico.data || config.atendimentoMedico.horario || config.atendimentoMedico.observacao));
    var hasNotices = Array.isArray(config.avisos) && config.avisos.some(function (item) { return item && item.ativo !== false; });
    window.setTimeout(function () {
      var board = document.getElementById('tacsNoticeBoard');
      if (board && !hasMedical && !hasNotices) hide(board);
    }, 80);
  }

  function addHighVisibilityStyles() {
    if (document.getElementById('tacsHighVisibilityStyles')) return;
    var style = document.createElement('style');
    style.id = 'tacsHighVisibilityStyles';
    style.textContent = [
      'html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}',
      'body{font-size:17px;line-height:1.6}',
      '.page-wrap{width:min(calc(100% - 24px),900px)}',
      '.panel{max-width:800px;border-width:2px;box-shadow:0 22px 58px rgba(21,51,45,.12)}',
      '.section-heading h1{font-size:clamp(30px,5.8vw,42px);line-height:1.12}',
      '.section-heading p,.info-strip,.territory-note{font-size:clamp(16px,2.6vw,19px);line-height:1.65}',
      '.form-grid label,.select-label,.acs-category{font-size:18px;line-height:1.45}',
      'input,textarea,select{font-size:18px;min-height:58px;border-width:2px;background:#fff}',
      'textarea{min-height:132px}',
      '.identity-status,.acs-privacy-note,.field-help{font-size:14px;line-height:1.5}',
      '.primary-button{min-height:62px;font-size:18px;border-radius:16px}',
      '.choice-content strong{font-size:clamp(22px,4vw,29px);line-height:1.25}',
      '.choice-content small,.choice-meta-detail,.territory-inline{font-size:16px;line-height:1.6}',
      '.choice-card{border-width:2px;min-height:210px}',
      '#openPharma,#pharma,#pix,#success{display:none!important}',
      '.technical-code{display:none!important}',
      '@media(max-width:680px){body{font-size:17px}.page-wrap{width:calc(100% - 16px)}.panel{padding:24px 20px}.brand-bar{min-height:118px}.brand strong{font-size:15px!important}.brand small{font-size:13px!important}.choice-card{padding:22px 18px}.form-grid{gap:20px}.panel-top .step{max-width:78%;font-size:11px}.section-heading h1{font-size:31px}}',
      '@media(min-resolution:2dppx){html{-webkit-font-smoothing:antialiased}}'
    ].join('');
    document.head.appendChild(style);
  }

  addHighVisibilityStyles();
  applyIdentity();
}());