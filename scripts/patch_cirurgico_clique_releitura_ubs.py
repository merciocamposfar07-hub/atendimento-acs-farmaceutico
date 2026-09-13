from pathlib import Path

central=Path('central-administrativa-tacs.js')
c=central.read_text()
old="""    if(name==='territorio'){
      priorizarSincronizacaoTerritorioPendente();
      setStatus('Central disponível. Confirmando a sessão para abrir TACS e áreas…','warn');
      return;
    }"""
new="""    if(name==='territorio'){
      priorizarSincronizacaoTerritorioPendente();
      showPendingModuleShell(name,title||'Painel',routeId);
      return;
    }"""
assert c.count(old)==1
central.write_text(c.replace(old,new))

panel=Path('teste-v1/painel-tacs-areas-v1.js')
p=panel.read_text()
old2="""    el('tacsForm').classList.add('hidden');loadData('',text(r.message||'Cadastro salvo e conferido.'));"""
new2="""    var salvo=r.tacs||body,found=false;
    data.tacs=data.tacs.map(function(t){if(text(t.tacsId)===text(salvo.tacsId)){found=true;return salvo;}return t;});
    if(!found)data.tacs.push(salvo);
    if(modulePerf&&typeof modulePerf.commit==='function')modulePerf.commit('territorio',territoryPerformancePayload(data));
    territoryConfirmed=true;render();el('tacsForm').classList.add('hidden');
    status(text(r.message||'Cadastro salvo e conferido.'),'ok');"""
assert p.count(old2)==1
panel.write_text(p.replace(old2,new2))

test=Path('scripts/test_primeiro_toque_paineis_v1.js')
t=test.read_text()
t=t.replace("assert.match(block,/if\\(name==='territorio'\\)\\{[\\s\\S]*?priorizarSincronizacaoTerritorioPendente\\(\\)[\\s\\S]*?Confirmando a sessão para abrir TACS e áreas[\\s\\S]*?return;\\s*\\}/);","assert.match(block,/if\\(name==='territorio'\\)\\{[\\s\\S]*?priorizarSincronizacaoTerritorioPendente\\(\\)[\\s\\S]*?showPendingModuleShell\\(name,title\\|\\|'Painel',routeId\\)[\\s\\S]*?return;\\s*\\}/);")
t=t.replace("assert.doesNotMatch(territoryGuard[0],/showPendingModuleShell/);","assert.match(territoryGuard[0],/showPendingModuleShell/);")
test.write_text(t)
