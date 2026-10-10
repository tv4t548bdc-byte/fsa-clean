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

/* ===== Orçamento rápido (respostas + fotos/vídeos enviados juntos) ===== */
(() => {
  const form = document.getElementById('quoteForm');
  if (!form) return;
  const WHATS = '5575981516165', MAX = 10, MAXMB = 100;
  const steps = [...form.querySelectorAll('.q-step')];
  const bar = document.getElementById('qBar'), count = document.getElementById('qCount');
  const back = document.getElementById('qBack'), next = document.getElementById('qNext'), send = document.getElementById('qSend');
  const err = document.getElementById('qError'), out = document.getElementById('qLugares'), sendNote = document.getElementById('qSendNote');
  const bairro = document.getElementById('qBairro'), nome = document.getElementById('qNome');
  const sofaBox = document.getElementById('qSofaBox'), colBox = document.getElementById('qColchaoBox');
  const data = { estofado: [], lugares: 3, colchao: '', tecido: '', tempo: '' };
  let files = [], cur = 1;
  const has = (t) => data.estofado.includes(t);
  const order = () => [1, 2, (has('Sofá') || has('Colchão')) ? 3 : 0, 4, 5, 6, 7].filter(Boolean);
  const chipsOf = (id) => [...document.querySelectorAll('#' + id + ' .q-chip')];
  const canShareFiles = () => !!(files.length && navigator.canShare && navigator.share && navigator.canShare({ files }));

  const validate = () => {
    if (cur === 1) return bairro.value.trim() ? '' : 'Informe o seu bairro para continuar.';
    if (cur === 2) return data.estofado.length ? '' : 'Escolha pelo menos um estofado.';
    if (cur === 3) return (has('Colchão') && !data.colchao) ? 'Escolha o tipo do colchão.' : '';
    if (cur === 4) return data.tecido ? '' : 'Escolha o tipo de tecido.';
    if (cur === 5) return data.tempo ? '' : 'Escolha uma opção.';
    return '';
  };
  const lines = () => {
    const L = [['Bairro', bairro.value.trim()], ['Estofado', data.estofado.join(', ')]];
    if (has('Sofá')) L.push(['Lugares do sofá', String(data.lugares)]);
    if (has('Colchão')) L.push(['Tipo de colchão', data.colchao]);
    L.push(['Tecido', data.tecido], ['Última limpeza', data.tempo]);
    if (files.length) L.push(['Fotos e vídeos', files.length + (files.length === 1 ? ' arquivo' : ' arquivos')]);
    return L;
  };
  const show = (n) => {
    cur = n; const o = order(), idx = o.indexOf(n), total = o.length - 1;
    steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    if (n === 3) { sofaBox.hidden = !has('Sofá'); colBox.hidden = !has('Colchão'); }
    bar.style.width = (n === 7 ? 100 : ((idx + 1) / total) * 100) + '%';
    count.textContent = n === 7 ? 'Revise e envie' : 'Passo ' + (idx + 1) + ' de ' + total;
    back.hidden = n === 1; next.hidden = n === 7; send.hidden = n !== 7; err.hidden = true; sendNote.hidden = n !== 7;
    next.firstChild.textContent = (n === 6 && !files.length) ? 'Pular e continuar ' : 'Continuar ';
    if (n === 7) {
      const sm = document.getElementById('qSummary'); sm.textContent = '';
      lines().forEach(([k, v]) => { const li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('strong'); a.textContent = k; b.textContent = v; li.append(a, b); sm.append(li); });
      sendNote.textContent = !files.length ? 'O WhatsApp abre com as suas respostas prontas para enviar.'
        : canShareFiles() ? 'Ao enviar, escolha o WhatsApp e a conversa da FSA Clean: suas respostas e os arquivos seguem juntos. Se o texto não aparecer, cole: ele já foi copiado.'
        : 'O WhatsApp abre com as suas respostas. Depois, toque no clipe e anexe as fotos e vídeos escolhidos.';
    }
  };
  const go = () => { const m = validate(); if (m) { err.textContent = m; err.hidden = false; return; } const o = order(); if (cur < 7) show(o[o.indexOf(cur) + 1]); };
  next.addEventListener('click', go);
  back.addEventListener('click', () => { const o = order(), i = o.indexOf(cur); if (i > 0) show(o[i - 1]); });
  bairro.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  chipsOf('qEstofado').forEach((c) => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); err.hidden = true;
    data.estofado = chipsOf('qEstofado').filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.textContent);
  }));
  const single = (id, key, stepNo, auto) => chipsOf(id).forEach((c) => c.addEventListener('click', () => {
    chipsOf(id).forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    data[key] = c.textContent; err.hidden = true;
    if (auto) setTimeout(() => { if (cur === stepNo) go(); }, 280);
  }));
  single('qColchao', 'colchao', 3, false); single('qTecido', 'tecido', 4, true); single('qTempo', 'tempo', 5, true);
  const setL = (n) => { data.lugares = Math.max(1, Math.min(20, n)); out.textContent = data.lugares; };
  document.getElementById('qMinus').addEventListener('click', () => setL(data.lugares - 1));
  document.getElementById('qPlus').addEventListener('click', () => setL(data.lugares + 1));

  /* fotos e vídeos */
  const input = document.getElementById('mediaInput'), grid = document.getElementById('mediaPreviews'), merr = document.getElementById('mediaError');
  const render = () => {
    grid.textContent = '';
    files.forEach((f, i) => {
      const t = document.createElement('div'); t.className = 'q-thumb'; const url = URL.createObjectURL(f);
      if (f.type.startsWith('video/')) {
        const v = document.createElement('video'); v.src = url + '#t=0.1'; v.muted = true; v.playsInline = true; v.preload = 'metadata';
        const tag = document.createElement('span'); tag.className = 'q-tag'; tag.textContent = 'Vídeo'; t.append(v, tag);
      } else { const im = document.createElement('img'); im.src = url; im.alt = 'Foto escolhida ' + (i + 1); t.append(im); }
      const x = document.createElement('button'); x.type = 'button'; x.className = 'q-x'; x.setAttribute('aria-label', 'Remover arquivo'); x.textContent = '\u00d7';
      x.addEventListener('click', () => { URL.revokeObjectURL(url); files.splice(i, 1); render(); show(cur); });
      t.append(x); grid.append(t);
    });
  };
  input.addEventListener('change', () => {
    merr.hidden = true; let msg = '';
    [...input.files].forEach((f) => {
      if (files.length >= MAX) { msg = 'Você pode enviar até ' + MAX + ' arquivos.'; return; }
      if (f.size > MAXMB * 1048576) { msg = 'Um arquivo passou de ' + MAXMB + ' MB e não foi adicionado.'; return; }
      if (files.some(x => x.name === f.name && x.size === f.size)) return;
      files.push(f);
    });
    input.value = ''; if (msg) { merr.textContent = msg; merr.hidden = false; }
    render(); show(cur);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cur !== 7) { go(); return; }
    let msg = 'Olá, FSA Clean! Gostaria de um orçamento:\n';
    msg += '\n\u{1F4CD} Bairro: ' + bairro.value.trim();
    msg += '\n\u{1F6CB}\uFE0F Estofado: ' + data.estofado.join(', ');
    if (has('Sofá')) msg += '\n\u{1F4BA} Lugares do sofá: ' + data.lugares;
    if (has('Colchão')) msg += '\n\u{1F6CF}\uFE0F Tipo de colchão: ' + data.colchao;
    msg += '\n\u{1F9F5} Tecido: ' + data.tecido;
    msg += '\n\u23F1\uFE0F Última limpeza: ' + data.tempo;
    if (files.length) msg += '\n\u{1F4CE} Fotos e vídeos: ' + files.length + (files.length === 1 ? ' arquivo' : ' arquivos');
    if (nome.value.trim()) msg += '\n\u{1F64B} Nome: ' + nome.value.trim();
    const wa = () => window.open('https://wa.me/' + WHATS + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    if (canShareFiles()) {
      try { navigator.clipboard && navigator.clipboard.writeText(msg).catch(() => {}); } catch (_) {}
      navigator.share({ files, text: msg }).catch((er) => { if (!er || er.name !== 'AbortError') wa(); });
    } else { wa(); }
  });
  show(1);
})();

/* ===== Animação de entrada do topo: toca quando a seção aparece ===== */
(() => {
  const hero = document.getElementById('inicio');
  if (!hero) return;
  if (!('IntersectionObserver' in window)) { hero.classList.add('play'); return; }
  const io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { hero.classList.add('play'); io.disconnect(); } }, { threshold: 0.12 });
  io.observe(hero);
})();
