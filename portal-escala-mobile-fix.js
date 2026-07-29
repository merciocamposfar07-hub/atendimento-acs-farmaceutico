(function () {
  'use strict';

  if (document.getElementById('portal-escala-mobile-fix')) return;

  var style = document.createElement('style');
  style.id = 'portal-escala-mobile-fix';
  style.textContent = `
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }

    *, *::before, *::after {
      box-sizing: border-box !important;
      max-width: 100%;
    }

    .wrap, .app, .container, main, form, .card, .full,
    .nurse-agenda, .dental-public, #nurseSchedule,
    #dentalPublicSchedule, #subjectField, textarea, input, select {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }

    .nurse-agenda, .dental-public {
      padding: 20px 16px !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      overflow: hidden !important;
    }

    .nurse-agenda small, .dental-public small {
      font-size: 18px !important;
      line-height: 1.3 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }

    .nurse-agenda h3, .dental-public h3 {
      font-size: 32px !important;
      line-height: 1.12 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }

    .nurse-agenda > p, .dental-public > p,
    .nurse-status, .dental-public-status {
      font-size: 19px !important;
      line-height: 1.5 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }

    .nurse-days, .dental-public-days {
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 14px !important;
      width: 100% !important;
      overflow: visible !important;
      padding: 0 !important;
    }

    .nurse-day, .dental-public-day {
      display: block !important;
      width: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      padding: 18px !important;
      scroll-snap-align: none !important;
      white-space: normal !important;
      overflow: hidden !important;
      text-align: left !important;
    }

    .nurse-day strong, .dental-public-day strong {
      font-size: 24px !important;
      line-height: 1.25 !important;
      overflow-wrap: anywhere !important;
    }

    .nurse-day span {
      font-size: 30px !important;
      line-height: 1.2 !important;
    }

    .nurse-day b,
    .dental-public-day .service,
    .dental-public-day .common,
    .dental-public-day .emergency,
    .dental-public-day .closed {
      font-size: 20px !important;
      line-height: 1.4 !important;
      overflow-wrap: anywhere !important;
    }

    .dental-public-day .date,
    .dental-public-day .extra {
      font-size: 18px !important;
      line-height: 1.35 !important;
      overflow-wrap: anywhere !important;
    }

    textarea, input, select, button {
      max-width: 100% !important;
    }

    textarea {
      overflow-wrap: anywhere !important;
    }

    @media (max-width: 430px) {
      .nurse-agenda, .dental-public {
        padding: 18px 14px !important;
        border-radius: 18px !important;
      }

      .nurse-agenda h3, .dental-public h3 {
        font-size: 29px !important;
      }

      .nurse-day strong, .dental-public-day strong {
        font-size: 22px !important;
      }

      .nurse-day b,
      .dental-public-day .service,
      .dental-public-day .common,
      .dental-public-day .emergency,
      .dental-public-day .closed {
        font-size: 19px !important;
      }
    }
  `;

  document.head.appendChild(style);
}());
