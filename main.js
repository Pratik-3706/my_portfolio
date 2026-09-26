/* ==========================================================================
   Pratik Khobragade — Systems Engineering Portfolio Engine
   Aesthetic: Dreamcore / Liminal Minimalist
   Features:
   - Dynamic Age & Year Calculation
   - Ethereal Fontaine / Furina Submersion Easter Egg (Avatar & Atmosphere)
   - Interactive Liminal CLI Shell
   - Scanline CRT Glitch & Water Particle Physics
   - Zero AI Slop / Zero Gimmick Currency Counters
   ========================================================================== */

(function () {
  'use strict';

  // ── Chronology & Age Calculation ─────────────────────────
  var BIRTHDAY = new Date(2006, 6, 3); // July 3, 2006

  function calculateAge() {
    var now = new Date();
    var age = now.getFullYear() - BIRTHDAY.getFullYear();
    var m = now.getMonth() - BIRTHDAY.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < BIRTHDAY.getDate())) {
      age--;
    }
    return age;
  }

  var ageEl = document.getElementById('ageVal');
  if (ageEl) {
    ageEl.textContent = calculateAge();
  }


  // ── Minimalist Toast Notification ────────────────────────
  var toastTimer = null;
  function showToast(prefix, msg, duration) {
    duration = duration || 4500;
    var toast = document.getElementById('systemToast');
    var toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;

    var prefixEl = toast.querySelector('.toast-prefix');
    if (prefixEl) prefixEl.textContent = '[' + prefix + ']';
    toastMsg.textContent = msg;

    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, duration);
  }

  // ── Water Particle Ripples ───────────────────────────────
  function spawnWaterParticles(x, y, count) {
    for (var i = 0; i < count; i++) {
      (function (idx) {
        setTimeout(function () {
          var particle = document.createElement('div');
          particle.className = 'water-particle';
          var size = 16 + Math.random() * 28;
          particle.style.width = size + 'px';
          particle.style.height = size + 'px';
          particle.style.left = (x - size / 2 + (Math.random() - 0.5) * 50) + 'px';
          particle.style.top = (y - size / 2 + (Math.random() - 0.5) * 50) + 'px';
          document.body.appendChild(particle);
          setTimeout(function () {
            if (particle.parentNode) particle.parentNode.removeChild(particle);
          }, 800);
        }, idx * 35);
      })(i);
    }
  }

  // ── CRT Scanline Glitch ───────────────────────────────────
  function toggleScanlines(ms) {
    var overlay = document.getElementById('scanlineOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    setTimeout(function () {
      overlay.classList.remove('active');
    }, ms || 3500);
  }

  // ══════════════════════════════════════════════════════════
  // CLEVER EASTER EGG: Ethereal Fontaine / Furina Submersion
  // ══════════════════════════════════════════════════════════
  var isFurinaMode = false;
  var avatarImg = document.getElementById('heroAvatar');
  var heroTagline = document.getElementById('heroTagline');
  var specField = document.getElementById('specField');
  var avatarTrigger = document.getElementById('avatarTrigger');

  var ORIGINAL_AVATAR = 'assets/avatar.jpg';
  var FURINA_AVATAR = 'assets/furina_av.png';
  var ORIGINAL_TAGLINE = 'Computer Engineering';
  var FURINA_TAGLINE = 'Regina of All Waters, Kindreds, Peoples and Laws · Fontaine';
  var ORIGINAL_FIELD = 'Computer Engineering';
  var FURINA_FIELD = 'Hydro Archon';

  function setSubmersionMode(enable, notify) {
    isFurinaMode = enable;
    if (enable) {
      document.body.classList.add('furina-mode');
      if (avatarImg) avatarImg.src = FURINA_AVATAR;
      if (heroTagline) heroTagline.textContent = FURINA_TAGLINE;
      if (specField) specField.textContent = FURINA_FIELD;

      try {
        localStorage.setItem('pk_furina_mode', 'true');
      } catch (err) {}

      if (notify) {
        showToast(
          'OPÉRA ÉPICLESSE',
          '"All the world\'s a stage, and the trial has just begun."'
        );
      }
    } else {
      document.body.classList.remove('furina-mode');
      if (avatarImg) avatarImg.src = ORIGINAL_AVATAR;
      if (heroTagline) heroTagline.textContent = ORIGINAL_TAGLINE;
      if (specField) specField.textContent = ORIGINAL_FIELD;

      try {
        localStorage.removeItem('pk_furina_mode');
      } catch (err) {}

      if (notify) {
        showToast('SYSTEM', 'Default configuration restored.');
      }
    }
  }

  // Restore state if previously active
  try {
    if (localStorage.getItem('pk_furina_mode') === 'true') {
      setSubmersionMode(true, false);
    }
  } catch (e) {}

  // ── Avatar Multi-Stage Progressive Discovery ─────────────
  var avatarClicks = 0;
  var avatarClickTimer = null;
  var whisperTimer = null;
  var avatarWhisper = document.getElementById('avatarWhisper');

  function setAvatarWhisper(text, duration) {
    if (!avatarWhisper) return;
    avatarWhisper.textContent = text;
    avatarWhisper.classList.add('active');
    clearTimeout(whisperTimer);
    if (duration !== 0) {
      whisperTimer = setTimeout(function () {
        avatarWhisper.classList.remove('active');
      }, duration || 2400);
    }
  }

  if (avatarTrigger) {
    avatarTrigger.addEventListener('click', function (e) {
      if (isFurinaMode) {
        spawnWaterParticles(e.clientX, e.clientY, 8);
        setSubmersionMode(false, true);
        setAvatarWhisper('~ returned to surface', 2000);
        return;
      }

      avatarClicks++;
      clearTimeout(avatarClickTimer);

      if (avatarClicks === 1) {
        spawnWaterParticles(e.clientX, e.clientY, 5);
        setAvatarWhisper('💧 a ripple stirs in the reflection...', 2200);
        avatarClickTimer = setTimeout(function () {
          avatarClicks = 0;
        }, 1800);
      } else if (avatarClicks === 2) {
        spawnWaterParticles(e.clientX, e.clientY, 10);
        setAvatarWhisper('🌊 the tides rise deeper... [1 more]', 2200);
        avatarClickTimer = setTimeout(function () {
          avatarClicks = 0;
        }, 1800);
      } else if (avatarClicks >= 3) {
        avatarClicks = 0;
        spawnWaterParticles(e.clientX, e.clientY, 18);
        setAvatarWhisper('✦ submerged [click to resurface]', 3200);
        setSubmersionMode(true, true);
      }
    });

    avatarTrigger.addEventListener('mouseenter', function () {
      if (isFurinaMode) {
        setAvatarWhisper('~ click to resurface', 1600);
      }
    });
  }

  // Hidden Trigger 2: Secret keyword sniffer ('furina' or 'focalors')
  var keyBuffer = '';
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key.length === 1) {
      keyBuffer += e.key.toLowerCase();
      if (keyBuffer.length > 25) keyBuffer = keyBuffer.slice(-25);

      if (keyBuffer.includes('furina') || keyBuffer.includes('focalors')) {
        keyBuffer = '';
        var rect = avatarImg ? avatarImg.getBoundingClientRect() : { left: window.innerWidth / 2, top: 150 };
        spawnWaterParticles(rect.left + 48, rect.top + 48, 14);
        setSubmersionMode(!isFurinaMode, true);
      } else if (keyBuffer.includes('matrix')) {
        keyBuffer = '';
        toggleScanlines(5000);
        showToast('SCANLINES', 'Cathode ray display filter active.');
      }
    }
  });

  // ── Secret: Konami Code (↑ ↑ ↓ ↓ ← → ← → B A) ────────────
  var konamiSeq = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];
  var konamiIdx = 0;

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === konamiSeq[konamiIdx] || e.key.toLowerCase() === konamiSeq[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === konamiSeq.length) {
        konamiIdx = 0;
        toggleScanlines(4500);
        showToast(
          'ANALOG_OVERRIDE',
          '"The prophecy has been fulfilled. The sin is washed away."'
        );
      }
    } else {
      konamiIdx = 0;
    }
  });

  // ── Console Handshake & Discovery Cue ────────────────────
  console.log(
    '%c' +
    '  ✦ PRATIK KHOBRAGADE // SYSTEMS & ARCHITECTURE\n' +
    '  "I build tools that sit between research ideas and working systems."\n\n' +
    '  [DISCOVERY]: A disturbance stirs in the avatar reflection,\n' +
    '               or inspect archives with `ls` in the terminal shell.\n',
    'color: #a5b4fc; font-family: monospace; font-size: 13px; font-weight: bold;'
  );

  window.pratik = {
    bio: function () {
      return 'I build tools that sit between research ideas and working systems in Python and Rust.';
    },
    languages: ['Python', 'Rust', 'C / C++', 'SQL', 'Bash']
  };

  // ══════════════════════════════════════════════════════════
  // Interactive Terminal CLI Modal
  // ══════════════════════════════════════════════════════════
  var terminalOverlay = document.getElementById('terminalOverlay');
  var terminalInput = document.getElementById('terminalInput');
  var terminalOutput = document.getElementById('terminalOutput');
  var terminalCloseBtn = document.getElementById('terminalCloseBtn');
  var openTerminalBtn = document.getElementById('openTerminalBtn');
  var heroCliBtn = document.getElementById('heroCliBtn');

  function openTerminal() {
    if (!terminalOverlay) return;
    terminalOverlay.classList.add('open');
    if (terminalInput) {
      terminalInput.focus();
      terminalInput.value = '';
    }
  }

  function closeTerminal() {
    if (!terminalOverlay) return;
    terminalOverlay.classList.remove('open');
  }

  if (openTerminalBtn) openTerminalBtn.addEventListener('click', openTerminal);
  if (heroCliBtn) heroCliBtn.addEventListener('click', openTerminal);
  if (terminalCloseBtn) terminalCloseBtn.addEventListener('click', closeTerminal);

  if (terminalOverlay) {
    terminalOverlay.addEventListener('click', function (e) {
      if (e.target === terminalOverlay) closeTerminal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === '`' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (terminalOverlay && terminalOverlay.classList.contains('open')) {
        closeTerminal();
      } else {
        openTerminal();
      }
    } else if (e.key === 'Escape') {
      closeTerminal();
    }
  });

  function appendTerminalLine(text, className) {
    var line = document.createElement('div');
    line.className = 'terminal-line' + (className ? ' ' + className : '');
    line.textContent = text;
    terminalOutput.appendChild(line);
    var body = document.getElementById('terminalBody');
    if (body) body.scrollTop = body.scrollHeight;
  }

  var commandHistory = [];
  var historyIdx = -1;

  if (terminalInput) {
    terminalInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var raw = terminalInput.value.trim();
        terminalInput.value = '';
        if (!raw) return;

        commandHistory.push(raw);
        historyIdx = commandHistory.length;

        appendTerminalLine('~ $ ' + raw, 'cmd-echo');
        executeCommand(raw);
      } else if (e.key === 'ArrowUp') {
        if (historyIdx > 0) {
          historyIdx--;
          terminalInput.value = commandHistory[historyIdx] || '';
        }
      } else if (e.key === 'ArrowDown') {
        if (historyIdx < commandHistory.length - 1) {
          historyIdx++;
          terminalInput.value = commandHistory[historyIdx] || '';
        } else {
          historyIdx = commandHistory.length;
          terminalInput.value = '';
        }
      }
    });
  }

  function executeCommand(cmdStr) {
    var trimmed = cmdStr.trim();
    var parts = trimmed.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var arg = parts.slice(1).join(' ').toLowerCase();

    switch (cmd) {
      case 'help':
        appendTerminalLine('COMMANDS:', 'cmd-highlight');
        appendTerminalLine('  ls              — List environment archives');
        appendTerminalLine('  cat <archive>   — Read archive contents');
        appendTerminalLine('  whoami          — View current session');
        appendTerminalLine('  bio             — Read technical background');
        appendTerminalLine('  works           — List primary repositories & systems');
        appendTerminalLine('  systems         — View core architectural disciplines');
        appendTerminalLine('  languages       — Display programming languages');
        appendTerminalLine('  stats           — View telemetry & chronology');
        appendTerminalLine('  clear           — Clear screen');
        appendTerminalLine('  exit            — Close shell');
        break;

      case 'ls':
      case 'dir':
        appendTerminalLine('total 5', 'cmd-dim');
        appendTerminalLine('-rw-r--r--  1 pratik  staff   1.4K  manifesto.txt');
        appendTerminalLine('-rw-r--r--  1 pratik  staff   2.1K  works.log');
        appendTerminalLine('-rw-r--r--  1 pratik  staff    420  disciplines.txt');
        appendTerminalLine('-rw-r--r--  1 pratik  staff    180  languages.env');
        appendTerminalLine('-r--------  1 furina  archon   500  .prophecy_of_waters', 'cmd-highlight');
        appendTerminalLine('hint: run "cat <archive>" to inspect contents.', 'cmd-dim');
        break;

      case 'cat':
        if (!arg) {
          appendTerminalLine('usage: cat <filename> (e.g. "cat .prophecy_of_waters" or "cat works.log")', 'cmd-dim');
          break;
        }
        if (arg.includes('prophecy') || arg.includes('water') || arg.includes('.prophecy')) {
          appendTerminalLine('✦ ARCHON DECREE // OPÉRA ÉPICLESSE ✦', 'cmd-highlight');
          appendTerminalLine(
            '"All the world\'s a stage, and the waters of judgment shall rise."\n' +
            'Execute: \'furina\' (or click the avatar reflection 3 times) to plunge into the trial.',
            'cmd-ethereal'
          );
        } else if (arg.includes('manifesto') || arg.includes('bio')) {
          executeCommand('bio');
        } else if (arg.includes('works') || arg.includes('log')) {
          executeCommand('works');
        } else if (arg.includes('discipline') || arg.includes('systems')) {
          executeCommand('systems');
        } else if (arg.includes('language') || arg.includes('env')) {
          executeCommand('languages');
        } else {
          appendTerminalLine('cat: ' + arg + ': No such file or directory. Try "ls".', 'cmd-error');
        }
        break;

      case 'whoami':
        appendTerminalLine('guest@pratik-machine (guest session)');
        appendTerminalLine('An archon decree lies sealed in \'.prophecy_of_waters\' (run "ls" to inspect).', 'cmd-dim');
        break;

      case 'bio':
        appendTerminalLine(
          'I build tools that sit between research ideas and working systems — AI coding agents,\n' +
          'custom LLM training pipelines, GPU-accelerated media tooling, and whatever else seems\n' +
          'worth figuring out from scratch. Most of my work is in Python and Rust. I like understanding\n' +
          'things at a low level before reaching for abstractions.'
        );
        break;

      case 'works':
      case 'projects':
        appendTerminalLine('SELECTED WORKS:', 'cmd-highlight');
        appendTerminalLine('1. Norvexum        [Rust]     — Sandboxed AI coding agent & TUI (Ratatui)');
        appendTerminalLine('2. JustAnEpoch     [Python]   — From-scratch GPT transformer & custom BPE');
        appendTerminalLine('3. Obsidian Codec  [Python]   — GPU-accelerated transcoding engine (CUDA/FFmpeg)');
        appendTerminalLine('4. BadApple_nn     [Python]   — Neural video memorization experiment');
        appendTerminalLine('5. Metroika        [Python]   — Modular systems & extensible design patterns');
        appendTerminalLine('6. ignite_bot      [Python]   — Automated task & event dispatcher');
        break;

      case 'systems':
        appendTerminalLine('CORE DISCIPLINES:', 'cmd-highlight');
        appendTerminalLine('I.   System Design & Scalability  : Concurrency boundaries, low-overhead IPC, scale');
        appendTerminalLine('II.  First-Principles Research    : From-paper implementations, custom kernels');
        appendTerminalLine('III. ML Infrastructure            : GPU acceleration, CUDA/NVENC, model runtimes');
        appendTerminalLine('IV.  Low-Level Systems            : Rust, memory layout, process sandboxing, POSIX');
        break;

      case 'languages':
        appendTerminalLine('LANGUAGES:', 'cmd-highlight');
        appendTerminalLine('Python, Rust, C / C++, SQL, Bash');
        break;

      case 'stats':
        appendTerminalLine('SYSTEM TELEMETRY:', 'cmd-highlight');
        appendTerminalLine('Name     : Pratik Khobragade');
        appendTerminalLine('Field    : ' + (isFurinaMode ? FURINA_TAGLINE : ORIGINAL_TAGLINE));
        appendTerminalLine('Age      : ' + calculateAge());
        appendTerminalLine('Origin   : India');
        appendTerminalLine('Stack    : Rust · Python · PyTorch · CUDA');
        if (isFurinaMode) {
          appendTerminalLine('Realm    : Fontaine (Hydro Archon Active)');
        }
        break;

      case 'furina':
      case 'focalors':
      case 'submerge':
      case './.prophecy_of_waters':
      case '.prophecy_of_waters':
      case 'prophecy':
        setSubmersionMode(!isFurinaMode, true);
        appendTerminalLine(
          isFurinaMode
            ? '✦ "All the world\'s a stage, and the trial has just begun."'
            : '✦ Default environment restored.',
          'cmd-highlight'
        );
        break;

      case 'matrix':
        toggleScanlines(5000);
        appendTerminalLine('Analog scanline filter active [5s].', 'cmd-success');
        break;

      case 'clear':
        terminalOutput.innerHTML = '';
        break;

      case 'exit':
      case 'quit':
        closeTerminal();
        break;

      default:
        appendTerminalLine('Command not found: ' + cmd + '. Type "help" for commands.', 'cmd-error');
        break;
    }
  }

})();
