(function(){
  'use strict';

  var CATEGORY='Atendimento com a Enfermeira Chefe';
  var observer=null;

  function exposeSchedule(){
    var section=document.getElementById('nurseSchedule');
    if(!section)return false;

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

        window.setTimeout(function(){
          section.hidden=false;
          section.removeAttribute('hidden');
        },0);
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
    var timer=window.setInterval(function(){
      attempts+=1;
      if(exposeSchedule()||attempts>=40)window.clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
}());
