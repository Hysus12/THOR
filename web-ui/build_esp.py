"""ESP build: shared core.js + five small theme pages (+ gzip copies) -> dist_esp/   (what you would put on LittleFS)
Only ONE page is ever sent per visit; switching style = loading another small page, core.js comes from the browser cache."""
import glob, gzip, os, re, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'dist_esp')
os.makedirs(OUT, exist_ok=True)
core = open(os.path.join(HERE, 'core.js'), encoding='utf8').read().replace('/*__SCENE__*/', open(os.path.join(HERE, 'scene.js'), encoding='utf8').read()).replace('/*__MOTION__*/', open(os.path.join(HERE, 'motion.js'), encoding='utf8').read())

def minify_js(s):
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)                       # block comments
    s = re.sub(r'(?m)^\s*//.*$', '', s)                                # whole-line comments
    return re.sub(r'\n\s*\n+', '\n', s)

def minify_css_html(s):
    s = re.sub(r'<!--(?!SCENE|CORE).*?-->', '', s, flags=re.S)
    return re.sub(r'\n\s+', '\n', s)

files = {}
files['core.js'] = minify_js(core)
version = hashlib.sha256(files['core.js'].encode('utf8')).hexdigest()[:12]
for f in sorted(glob.glob(os.path.join(HERE, 'themes', '*.html'))):
    name = os.path.basename(f)
    html = minify_css_html(open(f, encoding='utf8').read())
    html = html.replace('<!--SCENEslice-->', '<div class="scene-wrap" data-c="scene" data-fit="slice"></div>').replace('<!--SCENE-->', '<div class="scene-wrap" data-c="scene"></div>')
    html = html.replace('<!--CORE-->', '<script>window.CURTAIN_UI_VERSION="' + version + '";</script><script src="core.js?v=' + version + '"></script>')
    files[name] = html
files['index.html'] = ('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>捲簾將軍</title>'
                       '<script>var s="apple";try{s=JSON.parse(localStorage.getItem("cg.style"))||s}catch(e){}var q=new URLSearchParams(location.search);q.set("v","' + version + '");location.replace(s+".html?"+q.toString())</script>')

rows, tot_raw, tot_gz = [], 0, 0
for name, text in files.items():
    raw = text.encode('utf8')
    gz = gzip.compress(raw, 9)
    open(os.path.join(OUT, name), 'wb').write(raw)
    open(os.path.join(OUT, name + '.gz'), 'wb').write(gz)
    rows.append((name, len(raw), len(gz)))
    tot_raw += len(raw)
    tot_gz += len(gz)
print(f'{"file":16s}{"raw KB":>9s}{"gzip KB":>9s}')
for n, r, g in rows:
    print(f'{n:16s}{r/1024:9.1f}{g/1024:9.1f}')
print(f'{"TOTAL (2 styles + core)":28s}{tot_raw/1024:9.1f}{tot_gz/1024:9.1f}')
one = [r for r in rows if r[0] == 'core.js'][0]
for n in ('apple.html', 'google.html'):
    t = [r for r in rows if r[0] == n][0]
    print(f'one visit ({n}): index+core+page = raw {(one[1]+t[1])/1024:.1f} KB, gzip {(one[2]+t[2])/1024:.1f} KB')
