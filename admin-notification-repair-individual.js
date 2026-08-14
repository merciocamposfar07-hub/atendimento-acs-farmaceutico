(function(){
  'use strict';
  var MARCADOR='data-reparo-individual-v112';

  function texto(v){return String(v==null?'':v).trim()}
  function referenciaDoCartao(cartao){
    var m=texto(cartao&&cartao.textContent).match(/Referência técnica:\s*…([0-9a-f]{8})/i);
    return m?m[1].toLowerCase():'';
  }
  function nomeDoCartao(cartao){
    var h=cartao&&cartao.querySelector('h3');
    return texto(h&&h.textContent)||'este aparelho';
  }
  function estadoDoCartao(cartao){
    var s=cartao&&cartao.querySelector('.saude-status');
    if(!s)return'';
    if(s.classList.contains('ATIVO'))return'ATIVO';
    if(s.classList.contains('INATIVO'))return'INATIVO';
    if(s.classList.contains('REPARO'))return'REPARO';
    if(s.classList.contains('SEM_CONFIRMACAO'))return'SEM_CONFIRMACAO';
    return texto(s.textContent).toUpperCase();
  }
  function criarBotao(cartao){
    if(!cartao||cartao.hasAttribute(MARCADOR))return;
    cartao.setAttribute(MARCADOR,'1');
    var estado=estadoDoCartao(cartao),ref=referenciaDoCartao(cartao);
    if(!ref||estado==='ATIVO')return;
    var b=document.createElement('button');
    b.type='button';
    b.className='botao saude-reparo-individual';
    b.style.marginTop='12px';
    b.style.minHeight='50px';
    b.style.background=estado==='REPARO'?'#607985':'#148a46';
    if(estado==='REPARO'){
      b.textContent='✓ Reparo já solicitado para este aparelho';
      b.disabled=true;
      cartao.appendChild(b);
      return;
    }
    b.textContent='🔧 Solicitar reparo deste aparelho';
    b.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      if(typeof window.post!=='function'||typeof window.sessao!=='function')return;
      var nome=nomeDoCartao(cartao);
      if(!window.confirm('Solicitar reparo somente para '+nome+'? Os demais aparelhos não serão alterados.'))return;
      b.disabled=true;b.textContent='Solicitando reparo…';
      if(typeof window.status==='function')window.status('saudeNotificacoesStatus','Solicitando reparo somente para '+nome+'…','aviso');
      window.post('admin_notificacoes_solicitar_reparo_aparelho',Object.assign(window.sessao(),{subscriptionRef:ref}),function(r){
        if(!r||r.ok!==true){
          b.disabled=false;b.textContent='🔧 Solicitar reparo deste aparelho';
          if(typeof window.status==='function')window.status('saudeNotificacoesStatus',texto(r&&r.message||'Não foi possível solicitar o reparo deste aparelho.'),'erro');
          return;
        }
        if(r.skipped===true){
          if(typeof window.status==='function')window.status('saudeNotificacoesStatus',texto(r.message||'Este aparelho já está apto; nenhum reparo foi solicitado.'),'ok');
        }else if(typeof window.status==='function'){
          window.status('saudeNotificacoesStatus',texto(r.message||'Reparo solicitado somente para este aparelho.'),'ok');
        }
        if(typeof window.carregarSaudeNotificacoes==='function')setTimeout(window.carregarSaudeNotificacoes,250);
      },'admin_notificacoes_saude_result');
    });
    cartao.appendChild(b);
  }
  function aplicar(){document.querySelectorAll('#saudeNotificacoesLista .saude-aparelho').forEach(criarBotao)}
  function instalar(){
    var original=window.renderSaudeNotificacoes;
    if(typeof original==='function'&&!original.__reparoIndividualV112){
      var envolvida=function(r){var out=original.apply(this,arguments);setTimeout(aplicar,0);return out};
      envolvida.__reparoIndividualV112=true;
      window.renderSaudeNotificacoes=envolvida;
    }
    var lista=document.getElementById('saudeNotificacoesLista');
    if(lista&&typeof MutationObserver==='function')new MutationObserver(aplicar).observe(lista,{childList:true,subtree:true});
    aplicar();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
}());
