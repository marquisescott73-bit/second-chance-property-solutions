(()=>{
'use strict';
const SB='https://pjskrjecyzoprpqhymbq.supabase.co',KEY='sb_publishable_PRyYNqhTAhk5sr3wKbIC0g_bYCLEhwd',FN=SB+'/functions/v1/sc-growth-chat';
const q=new URLSearchParams(location.search);if(q.get('creator')!=='1')return;
const style=document.createElement('style');style.textContent=`.sc-admin-messages{position:fixed;right:14px;bottom:18px;z-index:9500;border:0;background:#c87559;color:white;border-radius:999px;padding:12px 15px;font:900 13px/1 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 12px 34px rgba(89,60,49,.22);cursor:pointer}.sc-admin-messages .badge{display:inline-grid;place-items:center;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:white;color:#b65f45;font-size:10px;margin-left:5px}.sc-admin-messages[hidden]{display:none!important}`;document.head.appendChild(style);
let lastUnread=null;
function token(){try{return sessionStorage.getItem('sc_creator_token')||''}catch{return''}}
function alerts(){try{return localStorage.getItem('sc_creator_message_alerts')==='1'}catch{return false}}
function ready(){const app=document.getElementById('app');return !!token()&&!!app&&/YOUR PEOPLE|Creator/i.test(app.textContent||'')}
function ensure(){let b=document.getElementById('scAdminMessages');if(!b){b=document.createElement('button');b.id='scAdminMessages';b.className='sc-admin-messages';b.innerHTML='💬 Messages<span class="badge" id="scAdminBadge" hidden>0</span>';b.onclick=()=>location.href='../second-chance/chat.html?creator=1';document.body.appendChild(b)}b.hidden=!ready()}
function notify(n){if(!alerts()||!('Notification'in window)||Notification.permission!=='granted')return;try{new Notification('New Second Chance message',{body:n===1?'You have 1 unread participant message.':`You have ${n} unread participant messages.`,icon:'./icon.svg'})}catch{}}
async function count(){if(!ready())return;try{const r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+token()},body:JSON.stringify({op:'inbox'})});if(!r.ok)return;const d=await r.json(),n=(d.threads||[]).reduce((a,x)=>a+(+x.unread||0),0),b=document.getElementById('scAdminBadge');if(b){b.textContent=String(n);b.hidden=!n}if(lastUnread===null)lastUnread=n;else if(n>lastUnread){notify(n);lastUnread=n}else lastUnread=n}catch{}}
const mo=new MutationObserver(()=>queueMicrotask(ensure));mo.observe(document.body,{childList:true,subtree:true});ensure();setTimeout(count,1200);setInterval(()=>{ensure();count()},15000);
})();