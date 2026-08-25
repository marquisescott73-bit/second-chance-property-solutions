(()=>{
  try{
    const h=new URLSearchParams(location.hash.replace(/^#/,''));
    if(h.get('type')==='recovery'&&h.get('access_token')){
      window.__SC_RECOVERY__={
        access:h.get('access_token'),
        refresh:h.get('refresh_token')||''
      };
    }
  }catch{}
})();
