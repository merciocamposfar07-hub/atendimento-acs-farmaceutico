from pathlib import Path
import re

PATH = Path('apps-script/ZZZZ_32_OrganizacoesMunicipiosV1.gs')
s = PATH.read_text(encoding='utf-8')
original = s

# 1. Versão da camada estrutural.
old_version = "VERSAO:'1.1.0',"
new_version = "VERSAO:'1.2.0',"
if old_version not in s:
    raise SystemExit('Versão 1.1.0 esperada não localizada.')
s = s.replace(old_version, new_version, 1)

# 2. Fallback territorial: preservar o placeholder somente quando ainda não há
# município real; com um único município real, usá-lo; com mais de um, não adivinhar.
pattern = re.compile(
    r"function tacsOrganizacoesMunicipiosV1MunicipioDaArea_\(catalogo,areaId\)\{.*?\n\}\n\n"
    r"(?=function tacsOrganizacoesMunicipiosV1ValidarIntegridadeTerritorial_)",
    re.S,
)
replacement = r'''function tacsOrganizacoesMunicipiosV1MunicipioDaArea_(catalogo,areaId){
  areaId=tacsOrganizacoesMunicipiosV1Id_(areaId);
  var vinculo=catalogo.areas&&catalogo.areas[areaId];
  var explicito=tacsOrganizacoesMunicipiosV1Id_(vinculo&&vinculo.municipioId||'');
  if(explicito)return explicito;

  var ativosReais=(catalogo.municipios||[]).filter(function(item){
    return item&&item.ativo!==false&&
      tacsOrganizacoesMunicipiosV1Id_(item.municipioId)!==TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO;
  });
  if(ativosReais.length===1){
    return tacsOrganizacoesMunicipiosV1Id_(ativosReais[0].municipioId);
  }

  if(ativosReais.length===0){
    var legado=(catalogo.municipios||[]).filter(function(item){
      return item&&item.ativo!==false&&
        tacsOrganizacoesMunicipiosV1Id_(item.municipioId)===TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO;
    });
    if(legado.length===1)return TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO;
  }
  return '';
}

'''
s, n = pattern.subn(lambda _m: replacement, s, count=1)
if n != 1:
    raise SystemExit(f'Fallback municipal não localizado exatamente uma vez: {n}.')

# 3. Migração idempotente do catálogo legado atual para Chã Grande.
marker = 'function tacsOrganizacoesMunicipiosV1DadosAdmin_(acesso){'
if marker not in s:
    raise SystemExit('Ponto de inserção DadosAdmin não localizado.')

migration = r'''function tacsOrganizacoesMunicipiosV1MigrarLegadoChaGrande_(){
  var leitura=tacsOrganizacoesMunicipiosV1LerCatalogo_();
  var legadoOrg=TACS_ORGANIZACOES_MUNICIPIOS_V1.ORGANIZACAO_PADRAO;
  var legadoMun=TACS_ORGANIZACOES_MUNICIPIOS_V1.MUNICIPIO_PADRAO;
  var temLegado=(leitura.organizacoes||[]).some(function(item){
    return tacsOrganizacoesMunicipiosV1Id_(item&&item.organizacaoId)===legadoOrg;
  })||(leitura.municipios||[]).some(function(item){
    return tacsOrganizacoesMunicipiosV1Id_(item&&item.municipioId)===legadoMun;
  });
  if(!temLegado)return leitura;

  var reaisAtivos=(leitura.municipios||[]).filter(function(item){
    return item&&item.ativo!==false&&tacsOrganizacoesMunicipiosV1Id_(item.municipioId)!==legadoMun;
  });
  if(reaisAtivos.length!==1)return leitura;
  var destino=reaisAtivos[0];
  var destinoId=tacsOrganizacoesMunicipiosV1Id_(destino.municipioId);
  var destinoNome=tacsOrganizacoesMunicipiosV1Id_(destino.nome);
  var destinoUf=tacsOrganizacoesMunicipiosV1Id_(destino.uf);
  if(destinoId!=='CHA_GRANDE'&&destinoNome!=='CHA_GRANDE')return leitura;
  if(destinoUf&&destinoUf!=='PE')return leitura;
  var orgDestinoId=tacsOrganizacoesMunicipiosV1Id_(destino.organizacaoId);
  if(!orgDestinoId||orgDestinoId===legadoOrg)return leitura;
  var orgDestino=(leitura.organizacoes||[]).filter(function(item){
    return item&&item.ativa!==false&&tacsOrganizacoesMunicipiosV1Id_(item.organizacaoId)===orgDestinoId;
  })[0]||null;
  if(!orgDestino)return leitura;

  return tacsOrganizacoesMunicipiosV1ComLock_(function(){
    var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();
    var reais=(catalogo.municipios||[]).filter(function(item){
      return item&&item.ativo!==false&&tacsOrganizacoesMunicipiosV1Id_(item.municipioId)!==legadoMun;
    });
    if(reais.length!==1)return catalogo;
    var real=reais[0];
    var realId=tacsOrganizacoesMunicipiosV1Id_(real.municipioId);
    var realNome=tacsOrganizacoesMunicipiosV1Id_(real.nome);
    var realUf=tacsOrganizacoesMunicipiosV1Id_(real.uf);
    if(realId!=='CHA_GRANDE'&&realNome!=='CHA_GRANDE')return catalogo;
    if(realUf&&realUf!=='PE')return catalogo;
    var realOrg=tacsOrganizacoesMunicipiosV1Id_(real.organizacaoId);
    if(!realOrg||realOrg===legadoOrg)return catalogo;
    var orgOk=(catalogo.organizacoes||[]).some(function(item){
      return item&&item.ativa!==false&&tacsOrganizacoesMunicipiosV1Id_(item.organizacaoId)===realOrg;
    });
    if(!orgOk)return catalogo;

    catalogo.areas=catalogo.areas&&typeof catalogo.areas==='object'?catalogo.areas:{};
    var areaIds={};
    Object.keys(catalogo.areas).forEach(function(areaId){
      areaIds[tacsOrganizacoesMunicipiosV1Id_(areaId)]=true;
    });
    if(typeof tacsTerritorioV1LerAreas_==='function'){
      (tacsTerritorioV1LerAreas_()||[]).forEach(function(area){
        var areaId=tacsOrganizacoesMunicipiosV1Id_(area&& (area.areaId||area.AREA_ID));
        if(areaId)areaIds[areaId]=true;
      });
    }

    var mudou=false;
    Object.keys(areaIds).forEach(function(areaId){
      var vinculo=catalogo.areas[areaId];
      var municipioAtual=tacsOrganizacoesMunicipiosV1Id_(vinculo&&vinculo.municipioId||'');
      if(!municipioAtual||municipioAtual===legadoMun){
        catalogo.areas[areaId]={municipioId:realId};
        mudou=true;
      }
    });

    var usaMunLegado=Object.keys(catalogo.areas).some(function(areaId){
      var vinculo=catalogo.areas[areaId];
      return tacsOrganizacoesMunicipiosV1Id_(vinculo&&vinculo.municipioId||'')===legadoMun;
    });
    if(!usaMunLegado){
      var antesMun=catalogo.municipios.length;
      catalogo.municipios=catalogo.municipios.filter(function(item){
        return tacsOrganizacoesMunicipiosV1Id_(item&&item.municipioId)!==legadoMun;
      });
      if(catalogo.municipios.length!==antesMun)mudou=true;
    }

    var usaOrgLegado=(catalogo.municipios||[]).some(function(item){
      return tacsOrganizacoesMunicipiosV1Id_(item&&item.organizacaoId)===legadoOrg;
    });
    if(!usaOrgLegado){
      var antesOrg=catalogo.organizacoes.length;
      catalogo.organizacoes=catalogo.organizacoes.filter(function(item){
        return tacsOrganizacoesMunicipiosV1Id_(item&&item.organizacaoId)!==legadoOrg;
      });
      if(catalogo.organizacoes.length!==antesOrg)mudou=true;
    }

    return mudou?tacsOrganizacoesMunicipiosV1PersistirSemLock_(catalogo):catalogo;
  });
}

'''
s = s.replace(marker, migration + marker, 1)

# 4. Dados administrativos passam pela migração controlada antes de renderizar.
old = "  var catalogo=tacsOrganizacoesMunicipiosV1LerCatalogo_();\n  var areas=[];"
new = "  var catalogo=tacsOrganizacoesMunicipiosV1MigrarLegadoChaGrande_();\n  var areas=[];"
if old not in s:
    raise SystemExit('Leitura do catálogo em DadosAdmin não localizada.')
s = s.replace(old, new, 1)

# Gates estáticos de segurança.
checks = {
    "versao": "VERSAO:'1.2.0'" in s,
    "migracao": 'function tacsOrganizacoesMunicipiosV1MigrarLegadoChaGrande_()' in s,
    "destino": "'CHA_GRANDE'" in s and "'PE'" in s,
    "nao_adivinhar_multiplos": 'if(ativosReais.length===1)' in s and "return '';" in s,
    "remove_mun_so_sem_uso": 'if(!usaMunLegado)' in s,
    "remove_org_so_sem_uso": 'if(!usaOrgLegado)' in s,
    "dados_admin_migra": 'var catalogo=tacsOrganizacoesMunicipiosV1MigrarLegadoChaGrande_();' in s,
    "salvar_org_preservado": 'function tacsOrganizacoesMunicipiosV1SalvarOrganizacao_' in s,
    "salvar_mun_preservado": 'function tacsOrganizacoesMunicipiosV1SalvarMunicipio_' in s,
    "vincular_area_preservado": 'function tacsOrganizacoesMunicipiosV1VincularArea_' in s,
}
failed = [k for k, ok in checks.items() if not ok]
if failed:
    raise SystemExit('Falharam gates: ' + ', '.join(failed))
if s == original:
    raise SystemExit('Nenhuma alteração foi produzida.')

PATH.write_text(s, encoding='utf-8')
print('Migração de legado Chã Grande aplicada com gates estáticos OK.')
