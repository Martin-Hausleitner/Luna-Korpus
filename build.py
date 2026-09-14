#!/usr/bin/env python3
"""Build the themed Aster desktop and Pages entry points."""
from pathlib import Path
import subprocess, shutil, sys
r=Path(__file__).resolve().parent
out=r/'Luna-Korpus.html'
subprocess.run([sys.executable,str(r/'theme-source/build.py'),'--output',str(out)],check=True)
for name in ('index.html','Luna.html'):
    shutil.copyfile(out,r/name)
print('Built Luna-Korpus.html; Pages index.html and Luna.html are byte-identical aliases.')
