(function(){
  'use strict';
  if(window.PortalTacsAposentadoriaDestinatarioV1)return;
  window.PortalTacsAposentadoriaDestinatarioV1=true;

  var SERVICE='Solicitar ficha de cadastro para Aposentadoria';

  function el(id){return document.getElementById(id)}
  function text(v){return String(v==null?'':v).trim()}

  function addStyle(){
    if(el('retirementRecipientStyleV1'))return;
    var style=document.createElement('style');
    style.id='retirementRecipientStyleV1';
    style.textContent=[
      '#retirementRecipientBoxV1{grid-column:1/-1;display:grid;gap:11px;margin:2px 0 2px;padding:16px;border:3px solid #69c7e7;border-radius:18px;background:#eef5f8;color:#102d40;box-shadow:0 8px 18px rgba(3,35,56,.12)}',
      '#retirementRecipientBoxV1[hidden]{display:none!important}',
      '#retirementRecipientBoxV1 .retirement-recipient-guide{display:flex;align-items:center;gap:10px;margin:0;padding:10px 13px;border:2px solid #70e39f;border-radius:18px;background:#073a55;color:#fff;font-size:15px;font-weight:950;line-height:1.3}',
      '#retirementRecipientBoxV1 .retirement-recipient-arrow{color:#7af0a8;font-size:25px;line-height:1;animation:retirementArrowBlink 1.1s ease-in-out infinite}',
      '#retirementRecipientBoxV1 h3{margin:0;color:#102d40;font-size:20px;line-height:1.25}',
      '#retirementRecipientBoxV1 .retirement-recipient-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '#retirementRecipientBoxV1 .retirement-recipient-option{min-height:56px;padding:12px 14px;border:3px solid #d8eef7;border-radius:15px;background:#06445d;color:#f2f7f8;font-size:17px;font-weight:950;line-height:1.2}',
      '#retirementRecipientBoxV1 .retirement-recipient-option[data-value="Para outra pessoa"]{background:#54307e}',
      '#retirementRecipientBoxV1 .retirement-recipient-option[aria-pressed="true"]{outline:4px solid #70e39f;outline-offset:1px}',
      '@keyframes retirementArrowBlink{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(5px)}}',
      '@media(max-width:430px){#retirementRecipientBoxV1 .retirement-recipient-options{grid-template-columns:1fr}}',
      '@media(prefers-reduced-motion:reduce){#retirementRecipientBoxV1 .retirement-recipient-arrow{animation:none!important}}'
    ].join('');
    document.head.appendChild(style)
  }

  function install(){
    if(el('retirementRecipientBoxV1'))return;
    var subjectField=el('subjectField');
    if(!subjectField||!subjectField.parentNode)return;

    var box=document.createElement('section');
    box.id='retirementRecipientBoxV1';
    box.hidden=true;
    box.innerHTML='<div class="retirement-recipient-guide"><span class="retirement-recipient-arrow" aria-hidden="true">↓</span><span>Agora informe para quem é a ficha de cadastro.</span></div><h3>A ficha de cadastro é para:</h3><div class="retirement-recipient-options" role="group" aria-label="Para quem é a ficha de cadastro"><button type="button" class="retirement-recipient-option" data-value="Pra mim" aria-pressed="false">Pra mim</button><button type="button" class="retirement-recipient-option" data-value="Para outra pessoa" aria-pressed="false">Para outra pessoa</button></div><input id="retirementRecipientValue" type="hidden" value="">';
    subjectField.parentNode.insertBefore(box,subjectField);

    box.addEventListener('click',function(event){
      var button=event.target.closest('.retirement-recipient-option');
      if(!button)return;
      var value=text(button.dataset.value);
      el('retirementRecipientValue').value=value;
      Array.prototype.forEach.call(box.querySelectorAll('.retirement-recipient-option'),function(node){node.setAttribute('aria-pressed',node===button?'true':'false')});
      var subject=el('subject');
      if(subject)subject.dispatchEvent(new Event('input',{bubbles:true}));
      box.dispatchEvent(new CustomEvent('tacs:aposentadoria-destinatario',{bubbles:true,detail:{value:value}}));
    });
  }

  function resetChoice(){
    var input=el('retirementRecipientValue');if(input)input.value='';
    var box=el('retirementRecipientBoxV1');
    if(box)Array.prototype.forEach.call(box.querySelectorAll('.retirement-recipient-option'),function(node){node.setAttribute('aria-pressed','false')});
  }

  function sync(){
    install();
    var category=el('category'),box=el('retirementRecipientBoxV1');
    if(!category||!box)return;
    var active=text(category.value)===SERVICE;
    if(!active&&!box.hidden)resetChoice();
    box.hidden=!active;
  }

  function init(){
    addStyle();install();sync();
    var category=el('category');
    if(category)category.addEventListener('change',function(){sync();var subject=el('subject');if(subject)subject.dispatchEvent(new Event('input',{bubbles:true}))});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}());
