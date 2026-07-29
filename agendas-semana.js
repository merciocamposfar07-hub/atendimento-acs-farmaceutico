(function(){
  'use strict';

  var WEEK=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira'];
  var DOCTOR='Solicitar atendimento com médico';
  var NUTRITION='Solicitar atendimento com nutricionista';

  function addStyles(){
    if(document.getElementById('agendas-semana-style'))return;
    var s=document.createElement('style');
    s.id='agendas-semana-style';
    s.textContent='\
      .nurse-days,.dental-public-days,.professional-days{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;overflow:visible!important;padding:0!important;width:100%!important}\
      .nurse-day,.dental-public-day,.professional-day{width:100%!important;min-width:0!important;min-height:0!important;padding:18px 17px!important;border-radius:16px!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere!important}\
      .nurse-day strong,.dental-public-day strong,.professional-day strong{font-size:21px!important;line-height:1.2!important}\
      .nurse-day b,.dental-public-day b,.professional-day b{font-size:18px!important;line-height:1.35!important}\
      .professional-agenda{grid-column:1/-1;margin-top:18px;padding:20px 16px;border:2px solid #0d5f8a;border-radius:20px;background:#eef7fb;color:#102b3c;box-shadow:0 14px 28px rgba(3,35,56,.14)}\
      .professional-agenda small{display:block;color:#078b45;font-size:16px;font-weight:950;letter-spacing:.05em;text-transform:uppercase}\
      .professional-agenda h3{margin:8px 0 6px;font-size:30px;line-height:1.12}\
      .professional-agenda>p{margin:0 0 14px;font-size:17px;line-height:1.45}\
      .professional-day{display:block;border:2px solid #9bb4c1;background:#fff;color:#102b3c;cursor:pointer}\
      .professional-day span,.professional-day b{display:block}\
      .professional-day span{margin-top:5px;color:#415b69;font-size:16px}\
      .professional-day b{margin-top:8px;color:#06763a}\
      .professional-day.selected{border-color:#0d5f8a;background:#e1f1f8;box-shadow:0 0 0 3px rgba(13,95,138,.15)}\
      .professional-status{margin:15px 0 0;padding-top:13px;border-top:1px solid #86a7b7;font-size:17px;font-weight:800;line-height:1.4}\
      @media(max-width:720px){.professional-agenda{padding:18px 14px}.professional-agenda h3{font-size:28px}.nurse-day,.dental-public-day,.professional-day{padding:17px 15px!important}}';
    document.head.appendChild(s);
  }

  function ensureOption(select,value,beforeText){
    if(!select)return;
    var exists=Array.prototype.some.call(select.options,function(o){return o.value===value||String(o.textContent||'').trim()===value;});
    if(exists)return;
    var o=document.createElement('option');
    o.value=value;o.textContent=value;
    var before=Array.prototype.find.call(select.options,function(x){return String(x.textContent||'').indexOf(beforeText)!==-1;});
    select.insertBefore(o,before||null);
  }

  function createProfessionalAgenda(id,title,icon,category,anchor){
    if(document.getElementById(id))return;
    var select=document.getElementById('category');
    var subject=document.getElementById('subject');
    var field=document.getElementById('subjectField');
    if(!select||!subject||!field||!anchor||!anchor.parentNode)return;

    var sec=document.createElement('section');
    sec.id=id;
    sec.className='professional-agenda full';
    sec.innerHTML='<small>'+icon+' '+title+'</small><h3>Escolha o dia</h3><p>A agenda permanece organizada de segunda a sexta. Toque no dia desejado para registrar sua solicitação.</p><div class="professional-days"></div><p class="professional-status">Selecione um dia para continuar.</p>';
    anchor.parentNode.insertBefore(sec,anchor.nextSibling);
    var list=sec.querySelector('.professional-days');
    var status=sec.querySelector('.professional-status');

    WEEK.forEach(function(day){
      var b=document.createElement('button');
      b.type='button';b.className='professional-day';
      b.innerHTML='<strong>'+day+'</strong><span>'+icon+' '+title+'</span><b>Solicitar atendimento ou informação</b>';
      b.onclick=function(){
        Array.prototype.forEach.call(list.querySelectorAll('.professional-day'),function(x){x.classList.remove('selected');});
        b.classList.add('selected');
        select.value=category;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        subject.value=category+' - '+day;
        subject.dispatchEvent(new Event('input',{bubbles:true}));
        status.textContent='Selecionado: '+day+'.';
        field.scrollIntoView({behavior:'smooth',block:'center'});
      };
      list.appendChild(b);
    });
  }

  function normalizeDentalDays(){
    var list=document.getElementById('dentalPublicDays');
    if(!list)return;
    var existing={};
    Array.prototype.forEach.call(list.children,function(card){
      var strong=card.querySelector('strong');
      if(strong)existing[String(strong.textContent||'').trim().toLowerCase()]=card;
    });
    WEEK.forEach(function(day){
      var key=day.toLowerCase();
      if(existing[key])return;
      var b=document.createElement('button');
      b.type='button';b.className='dental-public-day';b.disabled=true;
      b.innerHTML='<strong>'+day+'</strong><b class="service">🦷 Atendimento odontológico</b><b class="closed">Sem atendimento informado para este dia</b>';
      list.appendChild(b);
    });
    var ordered=[];
    WEEK.forEach(function(day){
      var target=Array.prototype.find.call(list.children,function(card){var st=card.querySelector('strong');return st&&String(st.textContent||'').trim().toLowerCase()===day.toLowerCase();});
      if(target)ordered.push(target);
    });
    ordered.forEach(function(card){list.appendChild(card);});
  }

  function install(){
    addStyles();
    var select=document.getElementById('category');
    ensureOption(select,DOCTOR,'odontológico');
    ensureOption(select,NUTRITION,'Vacinação');

    var nurse=document.getElementById('nurseSchedule');
    var dental=document.getElementById('dentalPublicSchedule')||document.getElementById('dentalSchedule');
    var anchor=nurse||dental;
    createProfessionalAgenda('doctorSchedule','Agenda do Médico','🩺',DOCTOR,anchor);
    var doctor=document.getElementById('doctorSchedule');
    createProfessionalAgenda('nutritionSchedule','Agenda da Nutricionista','🥗',NUTRITION,doctor||anchor);

    normalizeDentalDays();
    var dentalList=document.getElementById('dentalPublicDays');
    if(dentalList)new MutationObserver(function(){window.requestAnimationFrame(normalizeDentalDays);}).observe(dentalList,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,250);});
  else setTimeout(install,250);
}());