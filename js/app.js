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
        if (Workout.session) {
          // 训练中切页：进度保留在内存，仅首次提示，不阻塞
          if (!Workout._navHinted) {
            Workout._navHinted = true;
            toast('训练进度已保留，回「今日」点「继续训练」');
          }
        }
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
    const items = {};
    checked.forEach(e => { items[e] = {}; });
    DB.setEquipment({ hasAll, items });
    const { split, goal } = this.wizardData;
    DB.setPlan(Planner.generate(split, goal));
    DB.setPlanState({ dayCursor: 0 });
    DB.finishSetup();
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
        <h3>添加到手机桌面</h3>
        <div id="install-hint" style="font-size:12px;color:var(--text-2);margin-bottom:10px">
          安装后像原生 APP 一样全屏运行，看过的动作图和演示自动缓存，离线可用。
        </div>
        <button class="btn small primary" id="install-btn" onclick="App._install()" style="display:none">一键安装到桌面</button>
        <div id="install-guide" style="display:none"></div>
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
      <div style="text-align:center;font-size:11px;color:var(--text-3);padding:8px 0 20px">健身助手 · 本地数据版 · ${EXERCISES.length} 动作库<br>动作图片与演示 © Gym visual</div>
    `;
    setTimeout(() => this._refreshInstallUI(), 0);
  },

  /* ── 添加到主屏幕 ── */
  _deferredPrompt: null,
  _installBound: false,

  _bindInstall() {
    if (this._installBound) return;
    this._installBound = true;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this._deferredPrompt = e;
      // 设置页已打开时实时刷新按钮
      const btn = document.getElementById('install-btn');
      if (btn) { btn.style.display = ''; const h = document.getElementById('install-hint'); if (h) h.style.display = 'none'; }
    });
    window.addEventListener('appinstalled', () => {
      this._deferredPrompt = null;
      toast('已安装到桌面');
      this.settings(document.getElementById('page-settings'));
    });
  },

  _install() {
    const p = this._deferredPrompt;
    if (p) {
      p.prompt();
      p.userChoice.then(() => { this._deferredPrompt = null; });
    } else {
      toast('当前浏览器不支持一键安装，请按下方指引手动添加');
    }
  },

  // 设置页渲染时刷新安装区状态
  _refreshInstallUI() {
    this._bindInstall();
    const btn = document.getElementById('install-btn');
    const guide = document.getElementById('install-guide');
    const hint = document.getElementById('install-hint');
    if (!btn || !guide) return;
    if (this._deferredPrompt) {
      btn.style.display = '';
      if (hint) hint.style.display = 'none';
      guide.style.display = 'none';
      return;
    }
    // 无安装提示：判断平台给手动教程
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isWeChat = /MicroMessenger/i.test(ua);
    const guideHtml = isWeChat
      ? '微信内无法直接安装：<div style="margin-top:6px">1. 点右上角「···」<br>2. 选择「在浏览器打开」（用 Safari 或 Chrome）<br>3. 在浏览器里按下面步骤添加</div>'
      : isIOS
        ? 'iOS Safari 手动添加：<div style="margin-top:6px">1. 点浏览器底部「分享」按钮（方框带向上箭头）<br>2. 滚动找到「添加到主屏幕」<br>3. 点「添加」完成</div>'
        : 'Android 浏览器手动添加：<div style="margin-top:6px">Chrome：菜单（右上角 ⋮）→「添加到主屏幕 / 安装应用」<br>其他浏览器：菜单 →「添加到桌面」</div>';
    guide.innerHTML = '<div style="font-size:12px;color:var(--text-2);line-height:1.8">' + guideHtml + '</div>';
    guide.style.display = '';
    if (hint) hint.style.display = '';
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
      } catch (err) { toast('导入失败：文件格式错误'); }
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
