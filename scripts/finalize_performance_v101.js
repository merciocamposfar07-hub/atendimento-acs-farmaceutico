const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const p=n=>path.join(ROOT,n);
const read=n=>fs.readFileSync(p(n),'utf8');
const write=(n,s)=>fs.writeFileSync(p(n),s,'utf8');
function one(s,a,b,label){const i=s.indexOf(a);if(i<0)throw new Error('Não encontrado: '+label);if(s.indexOf(a,i+a.length)>=0)throw new Error('Duplicado: '+label);return s.slice(0,i)+b+s.slice(i+a.length)}

let dental=read('portal-odontologia-segunda-sexta.js');
dental=one(dental,
`  function statusText() {\n    if (loading) return slots.length ? 'Agenda exibida. Confirmando as vagas atuais…' : 'Atualizando a agenda odontológica pela planilha...';\n    if (cachedSnapshot) return 'Última agenda recebida exibida. Confirmando a disponibilidade atual ao selecionar uma vaga.';\n    if (!slots.length) return 'Nenhum dia está publicado na planilha odontológica.';\n    if (selection) {\n      if (selection.confirmed) return 'Vaga reservada na agenda. O envio pelo WhatsApp está liberado.';\n      if (selection.explicitFailure) return selection.errorMessage || 'Não foi possível reservar essa vaga.';\n      if (selection.slowSync) return 'Vaga selecionada. A atualização da planilha está demorando, mas o envio pelo WhatsApp já está liberado.';\n      return 'Vaga selecionada. A quantidade foi reduzida no portal e o envio pelo WhatsApp já está liberado.';\n    }\n    return 'Toque na vaga comum ou na vaga de emergência do dia desejado.';\n  }`,
`  function statusText() {\n    if (loading) return slots.length ? 'Agenda exibida. Confirmando as vagas atuais…' : 'Atualizando a agenda odontológica pela planilha...';\n    if (!slots.length) return 'Nenhum dia está publicado na planilha odontológica.';\n    if (selection) {\n      if (selection.confirmed) return 'Vaga reservada na agenda. O envio pelo WhatsApp está liberado.';\n      if (selection.explicitFailure) return selection.errorMessage || 'Não foi possível reservar essa vaga.';\n      if (selection.slowSync) return 'Vaga selecionada. A atualização da planilha está demorando, mas o envio pelo WhatsApp já está liberado.';\n      return 'Vaga selecionada. A quantidade foi reduzida no portal e o envio pelo WhatsApp já está liberado.';\n    }\n    if (cachedSnapshot) return 'Última agenda recebida exibida. Confirmando a disponibilidade atual ao selecionar uma vaga.';\n    return 'Toque na vaga comum ou na vaga de emergência do dia desejado.';\n  }`,'status cached order');

dental=one(dental,
`    loadPromise = fetchAgenda().then(function (data) {\n      applyAgendaData(data, false, Date.now());\n      saveAgendaCache(data);\n      loading = false;`,
`    loadPromise = fetchAgenda().then(function (data) {\n      var pendingSelection = selection;\n      applyAgendaData(data, false, Date.now());\n      saveAgendaCache(data);\n      if (pendingSelection && selection && selection.requestId === pendingSelection.requestId) {\n        var selectedSlot = slotForSelection(pendingSelection);\n        if (selectedSlot) {\n          if (pendingSelection.type === 'emergencial') selectedSlot.emergency = Math.min(Number(selectedSlot.emergency), pendingSelection.optimisticRemaining);\n          else selectedSlot.common = Math.min(Number(selectedSlot.common), pendingSelection.optimisticRemaining);\n        }\n      }\n      loading = false;`,'preserve optimistic during revalidate');
write('portal-odontologia-segunda-sexta.js',dental);

let index=read('index.html');
index=one(index,
`    scheduleMessage();loadDental();updateForm();`,
`    scheduleMessage();updateForm();\n    // A odontologia v98 faz a leitura principal. A rotina antiga fica apenas como fallback\n    // caso o arquivo externo não carregue, evitando duas consultas simultâneas ao Apps Script.\n    setTimeout(function(){if(!window.PortalTacsOdontologiaV98)loadDental()},3000);`,
'disable duplicate initial dental load');
write('index.html',index);

try{fs.unlinkSync(__filename)}catch(e){}
try{fs.unlinkSync(p('.github/workflows/finalizar-desempenho-v101.yml'))}catch(e){}
console.log('PERFORMANCE_V101_FINALIZE_OK');
