const $=id=>document.getElementById(id);let db=null,products=[];
let selectedColours=[];
const COMMON_COLOURS={black:'#000000',white:'#ffffff',pink:'#ffc0cb',blue:'#2563eb',beige:'#e8d8c3',brown:'#8b5e3c',red:'#dc2626',green:'#16a34a',yellow:'#facc15',orange:'#f97316',purple:'#9333ea',grey:'#9ca3af',gray:'#9ca3af',navy:'#172554',maroon:'#7f1d1d',wine:'#722f37',cream:'#fffdd0'};
function colourHex(name,hex){return hex||COMMON_COLOURS[String(name).toLowerCase()]||'#d8c2cd'}
function encodeColour(c){return c.hex?`${c.name}::${c.hex}`:c.name}
function decodeColour(v){let s=String(v||''),i=s.lastIndexOf('::');return i>0?{name:s.slice(0,i),hex:s.slice(i+2)}:{name:s,hex:colourHex(s)}}
function syncColours(){ $('colors').value=selectedColours.map(encodeColour).join(','); renderColours() }
function renderColours(){const box=$('colourList');if(!box)return;box.innerHTML=selectedColours.length?selectedColours.map((c,i)=>`<span class="colour-chip"><span class="colour-dot" style="background:${c.hex}"></span><span>${c.name}</span><button type="button" onclick="removeColour(${i})" aria-label="Remove ${c.name}">×</button></span>`).join(''):'<small style="color:#9a8490">No colours added yet.</small>'}
window.removeColour=i=>{selectedColours.splice(i,1);syncColours()}
function addColour(){let name=$('colourName').value.trim();if(!name)return;$('colourName').value='';if(selectedColours.some(c=>c.name.toLowerCase()===name.toLowerCase()))return;selectedColours.push({name,hex:$('colourPicker').value});syncColours()}

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
  const card=p=>`<div class="item"><img src="${p.image_url||'assets/logo.png'}"><div><h3>${p.name}</h3><div class="meta">${p.category} · ${p.price!==null?'₹'+p.price:'Price on enquiry'}<br>${(p.sizes||[]).join(', ')||'No sizes set'}<br>Colours: ${(p.colors||[]).map(x=>decodeColour(x).name).join(', ')||'None'} · ${p.in_stock?'In stock':'Out of stock'}${p._seed?'<br><b style="color:#d14">Needs DB sync</b>':''}</div></div><div class="item-actions"><button class="edit" onclick="editProduct('${p.id}')">Edit</button>${p._seed?'':`<button class="delete" onclick="deleteProduct('${p.id}')">Delete</button>`}</div></div>`;
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
function clearForm(){$('productForm').reset();selectedColours=[];syncColours();$('editId').value='';$('oldImagePath').value='';$('preview').src='assets/logo.png';$('formTitle').textContent='Add Product';$('formMsg').textContent=''}
window.editProduct=id=>{let p=products.find(x=>x.id===id);if(!p)return;$('editId').value=p._seed?'':p.id;$('oldImagePath').value=p.image_path||'';$('name').value=p.name;$('category').value=p.category;$('price').value=p.price??'';$('sizes').value=(p.sizes||[]).join(', ');selectedColours=(p.colors||[]).map(decodeColour);syncColours();$('stock').value=String(p.in_stock);$('preview').src=p.image_url||'assets/logo.png';$('formTitle').textContent='Edit Product';scrollTo({top:0,behavior:'smooth'})};
window.deleteProduct=async id=>{if(!confirm('Delete this product?'))return;let p=products.find(x=>x.id===id);const {error}=await db.from('products').delete().eq('id',id);if(error)return alert(error.message);if(p?.image_path)await db.storage.from('product-images').remove([p.image_path]);await loadProducts()};
$('image').onchange=e=>{let f=e.target.files[0];if(f)$('preview').src=URL.createObjectURL(f)};
$('productForm').onsubmit=async e=>{e.preventDefault();showMsg($('formMsg'),'Saving…',true);let id=$('editId').value||null,imageUrl=$('preview').src,imagePath=$('oldImagePath').value||null,file=$('image').files[0];try{if(file){let safe=(file.name||'image.jpg').replace(/[^a-zA-Z0-9._-]/g,'-');let path=`products/${crypto.randomUUID()}-${safe}`;let up=await db.storage.from('product-images').upload(path,file,{cacheControl:'3600',upsert:false});if(up.error)throw up.error;imagePath=path;imageUrl=db.storage.from('product-images').getPublicUrl(path).data.publicUrl}let payload={name:$('name').value.trim(),category:$('category').value,price:$('price').value?Number($('price').value):null,sizes:csv($('sizes').value),colors:selectedColours.map(encodeColour),image_url:imageUrl,image_path:imagePath,in_stock:$('stock').value==='true'};let res=id?await db.from('products').update(payload).eq('id',id):await db.from('products').insert(payload);if(res.error)throw res.error;showMsg($('formMsg'),'Product saved successfully.',true);clearForm();await loadProducts()}catch(err){showMsg($('formMsg'),err.message||String(err))}};
$('addColour').onclick=addColour;$('colourName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addColour()}});renderColours();$('cancel').onclick=clearForm;$('search').oninput=draw;$('filter').onchange=draw;boot();
