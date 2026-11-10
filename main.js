(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const root = document.documentElement;

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

  // the background is a grid of dots that doubles as a very small display

  const grid = (() => {
    const canvas = $('grid');
    const ctx = canvas.getContext('2d');
    const GAP = 26;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, cols = 0, rows = 0;
    let energy = new Float32Array(0);
    let cold = '', hot = '';
    let running = false;
    let ripples = [];
    let life = null;
    let held = null;

    const cx = i => (i % cols) * GAP + GAP / 2;
    const cy = i => ((i / cols) | 0) * GAP + GAP / 2;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = cold;
      for (let i = 0; i < energy.length; i++) {
        if (energy[i] <= 0.02) ctx.fillRect(cx(i) - 1, cy(i) - 1, 2, 2);
      }
      ctx.fillStyle = hot;
      for (let i = 0; i < energy.length; i++) {
        const e = energy[i];
        if (e <= 0.02) continue;
        const s = 2 + e * 5;
        ctx.globalAlpha = Math.min(1, 0.3 + e);
        ctx.fillRect(cx(i) - s / 2, cy(i) - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    function paint() {
      const css = getComputedStyle(root);
      cold = css.getPropertyValue('--dot').trim();
      hot = css.getPropertyValue('--dot-hot').trim();
      draw();
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP);
      rows = Math.ceil(h / GAP);
      energy = new Float32Array(cols * rows);
      ripples = [];
      life = null;
      held = null;
      draw();
    }

    function step(a) {
      const b = new Uint8Array(a.length);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let n = 0;
          for (let y = -1; y <= 1; y++) {
            for (let x = -1; x <= 1; x++) {
              if (x || y) n += a[((r + y + rows) % rows) * cols + (c + x + cols) % cols];
            }
          }
          const i = r * cols + c;
          b[i] = n === 3 || (n === 2 && a[i]) ? 1 : 0;
        }
      }
      return b;
    }

    function frame(now) {
      for (const rp of ripples) {
        rp.r += 8;
        const fade = 1 - rp.r / rp.max;
        for (let i = 0; i < energy.length; i++) {
          const d = Math.hypot(cx(i) - rp.x, cy(i) - rp.y);
          if (Math.abs(d - rp.r) < 14) energy[i] = Math.max(energy[i], fade * 0.9);
        }
      }
      ripples = ripples.filter(rp => rp.r < rp.max);

      if (life) {
        if (now > life.until) life = null;
        else {
          if (now >= life.next) {
            life.cells = step(life.cells);
            life.next = now + 110;
          }
          for (let i = 0; i < energy.length; i++) {
            if (life.cells[i]) energy[i] = Math.max(energy[i], 0.75);
          }
        }
      }

      if (held) {
        if (now > held.until) held = null;
        else held.cells.forEach(i => { energy[i] = 1; });
      }

      draw();

      let busy = false;
      for (let i = 0; i < energy.length; i++) {
        if (energy[i] > 0.02) { energy[i] *= 0.88; busy = true; }
        else energy[i] = 0;
      }

      if (busy || ripples.length || life || held) requestAnimationFrame(frame);
      else { running = false; draw(); }
    }

    function kick() {
      if (running) return;
      running = true;
      requestAnimationFrame(frame);
    }

    function touch(x, y) {
      if (still) return;
      const R = 110;
      const c0 = Math.max(0, ((x - R) / GAP) | 0);
      const c1 = Math.min(cols - 1, ((x + R) / GAP) | 0);
      const r0 = Math.max(0, ((y - R) / GAP) | 0);
      const r1 = Math.min(rows - 1, ((y + R) / GAP) | 0);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const i = r * cols + c;
          const d = Math.hypot(cx(i) - x, cy(i) - y);
          if (d < R) energy[i] = Math.max(energy[i], (1 - d / R) ** 2 * 0.85);
        }
      }
      kick();
    }

    function ripple(x, y) {
      if (still) return;
      ripples.push({ x, y, r: 0, max: 440 });
      kick();
    }

    function toggleLife() {
      if (still) return null;
      if (life) { life = null; return false; }
      const cells = new Uint8Array(cols * rows);
      for (let i = 0; i < cells.length; i++) cells[i] = Math.random() < 0.24 ? 1 : 0;
      life = { cells, next: 0, until: performance.now() + 25000 };
      kick();
      return true;
    }

    function stamp(bitmap, ms) {
      const c0 = Math.max(0, ((cols - bitmap[0].length) / 2) | 0);
      const r0 = Math.max(0, ((rows - bitmap.length) / 2) | 0);
      const cells = [];
      bitmap.forEach((line, r) => {
        for (let c = 0; c < line.length; c++) {
          if (line[c] === '#' && r0 + r < rows && c0 + c < cols) cells.push((r0 + r) * cols + c0 + c);
        }
      });
      if (still) {
        cells.forEach(i => { energy[i] = 1; });
        draw();
        setTimeout(() => { energy.fill(0); draw(); }, ms);
        return;
      }
      held = { cells, until: performance.now() + ms };
      kick();
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', e => touch(e.clientX, e.clientY), { passive: true });
    window.addEventListener('pointerdown', e => ripple(e.clientX, e.clientY), { passive: true });

    return { paint, toggleLife, stamp };
  })();

  // base is dark/light, palette is an optional override on top of it

  const PALETTES = ['fontaine', 'phosphor', 'onebit'];
  const LINES = {
    fontaine: 'all the world\'s a stage.',
    phosphor: 'phosphor burn-in engaged.',
    onebit: 'one bit per pixel is plenty.'
  };
  let palette = '';
  let base = null;

  function setBase(mode) {
    base = mode || null;
    if (base) root.setAttribute('data-theme', base);
    else root.removeAttribute('data-theme');
    store('theme', base);
    grid.paint();
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

    grid.paint();
    if (announce) status(LINES[palette] || 'back to normal.');
  }

  const togglePalette = name => setPalette(palette === name ? '' : name, true);
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const storedBase = read('theme');
  if (storedBase === 'dark' || storedBase === 'light') setBase(storedBase);
  setPalette(read('palette') || '', false);
  systemDark.addEventListener('change', grid.paint);

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
    'view source, it\'s short',
    'the dots are clickable',
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

  function badApple() {
    if (palette !== 'onebit') setPalette('onebit', true);
    grid.stamp(APPLE, 4000);
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

  function playLife() {
    const on = grid.toggleLife();
    if (on === null) status('you asked for less motion, so no.');
    else status(on ? 'conway says hi.' : 'everything dies eventually.');
    return on;
  }

  // typed words and the konami code, ignored while the shell has focus

  let buffer = '';
  const KONAMI = 'ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a'.split(' ');
  let konamiAt = 0;

  const WORDS = [
    [/furina|focalors/, () => togglePalette('fontaine')],
    [/vivy|matsumoto/, summonCube],
    [/badapple/, badApple],
    [/conway/, playLife]
  ];

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === KONAMI[konamiAt] || e.key.toLowerCase() === KONAMI[konamiAt]) {
      if (++konamiAt === KONAMI.length) {
        konamiAt = 0;
        togglePalette('phosphor');
      }
    } else {
      konamiAt = e.key === KONAMI[0] ? 1 : 0;
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
      print('sh 0.2. type help, or ls if you like poking around.');
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
      'the page listens while you type. it knows a few names:',
      'an archon, a songstress and her cube, a video, a mathematician.'
    ]
  };

  const COMMANDS = [
    'help', 'ls', 'cat', 'projects', 'open', 'whoami', 'now', 'age',
    'theme', 'life', 'echo', 'history', 'clear', 'exit'
  ];

  const typed = [];
  let at = 0;

  function complete(value) {
    const parts = value.split(/\s+/);
    if (parts.length === 1) return [COMMANDS, parts[0], ''];
    if (parts.length === 2 && parts[0] === 'cat') return [Object.keys(FILES), parts[1], 'cat '];
    if (parts.length === 2 && parts[0] === 'open') return [Object.keys(REPOS), parts[1], 'open '];
    if (parts.length === 2 && parts[0] === 'theme') return [['dark', 'light', 'reset'].concat(PALETTES), parts[1], 'theme '];
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
    const art = ['█▀▀█ █ █', '█▄▄█ █▀▄', '█    █ █', '        ', '        '];
    const info = [
      'guest@pratik',
      'shell    sh 0.2',
      'theme    ' + mode,
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

    switch (cmd) {
      case 'help':
        print('ls              what\'s lying around', 'plain');
        print('cat <file>      read one of them', 'plain');
        print('projects        the list', 'plain');
        print('open <name>     open a repo in a new tab', 'plain');
        print('whoami          you, roughly', 'plain');
        print('now             date, and how long you\'ve been here', 'plain');
        print('age             mine, in days', 'plain');
        print('theme <name>    dark, light, reset', 'plain');
        print('life            something for the dots to do', 'plain');
        print('history, clear, exit', 'plain');
        print('a few others aren\'t listed.');
        break;

      case 'ls':
      case 'dir': {
        const names = Object.keys(FILES);
        print(names.filter(f => f[0] !== '.').join('  '), 'plain');
        if (/-\w*a/.test(arg)) print(names.filter(f => f[0] === '.').join('  '), 'hl');
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
        print('open <name> to go there');
        break;

      case 'open': {
        const match = Object.keys(REPOS).find(r => key && (r.startsWith(key) || key.startsWith(r)));
        if (!match) { print('open: unknown project. try projects', 'err'); break; }
        window.open(GH + REPOS[match][0], '_blank', 'noopener');
        print('opening ' + match, 'plain');
        break;
      }

      case 'whoami':
        print('guest', 'plain');
        print('some of the files here start with a dot.');
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

      case 'life':
      case 'conway': {
        const on = playLife();
        print(on === null ? 'reduced motion is on.' : on ? 'running on the dots behind this window. esc to watch.' : 'stopped.', 'plain');
        break;
      }

      case 'badapple':
        badApple();
        print('the whole video won\'t fit in the background. have an apple instead.', 'plain');
        break;

      case 'vivy':
      case 'matsumoto':
        summonCube();
        print('bottom right.', 'plain');
        break;

      case 'train':
        train();
        break;

      case 'neofetch':
        neofetch();
        break;

      case 'swarm':
        print('1 agent online: you.', 'plain');
        print('no manager, no tasks. enjoy the quiet.');
        break;

      case 'git':
        if (/^blame/.test(arg)) print('whoever it was, it was 3am.', 'plain');
        else if (/^push/.test(arg)) print('you don\'t have write access. good try though.', 'err');
        else print('it\'s on github. run: open portfolio', 'plain');
        break;

      case 'coffee':
      case 'make':
        print('418 i\'m a teapot', 'err');
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
    'font-family:monospace;font-size:12px;background:#ffe14d;color:#0c0c0b;padding:2px 6px',
    'font-family:monospace;font-size:12px;color:#85837d'
  );
})();
