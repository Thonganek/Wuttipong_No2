(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Preloader ---------- */
  const preloader = $('.preloader');
  const started = performance.now();
  let ready = false;
  function finishLoading() {
    if (ready) return;
    ready = true;
    const wait = reduceMotion ? 0 : Math.max(0, 900 - (performance.now() - started));
    setTimeout(() => {
      preloader?.classList.add('done');
      root.classList.add('ready');
      setTimeout(() => preloader?.remove(), 900);
    }, wait);
  }
  if (document.readyState === 'complete') finishLoading();
  else window.addEventListener('load', finishLoading);
  setTimeout(finishLoading, 2600);

  /* ---------- Header / menu / progress ---------- */
  const header = $('.header');
  const menu = $('.menu-button');
  const nav = $('#nav');
  const progress = $('.scroll-progress i');
  const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } });

  let lastY = scrollY;
  let ticking = false;
  function onScroll() {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    header.classList.toggle('scrolled', y > 20);
    header.classList.toggle('hide', y > 500 && y > lastY + 4 && !nav.classList.contains('open'));
    if (y < lastY - 4 || y < 500) header.classList.remove('hide');
    lastY = y;
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // active nav link
  const sections = $$('#nav a').map(a => [a, $(a.getAttribute('href'))]).filter(([, s]) => s);
  if ('IntersectionObserver' in window) {
    const navObs = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      sections.forEach(([a, s]) => a.classList.toggle('active', s === entry.target));
    }), { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(([, s]) => navObs.observe(s));
  }

  /* ---------- Reveal + count up ---------- */
  $$('.policy-list, .vision-grid, .achieve-grid, .date-stack, .gallery-grid, .skill-grid').forEach(group => {
    $$(':scope > *', group).forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 6) * 90}ms`));
  });
  const formatNumber = (n, decimals) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = formatNumber(target, decimals); return; }
    const duration = 1600;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = formatNumber(target * eased, decimals);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    const obs = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      $$('[data-count]', entry.target).forEach(countUp);
      obs.unobserve(entry.target);
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => obs.observe(el));
  } else {
    root.classList.add('no-anim');
    $$('.reveal').forEach(el => el.classList.add('visible'));
  }

  /* ---------- Countdown ---------- */
  const T = s => new Date(s).getTime();
  const schedule = [
    { open: T('2026-11-05T08:30:00+07:00'), close: T('2026-11-05T16:30:00+07:00'), before: 'นับถอยหลังสู่วันลงคะแนนล่วงหน้า 5 พ.ย. 2569', during: 'วันนี้เปิดลงคะแนนล่วงหน้าที่สหกรณ์ฯ ปิดหีบ 16.30 น.' },
    { open: T('2026-11-10T08:30:00+07:00'), close: T('2026-11-10T16:30:00+07:00'), before: 'นับถอยหลังสู่วันสรรหาปกติ 10 พ.ย. 2569', during: 'วันนี้วันสรรหาปกติ ปิดหีบ 16.30 น.' }
  ];
  const advanceStart = T('2026-10-02T00:00:00+07:00');
  const advanceEnd = T('2026-10-17T00:00:00+07:00');
  const cdEls = { d: $$('[data-cd="d"]'), h: $$('[data-cd="h"]'), m: $$('[data-cd="m"]'), s: $$('[data-cd="s"]') };
  const cdLabels = $$('[data-cd-label]');
  const status = $('[data-advance-status]');
  const pad = n => String(n).padStart(2, '0');
  function setDigit(list, value) {
    list.forEach(el => {
      if (el.textContent === value) return;
      el.textContent = value;
      if (!reduceMotion && el.closest('.cd-digits')) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
    });
  }
  function updateCountdown() {
    const now = Date.now();
    let target = null;
    let label = 'ขอบคุณทุกคะแนนเสียงที่ไว้วางใจ';
    for (const slot of schedule) {
      if (now < slot.open) { target = slot.open; label = slot.before; break; }
      if (now < slot.close) { target = slot.close; label = slot.during; break; }
    }
    cdLabels.forEach(el => { if (el.textContent !== label) el.textContent = label; });
    const diff = target ? Math.max(0, target - now) : 0;
    setDigit(cdEls.d, String(Math.floor(diff / 864e5)));
    setDigit(cdEls.h, pad(Math.floor(diff / 36e5) % 24));
    setDigit(cdEls.m, pad(Math.floor(diff / 6e4) % 60));
    setDigit(cdEls.s, pad(Math.floor(diff / 1e3) % 60));

    if (status) {
      let text;
      let live = true;
      if (now < advanceStart) text = 'ยื่นคำขอลงคะแนนล่วงหน้าได้ 2 – 16 ต.ค. 2569';
      else if (now < advanceEnd) text = 'ขณะนี้เปิดยื่นคำขอลงคะแนนล่วงหน้า ถึง 16 ต.ค. 2569';
      else if (target) { text = 'ปิดรับคำขอลงคะแนนล่วงหน้าแล้ว'; live = false; }
      else { text = 'การลงคะแนนปี 2569 เสร็จสิ้นแล้ว'; live = false; }
      const span = status.lastElementChild;
      if (span.textContent !== text) span.textContent = text;
      status.classList.toggle('off', !live);
    }
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ---------- Pointer effects ---------- */
  if (finePointer && !reduceMotion) {
    const glow = $('.cursor-glow');
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; glow.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
    (function loop() {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      requestAnimationFrame(loop);
    })();

    $$('[data-tilt]').forEach(el => {
      const max = parseFloat(el.dataset.tilt) || 6;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.classList.add('tilting');
        el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
        el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
        el.style.setProperty('--gx', `${px * 100}%`);
        el.style.setProperty('--gy', `${py * 100}%`);
        el.style.setProperty('--foil', `${px * 100}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });

    $$('[data-spot]').forEach(el => el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));

    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Sparkles ---------- */
  function sparkle(x, y) {
    if (reduceMotion) return;
    const colors = ['#e2ae36', '#ffd56a', '#1f6bff', '#6db8ff', '#e3242f', '#a99bff'];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
      const dist = 50 + Math.random() * 70;
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      s.style.color = colors[i % colors.length];
      s.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      s.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      s.innerHTML = '<svg><use href="#i-star"/></svg>';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  }
  $$('[data-sparkle]').forEach(el => el.addEventListener('click', e => {
    const r = el.getBoundingClientRect();
    sparkle(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
  }));

  /* ---------- Hero particles ---------- */
  const canvas = $('.hero-particles');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const hero = $('.hero');
    const colors = ['31,107,255', '109,184,255', '226,174,54', '169,155,255', '255,255,255'];
    let w, h, dpr, parts = [], running = true;
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 16000));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: -0.15 - Math.random() * 0.35,
        r: 0.8 + Math.random() * 2.4, c: colors[Math.floor(Math.random() * colors.length)],
        tw: Math.random() * Math.PI * 2
      }));
    }
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.tw += 0.03;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        const a = 0.45 + Math.sin(p.tw) * 0.35;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.c},${a})`;
        ctx.shadowColor = `rgba(${p.c},.9)`;
        ctx.shadowBlur = p.r * 5;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          const dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
          if (d2 < 11000) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(31,107,255,${0.12 * (1 - d2 / 11000)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    resize();
    addEventListener('resize', resize);
    new IntersectionObserver(([entry]) => {
      const was = running;
      running = entry.isIntersecting && !document.hidden;
      if (running && !was) requestAnimationFrame(draw);
    }).observe(hero);
    document.addEventListener('visibilitychange', () => {
      const was = running;
      running = !document.hidden;
      if (running && !was) requestAnimationFrame(draw);
    });
    requestAnimationFrame(draw);
  }

  /* ---------- Gallery filter ---------- */
  const items = $$('.g-item');
  $$('.gallery-filters button').forEach(btn => btn.addEventListener('click', () => {
    $$('.gallery-filters button').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    const f = btn.dataset.filter;
    items.forEach((item, i) => {
      const show = f === 'all' || item.dataset.cat === f;
      item.classList.toggle('hidden', !show);
      item.classList.remove('pop');
      if (show && !reduceMotion) { item.style.animationDelay = `${i * 40}ms`; void item.offsetWidth; item.classList.add('pop'); }
    });
  }));

  /* ---------- Lightbox ---------- */
  const lightbox = $('#lightbox');
  const lbImage = $('#lb-image');
  let current = 0;
  const visibleItems = () => items.filter(i => !i.classList.contains('hidden'));
  function show(index) {
    const list = visibleItems();
    current = (index + list.length) % list.length;
    const item = list[current];
    lbImage.style.animation = 'none'; void lbImage.offsetWidth; lbImage.style.animation = '';
    lbImage.src = item.dataset.full;
    lbImage.alt = item.dataset.caption;
    $('#lb-caption').textContent = item.dataset.caption;
    $('#lb-count').textContent = `${current + 1} / ${list.length}`;
    $('#lb-download').href = item.dataset.full;
  }
  items.forEach(item => item.addEventListener('click', () => {
    show(visibleItems().indexOf(item));
    lightbox.showModal();
    document.body.classList.add('modal-open');
  }));
  $('.lb-nav.prev').addEventListener('click', () => show(current - 1));
  $('.lb-nav.next').addEventListener('click', () => show(current + 1));
  $('.lb-close').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('close', () => document.body.classList.remove('modal-open'));
  lightbox.addEventListener('click', e => { if (e.target === lightbox || e.target.classList.contains('lb-stage')) lightbox.close(); });
  lightbox.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  let touchX = null;
  lightbox.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Share ---------- */
  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
  }
  $$('[data-share]').forEach(button => button.addEventListener('click', async () => {
    const url = location.href.split('#')[0];
    if (location.protocol === 'file:') { toast('เปิดเว็บไซต์ผ่านลิงก์ออนไลน์เพื่อแชร์ให้ผู้อื่น'); return; }
    try {
      if (navigator.share) await navigator.share({ title: 'โปรดเลือก นายวุฒิพงศ์ ชื่นมณี เบอร์ 2', text: 'ผู้สมัครกรรมการสหกรณ์ เขต 2 ปี 2569 • เลือกตั้ง 5 และ 10 พ.ย. 2569', url });
      else if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์เว็บไซต์แล้ว'); }
      else window.prompt('คัดลอกลิงก์เพื่อแชร์เว็บไซต์', url);
    } catch (error) {
      if (error.name !== 'AbortError') toast('ไม่สามารถแชร์ได้ กรุณาคัดลอกลิงก์จากแถบที่อยู่');
    }
  }));
})();
