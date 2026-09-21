/* ==========================================================================
   Tamam & Amel — Portfolio interactions
   Animasi scroll utama ditangani CSS; file ini menambah interaksi & efek hidup.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const supportsSDA = CSS.supports('animation-timeline: view()');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- 1. Tema: View Transitions API dengan efek lingkaran ---------- */
  const themeBtn = $('#themeToggle');
  const themeMeta = $('meta[name="theme-color"]');

  const syncThemeUI = (theme) => {
    themeMeta?.setAttribute('content', theme === 'light' ? '#f7f5ef' : '#0f0e15');
    themeBtn?.setAttribute('aria-label', theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang');
  };

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    syncThemeUI(theme);
    try { localStorage.setItem('theme', theme); } catch {}
  };

  syncThemeUI(root.dataset.theme);

  themeBtn?.addEventListener('click', (event) => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';

    if (!document.startViewTransition || reduceMotion.matches) {
      applyTheme(next);
      return;
    }

    // Titik pusat lingkaran: posisi klik (atau tengah tombol jika via keyboard)
    const rect = themeBtn.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    root.classList.add('vt-theme');
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 800, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
    transition.finished.finally(() => root.classList.remove('vt-theme'));
  });

  /* ---------- 2. Pecah teks "Tentang" menjadi kata untuk reveal per kata ---------- */
  const words = [];
  const splitTarget = $('[data-split]');

  if (splitTarget) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
          return;
        }
        if (child.nodeType !== Node.TEXT_NODE) return;

        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.append(part);
            return;
          }
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = part;
          words.push(span);
          frag.append(span);
        });
        child.replaceWith(frag);
      });
    };

    walk(splitTarget);
    words.forEach((word, i) => {
      const p = (i / words.length) * 0.85;
      word.style.setProperty('--p', p.toFixed(4));
      word.dataset.p = p;
    });
  }

  /* ---------- 3. Fallback untuk browser tanpa scroll-driven animations ---------- */
  if (!supportsSDA) {
    const bar = $('.scroll-progress');
    const about = $('.about');
    let ticking = false;

    const update = () => {
      ticking = false;
      const max = root.scrollHeight - innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;

      if (about && words.length) {
        const r = about.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
        words.forEach((w) => w.classList.toggle('is-on', p >= Number(w.dataset.p)));
      }
    };

    addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();

    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    $$('.reveal').forEach((el) => revealIO.observe(el));
  }

  /* ---------- 4. Counter angka (dipicu sekali saat terlihat) ---------- */
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      counterIO.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  $$('.counter').forEach((el) => counterIO.observe(el));

  /* ---------- 5. Scroll spy → menggerakkan pill nav (anchor positioning) ---------- */
  const navLinks = $$('.nav__links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = `#${entry.target.id}`;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  ['#beranda', ...navLinks.map((a) => a.getAttribute('href')), '#kontak'].forEach((id) => {
    const section = $(id);
    if (section) spy.observe(section);
  });

  /* ---------- 6. Spotlight kartu bento (border menyala mengikuti kursor) ---------- */
  const bento = $('.bento');
  if (bento && finePointer.matches) {
    const cards = $$('.card', bento);
    bento.addEventListener('pointermove', (e) => {
      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- 7. Tombol magnetik ---------- */
  if (finePointer.matches && !reduceMotion.matches) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = `${dx * 0.25}px ${dy * 0.35}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* ---------- 8. Jam lokal (WIB) ---------- */
  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const tick = () => { clock.textContent = `${fmt.format(new Date())} WIB`; };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 9. Salin email + toast ---------- */
  const toast = $('#toast');
  let toastTimer;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  };

  // Cipratan cat kecil di sekitar tombol
  const PAINT = ['#e0673c', '#f2b24a', '#2a7fb8', '#58a86b', '#c8f43c', '#8b5cf6', '#f06ab5'];
  const splash = (x, y) => {
    if (reduceMotion.matches) return;
    for (let i = 0; i < 28; i++) {
      const drop = document.createElement('span');
      const size = 5 + Math.random() * 10;
      drop.className = 'splash';
      drop.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size * (0.8 + Math.random() * 0.5)}px;background:${PAINT[i % PAINT.length]}`;
      document.body.append(drop);

      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist + 50; // sedikit "gravitasi"
      drop.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.3)`, opacity: 0 },
        ],
        { duration: 800 + Math.random() * 600, easing: 'cubic-bezier(.15, .8, .3, 1)' }
      ).onfinish = () => drop.remove();
    }
  };

  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(email);
        showToast('Email tersalin ✓');
        const r = btn.getBoundingClientRect();
        splash(r.left + r.width / 2, r.top + r.height / 2);
      } catch {
        location.href = `mailto:${email}`;
      }
    });
  });

  /* ---------- 10. Menu mobile: tutup saat link diklik ---------- */
  const menu = $('#mobileMenu');
  menu?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => menu.hidePopover?.());
  });

  /* ---------- 11. Tahun di footer ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- 12. Kuas cat di hero (goresan memudar mengikuti kursor) ---------- */
  const hero = $('.hero');
  const paint = $('.paint');

  if (hero && paint && finePointer.matches && !reduceMotion.matches) {
    const ctx = paint.getContext('2d');
    const LIFE = 1400; // ms sebelum goresan hilang
    const strokes = [];
    let w = 0, h = 0, last = null, hue = Math.random() * 360, raf = 0;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      paint.width = w * dpr;
      paint.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    new ResizeObserver(resize).observe(hero);
    resize();

    const line = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, w, h);
      while (strokes.length && now - strokes[0].t > LIFE) strokes.shift();
      ctx.lineCap = 'round';

      for (const s of strokes) {
        const a = 1 - (now - s.t) / LIFE;
        const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
        const ox = -(s.y2 - s.y1) / len;
        const oy = (s.x2 - s.x1) / len;

        // badan goresan
        ctx.lineWidth = s.w * (0.55 + 0.45 * a);
        ctx.strokeStyle = `hsl(${s.hue} 88% 62% / ${Math.min(1, a * 1.25)})`;
        line(s.x1, s.y1, s.x2, s.y2);

        // serat kuas di kedua tepi
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `hsl(${(s.hue + 35) % 360} 95% 76% / ${a * 0.55})`;
        for (const k of [-0.42, 0.42]) {
          line(s.x1 + ox * s.w * k, s.y1 + oy * s.w * k, s.x2 + ox * s.w * k, s.y2 + oy * s.w * k);
        }
      }

      raf = strokes.length ? requestAnimationFrame(draw) : 0;
    };

    hero.addEventListener('pointermove', (e) => {
      const r = paint.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };

      if (last && p.t - last.t < 120) {
        const dist = Math.hypot(p.x - last.x, p.y - last.y);
        if (dist < 2) return;
        const speed = dist / Math.max(1, p.t - last.t);
        hue = (hue + 2.4) % 360;
        strokes.push({ x1: last.x, y1: last.y, x2: p.x, y2: p.y, w: Math.max(5, Math.min(26, 26 - speed * 5)), hue, t: p.t });
        if (strokes.length > 600) strokes.shift();
        if (!raf) raf = requestAnimationFrame(draw);
      }
      last = p;
    });

    hero.addEventListener('pointerleave', () => { last = null; });
  }

  /* ---------- 13. Kursor kustom dengan label kontekstual ---------- */
  const cursor = $('.cursor');

  if (cursor && finePointer.matches && !reduceMotion.matches) {
    const label = $('.cursor__label', cursor);
    let x = -100, y = -100, cx = x, cy = y;
    root.classList.add('has-cursor');

    addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!cursor.classList.contains('is-visible')) {
        cx = x;
        cy = y;
        cursor.classList.add('is-visible');
      }

      const el = e.target instanceof Element ? e.target : null;
      const labelled = el?.closest('[data-cursor]');
      const link = el?.closest('a, button, input, label');
      const painting = el?.closest('[data-cursor-mode="paint"]');

      // label tampil kecuali kursor berada di link/tombol lain di dalam elemen berlabel
      const text = labelled && (!link || link.contains(labelled)) ? labelled.dataset.cursor : '';
      if (label.textContent !== text && text) label.textContent = text;
      cursor.classList.toggle('has-label', Boolean(text));
      cursor.classList.toggle('is-link', !text && Boolean(link));
      cursor.classList.toggle('is-paint', !text && !link && Boolean(painting));
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));

    let following = false;
    const follow = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      cursor.style.translate = `${cx}px ${cy}px`;
      // berhenti saat sudah sampai (hemat CPU), dijalankan lagi oleh pointermove
      if (Math.abs(x - cx) + Math.abs(y - cy) > 0.3) requestAnimationFrame(follow);
      else following = false;
    };
    addEventListener('pointermove', () => {
      if (!following) { following = true; requestAnimationFrame(follow); }
    }, { passive: true });
  }

  /* ---------- 14. Efek teks "decode" ala kode ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&#%*+=<>/';

  const scramble = (el) => {
    if (el.dataset.scrambling) return;
    el.dataset.scrambling = '1';

    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
    }
    const originals = nodes.map((n) => n.textContent);
    const total = originals.join('').length;
    const duration = 380 + total * 14;
    const start = performance.now();

    const step = (now) => {
      const cut = Math.min(1, (now - start) / duration) * total;
      let idx = 0;
      nodes.forEach((node, i) => {
        node.textContent = [...originals[i]].map((ch) => {
          if (idx++ < cut || ch.trim() === '') return ch;
          const g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          return ch === ch.toLowerCase() ? g.toLowerCase() : g;
        }).join('');
      });

      if (cut < total) {
        requestAnimationFrame(step);
      } else {
        nodes.forEach((node, i) => { node.textContent = originals[i]; });
        delete el.dataset.scrambling;
      }
    };
    requestAnimationFrame(step);
  };

  if (!reduceMotion.matches) {
    navLinks.forEach((a) => a.addEventListener('pointerenter', () => scramble(a)));

    const eyebrowIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        scramble(entry.target);
        eyebrowIO.unobserve(entry.target);
      });
    }, { threshold: 1 });
    $$('.eyebrow').forEach((el) => eyebrowIO.observe(el));
  }

  /* ---------- 15. Slider sebelum & sesudah ---------- */
  const stage = $('.ba__stage');
  const range = $('#baRange');

  if (stage && range) {
    const setPos = (pct) => {
      const v = Math.min(100, Math.max(0, pct));
      stage.classList.add('is-touched'); // hentikan sapuan otomatis
      stage.style.setProperty('--pos', `${v}%`);
      range.value = Math.round(v);
    };
    const fromPointer = (e) => {
      const r = stage.getBoundingClientRect();
      setPos(((e.clientX - r.left) / r.width) * 100);
    };

    stage.addEventListener('pointerdown', (e) => {
      stage.setPointerCapture(e.pointerId);
      fromPointer(e);
    });
    stage.addEventListener('pointermove', (e) => {
      if (stage.hasPointerCapture(e.pointerId)) fromPointer(e);
    });
    range.addEventListener('input', () => setPos(Number(range.value)));
  }

  /* ---------- 16. Galeri: filter & lightbox dengan View Transitions ---------- */
  const canTransition = () => Boolean(document.startViewTransition) && !reduceMotion.matches;
  const grid = $('.gallery-grid');
  const lightbox = $('#lightbox');

  if (grid && lightbox) {
    const items = $$('.art', grid);
    const filters = $$('.filter');

    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.filter;
        const apply = () => {
          filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
          items.forEach((it) => { it.hidden = type !== 'all' && it.dataset.type !== type; });
        };
        if (!canTransition()) { apply(); return; }

        grid.classList.add('vt-on'); // aktifkan view-transition-name per karya
        document.startViewTransition(apply).finished.finally(() => grid.classList.remove('vt-on'));
      });
    });

    const lbImg = $('.lightbox__img', lightbox);
    const lbMeta = $('#lbMeta');
    const lbTitle = $('#lbTitle');
    const lbDesc = $('#lbDesc');
    let current = null;

    const imgOf = (item) => $('.art__img', item);
    const visibleItems = () => items.filter((it) => !it.hidden);

    const fill = (item) => {
      const src = imgOf(item);
      const btn = $('.art__btn', item);
      lbImg.className = `${src.className} lightbox__img`;
      lbImg.setAttribute('style', src.getAttribute('style') || '');
      lbImg.innerHTML = src.innerHTML;
      lbMeta.textContent = btn.dataset.meta;
      lbTitle.textContent = $('.art__cap b', item).textContent;
      lbDesc.textContent = btn.dataset.desc;
      current = item;
    };

    const open = (item) => {
      if (!canTransition()) { fill(item); lightbox.showModal(); return; }
      const src = imgOf(item);
      src.style.viewTransitionName = 'art-zoom';
      document.startViewTransition(() => {
        src.style.viewTransitionName = '';
        fill(item);
        lbImg.style.viewTransitionName = 'art-zoom';
        lightbox.showModal();
      });
    };

    const close = () => {
      if (!lightbox.open) return;
      if (!canTransition() || !current) { lightbox.close(); return; }
      const target = imgOf(current);
      const t = document.startViewTransition(() => {
        lbImg.style.viewTransitionName = '';
        target.style.viewTransitionName = 'art-zoom';
        lightbox.close();
      });
      t.finished.finally(() => { target.style.viewTransitionName = ''; });
    };

    const step = (dir) => {
      const list = visibleItems();
      const next = list[(list.indexOf(current) + dir + list.length) % list.length];
      if (canTransition()) document.startViewTransition(() => fill(next));
      else fill(next);
    };

    items.forEach((item) => $('.art__btn', item).addEventListener('click', () => open(item)));
    $('.lightbox__close', lightbox).addEventListener('click', close);
    $$('[data-step]', lightbox).forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.step))));

    // Esc & klik di luar kartu menutup dengan animasi yang sama
    lightbox.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  }

  /* ---------- 17. Stiker yang bisa diseret (miring mengikuti lemparan) ---------- */
  let stickerZ = 5;
  $$('.sticker').forEach((st) => {
    let startX = 0, startY = 0, dx = 0, dy = 0, lastX = 0;

    st.addEventListener('pointerdown', (e) => {
      st.setPointerCapture(e.pointerId);
      st.classList.add('is-dragging');
      st.style.zIndex = ++stickerZ;
      startX = e.clientX - dx;
      startY = e.clientY - dy;
      lastX = e.clientX;
    });

    st.addEventListener('pointermove', (e) => {
      if (!st.hasPointerCapture(e.pointerId)) return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
      const vx = e.clientX - lastX;
      lastX = e.clientX;
      st.style.setProperty('--dx', `${dx}px`);
      st.style.setProperty('--dy', `${dy}px`);
      st.style.setProperty('--tilt', `${Math.max(-25, Math.min(25, vx * 1.6))}deg`);
    });

    const drop = () => {
      st.classList.remove('is-dragging');
      st.style.setProperty('--tilt', '0deg');
    };
    st.addEventListener('pointerup', drop);
    st.addEventListener('pointercancel', drop);
  });

  /* ---------- 18. Intro pembuka: hitung 0→100 lalu tirai tersingkap ---------- */
  const loader = $('.loader');

  if (loader && root.classList.contains('is-loading')) {
    const num = $('#loaderNum');
    const bar = $('.loader__bar i');
    const DURATION = 1400;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const start = performance.now();

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      loader.classList.add('is-leaving');
      root.classList.remove('is-loading');
      setTimeout(() => loader.remove(), 1100);
    };

    // klik / tekan tombol apa pun untuk melewati intro
    loader.addEventListener('click', finish);
    addEventListener('keydown', finish, { once: true });

    const count = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      num.textContent = Math.round(ease(t) * 100);
      bar.style.transform = `scaleX(${ease(t)})`;
      if (finished) return;
      if (t < 1) requestAnimationFrame(count);
      else setTimeout(finish, 150);
    };
    requestAnimationFrame(count);
  } else {
    loader?.remove();
  }

  /* ---------- 19. Huruf hero melompat saat disentuh kursor ---------- */
  if (!reduceMotion.matches) {
    $$('.wobble').forEach((el) => {
      const text = el.textContent;
      el.textContent = '';
      [...text].forEach((ch) => {
        if (ch === ' ') { el.append(' '); return; }
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = ch;
        span.addEventListener('pointerenter', () => span.classList.add('is-jelly'));
        span.addEventListener('animationend', () => span.classList.remove('is-jelly'));
        el.append(span);
      });
    });
  }

  /* ---------- 20. Ikon melayang mengikuti mouse (parallax) ---------- */
  if (hero && finePointer.matches && !reduceMotion.matches) {
    hero.addEventListener('pointermove', (e) => {
      hero.style.setProperty('--px', (((e.clientX / innerWidth) - 0.5) * 2).toFixed(3));
      hero.style.setProperty('--py', (((e.clientY / innerHeight) - 0.5) * 2).toFixed(3));
    });
  }

  /* ---------- 21. Judul bagian muncul per huruf ---------- */
  if (!reduceMotion.matches) {
    const splitTitle = (title) => {
      title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
      const wrap = document.createElement('span');
      wrap.setAttribute('aria-hidden', 'true');
      let ci = 0;

      const build = (node, parent) => {
        node.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { parent.append(' '); return; }
              const word = document.createElement('span');
              word.className = 'tw';
              [...part].forEach((ch) => {
                const c = document.createElement('span');
                c.className = 'tc';
                c.textContent = ch;
                c.style.setProperty('--ci', ci++);
                word.append(c);
              });
              parent.append(word);
            });
          } else if (child.nodeName === 'BR') {
            parent.append(document.createElement('br'));
          } else if (child.classList?.contains('gradient-text')) {
            // teks gradien dianimasikan sebagai satu kesatuan agar gradiennya tidak terpotong
            const clone = child.cloneNode(true);
            clone.classList.add('tc');
            clone.style.setProperty('--ci', ci);
            ci += 4;
            parent.append(clone);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const clone = child.cloneNode(false);
            build(child, clone);
            parent.append(clone);
          }
        });
      };

      build(title, wrap);
      title.replaceChildren(wrap);
      title.classList.remove('reveal');
      title.classList.add('split');
    };

    const titleIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        titleIO.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    $$('.section-title, .contact__title').forEach((t) => {
      splitTitle(t);
      titleIO.observe(t);
    });
  }

  /* ---------- 22. Marquee ikut kecepatan & arah scroll ---------- */
  if (!reduceMotion.matches) {
    const bands = $$('.marquee');
    let anims = [];
    let lastY = scrollY, vel = 0, lastRate = 1, lastSkew = 0;

    requestAnimationFrame(() => {
      anims = $$('.marquee__group, .tech-group').flatMap((g) => g.getAnimations());
    });

    const marqueeSection = $('.marquees');
    let looping = false;
    const loop = () => {
      const y = scrollY;
      vel += ((y - lastY) - vel) * 0.1;
      lastY = y;

      const rate = (1 + Math.min(8, Math.abs(vel) * 0.35)) * (vel < -0.4 ? -1 : 1);
      if (Math.abs(rate - lastRate) > 0.02) {
        anims.forEach((a) => { a.playbackRate = rate; });
        lastRate = rate;
      }

      const skew = Math.max(-10, Math.min(10, vel * 0.4));
      if (Math.abs(skew - lastSkew) > 0.05) {
        if (!marqueeSection?.classList.contains('is-off')) {
          bands.forEach((b) => b.style.setProperty('--skew', `${skew.toFixed(2)}deg`));
        }
        lastSkew = skew;
      }
      // berhenti saat scroll sudah tenang; dijalankan lagi oleh event scroll
      if (Math.abs(vel) > 0.05 || Math.abs(lastRate - 1) > 0.02 || Math.abs(lastSkew) > 0.05) requestAnimationFrame(loop);
      else looping = false;
    };
    addEventListener('scroll', () => {
      if (!looping) { looping = true; lastY = scrollY; requestAnimationFrame(loop); }
    }, { passive: true });
  }

  /* ---------- 23. Kartu miring 3D mengikuti mouse ---------- */
  if (finePointer.matches && !reduceMotion.matches) {
    $$('.bento .card, .art__btn, .step').forEach((el) => {
      el.classList.add('tilt');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${(px * 10).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-py * 10).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- 24. Percikan bintang saat klik di mana saja ---------- */
  if (!reduceMotion.matches) {
    const burst = (x, y) => {
      for (let i = 0; i < 9; i++) {
        const s = document.createElement('span');
        s.className = 'spark';
        s.textContent = '✦';
        s.style.cssText = `left:${x}px;top:${y}px;color:${PAINT[i % PAINT.length]};font-size:${10 + Math.random() * 12}px`;
        document.body.append(s);

        const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 30 + Math.random() * 50;
        s.animate(
          [
            { transform: 'translate(-50%, -50%) scale(.2)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(1) rotate(${Math.random() * 180}deg)`, opacity: 0 },
          ],
          { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2, .8, .3, 1)' }
        ).onfinish = () => s.remove();
      }
    };

    addEventListener('click', (e) => {
      if (e.target.closest?.('input, textarea, select, label, .sticker, .ba__stage, .lightbox')) return;
      burst(e.clientX, e.clientY);
    });
  }

  /* ---------- 25. Cincin teks 3D: tiap huruf diletakkan melingkar ---------- */
  $$('[data-ring]').forEach((ring) => {
    const chars = [...ring.dataset.ring];
    ring.style.setProperty('--n', chars.length);
    ['front', 'back'].forEach((side) => {
      chars.forEach((ch, i) => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.setProperty('--i', i);
        if (side === 'back') span.classList.add('back');
        if (ch === '✦') span.classList.add('star');
        ring.append(span);
      });
    });
  });

  /* ---------- 26. Grid latar menyala di sekitar kursor ---------- */
  const bgLayer = $('.bg');
  if (bgLayer && finePointer.matches && !reduceMotion.matches) {
    let gx = -999, gy = -999, queued = false;
    addEventListener('pointermove', (e) => {
      gx = e.clientX;
      gy = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        bgLayer.style.setProperty('--gx', `${gx}px`);
        bgLayer.style.setProperty('--gy', `${gy}px`);
        queued = false;
      });
    }, { passive: true });
  }

  /* ---------- 27. Penunjuk bagian "03 / 09 · Karya" ---------- */
  const indicator = $('.indicator');
  if (indicator) {
    const numEl = $('.indicator__num', indicator);
    const totalEl = $('.indicator__total', indicator);
    const labelEl = $('.indicator__label', indicator);
    const heroSection = $('#beranda');

    // Nomor & nama bagian diambil dari eyebrow "(03) Karya pilihan"
    const entries = $$('main > section[id]').map((section) => {
      const match = $('.eyebrow', section)?.textContent.match(/\((\d+)\)\s*(.+)/);
      return match ? { section, num: match[1], label: match[2].trim() } : null;
    }).filter(Boolean);

    totalEl.textContent = `/ ${entries.at(-1)?.num ?? ''}`;

    const sectionIO = new IntersectionObserver((list) => {
      list.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target === heroSection) {
          indicator.classList.add('is-hidden');
          return;
        }
        const found = entries.find((x) => x.section === entry.target);
        if (!found) return;
        indicator.classList.remove('is-hidden');
        if (numEl.textContent === found.num) return;
        numEl.textContent = found.num;
        labelEl.textContent = found.label;
        indicator.classList.remove('is-rolling');
        void indicator.offsetWidth; // mulai ulang animasi gulir
        indicator.classList.add('is-rolling');
      });
    }, { rootMargin: '-50% 0px -50% 0px' });

    if (heroSection) sectionIO.observe(heroSection);
    entries.forEach((x) => sectionIO.observe(x.section));
  }

  /* ---------- 29. Ganti peran: cadangan JS bila scroll-driven animations tidak didukung ---------- */
  const wardrobe = $('.wardrobe');
  if (wardrobe && !supportsSDA && !reduceMotion.matches) {
    // Sama dengan @keyframes slot0–slot3 di CSS: [persen scroll, nilai --st]
    const KF = [
      [[0, 0], [19, 0], [25, 1], [100, 1]],
      [[0, -1], [19, -1], [25, 0], [44, 0], [50, 1], [100, 1]],
      [[0, -1], [44, -1], [50, 0], [69, 0], [75, 1], [100, 1]],
      [[0, -1], [69, -1], [75, 0], [100, 0]],
    ];
    const valueAt = (kf, p) => {
      for (let i = 1; i < kf.length; i++) {
        if (p <= kf[i][0]) {
          const [p0, v0] = kf[i - 1];
          const [p1, v1] = kf[i];
          return v0 + (v1 - v0) * ((p - p0) / (p1 - p0 || 1));
        }
      }
      return kf[kf.length - 1][1];
    };
    const items = $$('.slotted', wardrobe).map((el) => ({ el, kf: KF[Number(el.className.match(/\bs(\d)\b/)[1])] }));
    const bar = $('.wardrobe__bar span', wardrobe);

    const update = () => {
      const r = wardrobe.getBoundingClientRect();
      const p = Math.min(100, Math.max(0, (-r.top / (r.height - innerHeight)) * 100));
      items.forEach(({ el, kf }) => el.style.setProperty('--st', valueAt(kf, p).toFixed(3)));
      if (bar) bar.style.transform = `scaleX(${p / 100})`;
    };
    addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  }

  /* ---------- 30. Easter egg: ketik "amel" / "tamam", atau klik nama raksasa ---------- */
  const heartRain = () => {
    showToast('♥ Hai dari Amel!');
    if (reduceMotion.matches) return;
    const HEARTS = ['♥', '❤', '💕', '💗', '✿'];
    const COLORS = ['#f06ab5', '#ff8fb1', '#e0673c', '#c8f43c', '#8b5cf6'];
    for (let i = 0; i < 46; i++) {
      const h = document.createElement('span');
      h.className = 'egg-heart';
      h.textContent = HEARTS[i % HEARTS.length];
      h.style.cssText = `left:${Math.random() * 100}vw;color:${COLORS[i % COLORS.length]};font-size:${14 + Math.random() * 26}px`;
      document.body.append(h);
      const sway = (Math.random() - 0.5) * 160;
      h.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(${sway}px, 55vh) rotate(${sway / 2}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${-sway / 2}px, 112vh) rotate(${-sway}deg)`, opacity: 0.2 },
        ],
        { duration: 2600 + Math.random() * 2200, delay: Math.random() * 1400, easing: 'cubic-bezier(.35, .1, .6, 1)', fill: 'backwards' }
      ).onfinish = () => h.remove();
    }
  };

  let matrixOn = false;
  const matrixRain = () => {
    showToast('⌘ Mode developer Tamam aktif');
    if (reduceMotion.matches || matrixOn) return;
    matrixOn = true;

    const canvas = document.createElement('canvas');
    canvas.className = 'matrix';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    const size = 18;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const cols = Math.ceil(canvas.width / size);
    const drops = Array.from({ length: cols }, () => Math.random() * -40);
    const GLYPHS = '01{}<>/=;$#TAMAMDESIGN&アイウエオカキクケコ';
    const start = performance.now();
    let last = 0;
    requestAnimationFrame(() => canvas.classList.add('on'));

    const frame = (now) => {
      if (now - last > 45) {
        last = now;
        ctx.fillStyle = 'rgba(5, 8, 12, .16)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `600 ${size - 2}px ui-monospace, Consolas, monospace`;
        drops.forEach((y, i) => {
          const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          ctx.fillStyle = Math.random() > 0.94 ? '#ffffff' : '#9dff5a';
          ctx.fillText(ch, i * size, y * size);
          drops[i] = y * size > canvas.height && Math.random() > 0.96 ? 0 : y + 1;
        });
      }
      if (now - start < 4200) {
        requestAnimationFrame(frame);
      } else {
        canvas.classList.remove('on');
        setTimeout(() => { canvas.remove(); matrixOn = false; }, 700);
      }
    };
    requestAnimationFrame(frame);
  };

  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    typed = (typed + e.key.toLowerCase()).slice(-8);
    if (typed.endsWith('amel')) { typed = ''; heartRain(); }
    else if (typed.endsWith('tamam')) { typed = ''; matrixRain(); }
  });

  $('.footer__big')?.addEventListener('click', (e) => {
    const letter = e.target.closest('span');
    if (!letter) return;
    Number(letter.style.getPropertyValue('--i')) < 5 ? matrixRain() : heartRain();
  });

  /* ---------- 31. Status studio live (berdasarkan jam WIB) ---------- */
  // [jam mulai, aktivitas, state]  state: on = bisa dihubungi, busy = sibuk, off = istirahat
  const SCHEDULE = {
    amel: [
      [5, 'sketsa pagi sambil ngopi ☕', 'on'], [8, 'sesi foto di studio 📷', 'busy'], [11, 'mengedit video 🎬', 'busy'],
      [13, 'istirahat siang 🍜', 'off'], [14, 'mendesain & branding ✏️', 'on'], [17, 'melukis di kanvas 🎨', 'busy'],
      [20, 'membalas pesan klien 💬', 'on'], [22, 'tidur — dibalas besok pagi 😴', 'off'],
    ],
    tamam: [
      [0, 'tidur 😴', 'off'], [5, 'ngopi & cek server ☕', 'on'], [8, 'ngoding backend ⌨️', 'busy'],
      [12, 'istirahat siang 🍜', 'off'], [13, 'ngoding frontend 💻', 'busy'], [17, 'testing & deploy 🚀', 'busy'],
      [19, 'membalas pesan klien 💬', 'on'], [21, 'ngoding malam 🌙', 'busy'],
    ],
  };
  const statusEls = $$('[data-status]');
  if (statusEls.length) {
    const wib = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    const updateStatus = () => {
      const time = wib.format(new Date());
      const hour = Number(time.slice(0, 2));
      statusEls.forEach((el) => {
        const who = el.dataset.status;
        const list = SCHEDULE[who];
        const now = [...list].reverse().find(([h]) => h <= hour) || list[list.length - 1];
        const name = who === 'amel' ? 'Amel' : 'Tamam';
        el.dataset.state = now[2];
        $('span', el).innerHTML = `<b>${name}</b> sedang ${now[1]} · ${time.replace(':', '.')} WIB`;
      });
    };
    updateStatus();
    setInterval(updateStatus, 30000);
  }

  /* ---------- 32. Galeri 3D: gerakkan mouse untuk melihat sekeliling ---------- */
  const expo = $('.expo__sticky');
  const expoRoom = $('.expo__room');
  if (expo && expoRoom && finePointer.matches && !reduceMotion.matches) {
    expo.addEventListener('pointermove', (e) => {
      const px = e.clientX / innerWidth - 0.5;
      expoRoom.style.rotate = `y ${(px * -14).toFixed(2)}deg`;
    });
    expo.addEventListener('pointerleave', () => { expoRoom.style.rotate = ''; });
  }

  /* ---------- 33. Mode kamera: viewfinder, jepret, polaroid keluar ---------- */
  const camBtn = $('#camToggle');
  const viewfinder = $('.viewfinder');
  const prints = $('.prints');

  if (camBtn && viewfinder && prints) {
    const focus = $('.viewfinder__focus', viewfinder);
    const flashEl = $('.viewfinder__flash', viewfinder);
    const shotsEl = $('#camShots');
    const ROLL = ['album-studio', 'album-kamera', 'album-selfie', 'album-berdua', 'album-tamam', 'cermin-zoom', 'amel-peran-3'];
    let shots = 0;
    let audio;

    const setCam = (on) => {
      root.classList.toggle('cam-on', on);
      camBtn.setAttribute('aria-pressed', String(on));
      showToast(on ? '📷 Mode kamera aktif — klik di mana saja untuk jepret' : 'Mode kamera dimatikan');
    };

    const shutterSound = () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = audio || new AC();
      const t = audio.currentTime;
      [[0, 3200, 0.5], [0.075, 1600, 0.35]].forEach(([offset, freq, vol]) => {
        const len = Math.floor(audio.sampleRate * 0.05);
        const buffer = audio.createBuffer(1, len, audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        const src = audio.createBufferSource();
        const filter = audio.createBiquadFilter();
        const gain = audio.createGain();
        src.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        gain.gain.value = vol;
        src.connect(filter).connect(gain).connect(audio.destination);
        src.start(t + offset);
      });
    };

    const restart = (el, cls) => {
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    };

    const shoot = (x, y) => {
      viewfinder.style.setProperty('--fx', `${x}px`);
      viewfinder.style.setProperty('--fy', `${y}px`);
      restart(focus, 'is-locking');
      shutterSound();
      setTimeout(() => restart(flashEl, 'is-firing'), 120);

      shots = (shots % 24) + 1;
      shotsEl.textContent = String(shots).padStart(2, '0');

      const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
      const print = document.createElement('figure');
      print.className = 'print';
      print.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
      print.style.setProperty('--r', `${(Math.random() - 0.5) * 16}deg`);
      print.innerHTML = `<img src="aset/${ROLL[(shots - 1) % ROLL.length]}.webp" alt="" /><figcaption>#${String(shots).padStart(2, '0')} · ${time.replace(':', '.')} WIB</figcaption>`;
      setTimeout(() => prints.append(print), 250);

      // simpan maksimal 3 polaroid, sisanya pergi
      setTimeout(() => {
        const all = $$('.print:not(.is-leaving)', prints);
        all.slice(0, Math.max(0, all.length - 3)).forEach((p) => {
          p.classList.add('is-leaving');
          setTimeout(() => p.remove(), 650);
        });
      }, 300);
    };

    camBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setCam(!root.classList.contains('cam-on'));
    });

    addEventListener('pointermove', (e) => {
      if (!root.classList.contains('cam-on')) return;
      viewfinder.style.setProperty('--fx', `${e.clientX}px`);
      viewfinder.style.setProperty('--fy', `${e.clientY}px`);
    }, { passive: true });

    // Saat mode kamera aktif, klik = jepret (link & tombol lain tidak dijalankan)
    document.addEventListener('click', (e) => {
      if (!root.classList.contains('cam-on') || camBtn.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      shoot(e.clientX, e.clientY);
    }, true);

    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('cam-on')) setCam(false);
    });
  }

  /* ---------- 35. Elemen pembuka di bagian sticky: hilang setelah mulai scroll ---------- */
  // (pakai class + transition; opacity berbasis scroll-timeline di sini dirender tidak konsisten oleh Chrome)
  const awayEls = $$('[data-hide-after]').map((el) => ({ el, section: el.closest('section'), at: Number(el.dataset.hideAfter) }));
  if (awayEls.length) {
    let queued = false;
    const updateAway = () => {
      queued = false;
      awayEls.forEach(({ el, section, at }) => {
        const r = section.getBoundingClientRect();
        const progress = -r.top / Math.max(1, r.height - innerHeight);
        el.classList.toggle('is-away', progress > at);
      });
    };
    addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(updateAway); }
    }, { passive: true });
    updateAway();
  }

  /* ---------- 36. Nav: jadi kaca setelah mulai scroll ---------- */
  const navEl = $('.nav');
  if (navEl) {
    let navQueued = false;
    const syncNav = () => { navQueued = false; navEl.classList.toggle('is-scrolled', scrollY > 40); };
    addEventListener('scroll', () => {
      if (!navQueued) { navQueued = true; requestAnimationFrame(syncNav); }
    }, { passive: true });
    syncNav();
  }

  /* ---------- 37. Performa: lewati render bagian yang jauh dari layar (content-visibility) ---------- */
  // Tinggi asli tiap bagian dicatat dulu agar panjang halaman & link menu tetap akurat.
  const cvSections = $$('main > section:not(.hero), .footer');
  const applyCV = () => {
    const heights = cvSections.map((sec) => sec.offsetHeight);
    cvSections.forEach((sec, i) => {
      sec.style.containIntrinsicSize = `auto ${heights[i]}px`;
      sec.style.contentVisibility = 'auto';
    });
  };
  if (document.fonts?.ready) document.fonts.ready.then(() => requestAnimationFrame(applyCV));
  else addEventListener('load', applyCV);

  /* ---------- 34. Performa: tandai bagian yang sedang tidak terlihat ---------- */
  const offIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-off', !entry.isIntersecting));
  }, { rootMargin: '200px 0px' });
  $$('main > section, .footer').forEach((section) => offIO.observe(section));

  /* ---------- 28. Brief builder → email siap kirim ---------- */
  const brief = $('#brief');

  if (brief) {
    const budget = $('#budget');
    const budgetOut = $('#budgetOut');
    const TIERS = ['< Rp5 jt', 'Rp5–15 jt', 'Rp15–30 jt', 'Rp30–60 jt', '> Rp60 jt'];
    const syncBudget = () => { budgetOut.textContent = TIERS[Number(budget.value)]; };
    budget.addEventListener('input', syncBudget);
    syncBudget();

    brief.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(brief);
      const name = String(data.get('nama') || '').trim();
      const services = data.getAll('layanan');
      const body = [
        'Halo Tamam & Amel,',
        '',
        `Nama: ${name}`,
        `Kontak: ${data.get('kontak') || '-'}`,
        `Layanan: ${services.length ? services.join(', ') : '-'}`,
        `Anggaran: ${TIERS[Number(budget.value)]}`,
        '',
        'Cerita singkat:',
        String(data.get('pesan') || '-'),
      ].join('\n');

      const subject = `Brief proyek dari ${name}`;
      location.href = `mailto:${brief.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      showToast('Membuka aplikasi email…');
      const r = $('[type="submit"]', brief).getBoundingClientRect();
      splash(r.left + r.width / 2, r.top + r.height / 2);
    });
  }
})();
