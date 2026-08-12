#!/usr/bin/env python3
from pathlib import Path
p=Path('portal-area-resolver.js')
s=p.read_text(encoding='utf-8')
old="""  function navigateArea(id){
    var next=normalizeArea(id);if(!next)return;
    setArea(next);
    if(next===currentArea()){updateButton();return;}
    try{
"""
new="""  function navigateArea(id){
    var next=normalizeArea(id);if(!next)return;
    var previous=currentArea();
    setArea(next);updateButton();
    if(next===previous)return;
    try{
"""
if old not in s:raise SystemExit('Função de navegação não encontrada')
s=s.replace(old,new,1)
old="""        if(result.encontrado===true&&normalizeArea(result.areaId)){
          var found=normalizeArea(result.areaId);setArea(found);updateButton();
          if(found===currentArea()){setStatus('Área confirmada: '+(text(result.areaNome)||areaName(found))+'.','ok');return;}
          setStatus('Área localizada: '+(text(result.areaNome)||areaName(found))+'. Abrindo o portal correto…','ok');navigateArea(found);return;
        }
"""
new="""        if(result.encontrado===true&&normalizeArea(result.areaId)){
          var found=normalizeArea(result.areaId);var previous=currentArea();
          if(found===previous){setArea(found);updateButton();setStatus('Área confirmada: '+(text(result.areaNome)||areaName(found))+'.','ok');return;}
          setStatus('Área localizada: '+(text(result.areaNome)||areaName(found))+'. Abrindo o portal correto…','ok');navigateArea(found);return;
        }
"""
if old not in s:raise SystemExit('Tratamento de área localizada não encontrado')
s=s.replace(old,new,1)
s=s.replace("'.portal-area-btn:focus-visible", "'body.tema-petroleo .portal-area-btn{background:#073a55;border-color:#69c7e7;color:#fff}.portal-area-btn:focus-visible",1)
s=s.replace("window.PortalTacsAreaResolver=Object.freeze({open:openModal,areas:function(){return fetchAreas(false);},identify:identify,currentArea:currentArea});","window.PortalTacsAreaResolver=Object.freeze({open:openModal,areas:function(){return fetchAreas(false);},identify:identify,currentArea:currentArea,selectArea:navigateArea});",1)
p.write_text(s,encoding='utf-8')

t=Path('scripts/test_public_area_resolver.js')
ts=t.read_text(encoding='utf-8')
needle="""  assert.ok(window.localStorage.getItem('portalTacsMoradorDispositivoV1'));
  console.log('Portal público: Minha área, identificação opcional, fallback e compatibilidade com Japaranduba validados.');
"""
replacement="""  assert.ok(window.localStorage.getItem('portalTacsMoradorDispositivoV1'));
  window.PortalTacsAreaResolver.selectArea('MUNTUNS');
  assert.equal(sets.at(-1),'MUNTUNS','Trocar de área precisa atualizar a área antes da navegação');
  assert.equal(current,'MUNTUNS');
  console.log('Portal público: Minha área, identificação opcional, fallback, troca de território e compatibilidade com Japaranduba validados.');
"""
if needle not in ts:raise SystemExit('Ponto do teste de navegação não encontrado')
t.write_text(ts.replace(needle,replacement,1),encoding='utf-8')
print('Navegação entre áreas corrigida e coberta por teste.')
