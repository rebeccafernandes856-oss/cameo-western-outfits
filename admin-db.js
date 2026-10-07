const $=id=>document.getElementById(id);let db=null,products=[];
function configured(){return window.CAMEO_SUPABASE_URL&&!window.CAMEO_SUPABASE_URL.includes('PASTE_')&&window.CAMEO_SUPABASE_KEY&&!window.CAMEO_SUPABASE_KEY.includes('PASTE_')}
if(configured()) db=window.supabase.createClient(window.CAMEO_SUPABASE_URL,window.CAMEO_SUPABASE_KEY);
function csv(v){return v.split(',').map(x=>x.trim()).filter(Boolean)}
function showMsg(el,msg,ok=false){el.textContent=msg;el.className='msg '+(ok?'success':'error')}
async function boot(){if(!db){showMsg($('loginMsg'),'Add your Supabase URL and publishable/anon key in supabase-config.js first.');return}const {data}=await db.auth.getSession();setSession(!!data.session)}
function setSession(on){$('loginBox').classList.toggle('hidden',on);$('adminApp').classList.toggle('hidden',!on);$('logout').classList.toggle('hidden',!on);if(on)loadProducts()}
$('loginForm').onsubmit=async e=>{e.preventDefault();showMsg($('loginMsg'),'Signing in…',true);const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return showMsg($('loginMsg'),error.message);setSession(true)};
$('logout').onclick=async()=>{await db.auth.signOut();setSession(false)};
async function loadProducts(){
  $('list').innerHTML='<div class="loader">Loading complete catalog…</div>';
  const seed=window.CAMEO_CATALOG_SEED||[];
  let {data,error}=await db.from('products').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true});
  if(error){
    // Never leave Admin empty: show the packaged catalog and the exact DB problem.
    products=seed.map((x,i)=>({...x,id:'seed-'+i,_seed:true}));
    $('catalogMsg').innerHTML='<b>Database error:</b> '+error.message+'<br>Showing the 72 packaged products below so you can see every category. Run <b>ADMIN-DATABASE-FIX.sql</b> in Supabase to enable live editing.';
    $('catalogMsg').className='catalog-status error';
    draw(); return;
  }
  const dbProducts=data||[];
  const existing=new Set(dbProducts.map(p=>(p.category+'|'+p.name).toLowerCase()));
  const missing=seed.filter(p=>!existing.has((p.category+'|'+p.name).toLowerCase()));
  let importErrors=[];
  // Import category-by-category so one old category constraint cannot block every product.
  for(const cat of [...new Set(missing.map(x=>x.category))]){
    const batch=missing.filter(x=>x.category===cat);
    if(!batch.length) continue;
    const r=await db.from('products').insert(batch);
    if(r.error) importErrors.push(cat+': '+r.error.message);
  }
  const refreshed=await db.from('products').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true});
  const live=!refreshed.error?(refreshed.data||[]):dbProducts;
  const liveKeys=new Set(live.map(p=>(p.category+'|'+p.name).toLowerCase()));
  const unsynced=seed.filter(p=>!liveKeys.has((p.category+'|'+p.name).toLowerCase())).map((x,i)=>({...x,id:'seed-'+i,_seed:true}));
  products=[...live,...unsynced];
  if(importErrors.length){
    $('catalogMsg').innerHTML='<b>'+live.length+' products synced to Supabase.</b> '+unsynced.length+' packaged products are visible but not yet synced.<br>Run <b>ADMIN-DATABASE-FIX.sql</b> in Supabase, then refresh this page.<br><small>'+importErrors.join(' | ')+'</small>';
    $('catalogMsg').className='catalog-status error';
  }else{
    $('catalogMsg').textContent='Complete Cameo catalog is synced with Supabase ('+live.length+' products).';
    $('catalogMsg').className='catalog-status success';
  }
  draw();
}
function draw(){
  let q=$('search').value.toLowerCase(),f=$('filter').value;
  let rows=products.filter(p=>(f==='All'||p.category===f)&&(p.name+' '+p.category).toLowerCase().includes(q));
  const cats=['Dresses','Tops','Tshirts','Jumpsuits','Two-pc set','Nightsuits','Skirts','Bottoms'];
  const card=p=>`<div class="item"><img src="${p.image_url||'assets/logo.png'}"><div><h3>${p.name}</h3><div class="meta">${p.category} · ${p.price!==null?'₹'+p.price:'Price on enquiry'}<br>${(p.sizes||[]).join(', ')||'No sizes set'} · ${p.in_stock?'In stock':'Out of stock'}${p._seed?'<br><b style="color:#d14">Needs DB sync</b>':''}</div></div><div class="item-actions"><button class="edit" onclick="editProduct('${p.id}')">Edit</button>${p._seed?'':`<button class="delete" onclick="deleteProduct('${p.id}')">Delete</button>`}</div></div>`;
  let html='';
  for(const cat of cats){
    if(f!=='All'&&f!==cat) continue;
    const cr=rows.filter(p=>p.category===cat);
    html+=`<section class="admin-cat"><div class="admin-cat-head"><h3>${cat}</h3><span>${cr.length} products</span></div>${cr.length?cr.map(card).join(''):'<div class="cat-empty">No matching products</div>'}</section>`;
  }
  $('list').innerHTML=html||'<div class="loader">No products found.</div>';
  $('count').textContent=products.length;
  $('stockCount').textContent=products.filter(p=>p.in_stock).length;
}
function clearForm(){$('productForm').reset();$('editId').value='';$('oldImagePath').value='';$('preview').src='assets/logo.png';$('formTitle').textContent='Add Product';$('formMsg').textContent=''}
window.editProduct=id=>{let p=products.find(x=>x.id===id);if(!p)return;$('editId').value=p._seed?'':p.id;$('oldImagePath').value=p.image_path||'';$('name').value=p.name;$('category').value=p.category;$('price').value=p.price??'';$('sizes').value=(p.sizes||[]).join(', ');$('colors').value=(p.colors||[]).join(', ');$('stock').value=String(p.in_stock);$('preview').src=p.image_url||'assets/logo.png';$('formTitle').textContent='Edit Product';scrollTo({top:0,behavior:'smooth'})};
window.deleteProduct=async id=>{if(!confirm('Delete this product?'))return;let p=products.find(x=>x.id===id);const {error}=await db.from('products').delete().eq('id',id);if(error)return alert(error.message);if(p?.image_path)await db.storage.from('product-images').remove([p.image_path]);await loadProducts()};
$('image').onchange=e=>{let f=e.target.files[0];if(f)$('preview').src=URL.createObjectURL(f)};
$('productForm').onsubmit=async e=>{e.preventDefault();showMsg($('formMsg'),'Saving…',true);let id=$('editId').value||null,imageUrl=$('preview').src,imagePath=$('oldImagePath').value||null,file=$('image').files[0];try{if(file){let safe=(file.name||'image.jpg').replace(/[^a-zA-Z0-9._-]/g,'-');let path=`products/${crypto.randomUUID()}-${safe}`;let up=await db.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});if(up.error)throw up.error;imagePath=path;imageUrl=db.storage.from('product-images').getPublicUrl(path).data.publicUrl}let payload={name:$('name').value.trim(),category:$('category').value,price:$('price').value?Number($('price').value):null,sizes:csv($('sizes').value),colors:csv($('colors').value),image_url:imageUrl,image_path:imagePath,in_stock:$('stock').value==='true'};let res=id?await db.from('products').update(payload).eq('id',id):await db.from('products').insert(payload);if(res.error)throw res.error;showMsg($('formMsg'),'Product saved successfully.',true);clearForm();await loadProducts()}catch(err){showMsg($('formMsg'),err.message||String(err))}};
$('cancel').onclick=clearForm;$('search').oninput=draw;$('filter').onchange=draw;boot();
