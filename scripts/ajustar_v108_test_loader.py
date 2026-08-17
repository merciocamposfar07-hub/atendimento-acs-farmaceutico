from pathlib import Path

p=Path('scripts/test_dom_flows.js')
t=p.read_text()

anchor="""function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
"""
helper="""function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function abortableResolved(value) {
  const promise = Promise.resolve(value);
  promise.abort = function () {};
  return promise;
}
"""
if 'function abortableResolved(value)' not in t:
    if anchor not in t:
        raise SystemExit('Ponto do helper abortável não encontrado')
    t=t.replace(anchor,helper,1)

t=t.replace('return Promise.resolve(Buffer.from(source));','return abortableResolved(Buffer.from(source));')
t=t.replace("return Promise.resolve(Buffer.from('<!doctype html><title>Espelho simulado</title>'));","return abortableResolved(Buffer.from('<!doctype html><title>Espelho simulado</title>'));")
t=t.replace('return Promise.resolve(source);','return abortableResolved(source);')

p.write_text(t)
