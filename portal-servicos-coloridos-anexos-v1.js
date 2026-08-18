(function(){
  'use strict';

  if(window.PortalTacsServicosColoridosAnexosV1)return;
  window.PortalTacsServicosColoridosAnexosV1=true;

  var SERVICE_RECIPE='Solicitar renovação de receita médica';
  var SERVICE_EXAMS='Solicitar marcação de exames — Ultrassom / Fisioterapeuta';
  var currentAttachmentService='';
  var selectedFile=null;
  var pickerObserver=null;
  var sendObserver=null;

  var COLORS=[
    '#06445D','#54307E','#095B40','#7E350F','#762338','#254A7B','#54386B',
    '#066057','#6B4E00','#28583C','#5E3A00','#702B4C','#30437E','#39484F','#5C2D1E','#1D515A'
  ];

  var SERVICES=[
    {value:'Implanon',label:'Implanon — informações ou solicitação do implante',color:'#54307E',aliases:['Implanon']},
    {value:'Solicitar consulta Médica',label:'Solicitar consulta Médica',color:'#06445D',aliases:['Solicitar atendimento com a Médica','Atendimento com a Médica','Solicitar consulta Médica']},
    {value:'Solicitar atendimento com a Enfermeira Chefe',label:'Solicitar atendimento com a Enfermeira Chefe',color:'#095B40',aliases:['Solicitar atendimento com a Enfermeira Chefe','Atendimento com a Enfermeira Chefe']},
    {value:'Solicitar atendimento com nutricionista',label:'Solicitar atendimento com nutricionista',color:'#7E350F',aliases:['Solicitar atendimento com nutricionista','Atendimento com a Nutricionista']},
    {value:'Solicitar atendimento odontológico (dentista)',label:'Solicitar atendimento odontológico (dentista)',color:'#254A7B',aliases:['Solicitar atendimento odontológico (dentista)']},
    {value:'Solicitar visita domiciliar do TACS',label:'Solicitar visita domiciliar do TACS',color:'#066057',aliases:['Visita domiciliar ou acompanhamento do TACS - Técnico Agente Comunitário de Saúde da Unidade de Saúde Posto Matias','Solicitar visita domiciliar do TACS']},
    {value:'Solicitar visita domiciliar com a Médica',label:'Solicitar visita domiciliar com a Médica',color:'#702B4C',aliases:['Solicitar visita domiciliar com a Médica']},
    {value:'Vacinação ou campanha de saúde',label:'Vacinação ou campanha de saúde',color:'#6B4E00',aliases:['Vacinação ou campanha de saúde']},
    {value:'Acompanhamento de saúde do Bolsa Família',label:'Acompanhamento de saúde do Bolsa Família',color:'#28583C',aliases:['Acompanhamento de saúde do Bolsa Família']},
    {value:'Cadastro ou atualização da família',label:'Cadastro ou atualização da família',color:'#5E3A00',aliases:['Cadastro ou atualização da família']},
    {value:'Solicitar ficha de cadastro para Aposentadoria',label:'Solicitar ficha de cadastro para Aposentadoria',color:'#54386B',aliases:['Solicitar ficha de cadastro para Aposentadoria']},
    {value:SERVICE_RECIPE,label:SERVICE_RECIPE,color:'#762338',aliases:[SERVICE_RECIPE]},
    {value:SERVICE_EXAMS,label:SERVICE_EXAMS,color:'#30437E',aliases:[SERVICE_EXAMS,'Encaminhamento ou orientação para outro serviço da rede pública']},
    {value:'Outro assunto comunitário relacionado à Unidade de Saúde Posto Matias',label:'Outro assunto comunitário relacionado à Unidade de Saúde Posto Matias',color:'#39484F',aliases:['Outro assunto comunitário relacionado à Unidade de Saúde Posto Matias']}
  ];

  var REMOVED=[
    'Informações sobre dias, horários e funcionamento da Unidade de Saúde Posto Matias',
    'Solicitar atendimento odontológico de emergência (dentista)',
    'Solicitar atendimento com a Médica',
    'Atendimento com a Médica'
  ];

  function el(id){return document.getElementById(id)}
  function text(v){return String(v==null?'':v).trim()}
  function category(){return el('category')}
  function isAttachmentService(value){value=text(value);return value===SERVICE_RECIPE||value===SERVICE_EXAMS}
  function getSend(){return el('sendPetroleumCard')||el('send')}
  function subject(){return el('subject')}

  function hashColor(value){
    var s=text(value),h=0,i;
    for(i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;
    return COLORS[Math.abs(h)%COLORS.length];
  }

  function optionMatches(option,aliases){
    var value=text(option.value),label=text(option.textContent);
    return aliases.some(function(alias){return value===alias||label===alias});
  }

  function normalizeOptions(){
    var select=category();if(!select)return;
    var original=Array.prototype.slice.call(select.options);
    var blank=original.find(function(o){return !text(o.value)})||null;
    var used=[];

    function take(def){
      var found=original.find(function(o){return used.indexOf(o)===-1&&optionMatches(o,def.aliases)});
      if(!found){found=document.createElement('option')}
      used.push(found);
      found.value=def.value;
      found.textContent=def.label;
      found.dataset.serviceColor=def.color;
      return found;
    }

    var known=SERVICES.map(take);
    var dynamic=original.filter(function(o){
      if(o===blank||used.indexOf(o)!==-1)return false;
      var v=text(o.value),label=text(o.textContent);
      if(!v)return false;
      if(REMOVED.indexOf(v)!==-1||REMOVED.indexOf(label)!==-1)return false;
      return true;
    });

    dynamic.forEach(function(o){if(!o.dataset.serviceColor)o.dataset.serviceColor=hashColor(o.value||o.textContent)});

    while(select.firstChild)select.removeChild(select.firstChild);
    if(blank){blank.value='';blank.textContent='Toque para escolher';select.appendChild(blank)}
    else{var b=document.createElement('option');b.value='';b.textContent='Toque para escolher';select.appendChild(b)}

    function appendKnown(index){select.appendChild(known[index])}
    appendKnown(0);appendKnown(1);appendKnown(2);appendKnown(3);
    dynamic.forEach(function(o){select.appendChild(o)});
    for(var i=4;i<known.length;i++)appendKnown(i);
  }

  function addStyles(){
    if(el('portalServiceAttachmentStyleV1'))return;
    var s=document.createElement('style');s.id='portalServiceAttachmentStyleV1';
    s.textContent=[
      '#category.portal-service-native{display:none!important}',
      '.portal-service-picker{display:grid;gap:10px;width:100%}',
      '.portal-service-picker-toggle{width:100%;min-height:64px;padding:14px 16px;border:3px solid #69c7e7;border-radius:16px;background:#fff;color:#17394a;text-align:left;font-size:18px;font-weight:950;line-height:1.28;box-shadow:0 6px 15px rgba(4,44,70,.10)}',
      '.portal-service-picker-toggle[data-selected="1"]{color:#f2f7f8;border-color:#cfe4eb;box-shadow:0 9px 20px rgba(3,35,56,.22)}',
      '.portal-service-picker-panel{display:grid;gap:9px;padding:11px;border:2px solid #86a7b7;border-radius:17px;background:#eef5f8;box-shadow:0 16px 34px rgba(3,35,56,.18)}',
      '.portal-service-picker-panel[hidden]{display:none!important}',
      '.portal-service-choice{width:100%;min-height:58px;padding:13px 15px;border:2px solid rgba(214,232,238,.72);border-radius:14px;color:#f2f7f8;text-align:left;font-size:17px;font-weight:900;line-height:1.28;box-shadow:0 5px 11px rgba(3,35,56,.18)}',
      '.portal-service-choice:active{transform:scale(.99)}',
      '.portal-attachment-box{grid-column:1/-1;display:grid;gap:12px;margin-top:2px;padding:17px;border:3px solid #69c7e7;border-radius:18px;background:linear-gradient(145deg,#073a55,#0b5878);color:#fff;box-shadow:0 12px 26px rgba(3,35,56,.22)}',
      '.portal-attachment-box[hidden]{display:none!important}',
      '.portal-attachment-box h3{margin:0;font-size:22px;line-height:1.25}',
      '.portal-attachment-box p{margin:0;color:#e2f2f8;font-size:15px;font-weight:750;line-height:1.45}',
      '.portal-attachment-choose{width:100%;min-height:60px;padding:13px 16px;border:3px solid #fff;border-radius:15px;background:#0a79a8;color:#fff;font-size:18px;font-weight:950}',
      '.portal-attachment-file{padding:11px 12px;border:2px solid #79dca0;border-radius:13px;background:#e8f8ee;color:#08723d;font-size:15px;font-weight:900;overflow-wrap:anywhere}',
      '.portal-attachment-guide{display:flex;align-items:center;gap:10px;grid-column:1/-1;width:100%;margin:0 0 10px;padding:10px 14px;border:2px solid #70e39f;border-radius:20px;background:#073a55;color:#fff;font-size:15px;font-weight:950;line-height:1.3;box-shadow:0 9px 22px rgba(3,42,64,.20)}',
      '.portal-attachment-guide .portal-arrow-symbol{color:#7af0a8;font-size:25px;line-height:1;animation:portalAttachmentArrowBlink 1.1s ease-in-out infinite}',
      '@keyframes portalAttachmentArrowBlink{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(5px)}}',
      '@media(prefers-reduced-motion:reduce){.portal-attachment-guide .portal-arrow-symbol{animation:none!important}}'
    ].join('');
    document.head.appendChild(s)
  }

  function pickerWrap(){return el('portalServicePickerV1')}
  function pickerPanel(){return el('portalServicePickerPanelV1')}
  function pickerToggle(){return el('portalServicePickerToggleV1')}

  function colorForValue(value){
    var select=category(),option=select&&Array.prototype.find.call(select.options,function(o){return text(o.value)===text(value)});
    return option&&option.dataset.serviceColor||hashColor(value)
  }

  function renderPicker(){
    var select=category(),panel=pickerPanel();if(!select||!panel)return;
    panel.innerHTML='';
    Array.prototype.slice.call(select.options).forEach(function(option){
      if(!text(option.value))return;
      var b=document.createElement('button');b.type='button';b.className='portal-service-choice';
      b.dataset.value=option.value;b.style.background=colorForValue(option.value);b.textContent=option.textContent;
      b.addEventListener('click',function(event){
        event.preventDefault();event.stopPropagation();
        select.value=option.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        panel.hidden=true;applySelectedColor();
      });
      panel.appendChild(b)
    })
  }

  function applySelectedColor(){
    var select=category(),toggle=pickerToggle();if(!select||!toggle)return;
    var value=text(select.value);
    if(!value){toggle.dataset.selected='0';toggle.style.background='#fff';toggle.style.color='#17394a';toggle.textContent='Toque para escolher';return}
    var option=Array.prototype.find.call(select.options,function(o){return o.value===select.value});
    toggle.dataset.selected='1';toggle.style.background=colorForValue(value);toggle.style.color='#f2f7f8';toggle.textContent=option?option.textContent:value
  }

  function installPicker(){
    var select=category();if(!select||pickerWrap())return;
    select.classList.add('portal-service-native');
    var wrap=document.createElement('div');wrap.id='portalServicePickerV1';wrap.className='portal-service-picker';
    var toggle=document.createElement('button');toggle.id='portalServicePickerToggleV1';toggle.type='button';toggle.className='portal-service-picker-toggle';toggle.setAttribute('aria-haspopup','listbox');toggle.setAttribute('aria-expanded','false');
    var panel=document.createElement('div');panel.id='portalServicePickerPanelV1';panel.className='portal-service-picker-panel';panel.hidden=true;panel.setAttribute('role','listbox');
    wrap.append(toggle,panel);select.insertAdjacentElement('afterend',wrap);
    toggle.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',panel.hidden?'false':'true')});
    document.addEventListener('click',function(event){if(!wrap.contains(event.target)){panel.hidden=true;toggle.setAttribute('aria-expanded','false')}});
    renderPicker();applySelectedColor();
    pickerObserver=new MutationObserver(function(){
      var legacy=false;
      Array.prototype.forEach.call(select.options,function(o){
        var v=text(o.value),l=text(o.textContent);
        if(REMOVED.indexOf(v)!==-1||REMOVED.indexOf(l)!==-1)legacy=true;
      });
      if(legacy)normalizeOptions();
      renderPicker();applySelectedColor()
    });
    pickerObserver.observe(select,{childList:true});
  }

  function attachmentBox(){return el('portalServiceAttachmentV1')}
  function attachmentInput(){return el('portalServiceAttachmentInputV1')}
  function attachmentFileName(){return el('portalServiceAttachmentFileV1')}
  function attachmentChoose(){return el('portalServiceAttachmentChooseV1')}

  function installAttachmentBox(){
    if(attachmentBox())return;
    var select=category(),label=select&&select.closest('label');if(!label)return;
    var box=document.createElement('section');box.id='portalServiceAttachmentV1';box.className='portal-attachment-box';box.hidden=true;
    box.innerHTML='<h3 id="portalServiceAttachmentTitleV1">📎 Enviar documento</h3><p id="portalServiceAttachmentHelpV1">Selecione uma foto ou arquivo no seu aparelho.</p><input id="portalServiceAttachmentInputV1" type="file" accept="image/*,application/pdf,.pdf" hidden><button id="portalServiceAttachmentChooseV1" class="portal-attachment-choose" type="button">📎 Escolher foto ou arquivo</button><div id="portalServiceAttachmentFileV1" class="portal-attachment-file" hidden></div>';
    label.insertAdjacentElement('afterend',box);
    attachmentChoose().addEventListener('click',function(){attachmentInput().click()});
    attachmentInput().addEventListener('change',function(){
      selectedFile=this.files&&this.files[0]?this.files[0]:null;
      var f=attachmentFileName();
      if(selectedFile){f.hidden=false;f.textContent='Arquivo selecionado: '+selectedFile.name;attachmentChoose().textContent='📎 Trocar foto ou arquivo'}
      else{f.hidden=true;f.textContent='';attachmentChoose().textContent='📎 Escolher foto ou arquivo'}
      updateAttachmentState(false)
    })
  }

  function removeAttachmentGuide(){var g=el('portalServiceAttachmentGuideV1');if(g)g.remove()}
  function showAttachmentGuide(){
    var box=attachmentBox();if(!box||box.hidden||selectedFile)return;
    removeAttachmentGuide();
    var guide=document.createElement('div');guide.id='portalServiceAttachmentGuideV1';guide.className='portal-attachment-guide';
    guide.innerHTML='<span class="portal-arrow-symbol" aria-hidden="true">↓</span><span>Agora toque abaixo para escolher a foto ou o arquivo que será enviado junto com a solicitação.</span>';
    box.parentNode.insertBefore(guide,box);
    setTimeout(function(){try{box.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}},120)
  }

  function notifyForm(){
    var s=subject();if(s)s.dispatchEvent(new Event('input',{bubbles:true}));
    setTimeout(function(){if(window.PortalTacsOrientacaoMoradorV1&&typeof window.PortalTacsOrientacaoMoradorV1.refreshGuide==='function')window.PortalTacsOrientacaoMoradorV1.refreshGuide()},80)
  }

  function updateAttachmentSendLabel(required){
    var send=getSend();if(!send)return;
    if(!send.dataset.portalAttachmentOriginalHtml)send.dataset.portalAttachmentOriginalHtml=send.innerHTML;
    if(required){
      send.innerHTML='📲 Enviar pelo WhatsApp com arquivo<small>O arquivo selecionado será compartilhado junto com a solicitação.</small>';
    }else if(send.dataset.portalAttachmentOriginalHtml){
      send.innerHTML=send.dataset.portalAttachmentOriginalHtml;
    }
  }

  function lockSendIfNeeded(){
    var send=getSend();if(!send)return;
    var required=isAttachmentService(text(category()&&category().value));
    if(required&&!selectedFile){send.dataset.portalAttachmentLock='1';send.disabled=true}
    else if(send.dataset.portalAttachmentLock==='1'){
      delete send.dataset.portalAttachmentLock;
      notifyForm()
    }
  }

  function updateAttachmentState(scroll){
    var select=category(),box=attachmentBox();if(!select||!box)return;
    var service=text(select.value),required=isAttachmentService(service);
    if(service!==currentAttachmentService){selectedFile=null;var input=attachmentInput();if(input)input.value='';var f=attachmentFileName();if(f){f.hidden=true;f.textContent=''}var choose=attachmentChoose();if(choose)choose.textContent='📎 Escolher foto ou arquivo'}
    currentAttachmentService=service;
    box.hidden=!required;
    removeAttachmentGuide();
    if(required){
      var title=el('portalServiceAttachmentTitleV1'),help=el('portalServiceAttachmentHelpV1');
      if(service===SERVICE_RECIPE){title.textContent='📎 Enviar foto ou arquivo da receita';help.textContent='Selecione a foto, PDF ou arquivo da receita que será enviado junto com o pedido de renovação.'}
      else{title.textContent='📎 Enviar foto ou arquivo da solicitação';help.textContent='Selecione a foto, PDF ou arquivo da solicitação para a marcação.'}
      if(!selectedFile)showAttachmentGuide();
    }
    updateAttachmentSendLabel(required);lockSendIfNeeded();applySelectedColor();
    if(scroll&&required&&!selectedFile)showAttachmentGuide()
  }

  function formatBirth(value){return text(value)||'Não informada'}
  function buildShareText(){
    var service=text(category()&&category().value),name=text(el('name')&&el('name').value),birth=formatBirth(el('birth')&&el('birth').value),doc=text(el('cpf')&&el('cpf').value),locality=text(el('locality')&&el('locality').value),desc=text(subject()&&subject().value);
    return '*SOLICITAÇÃO À UNIDADE DE SAÚDE POSTO MATIAS*\n*Portal TACS*\n\nServiço: '+service+'\nNome: '+name+'\nData de nascimento: '+birth+'\nCPF/CNS: '+doc+'\nLocalidade: '+locality+(desc?'\nDescrição: '+desc:'')+'\nArquivo selecionado: '+(selectedFile?selectedFile.name:'')
  }

  async function shareAttachment(event){
    var service=text(category()&&category().value);if(!isAttachmentService(service))return;
    var send=getSend();if(!send||event.target.closest('#sendPetroleumCard,#send')!==send)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(!selectedFile){showAttachmentGuide();return}
    var status=attachmentFileName();
    try{
      var payload={title:'Solicitação Portal TACS',text:buildShareText(),files:[selectedFile]};
      if(typeof navigator.share!=='function')throw new Error('Compartilhamento de arquivos não disponível neste navegador.');
      if(typeof navigator.canShare==='function'&&!navigator.canShare({files:[selectedFile]}))throw new Error('Este navegador não permitiu compartilhar o arquivo selecionado.');
      try{sessionStorage.setItem('portalTacsResetAfterSendV1','1')}catch(ignore){}
      await navigator.share(payload);
      if(status){status.hidden=false;status.textContent='Arquivo pronto para envio. Escolha o WhatsApp na tela de compartilhamento.'}
    }catch(error){
      if(error&&error.name==='AbortError'){try{sessionStorage.removeItem('portalTacsResetAfterSendV1')}catch(ignore){};return}
      try{sessionStorage.removeItem('portalTacsResetAfterSendV1')}catch(ignore){}
      if(status){status.hidden=false;status.textContent=(error&&error.message)||'Não foi possível compartilhar este arquivo neste aparelho.'}
    }
  }

  function installEvents(){
    var select=category();if(!select)return;
    select.addEventListener('change',function(){updateAttachmentState(true)});
    document.addEventListener('click',shareAttachment,true);
    document.addEventListener('tacs:morador',function(){setTimeout(lockSendIfNeeded,80)});
    var send=getSend();if(send){sendObserver=new MutationObserver(function(){lockSendIfNeeded()});sendObserver.observe(send,{attributes:true,attributeFilter:['disabled']})}
  }

  function init(){
    addStyles();normalizeOptions();installPicker();installAttachmentBox();installEvents();updateAttachmentState(false);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()
}());
