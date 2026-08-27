/**
 * ZZZZ_50_NascimentoCivilBackupGuardV1.gs
 * Portal TACS — proteção de leitura para DATA_NASCIMENTO.
 *
 * Corrige somente registros que comprovadamente constam no backup técnico
 * criado pela antiga correção +1 dia. Não altera planilha, cadastro, Push,
 * agendas, publicações ou qualquer outra coluna.
 */
var TACS_NASCIMENTO_CIVIL_BACKUP_GUARD_V1 = Object.freeze({
  VERSAO: '1.0.0',
  AREA_ID: 'JAPARANDUBA',
  BACKUP_SHEET: 'TACS_BACKUP_NASCIMENTO_V1',
  HEADERS: Object.freeze(['ABA_FONTE','LINHA_FONTE','ID_PORTAL','DATA_ANTES','DATA_DEPOIS','REGISTRADO_EM'])
});

var nascimentoCivilBackupGuardV1LocalizarAnterior_ =
  typeof moradoresAdminV1LocalizarTodosPorDocumento_ === 'function'
    ? moradoresAdminV1LocalizarTodosPorDocumento_
    : null;

(function instalarNascimentoCivilBackupGuardV1_(){
  if(typeof nascimentoCivilBackupGuardV1LocalizarAnterior_!=='function')return;
  moradoresAdminV1LocalizarTodosPorDocumento_=function(fonte,cpf,cns){
    var encontrados=nascimentoCivilBackupGuardV1LocalizarAnterior_(fonte,cpf,cns);
    return nascimentoCivilBackupGuardV1CorrigirResultados_(fonte,encontrados);
  };
})();

function nascimentoCivilBackupGuardV1Civil_(valor){
  var texto=String(valor==null?'':valor).trim();
  var m=texto.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if(!m){
    var iso=texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(iso)m=[texto,iso[3],iso[2],iso[1]];
  }
  if(!m)return null;
  var dia=Number(m[1]),mes=Number(m[2]),ano=Number(m[3]);
  var stamp=Date.UTC(ano,mes-1,dia,12,0,0),data=new Date(stamp);
  if(data.getUTCFullYear()!==ano||data.getUTCMonth()!==mes-1||data.getUTCDate()!==dia)return null;
  return {dia:dia,mes:mes,ano:ano};
}

function nascimentoCivilBackupGuardV1Formatar_(civil){
  return String(civil.dia).padStart(2,'0')+'/'+String(civil.mes).padStart(2,'0')+'/'+String(civil.ano).padStart(4,'0');
}

function nascimentoCivilBackupGuardV1SomarUmDia_(civil){
  var stamp=Date.UTC(civil.ano,civil.mes-1,civil.dia,12,0,0)+86400000;
  var data=new Date(stamp);
  return {dia:data.getUTCDate(),mes:data.getUTCMonth()+1,ano:data.getUTCFullYear()};
}

function nascimentoCivilBackupGuardV1Data_(valor){
  var civil=nascimentoCivilBackupGuardV1Civil_(valor);
  return civil?nascimentoCivilBackupGuardV1Formatar_(civil):'';
}

function nascimentoCivilBackupGuardV1Mapa_(fonte){
  try{
    if(!fonte||!fonte.ss||!fonte.sheet)return null;
    var planilhaEsperada=typeof TACS_MORADORES_ADMIN_V1!=='undefined'
      ?String(TACS_MORADORES_ADMIN_V1.DEFAULT_RESIDENT_SPREADSHEET_ID||'').trim()
      :'';
    if(planilhaEsperada&&typeof fonte.ss.getId==='function'&&String(fonte.ss.getId())!==planilhaEsperada)return null;

    var backup=fonte.ss.getSheetByName(TACS_NASCIMENTO_CIVIL_BACKUP_GUARD_V1.BACKUP_SHEET);
    if(!backup||backup.getLastRow()<2)return null;
    var total=backup.getLastRow();
    var linhas=backup.getRange(1,1,total,TACS_NASCIMENTO_CIVIL_BACKUP_GUARD_V1.HEADERS.length).getDisplayValues();
    if(!linhas.length)return null;
    for(var h=0;h<TACS_NASCIMENTO_CIVIL_BACKUP_GUARD_V1.HEADERS.length;h++){
      if(String(linhas[0][h]||'').trim()!==TACS_NASCIMENTO_CIVIL_BACKUP_GUARD_V1.HEADERS[h])return null;
    }

    var mapa={};
    for(var i=1;i<linhas.length;i++){
      var row=linhas[i];
      var aba=String(row[0]||'').trim(),linha=Number(row[1]||0),idPortal=String(row[2]||'').trim();
      var antes=nascimentoCivilBackupGuardV1Data_(row[3]);
      var depois=nascimentoCivilBackupGuardV1Data_(row[4]);
      var civilAntes=nascimentoCivilBackupGuardV1Civil_(antes);
      if(!aba||!linha||Math.floor(linha)!==linha||!antes||!depois||!civilAntes)continue;
      var esperado=nascimentoCivilBackupGuardV1Formatar_(nascimentoCivilBackupGuardV1SomarUmDia_(civilAntes));
      if(esperado!==depois)continue;
      var chave=aba+'#'+linha;
      if(Object.prototype.hasOwnProperty.call(mapa,chave)){
        mapa[chave]=null;
        continue;
      }
      mapa[chave]={idPortal:idPortal,antes:antes,depois:depois};
    }
    return mapa;
  }catch(erro){
    return null;
  }
}

function nascimentoCivilBackupGuardV1CorrigirResultados_(fonte,encontrados){
  if(!Array.isArray(encontrados)||!encontrados.length)return encontrados;
  var mapa=nascimentoCivilBackupGuardV1Mapa_(fonte);
  if(!mapa)return encontrados;
  return encontrados.map(function(item){
    if(!item||!item.origem||!item.morador)return item;
    var chave=String(item.origem.aba||'').trim()+'#'+Number(item.origem.linha||0);
    var backup=mapa[chave];
    if(!backup)return item;
    var idAtual=String(item.morador.idPortal||'').trim();
    if(backup.idPortal&&idAtual!==backup.idPortal)return item;
    var atual=nascimentoCivilBackupGuardV1Data_(item.morador.nascimento);
    if(atual!==backup.depois)return item;

    var copia={};
    Object.keys(item).forEach(function(k){copia[k]=item[k];});
    copia.morador={};
    Object.keys(item.morador).forEach(function(k){copia.morador[k]=item.morador[k];});
    copia.morador.nascimento=backup.antes;
    return copia;
  });
}
