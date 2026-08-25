(()=>{
'use strict';
const SB='https://pjskrjecyzoprpqhymbq.supabase.co',KEY='sb_publishable_PRyYNqhTAhk5sr3wKbIC0g_bYCLEhwd',SUPPORT=SB+'/functions/v1/sc-growth-support',TERMS='2026-08-25-beta1';
const $=(s,r=document)=>r.querySelector(s),esc=(x='')=>String(x).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const get=k=>{try{return localStorage.getItem(k)||''}catch{return''}},set=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
let legalAccepted=false,nudgeTimer=null,nudgeShown='',syncing=false,lastSync=0;

const style=document.createElement('style');
style.textContent=`
.sc-legal{margin:16px 0 2px;background:#f6f8f5;border:1px solid #d9ded9;border-radius:16px;padding:14px;color:#526059}.sc-legal h3{font-family:Georgia,serif;font-size:22px;margin:0 0 8px;color:#34423a}.sc-legal ul{margin:8px 0 10px;padding-left:20px}.sc-legal li{margin:6px 0;line-height:1.4;font-size:13px}.sc-legal a{color:#a85f49;font-weight:850}.sc-agree{display:flex;gap:9px;align-items:flex-start;margin-top:10px;padding-top:10px;border-top:1px solid #dde2dd;font-size:13px;font-weight:750}.sc-agree input{margin-top:3px;accent-color:#c87559}.sc-legal-warning{font-size:11px;color:#8b5c4c;margin-top:8px}
.sc-nudge-btn{border:1px solid #d4d9d4!important;background:#fffdfa!important;color:#5d6862!important;border-radius:999px!important;padding:8px 11px!important;font-weight:850!important;font-size:12px!important;margin-right:7px}.sc-nudge-btn.active{border-color:#c87559!important;color:#aa6049!important}.sc-nudge-modal{position:fixed;inset:0;z-index:11000;background:rgba(35,42,38,.4);display:grid;place-items:center;padding:18px}.sc-nudge-card{width:min(500px,100%);background:#fffdfa;border:1px solid #d9d7cf;border-radius:24px;padding:22px;box-shadow:0 22px 70px rgba(30,38,33,.22);color:#2f3b35}.sc-nudge-card h2{font-family:Georgia,serif;font-size:32px;line-height:1;margin:7px 0 10px}.sc-nudge-card p{color:#66726b;line-height:1.48}.sc-nudge-choices{display:grid;gap:9px;margin-top:15px}.sc-nudge-choices button{min-height:46px;border-radius:13px;font-weight:850;cursor:pointer}.sc-nudge-main{border:0;background:#c87559;color:white}.sc-nudge-alt{border:1px solid #ccd5cf;background:white;color:#536159}.sc-nudge-note{background:#eef3ee;border:1px solid #d8e2d8;border-radius:13px;padding:11px;font-size:12px;color:#5d6d62;margin-top:12px}.sc-nudge-x{float:right;border:0;background:none;font-size:20px;color:#7a817b;cursor:pointer}.sc-due{background:#fff3ea;border:1px solid #ecd4c7;border-radius:14px;padding:12px;color:#76564a;font-size:13px}.sc-browser{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#66726b;margin-top:12px}.sc-browser input{margin-top:2px;accent-color:#c87559}
`;
document.head.appendChild(style);

const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init={})=>{
  const url=typeof input==='string'?input:(input&&input.url)||'';
  if(url.includes('/auth/v1/signup')&&String(init.method||'POST').toUpperCase()==='POST'&&legalAccepted){
    try{
      const body=JSON.parse(init.body||'{}');
      body.data={...(body.data||{}),sc_app:'second_chance',sc_terms_version:TERMS,sc_terms_accepted_at:new Date().toISOString()};
      init={...init,body:JSON.stringify(body)};
    }catch{}
  }
  return nativeFetch(input,init);
};

function signupCard(){const card=$('.auth-card'),h=card?.querySelector('h1')?.textContent?.trim()||'';return h==='Start my second chance'?card:null}
function injectLegal(){
  const card=signupCard();if(!card||card.querySelector('#scLegal'))return;
  const actions=card.querySelector('.auth-actions');if(!actions)return;
  const box=document.createElement('div');box.id='scLegal';box.className='sc-legal';box.innerHTML=`<h3>Before you create your account</h3><ul><li><strong>Your journal answers stay private by default.</strong> Marquise does not automatically see private reflection text.</li><li>Marquise can see progress, Life Scores, actions, return patterns, feedback you intentionally submit, chat messages you send, reflections you deliberately share, and private coaching notes used for follow-up.</li><li>You can message anytime; the normal reply target is <strong>8–12 hours</strong>. Chat is not emergency or crisis support.</li><li>Bug reports can include the screen, step, section, and device/browser info so problems can be fixed.</li></ul><a href="./privacy-terms.html" target="_blank" rel="noopener">Read the full Privacy + Terms</a><label class="sc-agree"><input id="scTermsAgree" type="checkbox"><span>I’ve read and agree to the Second Chance Privacy + Terms.</span></label><div class="sc-legal-warning">You have to check this before creating an account.</div>`;actions.before(box);
}

document.addEventListener('click',e=>{
  const t=e.target;if(!(t instanceof Element)||t.id!=='authGo'||!signupCard())return;
  const cb=$('#scTermsAgree');
  if(!cb?.checked){e.preventDefault();e.stopImmediatePropagation();const msg=$('#authMsg');if(msg)msg.innerHTML='<div class="public-error">Read the Privacy + Terms and check the agreement box first.</div>';return}
  legalAccepted=true;
},true);

function access(){return get('sc_public_access')}
function refreshToken(){return get('sc_public_refresh')}
async function refreshAccess(){const r=refreshToken();if(!r)throw Error('Please sign in again.');const res=await nativeFetch(SB+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({refresh_token:r})});const d=await res.json().catch(()=>({}));if(!res.ok)throw Error('Please sign in again.');if(d.access_token)set('sc_public_access',d.access_token);if(d.refresh_token)set('sc_public_refresh',d.refresh_token);return d.access_token}
async function support(op,body={}){let tok=access();if(!tok)throw Error('Please sign in again.');let r=await nativeFetch(SUPPORT,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+tok},body:JSON.stringify({op,...body})});if(r.status===401&&refreshToken()){tok=await refreshAccess();r=await nativeFetch(SUPPORT,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+tok},body:JSON.stringify({op,...body})})}const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Could not save that reminder.');return d}
function signedJourney(){const app=$('#app');return !!access()&&!!app&&!app.querySelector('.public-cover,.auth-wrap')&&!window.__SC_RECOVERY__}
function labelFor(n){if(!n)return '🔔 Need a nudge?';const dt=new Date(n.due_at);return `🔔 Nudge ${dt.toLocaleDateString([], {month:'short',day:'numeric'})}`}
function ensureNudgeButton(){const bar=$('.accountbar');if(!signedJourney()||!bar){$('#scNudgeBtn')?.remove();return null}let b=$('#scNudgeBtn');if(!b){b=document.createElement('button');b.id='scNudgeBtn';b.className='sc-nudge-btn';b.textContent='🔔 Need a nudge?';b.onclick=openNudge;bar.insertBefore(b,bar.querySelector('#logout'))}return b}
async function syncNudge(force=false){
  const b=ensureNudgeButton();if(!b)return;
  if(syncing||(!force&&Date.now()-lastSync<5000))return;
  syncing=true;lastSync=Date.now();
  try{const d=await support('nudge_get');b.textContent=labelFor(d.nudge);b.classList.toggle('active',!!d.nudge);if(d.nudge){scheduleNudge(d.nudge);if(d.due&&nudgeShown!==d.nudge.id){nudgeShown=d.nudge.id;showDue(d.nudge)}}}
  catch{b.textContent='🔔 Need a nudge?'}
  finally{syncing=false}
}
function closeModal(){document.getElementById('scNudgeModal')?.remove()}
function modalShell(inner){closeModal();const m=document.createElement('div');m.id='scNudgeModal';m.className='sc-nudge-modal';m.innerHTML=`<section class="sc-nudge-card"><button class="sc-nudge-x" id="scNudgeClose" aria-label="Close">×</button>${inner}</section>`;document.body.appendChild(m);$('#scNudgeClose',m).onclick=closeModal;m.onclick=e=>{if(e.target===m)closeModal()};return m}
function openNudge(){
  const m=modalShell(`<div class="brand-kicker">COME BACK WHEN YOU CAN</div><h2>Need a nudge?</h2><p>Pick when you want Second Chance to pull you back toward your next move. No streaks. No guilt.</p><div class="sc-nudge-choices"><button class="sc-nudge-main" data-p="tomorrow">Tomorrow</button><button class="sc-nudge-main" data-p="3_days">In 3 days</button><button class="sc-nudge-main" data-p="1_week">Next week</button><button class="sc-nudge-alt" id="scCancelNudge">Cancel current reminder</button></div><label class="sc-browser"><input id="scBrowserNudges" type="checkbox" ${get('sc_nudge_browser')==='1'?'checked':''}><span>Allow browser reminders on this device while Second Chance is open.</span></label><div class="sc-nudge-note">If the app is fully closed, web browsers may not deliver a reminder until you open Second Chance again.</div><div id="scNudgeMsg"></div>`);
  m.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>setNudge(b.dataset.p,m)));
  $('#scCancelNudge',m).onclick=async()=>{try{await support('nudge_cancel');clearTimeout(nudgeTimer);nudgeTimer=null;$('#scNudgeMsg',m).innerHTML='<div class="public-success">Reminder cancelled.</div>';setTimeout(()=>{closeModal();syncNudge(true)},700)}catch(e){$('#scNudgeMsg',m).innerHTML='<div class="public-error">'+esc(e.message)+'</div>'}};
  $('#scBrowserNudges',m).onchange=async e=>{if(e.target.checked){if('Notification'in window){const p=await Notification.requestPermission();set('sc_nudge_browser',p==='granted'?'1':'0');if(p!=='granted')e.target.checked=false}else e.target.checked=false}else set('sc_nudge_browser','0')};
}
async function setNudge(preset,m){try{const d=await support('nudge_set',{preset});$('#scNudgeMsg',m).innerHTML=`<div class="public-success">Got you. Nudge set for ${new Date(d.nudge.due_at).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}.</div>`;scheduleNudge(d.nudge);setTimeout(()=>{closeModal();syncNudge(true)},850)}catch(e){$('#scNudgeMsg',m).innerHTML='<div class="public-error">'+esc(e.message)+'</div>'}}
function scheduleNudge(n){clearTimeout(nudgeTimer);const ms=new Date(n.due_at).getTime()-Date.now();if(ms<=0){setTimeout(()=>showDue(n),50);return}if(ms>2147483000)return;nudgeTimer=setTimeout(()=>{browserNudge();showDue(n)},ms)}
function browserNudge(){if(get('sc_nudge_browser')!=='1'||!('Notification'in window)||Notification.permission!=='granted')return;try{new Notification('Second Chance',{body:'You asked for a nudge. Your next move is waiting — no guilt, just come back.',icon:'../second-chance-pilot/icon.svg'})}catch{}}
function showDue(n){
  if(!signedJourney())return;
  const m=modalShell(`<div class="brand-kicker">YOU ASKED ME TO PULL YOU BACK IN</div><h2>Aye. You coming back?</h2><div class="sc-due">No reset. No shame. You asked for this nudge, so here it is.</div><p>Your progress is right where you left it.</p><div class="sc-nudge-choices"><button class="sc-nudge-main" id="scOpenMove">Open my next move →</button><button class="sc-nudge-alt" id="scThreeMore">Give me 3 more days</button><button class="sc-nudge-alt" id="scDismissNudge">Dismiss</button></div><div id="scNudgeMsg"></div>`);
  $('#scOpenMove',m).onclick=async()=>{try{await support('nudge_ack',{nudgeId:n.id})}catch{}closeModal();const b=document.querySelector('[data-nav="today"]');if(b)b.click();else location.reload()};
  $('#scThreeMore',m).onclick=()=>setNudge('3_days',m);
  $('#scDismissNudge',m).onclick=async()=>{try{await support('nudge_ack',{nudgeId:n.id})}catch{}closeModal();syncNudge(true)};
}

function run(){injectLegal();ensureNudgeButton()}
const mo=new MutationObserver(()=>queueMicrotask(run));mo.observe(document.body,{childList:true,subtree:true});run();setTimeout(()=>syncNudge(true),900);setInterval(()=>{if(document.visibilityState==='visible')syncNudge()},60000);
})();