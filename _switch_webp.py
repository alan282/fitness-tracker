# -*- coding: utf-8 -*-
"""转码后：切换数据引用到 .webp → 删除原 GIF → 版本升 3.0.0"""
import json, io, os, re

APP = r'C:\Users\zaynzhu\WorkBuddy\ZZY-瞎捣鼓\fitness-app'
MEDIA = os.path.join(APP, 'media')

# 1. 校验：webp 是否齐全
data = json.load(io.open(os.path.join(APP, 'data', 'exercises.json'), encoding='utf-8'))
missing = []
for e in data:
    base = e['gif'].split('/')[-1]
    wp = os.path.join(MEDIA, base[:-4] + '.webp')
    if not os.path.exists(wp):
        missing.append(e['id'] + ' ' + base)
if missing:
    print('缺失 webp %d 个，中止：' % len(missing))
    for m in missing[:10]:
        print('  ', m)
    raise SystemExit(1)
print('webp 齐全: %d / %d' % (len(data), len(data)))

# 2. 数据引用切换 gif → webp
for e in data:
    e['gif'] = e['gif'][:-4] + '.webp'
io.open(os.path.join(APP, 'data', 'exercises.json'), 'w', encoding='utf-8').write(
    json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('exercises.json 引用已切换')

# 3. 重建 exercises-data.js
out = []
for e in data:
    rec = {'id': e['id'], 'name': e['name'], 'name_zh': e['name_zh'], 'category': e['category'],
           'equipment': e['equipment'], 'target': e['target'], 'muscle_group': e.get('muscle_group'),
           'secondary_muscles': e.get('secondary_muscles') or [],
           'instructions_zh': e.get('instructions_zh') or [], 'kind': e.get('kind', 'exercise'),
           'img': 'media/' + e['image'].split('/')[-1], 'gif': 'media/' + e['gif'].split('/')[-1]}
    if e.get('poses'):
        rec['poses'] = e['poses']
    out.append(rec)
io.open(os.path.join(APP, 'js', 'exercises-data.js'), 'w', encoding='utf-8').write(
    'const EXERCISES = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';')
print('exercises-data.js 重建完成（%d 条）' % len(out))

# 4. 删除原 GIF
n = 0
freed = 0
for f in os.listdir(MEDIA):
    if f.lower().endswith('.gif'):
        p = os.path.join(MEDIA, f)
        freed += os.path.getsize(p)
        os.unlink(p)
        n += 1
print('删除原 GIF: %d 个，释放 %.1f MB' % (n, freed / 1048576))

# 5. 版本 3.0.0
src = io.open(os.path.join(APP, 'js', 'app.js'), encoding='utf-8').read()
src = re.sub(r"const APP_VERSION = '[\d.]+'", "const APP_VERSION = '3.0.0'", src)
io.open(os.path.join(APP, 'js', 'app.js'), 'w', encoding='utf-8', newline='\n').write(src)
io.open(os.path.join(APP, 'version.txt'), 'w', encoding='utf-8').write('3.0.0')
print('版本已升到 3.0.0')

# 6. 体积统计
tot = sum(os.path.getsize(os.path.join(MEDIA, f)) for f in os.listdir(MEDIA)) / 1048576
print('media 目录现在: %.1f MB（原 131.2 MB）' % tot)
