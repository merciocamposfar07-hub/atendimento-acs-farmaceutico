'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','teste-v1','painel-recados-campanhas-v1.html'),'utf8');
const scripts=[];
let pos=0;
while(true){
  const i=html.indexOf('<script',pos);if(i<0)break;
  const a=html.indexOf('>',i),b=html.indexOf('</script>',a);
  if(a<0||b<0)throw new Error('script HTML incompleto');
  const tag=html.slice(i,a+1);
  if(!/\bsrc\s*=/.test(tag))scripts.push(html.slice(a+1,b));
  pos=b+9;
}
for(const [i,code] of scripts.entries())new vm.Script(code,{filename:`painel-recados-inline-${i+1}.js`});
console.log('JavaScript inline do painel de recados: sintaxe válida.');
