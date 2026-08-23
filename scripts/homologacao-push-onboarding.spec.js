'use strict';
const { test, expect } = require('@playwright/test');

const BASE='http://127.0.0.1:4173/atendimento-acs-farmaceutico/index.html';
const ANDROID_UA='Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const IPHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const UUID='123e4567-e89b-42d3-a456-426614174000';

async function blockBackend(page){
  await page.route('https://script.google.com/**',route=>route.abort());
  await page.route('https://script.googleusercontent.com/**',route=>route.abort());
  await page.route('https://api.onesignal.com/**',route=>route.abort());
}

async function mockOneSignal(page,active){
  await page.route('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',route=>route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:`(function(){
      var listeners={};
      var tags=${active?"{area_tacs:'JAPARANDUBA'}":"{}"};
      var push={optedIn:${active?'true':'false'},id:${active?`'${UUID}'`:"''"},token:${active?"'token-ativo'":"''"},addEventListener:function(n,f){listeners[n]=f},optIn:async function(){this.optedIn=true;this.id='${UUID}';this.token='token-novo';if(listeners.change)listeners.change()}};
      var notifications={permission:${active?'true':'false'},addEventListener:function(){},requestPermission:async function(){this.permission=true}};
      var os={init:async function(){},Notifications:notifications,User:{PushSubscription:push,getTags:function(){return tags},addTag:async function(k,v){tags[k]=v}}};
      var q=window.OneSignalDeferred=window.OneSignalDeferred||[];
      var pending=q.slice();
      q.push=function(fn){Array.prototype.push.call(this,fn);Promise.resolve().then(function(){return fn(os)});return this.length};
      pending.forEach(function(fn){Promise.resolve().then(function(){return fn(os)})});
    })();`
  }));
  await page.route('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js',route=>route.abort());
}

async function newMobilePage(browser,userAgent,standalone,active){
  const context=await browser.newContext({userAgent,viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  await page.addInitScript(value=>{
    try{Object.defineProperty(window.navigator,'standalone',{configurable:true,value:value});}catch(e){}
    const original=window.matchMedia.bind(window);
    window.matchMedia=function(query){
      if(query==='(display-mode: standalone)')return {matches:Boolean(value),media:query,onchange:null,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return false}};
      return original(query);
    };
  },standalone);
  await blockBackend(page);
  await mockOneSignal(page,active);
  return {context,page};
}

test('Android novo oferece ativação antes da instalação',async({browser,browserName})=>{
  const {context,page}=await newMobilePage(browser,ANDROID_UA,false,false);
  try{
    await page.goto(BASE,{waitUntil:'domcontentloaded'});
    await expect(page.locator('#notificationOffer')).toBeVisible();
    await expect(page.locator('#notificationButton')).toBeVisible();
    await expect(page.locator('.notification-guide-all')).toBeVisible();
    await expect(page.locator('.notification-guide-all')).toContainText('Android — ative os avisos primeiro');
    await expect(page.locator('.notification-guide-all')).toContainText('podem ser ativados antes de instalar o Portal');
    const sdkCount=await page.locator('script[data-onesignal-sdk]').count();
    expect(sdkCount,`${browserName}: não pode duplicar o SDK OneSignal`).toBe(1);
  }finally{await context.close()}
});

test('iPhone no Safari orienta Tela de Início e não inicializa pedido Push',async({browser})=>{
  const {context,page}=await newMobilePage(browser,IPHONE_UA,false,false);
  try{
    await page.goto(BASE,{waitUntil:'domcontentloaded'});
    await expect(page.locator('#notificationOffer')).toBeVisible();
    await expect(page.locator('.notification-guide-all')).toBeVisible();
    await expect(page.locator('.notification-guide-all')).toContainText('iPhone — adicione o Portal à Tela de Início primeiro');
    await expect(page.locator('.notification-guide-all')).toContainText('não tentará pedir a permissão de notificações');
    await expect(page.locator('script[data-onesignal-sdk]')).toHaveCount(0);
  }finally{await context.close()}
});

test('iPhone aberto pelo ícone libera a ativação normal',async({browser})=>{
  const {context,page}=await newMobilePage(browser,IPHONE_UA,true,false);
  try{
    await page.goto(BASE,{waitUntil:'domcontentloaded'});
    await expect(page.locator('#notificationButton')).toBeVisible();
    await expect(page.locator('.notification-guide-all')).toBeVisible();
    await expect(page.locator('.notification-guide-all')).toContainText('iPhone — ative os avisos neste aparelho');
    await expect(page.locator('script[data-onesignal-sdk]')).toHaveCount(1);
  }finally{await context.close()}
});

test('aparelho já inscrito não repete onboarding',async({browser})=>{
  const {context,page}=await newMobilePage(browser,ANDROID_UA,false,true);
  try{
    await page.goto(BASE,{waitUntil:'domcontentloaded'});
    await expect(page.locator('#notificationStatus')).toHaveText('Avisos ativados neste aparelho.');
    await expect(page.locator('#notificationButton')).toBeDisabled();
    await expect(page.locator('.notification-guide-all')).toBeHidden();
    await expect(page.locator('script[data-onesignal-sdk]')).toHaveCount(1);
  }finally{await context.close()}
});
