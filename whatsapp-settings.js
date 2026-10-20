// Public storefront contact settings. Owner edits the value in Admin.
window.CAMEO_WHATSAPP = '917506590090';
window.CAMEO_WHATSAPP_READY = (async () => {
 try {
  if (!window.supabase || !window.CAMEO_SUPABASE_URL || !window.CAMEO_SUPABASE_KEY) return;
  const client=window.supabase.createClient(window.CAMEO_SUPABASE_URL,window.CAMEO_SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await client.from('site_settings').select('whatsapp_number').eq('id',1).maybeSingle();
  if(!error && data && /^91[6-9]\d{9}$/.test(data.whatsapp_number)) window.CAMEO_WHATSAPP=data.whatsapp_number;
 }catch(e){console.warn('Using default WhatsApp number',e)}
 document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{try{const u=new URL(a.href);u.pathname='/'+window.CAMEO_WHATSAPP;a.href=u.toString()}catch(e){}});
})();
