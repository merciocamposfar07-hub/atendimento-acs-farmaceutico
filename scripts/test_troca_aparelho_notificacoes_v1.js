'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const FAMILY=fs.readFileSync(path.join(ROOT,'apps-script/ZZZZ_37_VinculoFamiliarNotificacoesV1.gs'),'utf8');
const HEALTH=fs.readFileSync(path.join(ROOT,'portal-notification-health.js'),'utf8');
const AUTOFILL=fs.readFileSync(path.join(ROOT,'moradores-autofill.js'),'utf8');
new vm.Script(FAMILY,{filename:'ZZZZ_37_VinculoFamiliarNotificacoesV1.gs'});
new vm.Script(HEALTH,{filename:'portal-notification-health.js'});
new vm.Script(AUTOFILL,{filename:'moradores-autofill.js'});

class Range{
  constructor(sheet,row,col,rows,cols){this.sheet=sheet;this.row=row;this.col=col;this.rows=rows||1;this.cols=cols||1;}
  getDisplayValues(){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>String(this.sheet.rows[this.row-1+r]?.[this.col-1+c]??'')));}
  setValues(values){for(let r=0;r<values.length;r++)for(let c=0;c<values[r].length;c++){while(this.sheet.rows.length<this.row+r)this.sheet.rows.push([]);this.sheet.rows[this.row-1+r][this.col-1+c]=values[r][c];}return this;}
}
class Sheet{
  constructor(rows){this.rows=rows||[];}
  getLastRow(){return this.rows.length;}
  getRange(r,c,rs,cs){return new Range(this,r,c,rs,cs);}
  appendRow(row){this.rows.push([...row]);return this;}
}

const headers=['SUBSCRIPTION_ID','AREA_ID','FAMILIA_ID','ID_PORTAL_REFERENCIA','NOME_REFERENCIA','ORIGEM_VINCULO','VINCULADO_EM','ATUALIZADO_EM'];
const familySheet=new Sheet([headers]);
const book={getSheetByName:()=>familySheet};
let now=0;
const baseCheckins=[];

const context=vm.createContext({
  console,Date,JSON,Math,Object,Array,String,Number,RegExp,
  moradoresAdminV1NormalizarAreaId_(v){return String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'');},
  tacsTerritorioV1Planilha_:()=>book,
  saudeNotificacoesV1GarantirSheet_:()=>familySheet,
  saudeNotificacoesV1Data_:()=>`23/08/2026 15:20:${String(++now).padStart(2,'0')}`,
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  saudeNotificacoesV1CheckinPublico_(payload){baseCheckins.push({...payload});return {ok:true,registrado:true};},
  saudeNotificacoesV1SaudeAdmin_(){return {ok:true,aparelhos:[]};}
});
vm.runInContext(FAMILY,context);

const SUB_OLD='11111111-1111-1111-1111-111111111111';
const SUB_NEW='22222222-2222-2222-2222-222222222222';
const AREA='JAPARANDUBA';
const MARIA={familiaId:'024',idPortal:'72',nome:'Maria'};

// Novo navegador/aparelho ainda sem referência reconhecida: registra o canal técnico,
// mas não inventa nem revela família.
context.vinculoFamiliarNotifV1ResolverLegado_=()=>null;
context.vinculoFamiliarNotifV1ResolverMoradorDocumento_=()=>null;
context.vinculoFamiliarNotifV1ReconciliarReferencia_=v=>v;
let first=context.saudeNotificacoesV1CheckinPublico_({subscriptionId:SUB_NEW,areaId:AREA});
assert.equal(first.vinculadoFamilia,false,'Aparelho novo sem identificação validada não pode receber família por suposição.');
assert.equal(first.familiaId,'');
assert.equal(familySheet.rows.length,1,'Nenhum vínculo familiar deve ser criado antes da identificação validada.');

// Depois que um CPF/CNS reconhecido identifica uma pessoa da família, a MESMA nova
// Subscription passa a ser vinculada à família, sem depender do número de telefone.
context.vinculoFamiliarNotifV1ResolverMoradorDocumento_=doc=>doc==='DOC_MARIA'?MARIA:null;
let linked=context.saudeNotificacoesV1CheckinPublico_({subscriptionId:SUB_NEW,areaId:AREA,documento:'DOC_MARIA'});
assert.equal(linked.vinculadoFamilia,true);
assert.equal(linked.familiaId,'024');
assert.equal(familySheet.rows.length,2,'A nova Subscription deve criar um vínculo próprio com a família.');
assert.equal(String(familySheet.rows[1][0]).toLowerCase(),SUB_NEW);

// Um segundo aparelho da mesma família deve coexistir; não substitui o aparelho novo.
context.vinculoFamiliarNotifV1Gravar_(SUB_OLD,AREA,MARIA,'DOCUMENTO_VALIDADO');
assert.equal(familySheet.rows.length,3,'Dois aparelhos da mesma família precisam permanecer como dois vínculos distintos.');
const subscriptions=familySheet.rows.slice(1).map(r=>String(r[0]).toLowerCase()).sort();
assert.deepEqual(subscriptions,[SUB_OLD,SUB_NEW].sort());
assert.equal(familySheet.rows[1][2],'024');
assert.equal(familySheet.rows[2][2],'024');

// Repetir check-in da mesma Subscription atualiza a linha existente, sem duplicar.
context.vinculoFamiliarNotifV1Gravar_(SUB_NEW,AREA,MARIA,'DOCUMENTO_VALIDADO');
assert.equal(familySheet.rows.length,3,'Retry da mesma Subscription não pode duplicar o aparelho.');

// Beneficiário de outra família no mesmo aparelho não pode roubar/revincular o canal.
const before=JSON.stringify(familySheet.rows);
const protectedLink=context.vinculoFamiliarNotifV1Gravar_(SUB_NEW,AREA,{familiaId:'999',idPortal:'999',nome:'Outra pessoa'},'DOCUMENTO_VALIDADO');
assert.equal(protectedLink.familiaId,'024');
assert.equal(JSON.stringify(familySheet.rows),before,'Outro beneficiário não pode trocar a família já vinculada à Subscription.');

// O reconhecimento técnico do canal é OneSignal Subscription ID; telefone/celular/WhatsApp
// não participam da decisão de aparelho novo.
assert(HEALTH.includes('subscriptionId:text(push&&push.id).toLowerCase()'),'O Portal precisa ler a Subscription ID do OneSignal.');
const stateStart=HEALTH.indexOf('function state()');
const stateEnd=HEALTH.indexOf('function waitSubscriptionState',stateStart);
const stateBlock=HEALTH.slice(stateStart,stateEnd);
assert(!/telefone|celular|whatsapp|phoneNumber|mobileNumber/i.test(stateBlock),'Telefone não pode identificar o aparelho.');
const checkinStart=HEALTH.indexOf('function checkin(options)');
const checkinEnd=HEALTH.indexOf('function scheduleCheckin',checkinStart);
const checkinBlock=HEALTH.slice(checkinStart,checkinEnd);
assert(checkinBlock.includes('subscriptionId:st.subscriptionId'));
assert(!/telefone|celular|whatsapp|phoneNumber|mobileNumber/i.test(checkinBlock),'Check-in do aparelho não pode depender do número telefônico.');

// A memória local de família é apenas contexto auxiliar por área; em perfil/browser novo ela
// pode estar vazia e o servidor exige nova referência reconhecida, sem fingerprint invasivo.
assert(AUTOFILL.includes("FAMILY_STORAGE_PREFIX = 'portalTacsFamiliaAutofillV1:'"));
assert(AUTOFILL.includes('localStorage.getItem(familyStorageKey())'));
assert(!/imei|serialNumber|deviceFingerprint|fingerprintjs/i.test(HEALTH+AUTOFILL),'Não deve haver fingerprint invasivo para tentar identificar hardware físico.');

// Troca de aparelho não pode apagar silenciosamente o canal antigo.
assert(!/deleteRow\s*\(/.test(FAMILY),'O vínculo familiar não pode excluir automaticamente a inscrição anterior ao adicionar outra.');

assert.equal(context.vinculoFamiliarNotifV1Decidir_(null,MARIA).acao,'VINCULAR');
assert.equal(context.vinculoFamiliarNotifV1Decidir_({familiaId:'024'},MARIA).acao,'MESMA_FAMILIA');
assert.equal(context.vinculoFamiliarNotifV1Decidir_({familiaId:'024'},{familiaId:'999'}).acao,'OUTRA_FAMILIA');

console.log('TROCA_APARELHO_NOTIFICACOES_V1_OK: nova Subscription independente do telefone, vínculo familiar só após referência validada, múltiplos aparelhos coexistem e beneficiário não troca o vínculo.');
