/* Visualizador privado UBS: renderiza cada página, sem depender da prévia PDF do Safari. */
if(!Promise.withResolvers)Promise.withResolvers=function(){var resolve,reject,promise=new Promise(function(r,j){resolve=r;reject=j});return {promise:promise,resolve:resolve,reject:reject}};
const status=document.getElementById('status'),pages=document.getElementById('pages'),record=window.CSC_UBS_PDF;
const root='https://merciocamposfar07-hub.github.io/atendimento-acs-farmaceutico/';
async function start(){
 const raw=atob(record.base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const file=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(file),download=document.getElementById('download');download.href=url;download.download=record.nome;
 const library=await import('./vendor/pdfjs-4.10.min.js');library.GlobalWorkerOptions.workerSrc=root+'vendor/pdfjs-worker-4.10.min.js';
 const pdf=await library.getDocument({data:bytes,isEvalSupported:false,disableAutoFetch:true,disableStream:true}).promise;
 const total=pdf.numPages;
 status.textContent=total>1?'PDF recebido: '+total+' páginas. Receita/requisição: '+(total-1)+' página(s).':'PDF recebido com apenas 1 página. Confira se a receita/requisição foi anexada.';
 const docButton=document.getElementById('showDocument'),cardButton=document.getElementById('showCard');
 if(total<2)docButton.hidden=true;
 let sequence=Promise.resolve();const rendered=new Map(),containers=new Map();
 function render(number){
  if(rendered.has(number))return rendered.get(number);
  const promise=sequence.then(async()=>{
   const wrapper=containers.get(number),page=await pdf.getPage(number),base=page.getViewport({scale:1});
   const width=Math.min(1000,Math.max(240,document.documentElement.clientWidth-24)),ratio=Math.min(2,window.devicePixelRatio||1),viewport=page.getViewport({scale:width/base.width*ratio});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width='100%';canvas.style.height='auto';canvas.style.display='block';canvas.setAttribute('aria-label','Página '+number+' de '+total+' do PDF');
   await page.render({canvasContext:canvas.getContext('2d'),viewport:viewport}).promise;
   wrapper.querySelector('.pageLoading').remove();wrapper.appendChild(canvas);wrapper.style.minHeight='0';page.cleanup();
  });sequence=promise.catch(()=>{});rendered.set(number,promise);return promise;
 }
 for(let number=1;number<=total;number++){
  const wrapper=document.createElement('section');wrapper.dataset.page=number;wrapper.style.cssText='margin:12px 0;min-height:300px;background:#fff;color:#062c46;border-radius:10px;overflow:hidden';
  const title=document.createElement('p');title.style.cssText='padding:12px;margin:0;font-weight:bold';title.textContent=(number===1&&total>1?'Card da solicitação':'Receita / requisição')+' — página '+number+' de '+total;
  const loading=document.createElement('p');loading.className='pageLoading';loading.style.padding='20px';loading.textContent='AGUARDE… carregando esta página.';wrapper.append(title,loading);pages.appendChild(wrapper);containers.set(number,wrapper);
 }
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting&&!entry.target.hidden){observer.unobserve(entry.target);render(Number(entry.target.dataset.page)).catch(showError)}})},{rootMargin:'500px'}):null;
 function show(card){
  containers.forEach((wrapper,number)=>{wrapper.hidden=total>1?(card?number!==1:number===1):false;if(!wrapper.hidden){if(observer)observer.observe(wrapper);else render(number).catch(showError)}});
  docButton.setAttribute('aria-pressed',String(!card));cardButton.setAttribute('aria-pressed',String(card));
  render(card||total===1?1:2).catch(showError);
 }
 docButton.onclick=()=>show(false);cardButton.onclick=()=>show(true);cardButton.hidden=total===1;show(false);
}
function showError(error){status.textContent='Não foi possível mostrar todas as páginas nesta tela. Use “Baixar PDF completo” para abrir o arquivo original.';console.error('UBS PDF viewer:',error&&error.message||error)}
start().catch(showError);
