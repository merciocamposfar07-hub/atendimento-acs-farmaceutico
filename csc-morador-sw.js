/* Conecta Saúde Comunitária — atualização automática do Portal do Morador.
   Regra: a navegação principal sempre consulta a versão publicada na rede.
   Dados do morador continuam fora do Cache Storage; este worker não altera sessão/PIN. */
'use strict';

var CSC_PORTAL_ROOT='/atendimento-acs-farmaceutico/';

self.addEventListener('install',function(){
  self.skipWaiting();
});

self.addEventListener('activate',function(event){
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch',function(event){
  var request=event.request;
  if(!request||request.method!=='GET'||request.mode!=='navigate')return;
  var url;
  try{url=new URL(request.url)}catch(e){return}
  if(url.origin!==self.location.origin)return;
  if(url.pathname!==CSC_PORTAL_ROOT&&url.pathname!==CSC_PORTAL_ROOT+'index.html')return;

  event.respondWith(
    fetch(new Request(request,{cache:'no-store'})).catch(function(){
      return fetch(request);
    })
  );
});
