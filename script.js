const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
toggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
}));
document.querySelector('#year').textContent = new Date().getFullYear();

/* ===== Avaliações ===== */
const WHATS_AVALIACAO = '5575981516165';
/* Avaliações aprovadas aparecem aqui. Formato: { nome: 'Maria', nota: 5, texto: 'Ótimo atendimento!', servico: 'Sofá' } */
const REVIEWS = [];
const LABELS = ['', 'Poderia ser melhor', 'Regular', 'Bom', 'Muito bom', 'Excelente!'];
(() => {
  const dlg = document.getElementById('reviewDialog');
  const form = document.getElementById('reviewForm');
  const thanks = document.getElementById('thanks');
  const label = document.getElementById('starLabel');
  const err = document.getElementById('formError');
  const rowBtns = [...document.querySelectorAll('#starRow .star-btn')];
  const pickBtns = [...document.querySelectorAll('.rating-pick .star-btn')];
  let rating = 0;

  const paint = (n) => rowBtns.forEach((b, i) => b.classList.toggle('on', i < n));
  const setRating = (n) => { rating = n; paint(n); label.textContent = LABELS[n] || 'Toque nas estrelas para dar sua nota'; err.hidden = true; };
  const openDlg = (n = 0) => {
    form.hidden = false; thanks.hidden = true; setRating(n);
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else { dlg.setAttribute('open', ''); }
  };
  const closeDlg = () => { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };

  document.getElementById('openReview').addEventListener('click', () => openDlg(0));
  pickBtns.forEach((b, i) => {
    b.addEventListener('mouseenter', () => pickBtns.forEach((x, j) => x.classList.toggle('hl', j <= i)));
    b.addEventListener('click', () => openDlg(i + 1));
  });
  document.querySelector('.rating-pick').addEventListener('mouseleave', () => pickBtns.forEach(x => x.classList.remove('hl')));
  rowBtns.forEach((b, i) => {
    b.addEventListener('mouseenter', () => paint(i + 1));
    b.addEventListener('click', () => setRating(i + 1));
  });
  document.getElementById('starRow').addEventListener('mouseleave', () => paint(rating));
  document.getElementById('closeReview').addEventListener('click', closeDlg);
  document.getElementById('thanksClose').addEventListener('click', closeDlg);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDlg(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!rating) { err.hidden = false; return; }
    const d = new FormData(form);
    const nome = (d.get('name') || '').toString().trim();
    const serv = (d.get('service') || '').toString().trim();
    const com = (d.get('comment') || '').toString().trim();
    let msg = 'Olá, FSA Clean! Quero deixar minha avaliação:\n' + '★'.repeat(rating) + '☆'.repeat(5 - rating) + ' (' + rating + '/5)';
    if (nome) msg += '\nNome: ' + nome;
    if (serv) msg += '\nServiço: ' + serv;
    if (com) msg += '\nComentário: ' + com;
    window.open('https://wa.me/' + WHATS_AVALIACAO + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    form.hidden = true; thanks.hidden = false; form.reset();
  });

  /* Resumo e lista de avaliações aprovadas */
  if (REVIEWS.length) {
    const avg = REVIEWS.reduce((s, r) => s + r.nota, 0) / REVIEWS.length;
    const n = Math.round(avg);
    document.getElementById('sumStars').innerHTML = '<span class="on">' + '★'.repeat(n) + '</span>' + '★'.repeat(5 - n);
    document.getElementById('sumTitle').textContent = avg.toFixed(1).replace('.', ',') + ' de 5 · ' + REVIEWS.length + (REVIEWS.length === 1 ? ' avaliação' : ' avaliações');
    document.getElementById('sumSub').textContent = 'Clientes que avaliaram a FSA Clean';
    const list = document.getElementById('reviewList');
    REVIEWS.forEach((r) => {
      const c = document.createElement('div'); c.className = 'review-card';
      const s = document.createElement('div'); s.className = 'rc-stars'; s.textContent = '★'.repeat(r.nota) + '☆'.repeat(5 - r.nota);
      const p = document.createElement('p'); p.textContent = r.texto || '';
      const sm = document.createElement('small'); sm.textContent = r.nome + (r.servico ? ' · ' + r.servico : '');
      c.append(s, p, sm); list.append(c);
    });
    list.hidden = false;
  }
})();

/* ===== Cabeçalho, animações ao rolar ===== */
(() => {
  const header = document.querySelector('.header');
  let tick = false;
  const onScroll = () => { header?.classList.toggle('scrolled', window.scrollY > 8); tick = false; };
  window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  const sel = ['.section-heading', '.center-heading', '.results-copy', '.faq-layout > div:first-child', '.pets-grid > div:last-child', '.pets-photo', '.quote-copy', '.quote-card', '.service-card', '.gallery figure', '.gallery-note', '.process-grid article', '.faq-list details', '.cta-inner > div', '.cta-buttons'];
  const els = [...document.querySelectorAll(sel.join(','))];
  els.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    let i = 0;
    entries.filter(e => e.isIntersecting).forEach((e) => {
      const el = e.target, d = Math.min(i++, 5) * 0.09;
      el.style.setProperty('--d', d + 's');
      el.classList.add('in');
      io.unobserve(el);
      setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.removeProperty('--d'); }, 1100 + d * 1000);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach((el) => io.observe(el));
})();

/* ===== Orçamento rápido (WhatsApp) ===== */
(() => {
  const form = document.getElementById('quoteForm');
  if (!form) return;
  const WHATS = '5575981516165';
  const steps = [...form.querySelectorAll('.q-step')];
  const bar = document.getElementById('qBar'), count = document.getElementById('qCount');
  const back = document.getElementById('qBack'), next = document.getElementById('qNext'), send = document.getElementById('qSend');
  const err = document.getElementById('qError'), out = document.getElementById('qLugares');
  const bairro = document.getElementById('qBairro'), nome = document.getElementById('qNome');
  const data = { estofado: [], lugares: 1, tecido: '', tempo: '' };
  let cur = 1;

  const chipsOf = (id) => [...document.querySelectorAll('#' + id + ' .q-chip')];
  const validate = () => {
    if (cur === 1) return bairro.value.trim() ? '' : 'Informe o seu bairro para continuar.';
    if (cur === 2) return data.estofado.length ? '' : 'Escolha pelo menos um estofado.';
    if (cur === 4) return data.tecido ? '' : 'Escolha o tipo de tecido.';
    if (cur === 5) return data.tempo ? '' : 'Escolha uma opção.';
    return '';
  };
  const show = (n) => {
    cur = n;
    steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    const q = Math.min(n, 5);
    bar.style.width = (n === 6 ? 100 : q * 20) + '%';
    count.textContent = n === 6 ? 'Revise e envie' : 'Pergunta ' + q + ' de 5';
    back.hidden = n === 1; next.hidden = n === 6; send.hidden = n !== 6; err.hidden = true;
    if (n === 6) {
      const sm = document.getElementById('qSummary'); sm.textContent = '';
      [['Bairro', bairro.value.trim()], ['Estofado', data.estofado.join(', ')], ['Lugares', String(data.lugares)], ['Tecido', data.tecido], ['Última limpeza', data.tempo]].forEach(([k, v]) => {
        const li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('strong');
        a.textContent = k; b.textContent = v; li.append(a, b); sm.append(li);
      });
    }
  };
  const go = () => { const m = validate(); if (m) { err.textContent = m; err.hidden = false; return; } if (cur < 6) show(cur + 1); };
  next.addEventListener('click', go);
  back.addEventListener('click', () => { if (cur > 1) show(cur - 1); });
  bairro.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  chipsOf('qEstofado').forEach((c) => c.addEventListener('click', () => {
    const on = c.getAttribute('aria-pressed') !== 'true';
    c.setAttribute('aria-pressed', String(on)); err.hidden = true;
    data.estofado = chipsOf('qEstofado').filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.textContent);
  }));
  const single = (id, key) => chipsOf(id).forEach((c) => c.addEventListener('click', () => {
    chipsOf(id).forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    data[key] = c.textContent; err.hidden = true;
    setTimeout(() => { if (cur === (key === 'tecido' ? 4 : 5)) go(); }, 280);
  }));
  single('qTecido', 'tecido'); single('qTempo', 'tempo');
  const setL = (n) => { data.lugares = Math.max(1, Math.min(20, n)); out.textContent = data.lugares; };
  document.getElementById('qMinus').addEventListener('click', () => setL(data.lugares - 1));
  document.getElementById('qPlus').addEventListener('click', () => setL(data.lugares + 1));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cur !== 6) { go(); return; }
    let msg = 'Olá, FSA Clean! Gostaria de um orçamento:\n\n';
    msg += '\u{1F4CD} Bairro: ' + bairro.value.trim() + '\n';
    msg += '\u{1F6CB}\uFE0F Estofado: ' + data.estofado.join(', ') + '\n';
    msg += '\u{1F465} Lugares: ' + data.lugares + '\n';
    msg += '\u{1F9F5} Tecido: ' + data.tecido + '\n';
    msg += '\u23F1\uFE0F Última limpeza: ' + data.tempo;
    if (nome.value.trim()) msg += '\n\u{1F64B} Nome: ' + nome.value.trim();
    window.open('https://wa.me/' + WHATS + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });
  show(1);
})();
