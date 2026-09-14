#!/usr/bin/env python3
"""Serve the entire local distribution, including unchanged multipart app assets."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import argparse
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8080);a=p.parse_args()
r=Path(__file__).resolve().parent
s=ThreadingHTTPServer(('127.0.0.1',a.port),partial(SimpleHTTPRequestHandler,directory=str(r)))
print(f'LUNA: http://127.0.0.1:{s.server_port}/',flush=True)
try:s.serve_forever()
except KeyboardInterrupt:pass
finally:s.server_close()
