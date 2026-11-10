/* Shared client for the ESP8266 servo firmware (same endpoints as the built-in page).
   Themes only provide layout + CSS; every behaviour lives here.
   Endpoints: /status /servo /control /jog /stop /schedules /schedule/add /schedule/delete
   Point at a real board from anywhere with  ?esp=http://192.168.x.x  (the firmware sends CORS *). */
/*__MOTION__*/
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search);
  var BASE = (Q.get('esp') || '').replace(/\/$/, '');
  var DAYS = ['一', '二', '三', '四', '五', '六', '日'];
  var TURN_K = 1.4918;                       // firmware calibration factor for "turns" runs
  var UI_RELEASE = 'v1.3.3';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('cg.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('cg.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  var S = {
    demo: false, online: false, st: null, sch: [], schLoaded: false, sharing: store.get('sharing', false),
    cfg: Object.assign({ name: '重槌日安', lock: 180, release: 0, hold: 2, servo: 'cont', dir: 'cw', speed: 60, secs: 1.5, neutral: 1500 }, store.get('cfg', {})),
    pos: store.get('pos', 'locked'),
    log: store.get('log', []), armedUntil: 0, busy: ''
  };
  // Rename the previous default in existing browsers while preserving custom names.
  if (S.cfg.name === '右側窗簾') S.cfg.name = '重槌日安';
  // Release semantics are independent of legacy per-browser movement settings.
  S.cfg.servo = 'cont'; S.cfg.dir = 'cw';
  // Both actions share the release duration; older per-browser values cannot override it.
  S.cfg.secs = CurtainMotion.command().seconds;
  S.cfg.travelRevision = 3;
  store.set('cfg', S.cfg);
  var subs = [];

  /* shared control skin: themes only set --rc-bg --rc-fg --rc-acc --rc-onacc --rc-muted */
  (function () {
    var st = document.createElement('style');
    st.textContent =
      '.remote{display:flex;flex-direction:column;gap:20px}' +
      '.card.manual-disclosure{padding:0}.manual-disclosure>summary{display:flex;align-items:center;gap:12px;min-height:64px;padding:20px;list-style:none;cursor:pointer;user-select:none;font-size:16px;font-weight:600}.manual-disclosure>summary::-webkit-details-marker{display:none}.manual-disclosure>summary:after{content:"";width:8px;height:8px;border-right:2px solid var(--rc-muted);border-bottom:2px solid var(--rc-muted);transform:rotate(45deg);margin:0 4px 4px 0}.manual-disclosure[open]>summary:after{transform:rotate(225deg);margin-bottom:0}.manual-hint{margin-left:auto;font-size:12px;font-weight:400;color:var(--rc-muted)}.manual-disclosure[open] .manual-hint{visibility:hidden}.manual-disclosure>summary:focus-visible{outline:2px solid var(--rc-acc);outline-offset:-4px;border-radius:16px}.manual-body{padding:0 20px 20px}' +
      'body[data-share="1"] [data-private]{display:none!important}.share-only{display:none!important}body[data-share="1"] .share-only{display:inline!important}' +
      '.weather-auto{display:grid;gap:16px;margin-top:16px}.weather-location{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.weather-location .field{margin:0;min-width:0}.weather-location input{min-width:0;font-size:16px;font-variant-numeric:tabular-nums}' +
      '.weather-actions{display:flex;flex-wrap:wrap;gap:10px}.weather-actions .btn{font-size:13px;padding:10px 14px;min-height:42px}.weather-summary{padding:14px 16px;border-radius:14px;background:var(--rc-bg);line-height:1.6}.weather-summary strong{display:block;font-size:16px;font-weight:600}.weather-place{display:block;margin:3px 0 0;font-size:13px;color:var(--rc-muted)}.weather-meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:11px;color:var(--rc-muted)}' +
      'a.btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;min-height:44px}' +
      '.sharing-row{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:24px;padding-top:18px;border-top:1px solid color-mix(in srgb,currentColor 12%,transparent)}.sharing-row label{font-size:14px}.sharing-row p{margin:4px 0 0;font-size:12px;color:var(--rc-muted)}.sharing-toggle{position:relative;flex-shrink:0;width:46px;height:28px;padding:0;border:0;border-radius:99px;background:var(--rc-bg);cursor:pointer;transition:background .15s}.sharing-toggle:after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:var(--rc-fg);transition:transform .15s}.sharing-toggle[aria-checked="true"]{background:var(--rc-acc)}.sharing-toggle[aria-checked="true"]:after{background:var(--rc-onacc);transform:translateX(18px)}.sharing-toggle:focus-visible{outline:2px solid var(--rc-acc);outline-offset:3px}' +
      '.ui-version{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:24px;padding-top:16px;border-top:1px solid color-mix(in srgb,currentColor 12%,transparent);font-size:12px;opacity:.65}.ui-version code{font:11px ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.02em;white-space:nowrap}' +
      '.rc-pad{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}' +
      '.rc-hold{appearance:none;border:0;border-radius:50%;width:92px;height:92px;justify-self:center;background:var(--rc-bg,rgba(128,128,128,.16));color:var(--rc-fg,inherit);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;transition:transform .12s,background .15s,color .15s,box-shadow .2s}' +
      '.rc-hold svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
      '.rc-hold span{font-size:12px;opacity:.75;white-space:nowrap}' +
      '.rc-hold:active,.rc-hold.down{transform:scale(.94);background:var(--rc-acc,#007aff);color:var(--rc-onacc,#fff);box-shadow:0 0 0 8px color-mix(in srgb,var(--rc-acc,#007aff) 24%,transparent)}.rc-hold.down span,.rc-hold:active span{opacity:1}' +
      '.rc-hold:disabled{opacity:.4;pointer-events:none}' +
      '.rc-mid{text-align:center;line-height:1;min-width:64px}.rc-mid b{display:block;font-size:34px;font-weight:300;font-variant-numeric:tabular-nums;letter-spacing:-1px}.rc-mid small{display:block;font-size:11px;color:var(--rc-muted,#888);margin-top:6px;letter-spacing:.04em}' +
      '.rc-speed{display:flex;align-items:center;gap:12px;color:var(--rc-muted,#888);font-size:12px}.rc-speed input{flex:1;min-width:0}' +
      '.rc-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rc-row>label{min-width:46px;font-size:13px;color:var(--rc-muted,#888);margin:0}' +
      '.rc-seg{display:inline-flex;flex-wrap:wrap;background:var(--rc-bg,rgba(128,128,128,.16));border-radius:999px;padding:3px;gap:2px}' +
      '.rc-seg button{border:0;background:none;color:var(--rc-fg,inherit);padding:7px 14px;border-radius:999px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:6px;line-height:1.2;white-space:nowrap;transition:background .15s,color .15s}' +
      '.rc-seg button.on{background:var(--rc-acc,#007aff);color:var(--rc-onacc,#fff)}.rc-seg svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}' +
      '.rc-step{display:inline-flex;align-items:center;background:var(--rc-bg,rgba(128,128,128,.16));border-radius:999px;padding:3px}' +
      '.rc-step button{width:34px;height:34px;border:0;border-radius:50%;background:none;color:var(--rc-fg,inherit);font-size:20px;line-height:1;cursor:pointer}.rc-step button:active{background:rgba(128,128,128,.2)}' +
      '.rc-step output{min-width:58px;text-align:center;font-variant-numeric:tabular-nums;font-size:15px}' +
      '.rc-go{display:block;width:100%;border:0;border-radius:14px;background:var(--rc-acc,#007aff);color:var(--rc-onacc,#fff);padding:13px 24px;font-weight:600;font-size:15px;margin-top:-6px;cursor:pointer;transition:transform .12s,opacity .2s}.rc-go:active{transform:scale(.95)}.rc-go:disabled{opacity:.4;pointer-events:none}' +
      '.rc-pos{justify-content:space-between}' +
      '.rc-cap{font-size:12px;color:var(--rc-muted,#888);line-height:1.5;margin:0}';
    document.head.appendChild(st);
  })();
  function on(fn) { subs.push(fn); }
  function emit(what) { subs.forEach(function (f) { try { f(S, what); } catch (e) { console.error(e); } }); paint(); }


  /* ---------------------------------------------------------------- demo mode: in-page fake ESP (no board / no server needed) */
  var DEMO = Q.get('demo') === '1' || (location.protocol === 'file:' && !BASE);
  S.demo = DEMO;
  var sim = (function () {
    var D = { boot: Date.now(), output: 1500, attachedUntil: 0, running: false, mode: 'none', stopAt: 0,
      sch: store.get('demo.sch', [
        { enabled: true, days: 31, hour: 7, minute: 0, direction: 'cw', speed: 100, turns: 1.3, msrev: 1000 },
        { enabled: true, days: 96, hour: 8, minute: 30, direction: 'cw', speed: 100, turns: 1.3, msrev: 1000 }]), last: {} };
    Object.assign(D, store.get('demo.state', {}));
    function persist() { store.set('demo.state', { output: D.output, running: D.running, mode: D.mode, stopAt: D.stopAt, attachedUntil: D.attachedUntil }); }
    function lt() { var n = new Date(); return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()) + ' ' + pad(n.getHours()) + ':' + pad(n.getMinutes()) + ':' + pad(n.getSeconds()); }
    function num(v, d, lo, hi) { v = parseFloat(v); if (isNaN(v)) v = d; return Math.max(lo, Math.min(hi, v)); }
    function start(dir, speed, neutral, dur, mode) {
      neutral = Math.max(500, Math.min(2500, neutral)); D.neutral = neutral;
      var span = dir === 'cw' ? neutral - 500 : 2500 - neutral, off = Math.floor(span * speed / 100);
      D.output = Math.max(500, Math.min(2500, neutral + (dir === 'cw' ? -off : off)));
      D.running = true; D.mode = mode; D.stopAt = Date.now() + dur; D.attachedUntil = D.stopAt + 1000; persist();
    }
    function halt() { D.running = false; D.mode = 'none'; D.attachedUntil = 0; D.output = D.neutral || 1500; persist(); }
    setInterval(function () {
      if (D.running && Date.now() >= D.stopAt) halt();
      var n = new Date(), key = n.getFullYear() * 1000 + Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5);
      D.sch.forEach(function (it, i) {
        if (it.enabled && (it.days & (1 << ((n.getDay() + 6) % 7))) && it.hour === n.getHours() && it.minute === n.getMinutes() && D.last[i] !== key) {
          D.last[i] = key; if (!D.running) start(it.direction, it.speed, 1500, Math.min(21600000, it.turns * it.msrev * TURN_K), 'turns');
        }
      });
    }, 500);
    function save() { store.set('demo.sch', D.sch); }
    return function (path, q) {
      q = q || {};
      switch (path) {
        case '/status': return { wifiConnected: true, ip: '示範模式', rssi: -50, localTime: lt(), timeSynced: true, scheduleCount: D.sch.length,
          servoPwm: Date.now() < D.attachedUntil, uptimeSec: Math.floor((Date.now() - D.boot) / 1000), running: D.running, mode: D.mode,
          remainingMs: D.running ? Math.max(0, D.stopAt - Date.now()) : 0, output: D.output };
        case '/servo': if (q.angle == null) throw new Error('missing angle'); var a = Math.round(num(q.angle, 90, 0, 180)); halt(); D.output = 500 + Math.round(a * 1000 / 180); D.attachedUntil = Date.now() + 1500; persist(); return { angle: a };
        case '/control':
          var dir = q.direction === 'ccw' ? 'ccw' : 'cw', sp = Math.round(num(q.speed, 50, 1, 100)), ne = Math.round(num(q.neutral, 1500, 500, 2500)), dur, msg;
          if (q.mode === 'turns') { var t = num(q.turns, 1, .1, 1000), ms = num(q.msrev, 1200, 100, 60000); dur = t * ms * TURN_K; msg = '已啟動 ' + t.toFixed(1) + ' 圈，預計 ' + (dur / 1000).toFixed(1) + ' 秒'; }
          else if (q.mode === 'timed') { var sec = num(q.seconds, 5, .1, 21600); dur = sec * 1000; msg = '已啟動定時運轉，預計 ' + sec.toFixed(1) + ' 秒'; }
          else throw new Error('invalid mode');
          start(dir, sp, ne, Math.max(100, Math.min(21600000, dur)), q.mode); return { running: true, message: msg };
        case '/jog': start(q.direction === 'ccw' ? 'ccw' : 'cw', Math.round(num(q.speed, 50, 1, 100)), Math.round(num(q.neutral, 1500, 500, 2500)), 2000, 'jog'); return { running: true, mode: 'jog' };
        case '/stop': halt(); return { running: false, message: '已停止' };
        case '/schedules': return { timeSynced: true, localTime: lt(), items: D.sch.map(function (it, i) { return Object.assign({ id: i }, it); }) };
        case '/schedule/add':
          if (D.sch.length >= 8) throw new Error('最多只能建立 8 筆排程');
          D.sch.push({ enabled: true, days: Math.round(num(q.days, 1, 1, 127)), hour: Math.round(num(q.hour, 0, 0, 23)), minute: Math.round(num(q.minute, 0, 0, 59)),
            direction: q.direction === 'ccw' ? 'ccw' : 'cw', speed: Math.round(num(q.speed, 50, 1, 100)), turns: Math.round(num(q.turns, 1, .1, 1000) * 10) / 10, msrev: Math.round(num(q.msrev, 1200, 100, 60000)) });
          save(); return { ok: true };
        case '/schedule/delete':
          var id = Math.round(num(q.id, -1, -1, 99)); if (id < 0 || id >= D.sch.length) throw new Error('無效的排程 ID');
          D.sch.splice(id, 1); D.last = {}; save(); return { ok: true };
      }
      throw new Error('HTTP 404');
    };
  })();

  /* ---------------------------------------------------------------- transport */
  function call(path, params) {
    if (DEMO) { try { return Promise.resolve(JSON.parse(JSON.stringify(sim(path, params)))); } catch (e) { return Promise.reject(e); } }
    var u = BASE + path + (params ? '?' + new URLSearchParams(params).toString() : '');
    return fetch(u, { cache: 'no-store' }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }
  function poll() {
    return call('/status', { ts: Date.now() }).then(function (d) {
      var prev = S.st; S.st = d; S.online = !!d.wifiConnected; S.seen = true;
      if (d.running) S.runOut = d.output;
      if (prev && prev.running && !d.running && S.runOut && isCont() && (!S.cmdAt || Date.now() - S.cmdAt > 5000)) {   // a run we did not start (schedule): direction of the pulse tells what it did
        if (S.runOut !== S.cfg.neutral) setPos((S.runOut < S.cfg.neutral ? 'cw' : 'ccw') === S.cfg.dir ? 'released' : 'locked');
        S.runOut = 0;
      }
      emit('status');
    }).catch(function () {
      if (!DEMO && !BASE && !S.seen) { DEMO = true; S.demo = true; poll(); loadSchedules(); return; }   // nothing answered at startup -> demo mode
      S.online = false; emit('status');
    });
  }
  function loadSchedules() {
    return call('/schedules', { ts: Date.now() }).then(function (d) {
      S.sch = d.items || []; S.schLoaded = true; emit('sch');
    }).catch(function () { emit('sch'); });
  }

  /* ---------------------------------------------------------------- derived */
  function angleOf(us) { return Math.round((us - 500) / 1000 * 180); }
  function isCont() { return S.cfg.servo !== 'pos'; }
  function setPos(p) { if (S.pos !== p) { S.pos = p; store.set('pos', p); } }
  function dirRev(d) { return d === 'cw' ? 'ccw' : 'cw'; }
  function dirName(d) { return d === 'ccw' ? '逆時針' : '順時針'; }
  function scenePhase() { if (!S.online || !S.st) return 'offline'; return isCont() ? S.pos : phase(); }   // continuous servo: follow the commanded state at once, even while it is still turning
  function phase() {
    if (!S.online) return 'offline';
    var st = S.st; if (!st) return 'offline';
    if (st.running) return 'running';
    if (isCont()) return S.pos;
    if (st.output >= 500 && st.output <= 1500) {
      var a = angleOf(st.output);
      if (Math.abs(a - S.cfg.lock) <= 6) return 'locked';
      if (Math.abs(a - S.cfg.release) <= 6) return 'released';
    }
    return 'other';
  }
  var PHASE_LABEL = { locked: '已鎖住 · 待命', released: '已釋放', running: '運轉中', other: '位置自訂', offline: '未連線' };

  function parseLocal(s) {
    var m = /(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
  }
  function now() { return (S.st && S.st.timeSynced && parseLocal(S.st.localTime)) || new Date(); }
  function daysLabel(mask) {
    if (mask === 127) return '每天';
    if (mask === 31) return '週一至週五';
    if (mask === 96) return '週末';
    var out = []; for (var i = 0; i < 7; i++) if (mask & (1 << i)) out.push(DAYS[i]);
    return '週' + out.join('、');
  }
  function describe(it) {
    if (CurtainMotion.matches(it)) return { kind: 'curtainRelease' };
    if (CurtainMotion.matchesReset(it)) return { kind: 'curtainReset' };
    if (it.msrev === 1000 && isCont()) return { kind: 'legacy', dir: dirName(it.direction), speed: it.speed, hold: Math.round(it.turns * TURN_K * 10) / 10 };
    if (it.msrev === 1000 && it.direction === 'cw') {      // "release" entries: pulse target = angle, run time = hold
      return { kind: 'release', angle: Math.round((100 - it.speed) * 1.8), hold: Math.round(it.turns * TURN_K * 10) / 10 };
    }
    return { kind: 'rotate', dir: it.direction === 'ccw' ? '逆時針' : '順時針', turns: it.turns, speed: it.speed, msrev: it.msrev };
  }
  function describeText(it) {
    var d = describe(it);
    if (d.kind === 'curtainRelease') return CurtainMotion.label;
    if (d.kind === 'curtainReset') return '逆時針復歸';
    if (d.kind === 'legacy') return '既有動作 → ' + d.dir + ' ' + d.speed + '% · ' + d.hold + ' 秒';
    return d.kind === 'release' ? (d.act ? d.act + ' → ' + d.dir + ' ' + d.speed + '% · ' + d.hold + ' 秒' : '釋放 → ' + d.angle + '° · 保持 ' + d.hold + ' 秒')
      : '旋轉 ' + d.dir + ' ' + Number(d.turns).toFixed(1) + ' 圈 · 速度 ' + d.speed + '%';
  }
  function nextRun() {
    var n = now(), best = null;
    S.sch.forEach(function (it) {
      if (!it.enabled) return;
      for (var d = 0; d < 8; d++) {
        var t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + d, it.hour, it.minute, 0);
        if (!(it.days & (1 << ((t.getDay() + 6) % 7)))) continue;
        if (t <= n) continue;
        if (!best || t < best.t) best = { t: t, it: it, d: d };
        break;
      }
    });
    if (!best) return null;
    var mins = Math.round((best.t - n) / 60000), h = Math.floor(mins / 60);
    return {
      item: best.it, date: best.t, time: pad(best.it.hour) + ':' + pad(best.it.minute),
      when: best.d === 0 ? '今天' : best.d === 1 ? '明天' : '週' + DAYS[(best.t.getDay() + 6) % 7],
      left: h >= 24 ? Math.floor(h / 24) + ' 天 ' + (h % 24) + ' 小時' : h > 0 ? h + ' 小時 ' + (mins % 60) + ' 分' : mins + ' 分鐘'
    };
  }
  function uptime(sec) { var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h ? h + ' 時 ' + m + ' 分' : m + ' 分'; }

  /* ---------------------------------------------------------------- log */
  function log(msg) {
    var d = new Date();
    S.log.unshift({ t: pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()), m: msg });
    S.log = S.log.slice(0, 40); store.set('log', S.log); emit('log');
  }

  /* ---------------------------------------------------------------- actions */
  function toast(msg, bad) {
    var el = $('#toast'); if (!el) return;
    el.textContent = msg; el.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = 'toast'; }, 2400);
  }
  function guard(p, okMsg) {
    return p.then(function (r) { if (okMsg) toast(okMsg); return r; })
      .catch(function (e) { toast('失敗：' + e.message, true); log('失敗：' + e.message); throw e; });
  }
  function setAngle(a, quiet) {
    a = Math.max(0, Math.min(180, Math.round(a)));
    return call('/servo', { angle: a }).then(function () { if (!quiet) log('定位 ' + a + '°'); setTimeout(poll, 150); })
      .catch(function (e) { toast('連線失敗', true); });
  }
  function contMove(dir, label, pos) {
    S.cmdAt = Date.now();
    var seconds = CurtainMotion.command().seconds;
    log(label + '（' + dirName(dir) + ' ' + S.cfg.speed + '% × ' + seconds.toFixed(3) + ' 秒）');
    return call('/control', { mode: 'timed', direction: dir, speed: S.cfg.speed, seconds: seconds, neutral: S.cfg.neutral })
      .then(function () { setPos(pos); toast(pos === 'released' ? '已釋放' : '已復歸'); emit('pos'); setTimeout(poll, 150); })
      .catch(function (e) { toast('失敗：' + e.message, true); });
  }
  function release() {
    S.cmdAt = Date.now();
    return call('/control', CurtainMotion.command()).then(function () {
      setPos('released'); log(CurtainMotion.label); toast('已送出釋放指令'); emit('pos'); setTimeout(poll, 150);
    }).catch(function (e) { toast('失敗：' + e.message, true); });
  }
  function lock() { if (isCont()) return contMove(dirRev(S.cfg.dir), '復歸', 'locked'); log('復歸鎖住（' + S.cfg.lock + '°）'); toast('已復歸'); return setAngle(S.cfg.lock, true); }
  function run(o) {
    S.cmdAt = Date.now();
    var p = { mode: o.mode, direction: o.direction, speed: o.speed, neutral: o.neutral };
    if (o.mode === 'turns') { p.turns = o.turns; p.msrev = o.msrev; } else p.seconds = o.seconds;
    return guard(call('/control', p), null).then(function (d) { log(d.message); toast(d.message); setTimeout(poll, 150); });
  }
  function stop() { S.cmdAt = Date.now(); return call('/stop').then(function () { log('停止'); toast('已停止'); setTimeout(poll, 150); }).catch(function () { toast('停止失敗', true); }); }
  var jog = { on: false, dir: 'cw', timer: 0, getSpeed: null };
  function jogSend() {
    S.cmdAt = Date.now();
    var sp = jog.getSpeed ? jog.getSpeed() : S.cfg.speed;
    return call('/jog', { direction: jog.dir, speed: sp, neutral: $('#adv-neutral') ? $('#adv-neutral').value : S.cfg.neutral }).catch(function () { jogStop(); });
  }
  function jogStart(dir, getSpeed) { jog.getSpeed = getSpeed || null; jog.on = true; jog.dir = dir; clearInterval(jog.timer); jogSend(); jog.timer = setInterval(function () { if (jog.on) jogSend(); }, 500); }
  function jogStop() { if (!jog.on) return; jog.on = false; clearInterval(jog.timer); call('/stop').then(function () { setTimeout(poll, 150); }); }
  window.addEventListener('blur', jogStop);
  document.addEventListener('visibilitychange', function () { if (document.hidden) jogStop(); });

  function addSchedule(o) {
    var p;
    if (o.kind === 'release' && o.act !== 'lock') {
      p = Object.assign({ days: o.days, hour: o.hour, minute: o.minute }, CurtainMotion.schedule());
    } else if (o.kind === 'release' && isCont()) {
      p = Object.assign({ days: o.days, hour: o.hour, minute: o.minute }, CurtainMotion.resetSchedule(o.speed));
    } else if (o.kind === 'release') {
      var speed = Math.max(1, Math.min(100, Math.round(100 - o.angle / 1.8)));
      var turns = Math.max(0.1, Math.round(o.hold / TURN_K * 10) / 10);
      p = { days: o.days, hour: o.hour, minute: o.minute, direction: 'cw', turns: turns, speed: speed, msrev: 1000 };
    } else {
      p = { days: o.days, hour: o.hour, minute: o.minute, direction: o.direction, turns: o.turns, speed: o.speed, msrev: o.msrev };
    }
    return guard(call('/schedule/add', p), '排程已新增').then(function () { log('新增排程 ' + pad(o.hour) + ':' + pad(o.minute)); return loadSchedules(); });
  }
  function deleteSchedule(id) {
    return guard(call('/schedule/delete', { id: id }), '排程已刪除').then(function () { log('刪除排程 #' + id); return loadSchedules(); });
  }
  function saveCfg(patch) { Object.assign(S.cfg, patch, { secs: CurtainMotion.command().seconds }); store.set('cfg', S.cfg); emit('cfg'); }

  /* ---------------------------------------------------------------- bindings: [data-bind], [data-show] */
  var NAMES = {
    name: function () { return S.cfg.name; },
    uiVersion: function () { return UI_RELEASE + (window.CURTAIN_UI_VERSION ? ' · ' + window.CURTAIN_UI_VERSION.slice(0, 8) : ''); },
    phase: phase,
    phaseLabel: function () { return PHASE_LABEL[phase()]; },
    nextTime: function () { var n = nextRun(); return n ? n.time : '--:--'; },
    nextWhen: function () { var n = nextRun(); return n ? n.when : '無排程'; },
    nextLeft: function () { var n = nextRun(); return n ? '還有 ' + n.left : '尚未建立排程'; },
    nextDesc: function () { var n = nextRun(); return n ? describeText(n.item) + ' · ' + daysLabel(n.item.days) : '到「排程」新增一筆'; },
    ip: function () { return S.st ? S.st.ip : '—'; },
    rssi: function () { return S.st && S.online ? S.st.rssi + ' dBm' : '—'; },
    localTime: function () { return S.st ? (S.st.timeSynced ? S.st.localTime.slice(5, 16) : '尚未校時') : '—'; },
    uptime: function () { return S.st ? uptime(S.st.uptimeSec) : '—'; },
    pwm: function () { return S.st ? (S.st.servoPwm ? '輸出中' : '待機') : '—'; },
    count: function () { return S.sch.length + ' / 8'; },
    lock: function () { return isCont() ? dirName(dirRev(S.cfg.dir)) + ' ' + S.cfg.speed + '% · ' + S.cfg.secs + ' 秒' : S.cfg.lock + '°'; },
    release: function () { return CurtainMotion.label; },
    pulse: function () { return S.st ? S.st.output + ' µs' : '—'; },
    outside: function () { return typeof skyLabel === 'function' ? skyLabel() : '—'; },
    conn: function () { return S.demo ? '示範模式' : S.online ? '已連線' : '未連線'; }
  };
  function paint() {
    if (document.body) document.body.setAttribute('data-share', S.sharing ? '1' : '0');
    var p = phase();
    if (typeof sceneSync === 'function') sceneSync(scenePhase());
    $$('[data-phase-root]').forEach(function (el) { el.setAttribute('data-phase', p); el.setAttribute('data-online', S.online ? '1' : '0'); });
    $$('[data-bind]').forEach(function (el) {
      var f = NAMES[el.getAttribute('data-bind')]; if (!f) return;
      var v = f(); if (el.textContent !== String(v)) el.textContent = v;
    });
    $$('[data-show]').forEach(function (el) {                      // data-show="locked,released"
      el.hidden = el.getAttribute('data-show').split(',').indexOf(p) < 0;
    });
    var armed = S.armedUntil > Date.now();
    $$('[data-act="release"]').forEach(function (b) {
      b.classList.toggle('armed', armed);
      var l = b.querySelector('.lbl'); var t = armed ? '再按一次確認' : (b.getAttribute('data-label') || '釋放');
      if (l) { if (l.textContent !== t) l.textContent = t; } else if (b.textContent !== t) b.textContent = t;
    });
    $$('[data-online-only]').forEach(function (el) { el.disabled = !S.online; });
  }
  setInterval(function () { if (S.armedUntil && S.armedUntil < Date.now()) { S.armedUntil = 0; } paint(); }, 500);

  /* ---------------------------------------------------------------- components */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var C = {};
  var ICON = {
    cw: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.2h-4.2"/></svg>',
    ccw: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.2h4.2"/></svg>'
  };
  function holdBtn(id, dir, label) { return '<button class="rc-hold" id="' + id + '" data-online-only aria-label="按住 ' + label + '轉動">' + ICON[dir] + '<span>' + label + '</span></button>'; }
  function bindHold(b, dir, getSpeed) {
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (_) {} jogStart(dir, getSpeed); b.classList.add('down'); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { b.addEventListener(t, function (e) { e.preventDefault(); b.classList.remove('down'); jogStop(); }); });
  }
  C.release = function (el) {
    el.innerHTML = '<div class="rel">' +
      '<button class="btn primary big" data-act="release" data-online-only><span class="lbl">釋放</span></button>' +
      '<button class="btn" data-act="lock" data-online-only>復歸鎖住</button></div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'lock') { S.armedUntil = 0; lock(); }
      else if (S.armedUntil > Date.now()) { S.armedUntil = 0; release(); }
      else { S.armedUntil = Date.now() + 4000; }
      paint();
    });
  };
  C.manual = function (el) {
    var disclosure = el.closest('details.manual-disclosure');
    if (disclosure) disclosure.addEventListener('toggle', function () { if (!disclosure.open) jogStop(); });
    function manualPos() {
      el.innerHTML = '<div class="angle"><span class="big" id="m-val">' + S.cfg.lock + '</span><small>°</small></div>' +
        '<input id="m-angle" type="range" min="0" max="180" value="' + S.cfg.lock + '" aria-label="角度">' +
        '<div class="seg" role="group"><button class="btn" data-a="release">放開 <b data-bind="release"></b></button>' +
        '<button class="btn" data-a="90">90°</button><button class="btn" data-a="lock">鎖住 <b data-bind="lock"></b></button></div>' +
        '<p class="note">滑桿會直接驅動伺服；韌體 0–180 對應 500–1500 µs（SG90 約轉 90°）。</p>';
      var rng = $('#m-angle', el), val = $('#m-val', el), t;
      function show(a) { rng.value = a; val.textContent = a; }
      rng.addEventListener('input', function () { show(rng.value); clearTimeout(t); t = setTimeout(function () { setAngle(+rng.value); }, 80); });
      el.onclick = function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        var a = b.dataset.a === 'lock' ? S.cfg.lock : b.dataset.a === 'release' ? S.cfg.release : +b.dataset.a;
        show(a); setAngle(a);
      };
    }
    function syncPos() { $$('#mj-pos button', el).forEach(function (b) { b.classList.toggle('on', b.dataset.pos === S.pos); }); }
    function manualCont() {
      var dur = Math.max(0.5, Math.min(10, Math.round((S.cfg.secs || 1) * 2) / 2)), tdir = 'cw';
      el.innerHTML = '<div class="remote">' +
        '<div class="rc-pad">' + holdBtn('mj-ccw', 'ccw', '逆時針') + '<div class="rc-mid"><b id="mj-sv">' + S.cfg.speed + '</b><small>速度 %</small></div>' + holdBtn('mj-cw', 'cw', '順時針') + '</div>' +
        '<div class="rc-speed"><span>慢</span><input id="mj-speed" type="range" min="1" max="100" value="' + S.cfg.speed + '" aria-label="轉動速度"><span>快</span></div>' +
        '<div class="rc-row"><label>試轉</label><div class="rc-seg" id="mj-dir"><button data-d="ccw" aria-label="逆時針">' + ICON.ccw + '</button><button data-d="cw" class="on" aria-label="順時針">' + ICON.cw + '</button></div>' +
        '<div class="rc-step"><button data-s="-0.5" aria-label="減少">−</button><output id="mj-t">' + dur.toFixed(1) + ' 秒</output><button data-s="0.5" aria-label="增加">+</button></div>' +
        '</div><button class="rc-go" id="mj-go" data-online-only>開始試轉</button>' +
        '<div class="rc-row rc-pos"><label>目前位置</label><div class="rc-seg" id="mj-pos"><button data-pos="locked">已鎖住</button><button data-pos="released">已釋放</button></div></div>' +
        '<p class="rc-cap">馬達沒有位置回授，位置只依指令記錄；轉過頭時用「目前位置」校正。</p></div>';
      $('#mj-speed', el).oninput = function () { $('#mj-sv', el).textContent = this.value; };
      var sp = function () { return $('#mj-speed', el).value; };
      bindHold($('#mj-cw', el), 'cw', sp); bindHold($('#mj-ccw', el), 'ccw', sp);
      el.onclick = function (e) {
        var d = e.target.closest('#mj-dir [data-d]'), s = e.target.closest('.rc-step [data-s]'), p = e.target.closest('#mj-pos [data-pos]'), g = e.target.closest('#mj-go');
        if (d) { tdir = d.dataset.d; $$('#mj-dir button', el).forEach(function (x) { x.classList.toggle('on', x === d); }); }
        else if (s) { dur = Math.max(0.5, Math.min(10, dur + +s.dataset.s)); $('#mj-t', el).textContent = dur.toFixed(1) + ' 秒'; }
        else if (p) { setPos(p.dataset.pos); log('標記位置：' + (p.dataset.pos === 'locked' ? '已鎖住' : '已釋放')); emit('pos'); }
        else if (g) {
          S.cmdAt = Date.now();
          call('/control', { mode: 'timed', direction: tdir, speed: sp(), seconds: dur, neutral: S.cfg.neutral })
            .then(function (r) { log('試轉 ' + dirName(tdir) + ' ' + sp() + '% × ' + dur.toFixed(1) + ' 秒'); toast(r.message); setTimeout(poll, 150); })
            .catch(function (er) { toast('失敗：' + er.message, true); });
        }
      };
      syncPos();
    }
    function draw() { (isCont() ? manualCont : manualPos)(); }
    draw(); on(function (s, w) { if (w === 'cfg') draw(); if (w === 'pos' || w === 'status') syncPos(); });
  };
  C.cfg = function (el) {
    function draw() {
      var cont = isCont(), cf = S.cfg;
      el.innerHTML = '<div class="fields"><div class="field"><label>裝置名稱</label><input id="c-name" value="' + esc(cf.name) + '"></div>' +
        (cont
          ? '<div class="fields two"><div class="field"><label>復歸速度 %</label><input id="c-speed" type="number" min="1" max="100" value="' + cf.speed + '"></div>' +
            '<div class="field"><label>復歸時間</label><input id="c-secs" type="text" readonly value="與釋放同步"></div></div>' +
            '<div class="field"><label>復歸／手動控制停止脈寬 µs</label><input id="c-neutral" type="number" min="500" max="2500" step="10" value="' + cf.neutral + '"></div>'
          : '<div class="field"><label>鎖住角度（擺臂在配重下）</label><input id="c-lock" type="number" min="0" max="180" value="' + cf.lock + '"></div>' +
            '<div class="field"><label>釋放角度（擺臂移開）</label><input id="c-release" type="number" min="0" max="180" value="' + cf.release + '"></div>' +
            '<div class="field"><label>排程預設保持秒數</label><input id="c-hold" type="number" min="0.2" max="30" step="0.1" value="' + cf.hold + '"></div>') + '</div>' +
        '<div class="field"><label>插圖風格</label><div data-c="art"></div></div><div data-c="sky"></div><div data-c="styles"></div><div data-c="sharing"></div><div data-c="updates"></div>' +
        '<div class="ui-version"><span>介面版本</span><code data-bind="uiVersion"></code></div>';
      C.art($('[data-c="art"]', el)); C.sky($('[data-c="sky"]', el)); C.styles($('[data-c="styles"]', el));
      C.updates($('[data-c="updates"]', el));
      C.sharing($('[data-c="sharing"]', el));
    }
    draw();
    el.onchange = function (e) {
      var g = function (id) { var x = $(id, el); return x ? +x.value : null; }, p = { name: ($('#c-name', el).value || '重槌日安') };
      if (isCont()) { p.speed = Math.max(1, Math.min(100, g('#c-speed') || 60)); p.neutral = Math.max(500, Math.min(2500, g('#c-neutral') || 1500)); }
      else { p.lock = g('#c-lock'); p.release = g('#c-release'); p.hold = g('#c-hold') || 2; }
      saveCfg(p);
    };
  };
  C.advanced = function (el) {
    el.innerHTML =
      '<div class="fields two"><div class="field"><label>方向</label><select id="adv-dir"><option value="cw">順時針</option><option value="ccw">逆時針</option></select></div>' +
      '<div class="field"><label>速度 <b id="adv-sv">50</b>%</label><input id="adv-speed" type="range" min="1" max="100" value="50"></div></div>' +
      '<div class="field"><label>停止脈寬 µs（約 1500，可微調）</label><input id="adv-neutral" type="number" min="500" max="2500" step="10" value="1500"></div>' +
      '<div class="field"><label>運轉方式</label><select id="adv-mode"><option value="turns">自訂圈數</option><option value="timed">定時運轉</option></select></div>' +
      '<div id="adv-turns" class="fields two"><div class="field"><label>圈數</label><input id="adv-nturns" type="number" min="0.1" max="1000" step="0.1" value="1"></div>' +
      '<div class="field"><label>每圈毫秒</label><input id="adv-msrev" type="number" min="100" max="60000" step="50" value="1200"></div></div>' +
      '<div id="adv-timed" class="field" hidden><label>運轉秒數</label><input id="adv-sec" type="number" min="0.1" max="21600" step="0.1" value="5"></div>' +
      '<div class="rel two"><button class="btn primary" id="adv-run" data-online-only>開始運轉</button><button class="btn danger" id="adv-stop" data-online-only>停止</button></div>' +
      '<div class="rc-pad" style="margin-top:20px">' + holdBtn('adv-ccw', 'ccw', '逆時針') + '<div class="rc-mid"><b style="font-size:20px">按住</b><small>轉動</small></div>' + holdBtn('adv-cw', 'cw', '順時針') + '</div>' +
      '<p class="note">按住才會轉，放開立即停止（斷線 2 秒也會自動停）。圈數為時間估算，已套用校正倍率 1.49。</p>';
    $('#adv-speed', el).oninput = function () { $('#adv-sv', el).textContent = this.value; };
    $('#adv-mode', el).onchange = function () { var t = this.value === 'turns'; $('#adv-turns', el).hidden = !t; $('#adv-timed', el).hidden = t; };
    $('#adv-run', el).onclick = function () {
      var m = $('#adv-mode', el).value;
      run({ mode: m, direction: $('#adv-dir', el).value, speed: $('#adv-speed', el).value, neutral: $('#adv-neutral', el).value,
        turns: $('#adv-nturns', el).value, msrev: $('#adv-msrev', el).value, seconds: $('#adv-sec', el).value });
    };
    $('#adv-stop', el).onclick = stop;
    var asp = function () { return $('#adv-speed', el).value; };
    bindHold($('#adv-cw', el), 'cw', asp); bindHold($('#adv-ccw', el), 'ccw', asp);
  };
  C.schedules = function (el) {
    function render() {
      if (!S.schLoaded) { el.innerHTML = '<div class="empty">正在讀取排程…</div>'; return; }
      if (!S.sch.length) { el.innerHTML = '<div class="empty">目前沒有排程。按「新增排程」建立第一筆。</div>'; return; }
      el.innerHTML = '<ul class="list">' + S.sch.map(function (it) {
        return '<li class="item"><div class="t">' + pad(it.hour) + ':' + pad(it.minute) + '</div>' +
          '<div class="body"><div class="d">' + daysLabel(it.days) + '</div><div class="m">' + describeText(it) + '</div></div>' +
          '<button class="btn sm x" data-del="' + it.id + '" aria-label="刪除排程">刪除</button></li>';
      }).join('') + '</ul>';
    }
    render(); on(function (s, w) { if (w === 'sch') render(); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return;
      if (b.dataset.sure) { deleteSchedule(b.dataset.del); return; }
      b.dataset.sure = 1; b.textContent = '確定刪除？'; b.classList.add('danger');
      setTimeout(function () { if (b.isConnected) { delete b.dataset.sure; b.textContent = '刪除'; b.classList.remove('danger'); } }, 3000);
    });
  };
  C.scheduleForm = function (el) {
    var cont = isCont(), cf = S.cfg;
    var relHtml = cont
      ? '<div id="sf-rel"><div class="field"><label>動作</label><div class="rc-seg" id="sf-act"><button type="button" class="on" data-a="release">釋放 ' + ICON.cw + '</button><button type="button" data-a="lock">復歸 ' + ICON.ccw + '</button></div></div>' +
        '<p id="sf-release-info" class="note">順時針釋放窗簾</p>' +
        '<div id="sf-lock-options" class="fields two" hidden><div class="field"><label>復歸速度 %</label><input id="sf-rspeed" type="number" min="1" max="100" value="' + cf.speed + '"></div>' +
        '<div class="field"><label>復歸時間</label><input id="sf-hold" type="text" readonly value="與釋放同步"></div></div></div>'
      : '<div id="sf-rel" class="fields two"><div class="field"><label>釋放角度 °</label><input id="sf-angle" type="number" min="0" max="178" value="' + cf.release + '"></div>' +
        '<div class="field"><label>保持秒數</label><input id="sf-hold" type="number" min="0.2" max="30" step="0.1" value="' + cf.hold + '"></div></div>';
    el.innerHTML =
      '<div class="field"><label>動作</label><div class="rc-seg" id="sf-kind"><button type="button" class="on" data-k="release">' + (cont ? '釋放 / 復歸' : '釋放（窗簾）') + '</button><button type="button" data-k="rotate">旋轉（圈數）</button></div></div>' +
      '<div class="field"><label>星期</label><div class="chips" id="sf-days">' + DAYS.map(function (d, i) {
        return '<button type="button" class="chip' + (i < 5 ? ' on' : '') + '" data-bit="' + (1 << i) + '">' + d + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field"><label>時間（台灣 UTC+8）</label><input id="sf-time" type="time" value="07:00"></div>' + relHtml +
      '<div id="sf-rot" hidden><div class="fields two"><div class="field"><label>方向</label><select id="sf-dir"><option value="cw">順時針</option><option value="ccw">逆時針</option></select></div>' +
      '<div class="field"><label>速度 %</label><input id="sf-speed" type="number" min="1" max="100" value="50"></div></div>' +
      '<div class="fields two"><div class="field"><label>圈數</label><input id="sf-turns" type="number" min="0.1" max="1000" step="0.1" value="1"></div>' +
      '<div class="field"><label>每圈毫秒</label><input id="sf-msrev" type="number" min="100" max="60000" step="50" value="1200"></div></div></div>' +
      '<p class="note" id="sf-note">排程儲存在 ESP8266，最多 8 筆。</p>' +
      '<div class="rel two"><button type="button" class="btn primary" id="sf-ok">新增</button><button type="button" class="btn" id="sf-cancel">取消</button></div>';
    var kind = 'release', act = 'release';
    $('#sf-kind', el).addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return; kind = b.dataset.k;
      $$('#sf-kind button', el).forEach(function (x) { x.classList.toggle('on', x === b); });
      $('#sf-rel', el).hidden = kind !== 'release'; $('#sf-rot', el).hidden = kind !== 'rotate';
      $('#sf-note', el).hidden = kind !== 'release';
    });
    if (cont) $('#sf-act', el).addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return; act = b.dataset.a;
      $$('#sf-act button', el).forEach(function (x) { x.classList.toggle('on', x === b); });
      $('#sf-release-info', el).hidden = act !== 'release'; $('#sf-lock-options', el).hidden = act !== 'lock';
    });
    $('#sf-days', el).addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) b.classList.toggle('on'); });
    $('#sf-ok', el).onclick = function () {
      var days = 0; $$('#sf-days .chip.on', el).forEach(function (c) { days |= +c.dataset.bit; });
      if (!days) { toast('請至少選一天', true); return; }
      var t = ($('#sf-time', el).value || '07:00').split(':');
      var o = { kind: kind, days: days, hour: +t[0], minute: +t[1] };
      if (kind === 'release' && cont) { o.act = act; o.direction = act === 'release' ? 'cw' : 'ccw'; o.speed = +$('#sf-rspeed', el).value; o.hold = CurtainMotion.command().seconds; }
      else if (kind === 'release') { o.angle = +$('#sf-angle', el).value; o.hold = +$('#sf-hold', el).value; }
      else { o.direction = $('#sf-dir', el).value; o.speed = +$('#sf-speed', el).value; o.turns = +$('#sf-turns', el).value; o.msrev = +$('#sf-msrev', el).value; }
      addSchedule(o).then(function () { el.dispatchEvent(new CustomEvent('done', { bubbles: true })); }).catch(function () {});
    };
    $('#sf-cancel', el).onclick = function () { el.dispatchEvent(new CustomEvent('done', { bubbles: true })); };
  };
  C.activity = function (el) {
    function render() {
      el.innerHTML = S.log.length ? '<ul class="log">' + S.log.map(function (l) { return '<li><time>' + l.t + '</time><span>' + esc(l.m) + '</span></li>'; }).join('') + '</ul>'
        : '<div class="empty">還沒有操作紀錄（只記錄這個瀏覽器送出的指令）。</div>';
    }
    render(); on(function (s, w) { if (w === 'log') render(); });
  };
  C.system = function (el) {
    el.innerHTML = '<dl class="kv"><div><dt>連線</dt><dd data-bind="conn"></dd></div><div data-private><dt>IP</dt><dd data-bind="ip"></dd></div>' +
      '<div><dt>Wi‑Fi 訊號</dt><dd data-bind="rssi"></dd></div><div><dt>裝置時間</dt><dd data-bind="localTime"></dd></div>' +
      '<div><dt>運行時間</dt><dd data-bind="uptime"></dd></div><div><dt>伺服 PWM</dt><dd data-bind="pwm"></dd></div>' +
      '<div><dt>窗外</dt><dd data-bind="outside"></dd></div><div><dt>最後脈寬</dt><dd data-bind="pulse"></dd></div><div><dt>排程數</dt><dd data-bind="count"></dd></div><div><dt>網頁版本</dt><dd data-bind="uiVersion"></dd></div></dl>';
  };
  C.updates = function (el) {
    var previous;
    function draw() {
      var enabled = !!(S.st && S.st.otaEnabled);
      if (previous === enabled) return; previous = enabled;
      el.innerHTML = '<div class="field"><label>裝置更新</label>' + (enabled
        ? '<a class="btn" href="' + esc(BASE + '/update') + '" target="_blank" rel="noopener">無線更新韌體／網頁 ↗</a>'
        : '<p class="note">OTA 將在新韌體部署後啟用。</p>') + '</div>';
    }
    draw(); on(function (s, w) { if (w === 'status') draw(); });
  };
  C.sharing = function (el) {
    function draw() {
      el.innerHTML = '<div class="sharing-row"><div><label>分享模式</label><p>隱藏 IP 與天氣位置</p></div><button type="button" class="sharing-toggle" role="switch" aria-label="分享模式" aria-checked="' + (S.sharing ? 'true' : 'false') + '"></button></div>';
    }
    draw(); on(function (s, w) { if (w === 'sharing') draw(); });
    el.addEventListener('click', function (e) {
      if (!e.target.closest('.sharing-toggle')) return;
      S.sharing = !S.sharing; store.set('sharing', S.sharing); emit('sharing');
    });
  };
  C.toast = function (el) { el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); };

  /*__SCENE__*/

  function mount(root) {
    $$('[data-c]', root || document).forEach(function (el) { var f = C[el.getAttribute('data-c')]; if (f && !el.dataset.mounted) { el.dataset.mounted = 1; f(el); } });
    paint();
  }
  function tabs(root, onChange) {
    root = root || document;
    function go(name) {
      if (name !== 'home') $$('.manual-disclosure[open]', root).forEach(function (el) { el.open = false; });
      $$('[data-tab]', root).forEach(function (p) { p.hidden = p.getAttribute('data-tab') !== name; });
      $$('[data-tab-btn]', root).forEach(function (b) {
        var on = b.getAttribute('data-tab-btn') === name; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      store.set('tab', name); if (onChange) onChange(name);
    }
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-tab-btn]'); if (b) go(b.getAttribute('data-tab-btn')); });
    var first = store.get('tab', null); var names = $$('[data-tab-btn]', root).map(function (b) { return b.getAttribute('data-tab-btn'); });
    go(names.indexOf(first) >= 0 ? first : names[0]);
    return go;
  }
  function sheet(dlg) {                                      // <dialog> that hosts the schedule form
    var form = $('[data-c="scheduleForm"]', dlg);
    dlg.addEventListener('done', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    return function open() { form.dataset.mounted = ''; form.innerHTML = ''; C.scheduleForm(form); form.dataset.mounted = 1; dlg.showModal(); };
  }

  window.ESP = { S: S, on: on, mount: mount, tabs: tabs, sheet: sheet, call: call, poll: poll, setAngle: setAngle, release: release, lock: lock,
    stop: stop, setArt: setArt, loadSchedules: loadSchedules, nextRun: nextRun, phase: phase, daysLabel: daysLabel, describeText: describeText, toast: toast, $: $, $$: $$, pad: pad, BASE: BASE, paint: paint };

  poll(); loadSchedules();
  setInterval(poll, 2000); setInterval(loadSchedules, 30000);
})();
