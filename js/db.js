/* ── 数据层：localStorage 封装 + 业务数据模型 ── */

const DB = {
  KEYS: {
    equipment: 'gym_equipment',   // 器材配置
    profile: 'gym_profile',       // 个人信息（体重等）
    plan: 'gym_plan',             // 当前方案
    planState: 'gym_plan_state',  // 训练日轮转指针
    workouts: 'gym_workouts',     // 训练记录
    body: 'gym_body',             // 身体指标
    setupDone: 'gym_setup_done',  // 是否完成首次引导
  },

  get(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

  // ── 器材 ──
  getEquipment() { return this.get(this.KEYS.equipment, { hasAll: true, items: {} }); },
  setEquipment(eq) { this.set(this.KEYS.equipment, eq); },
  // 判断某器械是否可用（未配置时默认全有）
  hasEquipment(name) {
    const eq = this.getEquipment();
    return eq.hasAll || !!(eq.items && eq.items[name]);
  },

  // ── 个人信息 ──
  getProfile() { return this.get(this.KEYS.profile, { bodyweight: 65, goal: 'hypertrophy' }); },
  setProfile(p) { this.set(this.KEYS.profile, p); },

  // ── 方案 ──
  getPlan() { return this.get(this.KEYS.plan, null); },
  setPlan(plan) { this.set(this.KEYS.plan, plan); },

  getPlanState() { return this.get(this.KEYS.planState, { dayCursor: 0 }); },
  setPlanState(s) { this.set(this.KEYS.planState, s); },
  advanceDay() {
    const plan = this.getPlan(); if (!plan) return;
    const st = this.getPlanState();
    st.dayCursor = (st.dayCursor + 1) % plan.days.length;
    this.setPlanState(st);
  },

  // ── 训练记录 ──
  getWorkouts() { return this.get(this.KEYS.workouts, []); },
  saveWorkout(w) { const ws = this.getWorkouts(); ws.push(w); this.set(this.KEYS.workouts, ws); },
  // 某动作的全部历史（按时间正序）
  historyOf(exId) {
    return this.getWorkouts()
      .flatMap(w => (w.entries || []).filter(e => e.exId === exId).map(e => ({
        date: w.date, sets: e.sets.filter(s => s.reps > 0),
      })))
      .filter(h => h.sets.length > 0);
  },
  // 某动作最近一次有效组重量
  lastWorkingWeight(exId) {
    const h = this.historyOf(exId);
    if (!h.length) return null;
    const last = h[h.length - 1];
    const weights = last.sets.map(s => s.weight).filter(w => w > 0);
    if (!weights.length) return null;
    return Math.max(...weights);
  },

  // ── 身体指标 ──
  getBody() { return this.get(this.KEYS.body, []); },
  addBody(rec) { const b = this.getBody(); b.push(rec); this.set(this.KEYS.body, b); },

  // ── 备份 ──
  exportAll() {
    const out = {};
    Object.values(this.KEYS).forEach(k => { const v = localStorage.getItem(k); if (v) out[k] = JSON.parse(v); });
    return JSON.stringify(out, null, 2);
  },
  importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    Object.entries(data).forEach(([k, v]) => { if (Object.values(this.KEYS).includes(k)) this.set(k, v); });
  },

  isSetupDone() { return this.get(this.KEYS.setupDone, false); },
  finishSetup() { this.set(this.KEYS.setupDone, true); },
};

/* ── 动作库索引 ── */
const EX_MAP = new Map(EXERCISES.map(e => [e.id, e]));
function getEx(id) { return EX_MAP.get(id); }

/* ── 中文映射（器械/部位，复用数据集枚举） ── */
const ZH = {
  'back': '背部', 'cardio': '有氧', 'chest': '胸部', 'lower arms': '小臂',
  'lower legs': '小腿', 'neck': '颈部', 'shoulders': '肩部', 'upper arms': '大臂',
  'upper legs': '大腿', 'waist': '腰腹',
  'assisted': '辅助器械', 'band': '弹力带', 'barbell': '杠铃', 'body weight': '徒手',
  'bosu ball': '波速球', 'cable': '绳索', 'dumbbell': '哑铃',
  'elliptical machine': '椭圆机', 'ez barbell': '曲杆', 'hammer': '锤式器械',
  'kettlebell': '壶铃', 'leverage machine': '固定器械', 'medicine ball': '药球',
  'olympic barbell': '奥杆', 'resistance band': '阻力带', 'roller': '泡沫轴',
  'rope': '战绳/绳索', 'skierg machine': '滑雪机', 'sled machine': '雪橇机',
  'smith machine': '史密斯机', 'stability ball': '瑜伽球', 'stationary bike': '固定单车',
  'stepmill machine': '楼梯机', 'tire': '轮胎', 'trap bar': '六角杠',
  'upper body ergometer': '上肢功率车', 'weighted': '负重', 'wheel roller': '健腹轮',
  'abductors': '髋外展肌', 'abs': '腹肌', 'adductors': '髋内收肌', 'biceps': '肱二头肌',
  'calves': '小腿肌', 'cardiovascular system': '心肺', 'delts': '三角肌', 'forearms': '前臂',
  'glutes': '臀肌', 'hamstrings': '腘绳肌', 'lats': '背阔肌', 'levator scapulae': '肩胛提肌',
  'pectorals': '胸肌', 'quads': '股四头肌', 'serratus anterior': '前锯肌', 'spine': '脊柱',
  'traps': '斜方肌', 'triceps': '肱三头肌', 'upper back': '上背部',
  'abdominals': '腹肌', 'ankle stabilizers': '踝稳定肌', 'ankles': '踝关节', 'brachialis': '肱肌',
  'core': '核心', 'deltoids': '三角肌', 'feet': '足部', 'grip muscles': '握力肌群',
  'groin': '腹股沟', 'hands': '手部', 'hip flexors': '髋屈肌', 'inner thighs': '大腿内侧',
  'latissimus dorsi': '背阔肌', 'lower abs': '下腹', 'lower back': '下背部', 'obliques': '腹斜肌',
  'quadriceps': '股四头肌', 'rear deltoids': '三角肌后束', 'rhomboids': '菱形肌',
  'rotator cuff': '肩袖肌群', 'shins': '胫骨前肌', 'soleus': '比目鱼肌',
  'sternocleidomastoid': '胸锁乳突肌', 'trapezius': '斜方肌', 'upper chest': '上胸',
  'wrist extensors': '腕伸肌', 'wrist flexors': '腕屈肌', 'wrists': '腕部',
};
function zh(v) { return ZH[String(v || '').toLowerCase()] || v || ''; }

/* ── 工具 ── */
function fmtDate(d) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}
function fmtDateFull(d) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 2200);
}
