/* FUMINOWA DESIGN — 冒頭ムービーと最初の画面（C案）
   時刻 t（秒）だけで全ての状態が決まる作り。?t=6.5 でその瞬間に止められる。 */
(() => {
  const V = document.body.dataset.v || 'a';
  const q = new URLSearchParams(location.search);
  const FIX = q.has('t') ? parseFloat(q.get('t')) : null;
  const SEEN_KEY = 'fuminowa_movie_seen';
  let seen = false;
  let played = false;   // 冒頭から実際に再生したか（飛ばした訪問は「見た」に数えない）
  try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}   // 同じタブの中だけ「見た」を覚える（新しく開いたときは、また流す）
  const N = 10000;
  const END = 12.6;          // ムービー約11秒＋最初の画面へ落ち着くまで
  const T_SITE = 11.0;       // ここから最初の画面へ

  const cv = document.getElementById('stage');
  const ctx = cv.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const elCount = $('mCount'), elLine1 = $('mLine1'), elEnd = $('mEnd');
  const elLogo = $('mLogo'), elLine2 = $('mLine2'), elBrand = $('mBrand');
  const mw = [$('mw1'), $('mw2'), $('mw3')];
  const elSite = $('site'), elSkip = $('skip'), elReplay = $('replay');

  // 色：0=文字色 1=青緑 2=黄 3=緑 4=白
  const COLORS = ['#323232', '#71A59B', '#F2B42A', '#9CBC4B', '#FFFFFF'];
  const LEVELS = [0.5, 0.72, 0.92];

  let W = 0, H = 0, DPR = 1;
  const F = () => new Float32Array(N);
  const hx = F(), hy = F(), wx = F(), wy = F(), rx = F(), ry = F();
  const ax = F(), ay = F(), as = F(), sz = F(), tr = F();
  const d1 = F(), d2 = F(), d3 = F(), ph = F(), pa = F(), pr = F();
  const cBase = new Uint8Array(N), cRing = new Uint8Array(N), cAmb = new Uint8Array(N), lv = new Uint8Array(N);
  let ring = { cx: 0, cy: 0, R: 0 };
  let mouse = { x: -9999, y: -9999 };

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const easeOut = (u) => 1 - Math.pow(1 - u, 3);
  const mobile = () => W < 768;

  function build() {
    // 隠れたタブでは幅が0になることがあるので、0のときは仮の大きさで準備する
    W = window.innerWidth || document.documentElement.clientWidth || 1280;
    H = window.innerHeight || document.documentElement.clientHeight || 800;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const r = rng(20261116);

    // 1) 画面いっぱいの点（中央の文字の場所は空ける）
    const ex = Math.min(W * 0.88, 760), eh = mobile() ? 210 : 190;
    const ex0 = (W - ex) / 2, ey0 = (H - eh) / 2;
    // 文字の場所は、ふちをぼかした楕円で空ける
    const inEx = (x, y) => {
      const dx = (x - W / 2) / (ex / 2), dy = (y - H / 2) / (eh / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      return d < 0.82 || (d < 1.25 && r() > (d - 0.82) / 0.43);
    };
    const s = Math.sqrt((W * H - ex * eh * 0.85) / N);
    const pts = [];
    for (let y = s / 2; y < H; y += s) {
      for (let x = s / 2; x < W; x += s) {
        const px = x + (r() - 0.5) * s * 0.9, py = y + (r() - 0.5) * s * 0.9;
        if (!inEx(px, py)) pts.push([px, py]);
      }
    }
    for (let i = pts.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    while (pts.length < N) {
      const px = r() * W, py = r() * H;
      if (!inEx(px, py)) pts.push([px, py]);
    }
    const maxD = Math.hypot(W / 2, H / 2);
    const keys = [];
    for (let i = 0; i < N; i++) {
      hx[i] = pts[i][0]; hy[i] = pts[i][1];
      keys.push([Math.hypot(hx[i] - W / 2, hy[i] - H / 2) / maxD * 0.45 + r(), i]);
      sz[i] = (0.8 + r() * 0.85) * (mobile() ? 0.62 : 1);
      const c = r();
      cBase[i] = c < 0.82 ? 0 : c < 0.88 ? 1 : c < 0.94 ? 2 : 3;
      lv[i] = (r() * 3) | 0;
      d1[i] = r() * 0.9; d2[i] = r() * 0.3; d3[i] = r() * 0.4; ph[i] = r() * Math.PI * 2;
    }
    keys.sort((a, b) => a[0] - b[0]);
    const LN = Math.log(N);
    keys.forEach((k, rank) => { tr[k[1]] = 0.12 + 2.68 * Math.log(rank + 1) / LN; });

    // 2) 骨組み（ページの設計図）
    const fw = mobile() ? W * 0.84 : Math.min(W * 0.5, 640), fh = fw * 0.68;
    const fx = (W - fw) / 2, fy = (H - fh) / 2;
    const segs = [];
    const line = (a, b, c, d) => segs.push([a, b, c, d]);
    const rect = (a, b, c, d) => { line(a, b, c, b); line(c, b, c, d); line(c, d, a, d); line(a, d, a, b); };
    rect(0, 0, 1, 1);
    line(0, 0.1, 1, 0.1);
    rect(0.04, 0.03, 0.1, 0.07);
    line(0.56, 0.05, 0.63, 0.05); line(0.66, 0.05, 0.73, 0.05); line(0.76, 0.05, 0.83, 0.05);
    rect(0.87, 0.03, 0.96, 0.07);
    rect(0.05, 0.16, 0.95, 0.58);
    line(0.1, 0.27, 0.5, 0.27); line(0.1, 0.275, 0.5, 0.275);
    line(0.1, 0.34, 0.42, 0.34); line(0.1, 0.345, 0.42, 0.345);
    line(0.1, 0.42, 0.36, 0.42);
    rect(0.1, 0.47, 0.26, 0.53);
    rect(0.58, 0.22, 0.9, 0.52); line(0.58, 0.22, 0.9, 0.52); line(0.9, 0.22, 0.58, 0.52);
    rect(0.05, 0.64, 0.33, 0.93); rect(0.36, 0.64, 0.64, 0.93); rect(0.67, 0.64, 0.95, 0.93);
    line(0.08, 0.86, 0.24, 0.86); line(0.39, 0.86, 0.55, 0.86); line(0.7, 0.86, 0.86, 0.86);
    const lens = segs.map((g) => Math.hypot((g[2] - g[0]) * fw, (g[3] - g[1]) * fh));
    const total = lens.reduce((a, b) => a + b, 0);
    let si = 0, acc = 0;
    for (let i = 0; i < N; i++) {
      const u = ((i + r()) / N) * total;
      while (si < segs.length - 1 && u > acc + lens[si]) { acc += lens[si]; si++; }
      const g = segs[si], k = clamp((u - acc) / lens[si]);
      wx[i] = fx + (g[0] + (g[2] - g[0]) * k) * fw + (r() - 0.5) * 1.1;
      wy[i] = fy + (g[1] + (g[3] - g[1]) * k) * fh + (r() - 0.5) * 1.1;
    }
    // 近い点が同じ線に固まらないよう、行き先を入れ替える
    for (let i = N - 1; i > 0; i--) {
      const j = (r() * (i + 1)) | 0;
      let t = wx[i]; wx[i] = wx[j]; wx[j] = t; t = wy[i]; wy[i] = wy[j]; wy[j] = t;
    }

    // 3) ロゴの3つの輪
    const Lw = Math.min(200, W * 0.42), sc = Lw / 999.98, Lh = 856.11 * sc;
    const Lx = (W - Lw) / 2, Ly = H * 0.5 - Lh * 0.95;
    elLogo.style.cssText = `left:${Lx}px;top:${Ly}px;width:${Lw}px;height:${Lh}px`;
    elEnd.style.setProperty('--line-top', (Ly + Lh + 30) + 'px');
    const rings = [[701.55, 115.02, 1], [874.71, 297.75, 3], [923.81, 549.75, 2]];
    for (let i = 0; i < N; i++) {
      const g = rings[i % 3], th = r() * Math.PI * 2, rad = (64.67 + (r() - 0.5) * 21) * sc;
      rx[i] = Lx + g[0] * sc + Math.cos(th) * rad;
      ry[i] = Ly + g[1] * sc + Math.sin(th) * rad;
      cRing[i] = g[2];
    }

    // 4) 最初の画面で落ち着く形（案ごと）
    if (V === 'a') {
      ring.cx = mobile() ? W * 0.5 : W * 0.72;
      ring.cy = mobile() ? Math.max(H * 0.8, 600) : H * 0.53;
      ring.R = mobile() ? Math.min(W * 0.3, H * 0.15) : Math.min(H * 0.33, W * 0.23);
      for (let i = 0; i < N; i++) {
        const g = (r() + r() + r() + r() - 2) / 2;       // 中央に寄る乱数
        pa[i] = r() * Math.PI * 2;
        pr[i] = ring.R * (1 + g * 0.2);
        as[i] = 1; cAmb[i] = cBase[i];
      }
      document.documentElement.style.setProperty('--rx', ring.cx + 'px');
      document.documentElement.style.setProperty('--ry', ring.cy + 'px');
    } else if (V === 'b') {
      const cols = Math.round(Math.sqrt(N * W / H)), rows = Math.ceil(N / cols);
      const gx = W / cols, gy = H / rows;
      const fxc = mobile() ? W * 0.9 : W * 0.76, fyc = mobile() ? H * 0.62 : H * 0.48;
      const reach = Math.max(W, H) * (mobile() ? 0.36 : 0.56);
      for (let i = 0; i < N; i++) {
        const c = i % cols, rw = (i / cols) | 0;
        ax[i] = c * gx + gx / 2; ay[i] = rw * gy + gy / 2;
        const f = clamp(1 - Math.hypot(ax[i] - fxc, ay[i] - fyc) / reach);
        as[i] = (mobile() ? 1.2 : 1.7) * Math.pow(f, 1.3); cAmb[i] = 1;
      }
    } else {
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const o = off.getContext('2d');
      const target = W * (mobile() ? 0.9 : 0.76);
      o.font = '600 100px Jost, "Helvetica Neue", Arial, sans-serif';
      o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillStyle = '#000';
      const m100 = o.measureText('10,000');
      let fs = 100 * target / m100.width;
      // 数字の上端・下端が、文字の中心から文字の大きさの何倍の所にあるかを測る
      const kAsc = (m100.actualBoundingBoxAscent || 55) / 100, kDesc = (m100.actualBoundingBoxDescent || 31) / 100;
      let ty = mobile() ? H * 0.27 : H * 0.34;
      // 画面が低いとき、見出しや下の文章の塊に数字がかからないよう、大きさと位置を合わせる
      const headEl = document.querySelector('.head'), copyEl = document.querySelector('.copy');
      if (headEl && copyEl) {
        const top = headEl.getBoundingClientRect().bottom + 10;
        const bottom = copyEl.getBoundingClientRect().top - 26;
        const avail = bottom - top;
        if (avail > 60) {
          const span = (kAsc + kDesc) * fs;
          if (span > avail) fs *= Math.max(0.5, avail / span);
          ty = Math.min(bottom - kDesc * fs, Math.max(top + kAsc * fs, ty));
        }
      }
      o.font = `600 ${fs}px Jost, "Helvetica Neue", Arial, sans-serif`;
      o.fillText('10,000', W / 2, ty);
      const y0 = Math.max(0, Math.floor(ty - fs)), y1 = Math.min(H, Math.ceil(ty + fs));
      const hh = Math.max(1, y1 - y0);
      const data = o.getImageData(0, y0, W, hh).data;
      const cand = [];
      for (let y = 0; y < hh; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) cand.push(x, y + y0);
      const m = cand.length / 2;
      for (let i = 0; i < N; i++) {
        const k = m ? ((r() * m) | 0) * 2 : 0;
        ax[i] = (m ? cand[k] : W / 2) + r() * 2; ay[i] = (m ? cand[k + 1] : ty) + r() * 2;
        as[i] = mobile() ? 0.7 : 1; cAmb[i] = cBase[i] === 0 ? 4 : cBase[i];
      }
    }
  }

  function draw(t, tA) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // 全体の濃さ：実績が出る間は薄く、ロゴに重なったら消え、最初の画面でまた現れる
    const GA = (1 - 0.86 * ramp(t, 7.4, 8.1)) + 0.86 * ramp(t, 8.9, 9.4)
      - ramp(t, 10.2, 10.7) + ramp(t, T_SITE + 0.1, T_SITE + 1.0) * (V === 'b' ? 0.62 : 0.95);
    if (GA <= 0.003) return;
    const mode = t < 8.6 ? 0 : t < 10.9 ? 1 : 2;
    const paths = [];
    for (let i = 0; i < 15; i++) paths.push(null);
    const breathe = t < 5.2 ? 1 : 0;
    const rot = tA * 0.02;
    for (let i = 0; i < N; i++) {
      const app = t - tr[i];
      if (app < 0) continue;
      let x = hx[i], y = hy[i], rad = sz[i];
      if (app < 0.3) rad *= 1 + 1.6 * (1 - app / 0.3);
      if (breathe) { x += Math.sin(t * 1.3 + ph[i]) * 1.4; y += Math.cos(t * 1.1 + ph[i]) * 1.4; }
      const u1 = ease(ramp(t, 5 + d1[i], 6.3 + d1[i]));
      if (u1 > 0) { x += (wx[i] - x) * u1; y += (wy[i] - y) * u1; }
      const u2 = ease(ramp(t, 9 + d2[i], 9.9 + d2[i]));
      if (u2 > 0) { x += (rx[i] - x) * u2; y += (ry[i] - y) * u2; rad *= 1 - 0.25 * u2; }
      const u3 = ease(ramp(t, T_SITE + d3[i], T_SITE + 1.1 + d3[i]));
      if (u3 > 0) {
        let tx, ty, f = as[i];
        if (V === 'a') {
          const th = pa[i] + rot * (pr[i] < ring.R ? 1 : -0.6);
          const rr = pr[i] + Math.sin(tA * 0.5 + ph[i]) * 3;
          tx = ring.cx + Math.cos(th) * rr; ty = ring.cy + Math.sin(th) * rr;
        } else if (V === 'b') {
          tx = ax[i]; ty = ay[i];
          f *= 1 + 0.3 * Math.sin(ax[i] * 0.012 + ay[i] * 0.006 - tA * 0.8);
        } else {
          tx = ax[i] + Math.sin(tA * 0.7 + ph[i]) * 0.8; ty = ay[i] + Math.cos(tA * 0.6 + ph[i]) * 0.8;
        }
        const dx = tx - mouse.x, dy = ty - mouse.y, dd = dx * dx + dy * dy;
        if (dd < 14400) { const k = (1 - Math.sqrt(dd) / 120); const p = k * k * 20 / (Math.sqrt(dd) + 0.01); tx += dx * p; ty += dy * p; }
        x += (tx - x) * u3; y += (ty - y) * u3;
        rad = sz[i] * (0.75 * (1 - u3) + f * u3);
      }
      if (rad < 0.12) continue;
      const c = mode === 0 ? cBase[i] : mode === 1 ? cRing[i] : cAmb[i];
      const b = c * 3 + lv[i];
      let p = paths[b];
      if (!p) p = paths[b] = new Path2D();
      p.moveTo(x + rad, y); p.arc(x, y, rad, 0, 6.2832);
    }
    for (let b = 0; b < 15; b++) {
      if (!paths[b]) continue;
      ctx.globalAlpha = clamp(GA) * LEVELS[b % 3];
      ctx.fillStyle = COLORS[(b / 3) | 0];
      ctx.fill(paths[b]);
    }
    ctx.globalAlpha = 1;
  }

  const fmt = (n) => n.toLocaleString('en-US');
  function dom(t) {
    // 数字
    const n = t < 0.12 ? 0 : Math.min(N, Math.max(1, Math.floor(Math.pow(N, (t - 0.12) / 2.68))));
    elCount.textContent = fmt(n);
    const co = ramp(t, 0.05, 0.3) * (1 - ramp(t, 3.0, 3.4));
    elCount.style.opacity = co;
    elCount.style.transform = `translate(-50%,-50%) scale(${1 + 0.04 * ramp(t, 3.0, 3.4)})`;
    // 1行目
    const l1 = ramp(t, 3.3, 3.9), l1o = ramp(t, 5.0, 5.4);
    elLine1.style.opacity = l1 * (1 - l1o);
    elLine1.style.transform = `translate(-50%,-50%) translateY(${(1 - easeOut(l1)) * 10 - l1o * 8}px)`;
    // 実績
    const out = ramp(t, 8.9, 9.3);
    const ins = [ramp(t, 7.3, 7.9), ramp(t, 7.8, 8.4), ramp(t, 7.95, 8.55)];
    mw.forEach((el, i) => {
      const a = easeOut(ins[i]);
      el.style.opacity = ins[i] * (1 - out);
      const sx = i === 0 ? 0 : (i === 1 ? -1 : 1) * (1 - a) * 36;
      el.style.setProperty('--tf', `translate(${sx}px, ${(1 - a) * 14 - out * 18}px) scale(${0.95 + 0.05 * a - 0.04 * out})`);
    });
    // 締め
    const eo = 1 - ramp(t, T_SITE, T_SITE + 0.4);
    elLogo.style.opacity = ramp(t, 10.1, 10.6) * eo;
    const l2 = ramp(t, 9.7, 10.3);
    elLine2.style.opacity = l2 * eo;
    elLine2.style.transform = `translateY(${(1 - easeOut(l2)) * 10}px)`;
    elBrand.style.opacity = ramp(t, 10.3, 10.8) * eo;
    // 最初の画面
    document.body.classList.toggle('fin', t >= T_SITE + 0.1);
    elSite.classList.toggle('on', t >= T_SITE + 0.45);
    elSkip.classList.toggle('hide', t >= T_SITE - 0.2);
    if (FIX !== null) {   // 書き出し用：止めた時刻でも、色と文字の登場を途中の状態で見せる
      const k = ramp(FIX, T_SITE + 0.1, T_SITE + 1.1);
      const mix = (a, c) => Math.round(a + (c - a) * k);
      document.body.style.backgroundColor = `rgb(${mix(255, 38)},${mix(255, 41)},${mix(255, 40)})`;
      document.querySelectorAll('#site .rv').forEach((el, i) => {
        const u = ramp(FIX, T_SITE + 0.45 + i * 0.14, T_SITE + 1.35 + i * 0.14);
        el.style.opacity = u; el.style.transform = `translateY(${(1 - easeOut(u)) * 14}px)`;
      });
    }
    document.body.classList.toggle('playing', t < T_SITE + 0.45);
    const done = t >= END;
    if (done && played && !document.body.classList.contains('done')) { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {} }
    document.body.classList.toggle('done', done);
  }

  let clock = 0, last = 0, raf = 0;
  function frame(now) {
    try {
      // 隠れていたタブが戻っても、ムービーが先へ飛ばないよう、1コマで進める時間に上限を付ける
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now; clock += dt;
      const el = clock;
      const t = Math.min(el, END);
      if (!(t >= END && window.scrollY > H)) draw(t, Math.max(0, el - T_SITE));
      dom(t);
      raf = requestAnimationFrame(frame);
    } catch (e) { fallback(); }
  }
  function play(from) {
    cancelAnimationFrame(raf);
    played = from < T_SITE;
    clock = from; last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // 万一、動きが使えない環境でも、最初の画面は必ず見せる（白い画面のまま止まらない）
  function fallback() {
    cancelAnimationFrame(raf);
    const b = document.body;
    b.classList.remove('playing'); b.classList.add('fin', 'done', 'nocanvas');
    elCount.textContent = '10,000';
    elSite.classList.add('on'); elSkip.classList.add('hide');
    document.querySelectorAll('#site .rv').forEach((e) => { e.style.opacity = 1; e.style.transform = 'none'; });
    cv.style.display = 'none';
  }

  function init() {
    try { build(); } catch (e) { fallback(); return; }
    if (FIX !== null) {
      document.body.classList.add('static');
      draw(Math.min(FIX, END), Math.max(0, FIX - T_SITE));
      dom(Math.min(FIX, END));
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    play(reduce || q.has('skip') || (seen && !q.has('movie')) ? END : 0);
  }

  elSkip.addEventListener('click', () => play(T_SITE - 0.05));
  elReplay.addEventListener('click', () => { window.scrollTo(0, 0); play(0); });
  window.addEventListener('pointermove', (e) => { mouse.x = e.pageX; mouse.y = e.pageY; });
  window.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  let rz = 0, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW && FIX === null) return;   // スマホのアドレスバーの出入りでは作り直さない
    lastW = window.innerWidth;
    clearTimeout(rz);
    rz = setTimeout(() => { try { build(); } catch (e) { return; } if (FIX !== null) { draw(Math.min(FIX, END), Math.max(0, FIX - T_SITE)); dom(Math.min(FIX, END)); } }, 120);
  });

  const fonts = document.fonts ? Promise.all([
    document.fonts.load('600 100px Jost'), document.fonts.load('300 100px Jost'), document.fonts.ready,
  ]) : Promise.resolve();
  Promise.race([fonts, new Promise((r) => setTimeout(r, 1800))]).then(init, init);
})();
