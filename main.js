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

  // swarm-mcp. the manager posts tasks to the board, each worker claims one,
  // locks its file in the source folder, and moves the card to done.
  SCENES.swarm = (() => {
    const M = [0, 0.62, 0];
    const W = [[-0.55, 0.08, -0.1], [0, 0.08, -0.25], [0.55, 0.08, -0.1]];
    const NAMES = ['codex', 'cursor', 'gemini'];
    const B = [-0.5, -0.5, 0.2], F = [0.52, -0.5, 0.2];
    const COL = [-0.2, 0, 0.2];

    function flow(g, a, b, t, on) {
      g.line(a, b, on ? 0.7 : 0.14, on);
      if (on) g.dot(lerp(a, b, fract(t * 1.4)), 4, 1, true);
    }

    return {
      sway: true,
      draw(g, t) {
        diamond(g, M, 0.12, 1, true);
        g.text([M[0], M[1] + 0.2, M[2]], 'manager', 11, 0.9, true);

        rect(g, B, [0.31, 0, 0], [0, 0.24, 0], 0.7);
        COL.forEach((x, i) => {
          g.text([B[0] + x, B[1] + 0.32, B[2]], ['todo', 'doing', 'done'][i], 9, 0.7);
          if (i) g.line([B[0] + x - 0.1, B[1] - 0.22, B[2]], [B[0] + x - 0.1, B[1] + 0.22, B[2]], 0.25);
        });
        g.text([B[0], B[1] - 0.34, B[2]], 'task board', 9, 0.55);

        g.path([[-0.28, -0.22], [-0.28, 0.2], [-0.12, 0.2], [-0.07, 0.26], [0.28, 0.26], [0.28, -0.22]]
          .map(([x, y]) => [F[0] + x, F[1] + y, F[2]]), true, 0.7);
        g.text([F[0], F[1] - 0.34, F[2]], 'src/', 9, 0.55);

        const cycle = t / 7;
        let posted = false, reading = false;
        W.forEach((w, i) => {
          const p = fract(cycle + i / 3);
          const col = p < 0.22 ? 0 : p < 0.3 ? (p - 0.22) / 0.08 : p < 0.72 ? 1 : p < 0.8 ? 1 + (p - 0.72) / 0.08 : 2;
          const at = Math.floor(col), k = ease(col - at);
          const x = COL[Math.min(at, 2)] + (at < 2 ? (COL[at + 1] - COL[at]) * k : 0);
          const card = [B[0] + x, B[1] + 0.14 - i * 0.12, B[2] - 0.01];
          rect(g, card, [0.07, 0, 0], [0, 0.035, 0], 1, p >= 0.22 && p < 0.8);

          const file = [F[0] - 0.16 + i * 0.16, F[1] - 0.02, F[2] - 0.01];
          const locked = p >= 0.3 && p < 0.72;
          rect(g, file, [0.05, 0, 0], [0, 0.11, 0], locked ? 1 : 0.4, locked);
          for (let l = 0; l < 3; l++) {
            g.line([file[0] - 0.03, file[1] + 0.05 - l * 0.04, file[2]], [file[0] + 0.03, file[1] + 0.05 - l * 0.04, file[2]], 0.3);
          }
          if (locked) {
            const lk = [file[0], file[1] + 0.2, file[2]];
            rect(g, lk, [0.03, 0, 0], [0, 0.024, 0], 1, true);
            g.path([[-0.018, 0.024], [-0.018, 0.05], [0.018, 0.05], [0.018, 0.024]].map(([dx, dy]) => [lk[0] + dx, lk[1] + dy, lk[2]]), false, 1, true);
          }

          cuboid(g, w, [0.07, 0.07, 0.07], 0.9, false, t * 0.6 + i);
          g.text([w[0], w[1] + 0.17, w[2]], NAMES[i], 9, 0.75);
          flow(g, M, w, t + i * 0.3, p < 0.3);
          flow(g, w, [B[0] + COL[1], B[1] + 0.24, B[2]], t + i * 0.5, (p >= 0.2 && p < 0.32) || (p >= 0.7 && p < 0.82));
          flow(g, w, [file[0], file[1] + 0.12, file[2]], t + i * 0.7, locked);
          if (p < 0.22) posted = true;
          if (p > 0.9 || p < 0.1) reading = true;
        });
        flow(g, M, [B[0] - 0.2, B[1] + 0.24, B[2]], t, posted);
        // the manager reads the repo before it splits the work up
        flow(g, M, [F[0], F[1] + 0.26, F[2]], t + 0.4, reading);
      }
    };
  })();

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

  // metroika. a belt of packages through one scanner. the ones that fail get
  // an X and are pushed off the line.
  SCENES.metroika = (() => {
    const N = 6, SPEED = 0.16, Y = -0.32, RED = '#ff4d5e';

    return {
      sway: true,
      draw(g) {
        const t = g.age;
        g.line([-1.1, Y, -0.22], [1.1, Y, -0.22], 0.45);
        g.line([-1.1, Y, 0.22], [1.1, Y, 0.22], 0.45);
        for (let i = 0; i < 12; i++) {
          const x = -1.1 + fract(i / 12 + t * SPEED * 0.45) * 2.2;
          g.line([x, Y, -0.22], [x, Y, 0.22], 0.12);
        }

        g.path([[-0.04, Y, -0.32], [-0.04, 0.42, -0.32], [-0.04, 0.42, 0.32], [-0.04, Y, 0.32]], false, 0.9, true);
        g.path([[0.04, Y, -0.32], [0.04, 0.42, -0.32], [0.04, 0.42, 0.32], [0.04, Y, 0.32]], false, 0.35, true);
        const sweep = Y + 0.04 + (0.5 + 0.5 * Math.sin(t * 5)) * 0.62;
        g.line([0, sweep, -0.3], [0, sweep, 0.3], 0.9, true);
        g.text([0, 0.55, 0], 'scanner', 10, 0.75, true);

        let flagged = 0, seen = 0;
        for (let k = 0; k < N; k++) {
          const run = t * SPEED + k / N;
          const lap = Math.floor(run);
          const id = k + lap * N;
          const x = -1.05 + fract(run) * 2.1;
          const bad = hash(id * 1.7) < 0.32;
          const h = 0.1 + 0.08 * hash(id), wd = 0.09 + 0.04 * hash(id + 9);
          const past = x > 0.05;
          let z = 0, y = Y + h;
          if (past && bad && x > 0.45) {
            const u = clamp((x - 0.45) / 0.3, 0, 1);
            z = ease(u) * 0.55;
            y -= u * u * 0.35;
          }
          const a = Math.min(1, (1.05 - Math.abs(x)) * 5);
          const scanned = past ? (bad ? RED : true) : false;
          cuboid(g, [x, y, z], [wd, h, 0.1], a * (past ? 1 : 0.6), scanned);
          for (let l = 0; l < 3; l++) {
            g.line([x - wd * 0.7, y + h * 0.5 - l * h * 0.35, z - 0.102], [x + wd * (0.1 + 0.5 * hash(id + l)), y + h * 0.5 - l * h * 0.35, z - 0.102], a * 0.5);
          }
          if (past) {
            const m = [x, y + h + 0.12, z];
            if (bad) {
              g.line([m[0] - 0.05, m[1] - 0.05, m[2]], [m[0] + 0.05, m[1] + 0.05, m[2]], a, RED);
              g.line([m[0] - 0.05, m[1] + 0.05, m[2]], [m[0] + 0.05, m[1] - 0.05, m[2]], a, RED);
            } else {
              g.path([[m[0] - 0.05, m[1], m[2]], [m[0] - 0.015, m[1] - 0.04, m[2]], [m[0] + 0.06, m[1] + 0.05, m[2]]], false, a, true);
            }
          }
          const done = lap * N + (past ? k + 1 : k);
          seen = Math.max(seen, done);
        }
        for (let i = 0; i < seen; i++) if (hash(i * 1.7) < 0.32) flagged++;
        g.hud(0.04, 0.1, 'scanned ' + seen + '   flagged ' + flagged, 11, 0.85, true, 'left');
      }
    };
  })();

  // assets/badapple.bin.gz is the whole video at 96x72, one bit per pixel, each
  // frame XORed with the one before it, then gzipped. the stage exhibit and the
  // page background both play from it. it loads the first time either needs it.
  const BAD = { COLS: 96, ROWS: 72, FPS: 30000 / 1001, frames: null, count: 0, began: 0, waiting: null };
  BAD.BYTES = BAD.COLS * BAD.ROWS / 8;

  BAD.load = () => {
    if (!BAD.waiting) {
      BAD.waiting = (async () => {
        const res = await fetch('assets/badapple.bin.gz');
        if (!res.ok) throw new Error(res.status);
        let buf = await res.arrayBuffer();
        const head = new Uint8Array(buf, 0, 2);
        if (head[0] === 0x1f && head[1] === 0x8b) {
          const unzipped = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
          buf = await new Response(unzipped).arrayBuffer();
        }
        const data = new Uint8Array(buf);
        for (let i = BAD.BYTES; i < data.length; i++) data[i] ^= data[i - BAD.BYTES];
        BAD.frames = data;
        BAD.count = Math.floor(data.length / BAD.BYTES);
        if (!BAD.count) throw new Error('empty');
      })();
    }
    return BAD.waiting;
  };

  BAD.frame = () => Math.floor(Math.max(0, performance.now() / 1000 - BAD.began) * BAD.FPS);
  BAD.lit = (f, c, r) => {
    const i = r * BAD.COLS + c;
    return BAD.frames[f * BAD.BYTES + (i >> 3)] & (0x80 >> (i & 7));
  };

  SCENES.badapple = (() => {
    const COLS = BAD.COLS / 2, ROWS = BAD.ROWS / 2, G = 1.8 / COLS;

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
        if (still) return;
        if (!BAD.playing) BAD.began = performance.now() / 1000;
        BAD.load().catch(() => {});
      },
      draw(g, t) {
        if (!BAD.count || still) { apple(g, t); return; }
        const f = BAD.frame() % BAD.count;
        const size = G * g.unit * 0.8;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (!BAD.lit(f, c * 2, r * 2)) continue;
            g.dot([(c - COLS / 2 + 0.5) * G, (ROWS / 2 - r - 0.5) * G, 0], size, 1, true);
          }
        }
        rect(g, [0, 0, 0], [0.93, 0, 0], [0, 0.705, 0], 0.3);
      }
    };
  })();

  // justanepoch. StupidLM as it ships: 6 decoder blocks, 6 heads, d_model 384,
  // 256-token context, 32k vocab. each new token climbs the stack, attends to
  // the ones before it, and lands at the end of the reply.
  SCENES.justanepoch = (() => {
    const PROMPT = ['hey'];
    const REPLY = ('Imagine there are two friends who are working together: Alice and Bob. ' +
      'They are working together each other, and there are some different ways to do this whole party.').split(' ');
    const STEP = 0.5, LAYERS = 6, HEADS = 6, CTX = 6;
    const lay = l => -0.6 + l * 0.22;
    const col = i => -0.5 + i * 0.2;

    return {
      sway: true,
      draw(g) {
        const total = REPLY.length * STEP + 2.5;
        const t = g.age % total;
        const done = Math.min(REPLY.length, Math.floor(t / STEP));
        const u = fract(t / STEP);
        const busy = done < REPLY.length;

        for (let l = 0; l < LAYERS; l++) {
          const y = lay(l);
          rect(g, [0, y, 0], [0.62, 0, 0], [0, 0, 0.26], 0.32);
          const here = busy && u * (LAYERS + 1) > l + 0.5 && u * (LAYERS + 1) < l + 1.5;
          for (let h = 0; h < HEADS; h++) {
            const on = here && hash(done * 13 + l * 7 + h) > 0.35;
            rect(g, [-0.5 + h * 0.2, y, -0.26], [0.05, 0, 0], [0, 0.025, 0], on ? 1 : 0.25, on);
          }
          if (here) {
            const q = [col(CTX - 1), y, 0];
            for (let i = 0; i < CTX - 1; i++) {
              const wgt = hash(done * 3 + l * 11 + i);
              g.line(q, [col(i), y, 0], 0.2 + wgt * 0.8, true);
            }
          }
        }
        g.text([-0.7, lay(LAYERS - 1), 0], 'decoder × 6', 9, 0.65, false, 'right');
        g.text([-0.7, lay(0), -0.26], 'heads × 6', 9, 0.5, false, 'right');

        const context = PROMPT.concat(REPLY.slice(0, done)).slice(-(CTX - 1));
        context.forEach((word, i) => {
          const at = [col(CTX - 1 - context.length + i), lay(0) - 0.16, 0];
          g.dot([at[0], lay(0), 0], 3, 0.6);
          g.text(at, word.length > 6 ? word.slice(0, 5) + '…' : word, 9, 0.6);
        });

        if (busy) {
          const y = lay(0) - 0.1 + u * (lay(LAYERS - 1) - lay(0) + 0.3);
          const p = [col(CTX - 1), y, 0];
          diamond(g, p, 0.04, 1, true);
          g.line([col(CTX - 1), lay(0) - 0.1, 0], p, 0.5, true);
          if (u > 0.85) g.text([col(CTX - 1), lay(LAYERS - 1) + 0.24, 0], REPLY[done], 11, 1, true);
        }

        const lines = ['> ' + PROMPT.join(' ')], words = REPLY.slice(0, done);
        let line = '';
        words.forEach(w => {
          if ((line + ' ' + w).length > 34) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
        });
        lines.push(line + (busy && Math.floor(g.age * 3) % 2 ? '▌' : ''));
        lines.slice(-4).forEach((s, i) => g.hud(0.05, 0.1 + i * 0.045, s, 11, i || lines.length > 4 ? 0.9 : 0.55, i > 0 || lines.length > 4, 'left'));
      }
    };
  })();

  // obsidian codec. probe the file, split it into streams, push video through
  // the gpu encoder, then mux it all back into one container.
  SCENES.obsidian = (() => {
    const IN = [-1, 0, 0], PROBE = -0.66, SPLIT = -0.44, JOIN = 0.56, OUT = [0.92, 0, 0];
    const LANES = [
      { y: 0.44, name: 'video', gate: 'nvenc' },
      { y: 0, name: 'audio', gate: 'aac' },
      { y: -0.44, name: 'subs', gate: 'srt' }
    ];

    function along(lane, u) {
      if (u < 0.2) return lerp([PROBE, 0, 0], [SPLIT, lane.y, 0], ease(u / 0.2));
      if (u < 0.8) return [SPLIT + (JOIN - SPLIT) * (u - 0.2) / 0.6, lane.y, 0];
      return lerp([JOIN, lane.y, 0], [OUT[0] - 0.1, 0, 0], ease((u - 0.8) / 0.2));
    }

    return {
      sway: true,
      draw(g, t) {
        cuboid(g, IN, [0.1, 0.22, 0.05], 0.8);
        for (let i = -3; i <= 3; i++) g.dot([IN[0] - 0.07, i * 0.06, -0.051], 2.5, 0.6);
        g.text([IN[0], -0.34, 0], 'input.mkv', 9, 0.7);
        g.line([IN[0] + 0.1, 0, 0], [PROBE, 0, 0], 0.4);

        const sweep = 0.12 + 0.03 * Math.sin(t * 6);
        circle(g, [PROBE, 0, 0], sweep, 1, true, 'yz', 24);
        g.text([PROBE, 0.24, 0], 'ffprobe', 9, 0.75, true);

        LANES.forEach((lane, li) => {
          const gx = 0.06;
          for (let s = 0; s < 12; s++) g.line(along(lane, s / 12), along(lane, (s + 1) / 12), 0.14);
          cuboid(g, [gx, lane.y, 0], [0.07, 0.1, 0.1], 0.85, true);
          g.text([gx, lane.y + 0.17, 0], lane.gate, 9, 0.8, true);
          g.text([SPLIT - 0.02, lane.y + 0.08, 0], lane.name, 8, 0.45, false, 'right');

          for (let i = 0; i < 5; i++) {
            const u = fract(t * 0.16 + i / 5 + li * 0.07);
            const p = along(lane, u);
            const a = Math.min(1, u * 8, (1 - u) * 8);
            const small = p[0] > gx;
            if (li === 0) {
              const k = small ? 0.5 : 1;
              rect(g, p, [0, 0.07 * k, 0], [0, 0, 0.11 * k], a, small);
            } else if (li === 1) {
              const pts = [];
              for (let j = 0; j <= 8; j++) pts.push([p[0] - 0.05 + j * 0.0125, p[1] + Math.sin(j * 1.4 + t * 8) * (small ? 0.025 : 0.05), p[2]]);
              g.path(pts, false, a, small);
            } else {
              g.line([p[0] - 0.05, p[1], p[2]], [p[0] + 0.05, p[1], p[2]], a, small);
              g.line([p[0] - 0.05, p[1] - 0.025, p[2]], [p[0] + 0.02, p[1] - 0.025, p[2]], a * 0.7, small);
            }
          }
        });

        cuboid(g, OUT, [0.1, 0.18, 0.05], 1, true);
        g.text([OUT[0], -0.3, 0], 'output.mp4', 9, 0.8, true);
      }
    };
  })();

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

  const shrink = (p, k) => [p[0] * k, p[1] * k, p[2] * k];

  // the same drawing calls, scaled toward the centre and faded with it
  function scaled(g, k) {
    const s = {
      unit: g.unit * k,
      age: g.age,
      line: (a, b, alpha, isHot) => g.line(shrink(a, k), shrink(b, k), alpha * k, isHot),
      dot: (p, size, alpha, isHot) => g.dot(shrink(p, k), size * k, alpha * k, isHot),
      text: (p, str, size, alpha, isHot, align) => g.text(shrink(p, k), str, size * Math.max(k, 0.4), alpha * k * k, isHot, align),
      hud: (x, y, str, size, alpha, isHot, align) => g.hud(x, y, str, size, alpha * k * k, isHot, align),
      depth: p => g.depth(shrink(p, k)),
      ball: (p, r, alpha) => g.ball(shrink(p, k), r * k, alpha),
      path(pts, closed, alpha, isHot) {
        for (let i = 0; i < pts.length - 1; i++) s.line(pts[i], pts[i + 1], alpha, isHot);
        if (closed) s.line(pts[pts.length - 1], pts[0], alpha, isHot);
      }
    };
    return s;
  }

  function orb(g, t, r) {
    r = r || 0.52 + 0.02 * Math.sin(t * 2);
    for (let i = -2; i <= 2; i++) {
      const lat = i * 0.5;
      circle(g, [0, Math.sin(lat) * r, 0], Math.cos(lat) * r, i ? 0.45 : 1, i === 0, 'xz', 32);
    }
    for (let m = 0; m < 6; m++) {
      const a = m * Math.PI / 6 + t * 0.4, ring = [];
      for (let i = 0; i < 32; i++) {
        const b = i * TAU / 32;
        ring.push([Math.cos(b) * r * Math.cos(a), Math.sin(b) * r, Math.cos(b) * r * Math.sin(a)]);
      }
      g.path(ring, true, 0.35);
    }
  }

  SCENES.fushi = {
    draw(g, t) {
      const u = fract(t / 7);
      const k = u < 0.4 ? 0 : u < 0.5 ? ease((u - 0.4) / 0.1) : u < 0.9 ? 1 : 1 - ease((u - 0.9) / 0.1);
      if (k < 1) orb(scaled(g, 1 - k), t);
      if (k > 0) SCENES[met].draw(scaled(g, k), t);
    }
  };

  // the orb that swallows the page. it starts as a point and is built out of
  // whatever falls into it, with a disk of debris spinning round it. then it
  // tries on three shapes it has met and gives everything back, shrinking as it
  // goes. fushi() fills in when each piece lands (eaten) and leaves (freed).
  const VESSEL = { IN: 3, FORM: 1.1, OUT: 2.4, forms: [], eaten: [], freed: [], total: 1 };
  VESSEL.HOLD = VESSEL.FORM * 3;

  // how much of the page is inside the orb at a given age, 0 to 1
  VESSEL.mass = age => {
    let m = 0;
    VESSEL.eaten.forEach(([at, w]) => { if (age >= at) m += w; });
    VESSEL.freed.forEach(([at, w]) => { if (age >= at) m -= w; });
    return clamp(m / VESSEL.total, 0, 1);
  };

  // how much is falling in or flying out right now, for the disk
  VESSEL.traffic = age => {
    const { IN, HOLD } = VESSEL;
    if (age < IN) return clamp(Math.sin(Math.PI * age / IN) * 1.4, 0, 1);
    const o = age - IN - HOLD;
    return o > 0 ? clamp(Math.sin(Math.PI * o / VESSEL.OUT) * 1.4, 0, 1) : 0.3;
  };

  function accretion(g, t, size, alpha, back) {
    if (alpha < 0.02 || size <= 0) return;
    const c = Math.cos(0.42), s = Math.sin(0.42), mid = g.depth([0, 0, 0]);
    for (let i = 0; i < 150; i++) {
      const rad = size * (1.2 + 1.9 * hash(i) * hash(i + 21));
      const ang = hash(i + 11) * TAU + t * 2.2 * Math.pow(size / rad, 1.5);
      const at = th => [Math.cos(th) * rad, -Math.sin(th) * rad * s, Math.sin(th) * rad * c];
      const p = at(ang);
      if ((g.depth(p) > mid) !== back) continue;
      g.line(p, at(ang - 0.12 - 0.2 * hash(i + 4)), alpha * (0.35 + 0.65 * hash(i + 3)), i % 4 !== 0);
    }
  }

  SCENES.vessel = {
    floor: false,
    sway: true,
    draw(g, t) {
      const a = g.age, { IN, FORM, HOLD } = VESSEL;
      const mass = VESSEL.mass(a);
      const h = a - IN;
      let k = 0, n = 0;
      if (h > 0 && h < HOLD) {
        n = Math.min(2, Math.floor(h / FORM));
        const v = (h - n * FORM) / FORM;
        k = v < 0.25 ? ease(v / 0.25) : v > 0.8 ? 1 - ease((v - 0.8) / 0.2) : 1;
      }
      const size = 0.02 + 0.33 * Math.pow(mass, 0.6);
      const r = size * (1 - k) * (1 + 0.03 * Math.sin(a * 8));
      const disk = VESSEL.traffic(a) * Math.min(1, mass * 4 + 0.15);
      accretion(g, t, size, disk, true);
      g.ball([0, 0, 0], r, 1);
      accretion(g, t, size, disk, false);
      if (k > 0) SCENES[VESSEL.forms[n]].draw(scaled(g, k * 1.05), t);
    }
  };

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

  // name, caption, colour. ORDER is the list on the page.

  const ORDER = ['norvexum', 'swarm', 'vivy', 'metroika', 'badapple', 'justanepoch', 'obsidian'];
  const META = {
    pk: ['pk', 'drag it. click it for the next one.', null],
    norvexum: ['norvexum', 'seven tool calls at once, none leaving the box', '#ff6b35'],
    swarm: ['swarm-mcp', 'manager posts, workers claim, files get locked', '#5dff9b'],
    vivy: ['vivy', 'it taps so you don\'t have to. the cube is matsumoto.', '#4de1ff'],
    metroika: ['metroika', 'a whole batch through one scanner. not all of it passes.', '#ffc531'],
    badapple: ['badapple_nn', 'bad apple, at one bit per pixel', null],
    justanepoch: ['justanepoch', 'stupidlm replying. 23M params, d_model 384, ctx 256', '#b18cff'],
    obsidian: ['obsidian codec', 'probe, split, encode on the gpu, mux it back', '#ff7ae0'],
    rezero: ['return by death', 'the clock only runs one way here', '#8ab6ff'],
    doraemon: ['anywhere door', 'click it. it goes somewhere.', '#ff8fc0'],
    fushi: ['fushi', 'an orb at first. then whatever it last met.', null],
    vessel: ['fushi', 'it wants to remember this page', null],
    water: ['fontaine', 'all the world\'s a stage', null]
  };

  // the renderer: points and lines, rotated, projected, drawn. that's all of it.

  function makeStage(canvas, box, first) {
    const ctx = canvas.getContext('2d');
    const CAM = 3.4;

    let w = 0, h = 0, R = 1, mix = 1;
    let yaw = -0.45, pitch = -0.3, vYaw = 0, vPitch = 0;
    let tiltX = 0, tiltY = 0, aimX = 0, aimY = 0;
    let cosY = 1, sinY = 0, cosP = 1, sinP = 0;
    let wire = '#fff', hot = '#fff';
    let current = first, since = 0, raf = 0, drag = null, active = true, type = 1, mono = 'monospace';
    const api = { onClick: null };
    const paint = isHot => typeof isHot === 'string' ? isHot : isHot ? hot : wire;

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
        ctx.strokeStyle = paint(isHot);
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
        ctx.fillStyle = paint(isHot);
        ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
      },
      depth: p => proj(p)[2],
      // a solid lit sphere, for fushi's orb
      ball(p, r, alpha) {
        const q = proj(p), s = r * R * CAM / (CAM + q[2]);
        if (s < 0.5) return;
        const c = (hot.match(/[\d.]+/g) || [255, 255, 255]).slice(0, 3).map(Number);
        const tone = (k, a) => 'rgba(' + c.map(v => Math.round(v * k)).join(',') + ',' + a + ')';
        const al = Math.min(1, alpha * mix);
        const halo = ctx.createRadialGradient(q[0], q[1], s * 0.8, q[0], q[1], s * 2.4);
        halo.addColorStop(0, tone(1, 0.35));
        halo.addColorStop(1, tone(1, 0));
        ctx.globalAlpha = al;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(q[0], q[1], s * 2.4, 0, TAU);
        ctx.fill();
        const body = ctx.createRadialGradient(q[0] - s * 0.35, q[1] - s * 0.4, s * 0.05, q[0], q[1], s);
        body.addColorStop(0, 'rgba(255,255,255,1)');
        body.addColorStop(0.3, tone(1, 1));
        body.addColorStop(1, tone(0.28, 1));
        const op = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(q[0], q[1], s, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = op;
      },
      text(p, str, size, alpha, isHot, align) {
        const q = proj(p);
        g.write(q[0], q[1], str, size, alpha * fade(q[2]), isHot, align);
      },
      // x and y are fractions of the canvas, for text that shouldn't move
      hud(x, y, str, size, alpha, isHot, align) {
        g.write(x * w, y * h, str, size, alpha, isHot, align);
      },
      write(x, y, str, size, alpha, isHot, align) {
        const al = Math.min(1, alpha * mix);
        if (al < 0.02) return;
        ctx.globalAlpha = al;
        ctx.fillStyle = paint(isHot);
        ctx.font = Math.round(size * type) + 'px ' + mono;
        ctx.textAlign = align || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(str, x, y);
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
      g.age = (now - since) / 1000;

      const css = getComputedStyle(box);
      hot = css.color;
      wire = css.getPropertyValue('--ink').trim();
      mono = css.getPropertyValue('--mono').trim() || 'monospace';
      type = clamp(Math.min(w, h) / 480, 0.8, 1.25);

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

      if (!still && !document.hidden && active) raf = requestAnimationFrame(frame);
    }

    function run() {
      if (!raf && active) raf = requestAnimationFrame(frame);
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
    api.set = (key, again) => {
      if (key === current && !again) return;
      if (SCENES[current].leave) SCENES[current].leave();
      current = key;
      if (SCENES[key].enter) SCENES[key].enter();
      since = performance.now();
      run();
    };
    api.pause = on => {
      active = !on;
      if (on) { cancelAnimationFrame(raf); raf = 0; } else run();
    };
    return api;
  }

  const stage = makeStage($('scene'), $('stage'), 'pk');

  // which exhibit is up: the row under the pointer, then anything pinned, then
  // whichever row is in the middle of the screen

  const rows = Array.from(document.querySelectorAll('.projects a[data-scene]'));
  const narrow = window.matchMedia('(max-width: 60rem)');
  const stageEl = $('stage');

  // on a phone the stage rides along at the top of the project list instead of
  // sitting over the intro
  function place() {
    const list = document.querySelector('.projects');
    if (narrow.matches && stageEl.nextElementSibling !== list) list.before(stageEl);
    else if (!narrow.matches && stageEl.parentElement !== document.querySelector('.layout')) {
      document.querySelector('.layout').prepend(stageEl);
    }
  }

  place();
  narrow.addEventListener('change', () => { place(); pick(); });

  // the line a row has to cross to count as the one you're looking at
  function midline() {
    if (!narrow.matches) return window.innerHeight / 2;
    const top = Math.max(0, stageEl.getBoundingClientRect().bottom);
    return (top + window.innerHeight) / 2;
  }
  let hovered = null, pinned = null, pinTimer, pinAt = 0, showing = null;
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
    // a pin (from clicking the stage, or an easter egg) lets go once you scroll away
    if (pinned && Math.abs(window.scrollY - pinAt) > 80) {
      pinned = null;
      clearTimeout(pinTimer);
    }
    let key = hovered || pinned;
    if (!key) {
      const mid = midline();
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
    pinAt = window.scrollY;
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
    const mid = narrow.matches ? (stageEl.offsetHeight + window.innerHeight) / 2 : window.innerHeight / 2;
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
    banners(fontaine);

    pick();
    tint();
    if (announce) status(LINES[palette] || 'back to normal.');
  }

  // furina at sea above the intro, and on the beach above the footer. they only
  // load once the theme is on.
  function banners(on) {
    document.querySelectorAll('.banner').forEach(el => el.remove());
    if (!on) return;
    [['header', 769, 273, '.page > main'], ['footer', 846, 190, 'footer .fine']].forEach(([name, w, h, before]) => {
      const img = new Image(w, h);
      img.src = 'assets/' + name + '.svg';
      img.alt = '';
      img.className = 'banner banner-' + name;
      img.decoding = 'async';
      document.querySelector(before).before(img);
    });
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

  // bad apple plays behind the whole page. the canvas sits on top with
  // mix-blend-mode: difference, so text flips black wherever the video is white
  // and stays readable. type it again or press esc to stop.
  let backdrop = null;

  async function badApple() {
    if (backdrop) { stopApple('stopped.'); return; }
    if (palette !== 'onebit') setPalette('onebit', false);
    if (still) { status('one bit per pixel is plenty.'); return; }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(BAD.COLS, BAD.ROWS);
    canvas.width = BAD.COLS;
    canvas.height = BAD.ROWS;
    canvas.className = 'backdrop';
    canvas.setAttribute('aria-hidden', 'true');
    backdrop = { canvas, raf: 0 };
    document.body.appendChild(canvas);
    status('bad apple. type it again or press esc to stop.', 5000);

    try { await BAD.load(); } catch (e) { stopApple("couldn't load it."); return; }
    if (!backdrop || backdrop.canvas !== canvas) return;
    BAD.began = performance.now() / 1000;
    BAD.playing = true;
    canvas.classList.add('on');

    const draw = () => {
      if (!backdrop || backdrop.canvas !== canvas) return;
      const f = BAD.frame();
      if (f >= BAD.count) { stopApple("that's the whole thing."); return; }
      const px = img.data;
      for (let r = 0, i = 0; r < BAD.ROWS; r++) {
        for (let c = 0; c < BAD.COLS; c++, i += 4) {
          const v = BAD.lit(f, c, r) ? 255 : 0;
          px[i] = px[i + 1] = px[i + 2] = v;
          px[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      backdrop.raf = requestAnimationFrame(draw);
    };
    draw();
  }

  function stopApple(msg) {
    if (!backdrop) return;
    const { canvas, raf } = backdrop;
    cancelAnimationFrame(raf);
    backdrop = null;
    BAD.playing = false;
    canvas.classList.remove('on');
    setTimeout(() => canvas.remove(), 600);
    setPalette('', false);
    if (msg) status(msg);
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

  // fushi is a black hole. the page comes apart into words and pieces, each one
  // spirals into the orb (closest first), the orb tries on a few shapes it has
  // met, then spits every piece back to where it was.
  let vessel = null, swallowing = false;

  const PIECES = '.portrait, .clock, .bar nav button, .facts li, .elsewhere a, h2, .projects h3, ' +
    '.stack, .when, .also, .out a, .fine > *, .banner, .stage, .bh';

  function onScreen(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > -60 && r.top < window.innerHeight + 60;
  }

  // wrap every word (or, for the name, every letter) in its own span
  function shatter(el, letters) {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walk.nextNode()) nodes.push(walk.currentNode);
    nodes.forEach(node => {
      const bits = node.textContent.split(letters ? /(\s+|)/ : /(\s+)/).filter(Boolean);
      if (bits.length < 2 && !bits[0]?.trim()) return;
      const frag = document.createDocumentFragment();
      bits.forEach(bit => {
        if (!bit.trim()) { frag.appendChild(document.createTextNode(bit)); return; }
        const span = document.createElement('span');
        span.className = 'bh';
        span.textContent = bit;
        frag.appendChild(span);
      });
      node.replaceWith(frag);
    });
  }

  function mend(roots) {
    document.querySelectorAll('.bh').forEach(span => span.replaceWith(span.textContent));
    roots.forEach(el => el.normalize());
  }

  // how a piece falls into (ox, oy). nearer pieces go first and wind up
  // tighter, so the page pinches toward the centre like a fisheye while it
  // spirals. on the way in each piece shrinks and is pulled long and thin along
  // the line to the centre. life is the share of the fall time it takes.
  function fall(el, ox, oy, far) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.max(1, Math.hypot(cx - ox, cy - oy)), a0 = Math.atan2(cy - oy, cx - ox);
    const near = Math.min(1, d / far);
    const life = 0.3 + 0.7 * Math.pow(near, 1.2);
    const spin = (1 + 2.6 * (1 - near)) * Math.PI;
    const frames = [];
    for (let i = 0; i <= 18; i++) {
      const u = i / 18;
      const rad = d * (1 - Math.pow(u, 2.1));
      const ang = a0 + spin * Math.pow(u, 2.3);
      const x = ox + Math.cos(ang) * rad - cx, y = oy + Math.sin(ang) * rad - cy;
      const close = 1 - rad / d;
      const pinch = Math.max(0.015, Math.pow(rad / d, 0.55));
      const long = 1 + 8 * close * close;
      const toward = (ang * 57.3).toFixed(1), swirl = ((ang - a0) * 57.3).toFixed(1);
      frames.push({
        offset: u,
        transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + toward + 'deg) scale(' +
          (pinch * long).toFixed(3) + ',' + (pinch / Math.sqrt(long)).toFixed(3) + ') rotate(' + (-toward) + 'deg) rotate(' + swirl + 'deg)',
        opacity: u > 0.9 ? (1 - u) / 0.1 : 1
      });
    }
    return { el, life, weight: Math.sqrt(r.width * r.height), frames };
  }

  function fushi() {
    if (swallowing) return;
    if (still) { pin('fushi'); status('it has met ' + META[met][0] + '.'); return; }
    swallowing = true;
    closeShell();
    if (backdrop) stopApple();

    if (!vessel) {
      const el = document.createElement('div');
      el.className = 'vessel';
      el.innerHTML = '<canvas></canvas>';
      document.body.appendChild(el);
      vessel = { el, stage: makeStage(el.firstChild, el, 'vessel') };
    }
    const shapes = ORDER.filter(k => k !== 'badapple');
    const first = shapes.includes(met) ? met : 'norvexum';
    VESSEL.forms = [first].concat(shapes.filter(k => k !== first).sort(() => Math.random() - 0.5)).slice(0, 3);

    const { IN, HOLD, OUT } = VESSEL;
    const roots = Array.from(document.querySelectorAll('.wrap h1, .wrap .prose p, .wrap .projects p')).filter(onScreen);
    roots.forEach(el => shatter(el, el.tagName === 'H1'));
    const ox = window.innerWidth / 2, oy = window.innerHeight / 2, far = Math.hypot(ox, oy);
    const plans = Array.from(document.querySelectorAll(PIECES)).filter(onScreen).map(el => fall(el, ox, oy, far));
    const FALL = 2.4, RISE = 2;
    plans.forEach(p => {
      p.delay = 0.12 + Math.random() * 0.08;
      p.back = 0.1 + (1 - p.life) * RISE;
    });
    VESSEL.total = plans.reduce((sum, p) => sum + p.weight, 0) || 1;
    VESSEL.eaten = plans.map(p => [p.delay + p.life * FALL, p.weight]);
    VESSEL.freed = plans.map(p => [IN + HOLD + p.back, p.weight]);

    root.classList.add('held', 'emptied');
    vessel.el.classList.add('on');
    vessel.stage.pause(false);
    vessel.stage.set('vessel', true);
    status('it wants to remember this page.', (IN + HOLD) * 1000);

    let moving = plans.map(p => p.el.animate(p.frames, {
      duration: p.life * FALL * 1000,
      delay: p.delay * 1000,
      fill: 'forwards'
    }));

    const later = (sec, fn) => setTimeout(fn, sec * 1000);
    later(IN + HOLD, () => {
      moving.forEach(m => m.cancel());
      // played backwards, so the last thing in is the first thing out and
      // everything lands home at the same moment
      moving = plans.map(p => p.el.animate(p.frames, {
        duration: p.life * RISE * 1000,
        delay: p.back * 1000,
        direction: 'reverse',
        fill: 'backwards'
      }));
    });
    later(IN + HOLD + RISE - 0.3, () => root.classList.remove('emptied'));
    later(IN + HOLD + OUT - 0.4, () => vessel.el.classList.remove('on'));
    later(IN + HOLD + OUT + 0.1, () => {
      moving.forEach(m => m.cancel());
      mend(roots);
      root.classList.remove('held');
      vessel.stage.pause(true);
      swallowing = false;
      status('it remembers this page now.');
    });
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
    if (e.key === 'Escape' && bg.hasAttribute('open')) {
      e.preventDefault();
      closeShell();
      return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape' && backdrop) {
      stopApple('stopped.');
      return;
    }

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
  $('shellScroll').addEventListener('click', () => {
    if (!String(window.getSelection())) input.focus();
  });

  const GH = 'https://github.com/Pratik-3706/';
  const REPOS = {
    norvexum: ['Norvexum', 'rust', 'terminal coding agent, sandboxed tools'],
    swarm: ['swarm_mcp', 'js', 'several coding agents, one task board'],
    vivy: ['Vivy', 'rust', 'an ai that uses your android phone'],
    metroika: ['Metroika', 'python', 'checks product labels against the law'],
    badapple: ['BadApple_nn', 'python', 'tiny net memorizes a video'],
    justanepoch: ['JustAnEpoch', 'python', 'gpt from scratch, plus a bpe tokenizer'],
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
      'anywhere on the page (no text box needed).',
      'on a phone, run them right here instead:',
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
        print('hold still.', 'plain');
        fushi();
        break;

      case 'badapple':
        print(backdrop ? 'stopped.' : 'playing behind the page. run it again to stop.', 'plain');
        badApple();
        closeShell();
        break;

      case 'furina':
      case 'focalors':
        togglePalette('fontaine');
        print(palette ? "all the world's a stage." : 'back to normal.', 'plain');
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
