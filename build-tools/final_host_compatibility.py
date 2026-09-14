from pathlib import Path
import runpy
root=Path(__file__).resolve().parents[1]
runpy.run_path(str(root/'build-tools/fix_srcdoc_base.py'),run_name='__main__')
p=root/'aster/src/luna.js';s=p.read_text()
s=s.replace('Object.defineProperty(navigator,"serviceWorker",{value:undefined,configurable:true});','delete navigator.serviceWorker;delete Object.getPrototypeOf(navigator).serviceWorker;')
p.write_text(s)
p=root/'qa/offline.py';s=p.read_text()
s=s.replace("row['errors']=errors[error_start:];row['seconds']", "row['errors']=errors[error_start:];row['pass']=row['pass'] and not row['errors'];row['seconds']")
p.write_text(s)
print('Packaged apps expose accurate unavailable-service-worker feature detection.')
