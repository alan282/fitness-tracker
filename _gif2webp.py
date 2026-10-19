# -*- coding: utf-8 -*-
"""全库 GIF → 动画 WebP（q80 / method=6，保持尺寸·帧数·时长·循环）"""
import os, sys, time
from multiprocessing import Pool, cpu_count
from PIL import Image, ImageSequence

MEDIA = r'C:\Users\zaynzhu\WorkBuddy\ZZY-瞎捣鼓\fitness-app\media'

def conv(task):
    src, dst = task
    try:
        gif = Image.open(src)
        frames, durs = [], []
        for fr in ImageSequence.Iterator(gif):
            frames.append(fr.convert('RGB').copy())
            durs.append(fr.info.get('duration', 100))
        if not frames:
            return (src, 0, 0, '空')
        frames[0].save(dst, save_all=True, append_images=frames[1:], duration=durs,
                       format='WEBP', quality=80, method=6, loop=0, optimize=True)
        return (src, os.path.getsize(src), os.path.getsize(dst), 'ok')
    except Exception as e:
        return (src, 0, 0, 'ERR:' + str(e)[:60])

if __name__ == '__main__':
    files = [f for f in os.listdir(MEDIA) if f.lower().endswith('.gif')]
    tasks = [(os.path.join(MEDIA, f), os.path.join(MEDIA, f[:-4] + '.webp')) for f in files]
    n = min(8, cpu_count())
    t0 = time.time()
    ok = err = 0
    tin = tout = 0
    with Pool(n) as pool:
        for i, (src, si, so, st) in enumerate(pool.imap_unordered(conv, tasks, chunksize=8), 1):
            if st == 'ok':
                ok += 1; tin += si; tout += so
            else:
                err += 1
                print('FAIL', os.path.basename(src), st, flush=True)
            if i % 200 == 0:
                print('进度 %d/%d  %.0fs' % (i, len(tasks), time.time() - t0), flush=True)
    print()
    print('完成: 成功 %d / 失败 %d / 共 %d，耗时 %.0f s' % (ok, err, len(tasks), time.time() - t0))
    print('体积: %.1f MB → %.1f MB（省 %.0f%%）' % (tin / 1048576, tout / 1048576, (1 - tout / tin) * 100))
