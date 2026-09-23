/* ── 训练执行：逐组记录 + 组间计时 ── */

const Workout = {
  session: null, // {dayIdx, dayName, entries:[{exId, planSets, planReps, planRest, sets:[{weight,reps,done}] }], startTime}
  timer: null,

  start(dayIdx) {
    const plan = DB.getPlan();
    const day = plan.days[dayIdx];
    this.session = {
      dayIdx, dayName: day.name,
      startTime: new Date().toISOString(),
      entries: day.exercises.map(item => {
        const ex = getEx(item.exId);
        // 优先用方案里手动设定的重量，其次智能建议
        const sug = item.weight != null ? item.weight : Planner.suggestWeight(ex);
        return {
          exId: item.exId,
          planSets: item.sets, planReps: item.reps, planRest: item.rest,
          sets: Array.from({ length: item.sets }, () => ({
            weight: sug || 0, reps: '', done: false,
          })),
        };
      }),
    };
    App.render('workout');
  },

  // 开始自由训练（无方案）
  freeStart() {
    this.session = {
      dayIdx: -1, dayName: '自由训练',
      startTime: new Date().toISOString(),
      entries: [],
    };
    App.render('workout');
  },

  addExercise(exId) {
    const ex = getEx(exId);
    const sug = Planner.suggestWeight(ex);
    this.session.entries.push({
      exId,
      planSets: 3, planReps: '10', planRest: 90,
      sets: Array.from({ length: 3 }, () => ({ weight: sug || 0, reps: '', done: false })),
    });
    closeSheet();
    App.render('workout');
  },

  render(el) {
    const s = this.session;
    if (!s) { App.go('today'); return; }

    const totalDone = s.entries.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0);
    const totalSets = s.entries.reduce((a, e) => a + e.sets.length, 0);

    el.innerHTML = `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;position:sticky;top:64px;z-index:20">
        <div>
          <b>${esc(s.dayName)}</b>
          <div style="font-size:12px;color:var(--text-2)">${totalDone}/${totalSets} 组已完成</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn small ghost" onclick="Workout._addPicker()">加动作</button>
          ${s.entries.length ? `<button class="btn small primary" onclick="Workout.finish()">完成训练</button>` : ''}
        </div>
      </div>
      ${s.entries.map((entry, ei) => this._exBlock(entry, ei)).join('')}
    `;
  },

  _exBlock(entry, ei) {
    const ex = getEx(entry.exId);
    const allDone = entry.sets.every(x => x.done);
    const setRows = entry.sets.map((set, si) => `
      <div class="set-grid set-row">
        <div class="set-no">${si + 1}</div>
        <input type="number" inputmode="decimal" step="2.5" min="0" value="${set.weight || ''}" placeholder="kg" onchange="Workout._upd(${ei},${si},'weight',this.value)">
        <input type="number" inputmode="numeric" min="0" value="${set.reps || ''}" placeholder="次" onchange="Workout._upd(${ei},${si},'reps',this.value)">
        <label class="hint-s" style="text-align:center;font-size:11px;color:${set.done ? 'var(--ok)' : 'var(--text-3)'}">${set.done ? '已完成' : '未完成'}</label>
        <input type="checkbox" class="set-done-chk" ${set.done ? 'checked' : ''} onchange="Workout._toggle(${ei},${si},this.checked)">
      </div>`).join('');

    return `<div class="workout-ex ${this._openIdx === ei ? 'open' : ''}">
      <div class="we-head" onclick="Workout._toggleBlock(${ei})">
        <img src="${ex.img}" alt="">
        <div class="info">
          <div class="nm" style="font-size:15px;font-weight:600">${esc(ex.name_zh)}</div>
          <div class="sub" style="font-size:12px;color:var(--text-2)">${zh(ex.equipment)} · 计划 ${entry.planSets}×${entry.planReps}</div>
        </div>
        ${allDone ? '<span class="done-mark">✓</span>' : ''}
      </div>
      <div class="we-body">
        <div class="set-grid">
          <div class="h">组</div><div class="h">重量 kg</div><div class="h">次数</div><div class="h">状态</div><div class="h">完成</div>
        </div>
        ${setRows}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn small ghost" onclick="Workout._addSet(${ei})">+ 加一组</button>
          <button class="btn small ghost" style="color:#b91c1c" onclick="Workout._removeEx(${ei})">移除动作</button>
        </div>
      </div>
    </div>`;
  },

  _toggleBlock(ei) {
    this._openIdx = this._openIdx === ei ? -1 : ei;
    const blocks = document.querySelectorAll('.workout-ex');
    blocks.forEach((b, i) => b.classList.toggle('open', this._openIdx === i));
  },
  _upd(ei, si, key, val) {
    const v = parseFloat(val);
    this.session.entries[ei].sets[si][key] = isNaN(v) ? 0 : v;
  },
  _toggle(ei, si, done) {
    const set = this.session.entries[ei].sets[si];
    set.done = done;
    if (done) {
      if (!set.reps) set.reps = parseInt(this.session.entries[ei].planReps) || 10;
      this.render(document.getElementById('page-workout'));
      this._startRest(this.session.entries[ei].planRest);
    }
  },
  _addSet(ei) {
    const e = this.session.entries[ei];
    const last = e.sets[e.sets.length - 1];
    e.sets.push({ weight: last ? last.weight : 0, reps: '', done: false });
    this.render(document.getElementById('page-workout'));
  },
  _removeEx(ei) {
    this.session.entries.splice(ei, 1);
    this._openIdx = -1;
    this.render(document.getElementById('page-workout'));
  },

  _addPicker() {
    openSheet(`
      <h2>添加动作</h2>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <select id="pick-cat" onchange="Workout._filterPick(this.value)" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px">
          <option value="">全部部位</option>
          ${[...new Set(EXERCISES.map(e => e.category))].sort().map(c => `<option value="${c}">${zh(c)}</option>`).join('')}
        </select>
      </div>
      <div id="pick-list">${this._pickList('')}</div>
    `);
  },
  _filterPick(cat) { document.getElementById('pick-list').innerHTML = this._pickList(cat); },
  _pickList(cat) {
    return EXERCISES.filter(e => (!cat || e.category === cat) && DB.hasEquipment(e.equipment))
      .slice(0, 60)
      .map(e => `<div class="ex-row" onclick="Workout.addExercise('${e.id}')">
        <img class="thumb" src="${e.img}" loading="lazy" alt="">
        <div class="info"><div class="nm">${esc(e.name_zh)}</div><div class="sub">${zh(e.equipment)} · ${zh(e.target)}</div></div>
      </div>`).join('');
  },

  // 组间休息计时
  _startRest(sec) {
    this._stopRest();
    this._restLeft = sec;
    const overlay = document.createElement('div');
    overlay.className = 'rest-timer';
    overlay.id = 'rest-timer';
    document.body.appendChild(overlay);
    const paint = () => {
      const m = Math.floor(this._restLeft / 60), s = this._restLeft % 60;
      overlay.innerHTML = `
        <div><div class="t">${m}:${String(s).padStart(2, '0')}</div><div class="hint">组间休息</div></div>
        <button onclick="Workout._addRest(30)">+30s</button>
        <button class="stop" onclick="Workout._stopRest(true)">跳过</button>`;
    };
    paint();
    this.timer = setInterval(() => {
      this._restLeft--;
      if (this._restLeft <= 0) { this._stopRest(); navigator.vibrate && navigator.vibrate(200); return; }
      paint();
    }, 1000);
  },
  _addRest(sec) { this._restLeft = (this._restLeft || 0) + sec; },
  _stopRest(silent) {
    clearInterval(this.timer);
    const el = document.getElementById('rest-timer');
    if (el) el.remove();
    if (!silent) { /* 自然结束 */ }
  },

  finish() {
    const s = this.session;
    const valid = s.entries.filter(e => e.sets.some(x => x.reps > 0 || x.done));
    if (!valid.length) { toast('还没有完成的组'); return; }
    const vol = valid.reduce((a, e) => a + e.sets.reduce((b, x) => b + (x.weight || 0) * (x.reps || 0), 0), 0);
    if (!confirm(`完成训练？\n${valid.length} 个动作 · 总容量 ${Math.round(vol)} kg`)) return;

    DB.saveWorkout({
      date: new Date().toISOString(),
      dayIdx: s.dayIdx, dayName: s.dayName,
      startTime: s.startTime,
      entries: valid.map(e => ({ exId: e.exId, sets: e.sets.map(x => ({ weight: x.weight || 0, reps: x.reps || 0, done: x.done })) })),
    });
    DB.advanceDay();
    this.session = null;
    toast('训练已记录');
    App.go('today');
  },

  abandon() {
    if (!confirm('放弃本次训练？已记录的组将不会保存')) return;
    this.session = null;
    App.go('today');
  },
};
