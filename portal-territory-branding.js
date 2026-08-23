(function(){
  'use strict';
  if(window.PortalTacsTerritoryBranding)return;

  var API=String(window.TACS_ADMIN_API_URL||'').trim();
  var DEFAULT_AREA='JAPARANDUBA';
  var identity=null;
  var loading=null;

  function text(value){return String(value==null?'':value).replace(/\s+/g,' ').trim();}
  function areaId(){
    var value=window.PortalTacsArea&&typeof window.PortalTacsArea.id==='function'
      ?window.PortalTacsArea.id():window.TACS_AREA_ID;
    var normalized=text(value).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64);
    return normalized||DEFAULT_AREA;
  }
  function valid(data){
    if(!data||data.ok!==true)return false;
    if(text(data.areaId).toUpperCase()!==areaId())return false;
    return Boolean(text(data.areaNome)&&text(data.unidadeNome)&&text(data.tacsNome));
  }
  function setTextAfterStrong(container,value){
    if(!container)return;
    var strong=container.querySelector('strong');
    if(!strong||!strong.parentNode)return;
    var parent=strong.parentNode;
    while(strong.nextSibling)parent.removeChild(strong.nextSibling);
    parent.appendChild(document.createTextNode(value));
  }
  function applyFooter(){
    var institutionalMeta=document.querySelector('footer .portal-footer-meta');
    if(institutionalMeta){
      institutionalMeta.textContent='';
      institutionalMeta.appendChild(document.createTextNode(identity.unidadeNome));
      institutionalMeta.appendChild(document.createElement('br'));
      institutionalMeta.appendChild(document.createTextNode(identity.areaNome+' • Chã Grande/PE'));
      return;
    }
    var footer=document.querySelectorAll('footer > div');
    if(footer[0])setTextAfterStrong(footer[0],identity.tacsNome);
    if(footer[1]){
      var footerStrong=footer[1].querySelector('strong');
      if(footerStrong)footerStrong.textContent='Serviço da '+identity.unidadeNome;
      setTextAfterStrong(footer[1],identity.areaNome+' • Chã Grande/PE');
    }
  }
  function apply(data){
    if(!valid(data))return false;
    identity=Object.freeze({
      areaId:text(data.areaId).toUpperCase(),
      areaNome:text(data.areaNome),
      unidadeNome:text(data.unidadeNome),
      tacsNome:text(data.tacsNome)
    });

    var identityBox=document.querySelector('.hero .identity');
    var spans=identityBox?identityBox.querySelectorAll('span'):[];
    if(spans[0])spans[0].textContent='Serviço vinculado à '+identity.unidadeNome;
    if(spans[1])spans[1].textContent=identity.areaNome+' • Chã Grande/PE';

    var exclusive=document.querySelector('.hero .exclusive');
    if(exclusive){
      var strong=exclusive.querySelector('strong');
      if(strong){
        while(strong.nextSibling)exclusive.removeChild(strong.nextSibling);
        var phrase=identity.areaId===DEFAULT_AREA
          ?' aos moradores do '+identity.areaNome+' - '+identity.unidadeNome+'.'
          :' aos moradores de '+identity.areaNome+' - '+identity.unidadeNome+'.';
        exclusive.appendChild(document.createTextNode(phrase));
      }
    }

    var responsible=document.querySelector('.hero .responsible b');
    if(responsible)responsible.textContent=identity.tacsNome;

    var purpose=document.querySelector('.purpose p');
    if(purpose)purpose.textContent='Solicitar ou obter informações sobre serviços oferecidos pela '+identity.unidadeNome+', como atendimento odontológico, vacinação, visita, cadastro, acompanhamento e orientação sobre o funcionamento da unidade.';

    applyFooter();

    document.title='TACS - Técnico Agente Comunitário de Saúde | '+identity.unidadeNome;
    var description=document.querySelector('meta[name="description"]');
    if(description)description.setAttribute('content','Canal do TACS - Técnico Agente Comunitário de Saúde '+identity.tacsNome+', vinculado à '+identity.unidadeNome+', para moradores de '+identity.areaNome+', Chã Grande/PE.');

    document.documentElement.classList.remove('territory-pending');
    window.PortalTacsTerritoryIdentity=identity;
    try{window.dispatchEvent(new CustomEvent('portal-tacs-territory-identity',{detail:identity}));}catch(error){}
    return true;
  }

  function fetchIdentity(force){
    if(identity&&!force&&identity.areaId===areaId())return Promise.resolve(identity);
    if(loading)return loading;
    if(!API)return Promise.reject(new Error('Serviço territorial não configurado.'));
    loading=new Promise(function(resolve,reject){
      var callback='__portalTacsIdentity_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      var script=document.createElement('script'),done=false;
      var timer=setTimeout(function(){finish(new Error('A identificação da área demorou para responder.'));},16000);
      function cleanup(){clearTimeout(timer);if(script.parentNode)script.remove();try{delete window[callback]}catch(e){window[callback]=undefined}}
      function finish(error,data){if(done)return;done=true;cleanup();loading=null;if(error){reject(error);return}if(!apply(data)){reject(new Error('Identificação territorial inválida.'));return}resolve(identity)}
      window[callback]=function(data){if(!data||data.ok!==true){finish(new Error(text(data&&data.message)||'Identificação da área indisponível.'));return}finish(null,data)};
      script.onerror=function(){finish(new Error('Falha ao consultar a identificação da área.'))};
      script.src=API+(API.indexOf('?')<0?'?':'&')+'action=publico_identidade_area&areaId='+encodeURIComponent(areaId())+'&callback='+encodeURIComponent(callback)+'&_='+Date.now();
      document.head.appendChild(script);
    });
    return loading;
  }

  window.PortalTacsTerritoryBranding=Object.freeze({
    load:fetchIdentity,
    current:function(){return identity;},
    apply:apply
  });
  fetchIdentity(false).catch(function(){});
}());
