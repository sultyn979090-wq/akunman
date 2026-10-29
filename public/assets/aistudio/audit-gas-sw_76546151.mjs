import fs from 'node:fs'; import vm from 'node:vm';

// ---------- E4: Code.gs executed against a mock that follows documented Apps Script semantics ----------
class MockSheet { constructor(n){this.name=n;this.g=[];}
  clear(){this.g=[];} appendRow(r){this.g.push([...r]);}
  getLastRow(){return this.g.length;} getLastColumn(){return Math.max(0,...this.g.map(r=>r.length));}
  getRange(r,c,nr,nc){const s=this;return{
    setValues(m){for(let i=0;i<nr;i++){s.g[r-1+i]=s.g[r-1+i]||[];for(let j=0;j<nc;j++)s.g[r-1+i][c-1+j]=m[i][j];}},
    getValues(){const out=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++){const v=(s.g[r-1+i]||[])[c-1+j];row.push(v===undefined?'':v);}out.push(row);}return out;}};}}
const sheets={}; const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=new MockSheet(n)),getName:()=>'mock',getUrl:()=>'u',getId:()=>'id'};
const ctx={SpreadsheetApp:{getActiveSpreadsheet:()=>ss},ContentService:{createTextOutput:t=>({t,setMimeType(){return this;}}),MimeType:{JSON:'json'}},PropertiesService:{},console,JSON,Object};
vm.createContext(ctx); vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),ctx);
const call=(o)=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({secret:'GANTI_DENGAN_KUNCI_RAHASIA_ANDA',...o})}}).t);

const access=[
 {id:'a1',personId:'p1',serviceId:'s1',loginMethod:'google',status:'ready',createdAt:'t',updatedAt:'t'},
 {id:'a2',personId:'p2',serviceId:'s1',loginMethod:'google',status:'limited',limitedAt:'2026-10-29T10:00:00.000Z',resetAt:'2026-10-30T07:00:00.000Z',createdAt:'t',updatedAt:'t'}];
const logs=[{id:'l1',accessId:'a1',type:'opened',at:'t'},{id:'l2',accessId:'a1',type:'stop',at:'t',durationSec:120}];
const notes=[{id:'h1',serviceId:'s1',accessId:'a1',authorName:'Alice',text:'[1]',createdAt:'t'},{id:'h2',serviceId:'s1',accessId:'a1',authorName:'Alice',text:'{}',createdAt:'t'}];
console.log('=== E4a: backup -> restore roundtrip through Code.gs ===');
call({action:'backup',data:{services:[],persons:[],access,logs,handoffNotes:notes}});
const r=call({action:'restore'}).data;
console.log('access[1] keys before:',Object.keys(access[1]).join(','));
console.log('access[1] keys after :',Object.keys(r.access[1]).join(','));
console.log('logs[1] after (had durationSec:120):',JSON.stringify(r.logs[1]));
console.log('handoff text "[1]" restored as:',JSON.stringify(r.handoffNotes[0].text),'| text "{}" restored as:',JSON.stringify(r.handoffNotes[1].text));
console.log('\n=== E4b: wrong/empty Spreadsheet (tabs missing) ===');
for(const k of Object.keys(sheets))delete sheets[k];
const empty=call({action:'restore'}); console.log('success=',empty.success,'counts=',Object.fromEntries(Object.entries(empty.data).map(([k,v])=>[k,v.length])));
console.log('\n=== E4c: wrong secret -> HTTP status field ===');
const bad=ctx.doPost({postData:{contents:JSON.stringify({secret:'x',action:'restore'})}}); console.log('body:',bad.t,'(createJsonResponse ignores statusCode; HTTP is always 200)');

// ---------- E5: public/sw.js executed with mocked ServiceWorker globals ----------
console.log('\n=== E5: sw.js install/precache ===');
const handlers={}; const added=[]; const cacheStore=new Map();
const swctx={self:{addEventListener:(e,f)=>handlers[e]=f,skipWaiting:()=>Promise.resolve(),clients:{claim:()=>Promise.resolve()},location:{origin:'https://x.github.io'}},
 caches:{open:async()=>({addAll:async(l)=>{added.push(...l);},put:async()=>{}}),keys:async()=>[],delete:async()=>true,match:async()=>undefined},console,URL,Promise};
vm.createContext(swctx); vm.runInContext(fs.readFileSync('public/sw.js','utf8'),swctx);
let p; handlers.install({waitUntil:(x)=>{p=x;}}); await p;
console.log('precached URLs:',JSON.stringify(added));
console.log('hashed Vite bundle (e.g. ./assets/index-XXXX.js / .css) in precache? ->',added.some(u=>u.includes('assets/')));
const fb=swctx.caches.match('./index.html')||swctx.caches.match('/'); console.log("fallback expression `caches.match(a) || caches.match(b)` returns a",fb.constructor.name,'(always truthy; right-hand side is dead code)');
