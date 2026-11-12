/* =====================================================================
   ILHA — tradução da interface (pt → en, es)
   O site é escrito em português. Este módulo observa tudo o que aparece
   na página e troca pelo texto do idioma escolhido, usando o dicionário
   de js/i18n-dict.js. Números são reconhecidos automaticamente ("§" nas
   chaves) e reformatados (6.704 → 6,704 em inglês). Trechos variáveis
   usam {A}, {B}… nas chaves. Idioma padrão: inglês.
   ===================================================================== */
(function () {
  'use strict';
  const BRUTO = window.ILHA_I18N || [];
  const COL = { en: 1, es: 2 };
  const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
  const NUM = /\d+(?:[.,]\d+)*/g;
  const TEM_LETRA = /[A-Za-zÀ-ÿ]/;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const saida = { en: new Set(), es: new Set() };
  const exato = { en: new Map(), es: new Map() }, pad = { en: {}, es: {} }, padGen = { en: [], es: [] };

  BRUTO.forEach((e) => {
    if (!e || !e[0]) return;
    const src = norm(e[0]), nSrc = (src.match(NUM) || []).length, k = src.replace(NUM, '§');
    ['en', 'es'].forEach((l) => {
      let tr = e[COL[l]]; if (tr === undefined || tr === null) return;
      // números iguais na origem e na tradução viram "§" (assim são reformatados conforme o idioma)
      if (tr.indexOf('§') < 0 && nSrc && (tr.match(NUM) || []).length === nSrc) tr = tr.replace(NUM, '§');
      if (/\{[A-D]\}/.test(k)) {
        let re = '^'; const ordem = [];
        k.split(/(\{[A-D]\}|§)/).forEach((p) => {
          if (p === '§') { re += '(\\d+(?:[.,]\\d+)*)'; ordem.push('n'); }
          else if (/^\{[A-D]\}$/.test(p)) { re += '(.+?)'; ordem.push(p[1]); }
          else re += reEsc(p);
        });
        const o = { re: new RegExp(re + '$'), ordem, tr, n: k.length };
        const pre = k.split(/\{[A-D]\}|§/)[0];
        if (pre.length >= 4) (pad[l][pre.slice(0, 4)] = pad[l][pre.slice(0, 4)] || []).push(o); else padGen[l].push(o);
      } else { exato[l].set(k, tr); saida[l].add(tr); }
    });
  });
  // padrões mais longos (mais específicos) são testados primeiro
  ['en', 'es'].forEach((l) => { padGen[l].sort((a, b) => b.n - a.n); Object.keys(pad[l]).forEach((p) => pad[l][p].sort((a, b) => b.n - a.n)); });

  let lang = 'en';
  try { const s = localStorage.getItem('ilha_lang'); if (s === 'pt' || s === 'en' || s === 'es') lang = s; } catch (e) { /* sem armazenamento */ }
  const cache = new Map(), faltando = new Set();
  const conv = (n) => (lang === 'en' ? n.replace(/[.,]/g, (c) => (c === '.' ? ',' : '.')) : n);
  const convNums = (s) => (lang === 'en' ? s.replace(NUM, conv) : s);
  const preencher = (tpl, nums) => { let i = 0; return tpl.replace(/§/g, () => conv(nums[i++] || '')); };

  // traduz um texto já normalizado; devolve null se não houver tradução
  function trad(s) {
    const nums = s.match(NUM) || [], k = s.replace(NUM, '§');
    const e = exato[lang].get(k);
    if (e !== undefined) return preencher(e, nums);
    const cands = (pad[lang][k.slice(0, 4)] || []).concat(padGen[lang]);
    for (const o of cands) {
      const m = o.re.exec(s);
      if (!m) continue;
      const ns = [], sl = {};
      o.ordem.forEach((x, i) => { if (x === 'n') ns.push(m[i + 1]); else sl[x] = m[i + 1]; });
      return preencher(o.tr, ns).replace(/\{([A-D])\}/g, (_, d) => (sl[d] !== undefined ? frase(sl[d]) : ''));
    }
    return null;
  }
  // traduz preservando símbolos e emojis no começo ("▶ Simular") e pontuação no fim
  function frase(s) {
    if (!TEM_LETRA.test(s.replace(/\{e[a-z]\}/g, ''))) return convNums(s);
    let r = trad(s);
    if (r !== null) return r;
    const m = /^([^A-Za-zÀ-ÿ0-9{(<"'§]+)([\s\S]*?)(\s*[:.…]*)$/.exec(s);
    if (m && m[2]) { r = trad(m[2]); if (r !== null) return m[1] + r + m[3]; }
    const f = /^([\s\S]*?)(\s*[:.…]+)$/.exec(s);
    if (f && f[1]) { r = trad(f[1]); if (r !== null) return r + f[2]; }
    if (saida[lang].has(s.replace(NUM, '§'))) return s;   // já está no idioma escolhido
    // listas ("a · b · c", "a; b"): traduz cada parte
    if (s.indexOf('<') < 0 && s.indexOf('{e') < 0) for (const sep of [' · ', '; ']) if (s.indexOf(sep) > 0) return s.split(sep).map(frase).join(sep);
    faltando.add(s.replace(NUM, '§'));
    return convNums(s);
  }
  function t(raw) {
    if (lang === 'pt' || raw === null || raw === undefined) return raw;
    raw = String(raw);
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw), core = m[2];
    if (!core) return raw;
    let c = cache.get(core);
    if (c === undefined) { c = frase(norm(core)); if (cache.size > 8000) cache.clear(); cache.set(core, c); }
    return m[1] + c + m[3];
  }

  /* ---------------- DOM ---------------- */
  const PULAR = { SCRIPT: 1, STYLE: 1, CANVAS: 1, NOSCRIPT: 1, TEXTAREA: 1, PRE: 1 };
  const INLINE = { B: 1, STRONG: 1, EM: 1, I: 1, SPAN: 1, SMALL: 1, BR: 1, SUB: 1, SUP: 1, U: 1, A: 1, TSPAN: 1, CODE: 1 };
  const ATTRS = ['title', 'aria-label', 'placeholder', 'data-dica', 'alt'];
  const TXT = new WeakMap();
  const ignorada = (el) => el.classList && (el.classList.contains('notr') || el.classList.contains('eq'));

  function inlineOk(c) {
    if (!INLINE[c.tagName.toUpperCase()] || c.id || ignorada(c)) return false;
    for (const f of c.children) if (!inlineOk(f)) return false;
    return true;
  }
  function ehUnidade(el) {
    let temTexto = false;
    for (const c of el.childNodes) {
      if (c.nodeType === 3) { if (/\S/.test(c.nodeValue)) temTexto = true; }
      else if (c.nodeType === 1 && !inlineOk(c)) return false;
    }
    return temTexto;
  }
  function ser(el, slots) {
    let s = '';
    for (const c of el.childNodes) {
      if (c.nodeType === 3) s += c.nodeValue;
      else if (c.nodeType === 1) {
        const tag = c.tagName.toLowerCase();
        if (tag === 'br') s += '<br>';
        else if (c.attributes.length === 0 && TEM_LETRA.test(c.textContent)) s += '<' + tag + '>' + ser(c, slots) + '</' + tag + '>';
        else { slots.push(c); s += '{e' + String.fromCharCode(96 + slots.length) + '}'; }
      }
    }
    return s;
  }
  function tUnidade(src) {
    const m = /^((?:\s|\{e[a-z]\})*)([\s\S]*?)((?:\s|\{e[a-z]\})*)$/.exec(src);
    return m[1] + t(m[2]) + m[3];
  }
  function montar(el, out, slots) {
    const doc = el.ownerDocument, raiz = doc.createDocumentFragment(), pilha = [raiz];
    const re = /<(\/?)(b|strong|em|i|small|sub|sup|u|span|a|tspan|code)>|<br>|\{e([a-z])\}/g;
    let ult = 0, m;
    const texto = (s) => { if (s) pilha[pilha.length - 1].appendChild(doc.createTextNode(s)); };
    while ((m = re.exec(out))) {
      texto(out.slice(ult, m.index)); ult = re.lastIndex;
      if (m[0] === '<br>') pilha[pilha.length - 1].appendChild(doc.createElementNS(el.namespaceURI, 'br'));
      else if (m[3]) { const s = slots[m[3].charCodeAt(0) - 97]; if (s) pilha[pilha.length - 1].appendChild(s); }
      else if (m[1]) { if (pilha.length > 1) pilha.pop(); }
      else { const n = doc.createElementNS(el.namespaceURI, m[2]); pilha[pilha.length - 1].appendChild(n); pilha.push(n); }
    }
    texto(out.slice(ult));
    el.replaceChildren(raiz);
  }
  function render(el) {
    const r = el.__i18n;
    montar(el, lang === 'pt' ? r.src : tUnidade(r.src), r.slots);
    r.slots.forEach((s) => refazer(s));
  }
  function attrs(el) {
    let A = el.__i18nA;
    for (const a of ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      if (!A) A = el.__i18nA = {};
      const atual = el.getAttribute(a);
      if (A[a] === undefined || (A['_' + a] !== atual)) A[a] = atual;   // o site escreveu um valor novo
      const out = t(A[a]); A['_' + a] = out;
      if (out !== atual) el.setAttribute(a, out);
    }
  }
  function procTexto(n) {
    if (!/\S/.test(n.nodeValue)) return;
    let r = TXT.get(n);
    if (!r || r.out !== n.nodeValue) { r = { src: n.nodeValue, out: null }; TXT.set(n, r); }
    r.out = t(r.src);
    if (r.out !== n.nodeValue) n.nodeValue = r.out;
  }
  function proc(n) {
    if (n.nodeType === 3) { procTexto(n); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toUpperCase();
    if (PULAR[tag] || ignorada(n)) return;
    attrs(n);
    if (tag === 'SVG' && !n.querySelector('text, title')) return;
    if (ehUnidade(n)) { const slots = []; n.__i18n = { src: ser(n, slots), slots }; render(n); return; }
    n.__i18n = null;
    for (const c of Array.from(n.childNodes)) proc(c);
  }
  function unidadeAcima(el) {
    for (let e = el; e && e !== document.body; e = e.parentNode) if (e.__i18n) return e;
    return null;
  }
  const CFG = { childList: true, characterData: true, subtree: true };
  const obs = new MutationObserver((recs) => {
    obs.disconnect();
    try {
      const feitos = new Set();
      for (const r of recs) {
        const alvo = r.type === 'characterData' ? r.target.parentNode : r.target;
        if (!alvo || !alvo.isConnected) continue;
        const u = unidadeAcima(alvo);
        if (u) { if (!feitos.has(u)) { feitos.add(u); u.__i18n = null; proc(u); } continue; }
        if (r.type === 'characterData') { procTexto(r.target); continue; }
        r.addedNodes.forEach((n) => { if (n.isConnected && !feitos.has(n)) { feitos.add(n); proc(n); } });
      }
    } catch (e) { console.error('i18n:', e); }
    obs.observe(document.body, CFG);
  });
  // unidades já registradas: refaz a partir do texto original; o resto é processado do zero
  function refazer(n) {
    if (n.nodeType === 3) { const r = TXT.get(n); if (r) { r.out = t(r.src); n.nodeValue = r.out; } else procTexto(n); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toUpperCase();
    if (PULAR[tag] || ignorada(n)) return;
    if (n.__i18nA) { for (const a of ATTRS) if (n.__i18nA[a] !== undefined) { const o = t(n.__i18nA[a]); n.__i18nA['_' + a] = o; n.setAttribute(a, o); } } else attrs(n);
    if (n.__i18n) { render(n); return; }
    // filhos já traduzidos um a um (texto escrito depois do carregamento): refaz cada um pelo original
    let jaVisto = false;
    for (const c of n.childNodes) if ((c.nodeType === 3 && TXT.has(c)) || (c.nodeType === 1 && c.__i18n)) { jaVisto = true; break; }
    if (!jaVisto && ehUnidade(n)) { proc(n); return; }
    for (const c of Array.from(n.childNodes)) refazer(c);
  }
  const TITULO = 'Ilha · O Experimento dos Dois Coelhos';
  function tudo() {
    obs.disconnect();
    cache.clear();
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
    document.title = t(TITULO);
    refazer(document.body);
    obs.observe(document.body, CFG);
  }
  const API = {
    get lang() { return lang; },
    get locale() { return LOCALE[lang]; },
    t,
    definir(l) {
      if (!LOCALE[l]) return;
      lang = l;
      try { localStorage.setItem('ilha_lang', l); } catch (e) { /* ok */ }
      tudo();
      if (API.aoMudar) API.aoMudar();
    },
    faltando: () => Array.from(faltando),
    limparFaltando: () => faltando.clear(),
    aoMudar: null
  };
  window.I18N = API;
  if (document.body) tudo(); else document.addEventListener('DOMContentLoaded', tudo);
})();
