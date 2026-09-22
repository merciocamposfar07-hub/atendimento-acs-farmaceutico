/* Portal Conecta Saúde Comunitária — service worker mínimo.
   Não intercepta requisições e não mantém cache de dados: a instalação na tela inicial
   não altera o carregamento instantâneo já usado pelo Portal do Morador. */
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(event){event.waitUntil(self.clients.claim())});
