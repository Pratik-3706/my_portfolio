(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var LOADED = Date.now();
  var BORN = new Date(2006, 6, 3);

  function age() {
    var now = new Date();
    var y = now.getFullYear() - BORN.getFullYear();
    var m = now.getMonth() - BORN.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < BORN.getDate())) y--;
    return y;
  }

  function days() {
    return Math.floor((Date.now() - BORN.getTime()) / 86400000);
  }

  var ageEl = $('age');
  if (ageEl) ageEl.textContent = age();

  var statusTimer;
  function status(msg, ms) {
    var el = $('status');
    if (!el) return;
    el.textContent = msg;
    el.setAttribute('data-on', '');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { el.removeAttribute('data-on'); }, ms || 3500);
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

  // base is dark/light, palette is an optional override on top of it
  var PALETTES = ['fontaine', 'phosphor'];
  var palette = '';
  var base = null;

  function setBase(mode) {
    base = mode || null;
    if (base) document.documentElement.setAttribute('data-theme', base);
    else document.documentElement.removeAttribute('data-theme');
    store('theme', base);
  }

  function systemPrefersLight() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  }

  function setPalette(name, announce) {
    palette = PALETTES.indexOf(name) > -1 ? name : '';
    PALETTES.forEach(function (p) { document.body.classList.toggle(p, p === palette); });
    store('palette', palette || null);

    var fontaine = palette === 'fontaine';
    var portrait = $('portrait');
    var role = $('role');
    var field = $('field');
    if (portrait) portrait.src = fontaine ? 'assets/furina_av.png' : 'assets/avatar.jpg';
    if (role) role.textContent = fontaine ? 'regina of all waters · fontaine' : 'computer engineering · india';
    if (field) field.textContent = fontaine ? 'hydro archon' : 'computer engineering';

    if (announce) {
      if (fontaine) status('all the world\'s a stage.');
      else if (palette === 'phosphor') status('phosphor burn-in engaged.');
      else status('back to normal.');
    }
  }

  var storedBase = read('theme');
  if (storedBase === 'dark' || storedBase === 'light') setBase(storedBase);
  setPalette(read('palette') || '', false);

  var themeBtn = $('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      if (palette) { setPalette('', false); return; }
      var light = base ? base === 'light' : systemPrefersLight();
      setBase(light ? 'dark' : 'light');
    });
  }

  var portrait = $('portrait');
  if (portrait) {
    portrait.addEventListener('click', function () {
      setPalette(palette === 'fontaine' ? '' : 'fontaine', true);
    });
  }

  if (ageEl) {
    ageEl.addEventListener('click', function () {
      ageEl.textContent = days().toLocaleString() + ' days';
      setTimeout(function () { ageEl.textContent = age(); }, 2600);
    });
  }

  // typed words and the konami code, ignored while the shell has focus
  var buffer = '';
  var konami = 'ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a'.split(' ');
  var konamiAt = 0;

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === konami[konamiAt] || e.key.toLowerCase() === konami[konamiAt]) {
      if (++konamiAt === konami.length) {
        konamiAt = 0;
        setPalette(palette === 'phosphor' ? '' : 'phosphor', true);
      }
    } else {
      konamiAt = 0;
    }

    if (e.key === '`') {
      e.preventDefault();
      toggleShell();
      return;
    }

    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-12);

    if (/furina|focalors/.test(buffer)) {
      buffer = '';
      setPalette(palette === 'fontaine' ? '' : 'fontaine', true);
    }
  });

  // shell

  var bg = $('shellBg');
  var input = $('shellInput');
  var out = $('shellOut');
  var scroll = $('shellScroll');

  function print(text, cls) {
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = text;
    out.appendChild(line);
    scroll.scrollTop = scroll.scrollHeight;
  }

  function openShell() {
    bg.setAttribute('open', '');
    input.focus();
    if (!out.childElementCount) {
      print('sh 0.1 — type help, or ls if you like poking around.', 'dim');
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

  [$('shellBtn'), $('shellBtn2')].forEach(function (btn) {
    if (btn) btn.addEventListener('click', openShell);
  });
  $('shellClose').addEventListener('click', closeShell);
  bg.addEventListener('click', function (e) { if (e.target === bg) closeShell(); });

  var REPOS = {
    norvexum: 'https://github.com/Pratik-3706/Norvexum',
    justanepoch: 'https://github.com/Pratik-3706/JustAnEpoch',
    obsidian: 'https://github.com/Pratik-3706/Obsidian_Codec',
    badapple: 'https://github.com/Pratik-3706/BadApple_nn',
    metroika: 'https://github.com/Pratik-3706/Metroika',
    ignite: 'https://github.com/Pratik-3706/ignite_bot'
  };

  var FILES = {
    'about.txt': [
      'Low-level tools and ML plumbing, mostly Rust and Python.',
      'I\'d rather read the paper and write the thing than pull in',
      'a dependency I can\'t explain.'
    ],
    'work.txt': [
      'six things worth showing. run: work',
      'repos open with: open <name>'
    ],
    'langs.txt': ['python, rust, c/c++, sql, bash'],
    '.fontaine': [
      'Water remembers the shape of the glass.',
      'Try typing her name on the page, or run: theme fontaine'
    ]
  };

  var COMMANDS = [
    'help', 'ls', 'cat', 'whoami', 'work', 'open', 'focus', 'langs',
    'now', 'age', 'theme', 'echo', 'sudo', 'vim', 'clear', 'exit'
  ];

  var history = [];
  var at = 0;

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var raw = input.value.trim();
      input.value = '';
      if (!raw) return;
      history.push(raw);
      at = history.length;
      print('$ ' + raw, 'echo');
      run(raw);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (at > 0) input.value = history[--at] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (at < history.length - 1) input.value = history[++at] || '';
      else { at = history.length; input.value = ''; }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      var word = input.value.trim();
      if (!word || /\s/.test(word)) return;
      var hits = COMMANDS.filter(function (c) { return c.indexOf(word) === 0; });
      if (hits.length === 1) input.value = hits[0] + ' ';
      else if (hits.length > 1) print(hits.join('  '), 'dim');
    } else if (e.key === 'Escape') {
      closeShell();
    }
  });

  function run(line) {
    var parts = line.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var arg = parts.slice(1).join(' ');
    var key = arg.toLowerCase().replace(/[^a-z]/g, '');

    switch (cmd) {
      case 'help':
        print('ls            what\'s lying around');
        print('cat <file>    read one of them');
        print('work          the projects');
        print('open <name>   open a repo in a new tab');
        print('focus         what I spend time on');
        print('langs         languages');
        print('whoami        you, roughly');
        print('now           date, and how long you\'ve been here');
        print('age           mine, in days');
        print('theme <name>  dark, light, fontaine, phosphor, reset');
        print('clear, exit');
        break;

      case 'ls':
        print('about.txt  work.txt  langs.txt');
        print('.fontaine', 'hl');
        break;

      case 'cat':
        if (!arg) { print('cat: needs a filename', 'err'); break; }
        var name = Object.keys(FILES).filter(function (f) {
          return f.replace(/[^a-z]/g, '').indexOf(key) > -1 && key;
        })[0];
        if (!name) { print('cat: ' + arg + ': no such file', 'err'); break; }
        FILES[name].forEach(function (l) {
          print(l, name === '.fontaine' ? 'hl' : null);
        });
        break;

      case 'work':
        print('norvexum      rust      terminal coding agent, sandboxed tools');
        print('justanepoch   python    gpt + bpe tokenizer from scratch');
        print('obsidian      python    gpu transcoder around ffmpeg');
        print('badapple      python    tiny net memorizes a video');
        print('metroika      python    service boundaries, pipelines');
        print('ignite        python    async task dispatcher');
        print('open <name> to go there', 'dim');
        break;

      case 'open':
        var match = Object.keys(REPOS).filter(function (r) { return key && r.indexOf(key) === 0; })[0];
        if (!match) { print('open: unknown project. try work', 'err'); break; }
        window.open(REPOS[match], '_blank', 'noopener');
        print('opening ' + match);
        break;

      case 'focus':
        print('systems design     concurrency, cheap ipc, interfaces that hold up');
        print('reading papers     writing the mechanism out by hand');
        print('ml infrastructure  gpu scheduling, cuda/nvenc, serving');
        print('low level          memory layout, cache, sandboxing, posix');
        break;

      case 'langs':
        print('python, rust, c/c++, sql, bash');
        break;

      case 'whoami':
        print('guest');
        print('one of these files is not like the others.', 'dim');
        break;

      case 'now':
        print(new Date().toString());
        print('on this page: ' + Math.round((Date.now() - LOADED) / 1000) + 's');
        break;

      case 'age':
        print(age() + ' years — ' + days().toLocaleString() + ' days');
        break;

      case 'theme':
        if (key === 'reset' || !key) { setBase(null); setPalette('', true); print('following your system'); }
        else if (key === 'dark' || key === 'light') { setPalette('', false); setBase(key); print(key); }
        else if (PALETTES.indexOf(key) > -1) { setPalette(key, true); print(key); }
        else print('theme: dark, light, fontaine, phosphor, reset', 'err');
        break;

      case 'echo':
        print(arg);
        break;

      case 'sudo':
        print('guest is not in the sudoers file. this incident has been reported.', 'err');
        break;

      case 'vim':
      case 'vi':
        print('you are in a browser. esc works here, which is more than vim ever gave you.');
        break;

      case 'rm':
        print(/-rf?\s*\/?\s*$|-rf\s/.test(arg) ? 'nice try.' : 'rm: this is a website.');
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
    '%cthere is a shell behind the backtick key.\n%crun ls once you are in.',
    'font-family:monospace;font-size:12px;color:#8ab4f8',
    'font-family:monospace;font-size:12px;color:#9b9ca3'
  );
})();
