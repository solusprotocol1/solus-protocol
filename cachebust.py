#!/usr/bin/env python3
"""Inject cache-busting params and a proof banner into dist/index.html"""
import re, time, os

ts = str(int(time.time()))
dist_html = os.path.join(os.path.dirname(__file__), 'prod-app', 'dist', 'index.html')

with open(dist_html, 'r') as f:
    html = f.read()

# 1. Add cache-busting query params to ALL local asset references
html = re.sub(
    r'((?:src|href)="/prod-app/dist/assets/[^"]+)"',
    r'\1?cb=' + ts + '"',
    html
)
html = re.sub(
    r'((?:src|href)="/s4-assets/[^"]+)"',
    r'\1?cb=' + ts + '"',
    html
)

# 2. Add META no-cache tags
cache_meta = (
    '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">'
    '<meta http-equiv="Pragma" content="no-cache">'
    '<meta http-equiv="Expires" content="0">'
)
html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n    ' + cache_meta)

# 3. Inject visible debug banner after <body>
banner = (
    '<div id="s4bp" style="position:fixed;bottom:0;left:0;right:0;'
    'background:#00aaff;color:#000;padding:4px 12px;font-size:12px;'
    'font-weight:700;z-index:99999;text-align:center;cursor:pointer">'
    'BUILD ' + ts + ' — LATEST code loaded. Click to dismiss.</div>'
    '<script>document.getElementById("s4bp").onclick=function(){this.remove()};</script>'
)
html = html.replace('<body>', '<body>\n' + banner)

with open(dist_html, 'w') as f:
    f.write(html)

print(f"Cache-busted with cb={ts}")
print(f"Banner injected. File: {dist_html}")
