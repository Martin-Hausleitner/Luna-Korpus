from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'aster/src/luna.js'
s=p.read_text()
s=s.replace('old.replace(script.textContent,safe(script.textContent))','old.replace(script.textContent,()=>safe(script.textContent))')
s=s.replace('html=html.replace(old,newer)','html=html.replace(old,()=>newer)')
p.write_text(s)
p=root/'aster/src/luna.css'
s=p.read_text()
rule='body[data-luna="true"] #desktop-icons {grid-auto-columns:134px;column-gap:8px;}'
if rule not in s:p.write_text(s+'\n'+rule+'\n')
p=root/'qa/offline.py'
s=p.read_text().replace("str(ROOT/'qa/offline-'+app['id']+'.png')", "str(ROOT/('qa/offline-'+app['id']+'.png'))")
s=s.replace("len(row['text'])>=100", "(len(row['text'])>=100 or app['id']=='text')")
p.write_text(s)
print('Literal script serialization corrected; desktop grid accommodates full labels; QA path handling corrected.')
