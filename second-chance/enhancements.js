(()=>{
'use strict';
const SB='https://pjskrjecyzoprpqhymbq.supabase.co';
const KEY='sb_publishable_PRyYNqhTAhk5sr3wKbIC0g_bYCLEhwd';
const REPORT=SB+'/functions/v1/sc-growth-report';
const $=(s,r=document)=>r.querySelector(s);
const esc=(x='')=>String(x).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const store={get(k){try{return localStorage.getItem(k)||''}catch{return''}},set(k,v){try{localStorage.setItem(k,String(v))}catch{}},del(k){try{localStorage.removeItem(k)}catch{}}};

const style=document.createElement('style');
style.textContent=`
.sc-linkbtn{border:0;background:none;color:#b76b4e;font-weight:850;text-decoration:underline;padding:6px 0;cursor:pointer}
.sc-help{position:fixed;left:12px;bottom:84px;z-index:9000;border:1px solid #d8d3ca;background:rgba(255,253,250,.96);color:#5d665f;border-radius:999px;padding:9px 12px;font:800 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 26px rgba(47,59,53,.12);cursor:pointer}
.sc-modal{position:fixed;inset:0;z-index:10000;background:rgba(35,42,38,.38);display:grid;place-items:center;padding:18px}
.sc-modal-card{width:min(520px,100%);max-height:88svh;overflow:auto;background:#fffdfa;border:1px solid #d9d7cf;border-radius:24px;padding:22px;box-shadow:0 22px 70px rgba(30,38,33,.22);color:#2f3b35}
.sc-modal-card h2{font-family:Georgia,serif;font-size:32px;line-height:1;margin:8px 0 10px}.sc-modal-card p{color:#6d7872;line-height:1.5}.sc-modal-card textarea,.sc-modal-card input{width:100%;box-sizing:border-box;border:1px solid #d6ddd7;border-radius:14px;padding:13px;background:white;color:#34423a}.sc-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px}.sc-modal-actions button{border-radius:13px;padding:11px 14px;font-weight:850}.sc-cancel{background:white;border:1px solid #ccd5cf;color:#536159}.sc-send{background:#c87559;border:0;color:white}.sc-meta{font-size:12px;background:#f4f7f3;border:1px solid #d9ded9;padding:10px;border-radius:12px;margin:10px 0}.sc-confirm-icon{font-size:40px;margin-bottom:8px}.sc-checklist{display:grid;gap:10px;margin:18px 0}.sc-check{display:flex;gap:9px;align-items:flex-start;background:#f6f8f5;border:1px solid #d9ded9;padding:12px;border-radius:13px}.sc-check b{color:#c87559}.sc-note{font-size:13px;color:#6d7872}.sc-password-eye{display:flex;justify-content:flex-end;margin-top:-8px;margin-bottom:10px}
@media(max-width:620px){.sc-help{bottom:78px;left:10px;padding:9px 11px}.sc-modal-card{padding:18px}}
`;
document.head.appendChild(style);

function currentAccess(){return store.get('sc_public_access')}
function currentRefresh(){return store.get('sc_public_refresh')}
function saveTokens(a,r){if(a)store.set('sc_public_access',a);if(r)store.set('sc_public_refresh',r)}
async function authRequest(path,body,method='POST',token=''){
  const headers={'Content-Type':'application/json','apikey':KEY};
  if(token)headers.Authorization='Bearer '+token;
  const res=await fetch(SB+path,{method,headers,body:JSON.stringify(body)});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw Error(data.msg||data.error_description||data.message||data.error||'Could not finish that request.');
  return data;
}
async function refreshAccess(){
  const refresh=currentRefresh();
  if(!refresh)throw Error('Please sign in again.');
  const d=await authRequest('/auth/v1/token?grant_type=refresh_token',{refresh_token:refresh});
  saveTokens(d.access_token,d.refresh_token||refresh);
  return d.access_token;
}

function shell(title,sub,body,primaryLabel='Continue'){
  const app=$('#app');if(!app)return;
  app.innerHTML=`<main class="auth-wrap"><section class="auth-card"><div class="auth-top"><div><div class="brand-kicker">Second Chance</div><h1>${esc(title)}</h1></div><button class="mini-back" id="scBack">Back</button></div><p class="muted">${esc(sub)}</p>${body}<div class="auth-actions"><button class="btn-main" id="scPrimary">${esc(primaryLabel)}</button></div><div class="auth-msg" id="scMsg"></div></section></main>`;
  window.scrollTo(0,0);
}
function goHome(){location.href=location.pathname.replace(/index\.html$/,'')||'./'}

function renderForgot(){
  shell('Reset your password','Put in the email you used for Second Chance. I’ll send you a secure reset link.',`<div class="field"><label>Email</label><input id="scResetEmail" type="email" autocomplete="email" placeholder="you@example.com"></div><p class="sc-note">The reset email can take a minute. Check spam or promotions too.</p>`,'Send reset link →');
  $('#scBack').onclick=goHome;
  $('#scPrimary').onclick=async()=>{
    const email=$('#scResetEmail').value.trim(),box=$('#scMsg');
    if(!email){box.innerHTML='<div class="public-error">Put your email in first.</div>';return}
    try{
      const redirect=location.origin+location.pathname.replace(/index\.html$/,'');
      await authRequest('/auth/v1/recover?redirect_to='+encodeURIComponent(redirect),{email});
      renderResetSent(email);
    }catch(e){box.innerHTML='<div class="public-error">'+esc(e.message)+'</div>'}
  };
}
function renderResetSent(email){
  shell('Check your email','Your password reset link is on the way.',`<div class="sc-confirm-icon">✉️</div><div class="sc-checklist"><div class="sc-check"><b>1.</b><span>Open the email sent to <strong>${esc(email)}</strong>.</span></div><div class="sc-check"><b>2.</b><span>Tap the password reset link.</span></div><div class="sc-check"><b>3.</b><span>Second Chance will reopen and let you make a new password.</span></div></div><p class="sc-note">You can close this screen after the email arrives.</p>`,'Back to sign in');
  $('#scBack').onclick=goHome;$('#scPrimary').onclick=goHome;
}
function renderConfirm(email){
  shell('Check your email','Your Second Chance account is almost ready.',`<div class="sc-confirm-icon">✉️</div><div class="sc-checklist"><div class="sc-check"><b>1.</b><span>Open the confirmation email${email?' sent to <strong>'+esc(email)+'</strong>':''}.</span></div><div class="sc-check"><b>2.</b><span>Tap <strong>Confirm email</strong>.</span></div><div class="sc-check"><b>3.</b><span>Come right back here and tap <strong>I Already Have Access</strong>.</span></div></div><p class="sc-note">If you do not see it, check spam or promotions.</p>`,'Back to Second Chance');
  $('#scBack').onclick=goHome;$('#scPrimary').onclick=goHome;
}
function renderNewPassword(){
  const recovery=window.__SC_RECOVERY__||{};
  if(!recovery.access&&!currentAccess())return;
  shell('Make a new password','Choose something you’ll remember. Your journey stays exactly where you left it.',`<div class="field"><label>New password</label><input id="scNewPass" type="password" minlength="8" autocomplete="new-password"></div><div class="field"><label>Password again</label><input id="scNewPass2" type="password" minlength="8" autocomplete="new-password"></div><p class="sc-note">Use at least 8 characters.</p>`,'Save new password →');
  $('#scBack').onclick=goHome;
  $('#scPrimary').onclick=async()=>{
    const p=$('#scNewPass').value,p2=$('#scNewPass2').value,box=$('#scMsg');
    if(p.length<8){box.innerHTML='<div class="public-error">Use at least 8 characters.</div>';return}
    if(p!==p2){box.innerHTML='<div class="public-error">Those passwords do not match.</div>';return}
    try{
      const access=recovery.access||currentAccess();
      await authRequest('/auth/v1/user',{password:p},'PUT',access);
      if(recovery.access)saveTokens(recovery.access,recovery.refresh||'');
      window.__SC_RECOVERY__=null;
      shell('Password changed','You’re good. Your progress was never touched.',`<div class="sc-confirm-icon">✓</div><p class="sc-note">Open your journey and pick up where you left off.</p>`,'Open my journey →');
      $('#scBack').onclick=goHome;$('#scPrimary').onclick=goHome;
    }catch(e){box.innerHTML='<div class="public-error">'+esc(e.message)+'</div>'}
  };
}

function context(){
  const mode=$('.mode')?.textContent?.trim()||'';
  const tag=$('.tag')?.textContent?.trim()||'';
  const title=$('#app h1')?.textContent?.replace(/\s+/g,' ')?.trim()||'';
  const m=(mode+' '+title).match(/Step\s+(\d{1,2})/i);
  return{screen:mode||title||'Second Chance',stepNumber:m?Number(m[1]):null,section:tag||null};
}
function removeHelp(){document.getElementById('scHelp')?.remove()}
function syncHelp(){
  const signed=!!currentAccess();
  const app=$('#app');if(!app)return;
  const authScreen=!!app.querySelector('.public-cover,.auth-wrap');
  if(!signed||authScreen||window.__SC_RECOVERY__){removeHelp();return}
  if(document.getElementById('scHelp'))return;
  const b=document.createElement('button');b.id='scHelp';b.className='sc-help';b.textContent='? Something ain’t working';b.onclick=openReport;document.body.appendChild(b);
}
function openReport(){
  const c=context();
  const modal=document.createElement('div');modal.className='sc-modal';modal.id='scReportModal';
  modal.innerHTML=`<section class="sc-modal-card"><div class="brand-kicker">Report a problem</div><h2>Tell me what went sideways.</h2><p>This is separate from your private journal. I’ll automatically attach where you were in the app so you don’t have to explain everything.</p><div class="sc-meta"><strong>Screen:</strong> ${esc(c.screen)}${c.stepNumber?'<br><strong>Step:</strong> '+c.stepNumber:''}${c.section?'<br><strong>Section:</strong> '+esc(c.section):''}</div><div class="field"><label>What happened?</label><textarea id="scProblem" rows="5" placeholder="Example: I tapped Continue and nothing happened."></textarea></div><div id="scReportMsg"></div><div class="sc-modal-actions"><button class="sc-cancel" id="scClose">Cancel</button><button class="sc-send" id="scSend">Send report</button></div></section>`;
  document.body.appendChild(modal);$('#scClose',modal).onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
  $('#scSend',modal).onclick=()=>sendReport(modal,c);
}
async function reportFetch(token,payload){
  const r=await fetch(REPORT,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+token},body:JSON.stringify(payload)});
  let d={};try{d=await r.json()}catch{}
  return{r,d};
}
async function sendReport(modal,c){
  const text=$('#scProblem',modal).value.trim(),box=$('#scReportMsg',modal),send=$('#scSend',modal);
  if(!text){box.innerHTML='<div class="public-error">Tell me what happened first.</div>';return}
  send.disabled=true;send.textContent='Sending…';
  const payload={description:text,screen:c.screen,stepNumber:c.stepNumber,section:c.section,userAgent:navigator.userAgent};
  try{
    let token=currentAccess();let out=await reportFetch(token,payload);
    if(out.r.status===401){token=await refreshAccess();out=await reportFetch(token,payload)}
    if(!out.r.ok)throw Error(out.d.error||'Could not send that report.');
    box.innerHTML='<div class="public-success">Got it. Your report was sent with the screen and step attached.</div>';
    send.textContent='Sent ✓';setTimeout(()=>modal.remove(),1200);
  }catch(e){box.innerHTML='<div class="public-error">'+esc(e.message)+'</div>';send.disabled=false;send.textContent='Send report'}
}

function enhanceLogin(){
  const card=$('.auth-card');if(!card)return;
  const h=card.querySelector('h1')?.textContent?.trim();
  if(h!=='Welcome back'||card.querySelector('#scForgot'))return;
  const b=document.createElement('button');b.id='scForgot';b.className='sc-linkbtn';b.type='button';b.textContent='Forgot password?';b.onclick=renderForgot;
  const actions=card.querySelector('.auth-actions');actions?.before(b);
}
let confirmSeen=false;
function detectConfirmation(){
  if(confirmSeen)return;
  const ok=$('.public-success');
  if(!ok||!/Account created\. Check your email/i.test(ok.textContent||''))return;
  confirmSeen=true;
  const email=$('#email')?.value?.trim()||'';
  renderConfirm(email);
}
function runEnhancements(){enhanceLogin();detectConfirmation();syncHelp()}
const mo=new MutationObserver(()=>queueMicrotask(runEnhancements));
mo.observe(document.body,{childList:true,subtree:true});
runEnhancements();
if(window.__SC_RECOVERY__)setTimeout(renderNewPassword,0);
})();
