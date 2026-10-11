/* ===== FSA Clean - Painel administrativo ===== */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const WA_SITE = '(75) 98151-6165';
  const IG_SITE = '@fsa_clean';
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
  const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : Math.round(n * 100) / 100; };
  const numIn = (v) => (v === null || v === undefined ? '' : String(Number(v)).replace('.', ','));
  const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR');
  const fmtDT = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
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
    $('who').textContent = session.user.email; $('login').hidden = true; $('app').hidden = false;
    await loadPrices(); loadOrc(); refreshBadges();
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
    ['orc', 'cx', 'av', 'pr'].forEach((t) => { $('tab-' + t).hidden = t !== b.dataset.tab; });
    ({ orc: loadOrc, cx: loadCaixa, av: loadAval, pr: renderPrices })[b.dataset.tab]();
  }));
  const refreshBadges = async () => {
    const a = await db.from('orcamentos').select('id', { count: 'exact', head: true }).eq('status', 'novo');
    const c = await db.from('avaliacoes').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
    $('newCount').textContent = a.count || 0; $('newCount').hidden = !a.count;
    $('pendCount').textContent = c.count || 0; $('pendCount').hidden = !c.count;
  };

  /* ---------- preços ---------- */
  const loadPrices = async () => {
    const { data, error } = await db.from('precos').select('*').order('chave');
    precoRows = error ? [] : data; P = { base: {}, bairro: {}, tecido: {}, extra: {} };
    precoRows.forEach((r) => { P[r.categoria][r.chave] = Number(r.valor); });
  };
  const GROUPS = { base: 'Preço base', bairro: 'Taxa de bairro', tecido: 'Adicional de tecido', extra: 'Extras e pagamento' };
  const renderPrices = async () => {
    await loadPrices(); const box = $('prGroups'); box.textContent = '';
    Object.keys(GROUPS).forEach((cat) => {
      const rows = precoRows.filter((r) => r.categoria === cat);
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
    if (!data.length) box.append(el('p', { class: 'muted', text: 'Nenhuma solicitação por aqui ainda.' }));
    data.forEach((o) => box.append(el('div', { class: 'card item', onclick: () => openOrc(o.id) },
      el('div', {}, el('b', { text: o.nome }),
        el('span', { class: 'meta', text: [o.tipo_estofado + (o.tamanho ? ' ' + o.tamanho : (o.quantidade > 1 ? ' x' + o.quantidade : '')), o.bairro, fmtDT(o.created_at), (o.fotos || []).length + ' arquivo(s)'].join(' · ') })),
      el('div', { style: 'text-align:right' }, el('span', { class: 'st ' + o.status, text: STATUS[o.status] }), o.total != null ? el('div', { class: 'small', text: brl(o.total), style: 'font-weight:700;margin-top:4px' }) : null))));
    refreshBadges();
  };
  $('fStatus').addEventListener('change', loadOrc); $('reloadOrc').addEventListener('click', loadOrc);

  /* ---------- orçamentos: calculadora ---------- */
  const BASE_KEY = { 'Sofá': 'Sofá (por lugar)', 'Cadeiras': 'Cadeiras (por unidade)', 'Poltronas': 'Poltronas (por unidade)', 'Automotivo': 'Automotivo (por banco)', 'Outro': 'Outro' };
  const lookup = (group, name) => { const k = Object.keys(P[group]).find((x) => norm(x) === norm(name)); return k === undefined ? null : P[group][k]; };
  const suggest = (o) => {
    let base = 0;
    if (o.tipo_estofado === 'Colchão') base = (lookup('base', 'Colchão ' + (o.tamanho || '')) || 0) * o.quantidade;
    else base = (P.base[BASE_KEY[o.tipo_estofado]] || 0) * (o.tipo_estofado === 'Outro' ? 1 : o.quantidade);
    const bairro = lookup('bairro', o.bairro); const taxa = bairro !== null ? bairro : (P.bairro['Padrão'] || 0);
    return { preco_base: base, taxa_bairro: taxa, adicional_tecido: lookup('tecido', o.tipo_tecido) || 0, adicional_pet: o.pets_manchas ? (P.extra['Pets/manchas'] || 0) : 0 };
  };
  const pay = (total) => {
    const pix = P.extra['Desconto Pix (%)'] || 0, card = P.extra['Acréscimo cartão (%)'] || 0;
    return { pix: total * (1 - pix / 100), pixPct: pix, cardTotal: total * (1 + card / 100), parcela: (total * (1 + card / 100)) / 3 };
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
    await loadPrices();
    const fresh = o.preco_base === null;               /* ainda não calculado => sugere */
    const sg = suggest(o);
    const v = { preco_base: fresh ? sg.preco_base : o.preco_base, taxa_bairro: fresh ? sg.taxa_bairro : o.taxa_bairro, adicional_tecido: fresh ? sg.adicional_tecido : o.adicional_tecido, adicional_pet: fresh ? sg.adicional_pet : o.adicional_pet, outros: o.outros, desconto: o.desconto };
    const f = {}; const fld = (key, label) => { f[key] = el('input', { inputmode: 'decimal', value: numIn(v[key]) }); f[key].addEventListener('input', recalc); return el('label', {}, label, f[key]); };
    const totalOut = el('b', { text: brl(0) }), payBox = el('div', { class: 'hint' });
    const status = el('select', {}, ...Object.keys(STATUS).slice(0, 6).map((s) => el('option', { value: s, text: STATUS[s], selected: s === (o.status === 'novo' ? 'em_analise' : o.status) })));
    const obs = el('textarea', { rows: 2, maxlength: 400, placeholder: 'Aparece no PDF (ex.: prazo, condições)' }); obs.value = o.observacoes || '';
    const sum = () => ['preco_base', 'taxa_bairro', 'adicional_tecido', 'adicional_pet', 'outros'].reduce((s, k) => s + num(f[k].value), 0) - num(f.desconto.value);
    function recalc() { const t = Math.max(0, sum()); totalOut.textContent = brl(t); const p = pay(t); payBox.textContent = 'Pix' + (p.pixPct ? ' (' + p.pixPct + '% de desconto)' : '') + ': ' + brl(p.pix) + ' · Cartão até 3x de ' + brl(p.parcela) + ' · Dinheiro: ' + brl(t); }
    const photos = el('div', { class: 'photos' });
    (o.fotos || []).forEach(async (p) => { const u = await signed('orcamentos-fotos', p); if (!u) return; photos.append(el('a', { href: u, target: '_blank', rel: 'noopener' }, isVideo(p) ? el('video', { src: u + '#t=0.1', muted: true, playsinline: true, preload: 'metadata' }) : el('img', { src: u, alt: 'Foto do cliente', loading: 'lazy' }))); });
    const out = el('div', { class: 'actions' }); const note = el('p', { class: 'hint' });
    const waLink = el('a', { class: 'btn ok', target: '_blank', rel: 'noopener', hidden: true, text: 'Abrir conversa no WhatsApp' });
    const pdfLinks = el('div', { class: 'actions', hidden: true });

    const values = () => ({ preco_base: num(f.preco_base.value), taxa_bairro: num(f.taxa_bairro.value), adicional_tecido: num(f.adicional_tecido.value), adicional_pet: num(f.adicional_pet.value), outros: num(f.outros.value), desconto: num(f.desconto.value), total: Math.max(0, Math.round(sum() * 100) / 100), status: status.value, observacoes: obs.value.trim() || null, atualizado_em: new Date().toISOString() });
    const save = async () => { const { error } = await db.from('orcamentos').update(values()).eq('id', o.id); if (error) { msg(note, 'Não foi possível salvar.'); return false; } msg(note, 'Salvo!', true); return true; };

    const phone = (o.whatsapp || '').replace(/\D/g, '');
    const gen = async (btn) => {
      btn.disabled = true; msg(note, 'Gerando PDF...', true);
      try {
        if (status.value === 'novo' || status.value === 'em_analise') status.value = 'orcado';
        if (!(await save())) return;
        const vals = values(); const doc = await buildPdf({ ...o, ...vals });
        const blob = doc.output('blob'); const local = URL.createObjectURL(blob);
        const short = 'orcamento-fsa-clean-' + norm(o.nome).replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '.pdf';
        pdfLinks.textContent = ''; pdfLinks.hidden = false;
        pdfLinks.append(el('a', { class: 'btn ghost', href: local, target: '_blank', rel: 'noopener', text: 'Abrir PDF' }), el('a', { class: 'btn ghost', href: local, download: short, text: 'Baixar PDF' }));
        let link = null; const path = o.id + '.pdf';
        const up = await db.storage.from('orcamentos-pdf').upload(path, blob, { contentType: 'application/pdf', upsert: true });
        if (!up.error) { link = await signed('orcamentos-pdf', path, 604800); await db.from('orcamentos').update({ pdf_path: path }).eq('id', o.id); }
        const p = pay(vals.total);
        const text = 'Olá, ' + o.nome.split(' ')[0] + '! Aqui é da FSA Clean. Segue o seu orçamento para a higienização de ' + o.tipo_estofado.toLowerCase() + ':\n\n' +
          'Total: ' + brl(vals.total) + '\nPix' + (p.pixPct ? ' (com ' + p.pixPct + '% de desconto)' : '') + ': ' + brl(p.pix) + '\nCartão: até 3x de ' + brl(p.parcela) + '\nDinheiro: ' + brl(vals.total) +
          (link ? '\n\nOrçamento completo em PDF (link válido por 7 dias):\n' + link : '') + '\n\nQualquer dúvida, é só responder esta mensagem.';
        const full = phone.length <= 11 ? '55' + phone : phone;
        waLink.href = 'https://wa.me/' + full + '?text=' + encodeURIComponent(text); waLink.hidden = false;
        msg(note, link ? 'PDF gerado e salvo. Toque em "Abrir conversa no WhatsApp" para enviar ao cliente.' : 'PDF gerado, mas não foi possível guardar o link online. Baixe o PDF e envie pelo WhatsApp.', true);
      } catch (e) { msg(note, 'Não foi possível gerar o PDF. Verifique a conexão e tente de novo.'); } finally { btn.disabled = false; }
    };
    const toCash = async (btn) => {
      const t = Math.max(0, sum()); const forma = prompt('Forma de pagamento (Pix, Cartão ou Dinheiro):', 'Pix'); if (forma === null) return;
      const ex = await db.from('financeiro_entradas').select('id').eq('orcamento_id', o.id).limit(1);
      if (ex.data && ex.data.length && !confirm('Este orçamento já foi lançado no caixa. Lançar de novo?')) return;
      btn.disabled = true; await save();
      const r = await db.from('financeiro_entradas').insert({ data: today(), descricao: ('Serviço - ' + o.nome + ' (' + o.tipo_estofado + ')').slice(0, 120), valor: t, forma_pagamento: forma.trim() || null, orcamento_id: o.id });
      if (r.error) { btn.disabled = false; return msg(note, 'Não foi possível lançar no caixa.'); }
      await db.from('orcamentos').update({ status: 'concluido' }).eq('id', o.id); status.value = 'concluido'; btn.disabled = false; msg(note, 'Entrada de ' + brl(t) + ' lançada no caixa.', true);
    };
    const del = async () => {
      if (!confirm('Excluir este orçamento e as fotos enviadas? Não dá para desfazer.')) return;
      const paths = [...(o.fotos || [])]; if (paths.length) await db.storage.from('orcamentos-fotos').remove(paths);
      if (o.pdf_path) await db.storage.from('orcamentos-pdf').remove([o.pdf_path]);
      await db.from('orcamentos').delete().eq('id', o.id); closeDlg();
    };
    const missing = fresh && sg.preco_base === 0 ? el('p', { class: 'hint', text: 'Dica: a sugestão ficou em R$ 0,00 porque a aba Preços ainda não foi preenchida. Você pode digitar os valores aqui mesmo.' }) : document.createComment('sem dica');

    out.append(el('button', { class: 'btn ghost', type: 'button', text: 'Sugerir de novo', onclick: () => { const s = suggest(o); ['preco_base', 'taxa_bairro', 'adicional_tecido', 'adicional_pet'].forEach((k) => { f[k].value = numIn(s[k]); }); recalc(); } }),
      el('button', { class: 'btn', type: 'button', text: 'Salvar', onclick: save }),
      el('button', { class: 'btn', type: 'button', text: 'Gerar PDF (1 clique)', onclick: (e) => gen(e.currentTarget) }));
    body.textContent = '';
    body.append(
      el('div', { class: 'mhead' }, el('div', {}, el('h2', { text: o.nome }), el('span', { class: 'muted small', text: 'Recebido em ' + fmtDT(o.created_at) })), el('button', { class: 'x', type: 'button', 'aria-label': 'Fechar', text: '\u00d7', onclick: closeDlg })),
      el('div', { class: 'kv' },
        el('div', {}, el('span', { text: 'WhatsApp' }), el('a', { href: 'https://wa.me/' + (phone.length <= 11 ? '55' + phone : phone), target: '_blank', rel: 'noopener', text: o.whatsapp })),
        el('div', {}, el('span', { text: 'Bairro' }), o.bairro),
        el('div', {}, el('span', { text: 'Estofado' }), o.tipo_estofado + (o.tamanho ? ' · ' + o.tamanho : '') + (o.quantidade > 1 && o.tipo_estofado !== 'Sofá' ? ' · ' + o.quantidade + ' un.' : '')),
        el('div', {}, el('span', { text: 'Tecido' }), o.tipo_tecido),
        el('div', {}, el('span', { text: 'Pets ou manchas' }), o.pets_manchas ? 'Sim' : 'Não'),
        el('div', {}, el('span', { text: 'Observações do cliente' }), o.detalhes || '—')),
      (o.fotos || []).length ? photos : el('p', { class: 'hint', text: 'O cliente não enviou fotos ou vídeos.' }),
      el('h3', { text: 'Valores', style: 'font-size:1.05rem' }), missing,
      el('div', { class: 'calc' }, fld('preco_base', 'Preço base (tamanho do estofado)'), fld('taxa_bairro', 'Taxa do bairro'), fld('adicional_tecido', 'Adicional de tecido'), fld('adicional_pet', 'Adicional pets/manchas'), fld('outros', 'Outros acréscimos'), fld('desconto', 'Desconto')),
      el('div', { class: 'total' }, el('span', { text: 'Total' }), totalOut), payBox,
      el('div', { class: 'calc' }, el('label', {}, 'Status', status), el('label', {}, 'Observações (aparecem no PDF)', obs)),
      out, note, pdfLinks, waLink,
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
  async function buildPdf(o) {
    const { jsPDF } = window.jspdf; const d = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 16, BLUE = [7, 60, 105], TURQ = [32, 192, 196], GRAY = [98, 116, 134];
    try { d.addImage(await loadLogo(), 'JPEG', M, 12, 48, 25.1); } catch (_) { d.setFont('helvetica', 'bold'); d.setFontSize(20); d.setTextColor(...BLUE); d.text('FSA CLEAN', M, 24); }
    d.setFont('helvetica', 'bold'); d.setFontSize(22); d.setTextColor(...BLUE); d.text('ORÇAMENTO', W - M, 22, { align: 'right' });
    d.setFont('helvetica', 'normal'); d.setFontSize(9.5); d.setTextColor(...GRAY);
    d.text('Nº ' + o.id.slice(0, 8).toUpperCase(), W - M, 29, { align: 'right' }); d.text('Data: ' + fmtDate(new Date()), W - M, 34, { align: 'right' });
    d.setDrawColor(...TURQ); d.setLineWidth(0.9); d.line(M, 42, W - M, 42);
    let y = 52;
    d.setFont('helvetica', 'bold'); d.setFontSize(11); d.setTextColor(...BLUE); d.text('DADOS DO CLIENTE', M, y); y += 6;
    d.setFont('helvetica', 'normal'); d.setFontSize(10.5); d.setTextColor(20, 45, 64);
    d.text('Cliente: ' + o.nome, M, y); y += 5.5; d.text('WhatsApp: ' + o.whatsapp, M, y); y += 5.5; d.text('Bairro: ' + o.bairro + ' - Feira de Santana/BA', M, y); y += 11;
    d.setFont('helvetica', 'bold'); d.setFontSize(11); d.setTextColor(...BLUE); d.text('SERVIÇO', M, y); y += 6;
    d.setFont('helvetica', 'normal'); d.setFontSize(10.5); d.setTextColor(20, 45, 64);
    const serv = 'Higienização de ' + o.tipo_estofado.toLowerCase() + (o.tamanho ? ' (' + o.tamanho + ')' : '') + (o.quantidade > 1 && o.tipo_estofado !== 'Sofá' ? ' - ' + o.quantidade + ' un.' : '') + ' - tecido ' + o.tipo_tecido + (o.pets_manchas ? ' - com pets/manchas' : '');
    d.splitTextToSize(serv, W - 2 * M).forEach((l) => { d.text(l, M, y); y += 5.5; }); y += 6;
    /* tabela de valores */
    d.setFillColor(...BLUE); d.rect(M, y, W - 2 * M, 8, 'F'); d.setTextColor(255, 255, 255); d.setFont('helvetica', 'bold'); d.setFontSize(10);
    d.text('Descrição', M + 3, y + 5.5); d.text('Valor', W - M - 3, y + 5.5, { align: 'right' }); y += 8;
    const lines = [['Serviço (' + o.tipo_estofado + (o.tamanho ? ' ' + o.tamanho : '') + ')', o.preco_base]];
    if (Number(o.taxa_bairro)) lines.push(['Taxa do bairro (' + o.bairro + ')', o.taxa_bairro]);
    if (Number(o.adicional_tecido)) lines.push(['Adicional de tecido (' + o.tipo_tecido + ')', o.adicional_tecido]);
    if (Number(o.adicional_pet)) lines.push(['Adicional pets/manchas', o.adicional_pet]);
    if (Number(o.outros)) lines.push(['Outros acréscimos', o.outros]);
    if (Number(o.desconto)) lines.push(['Desconto', -Number(o.desconto)]);
    d.setFont('helvetica', 'normal'); d.setTextColor(20, 45, 64);
    lines.forEach((r, i) => { if (i % 2 === 0) { d.setFillColor(241, 249, 252); d.rect(M, y, W - 2 * M, 8, 'F'); } d.text(r[0], M + 3, y + 5.5); d.text(brl(r[1]), W - M - 3, y + 5.5, { align: 'right' }); y += 8; });
    d.setFillColor(...TURQ); d.rect(M, y + 2, W - 2 * M, 11, 'F'); d.setFont('helvetica', 'bold'); d.setFontSize(12.5); d.setTextColor(255, 255, 255);
    d.text('TOTAL', M + 3, y + 9.5); d.text(brl(o.total), W - M - 3, y + 9.5, { align: 'right' }); y += 24;
    const p = pay(Number(o.total));
    d.setFontSize(11); d.setTextColor(...BLUE); d.text('FORMAS DE PAGAMENTO', M, y); y += 7; d.setFont('helvetica', 'normal'); d.setFontSize(10.5); d.setTextColor(20, 45, 64);
    d.text('Pix' + (p.pixPct ? ' (com ' + p.pixPct + '% de desconto)' : '') + ':  ' + brl(p.pix), M, y); y += 6;
    d.text('Cartão:  até 3x de ' + brl(p.parcela), M, y); y += 6; d.text('Dinheiro:  ' + brl(o.total), M, y); y += 10;
    if (o.observacoes) { d.setFont('helvetica', 'bold'); d.setTextColor(...BLUE); d.text('OBSERVAÇÕES', M, y); y += 6; d.setFont('helvetica', 'normal'); d.setTextColor(20, 45, 64); d.splitTextToSize(o.observacoes, W - 2 * M).forEach((l) => { d.text(l, M, y); y += 5.5; }); }
    d.setDrawColor(...TURQ); d.setLineWidth(0.5); d.line(M, 275, W - M, 275); d.setFont('helvetica', 'normal'); d.setFontSize(9); d.setTextColor(...GRAY);
    d.text('FSA Clean - Limpeza de estofados - Feira de Santana/BA', W / 2, 281, { align: 'center' }); d.text('WhatsApp ' + WA_SITE + '  |  Instagram ' + IG_SITE, W / 2, 286, { align: 'center' });
    return d;
  }

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
