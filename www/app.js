(function () {
  'use strict';

  const STORAGE_KEY = 'thin-plan-v1';
  const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'snack'];
  const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const VIEWS = ['today', 'plan', 'takeout', 'data'];
  const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19 12 8 5.2Z"/></svg>';
  const VID_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10 5-3v10l-5-3"/></svg>';

  let state = loadState();
  let currentView = 'today';
  let toastTimer = null;
  let storageWarned = false;
  let activeDate = todayISO();

  /* ---------------- dates ---------------- */

  function pad(n) { return String(n).padStart(2, '0'); }

  function toISO(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayISO() { return toISO(new Date()); }

  function parseISO(iso) {
    const parts = String(iso).split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function addDays(iso, n) {
    const d = parseISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  function diffDays(a, b) {
    const pa = String(a).split('-').map(Number);
    const pb = String(b).split('-').map(Number);
    return Math.round(
      (Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000
    );
  }

  function formatDate(iso) {
    const d = parseISO(iso);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEKDAYS[d.getDay()];
  }

  function formatShort(iso) {
    const d = parseISO(iso);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function isDateString(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseISO(s).getTime());
  }

  /* ---------------- state ---------------- */

  function createState() {
    const start = todayISO();
    return {
      version: 1,
      startDate: start,
      createdAt: new Date().toISOString(),
      profile: {
        height: APP.height,
        startWeight: APP.startWeight,
        targetWeight: APP.targetWeight,
        targetWaist: APP.targetWaist
      },
      settings: {
        calories: APP.baseCalories,
        protein: APP.baseProtein,
        steps: APP.baseSteps
      },
      logs: {
        weights: [{ date: start, kg: APP.startWeight, source: 'start' }],
        waist: [],
        days: {}
      },
      reviews: []
    };
  }

  function clamp(n, min, max) {
    const v = Number.isFinite(Number(n)) ? Number(n) : min;
    return Math.min(max, Math.max(min, v));
  }

  function normalizeState(raw) {
    const base = createState();
    const s = {
      version: 1,
      startDate: base.startDate,
      createdAt: base.createdAt,
      profile: Object.assign({}, base.profile),
      settings: Object.assign({}, base.settings),
      logs: { weights: [], waist: [], days: {} },
      reviews: []
    };
    if (!raw || typeof raw !== 'object') return s;
    if (isDateString(raw.startDate)) s.startDate = raw.startDate;
    if (typeof raw.createdAt === 'string') s.createdAt = raw.createdAt;
    if (raw.profile && typeof raw.profile === 'object') Object.assign(s.profile, raw.profile);
    if (raw.settings && typeof raw.settings === 'object') Object.assign(s.settings, raw.settings);
    if (raw.logs && typeof raw.logs === 'object') {
      if (Array.isArray(raw.logs.weights)) {
        s.logs.weights = raw.logs.weights
          .filter(function (w) { return w && isDateString(w.date) && Number.isFinite(Number(w.kg)); })
          .map(function (w) { return { date: w.date, kg: clamp(w.kg, 20, 300), source: w.source || 'manual' }; });
      }
      if (Array.isArray(raw.logs.waist)) {
        s.logs.waist = raw.logs.waist
          .filter(function (w) { return w && isDateString(w.date) && Number.isFinite(Number(w.cm)); })
          .map(function (w) { return { date: w.date, cm: clamp(w.cm, 30, 250) }; });
      }
      if (raw.logs.days && typeof raw.logs.days === 'object') s.logs.days = raw.logs.days;
    }
    if (Array.isArray(raw.reviews)) {
      s.reviews = raw.reviews.filter(function (r) { return r && Number.isFinite(Number(r.week)); });
    }
    s.settings.calories = Math.round(clamp(s.settings.calories, 1200, 2600));
    s.settings.protein = Math.round(clamp(s.settings.protein, 80, 180));
    s.settings.steps = Math.round(clamp(s.settings.steps, 4000, 20000));
    s.profile.height = clamp(s.profile.height, 120, 230);
    s.profile.startWeight = clamp(s.profile.startWeight, 30, 250);
    s.profile.targetWeight = clamp(s.profile.targetWeight, 30, 250);
    s.profile.targetWaist = clamp(s.profile.targetWaist, 45, 160);
    s.logs.weights.sort(function (a, b) { return a.date.localeCompare(b.date); });
    s.logs.waist.sort(function (a, b) { return a.date.localeCompare(b.date); });
    s.reviews.sort(function (a, b) { return Number(a.week) - Number(b.week); });
    return s;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeState(JSON.parse(raw));
    } catch (err) {
      /* 文件协议或隐私模式下可能不可用 */
    }
    return createState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      if (!storageWarned) {
        storageWarned = true;
        toast('浏览器存储不可用，记录只保留在本次打开中');
      }
    }
  }

  /* ---------------- meta / plan ---------------- */

  function currentMeta() {
    const date = todayISO();
    const elapsed = Math.max(0, diffDays(state.startDate, date));
    const dayNo = elapsed % 7 + 1;
    const weekNo = Math.min(APP.weeks, Math.floor(elapsed / 7) + 1);
    const expired = elapsed >= APP.weeks * 7;
    return {
      date: date,
      elapsed: elapsed,
      dayNo: dayNo,
      weekNo: weekNo,
      expired: expired,
      plan: APP.days[dayNo - 1] || APP.days[0]
    };
  }

  function planDayForDate(dateKey) {
    const elapsed = Math.max(0, diffDays(state.startDate, dateKey));
    return APP.days[elapsed % 7] || APP.days[0];
  }

  function getDayLog(dateKey) {
    const plan = planDayForDate(dateKey);
    let log = state.logs.days[dateKey];
    if (!log || typeof log !== 'object') {
      log = {};
      state.logs.days[dateKey] = log;
    }
    if (!Array.isArray(log.blocks)) log.blocks = [];
    while (log.blocks.length < plan.blocks.length) log.blocks.push(false);
    if (log.blocks.length > plan.blocks.length) log.blocks.length = plan.blocks.length;
    if (!log.meals || typeof log.meals !== 'object') log.meals = {};
    MEAL_KEYS.forEach(function (k) {
      if (typeof log.meals[k] !== 'boolean') log.meals[k] = false;
    });
    log.water = Math.round(clamp(log.water || 0, 0, 12));
    log.steps = Math.max(0, Math.round(Number(log.steps) || 0));
    log.posture = !!log.posture;
    return log;
  }

  function peekWorkoutDone(dateKey, plan) {
    const log = state.logs.days[dateKey];
    if (!log || !Array.isArray(log.blocks)) return false;
    if (!plan || !plan.blocks.length) return false;
    for (let i = 0; i < plan.blocks.length; i++) {
      if (!log.blocks[i]) return false;
    }
    return true;
  }

  function workoutDone(dateKey) {
    return peekWorkoutDone(dateKey, planDayForDate(dateKey));
  }

  function allMealsDone(log) {
    return MEAL_KEYS.every(function (k) { return !!log.meals[k]; });
  }

  /* ---------------- weight / waist ---------------- */

  function sortedWeights() {
    return state.logs.weights
      .filter(function (w) { return w && w.date <= todayISO(); })
      .slice()
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  function latestWeight() {
    const list = sortedWeights();
    return list.length ? list[list.length - 1] : null;
  }

  function averageWeights(days) {
    const list = sortedWeights().filter(function (w) {
      const d = diffDays(w.date, todayISO());
      return d >= 0 && d < days;
    });
    if (!list.length) return null;
    return list.reduce(function (sum, w) { return sum + Number(w.kg); }, 0) / list.length;
  }

  function weightChange(days) {
    const list = sortedWeights().filter(function (w) {
      const d = diffDays(w.date, todayISO());
      return d >= 0 && d < days;
    });
    if (list.length < 2) return null;
    return list[list.length - 1].kg - list[0].kg;
  }

  function sortedWaist() {
    return state.logs.waist
      .filter(function (w) { return w && w.date <= todayISO(); })
      .slice()
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  function latestWaist() {
    const list = sortedWaist();
    return list.length ? list[list.length - 1] : null;
  }

  function getWeightsInWeek(week) {
    const start = addDays(state.startDate, (week - 1) * 7);
    const end = addDays(start, 6);
    return sortedWeights().filter(function (w) { return w.date >= start && w.date <= end; });
  }

  function averageOf(list) {
    if (!list.length) return null;
    return list.reduce(function (sum, w) { return sum + Number(w.kg || w.cm); }, 0) / list.length;
  }

  function trainingStats(week) {
    const start = addDays(state.startDate, (week - 1) * 7);
    const active = APP.days.filter(function (d) { return d.n <= 6; });
    let done = 0;
    active.forEach(function (d) {
      const key = addDays(start, d.n - 1);
      if (peekWorkoutDone(key, d)) done++;
    });
    return { done: done, total: active.length, rate: active.length ? done / active.length : 0 };
  }

  /* ---------------- helpers ---------------- */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function fmt1(n) {
    return Number(n).toFixed(1);
  }

  function fmtDelta(n, unit) {
    if (n == null || !Number.isFinite(Number(n))) return '—';
    const v = Number(n);
    const sign = v > 0 ? '+' : '';
    return sign + v.toFixed(1) + ' ' + (unit || 'kg');
  }

  function deltaClass(n, lowerIsBetter) {
    if (n == null || Math.abs(n) < 0.05) return '';
    if (lowerIsBetter) return n < 0 ? 'good' : 'warn';
    return n > 0 ? 'good' : 'warn';
  }

  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2500);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  function isNativeApp() {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
  }

  function openVideo(url) {
    if (isNativeApp() && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
      window.Capacitor.Plugins.Browser.open({ url: url }).catch(function () {
        window.open(url, '_blank', 'noopener');
      });
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  /* ---------------- render: shell ---------------- */

  function renderHeader(meta) {
    const pill = document.getElementById('weekPill');
    const dateText = document.getElementById('dateText');
    if (pill) pill.textContent = meta.expired ? '12 周完成' : '第 ' + meta.weekNo + ' 周';
    if (dateText) dateText.textContent = formatDate(meta.date);
  }

  function renderAll() {
    const meta = currentMeta();
    activeDate = meta.date;
    renderHeader(meta);
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.id === 'view-' + currentView);
    });
    document.querySelectorAll('.tab').forEach(function (b) {
      const on = b.getAttribute('data-view') === currentView;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    renderView(currentView);
  }

  function renderView(view) {
    if (view === 'today') renderToday();
    else if (view === 'plan') renderPlan();
    else if (view === 'takeout') renderTakeout();
    else if (view === 'data') renderData();
  }

  function switchView(view) {
    if (VIEWS.indexOf(view) === -1) view = 'today';
    currentView = view;
    try { history.replaceState(null, '', '#' + view); } catch (err) { /* ignore */ }
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- render: today ---------------- */

  function videoBlock(video, label) {
    if (!video) return '';
    return '' +
      '<div class="video-cover">' +
        '<a class="video-link" href="' + esc(video.url) + '" target="_blank" rel="noopener">' +
          '<span class="play">' + PLAY_SVG + '</span>' +
          '<span class="video-copy">' +
            '<span class="video-title">' + esc(video.title) + '</span>' +
            '<span class="video-meta">' + esc(video.platform || 'B 站') + ' · ' + esc(label || '跟练') + ' · 点击打开</span>' +
          '</span>' +
        '</a>' +
        (video.note ? '<p class="video-note">' + esc(video.note) + '</p>' : '') +
      '</div>';
  }

  function renderToday() {
    const meta = currentMeta();
    const plan = meta.plan;
    const log = getDayLog(meta.date);
    const blocksDone = log.blocks.filter(Boolean).length;
    const blockPct = plan.blocks.length ? blocksDone / plan.blocks.length : 0;
    const mealsDone = MEAL_KEYS.filter(function (k) { return log.meals[k]; }).length;
    const mealPct = mealsDone / MEAL_KEYS.length;
    const stepPct = Math.min(1, log.steps / state.settings.steps);
    const ringPct = Math.round((blockPct * 0.45 + mealPct * 0.3 + stepPct * 0.15 + (log.posture ? 0.1 : 0)) * 100);
    const latest = latestWeight();
    const avg7 = averageWeights(7);
    const todayWeight = state.logs.weights.find(function (w) { return w.date === meta.date; });
    const workoutIsDone = blockPct === 1;
    const totalKcal = MEAL_KEYS.reduce(function (sum, k) { return sum + Number(plan.meals[k].kcal || 0); }, 0);
    const totalProtein = MEAL_KEYS.reduce(function (sum, k) { return sum + Number(plan.meals[k].protein || 0); }, 0);
    const targetKcal = Number(state.settings.calories);
    const kcalDiff = targetKcal - totalKcal;
    const portionNote = kcalDiff < -80
      ? '餐单比热量上限高 ' + Math.abs(kcalDiff) + ' kcal：主食每餐减约 1/3 拳，或加餐减半；蛋白质不要减。'
      : '';

    const html = '' +
      '<section class="hero">' +
        '<div class="hero-top">' +
          '<div class="hero-main">' +
            '<p class="hero-eyebrow">第 ' + meta.weekNo + ' 周 · ' + plan.weekday + ' · ' + formatShort(meta.date) + '</p>' +
            '<h1 class="hero-title">' + esc(plan.title) + '</h1>' +
            '<p class="hero-sub">' + esc(plan.subtitle) + ' · ' + plan.duration + ' 分钟</p>' +
          '</div>' +
          '<div class="ring" style="--p:' + ringPct + '" role="img" aria-label="今日完成度 ' + ringPct + '%">' +
            '<div class="ring-inner"><span class="ring-num">' + ringPct + '%</span><span class="ring-label">今日完成</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="hero-chips">' +
          '<span class="hero-chip"><i class="dot"></i>热量上限 <b>' + targetKcal + ' kcal</b></span>' +
          '<span class="hero-chip"><i class="dot"></i>蛋白 <b>' + state.settings.protein + 'g</b></span>' +
          '<span class="hero-chip"><i class="dot"></i>步数 <b>' + state.settings.steps + '</b></span>' +
          '<span class="hero-chip"><i class="dot"></i>训练 <b>' + plan.duration + ' 分钟</b></span>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head">' +
          '<div><span class="kicker">WEIGHT</span><h2 class="card-title">今天称重</h2>' +
          '<p class="card-sub">早上空腹、上完厕所后称，穿得越少越稳定。</p></div>' +
        '</div>' +
        '<div class="quick-weight">' +
          '<div>' +
            '<div class="display">' + (latest ? fmt1(latest.kg) : '--') + '<small>kg</small></div>' +
            '<div class="hint">7 日均值 ' + (avg7 == null ? '—' : fmt1(avg7)) + ' kg · 起始 ' + fmt1(APP.startWeight) + ' kg</div>' +
          '</div>' +
          '<div class="input-row">' +
            '<input class="input w-90" id="weightInput" type="number" inputmode="decimal" min="30" max="250" step="0.1" value="' + (todayWeight ? fmt1(todayWeight.kg) : '') + '" placeholder="' + (latest ? fmt1(latest.kg) : '75.0') + '" aria-label="今天的体重">' +
            '<button class="btn small sage" type="button" data-action="saveWeight" data-input="#weightInput">记录</button>' +
          '</div>' +
        '</div>' +
        '<div class="stat-strip">' +
          '<div><span class="k">目标</span><span class="v">' + fmt1(APP.targetWeight) + ' kg</span></div>' +
          '<div><span class="k">累计变化</span><span class="v">' + (latest ? fmtDelta(latest.kg - APP.startWeight) : '—') + '</span></div>' +
          '<div><span class="k">腰围目标</span><span class="v">' + APP.targetWaist + ' cm</span></div>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head">' +
          '<div><span class="kicker">TRAINING</span><h2 class="card-title">今日训练</h2>' +
          '<p class="card-sub">' + esc(plan.tag) + ' · ' + plan.duration + ' 分钟 · ' + esc(plan.burn) + '</p></div>' +
          '<span class="tag">' + esc(plan.intensity) + '</span>' +
        '</div>' +
        videoBlock(plan.video, '主视频') +
        (plan.extraVideo ? '<div class="extra-video"><span>第二个视频：' + esc(plan.extraVideo.title) + '</span><a href="' + esc(plan.extraVideo.url) + '" target="_blank" rel="noopener">打开 ↗</a></div>' : '') +
        '<div class="progress-line"><div class="progress"><i style="width:' + Math.round(blockPct * 100) + '%"></i></div>' +
          '<span class="progress-label">' + blocksDone + '/' + plan.blocks.length + ' 组</span></div>' +
        '<div class="block-list">' +
          plan.blocks.map(function (b, i) {
            return '<div class="block">' +
              '<div class="block-head">' +
                '<div class="block-title"><button class="check ' + (log.blocks[i] ? 'done' : '') + '" type="button" data-action="toggleBlock" data-index="' + i + '" aria-label="勾选' + esc(b.title) + '" aria-pressed="' + (!!log.blocks[i]) + '">✓</button>' + esc(b.title) + '</div>' +
                '<span class="block-time">' + esc(b.time) + '</span>' +
              '</div>' +
              '<ul class="block-items">' + b.items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="day-actions">' +
          (workoutIsDone
            ? '<button class="btn small sage" type="button" disabled>已完成 ✓</button>'
            : '<button class="btn small" type="button" data-action="completeWorkout">全部勾完</button>') +
          '<button class="btn small ghost" type="button" data-action="resetWorkout">重置</button>' +
          '<span class="tiny muted">' + (workoutIsDone ? '今天不要再加练。' : '留 2–3 次余力，不做到力竭。') + '</span>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head">' +
          '<div><span class="kicker">TAKEOUT</span><h2 class="card-title">今日外卖</h2>' +
          '<p class="card-sub">餐单约 ' + totalKcal + ' kcal · 蛋白 ' + totalProtein + 'g · 热量上限 ' + targetKcal + ' kcal</p></div>' +
          '<span class="tag">' + mealsDone + '/4</span>' +
        '</div>' +
        (portionNote ? '<div class="portion-note">' + esc(portionNote) + '</div>' : '') +
        '<div class="meal-list">' +
          MEAL_KEYS.map(function (k) { return renderMeal(plan.meals[k], k, log.meals[k]); }).join('') +
        '</div>' +
      '</section>' +

      '<section class="card habit-card">' +
        '<div class="card-head">' +
          '<div><span class="kicker">DAILY</span><h2 class="card-title">喝水与步数</h2>' +
          '<p class="card-sub">水喝够，外卖的汤别喝；步数可以晚上补。</p></div>' +
        '</div>' +
        '<div class="habit-row">' +
          '<div><div class="habit-label"><span class="ico">水</span>喝水</div><div class="habit-sub">' + log.water + '/8 杯 · 每杯约 250ml</div></div>' +
          '<div class="water-dots" aria-label="喝水杯数">' +
            Array.from({ length: 8 }, function (_, i) {
              return '<button class="water-dot ' + (i < log.water ? 'on' : '') + '" type="button" data-action="water" data-n="' + (i + 1) + '" aria-label="' + (i + 1) + ' 杯">' + (i + 1) + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="habit-row">' +
          '<div><div class="habit-label"><span class="ico">步</span>步数</div><div class="habit-sub">目标 ' + state.settings.steps + ' 步 · 走路也算</div></div>' +
          '<div class="steps-box">' +
            '<input class="input" id="stepsInput" type="number" inputmode="numeric" min="0" max="50000" step="100" value="' + (log.steps || '') + '" placeholder="' + state.settings.steps + '" data-action="setSteps" aria-label="今天的步数">' +
            '<span class="unit">步</span>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head">' +
          '<div><span class="kicker">POSTURE</span><h2 class="card-title">5 分钟体态</h2>' +
          '<p class="card-sub">收下巴 + 开胸 + 颈侧放松，改善头前伸。</p></div>' +
          '<button class="check ' + (log.posture ? 'done' : '') + '" type="button" data-action="togglePosture" aria-label="完成体态训练" aria-pressed="' + (!!log.posture) + '">✓</button>' +
        '</div>' +
        '<div class="posture-list">' +
          APP.posture.map(function (p) {
            return '<div class="posture-item"><div><b>' + esc(p.name) + '</b><span>' + esc(p.cue) + '</span></div><span class="dose">' + esc(p.dose) + '</span></div>';
          }).join('') +
        '</div>' +
        '<p class="tiny muted" style="margin:10px 0 0">' + esc(APP.postureNote) + '</p>' +
      '</section>' +

      '<div class="note-card"><span class="mark">!</span><p><strong>今天记住：</strong>' + esc(plan.note) + '</p></div>';

    document.getElementById('view-today').innerHTML = html;
  }

  function renderMeal(meal, key, checked) {
    return '<div class="meal ' + (checked ? 'done' : '') + '">' +
      '<div class="meal-head">' +
        '<button class="check square ' + (checked ? 'done' : '') + '" type="button" data-action="toggleMeal" data-meal="' + key + '" aria-label="勾选' + MEAL_LABELS[key] + '" aria-pressed="' + (!!checked) + '">✓</button>' +
        '<div class="meal-main">' +
          '<span class="meal-type">' + MEAL_LABELS[key] + '</span>' +
          '<span class="meal-name">' + esc(meal.name) + '</span>' +
          '<div class="meal-macros"><span class="macro">' + meal.kcal + ' kcal</span><span class="macro protein">蛋白 ' + meal.protein + 'g</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="order-box"><span class="order-label">这样点</span><p class="order-text">' + esc(meal.order) + '</p></div>' +
      '<div class="meal-foot"><span class="meal-place">' + esc(meal.place) + '</span>' +
        '<button class="btn small ghost" type="button" data-action="copy" data-copy="' + esc(meal.order) + '">复制点单</button></div>' +
    '</div>';
  }

  /* ---------------- render: plan ---------------- */

  function renderPlan() {
    const meta = currentMeta();
    const start = addDays(state.startDate, (meta.weekNo - 1) * 7);
    const html = '' +
      '<div class="week-banner">' +
        '<div><b>第 ' + meta.weekNo + ' 周 · ' + (meta.weekNo === 1 ? '建立节奏' : meta.expired ? '12 周完成' : '按数据微调') + '</b>' +
          '<span>' + formatShort(start) + ' – ' + formatShort(addDays(start, 6)) + ' · 周日复盘</span></div>' +
        '<div class="week-no">' + String(meta.weekNo).padStart(2, '0') + '</div>' +
      '</div>' +
      '<div class="stat-strip" style="margin-top:0;margin-bottom:14px">' +
        '<div><span class="k">力量</span><span class="v">2 次</span></div>' +
        '<div><span class="k">有氧</span><span class="v">3 次</span></div>' +
        '<div><span class="k">恢复</span><span class="v">1 天</span></div>' +
      '</div>' +
      APP.days.map(function (d) {
        const date = addDays(start, d.n - 1);
        const isToday = date === meta.date;
        const done = peekWorkoutDone(date, d);
        return '<details class="day-card ' + (isToday ? 'today' : '') + '"' + (isToday ? ' open' : '') + '>' +
          '<summary class="day-summary">' +
            '<div class="day-index">' + d.weekday + '<small>DAY ' + d.n + '</small></div>' +
            '<div class="day-main">' +
              '<div class="day-title">' + esc(d.title) + ' <span class="tag">' + esc(d.tag) + '</span></div>' +
              '<div class="day-meta">' + d.duration + ' 分钟 · ' + esc(d.intensity) + ' · ' + esc(d.burn) + '</div>' +
            '</div>' +
            '<div class="day-state ' + (done ? 'done' : '') + '">' + (isToday ? '今天' : done ? '已完成' : '查看') + '</div>' +
            '<span class="chevron" aria-hidden="true"></span>' +
          '</summary>' +
          '<div class="day-content">' +
            '<div class="day-actions">' +
              '<a class="btn small" href="' + esc(d.video.url) + '" target="_blank" rel="noopener">' + VID_SVG + ' 跟练视频</a>' +
              (d.extraVideo ? '<a class="btn small ghost" href="' + esc(d.extraVideo.url) + '" target="_blank" rel="noopener">第二个视频</a>' : '') +
              (isToday ? '<button class="btn small soft" type="button" data-action="goToday">去今日打卡</button>' : '') +
            '</div>' +
            '<div class="detail-label">训练内容</div>' +
            d.blocks.map(function (b) {
              return '<div class="mini-block"><b>' + esc(b.title) + '<br><span class="tiny muted">' + esc(b.time) + '</span></b><span>' + b.items.map(esc).join(' · ') + '</span></div>';
            }).join('') +
            '<div class="detail-label">外卖清单</div>' +
            MEAL_KEYS.map(function (k) {
              const m = d.meals[k];
              return '<div class="mini-meal"><span>' + MEAL_LABELS[k] + '</span><span>' + esc(m.name) + '</span><span>' + m.kcal + ' kcal</span></div>';
            }).join('') +
            '<p class="tiny muted" style="margin:10px 0 0">' + esc(d.note) + '</p>' +
          '</div>' +
        '</details>';
      }).join('') +
      '<div class="note-card" style="margin-top:14px"><span class="mark">i</span><p><strong>第一周不追速度：</strong>先把 6 天出勤、外卖结构和 8000 步跑顺。下周开始，数据页会根据体重变化调整热量和步数。</p></div>';

    document.getElementById('view-plan').innerHTML = html;
  }

  /* ---------------- render: takeout ---------------- */

  function renderTakeout() {
    const html = '' +
      '<div class="section-head"><h2 class="section-title">外卖万能公式</h2><span class="section-note">不用算每一卡</span></div>' +
      '<section class="card">' +
        '<div class="formula">' +
          APP.takeoutFormula.map(function (line, i) {
            return '<div class="formula-step"><span class="formula-no">' + (i + 1) + '</span><p>' + esc(line) + '</p></div>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<div class="section-head"><h2 class="section-title">尽量避开</h2><span class="section-note">不是永远不吃</span></div>' +
      '<section class="card">' +
        '<ul class="avoid-list">' + APP.avoid.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<p class="tiny muted" style="margin:10px 0 0">偶尔吃了不用补救，下一餐回到公式即可；不要用“少吃一顿”惩罚自己。</p>' +
      '</section>' +
      '<div class="section-head"><h2 class="section-title">10 个替换库</h2><span class="section-note">照着点就行</span></div>' +
      '<section class="card">' +
        '<div class="swap-grid">' +
          APP.swaps.map(function (s) {
            return '<div class="swap"><div class="swap-head"><span class="swap-name">' + esc(s.name) + '</span><span class="swap-macro">' + esc(s.kcal) + ' kcal · 蛋白 ' + esc(s.protein) + '</span></div>' +
              '<p>' + esc(s.order) + '</p>' +
              '<div class="day-actions" style="margin-top:8px"><button class="btn small ghost" type="button" data-action="copy" data-copy="' + esc(s.order) + '">复制点单</button></div></div>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<div class="section-head"><h2 class="section-title">本周外卖清单</h2><span class="section-note">7 天 · 28 餐</span></div>' +
      '<section class="card">' +
        APP.days.map(function (d) {
          return '<div class="week-group"><div class="week-group-head">' + d.weekday + ' · ' + esc(d.tag) + '</div>' +
            MEAL_KEYS.map(function (k) {
              const m = d.meals[k];
              return '<div class="weekly-meal"><span class="m-type">' + MEAL_LABELS[k] + '</span><div class="m-main"><span class="m-name">' + esc(m.name) + '</span><span class="m-kcal">' + m.kcal + ' kcal · 蛋白 ' + m.protein + 'g</span></div>' +
                '<button class="btn small ghost" type="button" data-action="copy" data-copy="' + esc(m.order) + '">复制</button></div>';
            }).join('') +
          '</div>';
        }).join('') +
        '<p class="tiny muted" style="margin:12px 0 0">同一餐可以互换；优先保证蛋白质和蔬菜，主食按半份到一份。外卖油盐重时，下一餐清淡一点即可。</p>' +
      '</section>';

    document.getElementById('view-takeout').innerHTML = html;
  }

  /* ---------------- render: data ---------------- */

  function renderData() {
    const meta = currentMeta();
    const weights = sortedWeights();
    const latest = latestWeight();
    const avg7 = averageWeights(7);
    const change7 = weightChange(7);
    const first = weights.length ? weights[0] : null;
    const sinceStart = latest && first ? latest.kg - first.kg : null;
    const waist = latestWaist();
    const waistFirst = sortedWaist()[0];
    const waistDelta = waist && waistFirst ? waist.cm - waistFirst.cm : null;
    const training = trainingStats(meta.weekNo);
    const chartWeights = weights.filter(function (w) { return diffDays(w.date, meta.date) <= 29; });
    const reviewPreview = buildReviewPreview();

    const weightRows = weights.slice().reverse().slice(0, 12).map(function (w) {
      return '<div class="log-row"><span class="log-date">' + formatShort(w.date) + '</span><span class="log-value">' + fmt1(w.kg) + ' kg</span><span class="log-note">' + (w.source === 'start' ? '起始' : '') + '</span>' +
        '<button class="log-del" type="button" data-action="deleteWeight" data-date="' + w.date + '" aria-label="删除 ' + w.date + ' 体重">×</button></div>';
    }).join('');

    const waistRows = sortedWaist().slice().reverse().slice(0, 12).map(function (w) {
      return '<div class="log-row"><span class="log-date">' + formatShort(w.date) + '</span><span class="log-value">' + fmt1(w.cm) + ' cm</span><span class="log-note"></span>' +
        '<button class="log-del" type="button" data-action="deleteWaist" data-date="' + w.date + '" aria-label="删除 ' + w.date + ' 腰围">×</button></div>';
    }).join('');

    const latestReview = state.reviews.length ? state.reviews[state.reviews.length - 1] : null;
    const existingReview = state.reviews.find(function (r) { return Number(r.week) === reviewPreview.week; });

    const html = '' +
      '<div class="section-head"><h2 class="section-title">数据面板</h2><span class="section-note">看趋势，不看单日</span></div>' +
      '<div class="stats-grid">' +
        '<div class="stat-card"><span class="stat-label">当前体重</span><div class="stat-value">' + (latest ? fmt1(latest.kg) : '--') + '<small>kg</small></div>' +
          '<div class="stat-delta ' + deltaClass(sinceStart, true) + '">较起始 ' + fmtDelta(sinceStart) + '</div></div>' +
        '<div class="stat-card"><span class="stat-label">7 日均值</span><div class="stat-value">' + (avg7 == null ? '--' : fmt1(avg7)) + '<small>kg</small></div>' +
          '<div class="stat-delta">近 7 天 ' + fmtDelta(change7) + '</div></div>' +
        '<div class="stat-card"><span class="stat-label">腰围</span><div class="stat-value">' + (waist ? fmt1(waist.cm) : '--') + '<small>cm</small></div>' +
          '<div class="stat-delta ' + deltaClass(waistDelta, true) + '">较首次 ' + fmtDelta(waistDelta, 'cm') + '</div></div>' +
        '<div class="stat-card"><span class="stat-label">本周训练</span><div class="stat-value">' + training.done + '<small>/ ' + training.total + ' 天</small></div>' +
          '<div class="stat-delta">完成率 ' + Math.round(training.rate * 100) + '%</div></div>' +
      '</div>' +

      '<section class="card chart-card">' +
        '<div class="chart-head"><div><span class="kicker">TREND</span><h2 class="card-title">体重趋势</h2></div>' +
          '<div class="chart-legend"><span><i class="legend-dot"></i>体重</span><span>近 30 天</span></div></div>' +
        '<div class="chart-wrap"><canvas id="weightChart" aria-label="体重趋势图"></canvas>' +
          (chartWeights.length ? '' : '<div class="chart-empty"><div><strong>还没有体重记录</strong><br>记录 2 次以上就能看到趋势</div></div>') +
        '</div>' +
        '<div class="chart-axis"><span>' + formatShort(addDays(meta.date, -29)) + '</span><span>' + formatShort(meta.date) + '</span></div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><span class="kicker">WEIGHT LOG</span><h2 class="card-title">体重记录</h2>' +
          '<p class="card-sub">建议每周至少 3 次；用 7 日均值判断。</p></div></div>' +
        '<div class="input-row" style="margin-bottom:10px">' +
          '<input class="input" id="dataWeightInput" type="number" inputmode="decimal" min="30" max="250" step="0.1" placeholder="今天 ' + (latest ? fmt1(latest.kg) : '75.0') + ' kg" aria-label="记录体重">' +
          '<button class="btn small sage" type="button" data-action="saveWeight" data-input="#dataWeightInput">记录</button>' +
        '</div>' +
        '<div class="log-list">' + (weightRows || '<div class="empty">还没有记录</div>') + '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><span class="kicker">WAIST</span><h2 class="card-title">腰围记录</h2>' +
          '<p class="card-sub">每 2 周量一次；肚脐水平，呼气末，不收腹。</p></div></div>' +
        '<div class="input-row" style="margin-bottom:10px">' +
          '<input class="input" id="dataWaistInput" type="number" inputmode="decimal" min="40" max="200" step="0.1" placeholder="' + (waist ? fmt1(waist.cm) : '例如 88.0') + ' cm" aria-label="记录腰围">' +
          '<button class="btn small sage" type="button" data-action="saveWaist" data-input="#dataWaistInput">记录</button>' +
        '</div>' +
        '<div class="log-list">' + (waistRows || '<div class="empty">还没有腰围记录<br>周末早上量一次</div>') + '</div>' +
      '</section>' +

      '<section class="card review-card">' +
        '<div class="review-top"><div><span class="kicker">WEEKLY REVIEW</span><h2 class="card-title">第 ' + reviewPreview.week + ' 周复盘</h2>' +
          '<p class="card-sub">' + (existingReview ? '已生成，目标已更新' : '建议周日晚上生成，自动调下周目标') + '</p></div>' +
          '<span class="review-badge">W' + reviewPreview.week + '</span></div>' +
        '<div class="review-grid">' +
          '<div class="review-item"><span class="k">周均值</span><span class="v">' + (reviewPreview.avgCur == null ? '—' : fmt1(reviewPreview.avgCur) + ' kg') + '</span></div>' +
          '<div class="review-item"><span class="k">较上周</span><span class="v">' + fmtDelta(reviewPreview.delta) + '</span></div>' +
          '<div class="review-item"><span class="k">训练完成</span><span class="v">' + Math.round(reviewPreview.trainingRate * 100) + '%</span></div>' +
        '</div>' +
        '<div class="review-result">' +
          (existingReview
            ? '<p><strong>已生成：</strong>' + esc(existingReview.note) + '</p>' +
              (existingReview.changes && existingReview.changes.length ? '<p><strong>调整：</strong>' + esc(existingReview.changes.join('；')) + '</p>' : '')
            : latestReview
              ? '<p><strong>上次第 ' + latestReview.week + ' 周：</strong>' + esc(latestReview.note) + '</p><p>本周还没复盘。' + (reviewPreview.canGenerate ? '现在可以生成，目标会更新。' : '周日再来生成。') + '</p>'
              : '<p>还没有复盘记录。第一周只建立基线，不砍热量；周日晚上点一次，系统会按体重变化给下周目标。</p>') +
        '</div>' +
        '<div class="review-actions">' +
          '<button class="btn small sage" type="button" data-action="generateReview" ' + ((!reviewPreview.canGenerate || existingReview) ? 'disabled' : '') + '>' +
            (existingReview ? '第 ' + reviewPreview.week + ' 周已复盘' : reviewPreview.canGenerate ? '生成第 ' + reviewPreview.week + ' 周复盘' : '周日再复盘') + '</button>' +
          '<span class="tiny muted">' + (reviewPreview.canGenerate ? '会更新下周热量与步数' : '至少记录 3 次体重更准') + '</span>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><span class="kicker">TARGETS</span><h2 class="card-title">当前目标</h2>' +
          '<p class="card-sub">复盘会自动改；也可以手动微调。</p></div></div>' +
        '<div class="settings-grid">' +
          '<label>热量 kcal<input class="input" id="setCalories" type="number" inputmode="numeric" min="1200" max="2600" step="50" value="' + state.settings.calories + '"></label>' +
          '<label>蛋白 g<input class="input" id="setProtein" type="number" inputmode="numeric" min="80" max="180" step="5" value="' + state.settings.protein + '"></label>' +
          '<label>步数<input class="input" id="setSteps" type="number" inputmode="numeric" min="4000" max="20000" step="500" value="' + state.settings.steps + '"></label>' +
        '</div>' +
        '<div class="settings-actions">' +
          '<button class="btn small" type="button" data-action="saveSettings">保存目标</button>' +
          '<button class="btn small ghost" type="button" data-action="resetSettings">恢复推荐值</button>' +
        '</div>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><span class="kicker">INSTALL</span><h2 class="card-title">装到手机桌面</h2>' +
          '<p class="card-sub">装好后从桌面图标打开，不用每次找网址。</p></div></div>' +
        '<p class="tiny muted" style="margin:0 0 10px">Android Chrome：右上角菜单 →「安装应用」或「添加到主屏幕」。<br>iPhone Safari：底部分享按钮 →「添加到主屏幕」→ 添加。</p>' +
        '<p class="file-note">第一次打开后，训练和外卖会缓存到手机；之后没网也能看当天安排。体重记录仍只存在本机浏览器。</p>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><div><span class="kicker">BACKUP</span><h2 class="card-title">数据与备份</h2>' +
          '<p class="card-sub">数据只存在这台设备的浏览器里。</p></div></div>' +
        '<div class="data-tools">' +
          '<button class="btn small ghost" type="button" data-action="exportData">导出 JSON</button>' +
          '<button class="btn small ghost" type="button" data-action="importData">导入备份</button>' +
          '<button class="btn small ghost danger" type="button" data-action="resetData">清空记录</button>' +
        '</div>' +
        '<p class="file-note">换手机或清理浏览器前先导出。导入会覆盖当前记录；清空会恢复为起始 75kg。</p>' +
      '</section>';

    document.getElementById('view-data').innerHTML = html;
    requestAnimationFrame(drawWeightChart);
  }

  /* ---------------- review ---------------- */

  function buildReviewPreview() {
    const meta = currentMeta();
    let week = meta.weekNo;
    if (!meta.expired && meta.dayNo < 6 && week > 1) week = week - 1;
    let weights = getWeightsInWeek(week);
    if (week > 1 && weights.length < 2) {
      week = week - 1;
      weights = getWeightsInWeek(week);
    }
    const prevWeights = week > 1 ? getWeightsInWeek(week - 1) : [];
    const avgCur = averageOf(weights);
    const avgPrev = averageOf(prevWeights);
    const delta = avgCur != null && avgPrev != null ? avgCur - avgPrev : null;
    const training = trainingStats(week);
    const canGenerate = meta.expired || meta.weekNo > week || meta.dayNo >= 7;
    return {
      week: week,
      weekStart: addDays(state.startDate, (week - 1) * 7),
      weights: weights,
      avgCur: avgCur,
      avgPrev: avgPrev,
      delta: delta,
      trainingRate: training.rate,
      canGenerate: canGenerate
    };
  }

  function generateReview() {
    const p = buildReviewPreview();
    if (!p.canGenerate) {
      toast('建议周日再复盘，至少跑完 7 天');
      return;
    }
    if (state.reviews.some(function (r) { return Number(r.week) === p.week; })) {
      toast('第 ' + p.week + ' 周已经复盘过了');
      return;
    }
    if (p.avgCur == null) {
      toast('先记录一次体重再复盘');
      return;
    }

    const beforeCal = state.settings.calories;
    const beforeSteps = state.settings.steps;
    let calories = beforeCal;
    let steps = beforeSteps;
    let note = '';
    let changes = [];

    if (p.week === 1) {
      note = '第 1 周只建立基线：周均值 ' + fmt1(p.avgCur) + ' kg。先不砍热量，把 6 天出勤、外卖结构和 8000 步跑顺；第二周再看趋势。';
    } else if (p.trainingRate < 0.5) {
      steps = Math.max(6000, beforeSteps - 500);
      note = '本周训练完成率 ' + Math.round(p.trainingRate * 100) + '%，低于 50%。这周先不砍热量，把步数目标从 ' + beforeSteps + ' 降到 ' + steps + '，优先保住 6 天出勤。';
    } else if (p.delta == null) {
      note = '本周或上一周体重记录不足，暂不调整。每周至少记录 3 次空腹体重，周日再复盘。';
    } else if (p.delta <= -0.9) {
      calories = Math.min(2200, beforeCal + 150);
      steps = Math.max(6000, beforeSteps - 500);
      note = '近一周平均下降 ' + Math.abs(p.delta).toFixed(1) + ' kg，超过 0.9 kg/周，偏快。热量 ' + beforeCal + ' → ' + calories + '，步数 ' + beforeSteps + ' → ' + steps + '，避免掉肌肉和后续暴食。';
    } else if (p.delta >= -0.25) {
      calories = Math.max(1500, beforeCal - 100);
      steps = Math.min(12000, beforeSteps + 1000);
      note = '近一周平均' + (p.delta > 0 ? '上升 ' : '下降 ') + Math.abs(p.delta).toFixed(1) + ' kg，低于 0.25 kg/周。热量 ' + beforeCal + ' → ' + calories + '，步数 ' + beforeSteps + ' → ' + steps + '；先执行 7 天再看，不要一次砍太多。';
    } else {
      note = '近一周平均下降 ' + Math.abs(p.delta).toFixed(1) + ' kg，在 0.25–0.9 kg/周区间。维持 ' + calories + ' kcal 和 ' + steps + ' 步，继续观察腰围和照片。';
    }

    if (calories !== beforeCal) changes.push('热量 ' + beforeCal + ' → ' + calories + ' kcal');
    if (steps !== beforeSteps) changes.push('步数 ' + beforeSteps + ' → ' + steps);

    const review = {
      week: p.week,
      date: todayISO(),
      avgCur: p.avgCur,
      avgPrev: p.avgPrev,
      delta: p.delta,
      trainingRate: p.trainingRate,
      caloriesBefore: beforeCal,
      caloriesAfter: calories,
      stepsBefore: beforeSteps,
      stepsAfter: steps,
      note: note,
      changes: changes
    };
    state.reviews.push(review);
    state.reviews.sort(function (a, b) { return Number(a.week) - Number(b.week); });
    state.settings.calories = calories;
    state.settings.steps = steps;
    saveState();
    renderData();
    toast('第 ' + p.week + ' 周复盘已生成' + (changes.length ? '：' + changes.join('，') : '，维持当前目标'));
  }

  /* ---------------- chart ---------------- */

  function drawWeightChart() {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;
    const cssW = canvas.clientWidth || 300;
    const cssH = canvas.clientHeight || 176;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const data = sortedWeights().filter(function (w) {
      const d = diffDays(w.date, todayISO());
      return d >= 0 && d <= 29;
    });
    if (!data.length) return;

    const pad = { l: 8, r: 10, t: 16, b: 20 };
    const chartW = cssW - pad.l - pad.r;
    const chartH = cssH - pad.t - pad.b;
    const start = addDays(todayISO(), -29);
    const end = todayISO();
    const totalDays = Math.max(1, diffDays(start, end));

    let min = Math.min.apply(null, data.map(function (d) { return Number(d.kg); }));
    let max = Math.max.apply(null, data.map(function (d) { return Number(d.kg); }));
    let span = Math.max(1.2, max - min);
    min = min - span * 0.22;
    max = max + span * 0.22;

    function xFor(date) {
      const d = diffDays(start, date);
      return pad.l + (Math.max(0, Math.min(totalDays, d)) / totalDays) * chartW;
    }
    function yFor(kg) {
      return pad.t + ((max - kg) / (max - min)) * chartH;
    }

    ctx.strokeStyle = 'rgba(31, 43, 36, .08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad.t + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(cssW - pad.r, y);
      ctx.stroke();
    }

    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
    grad.addColorStop(0, 'rgba(98, 126, 91, .22)');
    grad.addColorStop(1, 'rgba(98, 126, 91, .01)');

    ctx.beginPath();
    data.forEach(function (d, i) {
      const x = xFor(d.date);
      const y = yFor(Number(d.kg));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (data.length > 1) {
      ctx.lineTo(xFor(data[data.length - 1].date), pad.t + chartH);
      ctx.lineTo(xFor(data[0].date), pad.t + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    data.forEach(function (d, i) {
      const x = xFor(d.date);
      const y = yFor(Number(d.kg));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#627e5b';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    data.forEach(function (d, i) {
      const x = xFor(d.date);
      const y = yFor(Number(d.kg));
      const last = i === data.length - 1;
      ctx.beginPath();
      ctx.arc(x, y, last ? 4.2 : 2.6, 0, Math.PI * 2);
      ctx.fillStyle = last ? '#405b3b' : '#fffdf8';
      ctx.fill();
      ctx.strokeStyle = '#627e5b';
      ctx.lineWidth = last ? 0 : 1.4;
      if (!last) ctx.stroke();
    });

    const lastPoint = data[data.length - 1];
    const lx = xFor(lastPoint.date);
    const ly = yFor(Number(lastPoint.kg));
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#405b3b';
    const label = fmt1(lastPoint.kg);
    const tw = ctx.measureText(label).width;
    const bx = Math.min(cssW - tw - 12, Math.max(4, lx - tw / 2 - 4));
    const by = Math.max(1, ly - 22);
    ctx.fillStyle = 'rgba(255, 253, 248, .92)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, tw + 8, 15, 5);
    } else {
      ctx.rect(bx, by, tw + 8, 15);
    }
    ctx.fill();
    ctx.fillStyle = '#405b3b';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + 4, by + 8);
  }

  /* ---------------- actions ---------------- */

  function saveWeight(button) {
    const input = document.querySelector(button.getAttribute('data-input') || '#weightInput');
    if (!input) return;
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 30 || value > 250) {
      toast('请输入 30–250 kg 的体重');
      input.focus();
      return;
    }
    const date = todayISO();
    const arr = state.logs.weights;
    const idx = arr.findIndex(function (w) { return w.date === date; });
    const entry = { date: date, kg: Math.round(value * 10) / 10, source: 'manual' };
    if (idx >= 0) arr[idx] = entry;
    else arr.push(entry);
    arr.sort(function (a, b) { return a.date.localeCompare(b.date); });
    saveState();
    renderAll();
    toast('已记录 ' + fmt1(entry.kg) + ' kg');
  }

  function saveWaist(button) {
    const input = document.querySelector(button.getAttribute('data-input') || '#dataWaistInput');
    if (!input) return;
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 40 || value > 200) {
      toast('请输入 40–200 cm 的腰围');
      input.focus();
      return;
    }
    const date = todayISO();
    const arr = state.logs.waist;
    const idx = arr.findIndex(function (w) { return w.date === date; });
    const entry = { date: date, cm: Math.round(value * 10) / 10 };
    if (idx >= 0) arr[idx] = entry;
    else arr.push(entry);
    arr.sort(function (a, b) { return a.date.localeCompare(b.date); });
    saveState();
    renderAll();
    toast('已记录腰围 ' + fmt1(entry.cm) + ' cm');
  }

  function saveSteps(input) {
    const value = Math.max(0, Math.min(50000, Math.round(Number(input.value) || 0)));
    const log = getDayLog(todayISO());
    log.steps = value;
    saveState();
    renderToday();
    toast('步数已记录');
  }

  function saveSettings() {
    const cal = document.getElementById('setCalories');
    const protein = document.getElementById('setProtein');
    const steps = document.getElementById('setSteps');
    if (!cal || !protein || !steps || !cal.value || !protein.value || !steps.value) {
      toast('三个目标都要填');
      return;
    }
    state.settings.calories = Math.round(clamp(cal.value, 1200, 2600));
    state.settings.protein = Math.round(clamp(protein.value, 80, 180));
    state.settings.steps = Math.round(clamp(steps.value, 4000, 20000));
    saveState();
    renderData();
    toast('目标已更新');
  }

  function resetSettings() {
    state.settings.calories = APP.baseCalories;
    state.settings.protein = APP.baseProtein;
    state.settings.steps = APP.baseSteps;
    saveState();
    renderData();
    toast('已恢复推荐目标');
  }

  function exportData() {
    const payload = Object.assign({}, state, { exportedAt: new Date().toISOString() });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thin-plan-' + todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('备份已导出');
  }

  function importData() {
    const file = document.getElementById('importFile');
    if (file) file.click();
  }

  function handleImportFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!window.confirm('导入会覆盖当前体重、围度、打卡和复盘。继续？')) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !isDateString(parsed.startDate) || !parsed.logs) throw new Error('bad file');
        state = normalizeState(parsed);
        saveState();
        renderAll();
        toast('备份已导入');
      } catch (err) {
        toast('导入失败：不是有效的备份文件');
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    if (!window.confirm('会清空体重、围度、打卡和复盘，恢复为起始 75kg。确定？')) return;
    state = createState();
    saveState();
    renderAll();
    toast('已清空，重新开始');
  }

  /* ---------------- events ---------------- */

  function bindEvents() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchView(tab.getAttribute('data-view'));
      });
    });

    const main = document.getElementById('main');
    main.addEventListener('click', function (event) {
      const nativeLink = event.target instanceof Element ? event.target.closest('a[href^="http"]') : null;
      if (nativeLink && isNativeApp()) {
        event.preventDefault();
        openVideo(nativeLink.href);
        return;
      }
      const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
      if (!target) return;
      const action = target.getAttribute('data-action');
      const date = todayISO();
      const log = getDayLog(date);

      if (action === 'saveWeight') {
        saveWeight(target);
      } else if (action === 'saveWaist') {
        saveWaist(target);
      } else if (action === 'toggleBlock') {
        const idx = Number(target.getAttribute('data-index'));
        log.blocks[idx] = !log.blocks[idx];
        saveState();
        renderToday();
        if (log.blocks.every(Boolean)) toast('训练完成，今天可以收工');
      } else if (action === 'completeWorkout') {
        log.blocks = log.blocks.map(function () { return true; });
        saveState();
        renderToday();
        toast('训练完成，今天可以收工');
      } else if (action === 'resetWorkout') {
        log.blocks = log.blocks.map(function () { return false; });
        saveState();
        renderToday();
        toast('已重置训练打卡');
      } else if (action === 'toggleMeal') {
        const meal = target.getAttribute('data-meal');
        if (MEAL_KEYS.indexOf(meal) !== -1) {
          log.meals[meal] = !log.meals[meal];
          saveState();
          renderToday();
        }
      } else if (action === 'water') {
        const n = Number(target.getAttribute('data-n'));
        log.water = log.water === n ? n - 1 : n;
        saveState();
        renderToday();
      } else if (action === 'togglePosture') {
        log.posture = !log.posture;
        saveState();
        renderToday();
        if (log.posture) toast('体态训练完成，5 分钟也算数');
      } else if (action === 'copy') {
        const text = target.getAttribute('data-copy') || '';
        copyText(text).then(function (ok) {
          toast(ok ? '点单话术已复制' : '复制失败，请长按文字手动复制');
        });
      } else if (action === 'goToday') {
        switchView('today');
      } else if (action === 'generateReview') {
        generateReview();
      } else if (action === 'deleteWeight') {
        const d = target.getAttribute('data-date');
        state.logs.weights = state.logs.weights.filter(function (w) { return w.date !== d; });
        saveState();
        renderAll();
        toast('已删除 ' + d + ' 的体重');
      } else if (action === 'deleteWaist') {
        const d = target.getAttribute('data-date');
        state.logs.waist = state.logs.waist.filter(function (w) { return w.date !== d; });
        saveState();
        renderAll();
        toast('已删除 ' + d + ' 的腰围');
      } else if (action === 'saveSettings') {
        saveSettings();
      } else if (action === 'resetSettings') {
        resetSettings();
      } else if (action === 'exportData') {
        exportData();
      } else if (action === 'importData') {
        importData();
      } else if (action === 'resetData') {
        resetData();
      }
    });

    main.addEventListener('change', function (event) {
      const input = event.target instanceof Element ? event.target.closest('[data-action="setSteps"]') : null;
      if (input) saveSteps(input);
    });

    const fileInput = document.getElementById('importFile');
    if (fileInput) fileInput.addEventListener('change', handleImportFile);

    window.addEventListener('resize', function () {
      if (currentView === 'data') requestAnimationFrame(drawWeightChart);
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && todayISO() !== activeDate) renderAll();
    });
  }

  /* ---------------- boot ---------------- */

  function init() {
    const hash = (location.hash || '').replace('#', '');
    currentView = VIEWS.indexOf(hash) !== -1 ? hash : 'today';
    bindEvents();
    renderAll();
    saveState();

    setInterval(function () {
      if (todayISO() !== activeDate) renderAll();
    }, 60000);

    if (!isNativeApp() && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* LAN HTTP 或文件协议下不可用 */ });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
