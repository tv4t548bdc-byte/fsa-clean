/* FSA Clean - mascote interativo (leve): boas-vindas, chat de dúvidas, arrastável, dicas por seção */
(() => {
  if (window.__fsaMascote) return; window.__fsaMascote = 1;
  const SRC = window.FSA_MASCOTE_SRC || 'mascote.webp', WA = '5575981516165';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (_) {} } };
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const waLink = (t) => 'https://wa.me/' + WA + '?text=' + encodeURIComponent(t);

  const css = `.fm,.fm-bubble,.fm-chat,.fm-back{font-family:"DM Sans",system-ui,sans-serif}
.fm{position:fixed;z-index:60;width:96px;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;-webkit-tap-highlight-color:transparent}
.fm.drag{cursor:grabbing}.fm.walk{transition:left 2.2s ease-in-out,top 2.2s ease-in-out}
.fm i{display:block;transform:rotate(var(--lean,0deg));transition:transform .25s}
.fm img{width:100%;height:auto;display:block;pointer-events:none;filter:drop-shadow(0 10px 12px rgba(7,60,105,.28));transform-origin:50% 92%}
.fm.hop img{animation:fmHop .7s ease}
@media(min-width:760px){.fm{width:118px}}
.fm-bubble{position:fixed;z-index:61;max-width:min(250px,72vw);background:#fff;color:#142d40;border:1px solid #dce9ef;border-radius:16px;padding:10px 34px 10px 13px;font-weight:600;font-size:.88rem;line-height:1.4;box-shadow:0 14px 34px rgba(14,67,94,.2);opacity:0;visibility:hidden;transform:translateY(6px) scale(.96);transition:opacity .25s,transform .25s,visibility .25s}
.fm-bubble.on{opacity:1;visibility:visible;transform:none}.fm-bubble button{position:absolute;top:4px;right:6px;border:0;background:none;font-size:1.1rem;color:#627486;cursor:pointer;line-height:1}
.fm-chat{position:fixed;z-index:62;width:min(350px,calc(100vw - 24px));max-height:min(74vh,540px);display:none;flex-direction:column;background:#fff;border-radius:20px;box-shadow:0 26px 70px rgba(7,60,105,.36);overflow:hidden;color:#142d40}.fm-chat.on{display:flex}
.fm-h{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(110deg,#073c69,#087eae);color:#fff}.fm-h img{width:38px;height:auto;border-radius:50%;background:#fff;padding:3px}.fm-h b{display:block;font-size:.95rem}.fm-h small{opacity:.85;font-size:.72rem}.fm-h button{margin-left:auto;border:0;background:rgba(255,255,255,.18);color:#fff;width:32px;height:32px;border-radius:50%;font-size:1.2rem;cursor:pointer}
.fm-m{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f1f9fc;min-height:120px}
.fm-b{max-width:88%;padding:9px 12px;border-radius:14px;font-size:.88rem;line-height:1.45;background:#fff;border:1px solid #dce9ef;align-self:flex-start}.fm-b.u{align-self:flex-end;background:#086fa8;border-color:#086fa8;color:#fff}
.fm-b a,.fm-act{display:inline-block;margin-top:8px;background:#11a96b;color:#fff;text-decoration:none;border:0;border-radius:10px;padding:8px 12px;font:700 .82rem "DM Sans",sans-serif;cursor:pointer}.fm-act{background:#086fa8}
.fm-q{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;border-top:1px solid #dce9ef;max-height:96px;overflow:auto}.fm-q button{border:1.5px solid #dce9ef;background:#fff;border-radius:99px;padding:6px 11px;font:600 .78rem "DM Sans",sans-serif;color:#073c69;cursor:pointer}.fm-q button:hover{border-color:#20c0c4}
.fm-f{display:flex;gap:6px;padding:8px 12px;border-top:1px solid #dce9ef}.fm-f input{flex:1;min-width:0;border:1.5px solid #dce9ef;border-radius:10px;padding:9px 11px;font:500 .88rem "DM Sans",sans-serif}.fm-f input:focus{outline:0;border-color:#20c0c4}.fm-f button{border:0;background:#086fa8;color:#fff;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer}
.fm-o{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 10px}.fm-o button{border:0;background:none;color:#627486;font:600 .72rem "DM Sans",sans-serif;cursor:pointer;text-decoration:underline;padding:2px}
.fm-back{position:fixed;z-index:60;border:0;border-radius:99px;background:#fff;color:#073c69;font-weight:700;font-size:.8rem;padding:9px 14px;box-shadow:0 10px 26px rgba(14,67,94,.22);cursor:pointer}
@keyframes fmBob{50%{transform:translateY(-6px) rotate(-1.5deg)}}@keyframes fmHop{30%{transform:translateY(-18px) scale(1.04)}60%{transform:translateY(0) scale(.98)}}
@media(prefers-reduced-motion:no-preference){.fm:not(.drag) img{animation:fmBob 3.8s ease-in-out infinite}.fm.hop img{animation:fmHop .7s ease}.fm-b{animation:fmIn .25s ease}@keyframes fmIn{from{opacity:0;transform:translateY(6px)}}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  const mk = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const m = mk('div', 'fm'), lean = mk('i'), img = new Image(); img.src = SRC; img.alt = 'Gotinha Clean, mascote da FSA Clean'; img.width = 400; img.height = 562; img.decoding = 'async'; img.draggable = false;
  m.setAttribute('role', 'button'); m.setAttribute('tabindex', '0'); m.setAttribute('aria-label', 'Abrir ajuda com a Gotinha Clean'); lean.append(img); m.append(lean);
  const bub = mk('div', 'fm-bubble'), bt = mk('span'), bx = mk('button', null, '\u00d7'); bx.setAttribute('aria-label', 'Fechar'); bub.append(bt, bx);
  const chat = mk('div', 'fm-chat'); chat.setAttribute('role', 'dialog'); chat.setAttribute('aria-label', 'Ajuda com a Gotinha Clean');
  const back = mk('button', 'fm-back', 'Chamar a Gotinha'); back.hidden = true;
  document.body.append(m, bub, chat, back);

  /* posição (fixa na tela, o mascote acompanha a rolagem) */
  const W = () => innerWidth, H = () => innerHeight, mw = () => m.offsetWidth, mh = () => m.offsetHeight;
  let pos = { x: 10, y: 0 };
  const clampPos = () => { pos.x = Math.max(4, Math.min(W() - mw() - 4, pos.x)); pos.y = Math.max(4, Math.min(H() - mh() - 4, pos.y)); };
  const apply = () => { clampPos(); m.style.left = pos.x + 'px'; m.style.top = pos.y + 'px'; };
  const home = () => { pos.x = 10; pos.y = H() - mh() - 16; apply(); };
  const saved = (() => { try { return JSON.parse(ls.get('fm_pos')); } catch (_) { return null; } })();
  const init = () => { if (saved && typeof saved.x === 'number') { pos.x = saved.x * W(); pos.y = saved.y * H(); apply(); } else home(); };
  const save = () => ls.set('fm_pos', JSON.stringify({ x: pos.x / W(), y: pos.y / H() }));
  const near = (el, gap) => {              /* coloca balão/chat perto do mascote, sempre dentro da tela */
    const w = el.offsetWidth, h = el.offsetHeight, above = pos.y > h + gap + 8;
    let x = pos.x + mw() / 2 > W() / 2 ? pos.x + mw() - w : pos.x;
    x = Math.max(8, Math.min(W() - w - 8, x)); const y = above ? pos.y - h - gap : Math.min(H() - h - 8, pos.y + mh() + gap);
    el.style.left = x + 'px'; el.style.top = Math.max(8, y) + 'px';
  };

  /* balão de fala */
  let bTimer = 0, lastSay = 0;
  const hush = () => { bub.classList.remove('on'); clearTimeout(bTimer); };
  const say = (t, ms = 6000) => { if (chat.classList.contains('on') || m.hidden) return; bt.textContent = t; bub.classList.add('on'); near(bub, 8); clearTimeout(bTimer); bTimer = setTimeout(hush, ms); lastSay = Date.now(); if (!RM) { m.classList.add('hop'); setTimeout(() => m.classList.remove('hop'), 800); } };
  bx.addEventListener('click', hush);

  /* base de respostas (textos do próprio site) */
  const GO = (sel) => () => { closeChat(); const e = document.querySelector(sel); if (e) e.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); };
  const KB = [
    { q: 'Quais estofados vocês higienizam?', k: ['estofad', 'servic', 'sofa', 'colchao', 'cadeira', 'poltrona', 'automotiv', 'carro', 'banco', 'higieniz'], a: 'Atendemos higienização de sofás, colchões, cadeiras, poltronas e bancos automotivos.' },
    { q: 'Como peço um orçamento?', k: ['orcamento', 'pedir', 'solicit', 'contrat', 'formulario', 'foto'], a: 'É só preencher o formulário no topo do site e anexar pelo menos 1 foto do estofado. Você pode juntar vários itens no mesmo pedido. Nossa equipe analisa e envia o orçamento oficial em PDF.', act: ['Ir para o formulário', GO('#orcamento')] },
    { q: 'Quanto custa?', k: ['preco', 'valor', 'custa', 'quanto', 'barato', 'caro'], a: 'O valor depende do tipo de estofado, do tamanho, do tecido e do bairro. Envie as informações e as fotos pelo formulário que a equipe monta o seu orçamento.', act: ['Ir para o formulário', GO('#orcamento')] },
    { q: 'Quanto tempo demora a secagem?', k: ['secag', 'seca', 'demora', 'tempo', 'molhado', 'umido'], a: 'O tempo varia conforme o tecido, a ventilação, a umidade e o tipo de serviço. Consulte nossa equipe para orientações adequadas ao seu caso.' },
    { q: 'Remove todas as manchas?', k: ['mancha', 'sujeira', 'remove', 'tira', 'nodoa'], a: 'O resultado depende do tipo de mancha, do tecido e do tempo em que ela está no estofado. A remoção total não pode ser garantida em todos os casos.' },
    { q: 'Onde vocês atendem?', k: ['atend', 'onde', 'bairro', 'regiao', 'cidade', 'feira', 'local', 'domicilio'], a: 'Nosso atendimento é em Feira de Santana - BA. Consulte pelo WhatsApp a disponibilidade para a sua região.' },
    { q: 'Formas de pagamento', k: ['pagamento', 'pagar', 'pix', 'cartao', 'dinheiro', 'parcel'], a: 'Aceitamos PIX com desconto, cartões de crédito e débito (parcelamento com taxas da máquina) e dinheiro.' },
    { q: 'Tenho pet em casa', k: ['pet', 'cachorro', 'gato', 'animal', 'pelo', 'cheiro', 'odor'], a: 'Pelos, saliva e odores se acumulam nos estofados. A higienização ajuda a deixar o ambiente mais limpo e agradável para a família e para o seu pet.', act: ['Ver a seção de pets', GO('#pets')] },
    { q: 'Quero avaliar a FSA Clean', k: ['avali', 'estrela', 'nota', 'depoimento'], a: 'Que bom! Na barra azul do topo do site, toque nas estrelas e conte como foi o seu atendimento.', act: ['Ir para as avaliações', GO('#avaliacao')] },
    { q: 'Telefones e Instagram', k: ['telefone', 'whatsapp', 'whats', 'contato', 'numero', 'instagram', 'falar'], a: 'WhatsApp: (75) 98151-6165 e (75) 99255-0004. Instagram: @fsa_clean.' }
  ];
  const FALLBACK = 'Não encontrei essa resposta por aqui. Chame a nossa equipe no WhatsApp que ela te ajuda! \uD83D\uDC99';

  /* chat */
  const hd = mk('div', 'fm-h'), av = new Image(); av.src = SRC; av.alt = ''; const ht = mk('div'); ht.append(mk('b', null, 'Gotinha Clean'), mk('small', null, 'Assistente virtual \u00b7 tira dúvidas do site')); const xc = mk('button', null, '\u00d7'); xc.setAttribute('aria-label', 'Fechar'); hd.append(av, ht, xc);
  const msgs = mk('div', 'fm-m'), quick = mk('div', 'fm-q'), form = mk('form', 'fm-f'), inp = mk('input'), go = mk('button', null, 'Enviar'), opts = mk('div', 'fm-o');
  inp.placeholder = 'Escreva a sua dúvida...'; inp.maxLength = 120; inp.setAttribute('aria-label', 'Escreva a sua dúvida'); go.type = 'submit'; form.append(inp, go); chat.append(hd, msgs, quick, form, opts);
  const bubble = (t, user, act) => { const b = mk('div', 'fm-b' + (user ? ' u' : ''), t); if (act) { const a = mk('button', 'fm-act', act[0]); a.type = 'button'; a.addEventListener('click', act[1]); b.append(document.createElement('br'), a); } msgs.append(b); msgs.scrollTop = msgs.scrollHeight; return b; };
  const wa = (t) => { const b = mk('div', 'fm-b'); const a = mk('a', null, 'Falar com a equipe no WhatsApp'); a.href = waLink(t || 'Olá, FSA Clean! Tenho uma dúvida.'); a.target = '_blank'; a.rel = 'noopener'; b.append(a); msgs.append(b); msgs.scrollTop = msgs.scrollHeight; };
  const answer = (item) => setTimeout(() => { bubble(item.a, false, item.act); }, RM ? 0 : 350);
  const ask = (text) => {
    bubble(text, true); const n = norm(text); let best = null, sc = 0;
    KB.forEach((it) => { const s = it.k.reduce((c, k) => c + (n.includes(k) ? 1 : 0), 0); if (s > sc) { sc = s; best = it; } });
    if (best) answer(best); else setTimeout(() => { bubble(FALLBACK); wa(); }, RM ? 0 : 350);
  };
  KB.forEach((it) => { const c = mk('button', null, it.q); c.type = 'button'; c.addEventListener('click', () => { bubble(it.q, true); answer(it); }); quick.append(c); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const t = inp.value.trim(); if (!t) return; inp.value = ''; ask(t); });

  /* opções: dicas, passear, cantinho, esconder */
  let tips = ls.get('fm_tips') !== 'off', walking = false, wTimer = 0;
  const oTips = mk('button', null), oWalk = mk('button', null), oHome = mk('button', null, 'Voltar ao cantinho'), oHide = mk('button', null, 'Esconder a Gotinha');
  [oTips, oWalk, oHome, oHide].forEach((b) => { b.type = 'button'; }); opts.append(oTips); if (!RM) opts.append(oWalk); opts.append(oHome, oHide);
  const label = () => { oTips.textContent = tips ? 'Silenciar dicas' : 'Ativar dicas'; oWalk.textContent = walking ? 'Parar de passear' : 'Deixar passear pela página'; };
  oTips.addEventListener('click', () => { tips = !tips; ls.set('fm_tips', tips ? 'on' : 'off'); label(); });
  const stopWalk = () => { walking = false; clearInterval(wTimer); m.classList.remove('walk'); lean.style.setProperty('--lean', '0deg'); label(); };
  const step = () => { const nx = 8 + Math.random() * (W() - mw() - 16), ny = 90 + Math.random() * Math.max(10, H() - mh() - 190); lean.style.setProperty('--lean', (nx > pos.x ? 8 : -8) + 'deg'); pos.x = nx; pos.y = ny; apply(); setTimeout(() => lean.style.setProperty('--lean', '0deg'), 2200); };
  oWalk.addEventListener('click', () => { if (walking) return stopWalk(); walking = true; m.classList.add('walk'); step(); wTimer = setInterval(step, 4800); label(); closeChat(); say('Vou dar uma voltinha! Me pegue a qualquer momento. \uD83D\uDE04', 4000); });
  oHome.addEventListener('click', () => { stopWalk(); m.classList.add('walk'); home(); save(); setTimeout(() => m.classList.remove('walk'), 2300); });
  oHide.addEventListener('click', () => { stopWalk(); closeChat(); m.hidden = true; ss.set('fm_hide', '1'); back.hidden = false; back.style.left = '10px'; back.style.bottom = 'calc(16px + env(safe-area-inset-bottom,0px))'; });
  back.addEventListener('click', () => { m.hidden = false; back.hidden = true; ss.set('fm_hide', ''); home(); say('Voltei! Como posso ajudar?'); });
  label();

  const openChat = () => { hush(); stopWalk(); chat.classList.add('on'); if (!msgs.children.length) { bubble('Olá! Seja bem-vindo à FSA Clean! \uD83D\uDC4B Eu sou a Gotinha Clean e posso tirar suas dúvidas. Escolha uma pergunta ou escreva a sua.'); } near(chat, 10); if (!matchMedia('(pointer:coarse)').matches) inp.focus(); };
  function closeChat() { chat.classList.remove('on'); }
  xc.addEventListener('click', closeChat);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeChat(); hush(); } });
  m.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chat.classList.contains('on') ? closeChat() : openChat(); } });

  /* arrastar (liberdade de movimento) */
  let d = null;
  m.addEventListener('pointerdown', (e) => { stopWalk(); d = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false }; try { m.setPointerCapture(e.pointerId); } catch (_) {} });
  m.addEventListener('pointermove', (e) => {
    if (!d) return; const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 6) { d.moved = true; m.classList.add('drag'); hush(); closeChat(); }
    if (d.moved) { pos.x = d.ox + dx; pos.y = d.oy + dy; apply(); lean.style.setProperty('--lean', Math.max(-12, Math.min(12, dx / 14)) + 'deg'); }
  });
  const up = () => { if (!d) return; const moved = d.moved; d = null; m.classList.remove('drag'); lean.style.setProperty('--lean', '0deg'); if (moved) save(); else (chat.classList.contains('on') ? closeChat : openChat)(); };
  m.addEventListener('pointerup', up); m.addEventListener('pointercancel', () => { d = null; m.classList.remove('drag'); });
  addEventListener('resize', () => { apply(); if (chat.classList.contains('on')) near(chat, 10); });

  /* dicas ao chegar em cada seção (uma vez cada) */
  const TIPS = { '#orcamento': 'Aqui você pede seu orçamento. Não esqueça de anexar pelo menos 1 foto! \uD83D\uDCF8', '#servicos': 'Estes são os nossos serviços. Qual deles você precisa?', '#resultados': 'Olha só o cuidado nos detalhes! \u2728', '#processo': 'É simples: fale com a gente, receba o orçamento, agende e curta o resultado.', '#pets': 'Tem pet em casa? Dá uma olhada aqui! \uD83D\uDC36', '#duvidas': 'Ficou com alguma dúvida? Clique em mim que eu ajudo!' };
  const shown = {};
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const id = '#' + e.target.id; if (!e.isIntersecting || shown[id] || !tips || Date.now() - lastSay < 5000 || d || walking || m.hidden) return;
      shown[id] = 1; say(TIPS[id], 5500);
    }), { threshold: 0.5 });
    Object.keys(TIPS).forEach((s) => { const el = document.querySelector(s); if (el) io.observe(el); });
  }

  /* início */
  init();
  if (ss.get('fm_hide')) { m.hidden = true; back.hidden = false; back.style.left = '10px'; back.style.bottom = 'calc(16px + env(safe-area-inset-bottom,0px))'; }
  else if (!ss.get('fm_hi')) { setTimeout(() => { say('Oi! Eu sou a Gotinha Clean. Seja bem-vindo! \uD83D\uDC4B Se tiver dúvidas, é só falar comigo!', 8000); ss.set('fm_hi', '1'); }, 1400); }
})();
