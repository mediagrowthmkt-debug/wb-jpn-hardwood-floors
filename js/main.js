document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initScrollReveal();
  initForm();
  initSmoothClose();
  initWoodShine();
  initWizard();
});

function initWizard() {
  document.querySelectorAll('.wizard').forEach(wz => {
    const steps = [...wz.querySelectorAll('.wstep')];
    const bar = wz.querySelector('.wizard__bar i');
    const stepn = wz.querySelector('.wizard__stepn');
    const back = wz.querySelector('.wback');
    const done = wz.querySelector('.wdone');
    const nav = wz.querySelector('.wnav');
    const form = wz.querySelector('form');
    if (!steps.length || !form) return;
    const data = {};
    let cur = 0;
    const total = steps.length;
    function show(i) {
      steps.forEach((s, k) => s.classList.toggle('active', k === i));
      cur = i;
      if (bar) bar.style.width = ((i + 1) / total * 100) + '%';
      if (stepn) stepn.textContent = 'Step ' + (i + 1) + ' of ' + total;
      if (back) back.classList.toggle('show', i > 0);
      const sum = steps[i].querySelector('.wsummary');
      if (sum) sum.innerHTML = 'You need <b>' + (data.service || 'a quote') + '</b> for a <b>' +
        (data.property || 'property') + '</b>, timeline <b>' + (data.timeline || 'flexible') + '</b>.';
    }
    wz.querySelectorAll('.wopt').forEach(opt => {
      opt.addEventListener('click', () => {
        const step = opt.closest('.wstep');
        step.querySelectorAll('.wopt').forEach(o => o.classList.remove('sel'));
        opt.classList.add('sel');
        data[step.dataset.key] = opt.dataset.val;
        const hid = form.querySelector('input[name="' + step.dataset.key + '"]');
        if (hid) hid.value = opt.dataset.val;
        setTimeout(() => { if (cur < total - 1) show(cur + 1); }, 220);
      });
    });
    if (back) back.addEventListener('click', () => { if (cur > 0) show(cur - 1); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('.wsend');
      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
      // GHL / backend integration point: POST { ...data, name, email, phone, city } here.
      setTimeout(() => {
        steps.forEach(s => s.classList.remove('active'));
        if (nav) nav.style.display = 'none';
        if (done) done.classList.add('show');
      }, 650);
    });
    show(0);
  });
}

function initWoodShine() {
  if (window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.guarantee').forEach(band => {
    const glow = document.createElement('div');
    glow.className = 'glow';
    band.appendChild(glow);
    let raf = null;
    band.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = band.getBoundingClientRect();
        band.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        band.style.setProperty('--my', (e.clientY - r.top) + 'px');
        glow.style.opacity = '1';
        raf = null;
      });
    });
    band.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
  });
}

function initNavbar() {
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
    toggle.classList.toggle('active');
  });
}

function initSmoothClose() {
  const menu = document.getElementById('navMenu');
  const toggle = document.getElementById('navToggle');
  document.querySelectorAll('.nav__link, .nav__actions a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.classList.remove('active');
    });
  });
}

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visible')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), (i % 3) * 70);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

function initForm() {
  const form = document.getElementById('estimateForm');
  if (!form) return;
  const ok = document.getElementById('formOk');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;
    // GHL / backend integration point: POST form data to the endpoint here.
    setTimeout(() => {
      form.querySelectorAll('input,select,textarea').forEach(f => f.value = '');
      ok.style.display = 'block';
      btn.textContent = orig;
      btn.disabled = false;
      setTimeout(() => { ok.style.display = 'none'; }, 6000);
    }, 700);
  });
}
