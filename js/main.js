document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initScrollReveal();
  initSmoothClose();
  initWoodShine();
  initWizard();
  initEstimateModal();
  initCallbackModal();
  initTracking();
});

// ---- GA4 conversion tracking ----
// Fires call_click, cta_click, form_submit and whatsapp_click into GA4 (G-S9YPZKLR5M).
// form_submit is the key conversion event. Lead "source" is set per page via window.MG_LEAD.
function ga(name, params) {
  try { if (typeof gtag === 'function') gtag('event', name, params || {}); } catch (e) {}
}
// Per-page lead config injected by the build (source/service/city/endpoint). Falls back to website.
function mgLead() {
  return (typeof window !== 'undefined' && window.MG_LEAD) ? window.MG_LEAD : {};
}
function leadSource() {
  var s = mgLead().source;
  if (s) return s;
  return /\/blog\//.test(location.pathname) ? 'blog/artigo' : 'website';
}
// Gets a reCAPTCHA v3 token if configured; resolves to '' when not set (endpoint fallback handles it).
function getRecaptcha(action) {
  var key = mgLead().recaptchaKey;
  return new Promise(function (resolve) {
    if (!key || typeof grecaptcha === 'undefined') { resolve(''); return; }
    try {
      grecaptcha.ready(function () {
        grecaptcha.execute(key, { action: action || 'lead' }).then(resolve, function () { resolve(''); });
      });
    } catch (e) { resolve(''); }
  });
}
// POSTs the lead to the CRM endpoint (n8n -> GHL). No endpoint yet = no-op (returns resolved promise),
// so the visitor still sees the thank-you screen and GA4 still records the conversion.
function postLead(payload) {
  var cfg = mgLead();
  if (!cfg.endpoint) return Promise.resolve({ ok: false, skipped: true });
  return fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function (r) { return { ok: r.ok, skipped: false }; })
    .catch(function () { return { ok: false, skipped: false }; });
}
// Builds the full lead payload for the CRM (contact + note + opportunity fields).
function buildLeadPayload(data, extra) {
  var cfg = mgLead();
  var p = {
    name: (data.name || '').trim(),
    email: (data.email || '').trim(),
    phone: (data.phone || '').trim(),
    city: (data.city || '').trim(),
    service: data.service || '',        // service the visitor chose in step 1
    property: data.property || '',
    timeline: data.timeline || '',
    // page classification for the CRM (granular origin)
    source: cfg.source || leadSource(),
    tags: (cfg.tags && cfg.tags.length) ? cfg.tags.slice() : [cfg.source || leadSource()],
    page_service: cfg.service || '',    // service of the SEO page they landed on
    page_city: cfg.city || '',          // city of the SEO page
    page_url: location.href,
    page_title: document.title,
    company: (data.company || '')       // honeypot: must stay empty
  };
  if (extra) for (var k in extra) p[k] = extra[k];
  return p;
}
function initTracking() {
  // call_click on tel: links is fired by initCallbackModal (which also opens the callback popup).
  // Only the popup-internal direct-dial buttons remain real tel: calls; track those.
  document.querySelectorAll('.cback a[href^="tel:"], .wdone a[href^="tel:"], .wcall[href^="tel:"]').forEach(a => {
    a.addEventListener('click', () => {
      ga('call_click', { source: leadSource(), page_location: location.href, direct_dial: true });
    });
  });
  // WhatsApp links (none today, but future-proof for wa.me / whatsapp links)
  document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(a => {
    a.addEventListener('click', () => {
      ga('whatsapp_click', { source: leadSource(), page_location: location.href });
    });
  });
  // Primary CTA buttons (Free Estimate / Request / Get a Quote)
  document.querySelectorAll('a.btn, a.svc__tag, a.mobar__est').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0 || href.indexOf('mailto:') === 0) return;
    a.addEventListener('click', () => {
      ga('cta_click', { source: leadSource(), cta_text: (a.textContent || '').trim().slice(0, 60), page_location: location.href });
    });
  });
}

function initEstimateModal() {
  const modal = document.getElementById('estimateModal');
  if (!modal) return;
  const open = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('emodal-open'); };
  const close = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('emodal-open'); };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  const isCTA = (a) => {
    const href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0 || href.indexOf('mailto:') === 0) return false;
    const t = (a.textContent || '').toLowerCase();
    return /\/contact\/?(#estimate)?$/.test(href) || /#estimate$/.test(href) ||
           /estimate|request a|request your|free quote|get a quote|price your/.test(t);
  };
  document.querySelectorAll('a.btn, a.svc__tag, a.mobar__est').forEach(a => {
    if (a.closest('.emodal') || a.closest('.wizard')) return; // nunca os botoes internos do form
    if (isCTA(a)) a.addEventListener('click', e => { e.preventDefault(); open(); });
  });
}

// Callback popup on every phone CTA. Clicking a tel: link opens a minimal popup asking
// ONLY the phone number. On submit it captures the number to the CRM (lead_type=call,
// tag "ligacao" + page origin) as a best-effort POST, then IMMEDIATELY dials the real
// number (tel:) so the call connects. The POST is fired before the dial; we don't block
// the call on it. This is NOT the DNI call tracking (that logs the real call via a DID).
function initCallbackModal() {
  const modal = document.getElementById('callbackModal');
  if (!modal) return;
  const box = modal.querySelector('.cback');
  const form = modal.querySelector('.cback__form');
  const doneEl = modal.querySelector('.cback__done');
  const callHref = 'tel:+19787548751'; // NAP-safe real number the submit dials
  const open = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('emodal-open'); };
  const resetBtn = () => { const b = form && form.querySelector('.cback__send'); if (b) { b.disabled = false; } };
  const close = () => {
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('emodal-open');
    if (box) box.classList.remove('sent');
    if (doneEl) doneEl.classList.remove('show');
    resetBtn();
  };
  modal.querySelectorAll('[data-cbclose]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Intercept every tel: link, except the direct-dial buttons inside popups (let those dial).
  document.querySelectorAll('a[href^="tel:"]').forEach(a => {
    if (a.closest('.cback') || a.closest('.wizard') || a.closest('.wdone')) return; // popup internal dial stays a real call
    a.addEventListener('click', e => {
      e.preventDefault();
      ga('call_click', { source: leadSource(), page_location: location.href, cta_text: (a.textContent || '').trim().slice(0, 60) });
      open();
    });
  });

  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const hp = form.querySelector('input[name="company"]');
    if (hp && hp.value) { return; } // honeypot -> silently drop
    const btn = form.querySelector('.cback__send');
    if (btn) { btn.disabled = true; }
    const fd = new FormData(form);
    const phone = (fd.get('phone') || '').toString().trim();
    // Phone-only capture: no name field, so label the CRM contact by the number.
    const data = { name: 'Phone lead ' + phone, phone: phone, company: fd.get('company') || '' };
    ga('form_submit', { source: leadSource(), form: 'callback', lead_type: 'call', converted: true, page_location: location.href });
    ga('call_click', { source: leadSource(), form: 'callback', page_location: location.href });

    // Capture the number to the CRM FIRST (best-effort, fire-and-forget), then dial.
    const payload = buildLeadPayload(data, { form: 'callback', lead_type: 'call' });
    payload.lead_type = 'call';
    payload.tags = (payload.tags || []).slice();
    if (payload.tags.indexOf('ligacao') === -1) payload.tags.unshift('ligacao');
    try { postLead(payload); } catch (err) {} // do NOT await — never block the call

    // Show the "connecting" state and dial the real number right away.
    if (box) box.classList.add('sent');
    if (doneEl) doneEl.classList.add('show');
    setTimeout(() => { try { window.location.href = callHref; } catch (err) {} resetBtn(); }, 150);
  });
}

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
      // Honeypot: a filled "company" field means a bot -> silently drop.
      const hp = form.querySelector('input[name="company"]');
      if (hp && hp.value) { return; }
      const btn = form.querySelector('.wsend');
      if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
      // pull the contact fields the visitor typed in step 4
      const fd = new FormData(form);
      data.name = fd.get('name') || '';
      data.email = fd.get('email') || '';
      data.phone = fd.get('phone') || '';
      data.city = fd.get('city') || data.city || '';
      data.company = fd.get('company') || '';
      // Conversion event (key conversion). Fires regardless of endpoint availability.
      ga('form_submit', { source: leadSource(), form: 'estimate_wizard', service: data.service || '', converted: true, page_location: location.href });
      const finish = () => {
        steps.forEach(s => s.classList.remove('active'));
        if (nav) nav.style.display = 'none';
        if (done) done.classList.add('show');
      };
      // reCAPTCHA -> build payload -> POST to CRM endpoint (n8n -> GHL). Always show thank-you.
      getRecaptcha('estimate_wizard').then((token) => {
        const payload = buildLeadPayload(data, { recaptchaToken: token, form: 'estimate_wizard' });
        return postLead(payload);
      }).then(() => {
        setTimeout(finish, 250);
      }).catch(() => { setTimeout(finish, 250); });
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

