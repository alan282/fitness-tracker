/* ── 方案生成器：3/4/5 分化 + 目标组次 + 器材过滤 ── */

const Planner = {
  // 分化定义：每个训练日的部位组成
  SPLITS: {
    3: {
      name: '3 分法 · 推拉腿',
      days: [
        { name: '推日', main: ['chest', 'shoulders'], assist: ['upper arms'] },
        { name: '拉日', main: ['back'], assist: ['lower arms', 'waist'] },
        { name: '腿日', main: ['upper legs'], assist: ['lower legs', 'waist'] },
      ],
    },
    4: {
      name: '4 分法 · 胸背肩腿',
      days: [
        { name: '胸部 + 肱三', main: ['chest'], assist: ['upper arms'] },
        { name: '背部 + 肱二', main: ['back'], assist: ['lower arms'] },
        { name: '肩部 + 核心', main: ['shoulders'], assist: ['waist'] },
        { name: '腿部', main: ['upper legs'], assist: ['lower legs'] },
      ],
    },
    5: {
      name: '5 分法 · 五分化',
      days: [
        { name: '胸部日', main: ['chest'], assist: [] },
        { name: '背部日', main: ['back'], assist: [] },
        { name: '肩部日', main: ['shoulders'], assist: ['neck'] },
        { name: '手臂日', main: ['upper arms', 'lower arms'], assist: [] },
        { name: '腿部日', main: ['upper legs'], assist: ['lower legs', 'waist'] },
      ],
    },
  },

  // 训练目标 → 组次休息
  GOALS: {
    hypertrophy: { label: '增肌塑形', sets: 4, reps: '8-12', rest: 90, mainCount: 4, assistCount: 2 },
    strength:    { label: '绝对力量', sets: 5, reps: '3-6',  rest: 180, mainCount: 3, assistCount: 2 },
    endurance:   { label: '肌耐力减脂', sets: 3, reps: '15-20', rest: 45, mainCount: 4, assistCount: 3 },
  },

  // 器械优先级（同为可选时，优先安排自由重量）
  EQUIP_PRIORITY: ['barbell', 'dumbbell', 'kettlebell', 'cable', 'smith machine', 'leverage machine', 'body weight', 'trap bar', 'olympic barbell', 'ez barbell', 'band', 'medicine ball', 'stability ball', 'rope', 'sled machine', 'weighted'],

  // 复合动作关键词
  COMPOUND_RE: /(press|squat|deadlift|row|pull|push|lunge|dip|chin|thrust|hinge|swing|carry|crawl|jump|clean|高翻|硬拉|深蹲|卧推|划船|推举|箭步|引体|臂屈伸)/i,
  ISOLATION_RE: /(curl|raise|extension|kickback|crunch|fly|crossover|shrug|rotation|弯举|侧平举|卷腹|飞鸟|转体)/i,

  // 首练重量系数（相对体重）
  STRENGTH_RATIO: [
    { re: /deadlift|硬拉/, ratio: 0.75 },
    { re: /squat(?!.*jump)|深蹲(?!跳)/, ratio: 0.55 },
    { re: /bench press|卧推/, ratio: 0.45 },
    { re: /row|划船/, ratio: 0.40 },
    { re: /press|推举/, ratio: 0.30 },
    { re: /lunge|箭步/, ratio: 0.25 },
    { re: /curl|弯举/, ratio: 0.15 },
    { re: /raise|平举/, ratio: 0.10 },
    { re: /pushdown|pulldown|下压|下拉/, ratio: 0.25 },
  ],

  _score(ex) {
    let s = 0;
    if (this.COMPOUND_RE.test(ex.name) || this.COMPOUND_RE.test(ex.name_zh)) s += 3;
    if (this.ISOLATION_RE.test(ex.name) || this.ISOLATION_RE.test(ex.name_zh)) s -= 1;
    const pri = this.EQUIP_PRIORITY.indexOf(ex.equipment);
    s += pri >= 0 ? (14 - pri) * 0.3 : 0;
    return s;
  },

  // 提取核心动作词（用于多样性控制：一个训练日里"卧推"类最多出现 2 次）
  _coreWord(ex) {
    const n = (ex.name_zh || '') + ' ' + ex.name;
    const words = ['卧推', '深蹲', '硬拉', '划船', '推举', '弯举', '下拉', '下压', '俯卧撑', '引体',
      '箭步', '臂屈伸', '平举', '飞鸟', '卷腹', '提踵', '高翻', '跳', 'squat', 'press', 'row',
      'deadlift', 'curl', 'pulldown', 'pushdown', 'push-up', 'pull-up', 'dip', 'lunge', 'raise'];
    for (const w of words) if (n.toLowerCase().includes(w.toLowerCase())) return w;
    return ex.id;
  },

  // 从动作池选出 n 个：部位均衡 + 器材可用 + 复合优先 + 核心词限额 + 器械多样
  _pick(cats, n, excludeIds) {
    this._dayCore = this._dayCore || new Map();      // 当日核心词计数
    this._dayEquip = this._dayEquip || new Map();     // 当日器械计数
    const perCat = Math.max(1, Math.round(n / cats.length));
    const picked = [];
    const take = (pool, limit) => {
      pool = pool.filter(e => !/拉伸|stretch/i.test(e.name_zh + e.name));
      pool.sort((a, b) => this._score(b) - this._score(a));
      let cnt = 0;
      for (const ex of pool) {
        if (cnt >= limit || picked.length >= n) return;
        const cw = this._coreWord(ex);
        if ((this._dayCore.get(cw) || 0) >= 2) continue;         // 同模式动作每天最多 2 个
        if ((this._dayEquip.get(ex.equipment) || 0) >= 2) continue; // 同器械每天最多 2 个
        this._dayCore.set(cw, (this._dayCore.get(cw) || 0) + 1);
        this._dayEquip.set(ex.equipment, (this._dayEquip.get(ex.equipment) || 0) + 1);
        excludeIds.add(ex.id);
        picked.push(ex);
        cnt++;
      }
    };
    // 各部位均衡选取
    for (const cat of cats) {
      take(EXERCISES.filter(e => e.category === cat && e.category !== 'cardio' &&
        DB.hasEquipment(e.equipment) && !excludeIds.has(e.id)), perCat);
    }
    // 名额未满则放宽核心词限额补足
    if (picked.length < n) {
      take(EXERCISES.filter(e => cats.includes(e.category) && e.category !== 'cardio' &&
        DB.hasEquipment(e.equipment) && !excludeIds.has(e.id)), n - picked.length);
    }
    return picked;
  },

  // 生成完整方案
  generate(split, goal) {
    const def = this.SPLITS[split];
    const g = this.GOALS[goal];
    const excludeIds = new Set(); // 跨天不重复
    const plan = {
      split, goal, name: def.name,
      createdAt: new Date().toISOString(),
      days: def.days.map(d => {
        this._dayCore = new Map();
        this._dayEquip = new Map();
        const mainEx = this._pick(d.main, g.mainCount, excludeIds);
        const assistEx = d.assist.length ? this._pick(d.assist, g.assistCount, excludeIds) : [];
        const exercises = [...mainEx, ...assistEx].map(e => ({
          exId: e.id,
          sets: g.sets,
          reps: g.reps,
          rest: g.rest,
        }));
        return { name: d.name, exercises };
      }),
    };
    this._dayCore = null; this._dayEquip = null;
    return plan;
  },

  // 计算建议重量
  suggestWeight(ex) {
    // 自重/有氧类不给重量建议
    if (ex.equipment === 'body weight' || ex.category === 'cardio' ||
        /徒手|跳绳|熊爬|爬绳|俯卧撑|引体|臂屈伸|波比/.test(ex.name_zh)) {
      return null;
    }
    // 有历史：渐进超载
    const hist = DB.historyOf(ex.id);
    if (hist.length) {
      const last = hist[hist.length - 1];
      const lastSets = last.sets.filter(s => s.reps > 0);
      if (lastSets.length) {
        const topW = Math.max(...lastSets.map(s => s.weight));
        const avgReps = lastSets.reduce((a, s) => a + s.reps, 0) / lastSets.length;
        const goal = DB.getProfile().goal;
        const repTarget = goal === 'strength' ? 5 : goal === 'endurance' ? 18 : 10;
        if (avgReps >= repTarget) {
          // 全部达标 → 加重（上肢 2.5kg，下肢 5kg）
          const isLower = ['upper legs', 'lower legs', 'waist'].includes(ex.category);
          return Math.round((topW + (isLower ? 5 : 2.5)) * 2) / 2;
        }
        return topW; // 未达标保持
      }
    }
    // 无历史：体重系数估算
    const bw = DB.getProfile().bodyweight || 65;
    const name = ex.name + ' ' + (ex.name_zh || '');
    for (const r of this.STRENGTH_RATIO) {
      if (r.re.test(name)) return Math.max(2.5, Math.round(bw * r.ratio / 2.5) * 2.5);
    }
    return null;
  },

  // 替换动作：同部位同器械优先，其次同部位任意
  alternatives(exId) {
    const cur = getEx(exId);
    return EXERCISES.filter(e =>
      e.id !== exId &&
      e.category === cur.category &&
      DB.hasEquipment(e.equipment)
    ).sort((a, b) => {
      const sa = (a.equipment === cur.equipment ? 2 : 0) + this._score(a);
      const sb = (b.equipment === cur.equipment ? 2 : 0) + this._score(b);
      return sb - sa;
    }).slice(0, 12);
  },
};
