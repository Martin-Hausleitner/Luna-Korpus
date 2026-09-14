from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'aster/src/luna.js'
s=p.read_text()
anchor="  const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));"
replacement="""  // about:srcdoc has no hierarchical path. Original static apps that scope
  // their local storage with new URL('.', location.href) need their packaged
  // directory as the base. Their source and storage implementation are unchanged.
  const NativeURL=globalThis.URL;
  globalThis.URL=class extends NativeURL {
   constructor(value,base){if(typeof base==='string'&&(/^(about:srcdoc|about:blank|blob:)/.test(base)||base==='null'))base=root;super(value,base);}
  };
  const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));"""
assert anchor in s
if 'const NativeURL=globalThis.URL;' not in s:s=s.replace(anchor,replacement,1)
p.write_text(s)
print('Added a resource-base compatibility rule for packaged srcdoc applications.')
