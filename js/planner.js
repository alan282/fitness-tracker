/* ── 方案生成器：3/4/5 分化 + 黄金动作模式配额 + 主辅组次 + 热身放松 ── */

const Planner = {
  // 分化定义：patterns 为「模式或组」序列（组内任选其一，顺序即训练顺序：先复合后孤立）
  SPLITS: {
    3: {
      name: '3 分法 · 拉推腿',
      days: [
        { name: '拉日（背 + 二头）', patterns: [['pullup', 'pulldown'], ['row'], ['row'], ['pulldown'], ['curl'], ['curl'], ['core']] },
        { name: '推日（胸肩 + 三头）', patterns: [['bench'], ['inclinepress'], ['pushup'], ['ohp'], ['lateral'], ['triceps']] },
        { name: '腿日', patterns: [['squat'], ['glute'], ['deadlift'], ['lunge'], ['calf'], ['core']] },
      ],
    },
    4: {
      name: '4 分法 · 胸背肩腿',
      days: [
        { name: '胸部 + 肱三', patterns: [['bench'], ['inclinepress'], ['pushup'], ['fly'], ['triceps'], ['triceps']] },
        { name: '背部 + 肱二', patterns: [['pullup', 'pulldown'], ['row'], ['row'], ['pulldown'], ['curl'], ['curl']] },
        { name: '肩部 + 核心', patterns: [['ohp'], ['ohp'], ['lateral'], ['reardelt'], ['core'], ['core']] },
        { name: '腿部', patterns: [['squat'], ['glute'], ['deadlift'], ['lunge'], ['calf'], ['core']] },
      ],
    },
    5: {
      name: '5 分法 · 五分化',
      days: [
        { name: '胸部日', patterns: [['bench'], ['inclinepress'], ['pushup'], ['fly']] },
        { name: '背部日', patterns: [['pullup', 'pulldown'], ['row'], ['row'], ['pulldown'], ['pulldown']] },
        { name: '肩部日', patterns: [['ohp'], ['ohp'], ['lateral'], ['lateral'], ['reardelt']] },
        { name: '手臂日', patterns: [['curl'], ['curl'], ['triceps'], ['triceps'], ['wrist']] },
        { name: '腿部日', patterns: [['squat'], ['glute'], ['deadlift'], ['lunge'], ['calf'], ['core']] },
      ],
    },
  },

  // 训练目标 → 主项/辅项 组次休息
  GOALS: {
    hypertrophy: { label: '增肌塑形', main: { sets: 4, reps: '6-10', rest: 120 }, assist: { sets: 3, reps: '12-15', rest: 60 } },
    strength:    { label: '绝对力量', main: { sets: 5, reps: '3-6',  rest: 180 }, assist: { sets: 3, reps: '8-12',  rest: 90 } },
    endurance:   { label: '肌耐力减脂', main: { sets: 3, reps: '12-15', rest: 60 }, assist: { sets: 3, reps: '15-20', rest: 45 } },
  },

  // 动作白名单（教练逐一核对动作库，按推荐顺序排列；精选在前=自动方案默认项，全量补充在后=替换候选可选全部）
  POOL: {
    pullup:      ['0017', '1326', '0253', '0140', '0970', '3019', '1432', '0015', '0467', '1327', '1431', '3293'], // 精选引体→大猩猩/窄距反握变式/辅助站姿反握/弓箭手
    pulldown:    ['0198', '0150', '0197', '0245', '2616', '0177', '3563', '0974', '1013', '0983', '0153', '0232', '0237', '0238', '2330', '3116', '3117'], // 精选下拉→交叉/站姿/直臂/全程/弹力带固定变式
    row:         ['0027', '0292', '0293', '0327', '0049', '0064', '0118', '3017', '0248', '1344', '0861', '0180', '0213', '0214', '0218', '0234', '0139', '1359', '0189', '0988', '1323', '0159', '0160', '0167', '0193', '0208', '0239', '0246', '0521', '1003', '1317', '1318', '1321', '1324', '1717', '2464', '3156', '3158', '3161', '3162', '3165', '3166', '3167', '3168', '0230'], // 精选划船→绳索变式/直立划船/壶铃叛徒/自重站姿系
    bench:       ['0025', '0289', '0748', '0151', '0033', '0301', '0122', '0030', '0352', '0751', '1254', '0052', '0065', '1256', '1257', '1258', '1268', '1719', '2187', '0055', '0303', '0340', '0342', '0343', '1260', '1261', '1267', '1303', '1617', '1751'], // 精选卧推→JM/地板/反握系/瑜伽球/单臂/药球/架上定位变式
    inclinepress: ['0047', '0314', '0169', '0324', '0048', '0321', '1265', '1266', '1281', '1282', '1283', '1618', '1619', '1620', '3545'], // 精选上斜推→反握/锤式/单臂/瑜伽球/交替变式
    pushup:      ['0251', '1430', '2462', '0009', '0279', '1274', '0259', '0283', '0975', '0035', '0129', '0258', '1273', '1275', '1296', '1399', '1421', '2364', '2398', '3216', '3294'], // 精选双杠/俯卧撑→杠铃臂屈伸/凳上/时钟/击掌/增强式/派克/跪姿变式
    ohp:         ['0091', '1457', '1456', '0290', '2137', '0219', '0587', '0997', '0148', '0286', '0287', '0296', '0299', '0445', '0520', '0524', '1731', '2136'], // 精选肩推→交替/古巴/壶铃/窄握变式
    lateral:     ['0334', '0178'],                                                            // 侧平举：哑铃→绳索
    squat:       ['1436', '1435', '0042', '0043', '0046', '0534', '1760', '0533', '1004', '0024', '0026', '0039', '0051', '0053', '0068', '0069', '0097', '0098', '0099', '0101', '0102', '0124', '0127', '0291', '0750', '0987', '1001', '1461', '1462', '1545', '2798', '2810', '3543', '3643', '3769', '1425', '2287', '3305'], // 精选深蹲→托凳/凳上/窄握/杰斐逊/单腿/过顶/侧分腿/泽奇/哥萨克/雪橇机/腿举/蹲推变式
    deadlift:    ['0032', '0811', '0117', '0085', '0116', '0074', '0300', '0752', '0578', '0157', '1009', '0066', '1023', '1756'], // 精选硬拉→单侧/弹力带直背/单腿变式
    lunge:       ['0336', '0078', '0054', '1410', '0077', '3635'],                            // 精选箭步→后箭步变式/对侧前箭步
    glute:       ['0058', '0196', '1408', '0991'],                                            // 臀部专项：杠铃臀冲→绳索胯下上拉→弹力带臀桥→弹力带胯下上拉
    curl:        ['0031', '0447', '0294', '0285', '0313', '0297', '0315', '0070', '0868'],   // 弯举：杠铃→曲杆→哑铃→交替→锤式→集中→上斜→托板→绳索
    triceps:     ['0201', '0200', '0207', '0241', '1723', '0019', '2405', '2406', '1747', '1749', '0338'], // 精选三头下压→固定带变式/法式推举/仰卧肘压
    calf:        ['2289', '1370', '1379', '1393', '0833'],                                    // 提踵：器械→杠铃站姿→哑铃坐姿→史密斯单腿→驴式
    core:        ['0570', '0583', '0014', '0071', '0640', '0650', '0777', '0796', '0979', '1015', '2204', '2466', '3360'], // 精选核心→杠铃卷腹/药球砸地/瑜伽球收膝/绕环/健腹轮/帕洛夫/体锯/登山跑/熊爬
    fly:         ['0308', '2144'],                                                            // 飞鸟：哑铃→绳索夹胸
    reardelt:    ['0202', '0203', '0233', '1328', '0076', '3697', '1022'],                   // 后束：绳索划船系→哑铃仰卧→杠铃→弹力带
    wrist:       ['0210', '0994', '1411', '1412', '0224'],                                    // 腕弯举：绳索→弹力带→杠铃正/反握
  },

  // 复合主项模式（决定组次档位与排序权重）
  MAIN_PATTERNS: ['pullup', 'pulldown', 'row', 'bench', 'inclinepress', 'pushup', 'ohp', 'squat', 'deadlift', 'lunge', 'glute'],

  // 风险/不适动作排除（颈后推举/下拉、高翻类、布拉德福德推举绕头、断头台卧推对肩关节不友好）
  EXCLUDE_RE: /behind (the )?head|behind neck|颈后|clean and press|clean-grip|高翻|bradford|布拉德福德|断头台|guillotine/i,

  // 放松拉伸：部位 → 拉伸动作 id 映射（kind=stretch，均经图文一致性核对）
  COOLDOWN_MAP: {
    'back':       ['1346', '1365'],
    'chest':      ['1167'],
    'shoulders':  ['0669', '0643'],
    'upper arms': ['0643'],
    'lower arms': ['0721'],
    'upper legs': ['1713', '1576', '1424'],
    'lower legs': ['1377', '1407'],
    'waist':      ['1363'],
    'neck':       ['0716'],
  },

  // 按白名单选动作：组内模式按序尝试（如 ['pullup','pulldown'] 引体优先于下拉），池内按推荐顺序取第一个可用项
  _pickPattern(groupKeys, usedIds, dayEquipCount) {
    for (const k of groupKeys) {
      const pool = this.POOL[k] || [];
      for (const id of pool) {
        const ex = getEx(id);
        if (!ex || usedIds.has(id)) continue;
        if (!DB.hasEquipment(ex.equipment)) continue;
        if (this.EXCLUDE_RE.test(ex.name + ex.name_zh)) continue;
        // 同天同器械最多 4 个（保证多样性的同时，哑铃/自重家用场景不误伤）
        if (dayEquipCount && (dayEquipCount.get(ex.equipment) || 0) >= 4) continue;
        return ex;
      }
    }
    return null;
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

  // 放松节：当日模式涉及部位 → 静态拉伸动作（库里无二头拉伸，弯举不映射上臂，背部拉伸已覆盖拉日）
  _buildCooldown(patterns) {
    const partByPattern = {
      pullup: 'back', pulldown: 'back', row: 'back',
      bench: 'chest', inclinepress: 'chest', pushup: 'chest', fly: 'chest',
      ohp: 'shoulders', lateral: 'shoulders', reardelt: 'shoulders',
      triceps: 'upper arms', wrist: 'lower arms',
      squat: 'upper legs', deadlift: 'upper legs', lunge: 'upper legs', calf: 'lower legs',
      glute: 'upper legs',
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

  // 减载判断：该动作连续 2 次未达到目标次数（重量停滞信号）
  isDeload(ex) {
    if (!ex) return false;
    const hist = DB.historyOf(ex.id);
    if (hist.length < 2) return false;
    const goal = DB.getProfile().goal;
    const repTarget = goal === 'strength' ? 5 : goal === 'endurance' ? 18 : 8;
    const last2 = hist.slice(-2);
    return last2.every(h => {
      const sets = h.sets.filter(s => s.reps > 0);
      if (!sets.length) return false;
      const avgReps = sets.reduce((a, s) => a + s.reps, 0) / sets.length;
      return avgReps < repTarget;
    });
  },

  // 计算建议重量
  suggestWeight(ex) {
    if (!ex) return null;
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
        // 连续 2 次未达标：减载 10%，恢复后重新渐进
        if (this.isDeload(ex)) {
          return Math.max(2.5, Math.round(topW * 0.9 * 2) / 2);
        }
        if (avgReps >= repTarget) {
          const isLower = ['upper legs', 'lower legs', 'waist'].includes(ex.category);
          return Math.round((topW + (isLower ? 5 : 2.5)) * 2) / 2;
        }
        return topW;
      }
    }
    const profile = DB.getProfile();
    const bw = profile.bodyweight || 65;
    // 训练经验系数：新手保守起步，有经验正常，老手上调
    const lvK = { novice: 0.75, inter: 1, adv: 1.15 }[profile.level] || 1;
    const name = ex.name + ' ' + (ex.name_zh || '');
    const ratios = [
      [/deadlift|硬拉/, 0.75],
      [/hip thrust|提髋|臀冲|臀桥|胯下/, 0.5],
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
      if (r[0].test(name)) return Math.max(2.5, Math.round(bw * r[1] * lvK / 2.5) * 2.5);
    }
    return null;
  },

  // 替换动作：只从同一模式的白名单池里出（每个都是核对过的有效动作）；拉伸在拉伸池内同部位替换
  alternatives(exId) {
    const cur = getEx(exId);
    if (!cur) return [];
    // 拉伸：同部位的其他拉伸（拉伸池全部核对过）
    if (cur.kind === 'stretch') {
      return EXERCISES.filter(e => e.kind === 'stretch' && e.id !== exId && e.category === cur.category);
    }
    // 当前动作在白名单内：同模式池 = 真有效替换
    const poolKey = Object.keys(this.POOL).find(k => this.POOL[k].includes(exId));
    if (poolKey) {
      return this.POOL[poolKey]
        .filter(id => id !== exId)
        .map(id => getEx(id))
        .filter(ex => ex && DB.hasEquipment(ex.equipment) && !this.EXCLUDE_RE.test(ex.name + ex.name_zh));
    }
    // 旧方案动作不在白名单（如已删除/历史方案）：同部位白名单动作兜底，保证给出的仍是有效动作
    const anyPool = new Set(Object.values(this.POOL).flat());
    return EXERCISES.filter(e =>
      e.id !== exId && e.kind !== 'stretch' &&
      e.category === cur.category && anyPool.has(e.id) &&
      DB.hasEquipment(e.equipment) && !this.EXCLUDE_RE.test(e.name + e.name_zh)
    );
  },
};
