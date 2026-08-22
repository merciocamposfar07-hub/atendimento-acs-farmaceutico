(function(){
'use strict';
if(window.PortalTacsCentralSuporteMoradoresV1)return;
window.PortalTacsCentralSuporteMoradoresV1=true;
var TERRITORY_TOKEN_KEY='portalTacsTerritorioTokenV1';
var ADMIN_TOKEN_KEY='portalTacsAdminTokenV1';
var AREA_KEY='portalTacsCentralAreaV1';
function text(v){return String(v==null?'':v).trim()}
function normArea(v){return text(v).toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,64)}
function areaId(){var select=document.getElementById('adminArea'),a=normArea(select&&select.value);if(a)return a;try{a=normArea(localStorage.getItem(AREA_KEY)||'')}catch(e){}return a||'JAPARANDUBA'}
function hasTerritorySession(){try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||''))}catch(e){return false}}
function hasAnySession(){try{return Boolean(text(sessionStorage.getItem(TERRITORY_TOKEN_KEY)||'')||text(sessionStorage.getItem(ADMIN_TOKEN_KEY)||''))}catch(e){return false}}
function openSupport(button){if(!hasAnySession())return;var viewer=document.getElementById('viewer'),frame=document.getElementById('viewerFrame'),title=document.getElementById('viewerTitle');if(!viewer||!frame)return;var url='/atendimento-acs-farmaceutico/painel-suporte-moradores-v2.html?area='+encodeURIComponent(areaId())+(hasTerritorySession()?'&acesso=tacs':'')+'&v=20260822-suporte-moradores-v2';if(title)title.textContent='Suporte aos moradores';frame.src=url;viewer.hidden=false;document.body.classList.add('viewer-open');try{button.blur()}catch(e){}}
function install(){var grid=document.getElementById('moduleGrid');if(!grid||grid.dataset.suporteMoradoresV1==='1')return;grid.dataset.suporteMoradoresV1='1';grid.addEventListener('click',function(event){var button=event.target&&event.target.closest?event.target.closest('.module[data-module="suporte"]'):null;if(!button||button.hidden||button.disabled)return;event.preventDefault();event.stopPropagation();openSupport(button)},false)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();window.addEventListener('pageshow',install);
}());
