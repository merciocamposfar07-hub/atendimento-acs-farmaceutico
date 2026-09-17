from pathlib import Path
import re

ROOT = Path('.')
HTML = Path('central-administrativa-tacs.html')
CENTRAL = Path('central-administrativa-tacs.js')
PIN_REV = '20260916-pin-tacs-iphone-v2'
AGENDA_REV = '20260916-safari-mount-retry-v1'
MARKER = 'CORRECAO_CIRURGICA_AGENDAS_RETRY_SAFARI_20260916_V1'


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Âncora inválida para {label}: esperado 1, encontrado {count}')
    return text.replace(old, new, 1)


# 1) PIN TACS no iPhone/Safari: forçar a Central publicada a carregar a revisão
# que já lê o campo ativo e mantém um único dono do clique do PIN.
html = read(HTML)
html, count = re.subn(
    r'central-tacs-login-rapido-v1\.js\?v=[^"\']+',
    f'central-tacs-login-rapido-v1.js?v={PIN_REV}',
    html,
    count=1,
)
if count != 1:
    raise SystemExit(f'Não foi possível atualizar o cache-buster do PIN TACS: {count}')
write(HTML, html)


# 2) Agendas no Safari: invalidar a revisão antiga do bundle nativo e do prefetch.
central = read(CENTRAL)
central, count = re.subn(
    r'conecta-agendas-native-v1\.js\?v=[^"\']+(?:&load=[^"\']+)?',
    f'conecta-agendas-native-v1.js?v={AGENDA_REV}&load={AGENDA_REV}',
    central,
    count=1,
)
if count != 1:
    raise SystemExit(f'Não foi possível atualizar a revisão do módulo Agendas: {count}')

old_prefetch = "'/atendimento-acs-farmaceutico/conecta-agendas-native-v1.js',"
new_prefetch = f"'/atendimento-acs-farmaceutico/conecta-agendas-native-v1.js?v={AGENDA_REV}',"
if old_prefetch in central:
    central = replace_once(central, old_prefetch, new_prefetch, 'prefetch Agendas')
elif new_prefetch not in central:
    raise SystemExit('Âncora do prefetch de Agendas não encontrada.')


# 3) Recuperação isolada: se o Safari manteve uma instância nativa inconsistente,
# zerar somente Agendas e tentar montar uma segunda vez. Nenhum dado, permissão,
# rota ou escrita é modificado. A mensagem de erro original permanece como fallback.
if MARKER not in central:
    old_mount = """    try{window.ConectaAgendasNativeV1.mount(host);watchAdminUbsRemoteMode(host);setShellOpening('',false)}
    catch(e){
      host.innerHTML='<div style=\"padding:18px;color:#ffd0d6;background:#071827\">O módulo de Agendas não pôde ser iniciado sem perder a sessão. Volte à Central e tente novamente.</div>';
      setShellOpening('',false);
    }"""
    new_mount = """    /* CORRECAO_CIRURGICA_AGENDAS_RETRY_SAFARI_20260916_V1
       Safari pode manter uma instância nativa antiga mesmo após o shell ter sido atualizado.
       Na primeira falha, reinicia SOMENTE a instância de Agendas e repete a montagem uma vez.
       Sessão, área, permissões, dados e regras de escrita permanecem intactos. */
    try{window.ConectaAgendasNativeV1.mount(host);watchAdminUbsRemoteMode(host);setShellOpening('',false)}
    catch(e){
      try{
        if(window.ConectaAgendasNativeV1&&typeof window.ConectaAgendasNativeV1.reset==='function')window.ConectaAgendasNativeV1.reset();
        window.ConectaAgendasNativeV1.mount(host);watchAdminUbsRemoteMode(host);setShellOpening('',false);
      }catch(retryError){
        host.innerHTML='<div style=\"padding:18px;color:#ffd0d6;background:#071827\">O módulo de Agendas não pôde ser iniciado sem perder a sessão. Volte à Central e tente novamente.</div>';
        setShellOpening('',false);
      }
    }"""
    central = replace_once(central, old_mount, new_mount, 'retry isolado de Agendas')

write(CENTRAL, central)
print('CORRECAO_PIN_AGENDAS_SAFARI_20260916_APLICADA')
