#!/usr/bin/env python3
"""Wait for the exact Pages artifact, then test it in the real browser."""
from pathlib import Path
import urllib.request,hashlib,json,time,subprocess,datetime,sys
ROOT=Path(__file__).resolve().parents[1]
expected=hashlib.sha256((ROOT/'Luna-Korpus.html').read_bytes()).hexdigest()
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
url='https://martin-hausleitner.github.io/Luna-Korpus/'
receipt={'url':url,'expectedSha256':expected,'releaseCommit':commit,'attempts':[]}
matched=False
for n in range(30):
 try:
  request=urllib.request.Request(url+'?aster-originals='+commit+'&check='+str(n),headers={'Cache-Control':'no-cache','User-Agent':'Luna-originals-QA'})
  with urllib.request.urlopen(request,timeout=60) as response:
   data=response.read();actual=hashlib.sha256(data).hexdigest();row={'attempt':n+1,'status':response.status,'bytes':len(data),'sha256':actual,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
  receipt['attempts'].append(row);print('Pages',row,flush=True)
  if actual==expected:matched=True;break
 except Exception as exc:
  receipt['attempts'].append({'attempt':n+1,'error':str(exc)});print(str(exc),flush=True)
 time.sleep(8)
receipt['exactArtifactMatch']=matched
(ROOT/'qa/pages-deployment.json').write_text(json.dumps(receipt,indent=2)+'\n')
if not matched:raise SystemExit('Pages did not serve the verified file within the bounded check window.')
result=subprocess.run([sys.executable,'qa/smoke.py','--url',url+'?aster-originals='+commit,'--out','qa/live'],cwd=ROOT)
raise SystemExit(result.returncode)
