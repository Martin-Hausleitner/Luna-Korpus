#!/usr/bin/env python3
"""Build themed Aster using its unmodified standard-library build tool."""
from pathlib import Path
import subprocess, shutil, sys
r=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(r/'theme-source/build.py'),'--output',str(r/'Luna-Korpus.html')],check=True)
shutil.copyfile(r/'Luna-Korpus.html',r/'index.html')
print('Luna-Korpus.html and Pages index.html are identical.')
