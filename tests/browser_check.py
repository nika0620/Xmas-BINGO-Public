import functools, http.server, threading, subprocess, tempfile, pathlib, sys
root=pathlib.Path(__file__).resolve().parent.parent
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with tempfile.TemporaryDirectory(prefix='bingo-browser-') as profile:
 result=subprocess.run([r'C:\Program Files\Google\Chrome\Application\chrome.exe','--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'--dump-dom','--virtual-time-budget=20000',f'http://127.0.0.1:{server.server_port}/tests/browser.html'],capture_output=True,text=True,encoding='utf-8',timeout=60)
 import re, html
 match=re.search(r'<pre id="output">(.*?)</pre>',result.stdout,re.S)
 report=html.unescape(match.group(1)) if match else result.stderr
 print(report)
 server.shutdown()
 if 'ALL PASSED' not in report: sys.exit(1)
