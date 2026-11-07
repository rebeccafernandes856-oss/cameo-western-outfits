#!/usr/bin/env python3
"""Generate server-readable Open Graph HTML for GitHub Pages. Set SITE_URL to public site root."""
import os,json,html,re
from pathlib import Path
from urllib.parse import quote
root=Path(__file__).resolve().parent
site=os.getenv('SITE_URL','').strip().rstrip('/')
if not site:
    cname=root/'CNAME'
    if cname.exists(): site='https://'+cname.read_text().strip()
if not site:
    repo=os.getenv('GITHUB_REPOSITORY','')
    if '/' in repo:
        owner,name=repo.split('/',1)
        site=f'https://{owner}.github.io'+('' if name.lower()==owner.lower()+'.github.io' else '/'+name)
if not site:
    print('Set SITE_URL for fully qualified OG URLs; skipping generation')
    raise SystemExit(0)
products=json.loads((root/'catalog-seed.js').read_text().split('=',1)[1].rstrip(';\n'))
def esc(v): return html.escape(str(v),quote=True)
def absolute(path):
    if str(path).startswith(('https://','http://')): return path
    return site+'/'+str(path).lstrip('/')
def tags(title,desc,image,url,typ='website'):
    return '\n'.join(f'<meta property="og:{k}" content="{esc(v)}">' for k,v in [('type',typ),('site_name','Cameo Western Outfits'),('title',title),('description',desc),('image',image),('url',url)])+'\n<meta name="twitter:card" content="summary_large_image">'
for filename,title,desc,img in [('index.html','Cameo Western Outfits | Women’s Western Wear','Discover dresses, tops and western fashion at Cameo Western Outfits.','assets/banners/banner-1.jpg'),('shop.html','Shop Western Outfits | Cameo','Explore western dresses, tops and more at Cameo Western Outfits.','assets/banners/banner-3.jpg')]:
    path=root/filename
    content=path.read_text()
    content=re.sub(r'<!-- CAMEO OG START -->.*?<!-- CAMEO OG END -->','',content,flags=re.S)
    content=content.replace('<head>','<head><!-- CAMEO OG START -->'+tags(title,desc,absolute(img),absolute(filename))+'<!-- CAMEO OG END -->',1)
    path.write_text(content)
folder=root/'products';folder.mkdir(exist_ok=True)
for i,product in enumerate(products,1):
    name=product.get('name') or f'Product {i}'
    image=product.get('image_url') or 'assets/logo.png'
    price=product.get('price'); description=f'{name} | Cameo Western Outfits'+(f' | ₹{price}' if price is not None else '')
    filename=f'item-{i:03d}.html'; url=absolute('products/'+filename)
    # redirect humans to shop; OG crawlers read the HTML without running JS
    body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(name)+' | Cameo Western Outfits</title>'+tags(name,description,absolute(image),url,'product')+'<meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+esc(url)+'"></head><body><p>'+esc(name)+'</p><p><a href="'+esc(absolute('shop.html'))+'">Shop at Cameo Western Outfits</a></p><img src="'+esc(absolute(image))+'" alt="'+esc(name)+'"><script>location.replace('+json.dumps(absolute('shop.html'))+')</script></body></html>'
    (folder/filename).write_text(body)
print(f'Generated {len(products)} product OG preview pages for {site}')
