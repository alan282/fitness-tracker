/* ── 主控制器：路由 + 首次引导 + 设置页 ── */

const App = {
  go(page) {
    Pages.current = null;
    Pages.render(page === 'workout' ? 'workout' : page);
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  },

  render(page) {
    // 训练页由 Workout 自己渲染
    if (page === 'workout') {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tabbar button').forEach(b => b.classList.remove('active'));
      const el = document.getElementById('page-workout');
      el.classList.add('active');
      if (!Workout.session) { this.go('today'); return; }
      Workout.render(el);
      window.scrollTo(0, 0);
      return;
    }
    Pages.render(page);
  },

  init() {
    document.querySelectorAll('.tabbar button').forEach(b => {
      b.addEventListener('click', () => {
        if (Workout.session && !confirm('正在进行训练，切换页面将保留进度（可从今日页继续）')) return;
        this.go(b.dataset.page);
      });
    });
    if (!DB.isSetupDone()) this.wizard();
    else this.go('today');
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  /* ── 首次启动引导 ── */
  wizardStep: 0,
  wizardData: {},

  wizard() {
    const el = document.getElementById('page-today');
    document.querySelectorAll('.tabbar button').forEach(b => b.disabled = true);
    this._wizardSplit(el);
  },

  _wizardSplit(el) {
    el.innerHTML = `<div class="wizard">
      <h2>创建你的训练方案</h2>
      <div class="desc">三步完成：选择分化 → 训练目标 → 确认器械</div>
      <div class="split-cards">
        ${[3, 4, 5].map(n => {
          const s = Planner.SPLITS[n];
          return `<button class="split-card" data-n="${n}" onclick="App._wizPickSplit(${n})">
            <div class="t">${s.name}</div>
            <div class="d">适合每周 ${n} 练，${n === 3 ? '恢复时间充裕，适合时间紧张或新手' : n === 4 ? '兼顾频率与容量，最常见的进阶选择' : '单肌群刺激最充分，适合时间充裕的老手'}</div>
            <div class="days">${s.days.map(d => d.name.split(' ')[0]).join(' → ')}</div>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  },
  _wizPickSplit(n) { this.wizardData.split = n; this._wizardGoal(document.getElementById('page-today')); },

  _wizardGoal(el) {
    el.innerHTML = `<div class="wizard">
      <h2>训练目标</h2>
      <div class="desc">决定每个动作的组数、次数与组间休息</div>
      <div class="split-cards">
        ${Object.entries(Planner.GOALS).map(([k, g]) => `
          <button class="split-card" onclick="App._wizPickGoal('${k}')">
            <div class="t">${g.label}</div>
            <div class="d">${g.sets} 组 × ${g.reps} 次 · 组间休息 ${g.rest}s</div>
          </button>`).join('')}
      </div>
      <button class="btn ghost" onclick="App._wizardSplit(document.getElementById('page-today'))">上一步</button>
    </div>`;
  },
  _wizPickGoal(k) { this.wizardData.goal = k; this._wizardEquip(document.getElementById('page-today')); },

  _wizardEquip(el) {
    const equips = [...new Set(EXERCISES.map(e => e.equipment))].sort();
    el.innerHTML = `<div class="wizard">
      <h2>你的健身房有哪些器械</h2>
      <div class="desc">不勾选则默认全部可用；勾选后方案只从这些器械中生成</div>
      <div class="card" id="wiz-equip-list">
        ${equips.map(e => `<div class="equip-item">
          <input type="checkbox" id="wz-${e.replace(/\s/g, '_')}" data-equip="${e}">
          <label class="nm" for="wz-${e.replace(/\s/g, '_')}">${zh(e)}</label>
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn ghost" style="flex:1" onclick="App._wizardGoal(document.getElementById('page-today'))">上一步</button>
        <button class="btn primary" style="flex:1" onclick="App._wizardFinish()">生成方案</button>
      </div>
    </div>`;
  },
  _wizardFinish() {
    const checked = [...document.querySelectorAll('#wiz-equip-list input:checked')].map(i => i.dataset.equip);
    const hasAll = checked.length === 0;
    DB.setEquipment({ hasAll, items: Object.fromEntries(checked.map(e => [e, {}])) });
    const { split, goal } = this.wizardData;
    DB.setPlan(Planner.generate(split, goal));
    DB.setPlanState({ dayCursor: 0 });
    DB.finishSetup();
    document.querySelectorAll('.tabbar button').forEach(b => b.disabled = false);
    toast('方案已生成');
    this.go('today');
  },

  /* ── 设置页 ── */
  settings(el) {
    const eq = DB.getEquipment();
    const profile = DB.getProfile();
    const equips = [...new Set(EXERCISES.map(e => e.equipment))].sort();

    el.innerHTML = `
      <div class="card">
        <h3>个人参数</h3>
        <div class="field"><label>体重 kg（用于首练重量估算）</label>
          <input type="number" id="st-bw" value="${profile.bodyweight}" onchange="App._saveProfile()"></div>
        <div class="field"><label>训练目标</label>
          <select id="st-goal" onchange="App._saveProfile()">
            ${Object.entries(Planner.GOALS).map(([k, g]) => `<option value="${k}" ${profile.goal === k ? 'selected' : ''}>${g.label}</option>`).join('')}
          </select></div>
      </div>

      <div class="card">
        <h3>我的器械</h3>
        <div style="font-size:12px;color:var(--text-2);margin-bottom:10px">
          ${eq.hasAll ? '当前：全部器械可用（默认）' : `已配置 ${Object.keys(eq.items).length} 种器械`}
        </div>
        <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:14px;margin-bottom:8px">
          <input type="checkbox" id="st-hasall" ${eq.hasAll ? 'checked' : ''} onchange="App._toggleHasAll(this.checked)" style="width:18px;height:18px;accent-color:var(--accent)">
          默认全部器械可用（未配置时）
        </label>
        <div id="st-equip-list" style="${eq.hasAll ? 'display:none' : ''}">
          ${equips.map(e => `<div class="equip-item">
            <input type="checkbox" data-equip="${e}" ${eq.items && eq.items[e] ? 'checked' : ''} onchange="App._toggleEquip(this)">
            <label class="nm">${zh(e)}</label>
          </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <h3>方案管理</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn small" onclick="UI.regenPlan()">按当前设置重新生成</button>
          <button class="btn small ghost" onclick="App._newPlanDialog()">换分化 / 目标</button>
        </div>
      </div>

      <div class="card">
        <h3>数据备份</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn small" onclick="App._exportData()">导出备份</button>
          <label class="btn small ghost" style="cursor:pointer">导入备份
            <input type="file" accept=".json" style="display:none" onchange="App._importData(this)">
          </label>
          <button class="btn small ghost" style="color:#b91c1c" onclick="App._resetAll()">清空全部数据</button>
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:var(--text-3);padding:8px 0 20px">健身助手 · 本地数据版 · ${EXERCISES.length} 动作库</div>
    `;
  },

  _saveProfile() {
    const p = DB.getProfile();
    p.bodyweight = parseFloat(document.getElementById('st-bw').value) || p.bodyweight;
    p.goal = document.getElementById('st-goal').value;
    DB.setProfile(p);
  },
  _toggleHasAll(on) {
    const eq = DB.getEquipment();
    eq.hasAll = on;
    DB.setEquipment(eq);
    this.settings(document.getElementById('page-settings'));
  },
  _toggleEquip(input) {
    const eq = DB.getEquipment();
    eq.items = eq.items || {};
    if (input.checked) eq.items[input.dataset.equip] = eq.items[input.dataset.equip] || {};
    else delete eq.items[input.dataset.equip];
    DB.setEquipment(eq);
  },

  _newPlanDialog() {
    openSheet(`
      <h2>重新定制方案</h2>
      <div class="field"><label>分化</label>
        <select id="np-split">${[3, 4, 5].map(n => `<option value="${n}">${Planner.SPLITS[n].name}</option>`).join('')}</select></div>
      <div class="field"><label>目标</label>
        <select id="np-goal">${Object.entries(Planner.GOALS).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join('')}</select></div>
      <button class="btn primary block" onclick="App._newPlanApply()">生成</button>
      <div style="font-size:12px;color:var(--text-2);margin-top:8px">注意：会覆盖当前方案（历史训练记录保留）</div>
    `);
  },
  _newPlanApply() {
    const split = parseInt(document.getElementById('np-split').value);
    const goal = document.getElementById('np-goal').value;
    DB.setPlan(Planner.generate(split, goal));
    DB.setPlanState({ dayCursor: 0 });
    closeSheet();
    toast('新方案已生成');
    this.go('today');
  },

  _exportData() {
    const blob = new Blob([DB.exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fitness-backup-${fmtDateFull(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('备份已导出');
  },
  _importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        DB.importAll(reader.result);
        toast('导入成功');
        this.go('today');
      } catch { toast('导入失败：文件格式错误'); }
    };
    reader.readAsText(file);
  },
  _resetAll() {
    if (!confirm('确定清空全部数据？包括方案、训练记录、身体指标。此操作不可恢复。')) return;
    if (!confirm('再次确认：真的要清空全部数据吗？')) return;
    Object.values(DB.KEYS).forEach(k => localStorage.removeItem(k));
    location.reload();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
