(function(){
  'use strict';

  var CATEGORY='Atendimento com a Enfermeira Chefe';
  var observer=null;

  function addStyles(){
    if(document.getElementById('nurse-public-balloon-style'))return;
    var style=document.createElement('style');
    style.id='nurse-public-balloon-style';
    style.textContent='.nurse-agenda.public-balloon{padding:20px!important;border:2px solid #0d5f8a!important;border-radius:20px!important;background:#eef8fd!important;color:#082b43!important;box-shadow:0 12px 28px rgba(3,35,56,.16)!important}.nurse-agenda.public-balloon small{color:#08763d!important;font-size:17px!important}.nurse-agenda.public-balloon h3{margin:8px 0 10px!important;color:#082b43!important;font-size:29px!important;line-height:1.15!important}.nurse-agenda.public-balloon>p{margin:8px 0 15px!important;color:#324f60!important;font-size:18px!important}.nurse-agenda.public-balloon .nurse-days{display:flex!important;gap:10px!important;overflow-x:auto!important;padding:2px 2px 8px!important;scroll-snap-type:x mandatory!important}.nurse-agenda.public-balloon .nurse-day{flex:0 0 78%!important;min-height:0!important;padding:16px!important;border:2px solid #9db8c6!important;border-radius:16px!important;background:#fff!important;color:#102b3c!important;scroll-snap-align:start!important}.nurse-agenda.public-balloon .nurse-day strong{font-size:21px!important}.nurse-agenda.public-balloon .nurse-day span{font-size:25px!important}.nurse-agenda.public-balloon .nurse-day b{font-size:20px!important}.nurse-agenda.public-balloon .nurse-status{margin-top:10px!important;padding-top:10px!important;color:#315265!important;font-size:17px!important}@media(min-width:700px){.nurse-agenda.public-balloon .nurse-day{flex-basis:42%!important}}';
    document.head.appendChild(style);
  }

  function exposeSchedule(){
    var section=document.getElementById('nurseSchedule');
    if(!section)return false;
    addStyles();
    section.classList.add('public-balloon');
    section.hidden=false;
    section.removeAttribute('hidden');

    if(!section.dataset.publicAgendaFixed){
      section.dataset.publicAgendaFixed='1';
      section.addEventListener('click',function(event){
        var button=event.target.closest&&event.target.closest('.nurse-day');
        if(!button||button.disabled)return;
        var category=document.getElementById('category');
        if(category&&category.value!==CATEGORY){
          category.value=CATEGORY;
          category.dispatchEvent(new Event('change',{bubbles:true}));
        }
        window.setTimeout(function(){section.hidden=false;section.removeAttribute('hidden');},0);
      },true);

      observer=new MutationObserver(function(){
        if(section.hidden||section.hasAttribute('hidden')){
          section.hidden=false;
          section.removeAttribute('hidden');
        }
      });
      observer.observe(section,{attributes:true,attributeFilter:['hidden']});
    }
    return true;
  }

  function install(){
    if(exposeSchedule())return;
    var attempts=0;
    var timer=window.setInterval(function(){attempts+=1;if(exposeSchedule()||attempts>=40)window.clearInterval(timer);},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
}());