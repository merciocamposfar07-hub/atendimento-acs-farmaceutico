'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const maintenanceClient = read('portal-manutencao.js');
const maintenanceBackend = read('apps-script/ZZZZ_16_PortalManutencaoNotificacoesV1.gs');
const residentEntry = read('portal-identificacao-familia-v1.js');
const residentSession = read('conecta-morador-session-v1.js');
const residentBackend = read('apps-script/ZZZZ_51_AcessoUnificadoConectaV1.gs');
const dentalClient = read('portal-odontologia-segunda-sexta.js');
const dentalBackend = read('apps-script/ZZZZ_36_CorrecaoDataOdontologiaV1.gs');
const portalHtml = read('index.html');

for (const [name, source] of [
  ['portal-manutencao.js', maintenanceClient],
  ['ZZZZ_16_PortalManutencaoNotificacoesV1.gs', maintenanceBackend],
  ['portal-identificacao-familia-v1.js', residentEntry],
  ['conecta-morador-session-v1.js', residentSession],
  ['ZZZZ_51_AcessoUnificadoConectaV1.gs', residentBackend],
  ['portal-odontologia-segunda-sexta.js', dentalClient],
  ['ZZZZ_36_CorrecaoDataOdontologiaV1.gs', dentalBackend]
]) {
  new vm.Script(source, {filename:name});
}

assert.match(maintenanceClient, /chaveTacsTeste/);
assert.match(maintenanceClient, /bloqueada:ativa&&!bypass/);
assert.match(maintenanceClient, /function disponivel\(\)\{return !estado\.bloqueada\}/);
assert.match(maintenanceBackend, /aparelhoTacsTesteV1TokenValido_/);
assert.match(maintenanceBackend, /status\.bypassTacsTeste=bypass/);
assert.match(maintenanceBackend, /status\.bloqueada=status\.ativa&&!bypass/);

assert.match(residentEntry, /portalConectaMoradorQuickTesteV1/);
assert.match(residentEntry, /portalConectaMoradorTokenTesteV1/);
assert.ok(residentEntry.includes('/^cmtq1\\./'), 'QuickKey de teste precisa ser separado do QuickKey real.');
assert.match(residentEntry, /modoTacsTeste/);
assert.match(residentEntry, /\(!administrativeDeviceLocal\(\)\|\|tacsTeste\(\)\)/);
assert.match(residentEntry, /Nenhum cadastro real foi alterado/);

assert.match(residentBackend, /TEST_ACCESS_PREFIX:'TACS_CONECTA_TEST_ACCESS_V1:'/);
assert.match(residentBackend, /TEST_SESSION_PREFIX:'tacs_conecta_teste_sessao_'/);
assert.match(residentBackend, /conectaAcessoV1AparelhoTesteValido_/);
assert.match(residentBackend, /conectaAcessoV1TratarMoradorTeste_/);
assert.match(residentBackend, /conectaAcessoV1TesteCriarPin_/);
assert.match(residentBackend, /conectaAcessoV1TesteLogin_/);
assert.match(residentBackend, /cmtq1/);
assert.match(residentBackend, /cmts1/);
assert.match(residentBackend, /PIN fictício criado somente para este teste administrativo/);
assert.match(residentBackend, /CPF usado somente nesta simulação\. Nenhum cadastro real foi alterado/);
assert.match(residentBackend, /r\.notificacoesAtivas=true;r\.atualizadoEm=Date\.now\(\)/);
assert.match(residentBackend, /Etapa de notificações validada no modo teste/);

assert.match(residentSession, /portalConectaMoradorBootstrapTesteV2/);
assert.match(residentSession, /function testMode\(\)/);
assert.match(residentSession, /modoTacsTeste/);
assert.match(residentSession, /if\(!teste\)try\{sessionStorage\.removeItem\('portalTacsAdminTokenV1'\)/);

assert.match(dentalClient, /function tacsTestCredential\(\)/);
assert.match(dentalClient, /params\.set\('modoTacsTeste', 'SIM'\)/);
assert.match(dentalBackend, /TESTE_NAO_AUTORIZADO/);
assert.match(dentalBackend, /Vaga validada no modo teste\. Nenhuma vaga real foi consumida/);
assert.match(residentBackend, /conecta_morador_membro_salvar_cpf'\)resultado=conectaAcessoV1SalvarCpfMembro_/);
assert.match(dentalClient, /TESTE ADMINISTRATIVO — NÃO REGISTRAR COMO SOLICITAÇÃO REAL/);
assert.match(portalHtml, /TESTE ADMINISTRATIVO — NÃO REGISTRAR COMO SOLICITAÇÃO REAL/);

assert.match(portalHtml, /add\('modoTacsTeste','SIM'\)/);
assert.match(portalHtml, /portalTacsAparelhoTesteTokenV3:/);
for (const asset of [
  'portal-manutencao.js',
  'portal-identificacao-familia-v1.js',
  'portal-odontologia-segunda-sexta.js',
  'conecta-morador-session-v1.js'
]) {
  assert.ok(
    portalHtml.includes(asset+'?v=20260918-espelho-morador-admin-v1'),
    'Cache bust ausente em '+asset
  );
}

function testDentalDoesNotConsumeRealSlot() {
  const DATE='2099-08-24';
  const RESERVA_HEADERS=['CODIGO_SOLICITACAO','REGISTRADA_EM','DATA_CONSULTA','TIPO_VAGA','SITUACAO','VAGAS_RESTANTES','AREA_ID','ATUALIZADO_EM'];
  let common=2, emergency=1, setCount=0, lockCount=0, releaseCount=0;
  const reservationRows=[];

  const reservaSheet={
    getLastColumn(){return RESERVA_HEADERS.length;},
    getRange(row,col,rowCount,colCount){
      return {
        getDisplayValues(){
          if(row===1) return [RESERVA_HEADERS.slice(col-1,col-1+colCount)];
          return [[]];
        },
        setValues(){throw new Error('Schema de reservas já deveria estar completo.');}
      };
    }
  };

  const agendaSheet={
    getRange(_row,col){
      return {
        getDisplayValues(){return [[col===4?DATE:'']];},
        setValue(value){
          if(col===1) common=Number(value);
          else if(col===2) emergency=Number(value);
          setCount+=1;
          return this;
        }
      };
    }
  };

  const ss={
    getSheetByName(name){
      return name==='RESERVAS'?reservaSheet:name==='PAINEL_PROFISSIONAIS'?agendaSheet:null;
    }
  };

  const agendaTable={
    sheet:agendaSheet,
    headers:['VAGAS_COMUNS','VAGAS_EMERGENCIAIS','ATUALIZADO_EM','DATA'],
    rows:[{row:2,values:[common,emergency,'',DATE]}]
  };
  const reservaTable={sheet:reservaSheet,headers:RESERVA_HEADERS,rows:reservationRows};

  const context=vm.createContext({
    console, Date, JSON, Math, Object, Array, String, Number, RegExp,
    TACS_AGENDAS_PROFISSIONAIS_TERRITORIAIS_V1:{
      AREA_PADRAO:'JAPARANDUBA',
      ABA_RESERVAS:'RESERVAS',
      RESERVA_HEADERS,
      ABA_AGENDAS:'PAINEL_PROFISSIONAIS',
      AGENDA_HEADERS:['VAGAS_COMUNS','VAGAS_EMERGENCIAIS','ATUALIZADO_EM','DATA']
    },
    Utilities:{
      formatDate(_date,_tz,pattern){
        return pattern==='yyyy-MM-dd'?'2099-08-23':'23/08/2099 10:00';
      }
    },
    LockService:{
      getScriptLock(){
        return {
          tryLock(){lockCount+=1;return true;},
          releaseLock(){releaseCount+=1;}
        };
      }
    },
    SpreadsheetApp:{flush(){}},
    agendasProfissionaisTerritoriaisV1AreaId_(value){return String(value||'').toUpperCase();},
    agendasProfissionaisTerritoriaisV1Planilha_(){return ss;},
    agendasProfissionaisTerritoriaisV1Tabela_(_ss,name){return name==='RESERVAS'?reservaTable:agendaTable;},
    agendasProfissionaisTerritoriaisV1Encontrar_(){return null;},
    agendasProfissionaisTerritoriaisV1Objeto_(_headers,values){
      if(values&&values.CODIGO_SOLICITACAO) return values;
      return {
        MODULO:'odontologia',
        DATA:DATE,
        ATIVO:true,
        SITUACAO:'Atendimento',
        VAGAS_COMUNS:common,
        VAGAS_EMERGENCIAIS:emergency,
        ATUALIZADO_EM:''
      };
    },
    agendasProfissionaisTerritoriaisV1LinhasArea_(){
      agendaTable.rows[0].values=[common,emergency,'',DATE];
      return agendaTable.rows;
    },
    agendasProfissionaisTerritoriaisV1Modulo_(value){return String(value||'').toLowerCase();},
    agendasProfissionaisTerritoriaisV1Booleano_(value){
      return value===true||String(value).toLowerCase()==='true';
    },
    agendasProfissionaisTerritoriaisV1Indice_(_table,field,required){
      const map={VAGAS_COMUNS:0,VAGAS_EMERGENCIAIS:1,ATUALIZADO_EM:2,DATA:3,ENCERRA_HORARIO:-1};
      const v=Object.prototype.hasOwnProperty.call(map,field)?map[field]:-1;
      if(v<0&&required!==false) throw new Error('Campo ausente '+field);
      return v;
    },
    agendasProfissionaisTerritoriaisV1Adicionar_(_table,item){
      reservationRows.push(Object.assign({},item));
    },
    agendasProfissionaisTerritoriaisV1NaoNegativo_(value){return Math.max(0,Number(value)||0);},
    agendasProfissionaisTerritoriaisV1Normalizar_(value){return String(value||'').trim().toUpperCase();},
    agendasProfissionaisTerritoriaisV1Data_(value){return String(value||'');},
    agendasProfissionaisTerritoriaisV1ResponderJson_(x){return x;},
    agendasProfissionaisTerritoriaisV1ResponderReserva_(_n,x){return x;},
    aparelhoTacsTesteV1TokenValido_(device,area,key){
      return device==='iphone-teste'&&area==='JAPARANDUBA'&&key==='chave-teste';
    }
  });

  vm.runInContext(dentalBackend,context);
  const result=context.correcaoDataOdontologiaV1Reservar_({
    areaId:'JAPARANDUBA',
    requestId:'MATIAS-240899-TEST',
    date:DATE,
    type:'comum',
    modoTacsTeste:'SIM',
    dispositivo:'iphone-teste',
    chaveTacsTeste:'chave-teste'
  });

  assert.equal(result.ok,true);
  assert.equal(result.teste,true);
  assert.equal(result.remaining,2);
  assert.equal(common,2,'Modo teste não pode consumir vaga real.');
  assert.equal(reservationRows.length,0,'Modo teste não pode criar reserva real.');
  assert.equal(setCount,0,'Modo teste não pode escrever na agenda.');
  assert.equal(lockCount,1);
  assert.equal(releaseCount,1);
}

testDentalDoesNotConsumeRealSlot();
console.log('ESPELHO_MORADOR_ADMIN_V1_OK: manutenção seletiva, PIN/sessão isolados, reentrada persistente e vaga sem consumo real validados.');
