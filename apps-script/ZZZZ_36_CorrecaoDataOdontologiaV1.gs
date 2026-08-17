/**
 * ZZZZ_36_CorrecaoDataOdontologiaV1.gs
 * Portal TACS — correção de data odontológica sem deslocamento de fuso.
 *
 * Problema corrigido:
 * - a data exibida no painel administrativo podia ser 20/08/2026;
 * - ao publicar a agenda odontológica, o mesmo valor Date era formatado
 *   diretamente em America/Recife e podia virar 19/08/2026 quando a
 *   planilha armazenava a data em outro fuso (ex.: UTC).
 *
 * Regra: para campos que representam somente DATA, preservar o dia civil
 * da própria planilha. Strings YYYY-MM-DD continuam literais.
 */
var TACS_CORRECAO_DATA_ODONTOLOGIA_V1='1.0.0';

(function instalarCorrecaoDataOdontologiaV1_(){
  if(typeof agendasProfissionaisTerritoriaisV1Data_!=='function')return;

  agendasProfissionaisTerritoriaisV1Data_=function(v){
    if(!v)return'';

    if(Object.prototype.toString.call(v)==='[object Date]'){
      if(isNaN(v.getTime()))return'';
      var tz='America/Recife';
      try{
        var ss=typeof agendasProfissionaisTerritoriaisV1Planilha_==='function'
          ?agendasProfissionaisTerritoriaisV1Planilha_()
          :SpreadsheetApp.getActiveSpreadsheet();
        if(ss&&typeof ss.getSpreadsheetTimeZone==='function'){
          tz=String(ss.getSpreadsheetTimeZone()||tz);
        }
      }catch(ignore){}
      return Utilities.formatDate(v,tz,'yyyy-MM-dd');
    }

    var s=typeof agendasProfissionaisTerritoriaisV1Texto_==='function'
      ?agendasProfissionaisTerritoriaisV1Texto_(v)
      :String(v==null?'':v).trim();
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m)return m[1]+'-'+m[2]+'-'+m[3];
    m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m?m[3]+'-'+m[2]+'-'+m[1]:'';
  };
})();
