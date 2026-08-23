'use strict';
// Bloco 6: contrato permanente de onboarding Push por plataforma.
const fs=require('fs');
const assert=require('assert');

const ajustes=fs.readFileSync('portal-ajustes-finais.js','utf8');
const agenda=fs.readFileSync('agenda-enfermeira.js','utf8');
const worker=fs.readFileSync('service-worker.js','utf8');
const pushWorker=fs.readFileSync('push/OneSignalSDKWorker.js','utf8');

assert(ajustes.includes('function notificationPlatform()'),'Onboarding deve detectar apenas a plataforma/standalone do navegador');
assert(ajustes.includes('Android — ative os avisos primeiro'),'Android deve orientar ativação antes da instalação');
assert(ajustes.includes('os avisos podem ser ativados antes de instalar o Portal'),'Android não pode exigir instalação antes do Push');
assert(ajustes.includes('iPhone — adicione o Portal à Tela de Início primeiro'),'iPhone no Safari deve orientar instalação na Tela de Início');
assert(ajustes.includes('Enquanto o Portal estiver aberto somente no Safari, ele não tentará pedir a permissão de notificações.'),'Texto do iPhone deve explicar o bloqueio correto do Safari');
assert(ajustes.includes("guide.hidden = active || checking"),'Aparelho já ativo não deve continuar exibindo onboarding');
assert(ajustes.includes('new MutationObserver(function () { syncNotificationGuide(guide); })'),'Guia deve acompanhar a mudança real do estado de inscrição');
assert(!ajustes.includes('<p><b>Android:</b> abra no Chrome → menu ⋮ → Instalar app ou Adicionar à tela inicial → abra o portal → permita as notificações.</p>'),'Orientação Android antiga deve ser removida');

const platformStart=ajustes.indexOf('function notificationPlatform()');
const platformEnd=ajustes.indexOf('function notificationGuideHtml',platformStart);
const platformCode=ajustes.slice(platformStart,platformEnd);
assert(platformStart>=0&&platformEnd>platformStart,'Função de plataforma deve existir isoladamente');
assert(!/cpf|cns|telefone|celular|whatsapp|phoneNumber|numeroTelefone|número de telefone/i.test(platformCode),'Detecção de aparelho novo não pode usar documento ou contato telefônico');
assert(/navigator\.userAgent/.test(platformCode)&&/navigator\.standalone/.test(platformCode),'Detecção deve usar apenas capacidades locais do navegador');

const iosGuard=agenda.indexOf('if (isIos() && !isStandalone())');
const deferred=agenda.indexOf('window.OneSignalDeferred = window.OneSignalDeferred || []',iosGuard);
const requestPermission=agenda.indexOf('OneSignal.Notifications.requestPermission()',deferred);
assert(iosGuard>=0&&deferred>iosGuard&&requestPermission>deferred,'Guard iOS deve ocorrer antes de qualquer pedido de permissão OneSignal');
const iosBlock=agenda.slice(iosGuard,deferred);
assert(iosBlock.includes('return;'),'iPhone fora do standalone deve sair antes da inicialização/solicitação Push');
assert(agenda.includes("serviceWorkerPath:\n            '/atendimento-acs-farmaceutico/push/OneSignalSDKWorker.js'"),'Worker OneSignal deve manter o caminho segregado atual');
assert(agenda.includes("scope: '/atendimento-acs-farmaceutico/push/'"),'Scope OneSignal deve permanecer segregado em /push/');
assert.equal((agenda.match(/OneSignal\.init\(\{/g)||[]).length,1,'Deve existir um único inicializador OneSignal no controlador atual');
assert.equal((agenda.match(/data-onesignal-sdk/g)||[]).length,1,'SDK OneSignal deve ter um único gate de carregamento');
assert(agenda.includes("status.textContent = 'Avisos ativados neste aparelho.'"),'Estado já ativo deve permanecer reconhecido');
assert(agenda.includes("button.textContent = 'Avisos ativados'"),'Botão deve permanecer bloqueado quando a inscrição já está ativa');

assert(worker.includes("const CACHE_NAME = 'tacs-disabled-20260727'"),'Service worker legado deve continuar desativado neste bloco');
assert(worker.includes('self.registration.unregister()'),'Bloco 6 não pode reativar o service worker legado');
assert.equal(pushWorker.trim(),"importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');",'Worker OneSignal deve permanecer exatamente no bootstrap oficial atual');

console.log('PUSH_ONBOARDING_V1_OK: Android ativa primeiro; iPhone exige Home Screen; ativo não repete guia; workers preservados.');
