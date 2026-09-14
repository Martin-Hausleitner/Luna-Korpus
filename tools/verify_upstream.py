from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[1]
m=json.loads((r/'UPSTREAM-MANIFEST.json').read_text())
for a in m['apps']:
 b=(r/a['path']).read_bytes(); assert hashlib.sha256(b).hexdigest()==a['sha256'],a['path'];print('PASS',a['path'],a['sha256'])
assert hashlib.sha256((r/'theme-source/build.py').read_bytes()).hexdigest()==m['aster']['build_sha256']
assert (r/'index.html').read_bytes()==(r/'Luna-Korpus.html').read_bytes()
assert not (r/'Luna.html').exists()
print('PASS: 19 original entries, upstream build tool, Pages identity, rejected file absent')
