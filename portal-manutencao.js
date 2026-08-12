(function(){
  'use strict';

  if(window.PortalTacsManutencao)return;

  var API=String(window.TACS_ADMIN_API_URL||'https://script.google.com/macros/s/AKfycbwOyG9yZqYly736ZsGta1q6Jd4Irkc-iRWURfypKcpBkyCCmO3hMNE4oOsXECTMCpSxYw/exec').trim();
  var AREA_ID=String(window.TACS_AREA_ID||'JAPARANDUBA').trim().toUpperCase().replace(/[^A-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64);
  if(!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(AREA_ID))AREA_ID='JAPARANDUBA';
  var CACHE_KEY='portalTacsManutencaoAtivaV2:'+AREA_ID;
  var TIMEOUT_MS=12000;
  var estado={conhecido:false,ativa:false,mensagem:'',atualizadoEm:''};
  var consulta=null;

  function texto(valor){return String(valor==null?'':valor).trim()}

  function lerAtivaSalva(){
    try{
      var lida=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(lida&&lida.ativa===true)return lida;
    }catch(erro){}
    return null;
  }

  function salvarAtiva(){
    try{
      if(estado.ativa){
        localStorage.setItem(CACHE_KEY,JSON.stringify({
          ativa:true,
          mensagem:estado.mensagem,
          atualizadoEm:estado.atualizadoEm
        }));
      }else{
        localStorage.removeItem(CACHE_KEY);
      }
    }catch(erro){}
  }

  function estilo(){
    if(document.getElementById('portal-manutencao-estilo'))return;
    var css=document.createElement('style');
    css.id='portal-manutencao-estilo';
    css.textContent=[
      '.portal-manutencao-verificacao{position:sticky;top:0;z-index:10001;padding:12px 16px;background:#805300;color:#fff;text-align:center;font:850 15px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.2)}',
      '.portal-manutencao-tela{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:22px;background:linear-gradient(145deg,#041f34 0%,#073a55 62%,#0b5878 100%);color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
      '.portal-manutencao-tela[hidden]{display:none!important}',
      '.portal-manutencao-card{width:min(620px,100%);padding:30px 24px;border:2px solid #70e39f;border-radius:26px;background:rgba(3,31,49,.88);box-shadow:0 24px 70px rgba(0,0,0,.35);text-align:center}',
      '.portal-manutencao-card small{display:block;color:#70e39f;font-size:14px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}',
      '.portal-manutencao-card h1{margin:14px 0 12px;font-size:clamp(34px,9vw,56px);line-height:1.03}',
      '.portal-manutencao-card p{margin:0;color:#fff;font-size:clamp(18px,4.5vw,22px);font-weight:700;line-height:1.55}',
      '.portal-manutencao-card b{display:block;margin-top:18px;color:#b9d8e7;font-size:15px;line-height:1.5}'
    ].join('');
    document.head.appendChild(css);
  }

  function elementos(){
    estilo();
    var verificacao=document.getElementById('portalManutencaoVerificacao');
    if(!verificacao){
      verificacao=document.createElement('div');
      verificacao.id='portalManutencaoVerificacao';
      verificacao.className='portal-manutencao-verificacao';
      verificacao.setAttribute('role','status');
      verificacao.hidden=true;
      verificacao.textContent='Verificando a disponibilidade do Portal TACS…';
      document.body.insertBefore(verificacao,document.body.firstChild);
    }
    var tela=document.getElementById('portalManutencaoTela');
    if(!tela){
      tela=document.createElement('section');
      tela.id='portalManutencaoTela';
      tela.className='portal-manutencao-tela';
      tela.hidden=true;
      tela.setAttribute('role','alert');
      tela.setAttribute('aria-live','assertive');
      tela.innerHTML='<div class="portal-manutencao-card"><small>Unidade de Saúde Posto Matias</small><h1>Portal em manutenção</h1><p id="portalManutencaoMensagem"></p><b>Não é necessário preencher ou enviar a solicitação agora. Tente novamente após a liberação do portal.</b></div>';
      document.body.appendChild(tela);
    }
    return {verificacao:verificacao,tela:tela};
  }

  function emitir(){
    try{
      window.dispatchEvent(new CustomEvent('portal-tacs-manutencao',{detail:Object.assign({},estado)}));
    }catch(erro){}
  }

  function aplicar(novo){
    estado={
      conhecido:novo.conhecido===true,
      ativa:novo.ativa===true,
      mensagem:texto(novo.mensagem),
      atualizadoEm:texto(novo.atualizadoEm)
    };
    var e=elementos();
    e.verificacao.hidden=true;
    e.tela.hidden=!estado.ativa;
    if(estado.ativa){
      document.getElementById('portalManutencaoMensagem').textContent=estado.mensagem||'O Portal TACS está temporariamente indisponível.';
    }
    salvarAtiva();
    emitir();
  }

  function consultar(){
    if(consulta)return consulta;
    consulta=new Promise(function(resolve,reject){
      var nome='__portalManutencao_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      var script=document.createElement('script');
      var terminou=false;
      var timer;

      function limpar(){
        clearTimeout(timer);
        if(script.parentNode)script.parentNode.removeChild(script);
        try{delete window[nome]}catch(erro){window[nome]=undefined}
      }

      function fim(erro,dados){
        if(terminou)return;
        terminou=true;
        limpar();
        consulta=null;
        if(erro){
          if(!estado.ativa)aplicar({conhecido:false,ativa:false,mensagem:'',atualizadoEm:''});
          reject(erro);
          return;
        }
        aplicar({
          conhecido:true,
          ativa:dados.ativa===true,
          mensagem:dados.mensagem,
          atualizadoEm:dados.atualizadoEm
        });
        resolve(Object.assign({},estado));
      }

      window[nome]=function(dados){
        if(!dados||dados.ok!==true){
          fim(new Error(dados&&dados.message||'Estado de manutenção indisponível.'));
          return;
        }
        fim(null,dados);
      };
      script.onerror=function(){fim(new Error('Falha ao verificar a manutenção.'))};
      script.src=API+(API.indexOf('?')<0?'?':'&')+
        'action=portal_manutencao_status&areaId='+encodeURIComponent(AREA_ID)+
        '&callback='+encodeURIComponent(nome)+'&_='+Date.now();
      document.head.appendChild(script);
      timer=setTimeout(function(){fim(new Error('A verificação de manutenção demorou.'))},TIMEOUT_MS);
    });
    return consulta;
  }

  function disponivel(){return !estado.ativa}
  function obter(){return Object.assign({},estado)}

  function instalarCorrecaoOdontologicaCns_(){
    if(window.__portalTacsCorrecaoOdontologicaCnsV97)return;
    window.__portalTacsCorrecaoOdontologicaCnsV97=true;

    function digitos(valor){return String(valor||'').replace(/\D/g,'')}
    function ehCns(valor){return /^\d{15}$/.test(digitos(valor))}
    function ehOdontologia(){
      var categoria=document.getElementById('category');
      return categoria&&String(categoria.value||'').toLowerCase().indexOf('odontol')!==-1;
    }
    function nascimentoValido(valor){return /^\d{2}\/\d{2}\/\d{4}$/.test(String(valor||'').trim())}

    function reparar(){
      if(!ehOdontologia())return;
      var status=document.getElementById('dentalStatus');
      var selecionada=document.querySelector('#dentalSlots .sheet-dental-choice.selected');
      var envio=document.getElementById('send');
      var documento=document.getElementById('cpf');
      if(!status||!selecionada||!envio||!documento)return;

      var reservada=String(status.textContent||'').indexOf('Vaga reservada.')===0;
      var pendente=envio.dataset&&envio.dataset.dentalReservationPending==='1';
      if(!reservada||pendente)return;

      if(selecionada.disabled)selecionada.disabled=false;
      if(!ehCns(documento.value))return;

      var nome=document.getElementById('name');
      var nascimento=document.getElementById('birth');
      var localidade=document.getElementById('locality');
      var assunto=document.getElementById('subject');
      var pronto=
        nome&&String(nome.value||'').trim().length>=3&&
        nascimento&&nascimentoValido(nascimento.value)&&
        localidade&&String(localidade.value||'').trim().length>0&&
        assunto&&String(assunto.value||'').trim().length>0;
      if(pronto)envio.disabled=false;
    }

    document.addEventListener('input',function(){setTimeout(reparar,0)},true);
    document.addEventListener('change',function(){setTimeout(reparar,0)},true);
    document.addEventListener('click',function(){setTimeout(reparar,0)},true);

    var observador=new MutationObserver(function(){setTimeout(reparar,0)});
    observador.observe(document.documentElement,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['disabled','class','data-dental-reservation-pending']
    });
    reparar();
  }

  function iniciar(){
    var salva=lerAtivaSalva();
    elementos();
    instalarCorrecaoOdontologicaCns_();
    if(salva){
      aplicar({conhecido:true,ativa:true,mensagem:salva.mensagem,atualizadoEm:salva.atualizadoEm});
    }
    consultar().catch(function(){});
    window.setInterval(function(){
      if(!document.hidden)consultar().catch(function(){});
    },30000);
    document.addEventListener('visibilitychange',function(){
      if(!document.hidden)consultar().catch(function(){});
    });
  }

  window.PortalTacsManutencao={
    areaId:AREA_ID,
    disponivel:disponivel,
    estado:obter,
    atualizar:consultar
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',iniciar,{once:true});
  }else{
    iniciar();
  }
}());
