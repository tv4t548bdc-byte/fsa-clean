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

/* ===== Avaliações (salvas no Supabase; só aparecem depois de aprovadas) ===== */
const LABELS = ['', 'Poderia ser melhor', 'Regular', 'Bom', 'Muito bom', 'Excelente!'];
(() => {
  const dlg = document.getElementById('reviewDialog');
  const form = document.getElementById('reviewForm');
  const thanks = document.getElementById('thanks');
  const label = document.getElementById('starLabel');
  const err = document.getElementById('formError');
  const rowBtns = [...document.querySelectorAll('#starRow .star-btn')];
  const pickBtns = [...document.querySelectorAll('.rating-pick .star-btn')];
  let rating = 0, sending = false;

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!rating) { err.textContent = 'Escolha uma nota de 1 a 5 estrelas.'; err.hidden = false; return; }
    const db = window.fsaDb && window.fsaDb();
    if (!db) { err.textContent = 'Não foi possível enviar agora. Tente novamente mais tarde.'; err.hidden = false; return; }
    const d = new FormData(form);
    const nome = (d.get('name') || '').toString().trim() || 'Cliente';
    const serv = (d.get('service') || '').toString().trim();
    const com = (d.get('comment') || '').toString().trim();
    const btn = form.querySelector('button[type=submit]'); sending = true; btn.disabled = true;
    const { error } = await db.from('avaliacoes').insert({ nome: nome.slice(0, 60), nota: rating, comentario: com || null, servico: serv || null });
    sending = false; btn.disabled = false;
    if (error) { err.textContent = 'Não foi possível enviar sua avaliação. Tente novamente.'; err.hidden = false; return; }
    form.hidden = true; thanks.hidden = false; form.reset(); setRating(0);
  });

  /* Resumo e lista de avaliações APROVADAS (vindas do Supabase) */
  const render = (list) => {
    if (!list.length) return;
    const avg = list.reduce((s, r) => s + r.nota, 0) / list.length;
    const n = Math.round(avg);
    document.getElementById('sumStars').innerHTML = '<span class="on">' + '★'.repeat(n) + '</span>' + '★'.repeat(5 - n);
    document.getElementById('sumTitle').textContent = avg.toFixed(1).replace('.', ',') + ' de 5 · ' + list.length + (list.length === 1 ? ' avaliação' : ' avaliações');
    document.getElementById('sumSub').textContent = 'Clientes que avaliaram a FSA Clean';
    const box = document.getElementById('reviewList'); box.textContent = '';
    list.forEach((r) => {
      const c = document.createElement('div'); c.className = 'review-card';
      const s = document.createElement('div'); s.className = 'rc-stars'; s.textContent = '★'.repeat(r.nota) + '☆'.repeat(5 - r.nota);
      const p = document.createElement('p'); p.textContent = r.comentario || '';
      const sm = document.createElement('small'); sm.textContent = r.nome + (r.servico ? ' · ' + r.servico : '');
      c.append(s); if (r.comentario) c.append(p); c.append(sm); box.append(c);
    });
    box.hidden = false;
  };
  window.addEventListener('load', async () => {
    const db = window.fsaDb && window.fsaDb(); if (!db) return;
    try {
      const { data, error } = await db.from('avaliacoes').select('nome,nota,comentario,servico,created_at').eq('status', 'aprovada').order('created_at', { ascending: false }).limit(12);
      if (!error && data) render(data);
    } catch (_) { /* sem avaliações públicas por enquanto */ }
  });
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

/* ===== Orçamento: salva no Supabase (NÃO abre o WhatsApp) ===== */
(() => {
  const form = document.getElementById('quoteForm');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const err = $('qfError'), btn = $('qfSend'), btnLabel = $('qfSendLabel'), done = $('qfDone');
  const sizeBox = $('qfSizeBox'), qtyBox = $('qfQtyBox'), qtyOut = $('qfQty'), qtyLabel = $('qfQtyLabel');
  const fileInput = $('qfFiles'), grid = $('qfPreviews');
  const MAX_FILES = 3, MAX_MB = 25;
  const QTY = { 'Sofá': 'Quantos lugares tem o sofá?', 'Colchão': 'Quantos colchões?', 'Cadeiras': 'Quantas cadeiras?', 'Poltronas': 'Quantas poltronas?', 'Automotivo': 'Quantos bancos?' };
  const state = { qty: 1, tamanho: '', pets: null };
  let files = [], busy = false;

  const chips = (id) => [...document.querySelectorAll('#' + id + ' .q-chip')];
  const fail = (m) => { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const setQty = (n) => { state.qty = Math.max(1, Math.min(30, n)); qtyOut.textContent = state.qty; };

  form.tipo.addEventListener('change', () => {
    const t = form.tipo.value;
    sizeBox.hidden = t !== 'Colchão';
    qtyBox.hidden = !QTY[t];
    if (QTY[t]) qtyLabel.textContent = QTY[t];
    setQty(t === 'Sofá' ? 3 : 1); err.hidden = true;
  });
  $('qfMinus').addEventListener('click', () => setQty(state.qty - 1));
  $('qfPlus').addEventListener('click', () => setQty(state.qty + 1));
  chips('qfTamanho').forEach((c) => c.addEventListener('click', () => { chips('qfTamanho').forEach(x => x.setAttribute('aria-pressed', String(x === c))); state.tamanho = c.textContent; err.hidden = true; }));
  chips('qfPets').forEach((c, i) => c.addEventListener('click', () => { chips('qfPets').forEach(x => x.setAttribute('aria-pressed', String(x === c))); state.pets = i === 0; err.hidden = true; }));

  /* máscara simples de telefone: (75) 99999-9999 */
  form.whatsapp.addEventListener('input', () => {
    const d = form.whatsapp.value.replace(/\D/g, '').slice(0, 11);
    form.whatsapp.value = d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length > 10 ? 7 : 6) + '-' + d.slice(d.length > 10 ? 7 : 6)
      : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d;
  });

  /* arquivos: até 3, com pré-visualização */
  const render = () => {
    grid.textContent = '';
    files.forEach((f, i) => {
      const t = document.createElement('div'); t.className = 'q-thumb';
      const url = URL.createObjectURL(f);
      if (f.type.startsWith('video/')) {
        const v = document.createElement('video'); v.src = url + '#t=0.1'; v.muted = true; v.playsInline = true; v.preload = 'metadata';
        const tag = document.createElement('span'); tag.className = 'q-tag'; tag.textContent = 'Vídeo'; t.append(v, tag);
      } else { const im = document.createElement('img'); im.src = url; im.alt = 'Arquivo ' + (i + 1); t.append(im); }
      const x = document.createElement('button'); x.type = 'button'; x.className = 'q-x'; x.setAttribute('aria-label', 'Remover'); x.textContent = '\u00d7';
      x.addEventListener('click', () => { URL.revokeObjectURL(url); files.splice(i, 1); render(); });
      t.append(x); grid.append(t);
    });
  };
  fileInput.addEventListener('change', () => {
    err.hidden = true; let msg = '';
    [...fileInput.files].forEach((f) => {
      if (files.length >= MAX_FILES) { msg = 'Você pode enviar até ' + MAX_FILES + ' arquivos.'; return; }
      if (f.size > MAX_MB * 1048576) { msg = 'Um arquivo passou de ' + MAX_MB + ' MB e não foi adicionado.'; return; }
      if (!/^(image|video)\//.test(f.type)) { msg = 'Envie apenas fotos ou vídeos.'; return; }
      files.push(f);
    });
    fileInput.value = ''; if (msg) fail(msg); render();
  });

  const shrink = async (file) => {
    if (!file.type.startsWith('image/')) return file;
    try {
      const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.82));
      return blob && blob.size < file.size ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file;
    } catch (_) { return file; }
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
  const extOf = (f) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' }[f.type] || 'bin');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    if (form.site.value) { form.hidden = true; done.hidden = false; return; }   /* antispam (campo invisível) */
    const nome = form.nome.value.trim(), bairro = form.bairro.value.trim(), tipo = form.tipo.value, tecido = form.tecido.value;
    let tel = form.whatsapp.value.replace(/\D/g, '');
    if (nome.length < 2) return fail('Informe o seu nome.');
    if (tel.length < 10 || tel.length > 11) return fail('Informe um WhatsApp válido, com DDD.');
    if (bairro.length < 2) return fail('Informe o seu bairro.');
    if (!tipo) return fail('Escolha o tipo de estofado.');
    if (tipo === 'Colchão' && !state.tamanho) return fail('Escolha o tamanho do colchão.');
    if (!tecido) return fail('Escolha o tipo de tecido.');
    if (state.pets === null) return fail('Informe se possui pets ou manchas.');
    const db = window.fsaDb && window.fsaDb();
    if (!db) return fail('Não foi possível enviar agora. Tente novamente em instantes.');
    if (tel.length <= 11) tel = '55' + tel;
    busy = true; btn.disabled = true; err.hidden = true; btnLabel.textContent = 'Enviando...';
    try {
      const id = uuid(), paths = [];
      for (let i = 0; i < files.length; i++) {
        btnLabel.textContent = 'Enviando arquivo ' + (i + 1) + ' de ' + files.length + '...';
        const f = await shrink(files[i]);
        const path = id + '/' + (i + 1) + '-' + Math.random().toString(36).slice(2, 8) + '.' + extOf(f);
        const up = await db.storage.from('orcamentos-fotos').upload(path, f, { contentType: f.type, upsert: false });
        if (up.error) throw up.error;
        paths.push(path);
      }
      btnLabel.textContent = 'Finalizando...';
      const ins = await db.from('orcamentos').insert({
        id, nome, whatsapp: tel, bairro, tipo_estofado: tipo,
        quantidade: QTY[tipo] ? state.qty : 1,
        tamanho: tipo === 'Colchão' ? state.tamanho : (tipo === 'Sofá' ? state.qty + ' lugares' : null),
        tipo_tecido: tecido, pets_manchas: !!state.pets,
        detalhes: form.detalhes.value.trim() || null, fotos: paths
      });
      if (ins.error) throw ins.error;
      form.hidden = true; done.hidden = false; done.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (_) {
      fail('Não foi possível enviar agora. Confira sua conexão e tente novamente.');
    } finally { busy = false; btn.disabled = false; btnLabel.textContent = 'Enviar solicitação'; }
  });
})();

/* ===== Animação de entrada do topo: toca quando a seção aparece ===== */
(() => {
  const hero = document.getElementById('inicio');
  if (!hero) return;
  if (!('IntersectionObserver' in window)) { hero.classList.add('play'); return; }
  const io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { hero.classList.add('play'); io.disconnect(); } }, { threshold: 0.12 });
  io.observe(hero);
})();
