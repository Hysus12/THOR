"""Inline core.js (+ the shared window scene) into every themes/<name>.html  ->  dist/<name>.html (standalone, flashable)."""
import glob, os
HERE = os.path.dirname(os.path.abspath(__file__))
core = open(os.path.join(HERE, 'core.js'), encoding='utf8').read().replace('/*__SCENE__*/', open(os.path.join(HERE, 'scene.js'), encoding='utf8').read()).replace('/*__MOTION__*/', open(os.path.join(HERE, 'motion.js'), encoding='utf8').read())
SCENE = '<div class="scene-wrap" data-c="scene"></div>'
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
for f in sorted(glob.glob(os.path.join(HERE, 'themes', '*.html'))):
    name = os.path.basename(f)
    html = open(f, encoding='utf8').read().replace('<!--SCENEslice-->', SCENE.replace('data-c="scene"', 'data-c="scene" data-fit="slice"')).replace('<!--SCENE-->', SCENE).replace('<!--CORE-->', '<script>\n' + core + '\n</script>')
    open(os.path.join(HERE, 'dist', name), 'w', encoding='utf8').write(html)
    print(f'{name:16s} {len(html.encode())/1024:5.1f} KB')

pk = os.path.join(HERE, 'picker', 'index.html')
if os.path.exists(pk):
    open(os.path.join(HERE, 'dist', 'index.html'), 'w', encoding='utf8').write(open(pk, encoding='utf8').read())
    print('index.html (picker)')
