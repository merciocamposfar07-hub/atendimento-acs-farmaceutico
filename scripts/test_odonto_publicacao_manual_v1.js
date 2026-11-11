'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root=require('node:path').resolve(__dirname,'..');
const territory=fs.readFileSync(root+'/apps-script/ZZZZ_28_AgendasProfissionaisTerritoriaisV1.gs','utf8');
const publicServer=fs.readFileSync(root+'/apps-script/ZZ_12_PublicoAgendasPortalV1.gs','utf8');
const booking=fs.readFileSync(root+'/apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs','utf8');
const native=fs.readFileSync(root+'/conecta-agendas-native-v1.js','utf8');
const portal=fs.readFileSync(root+'/portal-odontologia-segunda-sexta.js','utf8');
function expectPart(s,part,msg){assert.ok(s.includes(part),msg)}
const match=territory.match(/function agendasProfissionaisTerritoriaisV1OdontoPublicada_\(item\)\{[\s\S]*?\n\}/);
assert.ok(match,'Helper de autorização manual ausente');
const allowed=new Function('agendasProfissionaisTerritoriaisV1Data_','agendasProfissionaisTerritoriaisV1Texto_',match[0]+';return agendasProfissionaisTerritoriaisV1OdontoPublicada_;')(
  value=>String(value||'').slice(0,10),value=>String(value==null?'':value).trim()
);
assert.equal(allowed({DATA:'2026-11-12',ODONTO_PUBLICADA_DATA:'2026-11-12',ENCERRA_HORARIO:'11:00'}),true);
assert.equal(allowed({DATA:'2026-11-16',ODONTO_PUBLICADA_DATA:'',ENCERRA_HORARIO:'11:00'}),false);
assert.equal(allowed({DATA:'2026-11-17',ODONTO_PUBLICADA_DATA:'2026-11-10',ENCERRA_HORARIO:'11:00'}),false);
assert.equal(allowed({DATA:'2026-11-12',ODONTO_PUBLICADA_DATA:'2026-11-12',ENCERRA_HORARIO:''}),false);
const start=territory.indexOf('function agendasProfissionaisTerritoriaisV1AtualizarApenasDatas_(');
const end=territory.indexOf('function agendasProfissionaisTerritoriaisV1Tabela_(',start);
assert.ok(start>=0&&end>start);
const updater=territory.slice(start,end);
expectPart(updater,"==='odontologia')continue;",'Atualização automática ainda altera odontologia');
expectPart(updater,"agendasProfissionaisTerritoriaisV1DataSemanal_(dias[i][0])",'Agendas não odontológicas perderam recorrência');
expectPart(publicServer,"modulo !== 'odontologia' && typeof agendasProfissionaisTerritoriaisV1DataSemanal_",'Publicação pública ainda avança a data odontológica');
expectPart(publicServer,"odontoPublicadaData: indice(['ODONTO_PUBLICADA_DATA'], false)",'Publicação pública não valida autorização');
expectPart(booking,'agendasProfissionaisTerritoriaisV1OdontoPublicada_(alvoItem)','Reserva não exige liberação manual');
expectPart(booking,"VERSAO:'2.4.0'",'Versão odontológica não foi atualizada');
expectPart(native,'Data do atendimento (manual)','Data de dentista não está editável');
expectPart(portal,'!configuredExpiry(raw)','Portal odontológico aceita agenda sem expiração');
expectPart(portal,'setInterval(pruneExpiredSlots, 1000)','Portal não verifica expiração continuamente');
console.log('ODONTO_MANUAL_TESTS_OK: publicação manual, reciclagem bloqueada, expiração e isolamento');
