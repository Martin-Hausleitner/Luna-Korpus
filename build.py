#!/usr/bin/env python3
"""Build the themed original Aster with Aster's unmodified standard-library builder."""
from pathlib import Path
import subprocess,sys,shutil
ROOT=Path(__file__).resolve().parent
out=ROOT/'Luna-Korpus.html'
subprocess.run([sys.executable,str(ROOT/'aster/build.py'),'--output',str(out)],check=True)
shutil.copyfile(out,ROOT/'index.html')
print('Pages index.html is byte-identical to Luna-Korpus.html.')
