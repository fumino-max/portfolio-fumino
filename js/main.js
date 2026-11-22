/* FUMINOWA DESIGN — Main JS */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initFaq();
  initContactForm();
  initFoam();
  initWaCircles();
  initContactTabs();
});

/* ---- Navigation Drawer ---- */
function initNav() {
  const triggers = document.querySelectorAll('[data-nav-toggle]');
  const overlay  = document.querySelector('.nav-overlay');
  const drawer   = document.querySelector('.nav-drawer');
  const closeBtn = document.querySelector('.nav-drawer__close');

  if (!drawer) return;

  function openNav() {
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  triggers.forEach(btn => btn.addEventListener('click', openNav));
  if (closeBtn) closeBtn.addEventListener('click', closeNav);
  if (overlay)  overlay.addEventListener('click', closeNav);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
  });
}

/* ---- FAQ Accordion ---- */
function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-item__q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      items.forEach(i => i.classList.remove('is-open'));
      if (!isOpen) item.classList.add('is-open');
    });
  });
}

/* ---- Beer Foam Transition ---- */
function initFoam() {
  const divider = document.querySelector('.foam-divider');
  if (!divider) return;

  let fired = false;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !fired) {
        fired = true;
        divider.classList.add('is-active');
      }
    });
  }, { threshold: 0.1 });

  obs.observe(divider);
}

/* ---- THREE WA float-up animations ---- */
function initWaCircles() {
  const items = document.querySelectorAll('.wa-item');
  if (!items.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  items.forEach(el => obs.observe(el));
}

/* ---- Contact Tabs ---- */
function initContactTabs() {
  const tabs = document.querySelectorAll('.contact-tab');
  if (!tabs.length) return;

  function selectTab(tab) {
      tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.contact-tab-panel').forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      const panel = document.getElementById('tab-' + tab.dataset.tab);
      if (panel) panel.classList.add('is-active');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => selectTab(tab));
  });

  if (new URLSearchParams(window.location.search).get('type') === 'hearing') {
    const hearingTab = document.querySelector('.contact-tab[data-tab="hearing"]');
    if (hearingTab) selectTab(hearingTab);
  }
}

/* ---- Contact Form Validation & Submit ---- */
function initContactForm() {
  document.querySelectorAll('.contact-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      let valid = true;

      form.querySelectorAll('[data-required]').forEach(field => {
        const group = field.closest('.form-group');
        if (!field.value.trim()) {
          group.classList.add('has-error');
          valid = false;
        } else {
          group.classList.remove('has-error');
        }
      });

      const emailField = form.querySelector('[type="email"]');
      if (emailField) {
        const emailGroup = emailField.closest('.form-group');
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(emailField.value.trim())) {
          emailGroup.classList.add('has-error');
          valid = false;
        } else {
          emailGroup.classList.remove('has-error');
        }
      }

      if (form.classList.contains('hearing-form')) {
        const serviceGroup = form.querySelector('#h-service-label')?.closest('.form-group');
        if (serviceGroup && !serviceGroup.querySelector('input[name="h_service[]"]:checked')) {
          serviceGroup.classList.add('has-error');
          valid = false;
        } else {
          serviceGroup?.classList.remove('has-error');
        }
      }

      if (!valid) return;

      const data = new FormData(form);
      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      })
      .then(res => {
        if (res.ok) {
          // GA4: 送信成功時のみ計測(お問い合わせ / ヒアリングシートを区別)
          if (typeof gtag === 'function') {
            gtag('event', 'generate_lead', {
              form_name: form.classList.contains('hearing-form') ? 'hearing_sheet' : 'inquiry'
            });
          }
          form.style.display = 'none';
          const thanks = document.querySelector('.contact-thanks');
          document.querySelector('.contact-tabs')?.setAttribute('hidden', '');
          document.querySelectorAll('.contact-tab-panel').forEach(panel => panel.setAttribute('hidden', ''));
          if (thanks) {
            thanks.classList.add('is-visible');
            thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          alert('送信に失敗しました。お手数ですがSNSよりご連絡ください。');
        }
      })
      .catch(() => {
        alert('通信エラーが発生しました。お手数ですがSNSよりご連絡ください。');
      })
      .finally(() => {
        if (submitButton) submitButton.disabled = false;
      });
    });

    form.querySelectorAll('[data-required], [type="email"]').forEach(field => {
      field.addEventListener('input', () => {
        field.closest('.form-group')?.classList.remove('has-error');
      });
    });
    form.querySelectorAll('input[name="h_service[]"]').forEach(field => {
      field.addEventListener('change', () => field.closest('.form-group')?.classList.remove('has-error'));
    });
  });
}
