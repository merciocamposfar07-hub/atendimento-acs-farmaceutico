/**
 * Conecta Saúde Comunitária — Laboratório IA
 * Backend isolado. NÃO integra o Apps Script oficial.
 *
 * Script Properties obrigatórias:
 * OPENAI_API_KEY
 *
 * Opcionais:
 * OPENAI_MODEL (default: gpt-5.6-terra)
 * OPENAI_ESCALATION_MODEL (default: gpt-5.6-sol)
 */
var CONECTA_SUPERVISOR_LAB = Object.freeze({
  CACHE_PREFIX:'conecta_supervisor_lab:',
  CACHE_SECONDS:600,
  MODEL:'gpt-5.6-terra',
  ESCALATION_MODEL:'gpt-5.6-sol'
});

function doPost(e){
  var p=e&&e.parameter?e.parameter:{};
  if(String(p.action||'')!=='supervisor_ia_diagnosticar')return supervisorResponderIframe_({ok:false,message:'Ação inválida.'},String(p.requestId||''));
  var rid=supervisorTexto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,180}$/.test(rid))return supervisorResponderIframe_({ok:false,message:'requestId inválido.'},rid);
  var result;
  try{
    var incident=supervisorJson_(p.incidente),local=supervisorJson_(p.recuperacaoLocal);
    incident=supervisorSanitizar_(incident);
    local=supervisorSanitizar_(local);
    var decision=supervisorOpenAI_(incident,local);
    result={ok:true,decisao:decision,incidenteId:incident.id||'',modelo:decision.modelo||''};
  }catch(err){
    result={ok:false,message:supervisorErro_(err)};
  }
  CacheService.getScriptCache().put(
    CONECTA_SUPERVISOR_LAB.CACHE_PREFIX+rid,
    JSON.stringify({ok:true,pendente:false,result:result}),
    CONECTA_SUPERVISOR_LAB.CACHE_SECONDS
  );
  return supervisorResponderIframe_(result,rid);
}

function doGet(e){
  var p=e&&e.parameter?e.parameter:{},action=supervisorTexto_(p.action),callback=supervisorTexto_(p.callback);
  var out;
  if(action==='supervisor_ia_result'){
    var rid=supervisorTexto_(p.requestId),raw=CacheService.getScriptCache().get(CONECTA_SUPERVISOR_LAB.CACHE_PREFIX+rid);
    out=raw?JSON.parse(raw):{ok:true,pendente:true};
  }else if(action==='supervisor_ia_health'){
    out={ok:true,servico:'Conecta Supervisor IA — laboratório',configurado:!!PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')};
  }else out={ok:false,message:'Ação inválida.'};
  return supervisorJsonp_(callback,out);
}

function supervisorOpenAI_(incident,local){
  var props=PropertiesService.getScriptProperties();
  var key=supervisorTexto_(props.getProperty('OPENAI_API_KEY'));
  if(!key)throw new Error('OPENAI_API_KEY não configurada no Script Properties.');
  var repeated=Number(incident.tentativas||0)>=2;
  var model=supervisorTexto_(props.getProperty(repeated?'OPENAI_ESCALATION_MODEL':'OPENAI_MODEL'))||
    (repeated?CONECTA_SUPERVISOR_LAB.ESCALATION_MODEL:CONECTA_SUPERVISOR_LAB.MODEL);

  var tool={
    type:'function',
    name:'decidir_reparo',
    description:'Escolhe a menor ação segura para recuperar exclusivamente o fluxo causal do incidente do Conecta Saúde Comunitária.',
    strict:true,
    parameters:{
      type:'object',
      additionalProperties:false,
      properties:{
        causa_status:{type:'string',enum:['CONFIRMADA','PROVAVEL','AINDA_ISOLANDO']},
        causa:{type:'string'},
        modulo:{type:'string'},
        arquivo:{type:'string'},
        funcao:{type:'string'},
        linha:{type:'integer'},
        acao:{type:'string',enum:[
          'OBSERVAR',
          'RECARREGAR_MODULO',
          'INVALIDAR_CACHE_MODULO',
          'USAR_ULTIMO_ESTADO_VALIDO',
          'REVALIDAR_SESSAO',
          'REPETIR_REQUISICAO',
          'ISOLAR_MODULO',
          'SOLICITAR_CORRECAO_CODIGO'
        ]},
        justificativa:{type:'string'},
        teste_real_obrigatorio:{type:'string'},
        tocar_apenas:{type:'array',items:{type:'string'}},
        nao_tocar:{type:'array',items:{type:'string'}},
        precisa_codigo_fonte:{type:'boolean'}
      },
      required:['causa_status','causa','modulo','arquivo','funcao','linha','acao','justificativa','teste_real_obrigatorio','tocar_apenas','nao_tocar','precisa_codigo_fonte']
    }
  };

  var instructions=[
    'Você é o Supervisor técnico do laboratório do Conecta Saúde Comunitária.',
    'Objetivo: restaurar operação com rapidez e localizar a causa real.',
    'Nunca invente causa. Se ainda não houver evidência, use AINDA_ISOLANDO.',
    'Nunca mande alterar módulos sem relação causal demonstrada.',
    'Priorize desbloquear interface e restaurar continuidade operacional.',
    'Não declare problema resolvido; a validação real pertence ao aplicativo.',
    'Se o incidente exigir mudança de código, selecione SOLICITAR_CORRECAO_CODIGO e identifique somente o arquivo/função/linha implicados.',
    'CPF, CNS, PIN, tokens e dados pessoais não são necessários ao diagnóstico e já devem estar removidos.'
  ].join('\n');

  var payload={
    model:model,
    instructions:instructions,
    input:JSON.stringify({incidente:incident,recuperacaoLocal:local}),
    tools:[tool],
    tool_choice:{type:'function',name:'decidir_reparo'},
    max_output_tokens:1400
  };
  var response=UrlFetchApp.fetch('https://api.openai.com/v1/responses',{
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer '+key},
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });
  var status=response.getResponseCode(),body=response.getContentText();
  if(status<200||status>=300)throw new Error('OpenAI HTTP '+status+': '+body.slice(0,500));
  var parsed=JSON.parse(body),call=null;
  (parsed.output||[]).some(function(item){
    if(item&&item.type==='function_call'&&item.name==='decidir_reparo'){call=item;return true}
    return false;
  });
  if(!call)throw new Error('A IA não retornou a decisão estruturada esperada.');
  var args=JSON.parse(call.arguments||'{}');
  args.modelo=model;
  args.responseId=supervisorTexto_(parsed.id);
  return supervisorSanitizar_(args);
}

function supervisorSanitizar_(value){
  if(value==null)return value;
  if(Array.isArray(value))return value.map(supervisorSanitizar_);
  if(typeof value==='object'){
    var out={};
    Object.keys(value).forEach(function(k){
      if(/^(?:pin|cpf|cns|token|accessToken|refreshToken|authorization)$/i.test(k)){out[k]='[REMOVIDO]';return}
      out[k]=supervisorSanitizar_(value[k]);
    });
    return out;
  }
  if(typeof value!=='string')return value;
  return value
    .replace(/\b\d{11}\b/g,'[CPF_REMOVIDO]')
    .replace(/\b\d{15}\b/g,'[CNS_REMOVIDO]')
    .replace(/(bearer\s+)[A-Za-z0-9._~+\/-]+=*/ig,'$1[TOKEN_REMOVIDO]')
    .slice(0,12000);
}
function supervisorJson_(v){try{return JSON.parse(String(v||'{}'))}catch(e){return {raw:supervisorTexto_(v)}}}
function supervisorTexto_(v){return String(v==null?'':v).trim()}
function supervisorErro_(e){return supervisorTexto_(e&&e.message||e).slice(0,700)}
function supervisorResponderIframe_(result,requestId){
  var data=JSON.stringify({source:'conecta-supervisor-ia-lab',requestId:requestId,result:result}).replace(/</g,'\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><script>parent.postMessage('+data+',"*");<\/script>');
}
function supervisorJsonp_(callback,obj){
  var json=JSON.stringify(obj).replace(/</g,'\\u003c');
  if(/^[A-Za-z_$][A-Za-z0-9_$\.]{0,120}$/.test(callback||'')){
    return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
