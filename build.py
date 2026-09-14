#!/usr/bin/env python3
"""Build the themed original Aster with Aster's unmodified standard-library builder."""
from pathlib import Path
import subprocess,sys,shutil
ROOT=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(ROOT/'aster/build.py'),'--output',str(ROOT/'Luna-Korpus.html')],check=True)
shutil.copyfile(ROOT/'Luna-Korpus.html',ROOT/'index.html')
print('Pages index.html is byte-identical to Luna-Korpus.html.')
