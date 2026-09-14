from pathlib import Path
import subprocess, shutil, json, hashlib, base64, gzip, mimetypes
BASE=Path(__file__).resolve().parent
OUT=BASE/'release'; SRC=OUT/'aster'; CAT=BASE/'catalog'
shutil.copytree(BASE/'Aster',SRC,dirs_exist_ok=True,ignore=shutil.ignore_patterns('.git','Aster.html','__pycache__'))
(OUT/'Apps').mkdir(exist_ok=True); (OUT/'licenses').mkdir(exist_ok=True)
# The rejected handmade entry is not reused. Preserve all unrelated repository files.
if (OUT/'Luna.html').exists(): (OUT/'Luna.html').unlink()
rows=[
 ('tabelle','Tabelle','Gridline','Gridline','dist/index.html',None),
 ('planung','Planung','MeridianPlan','MeridianPlan','dist/meridian-plan.html',None),
 ('office','Office','MeridianOffice','MeridianOffice','dist/meridian-office.html',None),
 ('dateien','Dateien','TwinForge','TwinForge','TwinForge.html',None),
 ('akte','Akte','Folio','Folio','pages-dist/index.html','pages-dist'),
 ('pdf','PDF','FolioPro','FolioPro','dist/folio-pro.html',None),
 ('mail','Mail','Quire','Quire','Quire.html',None),
 ('text','Text','NotepadXP','NotepadXP','NotepadXP.html',None),
 ('auswertung','Auswertung','LatticeAnalytics','LatticeAnalytics','dist/lattice.html',None),
 ('rechenblatt','Rechenblatt','AxiomWorksheet','AxiomWorksheet','dist/index.html',None),
 ('zeichnung','Zeichnung','Draftline','Draftline','Draftline.html',None),
 ('cad','CAD','KestrelCAD','KestrelCAD','Kestrel-CAD.html',None),
 ('aufmass','Aufmaß','PlanforgeReview','PlanforgeReview','dist/index.html','dist'),
 ('tafel','Tafel','Orivane','Orivane','dist/Orivane.html',None),
 ('gespraech','Gespräch','Veyra Workspace','VeyraWorkspace','dist/index.html','dist'),
 ('signatur','Signatur','Velsign','Velsign','dist-pages/index.html','dist-pages'),
 ('korpus','Korpus','Formalyth','Formalyth','_site/index.html','_site'),
 ('material','Material','StrataForge','StrataForge','index.html','.'),
 ('modell','Modell','Avolith Studio','AvolithStudio','dist/Avolith-Studio.html',None)
]
manifest=[]; payload={}
for id,de,original,repo,entry,tree in rows:
 root=CAT/repo; p=root/entry; raw=p.read_bytes(); dest=OUT/'Apps'/f'{id}.html'; dest.write_bytes(raw)
 sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
 licenses=OUT/'licenses'/repo; licenses.mkdir(exist_ok=True)
 for name in ['LICENSE','LICENSE.md','THIRD_PARTY_NOTICES.md','README.md']:
  if (root/name).exists():shutil.copy2(root/name,licenses/name)
 licensed=(root/'LICENSE').exists() or (root/'LICENSE.md').exists()
 item={'id':id,'installedId':'custom-luna-'+id,'title':de+' ('+original+')','original':original,'repo':repo,'upstream':'https://github.com/wieslawsoltes/'+repo,'live':'https://wieslawsoltes.github.io/'+repo+'/','commit':sha,'sourcePath':entry,'localPath':'Apps/'+id+'.html','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'packaging':'upstream-modular-with-local-assets' if tree else 'upstream-portable-html','licenseFile':'licenses/'+repo+'/LICENSE' if (root/'LICENSE').exists() else None,'licenseStatus':'upstream-notice-retained' if licensed else 'No app-wide license declared in upstream checkout; no MIT claim for this application.'}
 assets={}
 if tree:
  origin=root/tree; local=OUT/'Apps'/id; local.mkdir(exist_ok=True)
  if repo=='StrataForge':
   paths=[root/'index.html',root/'styles.css',root/'LICENSE']
   for dirname in ['src','examples']:
    paths += list((root/dirname).rglob('*'))
  else: paths=list(origin.rglob('*'))
  for f in paths:
   if not f.is_file() or any(part in ['.git','__pycache__','.DS_Store'] for part in f.parts):continue
   rel=f.relative_to(origin).as_posix(); data=f.read_bytes(); target=local/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
   mime=mimetypes.guess_type(rel)[0] or 'application/octet-stream'
   if f.suffix in ['.js','.mjs']:mime='text/javascript'
   if f.suffix=='.wasm':mime='application/wasm'
   assets[rel]={'mime':mime,'data':base64.b64encode(data).decode(),'sha256':hashlib.sha256(data).hexdigest()}
  item['assetRoot']='Apps/'+id+'/'
  item['assetCount']=len(assets)
  (OUT/'Apps'/id/'UPSTREAM-MANIFEST.json').write_text(json.dumps({k:{'sha256':v['sha256'],'bytes':len(base64.b64decode(v['data']))} for k,v in assets.items()},indent=2))
 payload[id]={'html':base64.b64encode(raw).decode(),'assets':assets}
 manifest.append(item)
 print(repo, 'EXACT',len(raw),'bytes; assets',len(assets),sum(len(base64.b64decode(v['data'])) for v in assets.values()),flush=True)
(OUT/'app-mapping.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(BASE/'payload-raw.json').write_text(json.dumps(payload,separators=(',',':')))
(OUT/'build-tools').mkdir(exist_ok=True)
shutil.copy2(__file__,OUT/'build-tools/prepare_release.py')
print('Prepared',len(manifest),'original applications. Aster',subprocess.check_output(['git','rev-parse','HEAD'],cwd=BASE/'Aster',text=True).strip())
