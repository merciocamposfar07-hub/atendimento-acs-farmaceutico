from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def replace_once(path, old, new):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return
    if text.count(old)!=1:
        raise SystemExit(f'{path}: trecho esperado não encontrado de forma única ({text.count(old)})')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# 1) Se o aparelho já estava marcado como TACS/teste pelo cadastro legado do Push,
# a consulta familiar continua liberada imediatamente, sem pedir CPF/CNS.
replace_once(
    Path('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs'),
    "  var autorizado=device&&aparelhoTacsTesteV1TokenValido_(device,area,chave);if(!autorizado)return aparelhoTacsTesteV1ConsultaFamiliaAnterior_(p);\n  if(sub)aparelhoTacsTesteV1AssociarSubscription_(device,area,chave,sub);",
    "  var tokenAutorizado=Boolean(device&&aparelhoTacsTesteV1TokenValido_(device,area,chave)),legadoAutorizado=Boolean(sub&&aparelhoTacsTesteV1LegacyAtivo_(sub,area)),autorizado=tokenAutorizado||legadoAutorizado;if(!autorizado)return aparelhoTacsTesteV1ConsultaFamiliaAnterior_(p);\n  if(tokenAutorizado&&sub)aparelhoTacsTesteV1AssociarSubscription_(device,area,chave,sub);"
)
replace_once(
    Path('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs'),
    "  return {ok:true,autorizada:true,requerConfirmacao:false,familiaId:familia,autorizacao:'APARELHO_TACS_TESTE',membros:membros,aparelhoTacsTeste:true};",
    "  return {ok:true,autorizada:true,requerConfirmacao:false,familiaId:familia,autorizacao:tokenAutorizado?'APARELHO_TACS_TESTE':'APARELHO_TACS_TESTE_LEGADO',membros:membros,aparelhoTacsTeste:true};"
)

# 2) Ao abrir o painel administrativo, um aparelho legado ativo recebe automaticamente
# a nova chave técnica do dispositivo. Isso migra o aparelho sem exigir nova ativação manual.
replace_once(
    Path('apps-script/ZZZZ_45_AparelhoTacsTesteV1.gs'),
    "    }else resultado=aparelhoTacsTesteV1Estado_(device,sub,contexto,chave);",
    "    }else{\n      var precisaMigrar=Boolean(sub&&aparelhoTacsTesteV1LegacyAtivo_(sub,contexto.areaId)&&!aparelhoTacsTesteV1TokenValido_(device,contexto.areaId,chave));\n      if(precisaMigrar){\n        chave=aparelhoTacsTesteV1NovaChave_();\n        aparelhoTacsTesteV1SalvarDispositivo_(device,contexto.areaId,aparelhoTacsTesteV1Operador_(acesso,contexto),true,chave,sub);\n        resultado=aparelhoTacsTesteV1Estado_(device,sub,contexto,chave);resultado.chaveTecnica=chave;resultado.migradoLegado=true;\n      }else resultado=aparelhoTacsTesteV1Estado_(device,sub,contexto,chave);\n    }"
)

# 3) O navegador salva a chave devolvida durante CONSULTAR, não apenas durante ATIVAR.
replace_once(
    Path('admin-aparelho-tacs-teste-v1.js'),
    "executar('CONSULTAR').then(function(r){if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível consultar este aparelho.');ultimoEstado=r;render(r)}).catch(function(e){render(ultimoEstado,e.message)})",
    "executar('CONSULTAR').then(function(r){if(!r||r.ok!==true)throw new Error(txt(r&&r.message)||'Não foi possível consultar este aparelho.');if(r.chaveTecnica){salvarChave(r.chaveTecnica);r.autorizadoNesteAparelho=true}ultimoEstado=r;render(r)}).catch(function(e){render(ultimoEstado,e.message)})"
)

# 4) Reforça o teste específico: aparelho legado ativo também não pede confirmação por documento.
p=ROOT/'scripts/test_aparelho_tacs_teste_v1.js'
text=p.read_text(encoding='utf-8')
anchor="assert.equal(ok.autorizacao,'APARELHO_TACS_TESTE');"
addition="""assert.equal(ok.autorizacao,'APARELHO_TACS_TESTE');
sandbox.aparelhoTacsTesteV1TokenValido_=function(){return false};
sandbox.aparelhoTacsTesteV1LegacyAtivo_=function(sub,area){return sub===SUB_TEST&&area==='JAPARANDUBA'};
const legado=sandbox.identificacaoFamiliarPublicaV1ConsultarFamilia_({areaId:'JAPARANDUBA',familia:'53',subscriptionId:SUB_TEST});
assert.equal(legado.autorizada,true,'Aparelho TACS/teste legado não pode voltar a pedir CPF/CNS.');
assert.equal(legado.autorizacao,'APARELHO_TACS_TESTE_LEGADO');"""
if addition not in text:
    if text.count(anchor)!=1:
        raise SystemExit('test_aparelho_tacs_teste_v1.js: âncora não encontrada')
    text=text.replace(anchor,addition,1)
p.write_text(text,encoding='utf-8')

print('Reconhecimento TACS V4 aplicado: aparelho técnico ativo não pede CPF/CNS para abrir família.')