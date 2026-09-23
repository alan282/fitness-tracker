/* ── 方案生成器：3/4/5 分化 + 黄金动作模式配额 + 主辅组次 + 热身放松 ── */

const Planner = {
  // 分化定义：patterns 为「模式或组」序列（组内任选其一，顺序即训练顺序：先复合后孤立）
  SPLITS: {
    3: {
      name: '3 分法 · 拉推腿',
      days: [
        { name: '拉日（背 + 二头）', patterns: [['pullup', 'pulldown'], ['row'], ['row'], ['pulldown'], ['curl'], ['curl'], ['core']] },
        { name: '推日（胸肩 + 三头）', patterns: [['bench'], ['inclinepress'], ['pushup'], ['ohp'], ['lateral'], ['triceps']] },
        { name: '腿日', patterns: [['squat'], ['squat'], ['deadlift'], ['lunge'], ['calf'], ['core']] },
      ],
    },
    4: {
      name: '4 分法 · 胸背肩腿',
      days: [
        { name: '胸部 + 肱三', patterns: [['bench'], ['inclinepress'], ['pushup'], ['fly'], ['triceps'], ['triceps']] },
        { name: '背部 + 肱二', patterns: [['pullup', 'pulldown'], ['row'], ['row'], ['pulldown'], ['curl'], ['curl']] },
        { name: '肩部 + 核心', patterns: [['ohp'], ['ohp'], ['lateral'], ['reardelt'], ['core'], ['core']] },
        { name: '腿部', patterns: [['squat'], ['squat'], ['deadlift'], ['lunge'], ['calf'], ['core']] },
      ],
    },
    5: {
      name: '5 分法 · 五分化',
      days: [
        { name: '胸部日', patterns: [['bench'], ['inclinepress'], ['pushup'], ['fly']] },
        { name: '背部日', patterns: [['pullup', 'pulldown'], ['row'], ['row'], ['pulldown'], ['pulldown']] },
        { name: '肩部日', patterns: [['ohp'], ['ohp'], ['lateral'], ['lateral'], ['reardelt']] },
        { name: '手臂日', patterns: [['curl'], ['curl'], ['triceps'], ['triceps'], ['wrist']] },
        { name: '腿部日', patterns: [['squat'], ['squat'], ['deadlift'], ['lunge'], ['calf'], ['core']] },
      ],
    },
  },

  // 训练目标 → 主项/辅项 组次休息
  GOALS: {
    hypertrophy: { label: '增肌塑形', main: { sets: 4, reps: '6-10', rest: 120 }, assist: { sets: 3, reps: '12-15', rest: 60 } },
    strength:    { label: '绝对力量', main: { sets: 5, reps: '3-6',  rest: 180 }, assist: { sets: 3, reps: '8-12',  rest: 90 } },
    endurance:   { label: '肌耐力减脂', main: { sets: 3, reps: '12-15', rest: 60 }, assist: { sets: 3, reps: '15-20', rest: 45 } },
  },

  // 动作模式（中英文正则，kind=exercise）
  PATTERNS: {
    pullup:      /pull-?up|pullup|chin|引体/i,
    pulldown:    /pulldown|下拉/i,
    row:         /row|划船/i,
    bench:       /bench press|卧推/i,
    inclinepress: /incline (?:hammer |one arm |close grip |wide grip )?press|incline bench|上斜(?!划船|弯举)/i,
    pushup:      /push.?up|俯卧撑|dip|臂屈伸/i,
    ohp:         /(overhead|military|shoulder) press|推举(?!卷腹)|侧推/i,
    lateral:     /lateral raise|side lateral|侧平举/i,
    squat:       /squat|深蹲/i,
    deadlift:    /deadlift|硬拉/i,
    lunge:       /lunge|箭步/i,
    curl:        /curl|弯举/i,
    triceps:     /pushdown|下压|triceps|肱三/i,
    calf:        /calf|提踵/i,
    core:        /crunch|卷腹|plank|平板|leg raise|举腿|sit-?up|twist|转体|收腿/i,
    fly:         /fly|crossover|夹胸|飞鸟/i,
    reardelt:    /rear delt|后束/i,
    wrist:       /wrist|腕/i,
  },

  // 复合主项模式（决定组次档位与排序权重）
  MAIN_PATTERNS: ['pullup', 'pulldown', 'row', 'bench', 'inclinepress', 'pushup', 'ohp', 'squat', 'deadlift', 'lunge'],

  // 器械优先级（自由重量优先）
  EQUIP_PRIORITY: ['barbell', 'dumbbell', 'kettlebell', 'cable', 'smith machine', 'leverage machine', 'body weight', 'trap bar', 'olympic barbell', 'ez barbell', 'band', 'medicine ball', 'stability ball', 'rope', 'sled machine', 'weighted'],

  // 风险/不适动作排除（颈后推举/颈后下拉对肩关节不友好；高翻类爆发力动作技术门槛高，不入自动方案）
  EXCLUDE_RE: /behind (the )?head|behind neck|颈后|clean and press|clean-grip|高翻/,

  // 放松拉伸：部位 → 拉伸动作 id 映射（kind=stretch）
  COOLDOWN_MAP: {
    'back':       ['1346', '1365'],
    'chest':      ['1271', '1259'],
    'shoulders':  ['0669', '0643'],
    'upper arms': ['0643'],
    'lower arms': ['0721'],
    'upper legs': ['1713', '1511', '1424'],
    'lower legs': ['1377', '1407'],
    'waist':      ['0690'],
    'neck':       ['0716'],
  },

  _score(ex) {
    let s = 0;
    const pri = this.EQUIP_PRIORITY.indexOf(ex.equipment);
    s += pri >= 0 ? (14 - pri) * 0.3 : 0;
    return s;
  },

  // 按「模式或组」选动作：组内任一模式匹配、器材可用、未用过；组内首个模式优先（如 ['pullup','pulldown'] 引体优先于下拉）
  _pickPattern(groupKeys, usedIds, dayEquipCount) {
    let best = null, bestScore = -1;
    for (const ex of EXERCISES) {
      if (ex.kind !== 'exercise' || usedIds.has(ex.id)) continue;
      if (!DB.hasEquipment(ex.equipment)) continue;
      if (this.EXCLUDE_RE.test(ex.name + ex.name_zh)) continue;
      // 肩推不匹配下斜（下斜推是胸动作）
      if (groupKeys.includes('ohp') && /decline|下斜/.test(ex.name + ex.name_zh)) continue;
      // 同天同器械最多 2 个，保证多样性
      if (dayEquipCount && (dayEquipCount.get(ex.equipment) || 0) >= 2) continue;
      const hitIdx = groupKeys.findIndex(k => this.PATTERNS[k] && this.PATTERNS[k].test(ex.name + ' ' + ex.name_zh));
      if (hitIdx < 0) continue;
      const sc = this._score(ex) + (groupKeys.length > 1 ? (groupKeys.length - hitIdx) * 2 : 0);
      if (sc > bestScore) { best = ex; bestScore = sc; }
    }
    return best;
  },

  // 生成完整方案
  generate(split, goal) {
    const def = this.SPLITS[split];
    const g = this.GOALS[goal];
    const usedIds = new Set(); // 跨天不重复

    const plan = {
      split, goal, name: def.name,
      createdAt: new Date().toISOString(),
      days: def.days.map(d => {
        const exercises = [];
        const dayEquipCount = new Map(); // 当日器械多样性约束
        d.patterns.forEach(group => {
          const ex = this._pickPattern(group, usedIds, dayEquipCount);
          if (!ex) return; // 器材不支持该模式则跳过，宁缺勿滥
          usedIds.add(ex.id);
          dayEquipCount.set(ex.equipment, (dayEquipCount.get(ex.equipment) || 0) + 1);
          const isMain = group.some(k => this.MAIN_PATTERNS.includes(k));
          const cfg = isMain ? g.main : g.assist;
          exercises.push({ exId: ex.id, sets: cfg.sets, reps: cfg.reps, rest: cfg.rest, isMain });
        });

        // 放松拉伸（按当日主模式映射部位）
        const cooldown = this._buildCooldown(d.patterns);

        return {
          name: d.name,
          warmup: this._buildWarmup(exercises),
          exercises,
          cooldown,
        };
      }),
    };
    return plan;
  },

  // 热身节（通用结构化指引）
  _buildWarmup(exercises) {
    const first = exercises.length ? getEx(exercises[0].exId) : null;
    return [
      { label: '低强度有氧', detail: '跑步机快走 / 单车 / 开合跳，逐渐提高心率至微喘', dur: '5 分钟' },
      { label: '动态活动', detail: '手臂环绕、髋部画圈、徒手深蹲各 10 次，活动开今日要用的关节', dur: '2 分钟' },
      first
        ? { label: '主项热身组', detail: '第一个动作「' + first.name_zh + '」用 40-50% 重量做 2 组 × 12 次，找发力感', dur: '3 分钟' }
        : { label: '主项热身组', detail: '今日首个动作用 40-50% 重量做 2 组 × 12 次', dur: '3 分钟' },
    ];
  },

  // 放松节：当日模式涉及部位 → 静态拉伸动作
  _buildCooldown(patterns) {
    const partByPattern = {
      pullup: 'back', pulldown: 'back', row: 'back',
      bench: 'chest', inclinepress: 'chest', pushup: 'chest', fly: 'chest',
      ohp: 'shoulders', lateral: 'shoulders', reardelt: 'shoulders',
      curl: 'upper arms', triceps: 'upper arms', wrist: 'lower arms',
      squat: 'upper legs', deadlift: 'upper legs', lunge: 'upper legs', calf: 'lower legs',
      core: 'waist',
    };
    const parts = [];
    patterns.flat().forEach(k => {
      const p = partByPattern[k];
      if (p && !parts.includes(p)) parts.push(p);
    });
    const ids = [];
    parts.forEach(p => (this.COOLDOWN_MAP[p] || []).forEach(id => {
      if (!ids.includes(id)) ids.push(id);
    }));
    return ids.slice(0, 3).map(id => ({
      exId: id, dur: '30s × 2 组',
    }));
  },

  // 计算建议重量
  suggestWeight(ex) {
    if (ex.equipment === 'body weight' || ex.category === 'cardio' ||
        /徒手|跳绳|熊爬|爬绳|俯卧撑|引体|臂屈伸|波比|卷腹|平板|举腿|转体|收腿|拉伸/.test(ex.name_zh)) {
      return null;
    }
    const hist = DB.historyOf(ex.id);
    if (hist.length) {
      const last = hist[hist.length - 1];
      const lastSets = last.sets.filter(s => s.reps > 0);
      if (lastSets.length) {
        const topW = Math.max(...lastSets.map(s => s.weight));
        const avgReps = lastSets.reduce((a, s) => a + s.reps, 0) / lastSets.length;
        const goal = DB.getProfile().goal;
        const repTarget = goal === 'strength' ? 5 : goal === 'endurance' ? 18 : 8;
        if (avgReps >= repTarget) {
          const isLower = ['upper legs', 'lower legs', 'waist'].includes(ex.category);
          return Math.round((topW + (isLower ? 5 : 2.5)) * 2) / 2;
        }
        return topW;
      }
    }
    const bw = DB.getProfile().bodyweight || 65;
    const name = ex.name + ' ' + (ex.name_zh || '');
    const ratios = [
      [/deadlift|硬拉/, 0.75],
      [/squat(?!.*jump)|深蹲(?!跳)/, 0.55],
      [/bench press|卧推/, 0.45],
      [/row|划船/, 0.40],
      [/press|推举/, 0.30],
      [/lunge|箭步/, 0.25],
      [/pushdown|pulldown|下压|下拉/, 0.25],
      [/curl|弯举/, 0.15],
      [/raise|平举|侧推/, 0.10],
      [/calf|提踵/, 0.20],
    ];
    for (const r of ratios) {
      if (r[0].test(name)) return Math.max(2.5, Math.round(bw * r[1] / 2.5) * 2.5);
    }
    return null;
  },

  // 替换动作：同模式优先，其次同部位
  alternatives(exId) {
    const cur = getEx(exId);
    const curPattern = Object.keys(this.PATTERNS).find(k => this.PATTERNS[k].test(cur.name + ' ' + cur.name_zh));
    return EXERCISES.filter(e =>
      e.id !== exId &&
      e.kind !== 'stretch' &&
      e.category === cur.category &&
      DB.hasEquipment(e.equipment) &&
      !this.EXCLUDE_RE.test(e.name + e.name_zh)
    ).sort((a, b) => {
      const sa = (curPattern && this.PATTERNS[curPattern].test(a.name + ' ' + a.name_zh) ? 3 : 0) + this._score(a);
      const sb = (curPattern && this.PATTERNS[curPattern].test(b.name + ' ' + b.name_zh) ? 3 : 0) + this._score(b);
      return sb - sa;
    }).slice(0, 12);
  },
};
