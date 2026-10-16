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
  const fotosInput = $('qfFiles'), grid = $('qfPreviews');
  const MAX_FILES = 20, MAX_MB = 25, MAX_TOTAL_MB = 100;
  const state = { pets: null, manchas: null };
  let files = [], busy = false, pendingId = null;

  const chips = (id) => [...document.querySelectorAll('#' + id + ' .q-chip')];
  const fail = (m) => { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };

  /* ---- agenda: o cliente escolhe um dia e horário publicados pela equipe ---- */
  const AGENDA = { ativo: true, obrigatorio: false, diasVisiveis: 30 };
  const agBox = $('qfAgenda'), diasBox = $('qfDias'), horasBox = $('qfHoras'), agNota = $('qfAgNota');
  const DIASN = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], hhm = (t) => String(t).slice(0, 5);
  const lbDia = (s2) => { const [y, mo, d0] = s2.split('-').map(Number); return DIASN[new Date(y, mo - 1, d0).getDay()] + ' ' + String(d0).padStart(2, '0') + '/' + String(mo).padStart(2, '0'); };
  const lbHor = (x) => lbDia(x.data) + ', ' + hhm(x.inicio) + ' às ' + hhm(x.fim);
  let slots = [], diaSel = ''; state.horario = null;
  const renderAg = () => {
    diasBox.textContent = ''; horasBox.textContent = '';
    [...new Set(slots.map((x) => x.data))].forEach((dd) => {
      const c = mk('button', 'q-chip', lbDia(dd)); c.type = 'button'; c.setAttribute('aria-pressed', String(dd === diaSel));
      c.addEventListener('click', () => { diaSel = dd; if (state.horario && state.horario.data !== dd) state.horario = null; renderAg(); err.hidden = true; }); diasBox.append(c);
    });
    const nb = mk('button', 'q-chip', 'Sem preferência'); nb.type = 'button'; nb.setAttribute('aria-pressed', String(!state.horario && !diaSel));
    nb.addEventListener('click', () => { diaSel = ''; state.horario = null; renderAg(); }); diasBox.append(nb);
    slots.filter((x) => x.data === diaSel).forEach((x) => {
      const c = mk('button', 'q-chip', hhm(x.inicio) + ' às ' + hhm(x.fim)); c.type = 'button'; c.setAttribute('aria-pressed', String(!!state.horario && state.horario.id === x.id));
      c.addEventListener('click', () => { state.horario = x; renderAg(); err.hidden = true; }); horasBox.append(c);
    });
    agNota.textContent = state.horario ? 'Horário escolhido: ' + lbHor(state.horario) + '. A equipe confirma com você.' : (slots.length ? 'Escolha um dia e depois o horário, ou deixe "Sem preferência" e combinamos pelo WhatsApp.' : '');
  };
  const loadSlots = async () => {
    const d0 = window.fsaDb && window.fsaDb(); if (!d0 || !AGENDA.ativo) return;
    try { const r = await d0.rpc('horarios_disponiveis', { p_dias: AGENDA.diasVisiveis }); if (r.error) throw r.error; slots = r.data || []; }
    catch (_) { agBox.hidden = true; return; }                       /* sem agenda disponível: o formulário segue normal */
    if (state.horario && !slots.some((x) => x.id === state.horario.id)) state.horario = null;
    if (diaSel && !slots.some((x) => x.data === diaSel)) diaSel = '';
    agBox.hidden = false;
    if (!slots.length) { diasBox.textContent = ''; horasBox.textContent = ''; agNota.textContent = 'No momento não há horários publicados. Envie o pedido e nossa equipe combina o melhor horário com você pelo WhatsApp.'; return; }
    renderAg();
  };
  loadSlots();

  /* ---- vários itens no mesmo pedido (pacote) ---- */
  const TIPOS = ['Sofá', 'Colchão', 'Cadeiras', 'Poltronas', 'Automotivo', 'Outro'];
  const QTYLABEL = { 'Sofá': 'Quantos lugares tem o sofá?', 'Colchão': 'Quantos colchões?', 'Cadeiras': 'Quantas cadeiras?', 'Poltronas': 'Quantas poltronas?', 'Automotivo': 'Quantos bancos?' };
  const QTYDEF = { 'Sofá': 3, 'Colchão': 1, 'Cadeiras': 4, 'Poltronas': 1, 'Automotivo': 1 };
  const SIZES = ['Solteiro', 'Casal', 'Queen', 'King', 'Não sei informar'];
  const MAX_ITENS = 8;
  const itens = [];                                   /* { tipo, qty, tamanho, descricao } */
  const itensBox = $('qfItens'), addBtn = $('qfAddItem');
  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const buildDetail = (it, wrap) => {
    wrap.textContent = '';
    if (!it.tipo) return;
    if (it.tipo === 'Colchão') {
      wrap.append(mk('span', 'qf-label', 'Tamanho do colchão'));
      const cb = mk('div', 'q-chips');
      SIZES.forEach((sz) => {
        const c = mk('button', 'q-chip', sz); c.type = 'button'; c.setAttribute('aria-pressed', String(it.tamanho === sz));
        c.addEventListener('click', () => { it.tamanho = sz; [...cb.children].forEach((x) => x.setAttribute('aria-pressed', String(x === c))); err.hidden = true; });
        cb.append(c);
      });
      wrap.append(cb);
    }
    if (it.tipo === 'Outro') {
      const lab = mk('label', 'qf-itemlabel', 'Descreva o item'), inp = mk('input'); inp.type = 'text'; inp.maxLength = 40; inp.placeholder = 'Ex.: puff, cabeceira, banco de moto'; inp.value = it.descricao || '';
      inp.addEventListener('input', () => { it.descricao = inp.value; }); lab.append(inp); wrap.append(lab); return;
    }
    wrap.append(mk('span', 'qf-label', QTYLABEL[it.tipo] + (it.tipo === 'Colchão' ? '' : '')));
    const st = mk('div', 'q-stepper'), minus = mk('button', null, '\u2212'), out = mk('output', null, String(it.qty)), plus = mk('button', null, '+');
    minus.type = 'button'; plus.type = 'button'; minus.setAttribute('aria-label', 'Diminuir'); plus.setAttribute('aria-label', 'Aumentar');
    const set = (n) => { it.qty = Math.max(1, Math.min(30, n)); out.textContent = it.qty; };
    minus.addEventListener('click', () => set(it.qty - 1)); plus.addEventListener('click', () => set(it.qty + 1));
    st.append(minus, out, plus); wrap.append(st);
  };
  const refreshItems = () => { addBtn.hidden = itens.length >= MAX_ITENS; [...itensBox.children].forEach((r) => { r.querySelector('.qi-del').hidden = itens.length <= 1; }); };
  const addItem = () => {
    if (itens.length >= MAX_ITENS) return;
    const it = { tipo: '', qty: 1, tamanho: '', descricao: '' }; itens.push(it);
    const row = mk('div', 'qf-item'), head = mk('div', 'qf-item-head'), sel = mk('select'), detail = mk('div', 'qf-sub');
    sel.setAttribute('aria-label', 'Tipo de estofado');
    const o0 = mk('option', null, 'Selecione o tipo de estofado'); o0.value = ''; sel.append(o0);
    TIPOS.forEach((t) => sel.append(mk('option', null, t)));
    const del = mk('button', 'qi-del', '\u00d7'); del.type = 'button'; del.setAttribute('aria-label', 'Remover item');
    sel.addEventListener('change', () => { it.tipo = sel.value; it.qty = QTYDEF[it.tipo] || 1; it.tamanho = ''; it.descricao = ''; buildDetail(it, detail); err.hidden = true; });
    del.addEventListener('click', () => { if (itens.length <= 1) return; itens.splice(itens.indexOf(it), 1); row.remove(); refreshItems(); });
    head.append(sel, del); row.append(head, detail); itensBox.append(row); refreshItems();
  };
  addBtn.addEventListener('click', addItem); addItem();
  const itemText = (it) => it.tipo + (it.tipo === 'Colchão' ? ' ' + it.tamanho : '') + (it.tipo === 'Outro' ? ' (' + it.descricao.trim() + ')' : '') + (it.tipo === 'Sofá' ? ' (' + it.qty + ' lugares)' : (it.tipo !== 'Outro' && it.qty > 1 ? ' x' + it.qty : ''));

  chips('qfPets').forEach((c, i) => c.addEventListener('click', () => { chips('qfPets').forEach(x => x.setAttribute('aria-pressed', String(x === c))); state.pets = i === 0; err.hidden = true; }));
  chips('qfManchas').forEach((c, i) => c.addEventListener('click', () => { chips('qfManchas').forEach(x => x.setAttribute('aria-pressed', String(x === c))); state.manchas = i === 0; err.hidden = true; }));

  /* máscara simples de telefone: (75) 99999-9999 */
  form.whatsapp.addEventListener('input', () => {
    const d = form.whatsapp.value.replace(/\D/g, '').slice(0, 11);
    form.whatsapp.value = d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length > 10 ? 7 : 6) + '-' + d.slice(d.length > 10 ? 7 : 6)
      : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d;
  });

  /* arquivos: até 3, com pré-visualização */
  const render = () => {
    grid.textContent = '';
    const cnt = $('qfCount'); if (cnt) cnt.textContent = files.length ? '· ' + files.length + ' de ' + MAX_FILES : '';
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
  fotosInput.addEventListener('change', () => {
    err.hidden = true; let msg = '';
    [...fotosInput.files].forEach((f) => {
      if (files.length >= MAX_FILES) { msg = 'Você pode enviar até ' + MAX_FILES + ' arquivos.'; return; }
      if (f.size > MAX_MB * 1048576) { msg = 'Um arquivo passou de ' + MAX_MB + ' MB e não foi adicionado.'; return; }
      if (!/^(image|video)\//.test(f.type)) { msg = 'Envie apenas fotos ou vídeos.'; return; }
      const est = [...files, f].reduce((s, x) => s + (x.type.startsWith('video/') ? x.size : Math.min(x.size, 1.5 * 1048576)), 0);
      if (est > MAX_TOTAL_MB * 1048576) { msg = 'O total passou de ' + MAX_TOTAL_MB + ' MB. Remova algum vídeo ou envie menos arquivos.'; return; }
      files.push(f);
    });
    fotosInput.value = ''; if (msg) fail(msg); render();
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

  /* Aviso por e-mail de novo orçamento (serviço FormSubmit; não bloqueia o envio se falhar) */
  const NOTIFY_EMAIL = 'fsaclean75@gmail.com';
  const notifyEmail = (d) => {
    try {
      fetch('https://formsubmit.co/ajax/' + NOTIFY_EMAIL, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          _subject: 'Novo orçamento recebido - FSA Clean', _template: 'table', _captcha: 'false',
          'Aviso': 'Novo orçamento recebido pelo site. Abra o painel para ver as fotos e responder.',
          'Cliente': d.nome, 'Bairro': d.bairro, 'Estofado': d.tipo, 'Tecido': d.tecido, 'Horário solicitado': d.horario,
          'Possui pets': d.pets ? 'Sim' : 'Não', 'Possui manchas': d.manchas ? 'Sim' : 'Não',
          'Arquivos anexados': String(d.n), 'Painel': location.origin + '/admin'
        })
      }).catch(() => {});
    } catch (_) { /* o orçamento já foi salvo; o aviso é só um extra */ }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    if (form.site.value) { form.hidden = true; done.hidden = false; return; }   /* antispam (campo invisível) */
    /* FOTO OBRIGATÓRIA: nunca envia sem pelo menos 1 arquivo (a lista `files` guarda o que foi escolhido) */
    if (!files || files.length === 0) {
      alert('Por favor, anexe pelo menos 1 foto do estofado para solicitar o orçamento.');
      fail('Anexe pelo menos 1 foto do estofado para solicitar o orçamento.');
      return;
    }
    const nome = form.nome.value.trim(), bairro = form.bairro.value.trim(), tecido = form.tecido.value, limpeza = form.limpeza.value;
    let tel = form.whatsapp.value.replace(/\D/g, '');
    if (nome.length < 2) return fail('Informe o seu nome.');
    if (tel.length < 10 || tel.length > 11) return fail('Informe um WhatsApp válido, com DDD.');
    if (bairro.length < 2) return fail('Informe o seu bairro.');
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i], n = itens.length > 1 ? ' do item ' + (i + 1) : '';
      if (!it.tipo) return fail('Escolha o tipo de estofado' + n + '.');
      if (it.tipo === 'Colchão' && !it.tamanho) return fail('Escolha o tamanho do colchão' + n + '.');
      if (it.tipo === 'Outro' && it.descricao.trim().length < 2) return fail('Descreva o item' + (itens.length > 1 ? ' ' + (i + 1) : '') + '.');
    }
    if (!tecido) return fail('Escolha o tipo de tecido.');
    if (!limpeza) return fail('Informe há quanto tempo o estofado não é limpo.');
    if (state.pets === null) return fail('Informe se possui pets.');
    if (state.manchas === null) return fail('Informe se possui manchas.');
    if (AGENDA.obrigatorio && slots.length && !state.horario) return fail('Escolha um dia e horário para o atendimento.');
    const db = window.fsaDb && window.fsaDb();
    if (!db) return fail('Não foi possível enviar agora. Tente novamente em instantes.');
    if (tel.length <= 11) tel = '55' + tel;
    busy = true; btn.disabled = true; err.hidden = true; btnLabel.textContent = 'Enviando...';
    try {
      const id = pendingId || (pendingId = uuid()), paths = new Array(files.length);   /* mesmo id se precisar tentar de novo */
      if (state.horario) {                                           /* reserva o horário ANTES de enviar: dois clientes nunca pegam o mesmo */
        btnLabel.textContent = 'Reservando horário...';
        const rv = await db.rpc('reservar_horario', { p_horario: state.horario.id, p_orcamento: id });
        if (rv.error || rv.data !== true) { await loadSlots(); throw Object.assign(new Error('slot'), { slot: true }); }
      } let next = 0, doneN = 0;
      const worker = async () => {
        while (next < files.length) {
          const i = next++;
          const f = await shrink(files[i]);
          const path = id + '/' + (i + 1) + '-' + Math.random().toString(36).slice(2, 8) + '.' + extOf(f);
          const up = await db.storage.from('orcamentos-fotos').upload(path, f, { contentType: f.type, upsert: false });
          if (up.error) throw up.error;
          paths[i] = path; doneN++;
          btnLabel.textContent = 'Enviando arquivos (' + doneN + ' de ' + files.length + ')...';
        }
      };
      btnLabel.textContent = 'Enviando arquivos...'; await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));
      if (paths.length < 1 || paths.some((x) => !x)) throw new Error('sem foto');   /* última barreira: nada vai ao banco sem foto */
      btnLabel.textContent = 'Finalizando...';
      const itensPayload = itens.map((it) => {
        const o = { tipo: it.tipo, quantidade: it.tipo === 'Outro' ? 1 : it.qty };
        if (it.tipo === 'Colchão') o.tamanho = it.tamanho; if (it.tipo === 'Sofá') o.tamanho = it.qty + ' lugares'; if (it.tipo === 'Outro') o.descricao = it.descricao.trim().slice(0, 40);
        return o;
      });
      const um = itens.length === 1, i0 = itens[0];
      const resumoTipo = um ? i0.tipo : 'Pacote (' + itens.length + ' itens)';
      const resumoQtd = um ? (i0.tipo === 'Outro' ? 1 : i0.qty) : itens.length;
      const resumoTam = um ? (i0.tipo === 'Colchão' ? i0.tamanho : (i0.tipo === 'Sofá' ? i0.qty + ' lugares' : null)) : null;
      const ins = await db.from('orcamentos').insert({
        id, nome, whatsapp: tel, bairro, tipo_estofado: resumoTipo, quantidade: resumoQtd, tamanho: resumoTam, itens: itensPayload,
        horario_id: state.horario ? state.horario.id : null, tipo_tecido: tecido, ultima_limpeza: limpeza, tem_pets: !!state.pets, tem_manchas: !!state.manchas,
        detalhes: form.detalhes.value.trim() || null, fotos: paths
      });
      if (ins.error) throw ins.error;
      notifyEmail({ nome, bairro, tipo: itens.map(itemText).join(' + '), tecido, horario: state.horario ? lbHor(state.horario) : 'Sem preferência', n: paths.length, pets: !!state.pets, manchas: !!state.manchas });
      if (state.horario) { const p0 = document.createElement('p'); p0.className = 'qf-hor'; p0.textContent = 'Horário solicitado: ' + lbHor(state.horario) + '. Nossa equipe confirma com você.'; done.append(p0); }
      pendingId = null; form.hidden = true; done.hidden = false; done.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (ex) {
      if (ex && ex.slot) { fail('Esse horário acabou de ser reservado por outra pessoa. Escolha outro e envie de novo.'); return; }
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
