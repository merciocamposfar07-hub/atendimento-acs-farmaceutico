(function(){
'use strict';

var familiaAtual='';
var familiaScriptCarregando=false;
var familiaCallbacks=[];
var abrirIndividualPendente=false;
var syncTimer=null;

function txt(v){return String(v==null?'':v).trim()}
function familiaConsulta(v){var s=txt(v).replace(/\s+/g,'').toUpperCase();return /^\d{3}[A-Z]?$/.test(s)?s:''}
function familiaEndereco(v){
  var m=txt(v).toUpperCase().match(/(?:,|\b)(\d{1,4}[A-Z]?)(?=\s*[,.\-]|\s+ZONA\b|\s*$)/);
  if(!m)return'';
  var p=m[1].match(/^(\d+)([A-Z]?)$/);
  return p?(('000'+p[1]).slice(-Math.max(3,p[1].length))+p[2]):m[1];
}
function visivel(node){return Boolean(node&&!node.classList.contains('hidden'))}
function results(){return document.getElementById('results')}
function cards(){var root=results();return root?Array.prototype.slice.call(root.querySelectorAll('.card')):[]}
function nomeCard(card){var strong=card&&card.querySelector?card.querySelector('strong'):null;if(strong&&txt(strong.textContent))return txt(strong.textContent);var b=card&&card.querySelector?card.querySelector('button'):null;return txt(b&&b.textContent||'Morador')}

function instalarEstilo(){
  if(document.getElementById('msgFamiliaBuscaV2Style'))return;
  var style=document.createElement('style');
  style.id='msgFamiliaBuscaV2Style';
  style.textContent='\
.msg-familia-acao{margin:0 0 14px;padding:15px;border:3px solid #69c7e7;border-radius:20px;background:#e8f7ee;color:#073a55}\
.msg-familia-acao strong{display:block;font-size:1.18rem}.msg-familia-acao span{display:block;margin-top:4px;color:#365a69;font-weight:800}\
.msg-familia-acao button{display:block!important;width:100%!important;min-height:58px!important;margin-top:12px!important;padding:11px 14px!important;border:3px solid #69c7e7!important;border-radius:18px!important;background:linear-gradient(145deg,#073a55,#0b5878)!important;color:#fff!important;text-align:center!important;font-weight:900!important;font-size:1rem!important;line-height:1.2!important}\
.msg-ind-card-button,.msg-ind-form-button{display:block!important;width:100%!important;min-height:56px!important;margin-top:12px!important;padding:11px 14px!important;border:3px solid #8df0b4!important;border-radius:18px!important;background:#fff!important;color:#073a55!important;text-align:center!important;font-weight:900!important;font-size:1rem!important;line-height:1.2!important;box-shadow:0 5px 14px rgba(7,58,85,.12)!important}\
.msg-ind-form-action{margin:14px 0;padding:13px;border:2px solid #8fd5b0;border-radius:18px;background:#edf9f1}\
.msg-ind-form-action small{display:block;margin-top:7px;color:#365a69;font-weight:750}';
  document.head.appendChild(style);
}

function garantirModuloFamilia(cb){
  if(window.PortalTacsMensagemFamilia){cb();return}
  familiaCallbacks.push(cb);
  if(familiaScriptCarregando)return;
  familiaScriptCarregando=true;
  var s=document.createElement('script');
  s.src='mensagem-familia-v1.js?v=20260820-familia-runtime-v3';
  s.onload=function(){familiaScriptCarregando=false;familiaCallbacks.splice(0).forEach(function(fn){fn()})};
  s.onerror=function(){familiaScriptCarregando=false;familiaCallbacks=[];avisar('Não foi possível carregar a janela de mensagem da família. Tente novamente.','err')};
  document.head.appendChild(s);
}

function avisar(msg,tipo){
  var node=document.getElementById('operationStatus');
  if(!node)return;
  node.textContent=msg;
  node.className='status'+(tipo?' '+tipo:'');
}

function membrosVisuais(lista){return lista.map(function(card){return{nome:nomeCard(card),familiaId:familiaAtual}})}
function removerAcaoFamilia(){var n=document.getElementById('msgFamiliaAcaoBuscaV1');if(n)n.remove()}

function aplicarAcaoFamilia(){
  var root=results(),lista=cards();
  if(!root||!familiaAtual||!lista.length){removerAcaoFamilia();return}
  instalarEstilo();
  var box=document.getElementById('msgFamiliaAcaoBuscaV1');
  if(!box){
    box=document.createElement('div');
    box.id='msgFamiliaAcaoBuscaV1';
    box.className='msg-familia-acao';
    var titulo=document.createElement('strong');
    var contagem=document.createElement('span');
    contagem.setAttribute('data-contagem','1');
    var botao=document.createElement('button');
    botao.type='button';
    botao.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      var atual=familiaConsulta(document.getElementById('query')&&document.getElementById('query').value);
      if(!atual)return;
      familiaAtual=atual;
      var membros=membrosVisuais(cards());
      garantirModuloFamilia(function(){
        var api=window.PortalTacsMensagemFamilia;
        if(api&&typeof api.abrir==='function')api.abrir(familiaAtual,membros);
      });
    });
    box.appendChild(titulo);box.appendChild(contagem);box.appendChild(botao);
    root.insertBefore(box,root.firstChild);
  }
  box.dataset.familia=familiaAtual;
  box.querySelector('strong').textContent='Família '+familiaAtual;
  box.querySelector('[data-contagem]').textContent=lista.length+' morador(es) encontrado(s) neste cadastro.';
  box.querySelector('button').textContent='🔔 Enviar mensagem para toda a família '+familiaAtual;
}

function itemFormulario(){
  var origem=document.getElementById('originSheet'),linha=document.getElementById('originRow'),nome=document.getElementById('name');
  var origemAba=txt(origem&&origem.value),origemLinha=Number(linha&&linha.value||0),nomeCompleto=txt(nome&&nome.value);
  if(!origemAba||origemLinha<2||!nomeCompleto)return null;
  var endereco=txt(document.getElementById('address')&&document.getElementById('address').value);
  return {
    moradorId:txt(document.getElementById('residentId')&&document.getElementById('residentId').value),
    origemAba:origemAba,
    origemLinha:origemLinha,
    nome:nomeCompleto,
    nascimento:txt(document.getElementById('birth')&&document.getElementById('birth').value),
    cpf:txt(document.getElementById('cpf')&&document.getElementById('cpf').value),
    cns:txt(document.getElementById('cns')&&document.getElementById('cns').value),
    endereco:endereco,
    familiaId:familiaEndereco(endereco)
  };
}

function abrirIndividualDoFormulario(){
  var item=itemFormulario();
  if(!item){avisar('Selecione novamente o morador antes de enviar a mensagem.','warn');return false}
  var api=window.PortalTacsMensagemIndividual;
  if(!api||typeof api.abrir!=='function'){avisar('A janela de mensagem individual ainda não está disponível. Reabra o painel.','err');return false}
  api.abrir(item);
  return true;
}

function garantirBotaoFormulario(){
  var area=document.getElementById('formArea'),form=document.getElementById('residentForm');
  if(!area||!form||!visivel(area))return;
  var item=itemFormulario();
  if(!item)return;
  instalarEstilo();
  var box=document.getElementById('msgIndividualFormActionV1');
  if(!box){
    box=document.createElement('div');
    box.id='msgIndividualFormActionV1';
    box.className='msg-ind-form-action';
    var b=document.createElement('button');
    b.type='button';b.className='msg-ind-form-button';b.textContent='🔔 Mensagem individual';
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();abrirIndividualDoFormulario()});
    var note=document.createElement('small');note.textContent='Envia uma notificação Push para o cadastro familiar deste morador.';
    box.appendChild(b);box.appendChild(note);
    var grid=form.querySelector('.grid');
    if(grid&&grid.nextSibling)form.insertBefore(box,grid.nextSibling);else form.appendChild(box);
  }
  if(abrirIndividualPendente){
    abrirIndividualPendente=false;
    setTimeout(abrirIndividualDoFormulario,40);
  }
}

function botaoOriginalCard(card){
  if(!card||!card.children)return null;
  for(var i=0;i<card.children.length;i++){
    var n=card.children[i];
    if(n.tagName==='BUTTON'&&!n.classList.contains('msg-ind-card-button'))return n;
  }
  return null;
}

function garantirBotoesCards(){
  instalarEstilo();
  cards().forEach(function(card){
    if(card.querySelector('.msg-ind-card-button'))return;
    var b=document.createElement('button');
    b.type='button';b.className='msg-ind-card-button';b.textContent='🔔 Mensagem individual';
    b.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      var original=botaoOriginalCard(card);
      if(!original){avisar('Não foi possível selecionar este morador. Tente novamente.','err');return}
      abrirIndividualPendente=true;
      original.click();
      [80,220,500,1000,1800].forEach(function(ms){setTimeout(function(){if(abrirIndividualPendente)garantirBotaoFormulario()},ms)});
    });
    card.appendChild(b);
  });
}

function sincronizar(){
  syncTimer=null;
  var input=document.getElementById('query'),area=document.getElementById('searchArea');
  familiaAtual=familiaConsulta(input&&input.value);
  if(area&&visivel(area)&&cards().length){
    garantirBotoesCards();
    if(familiaAtual)aplicarAcaoFamilia();else removerAcaoFamilia();
  }else if(!familiaAtual){removerAcaoFamilia()}
  garantirBotaoFormulario();
}
function agendarSync(){clearTimeout(syncTimer);syncTimer=setTimeout(sincronizar,45)}
function limparParaNovaBusca(){
  familiaAtual=familiaConsulta(document.getElementById('query')&&document.getElementById('query').value);
  removerAcaoFamilia();
  cards().forEach(function(card){var b=card.querySelector('.msg-ind-card-button');if(b)b.remove()});
  agendarSync();
}

function instalar(){
  var area=document.getElementById('searchArea'),input=document.getElementById('query'),root=results(),formArea=document.getElementById('formArea');
  if(!area||!input||!root||!formArea)return;
  instalarEstilo();
  var p=area.querySelector('h2 + .muted');
  if(p)p.textContent='Busque por nome, CPF, CNS ou número do cadastro familiar (ex.: 002, 012, 072).';
  input.placeholder='Ex.: Maria Adriana ou 012';
  input.addEventListener('input',limparParaNovaBusca,false);
  new MutationObserver(agendarSync).observe(root,{childList:true,subtree:true});
  new MutationObserver(agendarSync).observe(formArea,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  agendarSync();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',instalar,{once:true});else instalar();
})();
