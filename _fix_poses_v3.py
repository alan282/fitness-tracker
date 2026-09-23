# -*- coding: utf-8 -*-
"""对比图 v3：结束姿势取「差异大且稳定」的簇中心帧，避开过渡模糊帧
- 差异序列 d_i（vs 帧0）
- 稳定帧集合 S = {i : d_i >= 0.85 * max_d}
- 结束帧 = S 中与 S 内其他帧像素差异最小的帧（簇中心）
- 若 max_d 过小（起始/结束几乎无差异）则删除该对比图
"""
import os, json, io
from PIL import Image, ImageChops, ImageDraw, ImageFont

APP = r'C:\Users\zaynzhu\WorkBuddy\ZZY-瞎捣鼓\fitness-app'
MEDIA = os.path.join(APP, 'media')
font_s = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 15) if os.path.exists(r'C:\Windows\Fonts\msyh.ttc') else None

MIN_DIFF = 0.12  # bbox 面积占比阈值，低于此视为起止无差异

def bbox_area(a, b, w, h):
    bbox = ImageChops.difference(a, b).getbbox()
    return 0.0 if bbox is None else (bbox[2]-bbox[0])*(bbox[3]-bbox[1])/(w*h)

with io.open(os.path.join(APP, 'data', 'exercises.json'), encoding='utf-8') as f:
    data = json.load(f)

ok = skipped = removed = 0
fails = []
for e in data:
    gif_name = e['gif'].split('/')[-1]
    gif_path = os.path.join(MEDIA, gif_name)
    pose_name = gif_name.replace('.gif', '') + '-poses.jpg'
    pose_path = os.path.join(MEDIA, pose_name)
    if not os.path.exists(gif_path):
        continue
    try:
        with Image.open(gif_path) as im:
            n = getattr(im, 'n_frames', 1)
            frames = []
            for i in range(n):
                im.seek(i)
                frames.append(im.convert('RGB').copy())
        w, h = frames[0].size

        if n < 3:
            skipped += 1
            continue

        # 差异序列
        d = [0.0] + [bbox_area(frames[0], frames[i], w, h) for i in range(1, n)]
        max_d = max(d[1:])
        if max_d < MIN_DIFF:
            # 起止无差异，删除对比图
            if os.path.exists(pose_path):
                os.unlink(pose_path)
            e.pop('poses', None)
            removed += 1
            continue

        # 稳定帧集合与簇中心
        S = [i for i in range(1, n) if d[i] >= 0.85 * max_d]
        if len(S) == 1:
            end_i = S[0]
        else:
            best_i, best_cost = S[0], 1e9
            for i in S:
                cost = sum(bbox_area(frames[i], frames[j], w, h) for j in S if j != i) / (len(S) - 1)
                if cost < best_cost:
                    best_cost, best_i = cost, i
            end_i = best_i

        f_start, f_end = frames[0], frames[end_i]

        # 横排布局
        w0 = f_start.width
        pad, label_h, arrow_w, gap = 6, 24, 34, 6
        W = pad + w0 + gap + arrow_w + gap + w0 + pad
        H = label_h + w0 + pad
        canvas = Image.new('RGB', (W, H), '#ffffff')
        dr = ImageDraw.Draw(canvas)
        canvas.paste(f_start, (pad, label_h))
        canvas.paste(f_end, (pad + w0 + gap + arrow_w + gap, label_h))
        if font_s:
            dr.text((pad, 3), '起始', fill='#666666', font=font_s)
            dr.text((pad + w0 + gap + arrow_w + gap, 3), '结束', fill='#666666', font=font_s)
            cy = label_h + w0 // 2
            x1 = pad + w0 + gap
            dr.line([(x1, cy), (x1 + arrow_w - 8, cy)], fill='#ff4f00', width=3)
            dr.polygon([(x1 + arrow_w - 2, cy), (x1 + arrow_w - 12, cy - 7), (x1 + arrow_w - 12, cy + 7)], fill='#ff4f00')
        canvas.save(pose_path, quality=88)
        e['poses'] = 'media/' + pose_name
        ok += 1
    except Exception as ex:
        fails.append(gif_name + ' ' + str(ex)[:60])

with io.open(os.path.join(APP, 'data', 'exercises.json'), 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

out = []
for e in data:
    rec = {
        'id': e['id'], 'name': e['name'], 'name_zh': e['name_zh'],
        'category': e['category'], 'equipment': e['equipment'],
        'target': e['target'], 'muscle_group': e.get('muscle_group'),
        'secondary_muscles': e.get('secondary_muscles') or [],
        'instructions_zh': e.get('instructions_zh') or [],
        'kind': e.get('kind', 'exercise'),
        'img': 'media/' + e['image'].split('/')[-1],
        'gif': 'media/' + e['gif'].split('/')[-1],
    }
    if e.get('poses'):
        rec['poses'] = e['poses']
    out.append(rec)
with io.open(os.path.join(APP, 'js', 'exercises-data.js'), 'w', encoding='utf-8') as f:
    f.write('const EXERCISES = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';')

print('重生成: %d, 跳过(帧<3): %d, 删除(无差异): %d, 失败: %d' % (ok, skipped, removed, len(fails)))
for l in fails[:3]:
    print(' ', l)
