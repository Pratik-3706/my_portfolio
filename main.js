(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LOADED = Date.now();
  const BORN = new Date(2006, 6, 3);

  function age() {
    const now = new Date();
    let y = now.getFullYear() - BORN.getFullYear();
    const m = now.getMonth() - BORN.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < BORN.getDate())) y--;
    return y;
  }

  const days = () => Math.floor((Date.now() - BORN.getTime()) / 86400000);
  const onPage = () => Math.round((Date.now() - LOADED) / 1000) + 's';

  let statusTimer;
  function status(msg, ms) {
    const el = $('status');
    el.textContent = msg;
    el.setAttribute('data-on', '');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => el.removeAttribute('data-on'), ms || 3500);
  }

  function store(key, val) {
    try {
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) { /* private mode */ }
  }

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  // small maths for the stage

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fract = v => v - Math.floor(v);
  const tri = v => Math.abs(fract(v) * 2 - 1) * 2 - 1;
  const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  const ease = v => v * v * (3 - 2 * v);
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

  // s is the half-size per axis, a spins it about its own vertical
  function cuboid(g, c, s, alpha, isHot, a) {
    const ca = Math.cos(a || 0), sa = Math.sin(a || 0), v = [];
    for (let i = 0; i < 8; i++) {
      const x = i & 1 ? s[0] : -s[0], y = i & 2 ? s[1] : -s[1], z = i & 4 ? s[2] : -s[2];
      v.push([c[0] + x * ca + z * sa, c[1] + y, c[2] - x * sa + z * ca]);
    }
    EDGES.forEach(e => g.line(v[e[0]], v[e[1]], alpha, isHot));
  }

  // u and v are the half-extent vectors of the rectangle
  function rect(g, c, u, v, alpha, isHot) {
    g.path([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [
      c[0] + u[0] * i + v[0] * j, c[1] + u[1] * i + v[1] * j, c[2] + u[2] * i + v[2] * j
    ]), true, alpha, isHot);
  }

  function circle(g, c, r, alpha, isHot, plane, n) {
    const pts = [];
    n = n || 28;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n, p = Math.cos(a) * r, q = Math.sin(a) * r;
      pts.push(plane === 'xy' ? [c[0] + p, c[1] + q, c[2]]
        : plane === 'yz' ? [c[0], c[1] + p, c[2] + q]
        : [c[0] + p, c[1], c[2] + q]);
    }
    g.path(pts, true, alpha, isHot);
  }

  function diamond(g, c, r, alpha, isHot) {
    const v = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]]
      .map(o => [c[0] + o[0], c[1] + o[1], c[2] + o[2]]);
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        if ((i >> 1) !== (j >> 1)) g.line(v[i], v[j], alpha, isHot);
      }
    }
  }

  const APPLE = [
    '.......##...',
    '......##....',
    '..###.####..',
    '.##########.',
    '############',
    '############',
    '############',
    '############',
    '.##########.',
    '.##########.',
    '..########..',
    '...##..##...'
  ];

  // one exhibit per project, plus a few that aren't on the list

  const SCENES = {};

  SCENES.pk = (() => {
    const P = [[0, 0], [0, 5], [2.6, 5], [3.4, 4.2], [3.4, 2.8], [2.6, 2], [1, 2], [1, 0]];
    const HOLE = [[1, 3], [1, 4], [2.2, 4], [2.4, 3.8], [2.4, 3.2], [2.2, 3]];
    const K = [[0, 0], [0, 5], [1, 5], [1, 3.05], [2.55, 5], [3.8, 5], [1.95, 2.7], [3.9, 0],
      [2.65, 0], [1.3, 1.9], [1, 2.25], [1, 0]].map(([x, y]) => [x + 4.1, y]);
    const shapes = [P, HOLE, K].map(s => s.map(([x, y]) => [(x - 4) / 4.4, (y - 2.5) / 4.4]));
    const D = 0.17;

    return {
      draw(g) {
        shapes.forEach(s => {
          const front = s.map(([x, y]) => [x, y, -D]);
          const back = s.map(([x, y]) => [x, y, D]);
          g.path(back, true, 0.4);
          front.forEach((p, i) => g.line(p, back[i], 0.4));
          g.path(front, true, 1, true);
        });
      }
    };
  })();

  SCENES.norvexum = {
    draw(g, t) {
      const S = 0.7;
      cuboid(g, [0, 0, 0], [S, S, S], 0.32);
      diamond(g, [0, 0, 0], 0.08 + 0.02 * Math.sin(t * 4), 1, true);
      for (let i = 0; i < 7; i++) {
        const at = k => [
          tri(k * (0.31 + 0.2 * hash(i)) + hash(i + 10)) * (S - 0.05),
          tri(k * (0.27 + 0.2 * hash(i + 20)) + hash(i + 30)) * (S - 0.05),
          tri(k * (0.23 + 0.2 * hash(i + 40)) + hash(i + 50)) * (S - 0.05)
        ];
        let prev = at(t);
        g.line([0, 0, 0], prev, 0.12);
        g.dot(prev, 5, 1, true);
        for (let j = 1; j <= 10; j++) {
          const p = at(t - j * 0.03);
          g.line(prev, p, 1 - j / 10, true);
          prev = p;
        }
      }
    }
  };

  SCENES.swarm = {
    draw(g, t) {
      const nodes = [];
      diamond(g, [0, 0, 0], 0.13, 1, true);
      for (let i = 0; i < 6; i++) {
        const lean = (i % 3 - 1) * 0.55;
        const r = 0.68 + 0.16 * (i % 2);
        const a = t * (0.32 + 0.07 * (i % 3)) + i * TAU / 6;
        const p = [Math.cos(a) * r, Math.sin(a) * r * Math.sin(lean), Math.sin(a) * r * Math.cos(lean)];
        nodes.push(p);
        cuboid(g, p, [0.06, 0.06, 0.06], 0.9, false, a);
        g.line([0, 0, 0], p, 0.2);
        const u = fract(t * 0.55 + hash(i));
        g.dot(lerp(p, [0, 0, 0], i % 2 ? u : 1 - u), 4, 1, true);
      }
      nodes.forEach((p, i) => g.line(p, nodes[(i + 2) % 6], 0.1));
      for (let k = -1; k <= 1; k++) {
        const ring = [];
        for (let i = 0; i < 40; i++) {
          const a = i * TAU / 40;
          ring.push([Math.cos(a) * 0.76, Math.sin(a) * 0.76 * Math.sin(k * 0.55), Math.sin(a) * 0.76 * Math.cos(k * 0.55)]);
        }
        g.path(ring, true, 0.08);
      }
    }
  };

  SCENES.vivy = {
    sway: true,
    draw(g, t) {
      const X = -0.2, W = 0.38, H = 0.8, D = 0.035, F = -D - 0.002;
      cuboid(g, [X, 0, 0], [W, H, D], 0.6);
      rect(g, [X, 0, F], [W - 0.04, 0, 0], [0, H - 0.07, 0], 0.25);

      const step = Math.floor(t / 0.9), u = fract(t / 0.9);
      const target = Math.floor(hash(step) * 12);
      const last = Math.floor(hash(step - 1) * 12);
      const icon = i => [X + (i % 3 - 1) * 0.21, 0.4 - Math.floor(i / 3) * 0.25, F];
      const tapped = u > 0.45;

      for (let i = 0; i < 12; i++) {
        const lit = tapped && i === target;
        rect(g, icon(i), [0.065, 0, 0], [0, 0.065, 0], lit ? 1 : 0.3, lit);
      }

      const finger = lerp(icon(last), icon(target), ease(clamp(u / 0.45, 0, 1)));
      if (!tapped) finger[2] -= 0.07;
      g.dot(finger, 6, 1, true);
      if (tapped) circle(g, icon(target), (u - 0.45) * 0.3, 1 - (u - 0.45) / 0.55, true, 'xy', 20);

      const m = [0.62, 0.22 + 0.06 * Math.sin(t * 1.7), -0.12];
      cuboid(g, m, [0.1, 0.1, 0.1], 0.9, false, t * 0.9);
      g.dot(m, 5, 1, true);
    }
  };

  SCENES.metroika = {
    sway: true,
    draw(g, t) {
      const W = 0.46, H = 0.68, D = 0.26, F = -D - 0.002;
      const u = fract(t / 3.4);
      const scan = H - Math.min(u / 0.8, 1) * 2 * H;
      cuboid(g, [0, 0, 0], [W, H, D], 0.5);

      for (let i = 0; i < 7; i++) {
        const y = 0.52 - i * 0.13;
        g.line([-0.34, y, F], [-0.34 + 0.3 + 0.36 * hash(i + 3), y, F], y > scan ? 0.9 : 0.3, y > scan);
      }
      for (let i = 0; i < 24; i++) {
        if (hash(i + 50) < 0.3) continue;
        const x = -0.34 + 0.68 * i / 23;
        g.line([x, -0.58, F], [x, -0.42, F], scan < -0.5 ? 0.9 : 0.35, scan < -0.5);
      }

      if (u < 0.8) rect(g, [0, scan, 0], [W + 0.07, 0, 0], [0, 0, D + 0.07], 1, true);
      else {
        const a = clamp((u - 0.8) / 0.05, 0, 1);
        g.path([[0.62, 0, 0], [0.71, -0.11, 0], [0.9, 0.14, 0]], false, a, true);
      }
    }
  };

  SCENES.ignite = {
    draw(g, t) {
      const Y = -0.7;
      rect(g, [0, Y, 0], [0.3, 0, 0], [0, 0, 0.3], 0.55);
      rect(g, [0, Y, 0], [0.19, 0, 0], [0, 0, 0.19], 0.3);
      for (let i = -2; i <= 2; i++) {
        const o = i * 0.11;
        g.line([o, Y, 0.3], [o, Y, 0.4], 0.4);
        g.line([o, Y, -0.3], [o, Y, -0.4], 0.4);
        g.line([0.3, Y, o], [0.4, Y, o], 0.4);
        g.line([-0.3, Y, o], [-0.4, Y, o], 0.4);
      }
      for (let i = 0; i < 150; i++) {
        const u = fract(t * (0.3 + 0.3 * hash(i)) + hash(i + 100));
        const a = hash(i + 200) * TAU + t * 0.7 + u * 2.4;
        const r = (0.05 + 0.4 * hash(i + 300)) * Math.sin(Math.PI * Math.pow(u, 0.55)) * (1 - u * 0.5);
        const y = Y + 0.04 + u * 1.5;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        g.line([x, y, z], [x * 0.9, y + 0.07 + 0.1 * (1 - u), z * 0.9], 1 - u * 0.9, true);
      }
    }
  };

  // assets/badapple.bin.gz is the whole video at 48x36, one bit per pixel, each
  // frame XORed with the one before it and then gzipped. until it has loaded
  // (or if it can't), this shows a single apple.
  SCENES.badapple = (() => {
    const COLS = 48, ROWS = 36, BYTES = COLS * ROWS / 8, FPS = 30000 / 1001, G = 1.8 / COLS;
    let frames = null, count = 0, began = 0;
    let state = still ? 'off' : 'idle';

    async function load() {
      state = 'loading';
      try {
        const res = await fetch('assets/badapple.bin.gz');
        if (!res.ok) throw new Error(res.status);
        let buf = await res.arrayBuffer();
        const head = new Uint8Array(buf, 0, 2);
        if (head[0] === 0x1f && head[1] === 0x8b) {
          const unzipped = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
          buf = await new Response(unzipped).arrayBuffer();
        }
        const data = new Uint8Array(buf);
        for (let i = BYTES; i < data.length; i++) data[i] ^= data[i - BYTES];
        frames = data;
        count = Math.floor(data.length / BYTES);
        began = performance.now() / 1000;
        state = count ? 'ready' : 'off';
      } catch (e) {
        state = 'off';
      }
    }

    function apple(g, t) {
      const phase = Math.floor(t / 3) % 2;
      const edge = ease(clamp(fract(t / 3) / 0.25, 0, 1)) * 12;
      for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 12; c++) {
          const inverted = c < edge ? phase : 1 - phase;
          const lit = (APPLE[r][c] === '#') !== (inverted === 1);
          const x = (c - 5.5) * 0.13, y = (5.5 - r) * 0.13;
          if (lit) rect(g, [x, y, -0.1], [0.045, 0, 0], [0, 0.045, 0], 1, true);
          else g.dot([x, y, 0], 2, 0.5);
        }
      }
      rect(g, [0, 0, 0], [0.84, 0, 0], [0, 0.84, 0], 0.25);
    }

    return {
      sway: true,
      enter() {
        began = performance.now() / 1000;
        if (state === 'idle') load();
      },
      draw(g, t) {
        if (state !== 'ready') { apple(g, t); return; }
        const at = (Math.floor(Math.max(0, t - began) * FPS) % count) * BYTES;
        const size = G * g.unit * 0.8;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c;
            if (!(frames[at + (i >> 3)] & (0x80 >> (i & 7)))) continue;
            g.dot([(c - COLS / 2 + 0.5) * G, (ROWS / 2 - r - 0.5) * G, 0], size, 1, true);
          }
        }
        rect(g, [0, 0, 0], [0.93, 0, 0], [0, 0.705, 0], 0.3);
      }
    };
  })();

  SCENES.justanepoch = {
    draw(g, t) {
      const L = 4, N = 6;
      const node = (l, i) => {
        const a = i * TAU / N + l * 0.5;
        return [Math.cos(a) * 0.55, -0.66 + l * 0.44, Math.sin(a) * 0.55];
      };
      const step = Math.floor(t / 0.7), u = fract(t / 0.7);
      for (let l = 0; l < L; l++) {
        for (let i = 0; i < N; i++) {
          const p = node(l, i);
          diamond(g, p, 0.035, 0.85);
          if (l === L - 1) continue;
          for (let j = 0; j < N; j++) {
            const q = node(l + 1, j);
            const on = hash(step * 7.3 + l * 31 + i * 5 + j * 13) > 0.9;
            g.line(p, q, on ? 0.9 : 0.07, on);
            if (on) g.dot(lerp(p, q, u), 4, 1, true);
          }
        }
      }
    }
  };

  SCENES.obsidian = {
    draw(g, t) {
      rect(g, [0, 0, 0], [0, 0.46, 0], [0, 0, 0.62], 1, true);
      rect(g, [0, 0, 0], [0, 0.52, 0], [0, 0, 0.68], 0.4, true);
      g.line([-1.05, 0, 0], [1.05, 0, 0], 0.12);
      for (let i = 0; i < 10; i++) {
        const x = fract(t * 0.14 + i / 10) * 2.1 - 1.05;
        const k = x < 0 ? 1 : 0.45;
        const a = Math.min(1, (1 - Math.abs(x) / 1.05) * 4);
        rect(g, [x, 0, 0], [0, 0.28 * k, 0], [0, 0, 0.5 * k], a * (x < 0 ? 0.55 : 1), x >= 0);
      }
    }
  };

  // re:zero. the hands only go backwards.
  SCENES.rezero = {
    sway: true,
    draw(g, t) {
      const R = 0.8, D = 0.14, top = Math.PI / 2;
      circle(g, [0, 0, 0], R, 1, true, 'xy', 48);
      circle(g, [0, 0, 0], R + 0.07, 0.35, false, 'xy', 48);
      circle(g, [0, 0, D], R, 0.25, false, 'xy', 48);
      for (let i = 0; i < 12; i++) {
        const c = Math.cos(i * TAU / 12), s = Math.sin(i * TAU / 12);
        g.line([c * (R - 0.13), s * (R - 0.13), 0], [c * (R - 0.04), s * (R - 0.04), 0], i % 3 ? 0.5 : 1, i % 3 === 0);
        g.line([c * R, s * R, 0], [c * R, s * R, D], 0.2);
      }
      const hand = (a, len, alpha) => g.line([0, 0, -0.03], [Math.cos(top + a) * len, Math.sin(top + a) * len, -0.03], alpha, true);
      const m = t * 1.7;
      for (let j = 6; j >= 1; j--) hand(m - j * 0.1, 0.62, 0.5 * (1 - j / 7));
      hand(m, 0.62, 1);
      hand(m / 12, 0.4, 1);
      diamond(g, [0, 0, -0.03], 0.05, 1, true);
    }
  };

  // doraemon. the anywhere door, and a take-copter with nobody under it.
  SCENES.doraemon = {
    sway: true,
    draw(g, t) {
      const W = 0.4, H = 0.78;
      rect(g, [0, 0, 0], [W + 0.07, 0, 0], [0, H + 0.07, 0], 0.6);
      rect(g, [0, 0, 0], [W, 0, 0], [0, H, 0], 0.6);
      rect(g, [0, 0, 0.08], [W + 0.07, 0, 0], [0, H + 0.07, 0], 0.25);

      for (let i = 0; i < 26; i++) {
        const p = [(hash(i) * 2 - 1) * W * 0.9, (hash(i + 40) * 2 - 1) * H * 0.9, 0.25 + hash(i + 80) * 1.1];
        g.dot(p, 2.5, 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i)), false);
      }

      const a = (0.5 - 0.5 * Math.cos(t * 0.9)) * 1.9;
      const at = (k, y) => [-W + 2 * W * k * Math.cos(a), y, -2 * W * k * Math.sin(a)];
      g.path([at(0, -H), at(0, H), at(1, H), at(1, -H)], true, 1, true);
      g.path([at(0.14, -H + 0.12), at(0.14, H - 0.12), at(0.86, H - 0.12), at(0.86, -H + 0.12)], true, 0.45, true);
      g.dot(at(0.86, -0.04), 6, 1, true);

      const c = [0.78, 0.3 + 0.07 * Math.sin(t * 1.6), -0.25], s = t * 14;
      g.line(c, [c[0], c[1] - 0.13, c[2]], 0.9);
      g.line([c[0] - 0.15 * Math.cos(s), c[1], c[2] - 0.15 * Math.sin(s)], [c[0] + 0.15 * Math.cos(s), c[1], c[2] + 0.15 * Math.sin(s)], 0.9);
      circle(g, c, 0.15, 0.15, false, 'xz', 20);
    }
  };

  // to your eternity. an orb at first, then the shape of the last thing it met.
  let met = 'pk';

  SCENES.fushi = (() => {
    const shrink = (p, k) => [p[0] * k, p[1] * k, p[2] * k];

    function scaled(g, k) {
      const s = {
        unit: g.unit * k,
        line: (a, b, alpha, isHot) => g.line(shrink(a, k), shrink(b, k), alpha * k, isHot),
        dot: (p, size, alpha, isHot) => g.dot(shrink(p, k), size * k, alpha * k, isHot),
        path(pts, closed, alpha, isHot) {
          for (let i = 0; i < pts.length - 1; i++) s.line(pts[i], pts[i + 1], alpha, isHot);
          if (closed) s.line(pts[pts.length - 1], pts[0], alpha, isHot);
        }
      };
      return s;
    }

    function orb(g, t) {
      const r = 0.52 + 0.02 * Math.sin(t * 2);
      for (let i = -2; i <= 2; i++) {
        const lat = i * 0.5;
        circle(g, [0, Math.sin(lat) * r, 0], Math.cos(lat) * r, i ? 0.45 : 1, i === 0, 'xz', 32);
      }
      for (let m = 0; m < 6; m++) {
        const a = m * Math.PI / 6, ring = [];
        for (let i = 0; i < 32; i++) {
          const b = i * TAU / 32;
          ring.push([Math.cos(b) * r * Math.cos(a), Math.sin(b) * r, Math.cos(b) * r * Math.sin(a)]);
        }
        g.path(ring, true, 0.35);
      }
    }

    return {
      draw(g, t) {
        const u = fract(t / 7);
        const k = u < 0.4 ? 0 : u < 0.5 ? ease((u - 0.4) / 0.1) : u < 0.9 ? 1 : 1 - ease((u - 0.9) / 0.1);
        if (k < 1) orb(scaled(g, 1 - k), t);
        if (k > 0) SCENES[met].draw(scaled(g, k), t);
      }
    };
  })();

  SCENES.water = {
    floor: false,
    draw(g, t) {
      const N = 20, G = 1.6 / N;
      const pt = (i, j) => {
        const x = (i - N / 2) * G, z = (j - N / 2) * G;
        const d1 = Math.hypot(x - 0.3, z + 0.2), d2 = Math.hypot(x + 0.45, z - 0.4);
        const y = 0.1 * Math.sin(9 * d1 - 2.6 * t) / (1 + 2 * d1) + 0.07 * Math.sin(11 * d2 - 3.1 * t) / (1 + 2 * d2);
        return [x, y - 0.2, z];
      };
      for (let i = 0; i <= N; i++) {
        for (let j = 0; j < N; j++) {
          g.line(pt(i, j), pt(i, j + 1), 0.55, i % 2 === 0);
          g.line(pt(j, i), pt(j + 1, i), 0.3);
        }
      }
    }
  };

  // name, caption, colour. the first eight are the list on the page.

  const ORDER = ['norvexum', 'swarm', 'vivy', 'metroika', 'ignite', 'badapple', 'justanepoch', 'obsidian'];
  const META = {
    pk: ['pk', 'drag it. click it for the next one.', null],
    norvexum: ['norvexum', 'seven tool calls at once, none leaving the box', '#ff6b35'],
    swarm: ['swarm-mcp', 'workers pick up tasks and report to the middle', '#5dff9b'],
    vivy: ['vivy', 'it taps so you don\'t have to. the cube is matsumoto.', '#4de1ff'],
    metroika: ['metroika', 'scan the label, check it against the rules', '#ffc531'],
    ignite: ['ignite_bot', 'a whole bot on 512 mb of ram', '#ff3d5a'],
    badapple: ['badapple_nn', 'bad apple, at one bit per pixel', null],
    justanepoch: ['justanepoch', 'attention, passing tokens up the stack', '#b18cff'],
    obsidian: ['obsidian codec', 'big frames in, small frames out', '#ff7ae0'],
    rezero: ['return by death', 'the clock only runs one way here', '#8ab6ff'],
    doraemon: ['anywhere door', 'click it. it goes somewhere.', '#ff8fc0'],
    fushi: ['fushi', 'an orb at first. then whatever it last met.', null],
    water: ['fontaine', 'all the world\'s a stage', null]
  };

  // the renderer: points and lines, rotated, projected, drawn. that's all of it.

  const stage = (() => {
    const box = $('stage');
    const canvas = $('scene');
    const ctx = canvas.getContext('2d');
    const CAM = 3.4;

    let w = 0, h = 0, R = 1, mix = 1;
    let yaw = -0.45, pitch = -0.3, vYaw = 0, vPitch = 0;
    let tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;
    let cosY = 1, sinY = 0, cosP = 1, sinP = 0;
    let wire = '#fff', hot = '#fff';
    let current = 'pk', since = 0, raf = 0, drag = null;
    const api = { onClick: null };

    function proj(p) {
      const x = p[0] * cosY + p[2] * sinY;
      const z0 = p[2] * cosY - p[0] * sinY;
      const y = p[1] * cosP - z0 * sinP;
      const z = p[1] * sinP + z0 * cosP;
      const s = CAM / (CAM + z);
      return [w / 2 + x * s * R, h / 2 - y * s * R, z];
    }

    const fade = z => clamp(1 - (z + 1.1) / 2.2 * 0.72, 0.25, 1);

    const g = {
      line(a, b, alpha, isHot) {
        const p = proj(a), q = proj(b);
        const al = Math.min(1, alpha * fade((p[2] + q[2]) / 2) * mix);
        if (al < 0.012) return;
        ctx.strokeStyle = isHot ? hot : wire;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        if (isHot) {
          ctx.globalAlpha = al * 0.2;
          ctx.lineWidth = 4.5;
          ctx.stroke();
        }
        ctx.globalAlpha = al;
        ctx.lineWidth = isHot ? 1.5 : 1;
        ctx.stroke();
      },
      path(pts, closed, alpha, isHot) {
        for (let i = 0; i < pts.length - 1; i++) g.line(pts[i], pts[i + 1], alpha, isHot);
        if (closed) g.line(pts[pts.length - 1], pts[0], alpha, isHot);
      },
      dot(p, size, alpha, isHot) {
        const q = proj(p);
        const s = size * CAM / (CAM + q[2]);
        ctx.globalAlpha = Math.min(1, alpha * fade(q[2]) * mix);
        ctx.fillStyle = isHot ? hot : wire;
        ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      }
    };

    function frame(now) {
      raf = 0;
      const scene = SCENES[current];
      const t = still ? 2.4 : now / 1000;

      if (!drag) {
        yaw += vYaw;
        pitch += vPitch;
        vYaw *= 0.94;
        vPitch *= 0.94;
      }
      pitch = clamp(pitch, -1.2, 1.2);
      tiltX += (aimX - tiltX) * 0.06;
      tiltY += (aimY - tiltY) * 0.06;

      const turn = still ? 0 : scene.sway ? Math.sin(t * 0.5) * 0.55 + 0.45 : t * 0.3;
      cosY = Math.cos(yaw + tiltX + turn);
      sinY = Math.sin(yaw + tiltX + turn);
      cosP = Math.cos(pitch + tiltY);
      sinP = Math.sin(pitch + tiltY);

      mix = still ? 1 : ease(clamp((now - since) / 420, 0, 1));
      R = Math.min(w, h) * 0.43 * (0.84 + 0.16 * mix);
      g.unit = R;

      const css = getComputedStyle(box);
      hot = css.color;
      wire = css.getPropertyValue('--ink').trim();

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = css.getPropertyValue('--blend').trim() || 'source-over';
      ctx.lineCap = 'round';

      if (scene.floor !== false) {
        for (let i = -4; i <= 4; i++) {
          g.line([i * 0.25, -0.88, -1], [i * 0.25, -0.88, 1], 0.09);
          g.line([-1, -0.88, i * 0.25], [1, -0.88, i * 0.25], 0.09);
        }
      }
      scene.draw(g, t);
      ctx.globalAlpha = 1;

      if (!still && !document.hidden) raf = requestAnimationFrame(frame);
    }

    function run() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      run();
    }

    canvas.addEventListener('pointerdown', e => {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      vYaw = vPitch = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    });

    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      vYaw = -dx * 0.008;
      vPitch = -dy * 0.008;
      yaw += vYaw;
      pitch += vPitch;
      run();
    });

    function release(e) {
      if (!drag) return;
      const tapped = drag.moved < 6 && e.type === 'pointerup';
      drag = null;
      if (tapped && api.onClick) api.onClick();
    }

    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    window.addEventListener('pointermove', e => {
      aimX = (e.clientX / window.innerWidth - 0.5) * -0.5;
      aimY = (e.clientY / window.innerHeight - 0.5) * -0.3;
    }, { passive: true });

    document.addEventListener('visibilitychange', run);
    new ResizeObserver(resize).observe(canvas);
    resize();

    api.run = run;
    api.set = key => {
      if (key === current) return;
      if (SCENES[current].leave) SCENES[current].leave();
      current = key;
      if (SCENES[key].enter) SCENES[key].enter();
      since = performance.now();
      run();
    };
    return api;
  })();

  // which exhibit is up: the row under the pointer, then anything pinned, then
  // whichever row is in the middle of the screen

  const rows = Array.from(document.querySelectorAll('.projects a'));
  const narrow = window.matchMedia('(max-width: 60rem)');
  let hovered = null, pinned = null, pinTimer, showing = null;
  let palette = '';

  function scramble(el, text) {
    clearInterval(el.timer);
    if (still) { el.textContent = text; return; }
    const glyphs = '/\\_-+=<>[]01';
    const start = performance.now();
    el.timer = setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / 260);
      const keep = Math.floor(text.length * k);
      el.textContent = text.slice(0, keep) + text.slice(keep).replace(/\S/g, () => glyphs[(Math.random() * glyphs.length) | 0]);
      if (k === 1) clearInterval(el.timer);
    }, 30);
  }

  function tint() {
    const color = META[showing][2];
    if (color && !palette) root.style.setProperty('--accent', color);
    else root.style.removeProperty('--accent');
    stage.run();
  }

  function pick() {
    let key = hovered || pinned;
    if (!key) {
      const mid = window.innerHeight * (narrow.matches ? 0.66 : 0.5);
      const row = rows.find(r => {
        const b = r.getBoundingClientRect();
        return b.top <= mid && b.bottom > mid;
      });
      key = row ? row.dataset.scene : palette === 'fontaine' ? 'water' : 'pk';
    }
    if (key === showing) return;
    showing = key;

    const n = ORDER.indexOf(key);
    if (n > -1) met = key;
    stage.set(key);
    tint();
    rows.forEach(r => r.classList.toggle('on', r.dataset.scene === key));
    $('capCount').textContent = (n > -1 ? String(n + 1).padStart(2, '0') : key === 'pk' || key === 'water' ? '00' : '??') + ' / 0' + ORDER.length;
    scramble($('capName'), META[key][0]);
    scramble($('capNote'), META[key][1]);
  }

  function pin(key, ms) {
    pinned = key;
    hovered = null;
    clearTimeout(pinTimer);
    if (key) pinTimer = setTimeout(() => { pinned = null; pick(); }, ms || 30000);
    pick();
  }

  rows.forEach(row => {
    const enter = () => { hovered = row.dataset.scene; pinned = null; pick(); };
    const leave = () => { hovered = null; pick(); };
    row.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') enter(); });
    row.addEventListener('pointerleave', leave);
    row.addEventListener('focus', enter);
    row.addEventListener('blur', leave);
  });

  window.addEventListener('scroll', pick, { passive: true });
  window.addEventListener('resize', pick);

  // the anywhere door drops you at a project you weren't just looking at
  function anywhere() {
    const pool = rows.filter(r => r.dataset.scene !== met);
    const row = pool[(Math.random() * pool.length) | 0];
    const b = row.getBoundingClientRect();
    const mid = window.innerHeight * (narrow.matches ? 0.66 : 0.5);
    pin(null);
    window.scrollTo({ top: window.scrollY + b.top + b.height / 2 - mid, behavior: still ? 'auto' : 'smooth' });
    status('anywhere door: ' + META[row.dataset.scene][0] + '.');
  }

  stage.onClick = () => {
    if (showing === 'doraemon') anywhere();
    else pin(ORDER[(ORDER.indexOf(showing) + 1) % ORDER.length], 20000);
  };

  // base is dark/light, palette is an optional override on top of it

  const PALETTES = ['fontaine', 'onebit'];
  const LINES = {
    fontaine: 'all the world\'s a stage.',
    onebit: 'one bit per pixel is plenty.'
  };
  let base = null;

  function setBase(mode) {
    base = mode || null;
    if (base) root.setAttribute('data-theme', base);
    else root.removeAttribute('data-theme');
    store('theme', base);
    stage.run();
  }

  function setPalette(name, announce) {
    palette = PALETTES.includes(name) ? name : '';
    if (palette) root.setAttribute('data-palette', palette);
    else root.removeAttribute('data-palette');
    store('palette', palette || null);

    const fontaine = palette === 'fontaine';
    $('portrait').src = fontaine ? 'assets/furina_av.png' : 'assets/avatar.jpg';
    $('role').textContent = fontaine ? 'regina of all waters' : 'computer engineering student';
    $('place').textContent = fontaine ? 'fontaine' : 'india';

    pick();
    tint();
    if (announce) status(LINES[palette] || 'back to normal.');
  }

  const togglePalette = name => setPalette(palette === name ? '' : name, true);
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const storedBase = read('theme');
  if (storedBase === 'dark' || storedBase === 'light') setBase(storedBase);
  setPalette(read('palette') || '', false);
  systemDark.addEventListener('change', stage.run);

  $('themeBtn').addEventListener('click', () => {
    if (palette) { setPalette('', false); return; }
    const dark = base ? base === 'dark' : systemDark.matches;
    setBase(dark ? 'light' : 'dark');
  });

  $('portrait').addEventListener('click', () => togglePalette('fontaine'));

  const ageEl = $('age');
  ageEl.textContent = age();
  ageEl.addEventListener('click', () => {
    ageEl.textContent = days().toLocaleString() + ' days,';
    setTimeout(() => { ageEl.textContent = age(); }, 2600);
  });

  const clock = $('clock');
  const ist = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
  });

  function tick() {
    const time = ist.format(new Date());
    const hour = parseInt(time, 10);
    clock.textContent = time + ' IST' + (hour >= 1 && hour < 6 ? ', should be asleep' : '');
  }

  tick();
  setInterval(tick, 20000);

  const NOTES = [
    'no framework, no build step',
    'three files, nothing to install',
    'the 3d is about 150 lines, no library',
    'view source, it\'s short',
    'the ` key does something'
  ];
  let note = 0;
  $('colophon').addEventListener('click', e => {
    note = (note + 1) % NOTES.length;
    e.currentTarget.textContent = NOTES[note];
  });

  const TITLE = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? 'still here' : TITLE;
  });

  function badApple() {
    if (palette !== 'onebit') setPalette('onebit', true);
    pin('badapple');
  }

  // back to the save point, which is the top of the page. it keeps count.
  function returnByDeath() {
    const loop = (parseInt(read('loops'), 10) || 0) + 1;
    const veil = document.createElement('div');
    store('loops', String(loop));
    veil.className = 'veil';
    document.body.appendChild(veil);
    setTimeout(() => veil.remove(), 800);
    window.scrollTo(0, 0);
    pin('rezero');
    status('return by death. loop ' + loop + '.');
    return loop;
  }

  function door() {
    pin('doraemon');
    status('anywhere door. click it.');
  }

  function fushi() {
    pin('fushi');
    status('it has met ' + META[met][0] + '.');
  }

  let cube = null;
  function summonCube() {
    if (cube) return;
    let pokes = 0;
    cube = document.createElement('div');
    cube.className = 'cube';
    cube.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i>';
    cube.addEventListener('click', () => {
      pokes++;
      if (pokes === 1) status('stop poking the cube.');
      else if (pokes === 2) status('i mean it.');
      else { cube.remove(); cube = null; status('fine.'); }
    });
    document.body.appendChild(cube);
    status('matsumoto, reporting in.');
  }

  // typed words, ignored while the shell has focus

  let buffer = '';

  const WORDS = [
    [/furina|focalors/, () => togglePalette('fontaine')],
    [/vivy|matsumoto/, summonCube],
    [/badapple/, badApple],
    [/subaru|rezero/, returnByDeath],
    [/doraemon|nobita/, door],
    [/fushi|eternity/, fushi]
  ];

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === '`') {
      e.preventDefault();
      toggleShell();
      return;
    }

    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-12);

    for (const [word, fn] of WORDS) {
      if (word.test(buffer)) {
        buffer = '';
        fn();
        break;
      }
    }
  });

  // shell

  const bg = $('shellBg');
  const input = $('shellInput');
  const out = $('shellOut');
  const scroll = $('shellScroll');

  function print(text, cls) {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    out.appendChild(line);
    scroll.scrollTop = scroll.scrollHeight;
  }

  function openShell() {
    bg.setAttribute('open', '');
    input.focus();
    if (!out.childElementCount) {
      print('sh 0.3. type help. there are secrets in here: try ls -a');
    }
  }

  function closeShell() {
    bg.removeAttribute('open');
    input.blur();
  }

  function toggleShell() {
    if (bg.hasAttribute('open')) closeShell();
    else openShell();
  }

  $('shellBtn').addEventListener('click', openShell);
  $('shellClose').addEventListener('click', closeShell);
  bg.addEventListener('click', e => { if (e.target === bg) closeShell(); });

  const GH = 'https://github.com/Pratik-3706/';
  const REPOS = {
    norvexum: ['Norvexum', 'rust', 'terminal coding agent, sandboxed tools'],
    swarm: ['swarm_mcp', 'js', 'several coding agents, one task board'],
    vivy: ['Vivy', 'rust', 'an ai that uses your android phone'],
    metroika: ['Metroika', 'python', 'checks product labels against the law'],
    ignite: ['ignite_bot', 'python', 'discord bot on 512 mb of ram'],
    badapple: ['BadApple_nn', 'python', 'tiny net memorizes a video'],
    justanepoch: ['JustAnEpoch', 'python', 'gpt + bpe tokenizer from scratch'],
    obsidian: ['Obsidian_Codec', 'python', 'gpu transcoder around ffmpeg'],
    portfolio: ['my_portfolio', 'html', 'you are here']
  };

  const FILES = {
    'about.txt': [
      'I build things mostly to find out how they work.',
      'I\'d rather read the paper and write the thing than pull in',
      'a dependency I can\'t explain.'
    ],
    'projects.txt': [
      'eight things worth showing. run: projects',
      'repos open with: open <name>'
    ],
    'tools.txt': ['rust, python, c++. pytorch, ffmpeg, cuda, ratatui, tauri.'],
    '.fontaine': [
      'Water remembers the shape of the glass.',
      'Try typing her name on the page, or run: theme fontaine'
    ],
    '.plan': [
      'finish one thing before starting the next.',
      '(this has never once worked.)'
    ],
    '.words': [
      'the page listens while you type.',
      'press esc to close this, then type one of these',
      'anywhere on the page (no text box needed):',
      ' ',
      '  furina   vivy   badapple   subaru   doraemon   fushi'
    ],
    '.stage': [
      'show takes more names than it admits to.',
      'some of them aren\'t projects.'
    ]
  };

  const COMMANDS = [
    'help', 'ls', 'cat', 'projects', 'open', 'show', 'whoami', 'now', 'age',
    'theme', 'echo', 'history', 'clear', 'exit'
  ];

  const typed = [];
  let at = 0;

  function complete(value) {
    const parts = value.split(/\s+/);
    if (parts.length === 1) return [COMMANDS, parts[0], ''];
    if (parts.length !== 2) return [[], '', ''];
    if (parts[0] === 'cat') return [Object.keys(FILES), parts[1], 'cat '];
    if (parts[0] === 'open') return [Object.keys(REPOS), parts[1], 'open '];
    if (parts[0] === 'show') return [ORDER, parts[1], 'show '];
    if (parts[0] === 'theme') return [['dark', 'light', 'reset'], parts[1], 'theme '];
    return [[], '', ''];
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const raw = input.value.trim();
      input.value = '';
      if (!raw) return;
      typed.push(raw);
      at = typed.length;
      print('$ ' + raw, 'echo');
      run(raw);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (at > 0) input.value = typed[--at] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (at < typed.length - 1) input.value = typed[++at] || '';
      else { at = typed.length; input.value = ''; }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const [pool, word, prefix] = complete(input.value.replace(/^\s+/, ''));
      if (!word) return;
      const hits = pool.filter(c => c.startsWith(word));
      if (hits.length === 1) input.value = prefix + hits[0] + (prefix ? '' : ' ');
      else if (hits.length > 1) print(hits.join('  '));
    } else if (e.key === 'Escape' || e.key === '`') {
      e.preventDefault();
      closeShell();
    }
  });

  function train() {
    const losses = [4.812, 3.377, 2.641, 2.108, 1.794];
    pin('justanepoch');
    losses.forEach((loss, i) => {
      setTimeout(() => print('epoch ' + (i + 1) + '/5   loss ' + loss.toFixed(3), 'plain'), 350 * (i + 1));
    });
    setTimeout(() => {
      print('sample: "the the of and the the of"', 'hl');
      print('it\'s called StupidLM for a reason.');
    }, 350 * 6);
  }

  function neofetch() {
    const mode = palette || base || (systemDark.matches ? 'dark' : 'light');
    const art = ['█▀▀█ █ █', '█▄▄█ █▀▄', '█    █ █', '        ', '        ', '        '];
    const info = [
      'guest@pratik',
      'shell    sh 0.3',
      'theme    ' + mode,
      'stage    ' + META[showing][0],
      'uptime   ' + onPage(),
      'size     three files, no build step'
    ];
    art.forEach((row, i) => print(row + '   ' + info[i], i ? 'plain' : 'hl'));
  }

  function run(line) {
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');
    const key = arg.toLowerCase().replace(/[^a-z]/g, '');
    const find = pool => pool.find(r => key && (r.startsWith(key) || key.startsWith(r)));

    switch (cmd) {
      case 'help':
        print('ls              what\'s lying around', 'plain');
        print('cat <file>      read one of them', 'plain');
        print('projects        the list', 'plain');
        print('open <name>     open a repo in a new tab', 'plain');
        print('show <name>     put a project on the stage', 'plain');
        print('whoami          you, roughly', 'plain');
        print('now             date, and how long you\'ve been here', 'plain');
        print('age             mine, in days', 'plain');
        print('theme <name>    dark, light, reset', 'plain');
        print('history, clear, exit', 'plain');
        print('there are secrets too. start with: ls -a');
        break;

      case 'ls':
      case 'dir': {
        const names = Object.keys(FILES);
        print(names.filter(f => f[0] !== '.').join('  '), 'plain');
        if (/-\w*a/.test(arg)) {
          print(names.filter(f => f[0] === '.').join('  '), 'hl');
          print('read one with cat. the good one is: cat .words');
        } else {
          print('ls -a shows the hidden ones');
        }
        break;
      }

      case 'cat': {
        if (!arg) { print('cat: needs a filename', 'err'); break; }
        const name = Object.keys(FILES).find(f => key && f.replace(/[^a-z]/g, '').includes(key));
        if (!name) { print('cat: ' + arg + ': no such file', 'err'); break; }
        FILES[name].forEach(l => print(l, name[0] === '.' ? 'hl' : 'plain'));
        break;
      }

      case 'projects':
      case 'work':
        Object.keys(REPOS).forEach(k => {
          print(k.padEnd(14) + REPOS[k][1].padEnd(9) + REPOS[k][2], 'plain');
        });
        print('open <name> to go there, show <name> to look at it');
        break;

      case 'open': {
        const match = find(Object.keys(REPOS));
        if (!match) { print('open: unknown project. try projects', 'err'); break; }
        window.open(GH + REPOS[match][0], '_blank', 'noopener');
        print('opening ' + match, 'plain');
        break;
      }

      case 'show': {
        if (!key) { print(ORDER.join('  '), 'plain'); break; }
        const match = find(Object.keys(SCENES));
        if (!match) { print('show: nothing by that name. try show on its own', 'err'); break; }
        pin(match);
        print(META[match][0] + ' is up. esc to look.', 'plain');
        break;
      }

      case 'whoami':
        print('guest', 'plain');
        print('there are hidden files in here. try: ls -a');
        break;

      case 'now':
      case 'date':
      case 'uptime':
        print(new Date().toString(), 'plain');
        print('on this page: ' + onPage(), 'plain');
        break;

      case 'age':
        print(age() + ' years, or ' + days().toLocaleString() + ' days', 'plain');
        break;

      case 'theme':
        if (key === 'reset' || !key) { setBase(null); setPalette('', true); print('following your system', 'plain'); }
        else if (key === 'dark' || key === 'light') { setPalette('', false); setBase(key); print(key, 'plain'); }
        else if (PALETTES.includes(key)) { setPalette(key, true); print(key, 'plain'); }
        else print('theme: dark, light, reset', 'err');
        break;

      case 'subaru':
      case 'rezero':
        print('return by death. loop ' + returnByDeath() + '.', 'plain');
        break;

      case 'rem':
        print('who\'s rem?', 'plain');
        break;

      case 'doraemon':
      case 'nobita':
        door();
        print('the door is up. esc, then click it.', 'plain');
        break;

      case 'fushi':
      case 'eternity':
        fushi();
        print('it has met ' + META[met][0] + '. esc to watch.', 'plain');
        break;

      case 'badapple':
        badApple();
        print('on the stage, one bit per pixel. esc to watch.', 'plain');
        break;

      case 'vivy':
      case 'matsumoto':
        summonCube();
        pin('vivy');
        print('he\'s around here somewhere.', 'plain');
        break;

      case 'train':
        train();
        break;

      case 'neofetch':
        neofetch();
        break;

      case 'swarm':
        pin('swarm');
        print('1 agent online: you.', 'plain');
        print('no manager, no tasks. enjoy the quiet.');
        break;

      case 'git':
        if (/^blame/.test(arg)) print('whoever it was, it was 3am.', 'plain');
        else if (/^push/.test(arg)) print('you don\'t have write access. good try though.', 'err');
        else print('it\'s on github. run: open portfolio', 'plain');
        break;

      case 'ping':
        print('pong', 'plain');
        break;

      case 'pwd':
        print('/home/guest', 'plain');
        break;

      case 'cd':
        print('there\'s only one directory. it\'s a small site.', 'plain');
        break;

      case 'man':
        print('no manual. there\'s help, and there\'s guessing.', 'plain');
        break;

      case 'hi':
      case 'hello':
        print('hi.', 'plain');
        break;

      case 'echo':
        print(arg, 'plain');
        break;

      case 'history':
        typed.forEach((l, i) => print(String(i + 1).padStart(3) + '  ' + l, 'plain'));
        break;

      case 'sudo':
        print('guest is not in the sudoers file. this incident has been reported.', 'err');
        break;

      case 'vim':
      case 'vi':
      case 'nano':
      case 'emacs':
        print('you are in a browser. esc works here, which is more than vim ever gave you.', 'plain');
        break;

      case 'rm':
        print(/-rf?\s*\/?\s*$|-rf\s/.test(arg) ? 'nice try.' : 'rm: this is a website.', 'plain');
        break;

      case 'clear':
        out.textContent = '';
        break;

      case 'exit':
      case 'q':
      case ':q':
        closeShell();
        break;

      default:
        print(cmd + ': command not found', 'err');
    }
  }

  console.log(
    '%cthere is a shell behind the backtick key.\n%crun ls -a once you are in.',
    'font-family:monospace;font-size:12px;background:#efede7;color:#0a0a09;padding:2px 6px',
    'font-family:monospace;font-size:12px;color:#85837d'
  );
})();
