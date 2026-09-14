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
  var action=String(p.action||'');if(action!=='supervisor_ia_diagnosticar'&&action!=='supervisor_ia_pesquisar_melhoria')return supervisorResponderIframe_({ok:false,message:'Ação inválida.'},String(p.requestId||''));
  var rid=supervisorTexto_(p.requestId);
  if(!/^[A-Za-z0-9_-]{8,180}$/.test(rid))return supervisorResponderIframe_({ok:false,message:'requestId inválido.'},rid);
  var result;
  try{
    var incident=supervisorSanitizar_(supervisorJson_(p.incidente));
    if(action==='supervisor_ia_pesquisar_melhoria'){
      var decisionIn=supervisorSanitizar_(supervisorJson_(p.decisao));
      result={ok:true,pesquisa:supervisorPesquisarMelhoriaOnline_(incident,decisionIn),incidenteId:incident.id||''};
    }else{
      var local=supervisorSanitizar_(supervisorJson_(p.recuperacaoLocal));
      var decision=supervisorOpenAI_(incident,local);
      decision=supervisorRefinarComCodigoSeNecessario_(incident,local,decision);
      var codigo=null;if(decision.acao==='SOLICITAR_CORRECAO_CODIGO')codigo=supervisorTentarCorrecaoCodigo_(incident,decision);
      result={ok:true,decisao:decision,codigo:codigo,incidenteId:incident.id||'',modelo:decision.modelo||''};
    }
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

  var tool=supervisorDecisionTool_();

  var instructions=[
    'Você é o Supervisor técnico do laboratório do Conecta Saúde Comunitária.',
    'Objetivo: restaurar operação com rapidez e localizar a causa real.',
    'Nunca invente causa. Se ainda não houver evidência, use AINDA_ISOLANDO.',
    'Separe rigorosamente gargalo interno do Conecta, internet/rede e serviço externo. Se a telemetria não permitir separar rede de servidor, use INDETERMINADO ou MISTO e descreva exatamente a fronteira conhecida.',
    'Só marque codigo_responsavel_confirmado=true quando arquivo/bloco causal estiver sustentado por stack, linha, telemetria ou inspeção do código.',
    'Nunca mande alterar módulos sem relação causal demonstrada.',
    'Priorize desbloquear interface e restaurar continuidade operacional.',
    'Não declare problema resolvido; a validação real pertence ao aplicativo.',
    'Se o incidente exigir mudança de código, selecione SOLICITAR_CORRECAO_CODIGO somente quando a causa interna e o bloco causal estiverem confirmados.',
    'Recomende pesquisa online somente quando documentação/padrões atuais puderem melhorar a solução. Pesquisa não pode bloquear a função normal do aplicativo.',
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

function supervisorDecisionTool_(){
  return {
    type:'function',name:'decidir_reparo',description:'Escolhe a menor ação segura para recuperar exclusivamente o fluxo causal do incidente do Conecta Saúde Comunitária.',strict:true,
    parameters:{
      type:'object',additionalProperties:false,
      properties:{
        causa_status:{type:'string',enum:['CONFIRMADA','PROVAVEL','AINDA_ISOLANDO']},
        origem_gargalo:{type:'string',enum:['CONECTA_INTERNO','REDE','SERVICO_EXTERNO','MISTO','INDETERMINADO']},
        evidencia_origem:{type:'string'},codigo_responsavel_confirmado:{type:'boolean'},causa:{type:'string'},
        modulo:{type:'string'},arquivo:{type:'string'},funcao:{type:'string'},linha:{type:'integer'},
        acao:{type:'string',enum:['OBSERVAR','RECARREGAR_MODULO','INVALIDAR_CACHE_MODULO','USAR_ULTIMO_ESTADO_VALIDO','REVALIDAR_SESSAO','REPETIR_REQUISICAO','ISOLAR_MODULO','SOLICITAR_CORRECAO_CODIGO']},
        justificativa:{type:'string'},teste_real_obrigatorio:{type:'string'},
        tocar_apenas:{type:'array',items:{type:'string'}},nao_tocar:{type:'array',items:{type:'string'}},
        precisa_codigo_fonte:{type:'boolean'},pesquisa_online_recomendada:{type:'boolean'},tema_pesquisa:{type:'string'},beneficio_esperado:{type:'string'}
      },
      required:['causa_status','origem_gargalo','evidencia_origem','codigo_responsavel_confirmado','causa','modulo','arquivo','funcao','linha','acao','justificativa','teste_real_obrigatorio','tocar_apenas','nao_tocar','precisa_codigo_fonte','pesquisa_online_recomendada','tema_pesquisa','beneficio_esperado']
    }
  };
}
function supervisorRefinarComCodigoSeNecessario_(incident,local,decision){
  if(!decision||decision.causa_status==='CONFIRMADA'&&decision.codigo_responsavel_confirmado===true)return decision;
  var source=supervisorTrechoCodigo_(incident,decision);
  if(!source)return decision;
  var props=PropertiesService.getScriptProperties(),key=supervisorTexto_(props.getProperty('OPENAI_API_KEY'));
  var model=supervisorTexto_(props.getProperty('OPENAI_ESCALATION_MODEL'))||CONECTA_SUPERVISOR_LAB.ESCALATION_MODEL;
  var payload={
    model:model,
    instructions:[
      'Refine o diagnóstico causal usando o trecho REAL do código do Conecta.',
      'Não invente causa. Identifique exatamente arquivo, função e linha/bloco quando houver evidência.',
      'Diferencie código interno, rede e serviço externo.',
      'Não mude regras de negócio. Não proponha arquivo novo ou versão paralela.',
      'Só autorize SOLICITAR_CORRECAO_CODIGO com codigo_responsavel_confirmado=true.'
    ].join('\n'),
    input:JSON.stringify({incidente:incident,recuperacaoLocal:local,diagnosticoInicial:decision,codigoReal:source}),
    tools:[supervisorDecisionTool_()],tool_choice:{type:'function',name:'decidir_reparo'},max_output_tokens:1800
  };
  var response=UrlFetchApp.fetch('https://api.openai.com/v1/responses',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+key},payload:JSON.stringify(payload),muteHttpExceptions:true});
  if(response.getResponseCode()<200||response.getResponseCode()>=300)return decision;
  var parsed=JSON.parse(response.getContentText()),call=null;(parsed.output||[]).some(function(item){if(item&&item.type==='function_call'&&item.name==='decidir_reparo'){call=item;return true}return false});
  if(!call)return decision;
  var refined=JSON.parse(call.arguments||'{}');refined.modelo=model;refined.responseId=supervisorTexto_(parsed.id);return supervisorSanitizar_(refined);
}
function supervisorTrechoCodigo_(incident,decision){
  var props=PropertiesService.getScriptProperties(),token=supervisorTexto_(props.getProperty('GITHUB_TOKEN')),repo=supervisorTexto_(props.getProperty('GITHUB_REPO')),branch=supervisorTexto_(props.getProperty('GITHUB_BRANCH'));
  if(!token||!repo||branch!=='laboratorio-ia-autorreparo')return null;
  var path=supervisorNormalizarArquivo_(decision&&decision.arquivo||incident&&incident.arquivo||incident&&incident.urlPath);
  if(!path||!/[.](?:js|html|css|gs)$/.test(path))return null;
  try{
    var src=supervisorGithubGet_(repo,path,branch,token),line=Math.max(1,Number(decision&&decision.linha||incident&&incident.linha||1)),lines=src.content.split('\n'),from=Math.max(0,line-61),to=Math.min(lines.length,line+60);
    return {arquivo:path,sha:src.sha,linhaReferencia:line,trecho:lines.slice(from,to).map(function(v,i){return String(from+i+1)+': '+v}).join('\n')};
  }catch(e){return null}
}
function supervisorPesquisarMelhoriaOnline_(incident,decision){
  var props=PropertiesService.getScriptProperties(),key=supervisorTexto_(props.getProperty('OPENAI_API_KEY'));
  if(!key)throw new Error('OPENAI_API_KEY não configurada.');
  var model=supervisorTexto_(props.getProperty('OPENAI_MODEL'))||CONECTA_SUPERVISOR_LAB.MODEL;
  var source=supervisorTrechoCodigo_(incident,decision);
  var payload={
    model:model,
    instructions:[
      'Pesquise tecnicamente na web uma solução atual e aplicável ao incidente do Conecta Saúde Comunitária.',
      'A pesquisa é somente para melhoria fundamentada e ocorre fora do caminho crítico do usuário.',
      'Compare a recomendação com o código real fornecido quando disponível.',
      'Não sugira mudança sem benefício técnico claro. Não altere regra de negócio.',
      'Explique se a limitação é interna, de rede ou de serviço externo; não invente separação que a evidência não permita.',
      'Retorne recomendação curta, benefício esperado e referências técnicas úteis.'
    ].join('\n'),
    input:JSON.stringify({incidente:incident,diagnostico:decision,codigoReal:source}),
    tools:[{type:'web_search_preview'}],
    include:['web_search_call.action.sources'],
    max_output_tokens:2200
  };
  var response=UrlFetchApp.fetch('https://api.openai.com/v1/responses',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+key},payload:JSON.stringify(payload),muteHttpExceptions:true});
  var status=response.getResponseCode(),body=response.getContentText();
  if(status<200||status>=300)throw new Error('OpenAI web search HTTP '+status+': '+body.slice(0,500));
  var parsed=JSON.parse(body),txt=supervisorResponseText_(parsed),sources=supervisorResponseSources_(parsed);
  return supervisorSanitizar_({
    titulo:supervisorTexto_(decision.tema_pesquisa)||'Melhoria técnica pesquisada',
    resumo:txt.slice(0,3500),
    recomendacao:txt.slice(0,3500),
    beneficioEsperado:supervisorTexto_(decision.beneficio_esperado),
    fontes:sources,
    estado:'SUGERIDA_NAO_APLICADA',
    responseId:supervisorTexto_(parsed.id)
  });
}
function supervisorResponseText_(parsed){
  var parts=[];(parsed.output||[]).forEach(function(item){
    if(item&&item.type==='message'&&Array.isArray(item.content))item.content.forEach(function(c){if(c&&c.type==='output_text'&&c.text)parts.push(c.text)});
  });return parts.join('\n').trim();
}
function supervisorResponseSources_(parsed){
  var out=[],seen={};
  (parsed.output||[]).forEach(function(item){
    var sources=item&&item.action&&Array.isArray(item.action.sources)?item.action.sources:[];
    sources.forEach(function(s){var url=supervisorTexto_(s&&s.url||s&&s.link),title=supervisorTexto_(s&&s.title);if(url&&!seen[url]){seen[url]=1;out.push({title:title,url:url})}});
  });return out.slice(0,8);
}

function supervisorTentarCorrecaoCodigo_(incident,decision){
  if(decision.codigo_responsavel_confirmado!==true)throw new Error('Autorreparo bloqueado: código causal ainda não confirmado.');
  if(['CONECTA_INTERNO','MISTO'].indexOf(supervisorTexto_(decision.origem_gargalo))===-1)throw new Error('Autorreparo bloqueado: gargalo não confirmado no código do Conecta.');
  var props=PropertiesService.getScriptProperties();
  var token=supervisorTexto_(props.getProperty('GITHUB_TOKEN'));
  var repo=supervisorTexto_(props.getProperty('GITHUB_REPO'));
  var branch=supervisorTexto_(props.getProperty('GITHUB_BRANCH'));
  if(!token||!repo||!branch)return {estado:'AGUARDANDO_CREDENCIAL_GITHUB',aplicado:false};
  if(branch!=='laboratorio-ia-autorreparo')throw new Error('Autorreparo bloqueado: GITHUB_BRANCH deve ser laboratorio-ia-autorreparo.');
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('GITHUB_REPO inválido.');
  var path=supervisorNormalizarArquivo_(decision.arquivo||incident.arquivo);
  if(!path||/^\.github\//.test(path)||!/[.](?:js|html|css|gs)$/.test(path))throw new Error('Arquivo causal não autorizado para autorreparo: '+path);
  var source=supervisorGithubGet_(repo,path,branch,token);
  var line=Math.max(1,Number(decision.linha||incident.linha||1)),lines=source.content.split('\n');
  var from=Math.max(0,line-81),to=Math.min(lines.length,line+80);
  var numbered=lines.slice(from,to).map(function(v,i){return String(from+i+1)+': '+v}).join('\n');
  var patch=supervisorOpenAIPatch_(incident,decision,path,source.sha,numbered);
  if(patch.arquivo!==path)throw new Error('Patch recusado: arquivo divergente do bloco causal.');
  var search=String(patch.buscar_exato||''),replace=String(patch.substituir_por||'');
  if(!search||search.length>9000||replace.length>12000)throw new Error('Patch recusado por tamanho ou ausência do trecho exato.');
  var first=source.content.indexOf(search),last=source.content.lastIndexOf(search);
  if(first<0||first!==last)throw new Error('Patch recusado: trecho causal não localizado exatamente uma vez.');
  var updated=source.content.slice(0,first)+replace+source.content.slice(first+search.length);
  if(updated===source.content)throw new Error('Patch recusado: nenhuma alteração efetiva.');
  var commit=supervisorGithubPut_(repo,path,branch,token,source.sha,updated,'lab: autorreparo '+supervisorTexto_(incident.id)+' — '+supervisorTexto_(decision.causa).slice(0,90));
  return {
    estado:'REPARO_APLICADO_AGUARDANDO_VALIDACAO',
    aplicado:true,
    arquivo:path,
    commit:commit,
    testeRealObrigatorio:patch.teste_requerido||decision.teste_real_obrigatorio||'Repetir a operação que originou o incidente.'
  };
}
function supervisorOpenAIPatch_(incident,decision,path,sha,snippet){
  var props=PropertiesService.getScriptProperties(),key=supervisorTexto_(props.getProperty('OPENAI_API_KEY'));
  var model=supervisorTexto_(props.getProperty('OPENAI_ESCALATION_MODEL'))||CONECTA_SUPERVISOR_LAB.ESCALATION_MODEL;
  var tool={
    type:'function',name:'propor_patch_cirurgico',strict:true,
    description:'Propõe substituição exata e mínima somente no arquivo causal informado.',
    parameters:{
      type:'object',additionalProperties:false,
      properties:{
        arquivo:{type:'string'},buscar_exato:{type:'string'},substituir_por:{type:'string'},
        causa:{type:'string'},teste_requerido:{type:'string'}
      },
      required:['arquivo','buscar_exato','substituir_por','causa','teste_requerido']
    }
  };
  var payload={
    model:model,
    instructions:[
      'Você corrige código do laboratório do Conecta Saúde Comunitária.',
      'Retorne UMA substituição mínima no mesmo arquivo causal.',
      'Não crie arquivo novo. Não renomeie módulo. Não toque em código sem relação causal.',
      'buscar_exato deve ser copiado literalmente do trecho fornecido e identificar exatamente um bloco.',
      'substituir_por deve conter apenas o bloco corrigido.',
      'Não declare resolução; o aplicativo fará teste funcional real depois.'
    ].join('\n'),
    input:JSON.stringify({incidente:incident,decisao:decision,arquivo:path,sha:sha,trechoComLinhas:snippet}),
    tools:[tool],tool_choice:{type:'function',name:'propor_patch_cirurgico'},max_output_tokens:5000
  };
  var r=UrlFetchApp.fetch('https://api.openai.com/v1/responses',{
    method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+key},
    payload:JSON.stringify(payload),muteHttpExceptions:true
  });
  var status=r.getResponseCode(),body=r.getContentText();
  if(status<200||status>=300)throw new Error('OpenAI patch HTTP '+status+': '+body.slice(0,500));
  var parsed=JSON.parse(body),call=null;(parsed.output||[]).some(function(item){if(item&&item.type==='function_call'&&item.name==='propor_patch_cirurgico'){call=item;return true}return false});
  if(!call)throw new Error('A IA não retornou patch cirúrgico estruturado.');
  return JSON.parse(call.arguments||'{}');
}
function supervisorGithubGet_(repo,path,branch,token){
  var url='https://api.github.com/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(branch);
  var r=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},muteHttpExceptions:true});
  if(r.getResponseCode()!==200)throw new Error('GitHub GET '+r.getResponseCode()+': '+r.getContentText().slice(0,400));
  var j=JSON.parse(r.getContentText());
  if(j.type!=='file'||!j.sha||!j.content)throw new Error('GitHub não retornou arquivo editável.');
  return {sha:j.sha,content:Utilities.newBlob(Utilities.base64Decode(String(j.content).replace(/\s/g,''))).getDataAsString('UTF-8')};
}
function supervisorGithubPut_(repo,path,branch,token,sha,content,message){
  var url='https://api.github.com/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/');
  var payload={message:message,content:Utilities.base64Encode(content,Utilities.Charset.UTF_8),sha:sha,branch:branch};
  var r=UrlFetchApp.fetch(url,{method:'put',contentType:'application/json',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},payload:JSON.stringify(payload),muteHttpExceptions:true});
  var status=r.getResponseCode(),txt=r.getContentText();
  if(status<200||status>=300)throw new Error('GitHub PUT '+status+': '+txt.slice(0,500));
  var j=JSON.parse(txt);return j&&j.commit&&j.commit.sha||'';
}
function supervisorNormalizarArquivo_(value){
  var v=supervisorTexto_(value);
  try{if(/^https?:\/\//i.test(v))v=new URL(v).pathname}catch(e){}
  v=v.replace(/^\/+/, '');
  if(v.indexOf('atendimento-acs-farmaceutico/')===0)v=v.slice('atendimento-acs-farmaceutico/'.length);
  return v.replace(/\.\./g,'').replace(/[^A-Za-z0-9_./() -]/g,'').slice(0,260);
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
