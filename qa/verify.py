#!/usr/bin/env python3
"""Offline, stdlib-only source and build-integrity verification."""
import json,hashlib,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 checks=[]
 def test(name,ok,details=None):
  checks.append({'name':name,'pass':bool(ok),'details':details});print(('PASS ' if ok else 'FAIL ')+name)
 apps=json.loads((ROOT/'app-mapping.json').read_text())
 test('Exactly nineteen original entries',len(apps)==19)
 for app in apps:
  path=ROOT/app['localPath'];test(app['title']+' exact upstream HTML',path.is_file() and digest(path)==app['sha256'],{'path':app['localPath'],'sha256':app['sha256']})
  if app.get('assetRoot'):
   folder=ROOT/app['assetRoot'];assets=json.loads((folder/'UPSTREAM-MANIFEST.json').read_text());wrong=[p for p,a in assets.items() if not (folder/p).is_file() or digest(folder/p)!=a['sha256']]
   test(app['repo']+' exact modular assets',not wrong,{'count':len(assets),'mismatches':wrong})
 p=json.loads((ROOT/'PROVENANCE.json').read_text())
 native={f['path']:f for f in p['sourceFiles']}
 for name in p['untouchedEngineFiles']:
  if name=='build.py':
   test('Stock Aster builder SHA-256',digest(ROOT/'aster/build.py')=='3a3915ac1dd94f631661762527f0ecf670e33d333ca93a3b15bc7af28d5d5d71')
  else:test('Native engine unchanged: '+name,digest(ROOT/'aster'/name)==native[name]['upstreamSha256'])
 test('Pages entry equals themed Aster',digest(ROOT/'index.html')==digest(ROOT/'Luna-Korpus.html'))
 test('The rejected Luna.html is absent',not (ROOT/'Luna.html').exists())
 theme=json.loads((ROOT/'Luna-Korpus.astertheme').read_text())
 test('Export is native Aster theme format',theme.get('format')=='aster-theme' and theme.get('version')==1)
 test('Export uses Windows and requested accent',theme['theme']['profile']=='windows' and theme['theme']['accent'].lower()=='#0078c8')
 report={'pass':all(c['pass'] for c in checks),'checks':checks,'entrySha256':digest(ROOT/'Luna-Korpus.html')}
 (ROOT/'qa/integrity.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 return 0 if report['pass'] else 1
if __name__=='__main__':sys.exit(main())
