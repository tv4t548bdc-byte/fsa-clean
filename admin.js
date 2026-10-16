/* ===== FSA Clean - Painel administrativo ===== */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const WA_SITE = '(75) 98151-6165';
  const IG_SITE = '@fsa_clean';
  /* >>> COLE AQUI o link (curto) de avaliações do Google da FSA Clean <<< */
  const GOOGLE_REVIEW_URL = 'https://share.google/kWE2r1hAPfzMGmpIc';
  let db = null, P = { base: {}, bairro: {}, tecido: {}, extra: {} }, precoRows = [];

  /* ---------- utilitários ---------- */
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((c) => { if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return n;
  };
  const fmtPhone = (w) => { let d = String(w || '').replace(/\D/g, ''); if (d.length > 11 && d.startsWith('55')) d = d.slice(2); return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : String(w || ''); };
  const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : Math.round(n * 100) / 100; };
  const numIn = (v) => (v === null || v === undefined ? '' : String(Number(v)).replace('.', ','));
  const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR');
  const fmtDT = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  /* ---------- datas e horários (agenda) ---------- */
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], DIAS_LONGO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const pd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const ds = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
  const mondayOf = (s) => { const d = pd(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ds(d); };
  const hh = (t) => String(t).slice(0, 5);
  const toMin = (t) => { const [h, m] = hh(t).split(':').map(Number); return h * 60 + m; };
  const fromMin = (t) => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0') + ':00';
  const fmtDia = (s) => { const d = pd(s); return DIAS[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
  const diaLongo = (s) => { const d = pd(s); return DIAS_LONGO[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
  const slotTxt = (h) => fmtDia(h.data) + ' · ' + hh(h.inicio) + '–' + hh(h.fim);
  const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const futuro = (data, ini) => data > today() || (data === today() && toMin(ini) > nowMin());
  const STATUS = { novo: 'Novo', em_analise: 'Em análise', orcado: 'Orçado', aprovado: 'Aprovado', concluido: 'Concluído', recusado: 'Recusado', pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };
  const msg = (n, t, ok) => { n.textContent = t || ''; n.hidden = !t; n.className = ok ? 'okmsg' : 'err'; };
  const fetchAll = async (mk) => { /* pagina de 1000 em 1000 */
    let out = [], from = 0;
    for (;;) { const { data, error } = await mk().range(from, from + 999); if (error) throw error; out = out.concat(data); if (data.length < 1000) return out; from += 1000; }
  };

  /* ---------- login ---------- */
  const showLogin = (m) => { $('app').hidden = true; $('login').hidden = false; msg($('lgErr'), m); };
  const enter = async (session) => {
    const { data, error } = await db.rpc('is_admin');
    if (error || data !== true) { await db.auth.signOut(); return showLogin('Este usuário não tem permissão de acesso ao painel.'); }
    $('who').textContent = session.user.email + ' · v8'; $('login').hidden = true; $('app').hidden = false;
    await loadPrices(); await ensurePrices(); loadLogo().catch(() => null); loadOrc(); refreshBadges();
  };
  const boot = async () => {
    db = window.fsaDb && window.fsaDb();
    if (!db) return showLogin('Configuração do Supabase ausente. Edite o arquivo supabase-config.js.');
    const { data } = await db.auth.getSession();
    if (data.session) enter(data.session); else showLogin();
    db.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') showLogin(); });
  };
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!db) return;
    const b = $('lgBtn'); b.disabled = true; msg($('lgErr'), '');
    const { data, error } = await db.auth.signInWithPassword({ email: $('lgEmail').value.trim(), password: $('lgPass').value });
    b.disabled = false;
    if (error) return msg($('lgErr'), 'E-mail ou senha incorretos.');
    $('lgPass').value = ''; enter(data.session);
  });
  $('logout').addEventListener('click', async () => { await db.auth.signOut(); showLogin(); });

  /* ---------- abas ---------- */
  document.querySelectorAll('nav.tabs button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('nav.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    ['orc', 'ag', 'cx', 'av', 'pr'].forEach((t) => { $('tab-' + t).hidden = t !== b.dataset.tab; });
    ({ orc: loadOrc, ag: loadAgenda, cx: loadCaixa, av: loadAval, pr: renderPrices })[b.dataset.tab]();
  }));
  const refreshBadges = async () => {
    const a = await db.from('orcamentos').select('id', { count: 'exact', head: true }).eq('status', 'novo');
    const c = await db.from('avaliacoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
    $('newCount').textContent = a.count || 0; $('newCount').hidden = !a.count;
    $('pendCount').textContent = c.count || 0; $('pendCount').hidden = !c.count;
    const g = await db.from('horarios').select('id', { count: 'exact', head: true }).eq('status', 'reservado').gte('data', today());
    $('agCount').textContent = g.count || 0; $('agCount').hidden = !g.count;
  };

  /* ---------- preços ---------- */
  const loadPrices = async () => {
    const { data, error } = await db.from('precos').select('*').order('chave');
    precoRows = error ? [] : data; P = { base: {}, bairro: {}, tecido: {}, extra: {} };
    precoRows.forEach((r) => { P[r.categoria][r.chave] = Number(r.valor); });
  };
  /* garante os dois adicionais separados na tabela de preços (mesmo se o SQL não tiver rodado) */
  const ensurePrices = async () => {
    const need = ['Adicional Pets', 'Adicional Manchas'].filter((k) => !(k in P.extra));
    if (!need.length) return;
    await db.from('precos').upsert(need.map((chave) => ({ categoria: 'extra', chave, valor: 0 })), { onConflict: 'categoria,chave' });
    await loadPrices();
  };
  const GROUPS = { base: 'Preço base', bairro: 'Taxa de bairro', tecido: 'Adicional de tecido', extra: 'Extras e pagamento' };
  const renderPrices = async () => {
    await loadPrices(); const box = $('prGroups'); box.textContent = '';
    Object.keys(GROUPS).forEach((cat) => {
      const rows = precoRows.filter((r) => r.categoria === cat && r.chave !== 'Pets/manchas');
      const g = el('div', { class: 'card price-group' }, el('h3', { text: GROUPS[cat], style: 'margin-bottom:12px' }));
      rows.forEach((r) => {
        const inp = el('input', { inputmode: 'decimal', value: numIn(r.valor), 'data-cat': cat, 'data-key': r.chave, 'aria-label': r.chave });
        g.append(el('div', { class: 'price-row' }, el('span', { text: r.chave }), inp,
          el('button', { class: 'btn bad small', type: 'button', text: 'Excluir', onclick: async () => { if (!confirm('Excluir "' + r.chave + '"?')) return; await saveAllPrices(); await db.from('precos').delete().eq('id', r.id); renderPrices(); } })));
      });
      if (!rows.length) g.append(el('p', { class: 'hint', text: 'Nenhum item ainda.' }));
      box.append(g);
    });
  };
  const collectPrices = () => [...document.querySelectorAll('#prGroups input')].map((i) => ({ categoria: i.dataset.cat, chave: i.dataset.key, valor: num(i.value) }));
  const saveAllPrices = async () => { const rows = collectPrices(); if (!rows.length) return { error: null }; return db.from('precos').upsert(rows, { onConflict: 'categoria,chave' }); };
  $('formPr').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target, chave = f.chave.value.trim(); if (!chave) return;
    await saveAllPrices();                                   /* não perde o que já foi digitado */
    const { error } = await db.from('precos').upsert({ categoria: f.cat.value, chave, valor: num(f.valor.value) }, { onConflict: 'categoria,chave' });
    if (error) return msg($('prErr'), 'Não foi possível adicionar.');
    f.reset(); renderPrices();
  });
  $('savePr').addEventListener('click', async () => {
    msg($('prErr'), ''); $('prOk').hidden = true;
    const { error } = await saveAllPrices();
    if (error) return msg($('prErr'), 'Não foi possível salvar.');
    $('prOk').hidden = false; setTimeout(() => { $('prOk').hidden = true; }, 2500); loadPrices();
  });

  /* ---------- orçamentos: lista ---------- */
  let orcCache = [];
  const loadOrc = async () => {
    let q = db.from('orcamentos').select('*').order('created_at', { ascending: false }).limit(200);
    if ($('fStatus').value) q = q.eq('status', $('fStatus').value);
    const { data, error } = await q; const box = $('orcList'); box.textContent = '';
    if (error) return box.append(el('p', { class: 'err', text: 'Não foi possível carregar os orçamentos.' }));
    orcCache = data;
    const hids = data.map((o) => o.horario_id).filter(Boolean), hmap = {};
    if (hids.length) { const r = await db.from('horarios').select('*').in('id', hids); (r.data || []).forEach((h) => { hmap[h.id] = h; }); }
    if (!data.length) box.append(el('p', { class: 'muted', text: 'Nenhuma solicitação por aqui ainda.' }));
    data.forEach((o) => box.append(el('div', { class: 'card item', onclick: () => openOrc(o.id) },
      el('div', {}, el('b', { text: o.nome }),
        el('span', { class: 'meta', text: [orcResumo(o), o.bairro, fmtDT(o.created_at), (o.fotos || []).length + ' arquivo(s)', hmap[o.horario_id] ? '\u{1F4C5} ' + slotTxt(hmap[o.horario_id]) : ''].filter(Boolean).join(' · ') })),
      el('div', { style: 'text-align:right' }, el('span', { class: 'st ' + o.status, text: STATUS[o.status] }), o.total != null ? el('div', { class: 'small', text: brl(o.total), style: 'font-weight:700;margin-top:4px' }) : null))));
    refreshBadges();
  };
  $('fStatus').addEventListener('change', loadOrc); $('reloadOrc').addEventListener('click', loadOrc);

  /* ---------- orçamentos: calculadora ---------- */
  const BASE_KEY = { 'Sofá': 'Sofá (por lugar)', 'Cadeiras': 'Cadeiras (por unidade)', 'Poltronas': 'Poltronas (por unidade)', 'Automotivo': 'Automotivo (por banco)', 'Outro': 'Outro' };
  const lookup = (group, name) => { const k = Object.keys(P[group]).find((x) => norm(x) === norm(name)); return k === undefined ? null : P[group][k]; };
  /* itens do pedido: usa a lista "itens" (pacote) ou, em orçamentos antigos, os campos únicos */
  const itensOf = (o) => (Array.isArray(o.itens) && o.itens.length) ? o.itens.map((x) => ({ ...x })) : [{ tipo: o.tipo_estofado, quantidade: o.quantidade || 1, tamanho: o.tamanho || null }];
  const itemLabel = (it) => it.tipo + (it.tipo === 'Outro' && it.descricao ? ' (' + it.descricao + ')' : '') + (it.tamanho ? ' · ' + it.tamanho : '') + (it.quantidade > 1 && it.tipo !== 'Sofá' && it.tipo !== 'Outro' ? ' · ' + it.quantidade + ' un.' : '');
  const orcResumo = (o) => itensOf(o).map(itemLabel).join(' + ');
  const suggestItem = (it) => {
    if (it.tipo === 'Colchão') return (lookup('base', 'Colchão ' + (it.tamanho || '')) || 0) * (it.quantidade || 1);
    return (P.base[BASE_KEY[it.tipo]] || 0) * (it.tipo === 'Outro' ? 1 : (it.quantidade || 1));
  };
  const suggest = (o) => {
    const base = itensOf(o).reduce((s, it) => s + suggestItem(it), 0);
    const bairro = lookup('bairro', o.bairro); const taxa = bairro !== null ? bairro : (P.bairro['Padrão'] || 0);
    return { preco_base: base, taxa_bairro: taxa, adicional_tecido: lookup('tecido', o.tipo_tecido) || 0, adicional_pet: o.tem_pets ? (P.extra['Adicional Pets'] || 0) : 0, adicional_manchas: o.tem_manchas ? (P.extra['Adicional Manchas'] || 0) : 0 };
  };
  const pay = (total) => {
    const pix = P.extra['Desconto Pix (%)'] || 0, card = P.extra['Acréscimo cartão (%)'] || 0;
    const r2 = (n) => Math.round(n * 100) / 100;
    return { pixPct: pix, desc: r2(total * pix / 100), pix: r2(total * (1 - pix / 100)), cardTotal: r2(total * (1 + card / 100)), parcela: r2((total * (1 + card / 100)) / 3) };
  };

  /* ---------- orçamentos: detalhe ---------- */
  const dlg = $('dlg'), body = $('dlgBody');
  const closeDlg = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); loadOrc(); };
  dlg.addEventListener('close', () => { if (!$('app').hidden) loadOrc(); });
  const signed = async (bucket, path, secs = 3600) => { const { data } = await db.storage.from(bucket).createSignedUrl(path, secs); return data ? data.signedUrl : null; };
  const isVideo = (p) => /\.(mp4|mov|webm)$/i.test(p);

  async function openOrc(id) {
    const { data: o, error } = await db.from('orcamentos').select('*').eq('id', id).single();
    if (error || !o) return alert('Não foi possível abrir este orçamento.');
    await loadPrices(); await loadLogo().catch(() => null);
    const fresh = o.preco_base === null;               /* ainda não calculado => sugere */
    const sg = suggest(o);
    const itens = itensOf(o);
    const hor = o.horario_id ? (await db.from('horarios').select('*').eq('id', o.horario_id).single()).data : null;
    const livres = ((await db.from('horarios').select('*').eq('status', 'livre').gte('data', today()).order('data').limit(80)).data || []).filter((h) => futuro(h.data, h.inicio)).sort((a, b) => (a.data + hh(a.inicio) < b.data + hh(b.inicio) ? -1 : 1));
    const itemIn = itens.map((it) => el('input', { inputmode: 'decimal', value: numIn(fresh || it.valor === undefined ? suggestItem(it) : it.valor), 'aria-label': 'Valor: ' + itemLabel(it) }));
    itemIn.forEach((i) => i.addEventListener('input', () => recalc()));
    const v = { preco_base: fresh ? sg.preco_base : o.preco_base, taxa_bairro: fresh ? sg.taxa_bairro : o.taxa_bairro, adicional_tecido: fresh ? sg.adicional_tecido : o.adicional_tecido, adicional_pet: fresh ? sg.adicional_pet : o.adicional_pet, adicional_manchas: fresh ? sg.adicional_manchas : (o.adicional_manchas || 0), outros: o.outros, desconto: o.desconto };
    const f = { preco_base: el('input') };      /* preço base = soma dos itens (campo interno) */
    const fld = (key, label) => { f[key] = el('input', { inputmode: 'decimal', value: numIn(v[key]) }); f[key].addEventListener('input', recalc); return el('label', {}, label, f[key]); };
    const totalOut = el('b', { text: brl(0) }), payBox = el('div', { class: 'hint' });
    const status = el('select', {}, ...Object.keys(STATUS).slice(0, 6).map((s) => el('option', { value: s, text: STATUS[s], selected: s === (o.status === 'novo' ? 'em_analise' : o.status) })));
    const obs = el('textarea', { rows: 2, maxlength: 400, placeholder: 'Aparece no PDF (ex.: prazo, condições)' }); obs.value = o.observacoes || '';
    const sum = () => ['preco_base', 'taxa_bairro', 'adicional_tecido', 'adicional_pet', 'adicional_manchas', 'outros'].reduce((s, k) => s + num(f[k].value), 0) - num(f.desconto.value);
    function recalc() { f.preco_base.value = numIn(itemIn.reduce((s, i) => s + num(i.value), 0)); const t = Math.max(0, sum()); totalOut.textContent = brl(t); const p = pay(t); payBox.textContent = 'À vista (Pix ou dinheiro)' + (p.pixPct ? ' com ' + p.pixPct + '% de desconto' : '') + ': ' + brl(p.pix) + ' · Cartão até 3x de ' + brl(p.parcela); }
    const photos = el('div', { class: 'photos' });
    if ((o.fotos || []).length) db.storage.from('orcamentos-fotos').createSignedUrls(o.fotos, 3600).then(({ data }) => (data || []).forEach((r, i) => {
      if (!r || !r.signedUrl) return; const p = o.fotos[i] || '';
      photos.append(el('a', { href: r.signedUrl, target: '_blank', rel: 'noopener' }, isVideo(p) ? el('video', { src: r.signedUrl + '#t=0.1', muted: true, playsinline: true, preload: 'metadata' }) : el('img', { src: r.signedUrl, alt: 'Foto do cliente', loading: 'lazy' })));
    }));
    const full0 = (o.whatsapp || '').replace(/\D/g, ''), fullTel = full0.length <= 11 ? '55' + full0 : full0;
    const slotBox = el('div', { class: 'card', style: 'display:grid;gap:10px' }, el('h3', { text: 'Horário do atendimento', style: 'font-size:1.05rem' }));
    if (hor) {
      slotBox.append(el('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:center' }, el('b', { text: slotTxt(hor) }), el('span', { class: 'st ' + (hor.status === 'confirmado' ? 'aprovado' : 'pendente'), text: hor.status === 'confirmado' ? 'Confirmado' : 'Aguardando confirmação' })));
      const act = el('div', { class: 'actions' });
      if (hor.status !== 'confirmado') act.append(el('button', { class: 'btn ok', type: 'button', text: 'Confirmar horário', onclick: async () => { const r = await db.rpc('admin_atribuir_horario', { p_orcamento: o.id, p_horario: hor.id }); if (r.error || r.data !== true) return alert('Não foi possível confirmar. Atualize a página e tente de novo.'); openOrc(o.id); } }));
      else act.append(el('a', { class: 'btn ok', target: '_blank', rel: 'noopener', text: 'Avisar cliente no WhatsApp',
        href: 'https://wa.me/' + fullTel + '?text=' + encodeURIComponent('Olá, ' + o.nome + '! Tudo bem?\nAqui é da FSA Clean! \u{1F9FC}\nSeu atendimento está confirmado para ' + diaLongo(hor.data) + ', das ' + hh(hor.inicio) + ' às ' + hh(hor.fim) + '.\nQualquer imprevisto, é só nos avisar por aqui. Até lá!') }));
      act.append(el('button', { class: 'btn bad', type: 'button', text: 'Liberar horário', onclick: async () => { if (!confirm('Liberar este horário? Ele volta para a lista de disponíveis.')) return; await db.rpc('admin_liberar_horario', { p_orcamento: o.id }); openOrc(o.id); } }));
      slotBox.append(act);
    } else slotBox.append(el('p', { class: 'hint', text: 'O cliente não escolheu um horário.' }));
    if (livres.length) {
      const sel = el('select', { style: 'flex:2;min-width:180px' }, el('option', { value: '', text: hor ? 'Trocar por outro horário...' : 'Definir um horário...' }), ...livres.map((h) => el('option', { value: h.id, text: slotTxt(h) })));
      slotBox.append(el('div', { class: 'actions' }, sel, el('button', { class: 'btn', type: 'button', text: 'Definir e confirmar', onclick: async () => { if (!sel.value) return; const r = await db.rpc('admin_atribuir_horario', { p_orcamento: o.id, p_horario: sel.value }); if (r.error || r.data !== true) return alert('Esse horário não está mais livre. Escolha outro.'); openOrc(o.id); } })));
    } else if (!hor) slotBox.append(el('p', { class: 'hint', text: 'Publique horários na aba Agenda para poder definir um.' }));
    const out = el('div', { class: 'actions' }); const note = el('p', { class: 'hint' });
    const waLink = el('a', { class: 'btn ok', target: '_blank', rel: 'noopener', hidden: true, text: 'Abrir conversa no WhatsApp' });
    const pdfLinks = el('div', { class: 'actions', hidden: true });
    const googleOk = /^https?:\/\/\S+$/i.test(GOOGLE_REVIEW_URL);
    const googleBtn = el('a', { class: 'btn star', href: googleOk ? GOOGLE_REVIEW_URL : '#', target: '_blank', rel: 'noopener', text: '\u2B50 Pedir Avaliação no Google',
      onclick: (e) => { if (!googleOk) { e.preventDefault(); alert('Cole o link de avaliações do Google na constante GOOGLE_REVIEW_URL, no início do arquivo admin.js.'); } } });

    const values = () => ({ itens: itens.map((it, i) => ({ ...it, valor: num(itemIn[i].value) })), preco_base: itemIn.reduce((s, i) => s + num(i.value), 0), taxa_bairro: num(f.taxa_bairro.value), adicional_tecido: num(f.adicional_tecido.value), adicional_pet: num(f.adicional_pet.value), adicional_manchas: num(f.adicional_manchas.value), outros: num(f.outros.value), desconto: num(f.desconto.value), total: Math.max(0, Math.round(sum() * 100) / 100), status: status.value, observacoes: obs.value.trim() || null, atualizado_em: new Date().toISOString() });
    const save = async (quiet) => { const { error } = await db.from('orcamentos').update(values()).eq('id', o.id); if (error) { msg(note, 'Não foi possível salvar. Confira se o SQL "supabase-atualizacao-3" foi executado no Supabase.'); return false; } if (!quiet) msg(note, 'Salvo!', true); return true; };

    const phone = (o.whatsapp || '').replace(/\D/g, '');
    const WA_TEXT = (nome) => 'Olá, ' + nome + '! Tudo bem?\nAqui é da FSA Clean! \u{1F9FC}\nJá preparamos o seu orçamento detalhado de higienização. Estou enviando em anexo o arquivo PDF com todos os valores e condições.\nQualquer dúvida estou à disposição!';
    const gen = () => {
      /* Tudo síncrono de propósito: o navegador só libera o download e a abertura do WhatsApp dentro do toque do usuário. */
      msg(note, '');
      if (status.value === 'novo' || status.value === 'em_analise') status.value = 'orcado';
      const vals = values(); let blob;
      try { blob = buildPdf({ ...o, ...vals, horarioTexto: hor ? diaLongo(hor.data) + ', ' + hh(hor.inicio) + ' às ' + hh(hor.fim) : '' }).output('blob'); } catch (e) { return msg(note, 'Não foi possível gerar o PDF. Atualize a página e tente de novo.'); }
      const local = URL.createObjectURL(blob);
      const file = 'orcamento-fsa-clean-' + norm(o.nome).replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '.pdf';
      const a = el('a', { href: local, download: file }); document.body.append(a); a.click(); a.remove();          /* (a) baixa o PDF */
      const full = phone.length <= 11 ? '55' + phone : phone;
      const wa = 'https://wa.me/' + full + '?text=' + encodeURIComponent(WA_TEXT(o.nome));
      const w = window.open(wa, '_blank');                                                                          /* (b) abre o WhatsApp do cliente na hora */
      waLink.href = wa; waLink.hidden = false;
      pdfLinks.textContent = ''; pdfLinks.hidden = false;
      pdfLinks.append(el('a', { class: 'btn ghost', href: local, target: '_blank', rel: 'noopener', text: 'Abrir PDF' }), el('a', { class: 'btn ghost', href: local, download: file, text: 'Baixar PDF de novo' }));
      msg(note, w ? 'PDF baixado e WhatsApp aberto. Anexe o PDF na conversa (clipe) e envie.' : 'PDF baixado. O navegador bloqueou a abertura do WhatsApp: toque em "Abrir conversa no WhatsApp".', true);
      save(true);   /* grava valores e status depois, sem atrapalhar o download */
    };
    const toCash = async (btn) => {
      const t = Math.max(0, sum()); const forma = prompt('Forma de pagamento (Pix, Cartão ou Dinheiro):', 'Pix'); if (forma === null) return;
      const pp = pay(t); const valor = Math.round((/pix|dinheiro|vista/i.test(forma) ? pp.pix : t) * 100) / 100;
      const ex = await db.from('financeiro_entradas').select('id').eq('orcamento_id', o.id).limit(1);
      if (ex.data && ex.data.length && !confirm('Este orçamento já foi lançado no caixa. Lançar de novo?')) return;
      btn.disabled = true; await save();
      const r = await db.from('financeiro_entradas').insert({ data: today(), descricao: ('Serviço - ' + o.nome + ' (' + orcResumo(o) + ')').slice(0, 120), valor, forma_pagamento: forma.trim() || null, orcamento_id: o.id });
      if (r.error) { btn.disabled = false; return msg(note, 'Não foi possível lançar no caixa.'); }
      await db.from('orcamentos').update({ status: 'concluido' }).eq('id', o.id); status.value = 'concluido'; btn.disabled = false; msg(note, 'Entrada de ' + brl(valor) + ' lançada no caixa.', true);
    };
    const del = async () => {
      if (!confirm('Excluir este orçamento e as fotos enviadas? Não dá para desfazer.')) return;
      const paths = [...(o.fotos || [])]; if (paths.length) await db.storage.from('orcamentos-fotos').remove(paths);
      if (o.pdf_path) await db.storage.from('orcamentos-pdf').remove([o.pdf_path]);
      await db.from('orcamentos').delete().eq('id', o.id); closeDlg();
    };
    const missing = fresh && sg.preco_base === 0 ? el('p', { class: 'hint', text: 'Dica: a sugestão ficou em R$ 0,00 porque a aba Preços ainda não foi preenchida. Você pode digitar os valores aqui mesmo.' }) : document.createComment('sem dica');

    out.append(el('button', { class: 'btn ghost', type: 'button', text: 'Sugerir de novo', onclick: () => { const s = suggest(o); itens.forEach((it, i) => { itemIn[i].value = numIn(suggestItem(it)); }); ['taxa_bairro', 'adicional_tecido', 'adicional_pet', 'adicional_manchas'].forEach((k) => { f[k].value = numIn(s[k]); }); recalc(); } }),
      el('button', { class: 'btn', type: 'button', text: 'Salvar', onclick: () => save() }),
      el('button', { class: 'btn', type: 'button', text: 'Gerar PDF e abrir WhatsApp', onclick: (e) => gen(e.currentTarget) }));
    body.textContent = '';
    body.append(
      el('div', { class: 'mhead' }, el('div', {}, el('h2', { text: o.nome }), el('span', { class: 'muted small', text: 'Recebido em ' + fmtDT(o.created_at) })), el('button', { class: 'x', type: 'button', 'aria-label': 'Fechar', text: '\u00d7', onclick: closeDlg })),
      el('div', { class: 'kv' },
        el('div', {}, el('span', { text: 'WhatsApp' }), el('a', { href: 'https://wa.me/' + (phone.length <= 11 ? '55' + phone : phone), target: '_blank', rel: 'noopener', text: fmtPhone(o.whatsapp) })),
        el('div', {}, el('span', { text: 'Bairro' }), o.bairro),
        el('div', {}, el('span', { text: itens.length > 1 ? 'Itens do pedido (' + itens.length + ')' : 'Estofado' }), ...itens.map((it) => el('div', { text: (itens.length > 1 ? '• ' : '') + itemLabel(it) }))),
        el('div', {}, el('span', { text: 'Tecido' }), o.tipo_tecido),
        el('div', {}, el('span', { text: 'Última limpeza' }), o.ultima_limpeza || '—'),
        el('div', {}, el('span', { text: 'Possui pets?' }), o.tem_pets ? 'Sim' : 'Não'),
        el('div', {}, el('span', { text: 'Possui manchas?' }), o.tem_manchas ? 'Sim' : 'Não'),
        (o.pets_manchas && !o.tem_pets && !o.tem_manchas) ? el('div', {}, el('span', { text: 'Pets/manchas (cadastro antigo)' }), 'Sim') : document.createComment('-'),
        el('div', {}, el('span', { text: 'Observações do cliente' }), o.detalhes || '—')),
      slotBox,
      (o.fotos || []).length ? photos : el('p', { class: 'hint', text: 'O cliente não enviou fotos ou vídeos.' }),
      el('h3', { text: 'Valores', style: 'font-size:1.05rem' }), missing,
      el('div', { class: 'span-all' }, el('span', { class: 'hint', text: itens.length > 1 ? 'Valor de cada item do pacote (a soma vira o preço base):' : 'Valor do serviço:', style: 'display:block;margin-bottom:6px' }), ...itens.map((it, i) => el('label', { style: 'margin-bottom:8px' }, itemLabel(it), itemIn[i]))),
      el('div', { class: 'calc' }, fld('taxa_bairro', 'Taxa do bairro'), fld('adicional_tecido', 'Adicional de tecido'), fld('adicional_pet', 'Adicional pets'), fld('adicional_manchas', 'Adicional manchas'), fld('outros', 'Outros acréscimos'), fld('desconto', 'Desconto')),
      el('div', { class: 'total' }, el('span', { text: 'Subtotal dos serviços' }), totalOut), payBox,
      el('div', { class: 'calc' }, el('label', {}, 'Status', status), el('label', {}, 'Observações (aparecem no PDF)', obs)),
      out, note, pdfLinks, el('div', { class: 'actions' }, waLink, googleBtn),
      el('div', { class: 'actions' }, el('button', { class: 'btn ok', type: 'button', text: 'Serviço concluído: lançar no caixa', onclick: (e) => toCash(e.currentTarget) }), el('button', { class: 'btn bad', type: 'button', text: 'Excluir', onclick: del })));
    recalc(); if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  }

  /* ---------- PDF ---------- */
  let logoData = null;
  const loadLogo = async () => {
    if (logoData) return logoData;
    const blob = await (await fetch('logo-fsa-pdf.jpg')).blob();
    logoData = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    return logoData;
  };
  function buildPdf(o) {
    const { jsPDF } = window.jspdf; const d = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 14, CW = W - 2 * M;
    const NAVY = [7, 60, 105], BLUE = [8, 111, 168], TURQ = [32, 192, 196], INK = [20, 45, 64], GRAY = [98, 116, 134], PALE = [241, 249, 252], LINE = [214, 229, 236], WHITE = [255, 255, 255];
    const fill = (c) => d.setFillColor(c[0], c[1], c[2]), stroke = (c) => d.setDrawColor(c[0], c[1], c[2]);
    const font = (st, sz, c) => { d.setFont('helvetica', st); d.setFontSize(sz); d.setTextColor(c[0], c[1], c[2]); };
    const T = (s, x, y, opt) => d.text(String(s), x, y, opt);
    const wrap = (s, w) => d.splitTextToSize(String(s), w);
    const logo = logoData;
    const ref = '#ORC-' + (o.numero ? String(o.numero).padStart(4, '0') : o.id.slice(0, 6).toUpperCase());
    const m = (v) => brl(v);
    const sub = Math.max(0, Number(o.total)), p = pay(sub);

    const footer = () => {
      stroke(TURQ); d.setLineWidth(0.5); d.line(M, H - 16, W - M, H - 16);
      font('normal', 8, GRAY); T('FSA Clean - Higienização de Estofados em Feira de Santana e Região  |  Atendimento Domiciliar', W / 2, H - 10, { align: 'center' });
    };
    const header = () => {
      fill(NAVY); d.rect(0, 0, W, 40, 'F'); fill(TURQ); d.rect(0, 40, W, 1.6, 'F');
      fill(WHITE); d.roundedRect(M, 6, 54, 28.5, 3, 3, 'F');
      if (logo) d.addImage(logo, 'JPEG', M + 3, 7.9, 48, 25.1);
      font('bold', 20, WHITE); T('ORÇAMENTO TÉCNICO', W - M, 18, { align: 'right' });
      font('bold', 8.5, [159, 243, 236]); T('HIGIENIZAÇÃO E SANITIZAÇÃO DE ESTOFADOS', W - M, 25, { align: 'right' });
      font('normal', 10, WHITE); T('Ref: ' + ref + '   |   Data: ' + fmtDate(new Date()), W - M, 33, { align: 'right' });
    };
    const miniHeader = () => {
      fill(NAVY); d.rect(0, 0, W, 14, 'F'); fill(TURQ); d.rect(0, 14, W, 1, 'F');
      font('bold', 10, WHITE); T('FSA CLEAN', M, 9.2); font('normal', 9, WHITE); T('Orçamento técnico ' + ref, W - M, 9.2, { align: 'right' });
    };
    let y = 0;
    const newPage = () => { d.addPage(); miniHeader(); footer(); y = 24; };
    const need = (h) => { if (y + h > H - 22) newPage(); };
    const title = (t) => { need(14); fill(TURQ); d.rect(M, y, 1.6, 6.5, 'F'); font('bold', 11, NAVY); T(t, M + 4.5, y + 5); y += 11; };

    header(); footer(); y = 50;
    /* --- cliente / atendimento --- */
    const boxW = (CW - 6) / 2, boxH = o.horarioTexto ? 49 : 40;
    const box = (x, ttl, items) => {
      fill(PALE); stroke(LINE); d.setLineWidth(0.3); d.roundedRect(x, y, boxW, boxH, 2.5, 2.5, 'FD');
      font('bold', 9, BLUE); T(ttl, x + 4, y + 6.5);
      items.forEach(([k, v], i) => { const yy = y + 13 + i * 9; font('normal', 7.5, GRAY); T(k.toUpperCase(), x + 4, yy); font('bold', 9.5, INK); T(wrap(v, boxW - 8)[0], x + 4, yy + 4.6); });
    };
    box(M, 'CLIENTE', [['Nome', o.nome], ['Telefone', fmtPhone(o.whatsapp)], ['Endereço', o.bairro + ' / Feira de Santana - BA']]);
    box(M + boxW + 6, 'INFORMAÇÕES DO ATENDIMENTO', [['Validade da proposta', '7 dias'], ['Modalidade', 'Atendimento Domiciliar (Em trânsito)'], ['Técnico responsável', 'Equipe FSA Clean'], ...(o.horarioTexto ? [['Data e horário', o.horarioTexto]] : [])]);
    y += boxH + 9;

    /* --- 1. serviços --- */
    title('1. DESCRIÇÃO DOS SERVIÇOS SOLICITADOS');
    const cx = { item: M + 3, det: M + 68, qtd: M + 124, unit: M + 150, sub: M + CW - 3 };
    const thead = () => { fill(NAVY); d.rect(M, y, CW, 8, 'F'); font('bold', 7.5, WHITE); T('ITEM / ESTOFADO', cx.item, y + 5.2); T('TECIDO / DETALHES', cx.det, y + 5.2); T('QTD', cx.qtd, y + 5.2, { align: 'center' }); T('VALOR UNIT.', cx.unit, y + 5.2, { align: 'right' }); T('SUBTOTAL', cx.sub, y + 5.2, { align: 'right' }); y += 8; };
    need(40); thead();
    let zebra = 0;
    const row = (ttl, subTtl, det, qtd, unit, subtotal) => {
      const dl = det.flatMap((s) => wrap(s, 52)); const h = Math.max(subTtl ? 14 : 9.5, dl.length * 4.1 + 5);
      need(h + 2); if (zebra++ % 2 === 0) { fill(PALE); d.rect(M, y, CW, h, 'F'); }
      font('bold', 9.5, INK); T(ttl, cx.item, y + 5.6); if (subTtl) { font('normal', 8, GRAY); wrap(subTtl, 60).forEach((l, i) => T(l, cx.item, y + 10 + i * 3.8)); }
      font('normal', 8.5, INK); dl.forEach((l, i) => T(l, cx.det, y + 5.2 + i * 4.1));
      font('normal', 9, INK); T(String(qtd), cx.qtd, y + 5.6, { align: 'center' }); T(m(unit), cx.unit, y + 5.6, { align: 'right' }); font('bold', 9, INK); T(m(subtotal), cx.sub, y + 5.6, { align: 'right' });
      stroke(LINE); d.setLineWidth(0.2); d.line(M, y + h, M + CW, y + h); y += h;
    };
    const ITEMNAME = { 'Sofá': 'Higienização de Sofá', 'Colchão': 'Higienização de Colchão', 'Cadeiras': 'Higienização de Cadeiras', 'Poltronas': 'Higienização de Poltronas', 'Automotivo': 'Higienização Automotiva' };
    const SUBTT = { 'Sofá': 'Lavagem a seco/extração profunda', 'Colchão': 'Eliminação de ácaros e fungos' };
    const lista = itensOf(o);
    lista.forEach((it, i) => {
      const nome = ITEMNAME[it.tipo] || ('Higienização de ' + (it.descricao || 'Estofado'));
      const valor = it.valor !== undefined ? Number(it.valor) : (lista.length === 1 ? Number(o.preco_base) : 0);
      const qtd = it.quantidade > 0 ? it.quantidade : 1;
      const det = ['Tecido: ' + o.tipo_tecido]; if (it.tamanho) det.push(it.tamanho); if (it.tipo === 'Outro' && it.descricao) det.push(it.descricao);
      if (i === 0) { if (o.tem_pets) det.push('Pets: sim'); if (o.tem_manchas) det.push('Manchas: sim'); if (o.pets_manchas && !o.tem_pets && !o.tem_manchas) det.push('Pets/manchas: sim'); if (o.ultima_limpeza) det.push('Última limpeza: ' + o.ultima_limpeza); }
      row(nome, SUBTT[it.tipo] || 'Extração profunda', det, qtd, valor / qtd, valor);
    });
    if (Number(o.taxa_bairro)) row('Taxa de Deslocamento', '', [o.bairro], 1, Number(o.taxa_bairro), Number(o.taxa_bairro));
    if (Number(o.adicional_tecido)) row('Adicional de tecido', '', [o.tipo_tecido], 1, Number(o.adicional_tecido), Number(o.adicional_tecido));
    if (Number(o.adicional_pet)) row('Adicional pets', '', [], 1, Number(o.adicional_pet), Number(o.adicional_pet));
    if (Number(o.adicional_manchas)) row('Adicional manchas', '', [], 1, Number(o.adicional_manchas), Number(o.adicional_manchas));
    if (Number(o.outros)) row('Outros acréscimos', '', [], 1, Number(o.outros), Number(o.outros));
    if (Number(o.desconto)) row('Desconto', '', [], 1, -Number(o.desconto), -Number(o.desconto));
    y += 6;

    /* --- totais + pagamento --- */
    need(46);
    const y0 = y, rx = M + CW;
    font('normal', 9.5, INK); T('Subtotal dos Serviços:', rx - 36, y + 5, { align: 'right' }); T(m(sub), rx, y + 5, { align: 'right' });
    let yy = y + 5;
    if (p.pixPct) {
      font('normal', 9, INK); ['Desconto Especial', '(Pagamento à vista / PIX - ' + String(p.pixPct).replace('.', ',') + '%):'].forEach((l, i) => T(l, rx - 36, y + 12 + i * 4.2, { align: 'right' }));
      font('bold', 9.5, [10, 122, 74]); T('- ' + m(p.desc), rx, y + 12, { align: 'right' }); yy = y + 17;
    }
    fill(NAVY); d.roundedRect(rx - 100, yy + 4, 100, 13, 2.5, 2.5, 'F'); font('bold', 10, WHITE); T('VALOR TOTAL INVESTIDO', rx - 96, yy + 12.4); font('bold', 14, [159, 243, 236]); T(m(p.pix), rx - 3, yy + 13, { align: 'right' });
    const bh = Math.max(30, yy + 17 - y0);
    fill(PALE); stroke(LINE); d.setLineWidth(0.3); d.roundedRect(M, y0, 72, bh, 2.5, 2.5, 'FD');
    font('bold', 9, BLUE); T('FORMAS DE PAGAMENTO', M + 4, y0 + 6.2); font('normal', 8.8, INK);
    T('PIX / Dinheiro (à vista): ' + m(p.pix), M + 4, y0 + 12.5); T('Cartão de crédito: até 3x de ' + m(p.parcela), M + 4, y0 + 18); font('normal', 7.5, GRAY); T('(parcelamento com taxas da máquina)', M + 4, y0 + 23);
    y = y0 + bh + 8;
    if (o.observacoes) { const ol = wrap(o.observacoes, CW - 8); const h = ol.length * 4.4 + 11; need(h + 4); fill(PALE); stroke(LINE); d.roundedRect(M, y, CW, h, 2.5, 2.5, 'FD'); font('bold', 9, BLUE); T('OBSERVAÇÕES', M + 4, y + 6); font('normal', 9, INK); ol.forEach((l, i) => T(l, M + 4, y + 11.5 + i * 4.4)); y += h + 6; }

    /* --- 2. processo --- */
    newPage(); title('2. NOSSO PROCESSO DE HIGIENIZAÇÃO PROFISSIONAL');
    const steps = [['01', 'Inspeção & Aspiração', 'Remoção de sujidades sólidas e poeira profunda com aspirador industrial.'], ['02', 'Aplicação do Produto', 'Detergentes bactericidas e biocidas regulamentados pela ANVISA.'], ['03', 'Escovação Técnica', 'Ação mecânica com escovas de cerdas macias para soltar a sujeira encrostada.'], ['04', 'Extração por Sucção', 'Remoção do produto, sujeira, ácaros, bactérias e enxágue do tecido.']];
    const sw = (CW - 3 * 4) / 4;
    steps.forEach((s, i) => { const x = M + i * (sw + 4); fill(PALE); stroke(LINE); d.setLineWidth(0.3); d.roundedRect(x, y, sw, 40, 2.5, 2.5, 'FD'); font('bold', 17, TURQ); T(s[0], x + 4, y + 10); font('bold', 9, NAVY); wrap(s[1], sw - 8).forEach((l, k) => T(l, x + 4, y + 17 + k * 4)); font('normal', 7.8, GRAY); wrap(s[2], sw - 8).forEach((l, k) => T(l, x + 4, y + 25 + k * 3.6)); });
    y += 48;

    /* --- 3. condições --- */
    title('3. CONDIÇÕES E RECOMENDAÇÕES IMPORTANTES');
    [['Tempo de Secagem', 'O estofado fica levemente úmido após a higienização, secando completamente em um período estimado de 4 a 8 horas (variando conforme a ventilação do local).'],
     ['Remoção de Manchas', 'Garantimos a eliminação de até 99,9% de germes, bactérias e sujidades solúveis. Manchas antigas, marcas de desgaste do tecido ou queimaduras físicas podem não ser removidas 100%.'],
     ['Condições de Pagamento', 'Aceitamos PIX com desconto, Cartões de Crédito/Débito (parcelamento com taxas da máquina) e Dinheiro.']].forEach(([k, v]) => {
      const ls = wrap(v, CW - 6); need(ls.length * 4.3 + 12); font('bold', 9.5, NAVY); T(k + ':', M + 3, y + 4); font('normal', 9, INK); ls.forEach((l, i) => T(l, M + 3, y + 9 + i * 4.3)); y += ls.length * 4.3 + 11; });

    /* --- contato --- */
    y += 4; need(41);
    fill(NAVY); d.roundedRect(M, y, CW, 39, 3, 3, 'F'); font('bold', 11.5, WHITE); T('Dúvidas ou Confirmação do Agendamento?', M + 7, y + 9);
    font('normal', 9, [220, 240, 247]); wrap('Agradecemos a preferência! Caso tenha dúvidas, pode mandar WhatsApp em qualquer número que iremos atender:', CW - 14).forEach((l, i) => T(l, M + 7, y + 15.5 + i * 4.3));
    font('bold', 7.5, [159, 243, 236]); T('WHATSAPP', M + 7, y + 25); T('WHATSAPP', M + CW / 2 + 7, y + 25);
    font('bold', 15, WHITE); T('(75) 98151-6165', M + 7, y + 33); T('(75) 99255-0004', M + CW / 2 + 7, y + 33);
    return d;
  }

  /* ---------- agenda (dias e horários disponíveis) ---------- */
  let agStart = mondayOf(today());
  const SLOT_ST = { livre: 'Livre', reservado: 'Aguardando confirmação', confirmado: 'Confirmado' };
  const WD = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  WD.forEach((n, i) => $('agDias').append(el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', text: n, onclick: (e) => { const b = e.currentTarget; b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); } })));
  async function loadAgenda() {
    const end = addDays(agStart, 6); $('agTitulo').textContent = fmtDia(agStart) + ' a ' + fmtDia(end);
    const { data, error } = await db.from('horarios').select('*').gte('data', agStart).lte('data', end).order('data');
    const box = $('agDays'); box.textContent = '';
    if (error) return box.append(el('p', { class: 'err', text: 'Não foi possível carregar a agenda. Confira se o SQL "supabase-atualizacao-4" foi executado.' }));
    const ids = data.map((h) => h.orcamento_id).filter(Boolean), nomes = {};
    if (ids.length) { const r = await db.from('orcamentos').select('id,nome,bairro').in('id', ids); (r.data || []).forEach((o) => { nomes[o.id] = o; }); }
    for (let i = 0; i < 7; i++) {
      const day = addDays(agStart, i), slots = data.filter((h) => h.data === day).sort((a, b) => (hh(a.inicio) < hh(b.inicio) ? -1 : 1));
      const card = el('div', { class: 'card day' }, el('div', { class: 'dayhead' }, el('b', { text: diaLongo(day) }),
        slots.some((s) => s.status === 'livre') ? el('button', { class: 'btn bad small', type: 'button', text: 'Limpar livres', onclick: async () => { if (!confirm('Excluir os horários livres de ' + fmtDia(day) + '?')) return; await db.from('horarios').delete().eq('data', day).eq('status', 'livre'); loadAgenda(); } }) : null));
      if (!slots.length) card.append(el('p', { class: 'hint', text: 'Sem horários publicados.' }));
      slots.forEach((h) => {
        const o = nomes[h.orcamento_id], semPedido = h.status === 'reservado' && !o;
        card.append(el('div', { class: 'row' }, el('div', {}, el('b', { text: hh(h.inicio) + ' – ' + hh(h.fim) }), o ? el('div', { class: 'hint', text: o.nome + ' · ' + o.bairro }) : null),
          el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end' },
            el('span', { class: 'st ' + (h.status === 'livre' || semPedido ? 'novo' : h.status === 'reservado' ? 'pendente' : 'aprovado'), text: semPedido ? 'Reserva sem pedido' : SLOT_ST[h.status] }),
            o ? el('button', { class: 'btn ghost small', type: 'button', text: 'Abrir pedido', onclick: () => openOrc(h.orcamento_id) }) : null,
            (h.status === 'livre' || semPedido) ? el('button', { class: 'btn bad small', type: 'button', 'aria-label': 'Excluir horário', text: '\u00d7', onclick: async () => { await db.from('horarios').delete().eq('id', h.id); loadAgenda(); } }) : null)));
      });
      box.append(card);
    }
    refreshBadges();
  }
  const agSave = async (rows, okTxt) => {
    const e = $('agErr'); msg(e, '');
    if (!rows.length) return msg(e, 'Nenhum horário novo para publicar (os que já passaram não entram).');
    const { error } = await db.from('horarios').upsert(rows, { onConflict: 'data,inicio', ignoreDuplicates: true });
    if (error) return msg(e, 'Não foi possível publicar. Confira se o SQL "supabase-atualizacao-4" foi executado.');
    msg(e, rows.length + ' ' + okTxt, true); loadAgenda();
  };
  $('agPrev').addEventListener('click', () => { agStart = addDays(agStart, -7); loadAgenda(); });
  $('agNext').addEventListener('click', () => { agStart = addDays(agStart, 7); loadAgenda(); });
  $('formAg').addEventListener('submit', (ev) => {
    ev.preventDefault(); const f = ev.target, e = $('agErr'); msg(e, '');
    const dias = [...document.querySelectorAll('#agDias .chip')].map((b, i) => (b.getAttribute('aria-pressed') === 'true' ? i : -1)).filter((i) => i >= 0);
    if (!dias.length) return msg(e, 'Marque pelo menos um dia da semana.');
    if (!f.ini.value || !f.fim.value) return msg(e, 'Informe o horário inicial e o final.');
    const ini = toMin(f.ini.value), fim = toMin(f.fim.value), dur = Number(f.dur.value);
    if (fim - ini < dur) return msg(e, 'O período é menor que a duração de cada horário.');
    const rows = []; dias.forEach((i) => { const day = addDays(agStart, i); for (let t = ini; t + dur <= fim; t += dur) if (futuro(day, fromMin(t))) rows.push({ data: day, inicio: fromMin(t), fim: fromMin(t + dur) }); });
    agSave(rows, 'horário(s) publicado(s). Os que já existiam foram mantidos.');
  });
  $('formAg1').addEventListener('submit', (ev) => {
    ev.preventDefault(); const f = ev.target, e = $('agErr'); msg(e, '');
    if (!f.data.value || !f.ini.value || !f.fim.value) return msg(e, 'Informe data, início e fim.');
    if (toMin(f.fim.value) <= toMin(f.ini.value)) return msg(e, 'O fim precisa ser depois do início.');
    if (!futuro(f.data.value, f.ini.value)) return msg(e, 'Esse horário já passou.');
    agSave([{ data: f.data.value, inicio: hh(f.ini.value) + ':00', fim: hh(f.fim.value) + ':00' }], 'horário publicado.'); f.reset();
  });
  $('agCopy').addEventListener('click', async () => {
    const e = $('agErr'), prev = addDays(agStart, -7); msg(e, '');
    const { data, error } = await db.from('horarios').select('data,inicio,fim').gte('data', prev).lte('data', addDays(prev, 6));
    if (error || !data.length) return msg(e, 'A semana anterior não tem horários para repetir.');
    agSave(data.map((h) => ({ data: addDays(h.data, 7), inicio: h.inicio, fim: h.fim })).filter((r) => futuro(r.data, r.inicio)), 'horário(s) copiado(s) da semana anterior.');
  });

  /* ---------- caixa ---------- */
  const monthRange = () => { const [y, m] = ($('cxMonth').value || today().slice(0, 7)).split('-').map(Number); const a = y + '-' + String(m).padStart(2, '0') + '-01'; const nx = m === 12 ? (y + 1) + '-01-01' : y + '-' + String(m + 1).padStart(2, '0') + '-01'; return [a, nx]; };
  const sumV = (rows) => rows.reduce((s, r) => s + Number(r.valor), 0);
  async function loadCaixa() {
    if (!$('cxMonth').value) $('cxMonth').value = today().slice(0, 7);
    ['formEnt', 'formSai'].forEach((id) => { const i = $(id).data; if (!i.value) i.value = today(); });
    const [a, nx] = monthRange();
    try {
      const [ent, sai, entAll, saiAll] = await Promise.all([
        db.from('financeiro_entradas').select('*').gte('data', a).lt('data', nx).order('data', { ascending: false }),
        db.from('financeiro_saidas').select('*').gte('data', a).lt('data', nx).order('data', { ascending: false }),
        fetchAll(() => db.from('financeiro_entradas').select('valor').lt('data', nx).order('id')),
        fetchAll(() => db.from('financeiro_saidas').select('valor').lt('data', nx).order('id'))]);
      const E = ent.data || [], S = sai.data || [], te = sumV(E), ts = sumV(S), lucro = te - ts, acum = sumV(entAll) - sumV(saiAll);
      const card = (l, v, cls) => el('div', { class: 'card' }, el('span', { text: l }), el('b', { class: cls || '', text: brl(v) }));
      const cc = $('cxCards'); cc.textContent = '';
      cc.append(card('Entradas do mês', te, 'pos'), card('Saídas do mês', ts, 'neg'), card('Lucro líquido do mês', lucro, lucro >= 0 ? 'pos' : 'neg'), card('Saldo acumulado até o fim do mês', acum, acum >= 0 ? 'pos' : 'neg'));
      const fill = (box, rows, table, kind) => { box.textContent = ''; if (!rows.length) box.append(el('p', { class: 'hint', text: 'Nada registrado neste mês.', style: 'margin-top:10px' }));
        rows.forEach((r) => box.append(el('div', { class: 'row' }, el('div', {}, el('b', { text: r.descricao }), el('div', { class: 'hint', text: fmtDate(r.data + 'T12:00:00') + ' · ' + (r.forma_pagamento || r.categoria || '—') })),
          el('div', { style: 'display:flex;gap:8px;align-items:center' }, el('b', { class: kind, text: brl(r.valor) }), el('button', { class: 'btn bad small', type: 'button', text: '×', 'aria-label': 'Excluir', onclick: async () => { if (!confirm('Excluir este lançamento?')) return; await db.from(table).delete().eq('id', r.id); loadCaixa(); } }))))); };
      fill($('entList'), E, 'financeiro_entradas', 'pos'); fill($('saiList'), S, 'financeiro_saidas', 'neg');
    } catch (e) { $('cxCards').textContent = 'Não foi possível carregar o caixa.'; }
  }
  $('cxMonth').addEventListener('change', loadCaixa);
  const lanc = (formId, table, errId, mk) => $(formId).addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target; msg($(errId), '');
    const valor = num(f.valor.value), desc = f.descricao.value.trim();
    if (!desc || desc.length < 2) return msg($(errId), 'Informe a descrição.'); if (!(valor > 0)) return msg($(errId), 'Informe um valor maior que zero.');
    const { error } = await db.from(table).insert(mk(f, valor, desc)); if (error) return msg($(errId), 'Não foi possível registrar.');
    f.valor.value = ''; f.descricao.value = ''; loadCaixa();
  });
  lanc('formEnt', 'financeiro_entradas', 'entErr', (f, v, d) => ({ data: f.data.value || today(), descricao: d, valor: v, forma_pagamento: f.forma.value || null }));
  lanc('formSai', 'financeiro_saidas', 'saiErr', (f, v, d) => ({ data: f.data.value || today(), descricao: d, valor: v, categoria: f.categoria.value || null }));

  /* ---------- avaliações ---------- */
  async function loadAval() {
    const { data, error } = await db.from('avaliacoes').select('*').eq('status', $('avFilter').value).order('created_at', { ascending: false }).limit(200);
    const box = $('avList'); box.textContent = '';
    if (error) return box.append(el('p', { class: 'err', text: 'Não foi possível carregar as avaliações.' }));
    if (!data.length) box.append(el('p', { class: 'muted', text: 'Nenhuma avaliação nesta lista.' }));
    const setSt = async (id, st) => { await db.from('avaliacoes').update({ status: st, aprovada_em: st === 'aprovada' ? new Date().toISOString() : null }).eq('id', id); loadAval(); refreshBadges(); };
    data.forEach((a) => {
      const btns = el('div', { class: 'actions', style: 'margin-top:10px' });
      if (a.status !== 'aprovada') btns.append(el('button', { class: 'btn ok small', type: 'button', text: 'Aprovar e publicar', onclick: () => setSt(a.id, 'aprovada') }));
      if (a.status === 'aprovada') btns.append(el('button', { class: 'btn ghost small', type: 'button', text: 'Despublicar', onclick: () => setSt(a.id, 'pendente') }));
      if (a.status !== 'rejeitada') btns.append(el('button', { class: 'btn ghost small', type: 'button', text: 'Rejeitar', onclick: () => setSt(a.id, 'rejeitada') }));
      btns.append(el('button', { class: 'btn bad small', type: 'button', text: 'Excluir', onclick: async () => { if (!confirm('Excluir esta avaliação?')) return; await db.from('avaliacoes').delete().eq('id', a.id); loadAval(); refreshBadges(); } }));
      box.append(el('div', { class: 'card' }, el('div', { style: 'display:flex;justify-content:space-between;gap:10px' }, el('b', { text: a.nome + (a.servico ? ' · ' + a.servico : '') }), el('span', { class: 'st ' + a.status, text: STATUS[a.status] })),
        el('div', { style: 'color:#e0a100;letter-spacing:2px', text: '★'.repeat(a.nota) + '☆'.repeat(5 - a.nota) }), a.comentario ? el('p', { text: a.comentario, style: 'margin:6px 0' }) : el('p', { class: 'hint', text: 'Sem comentário.' }), el('span', { class: 'hint', text: fmtDT(a.created_at) }), btns));
    });
  }
  $('avFilter').addEventListener('change', loadAval); $('reloadAv').addEventListener('click', loadAval);
  window.addEventListener('load', boot);
})();
