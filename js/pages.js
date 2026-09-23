/* ── 页面渲染：今日 / 方案 / 动作库 / 数据 / 设置 / 训练执行 / 弹窗 ── */

const Pages = {
  current: null,

  render(page) {
    this.current = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    const el = document.getElementById('page-' + page);
    if (el) {
      const map = {
        today: () => this.today(el),
        plan: () => this.plan(el),
        library: () => this.library(el),
        stats: () => this.stats(el),
        settings: () => this.settings(el),
        workout: () => { if (Workout.session) Workout.render(el); else return this.today(el); },
      };
      (map[page] || (() => {}))();
      el.classList.add('active');
      window.scrollTo(0, 0);
    }
  },

  /* ── 今日页 ── */
  today(el) {
    const plan = DB.getPlan();
    if (!plan) { el.innerHTML = '<div class="empty"><div class="big">无方案</div><p>还没有训练方案</p><button class="btn primary" onclick="App.go(\'settings\')">去创建方案</button></div>'; return; }
    const st = DB.getPlanState();
    const dayIdx = st.dayCursor % plan.days.length;
    const day = plan.days[dayIdx];
    const workouts = DB.getWorkouts();

    // 统计
    const totalVol = workouts.reduce((a, w) => a + (w.entries || []).reduce((b, e) => b + e.sets.reduce((c, s) => c + (s.weight || 0) * (s.reps || 0), 0), 0), 0);
    // 连续训练周
    const weeks = new Set(workouts.map(w => { const d = new Date(w.date); const y = new Date(d); y.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); return fmtDateFull(y); }));
    let streak = 0;
    if (workouts.length) {
      const sorted = [...weeks].sort().reverse();
      let expect = null;
      for (const w of sorted) {
        if (expect === null || w === expect) { streak++; expect = this._prevWeek(expect || w); }
        else break;
      }
    }

    const exList = day.exercises.map(item => {
      const ex = getEx(item.exId); if (!ex) return '';
      const sug = Planner.suggestWeight(ex);
      return `<div class="ex-row">
        <img class="thumb" src="${ex.img}" loading="lazy" alt="">
        <div class="info">
          <div class="nm">${esc(ex.name_zh)}</div>
          <div class="sub">${zh(ex.equipment)} · ${zh(ex.target)}${sug ? ' · 建议 ' + sug + 'kg' : ''}</div>
        </div>
        <div class="sets-info"><b>${item.sets}</b> 组 × <b>${item.reps}</b> 次</div>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="today-hero">
        <div class="label">今日训练 · 第 ${dayIdx + 1}/${plan.days.length} 天</div>
        <div class="day-name">${esc(day.name)}</div>
        <div class="meta">${esc(plan.name)} · ${Planner.GOALS[plan.goal].label} · ${day.exercises.length} 个动作</div>
        <button class="btn" onclick="Workout.start(${dayIdx})">开始训练</button>
      </div>
      <div class="stat-grid">
        <div class="stat-cell"><div class="num">${workouts.length}</div><div class="lbl">累计训练</div></div>
        <div class="stat-cell"><div class="num">${Math.round(totalVol / 1000)}k</div><div class="lbl">总容量 kg</div></div>
        <div class="stat-cell"><div class="num">${streak}</div><div class="lbl">连续训练周</div></div>
      </div>
      <div class="section-title">今日动作</div>
      ${exList}
    `;
  },

  _prevWeek(weekStr) {
    const d = new Date(weekStr); d.setDate(d.getDate() - 7);
    return fmtDateFull(d);
  },

  /* ── 方案页 ── */
  plan(el) {
    const plan = DB.getPlan();
    if (!plan) { el.innerHTML = '<div class="empty"><div class="big">无方案</div><p>还没有训练方案</p><button class="btn primary" onclick="App.go(\'settings\')">去创建</button></div>'; return; }

    const daysHtml = plan.days.map((day, i) => {
      const rows = day.exercises.map((item, j) => {
        const ex = getEx(item.exId); if (!ex) return '';
        return `<div class="ex-row">
          <img class="thumb" src="${ex.img}" loading="lazy" alt="" onclick="UI.showExercise('${ex.id}')">
          <div class="info" onclick="UI.showExercise('${ex.id}')">
            <div class="nm">${esc(ex.name_zh)}</div>
            <div class="sub">${zh(ex.equipment)} · ${zh(ex.target)}</div>
          </div>
          <div class="act">
            <div class="sets-info"><b>${item.sets}</b>×<b>${item.reps}</b><br><span style="font-size:11px">${item.rest}s</span></div>
            <button class="btn small ghost" onclick="UI.swapExercise(${i},${j})">换</button>
          </div>
        </div>`;
      }).join('');
      return `<div class="card">
        <h3>${esc(day.name)} <span class="tag">${day.exercises.length} 动作</span></h3>
        ${rows}
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${esc(plan.name)}</div>
          <div class="sub" style="font-size:12px;color:var(--text-2)">${Planner.GOALS[plan.goal].label} · ${plan.days.length} 天/轮</div>
        </div>
        <button class="btn small" onclick="UI.regenPlan()">重新生成</button>
      </div>
      ${daysHtml}
    `;
  },

  /* ── 动作库页 ── */
  libraryFilter: { category: '', equipment: '' },

  library(el) {
    const cats = [...new Set(EXERCISES.map(e => e.category))].sort();
    const equips = [...new Set(EXERCISES.map(e => e.equipment))].sort();
    const f = this.libraryFilter;

    const list = EXERCISES.filter(e =>
      (!f.category || e.category === f.category) &&
      (!f.equipment || e.equipment === f.equipment)
    );

    el.innerHTML = `
      <div class="filter-bar">
        <select onchange="Pages.libraryFilter.category=this.value;Pages.library(Pages._el())">
          <option value="">全部部位</option>
          ${cats.map(c => `<option value="${c}" ${f.category === c ? 'selected' : ''}>${zh(c)}</option>`).join('')}
        </select>
        <select onchange="Pages.libraryFilter.equipment=this.value;Pages.library(Pages._el())">
          <option value="">全部器械</option>
          ${equips.map(c => `<option value="${c}" ${f.equipment === c ? 'selected' : ''}>${zh(c)}</option>`).join('')}
        </select>
      </div>
      <div class="sub" style="font-size:12px;color:var(--text-2);margin:0 2px 8px">${list.length} 个动作</div>
      ${list.map(ex => `<div class="ex-row" onclick="UI.showExercise('${ex.id}')">
        <img class="thumb" src="${ex.img}" loading="lazy" alt="">
        <div class="info">
          <div class="nm">${esc(ex.name_zh)}</div>
          <div class="sub">${zh(ex.equipment)} · ${zh(ex.target)}</div>
        </div>
        <div class="tag">${zh(ex.category)}</div>
      </div>`).join('')}
    `;
  },
  _el() { return document.getElementById('page-library'); },

  /* ── 数据页 ── */
  stats(el) {
    const workouts = DB.getWorkouts();
    const body = DB.getBody();

    // 周容量（近 12 周）
    const weekMap = new Map();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - 7 * i);
      const y = new Date(d); y.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      weekMap.set(fmtDateFull(y), 0);
    }
    workouts.forEach(w => {
      const d = new Date(w.date);
      const y = new Date(d); y.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const key = fmtDateFull(y);
      if (weekMap.has(key)) {
        const vol = (w.entries || []).reduce((b, e) => b + e.sets.reduce((c, s) => c + (s.weight || 0) * (s.reps || 0), 0), 0);
        weekMap.set(key, weekMap.get(key) + vol);
      }
    });

    // 有记录的动作
    const trainedIds = [...new Set(workouts.flatMap(w => (w.entries || []).map(e => e.exId)))].filter(id => getEx(id));

    el.innerHTML = `
      ${workouts.length === 0 ? '<div class="empty"><div class="big">无数据</div><p>完成第一次训练后，这里会出现你的数据</p></div>' : ''}
      <div class="chart-box">
        <h3>每周训练容量</h3>
        <div class="hint-s">近 12 周 · kg</div>
        ${this._barChart([...weekMap.entries()])}
      </div>
      <div class="chart-box">
        <h3>动作重量曲线</h3>
        <div class="hint-s">渐进超载追踪</div>
        ${trainedIds.length ? `
        <select onchange="Pages._weightChart(this.value)">
          ${trainedIds.map(id => `<option value="${id}">${esc(getEx(id).name_zh)}</option>`).join('')}
        </select>
        <div id="weight-chart"></div>` : '<div class="hint-s">暂无记录</div>'}
      </div>
      <div class="chart-box">
        <h3>身体指标</h3>
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <input id="body-w" type="number" step="0.1" placeholder="体重 kg" style="flex:1;min-width:90px;padding:8px;border:1px solid var(--border);border-radius:8px">
          <input id="body-chest" type="number" step="0.5" placeholder="胸围 cm" style="flex:1;min-width:90px;padding:8px;border:1px solid var(--border);border-radius:8px">
          <input id="body-waist" type="number" step="0.5" placeholder="腰围 cm" style="flex:1;min-width:90px;padding:8px;border:1px solid var(--border);border-radius:8px">
          <button class="btn small primary" onclick="Pages._saveBody()">记录</button>
        </div>
        <div id="body-chart">${this._bodyChart(body)}</div>
      </div>
      ${workouts.slice(-10).reverse().map(w => `<div class="card" style="padding:10px 14px">
        <b style="font-size:13px">${w.dayName || '训练'}</b>
        <span style="font-size:12px;color:var(--text-2)"> ${fmtDate(w.date)} · ${(w.entries || []).reduce((b, e) => b + e.sets.reduce((c, s) => c + (s.weight || 0) * (s.reps || 0), 0), 0)} kg · ${(w.entries || []).reduce((b, e) => b + e.sets.filter(s => s.reps > 0).length, 0)} 组</span>
      </div>`).join('')}
    `;
    if (trainedIds.length) this._weightChart(trainedIds[0]);
  },

  _barChart(data) {
    const max = Math.max(...data.map(d => d[1]), 1);
    const W = 600, H = 150, bw = W / data.length;
    const bars = data.map(([label, v], i) => {
      const h = v / max * (H - 30);
      const x = i * bw + 4, y = H - 20 - h;
      return `<rect x="${x}" y="${y}" width="${bw - 8}" height="${Math.max(h, v > 0 ? 2 : 0)}" rx="3" fill="${v > 0 ? '#ff4f00' : '#e4e4e7'}"/>
        ${v > 0 ? `<text x="${x + (bw - 8) / 2}" y="${y - 4}" font-size="10" fill="#71717a" text-anchor="middle">${Math.round(v / 100) / 10}k</text>` : ''}`;
    }).join('');
    const labels = data.map(([label], i) => i % 3 === 0 ? `<text x="${i * bw + bw / 2}" y="${H - 5}" font-size="9" fill="#a1a1aa" text-anchor="middle">${label.slice(5).replace('-', '/')}</text>` : '').join('');
    return `<svg viewBox="0 0 ${W} ${H}">${bars}${labels}</svg>`;
  },

  _weightChart(exId) {
    const hist = DB.historyOf(exId);
    const el = document.getElementById('weight-chart');
    if (!el) return;
    if (!hist.length) { el.innerHTML = '<div class="hint-s">暂无记录</div>'; return; }
    const pts = hist.map(h => ({ d: h.date, w: Math.max(...h.sets.map(s => s.weight), 0) })).filter(p => p.w > 0);
    if (!pts.length) { el.innerHTML = '<div class="hint-s">暂无负重记录</div>'; return; }
    const W = 600, H = 160, pad = 30;
    const minW = Math.min(...pts.map(p => p.w)), maxW = Math.max(...pts.map(p => p.w));
    const rng = Math.max(maxW - minW, 2.5);
    const x = i => pad + i * (W - pad * 2) / Math.max(pts.length - 1, 1);
    const y = w => H - pad - (w - minW) / rng * (H - pad * 2);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.w)}`).join(' ');
    const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.w)}" r="3.5" fill="#ff4f00"/>
      <text x="${x(i)}" y="${y(p.w) - 8}" font-size="10" fill="#71717a" text-anchor="middle">${p.w}</text>`).join('');
    const xlabels = pts.map((p, i) => (pts.length <= 8 || i % Math.ceil(pts.length / 6) === 0) ? `<text x="${x(i)}" y="${H - 8}" font-size="9" fill="#a1a1aa" text-anchor="middle">${fmtDate(p.d)}</text>` : '').join('');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}"><path d="${path}" fill="none" stroke="#ff4f00" stroke-width="2" stroke-linejoin="round"/>${dots}${xlabels}</svg>`;
  },

  _saveBody() {
    const w = parseFloat(document.getElementById('body-w').value);
    const chest = parseFloat(document.getElementById('body-chest').value);
    const waist = parseFloat(document.getElementById('body-waist').value);
    if (!w && !chest && !waist) { toast('至少填写一项'); return; }
    DB.addBody({ date: new Date().toISOString(), weight: w || null, chest: chest || null, waist: waist || null });
    toast('已记录');
    this.stats(document.getElementById('page-stats'));
  },

  _bodyChart(body) {
    if (!body.length) return '<div class="hint-s">暂无记录</div>';
    const W = 600, H = 140, pad = 30;
    const valid = body.filter(b => b.weight);
    if (!valid.length) return '<div class="hint-s">暂无体重记录</div>';
    const ws = valid.map(b => b.weight);
    const minW = Math.min(...ws), maxW = Math.max(...ws);
    const rng = Math.max(maxW - minW, 1);
    const x = i => pad + i * (W - pad * 2) / Math.max(valid.length - 1, 1);
    const y = w => H - pad - (w - minW) / rng * (H - pad * 2);
    const path = valid.map((b, i) => `${i ? 'L' : 'M'}${x(i)},${y(b.weight)}`).join(' ');
    const dots = valid.map((b, i) => `<circle cx="${x(i)}" cy="${y(b.weight)}" r="3" fill="#0f766e"/>`).join('');
    const labels = valid.map((b, i) => (valid.length <= 8 || i % Math.ceil(valid.length / 5) === 0) ? `<text x="${x(i)}" y="${H - 8}" font-size="9" fill="#a1a1aa" text-anchor="middle">${fmtDate(b.date)}</text>` : '').join('');
    const last = valid[valid.length - 1];
    return `<div class="hint-s" style="margin-bottom:2px">最新体重 <b style="color:var(--ok)">${last.weight}kg</b></div><svg viewBox="0 0 ${W} ${H}"><path d="${path}" fill="none" stroke="#0f766e" stroke-width="2"/>${dots}${labels}</svg>`;
  },
};

/* ── 弹窗 UI ── */
const UI = {
  showExercise(id) {
    const ex = getEx(id); if (!ex) return;
    const hist = DB.historyOf(id);
    const lastW = DB.lastWorkingWeight(id);
    const steps = (ex.instructions_zh || []).map((s, i) => `<li data-n="${i + 1}">${esc(s)}</li>`).join('');
    const histHtml = hist.length ? `<div class="instr-label">训练历史</div>
      ${hist.slice(-3).reverse().map(h => `<div style="font-size:12px;color:var(--text-2);padding:3px 0">
        ${fmtDate(h.date)} · ${h.sets.map(s => s.reps > 0 ? `${s.weight || 0}kg×${s.reps}` : '').filter(Boolean).join('，')}</div>`).join('')}` : '';
    openSheet(`
      <h2>${esc(ex.name_zh)}<div style="font-size:12px;font-weight:400;color:var(--text-2)">${esc(ex.name)}</div></h2>
      <div class="gif-wrap"><img src="${ex.gif}" alt="${esc(ex.name_zh)}"></div>
      <div class="meta-chips">
        <span class="meta-chip"><b>${zh(ex.category)}</b></span>
        <span class="meta-chip"><b>${zh(ex.equipment)}</b></span>
        <span class="meta-chip">目标 <b>${zh(ex.target)}</b></span>
        ${ex.muscle_group && ex.muscle_group !== ex.target ? `<span class="meta-chip">肌群 <b>${zh(ex.muscle_group)}</b></span>` : ''}
        ${lastW ? `<span class="meta-chip" style="background:#e6f4f2;color:#0f766e">上次 <b>${lastW}kg</b></span>` : ''}
      </div>
      ${(ex.instructions_zh || []).length ? `<div class="instr-label">动作要领</div><ol class="instr-list">${steps}</ol>` : ''}
      ${histHtml}
    `);
  },

  swapExercise(dayIdx, itemIdx) {
    const plan = DB.getPlan();
    const item = plan.days[dayIdx].exercises[itemIdx];
    const alts = Planner.alternatives(item.exId);
    openSheet(`
      <h2>替换动作</h2>
      <div class="hint-s" style="font-size:12px;color:var(--text-2);margin-bottom:10px">当前：${esc(getEx(item.exId).name_zh)}</div>
      ${alts.map(a => `<div class="ex-row" onclick="UI._doSwap(${dayIdx},${itemIdx},'${a.id}')">
        <img class="thumb" src="${a.img}" loading="lazy" alt="">
        <div class="info"><div class="nm">${esc(a.name_zh)}</div><div class="sub">${zh(a.equipment)} · ${zh(a.target)}</div></div>
      </div>`).join('')}
    `);
  },
  _doSwap(dayIdx, itemIdx, newId) {
    const plan = DB.getPlan();
    plan.days[dayIdx].exercises[itemIdx].exId = newId;
    DB.setPlan(plan);
    closeSheet();
    toast('已替换为 ' + getEx(newId).name_zh);
    Pages.render('plan');
  },

  regenPlan() {
    const plan = DB.getPlan();
    const newPlan = Planner.generate(plan.split, plan.goal);
    DB.setPlan(newPlan);
    DB.setPlanState({ dayCursor: 0 });
    toast('已重新生成方案');
    Pages.render('plan');
  },
};

function openSheet(html) {
  let overlay = document.getElementById('sheet-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sheet-overlay';
    overlay.className = 'overlay';
    overlay.innerHTML = '<div class="sheet" style="position:relative"><button class="close-x" onclick="closeSheet()">✕</button><div id="sheet-content"></div></div>';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSheet(); });
    document.body.appendChild(overlay);
  }
  document.getElementById('sheet-content').innerHTML = html;
  overlay.classList.add('open');
  document.body.classList.add('modal-open');
}
function closeSheet() {
  const o = document.getElementById('sheet-overlay');
  if (o) o.classList.remove('open');
  document.body.classList.remove('modal-open');
}
