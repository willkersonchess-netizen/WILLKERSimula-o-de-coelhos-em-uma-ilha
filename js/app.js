/* =====================================================================
   ILHA — Interface
   Dados:   window.ILHA_DADOS (dados/resultados.js, gerado por simular.js)
   Motor:   window.IlhaEngine (js/engine.js) — usado pelo Laboratório
   Gráficos: window.Grafico (js/charts.js)
   ===================================================================== */
(function () {
  'use strict';
  const Eng = window.IlhaEngine;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => (n === null || n === undefined || isNaN(n)) ? '—' : Number(n).toLocaleString('pt-BR');
  const fmt1 = (n) => (n === null || n === undefined || isNaN(n)) ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const fmt2 = (n) => (n === null || n === undefined || isNaN(n)) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt3 = (n) => (n === null || n === undefined || isNaN(n)) ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const pct = (x) => (x === null || x === undefined || isNaN(x)) ? '—' : Math.round(x * 100) + '%';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const EST = Eng.ESTACOES;
  const EST_IC = ['🌸', '☀️', '🍂', '❄️'];
  const C = {
    pop: '#1c1c1a', grass: '#4f7d3b', grass2: '#7aa45f', dry: '#b88f2e', earth: '#a8673d', sea: '#3b7ea1', sky: '#4a86b8',
    danger: '#c4513b', warn: '#c48720', good: '#3f8a4f', gene: '#7b5fb0', rabbit: '#f0e6d6', sand: '#c9a95c', muted: '#8c8a81',
    macho: '#4a86b8', femea: '#c96b8e', ninho: '#b9b4a3'
  };
  const COR_CAUSA = { fome: '#c48720', desidratacao: '#6fa8d6', doenca: '#8f73c4', surto: '#c4513b', idade: '#a3a094', neonatal: '#d8d2bf', endogamia: '#c96b8e', clima: '#3b7ea1', basal: '#5c6b5c', predacao: '#e07a3f' };
  const NOME_CAUSA = { fome: 'Fome', desidratacao: 'Desidratação', doenca: 'Doença endêmica', surto: 'Surto', idade: 'Idade', neonatal: 'Ninho (neonatal)', endogamia: 'Endogamia (ninho)', clima: 'Calor/frio', basal: 'Basal (acidentes, parasitas)', predacao: 'Predadores' };
  const COR_PRED = { gato: '#e07a3f', raposa: '#c4513b', arminho: '#a8873a', rapina: '#7b5fb0' };
  // chuva média de referência por estação, do regime de estações da simulação atual
  const chuvaRef = () => (RES && RES.regime ? RES.regime.chuva : [210, 90, 150, 130]);

  let D = null, BASE100 = null, ORIG = null, RES = null, IDX = 0, timer = null, vista = 'geral', cenSel = 'A', predSel = 'P1', labMC = null, DUR = 50;
  let cumNasc = [], cumMort = [];
  const G = {};

  /* ---------------- utilidades ---------------- */
  function rotulo(i) { if (i === 0) return 'Início · primavera do ano 1'; const r = RES.registros[i]; return `${EST[r.est]} do ano ${r.ano}`; }
  function rotuloCurto(i) { if (i === 0) return 'Início'; const r = RES.registros[i]; return `Ano ${r.ano} · ${EST[r.est]}`; }
  // "no verão do ano 5" / "na primavera do ano 3"
  function quando(i) { if (i === 0) return 'no início'; const r = RES.registros[i]; return (r.est === 0 ? 'na ' : 'no ') + EST[r.est].toLowerCase() + ' do ano ' + r.ano; }
  function carregando(on, txt) { $('carregando').classList.toggle('vis', !!on); if (txt) $('carregandoTxt').textContent = txt; }
  function baixar(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function grafico(id, cfg) {
    if (G[id] && G[id].ro) G[id].ro.disconnect();
    const el = $(id); if (!el) return null;
    G[id] = new Grafico(el, cfg); G[id]._sazonal = cfg._sazonal !== false; G[id]._anual = !!cfg._anual;
    return G[id];
  }
  const col = (k, f) => RES.registros.map(r => f ? f(r) : r[k]);
  const baseSaz = (extra) => Object.assign({ _sazonal: true, titulo: rotulo, onClick: irPara, altura: 230 }, extra);
  const baseAno = (extra) => Object.assign({ _sazonal: false, _anual: true, passos: [1, 2, 5, 10], rotuloX: (i) => 'Ano ' + (i + 1), titulo: (i) => 'Ano ' + (i + 1), altura: 220, onClick: (i) => irPara(i * 4 + 1) }, extra);

  /* ---------------- inicialização ---------------- */
  function iniciar() {
    if (!Eng) { erroFatal('O arquivo js/engine.js não foi carregado.'); return; }
    if (typeof Grafico === 'undefined') { erroFatal('O arquivo js/charts.js não foi carregado.'); return; }
    D = (window.ILHA_DADOS && window.ILHA_DADOS.base) ? window.ILHA_DADOS : semDados();
    BASE100 = D.base;
    (D.cenarios || []).forEach(c => { c.serie100 = c.serie; });
    $('versao').textContent = 'v' + (BASE100.versao || Eng.VERSAO) + (BASE100.gerado ? ' · dados gerados em ' + new Date(BASE100.gerado).toLocaleString('pt-BR') : '');
    $('parGpot').textContent = fmt1(BASE100.calibracao.Gpot) + ' kg MS/ha/mês (pico)';
    prepararDuracao(DUR);
    RES = ORIG;
    montarTimebar(); montarLab(); montarEventosUI(); montarNavegacao(); montarCentral(); montarGuia();
    sincronizarDuracao(DUR);
    renderTudo();
    irPara(0);
  }
  // Sem o arquivo de dados: roda a simulação original (100 anos) no próprio navegador, sem Monte Carlo/cenários.
  function semDados() {
    console.warn('dados/resultados.js não encontrado: simulação executada no navegador. Rode "node simular.js".');
    return { base: Eng.simular({ semente: 42, anos: 100 }), repsBase: null, cenarios: [], meta: { semDados: true, anos: 100 } };
  }
  // Recorta os 100 anos pré-calculados para a duração escolhida (idêntico a simular N anos)
  function prepararDuracao(anos) {
    DUR = clamp(Math.round(anos), 10, BASE100.parametros.anos);
    ORIG = Eng.truncar(BASE100, DUR);
    D.mcBase = D.repsBase ? Eng.mcDeReps(D.repsBase, DUR) : null;
    const n = DUR * 4 + 1;
    (D.cenarios || []).forEach(c => {
      const s = c.serie100;
      c.serie = Object.assign({}, s, { N: s.N.slice(0, n), grama: s.grama.slice(0, n), R: s.R.slice(0, n), Hs: s.Hs.slice(0, n), arvore: s.arvore.slice(0, n), solo: s.solo.slice(0, n), F: s.F.slice(0, n), K: s.K.slice(0, n), saude: s.saude.slice(0, n), pred: s.pred.slice(0, n), predPor: Object.fromEntries(Object.entries(s.predPor || {}).map(([t, v]) => [t, v.slice(0, n)])) });
      c.mc = c.reps ? Eng.mcDeReps(c.reps, DUR) : null;
    });
    D.meta.anosVista = DUR;
  }
  function sincronizarDuracao(anos) {
    $('ccAnos').value = anos; $('ccAnosVal').textContent = anos;
    $('durTopo').value = anos; $('durTopoVal').textContent = anos + ' anos';
    $('labAnos').value = anos; $('labAnosVal').textContent = anos + ' anos';
    $('topoTitulo').textContent = `Ilha · ${anos} anos`;
  }
  function porExtenso(n) {
    const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const e = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    let s;
    if (n === 100) s = 'cem'; else if (n < 10) s = u[n]; else if (n < 20) s = e[n - 10]; else s = d[Math.floor(n / 10)] + (n % 10 ? ' e ' + u[n % 10] : '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  // Navegação: página única; o menu lateral destaca a seção visível
  function montarNavegacao() {
    window.irPagina = (_pag, alvo) => { const el = document.getElementById(alvo || 'topo'); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
    const links = [...document.querySelectorAll('.menu a')];
    links.forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-aberto')));
    $('abrirMenu').addEventListener('click', () => document.body.classList.toggle('menu-aberto'));
    $('veu').addEventListener('click', () => document.body.classList.remove('menu-aberto'));
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('ativo', l.getAttribute('href') === '#' + e.target.id)); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('main section[id]').forEach(s => obs.observe(s));
  }
  // Central de experimento (tela principal): duração, predadores, chuva, tamanho da ilha
  function montarCentral() {
    let tDur = null;
    const mudarDur = (v, imediato) => {
      sincronizarDuracao(+v);
      clearTimeout(tDur);
      tDur = setTimeout(() => aplicarExperimento(), imediato ? 0 : 350);
    };
    $('ccAnos').addEventListener('input', () => mudarDur($('ccAnos').value));
    $('durTopo').addEventListener('input', () => mudarDur($('durTopo').value));
    document.querySelectorAll('#ccPred button').forEach(b => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on);
      const t = b.dataset.t; $('lpOn_' + t).checked = on; $('lp_' + t).classList.toggle('on', on);
      marcarPendente();
    }));
    const seg = (id, param) => document.querySelectorAll(`#${id} button`).forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll(`#${id} button`).forEach(x => x.classList.toggle('on', x === b));
      const inp = $('par_' + param); inp.value = b.dataset.v; inp.dispatchEvent(new Event('input'));
      marcarPendente();
    }));
    seg('ccClima', 'chuva_vies'); seg('ccIlha', 'area_ha');
    document.querySelectorAll('#ccEst button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('#ccEst button').forEach(x => x.classList.toggle('on', x === b));
      $('labEstacoes').value = b.dataset.v; marcarPendente();
    }));
    $('ccSimular').addEventListener('click', () => aplicarExperimento(true));
    $('ccReset').addEventListener('click', () => { resetLab(); sincronizarCentral(); aplicarExperimento(false); });
  }
  function marcarPendente() { $('centralStatus').textContent = 'Alterações prontas: clique em Simular.'; $('ccSimular').classList.add('pulsa'); }
  // Reflete na central o que está no Laboratório
  function sincronizarCentral() {
    Object.keys(Eng.PRED_TIPOS).forEach(t => { const b = document.querySelector(`#ccPred button[data-t="${t}"]`); if (b) b.setAttribute('aria-pressed', $('lpOn_' + t).checked); });
    const marca = (id, v) => document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - v) < 1e-9));
    marca('ccClima', +$('par_chuva_vies').value); marca('ccIlha', +$('par_area_ha').value);
    document.querySelectorAll('#ccEst button').forEach(b => b.classList.toggle('on', b.dataset.v === $('labEstacoes').value));
  }
  // ignorarSemente: mesmos parâmetros do original, com outra sorte (vale o Monte Carlo pré-calculado)
  function ehPadrao(p, ignorarSemente) {
    return Eng.PARAM_META.every(m => Math.abs(p[m.k] - Eng.PADRAO[m.k]) < 1e-9) && p.fundadores === 'par_adulto' && (ignorarSemente || p.semente === 42) && p.surtos_doenca && !p.predadores.length && p.estacoes === Eng.PADRAO.estacoes;
  }
  // Mostra a simulação original recortada (instantâneo) ou roda o motor com os parâmetros escolhidos
  // novaSorte: cada simulação pedida pela Central usa uma semente aleatória nova (a menos que a sorte esteja fixada)
  function aplicarExperimento(novaSorte) {
    if (novaSorte && $('ccSorteNova').checked) $('labSemente').value = 1 + Math.floor(Math.random() * 999998);
    const clicou = novaSorte;
    const p = lerLab();
    $('ccSimular').classList.remove('pulsa');
    if (ehPadrao(p) && +$('labReps').value === 1) {
      parar();
      prepararDuracao(p.anos); RES = ORIG; labMC = null;
      atualizarTimebarOpcoes(); renderTudo(); irPara(Math.min(IDX, RES.registros.length - 1));
      $('centralStatus').textContent = `Mostrando a simulação original (${p.anos} anos).`;
      $('labResultado').innerHTML = '';
      return;
    }
    rodarLab(clicou);
  }  function montarGuia() {
    let fechado = false; try { fechado = localStorage.getItem('ilha_guia') === '1'; } catch (e) { /* sem armazenamento */ }
    if (fechado) $('guiaBox').classList.add('oculto');
    $('guiaFechar').addEventListener('click', () => { $('guiaBox').classList.add('oculto'); try { localStorage.setItem('ilha_guia', '1'); } catch (e) { /* ok */ } });
  }
  function erroFatal(msg) {
    document.querySelector('main').innerHTML = `<div class="erro-box"><h2>Não foi possível iniciar</h2><p>${esc(msg)}</p><p class="muted">Confira se as pastas <code>js/</code>, <code>css/</code> e <code>dados/</code> estão ao lado do index.html.</p></div>`;
  }

  /* ---------------- renderização completa (troca de fonte de dados) ---------------- */
  function renderTudo() {
    cumNasc = []; cumMort = []; let a = 0, b = 0;
    RES.registros.forEach(r => { a += r.nasc; b += r.mortes; cumNasc.push(a); cumMort.push(b); });
    const lab = RES !== ORIG;
    document.body.classList.toggle('modo-lab', lab);
    $('fonteBadge').textContent = lab ? 'Laboratório' : 'Original';
    $('fonteBadge').classList.toggle('lab', lab);
    const anos = RES.parametros.anos;
    document.querySelectorAll('.tAnos').forEach(e => { e.textContent = anos; });
    document.querySelectorAll('.tAnosExtenso').forEach(e => { e.textContent = porExtenso(anos); });
    document.querySelectorAll('.tEst').forEach(e => { e.textContent = anos * 4; });
    const dec = anos <= 40 ? 10 : 25;
    $('popFaixa').innerHTML = `<option value="">${anos} anos</option>` + Array.from({ length: Math.ceil(anos / dec) }, (_, k) => `<option value="${k * dec * 4}-${Math.min(anos, (k + 1) * dec) * 4}">Anos ${k * dec + 1}–${Math.min(anos, (k + 1) * dec)}</option>`).join('');
    renderHeroi(); criarGraficos(); renderTimeline(); renderTabelas(); renderRelatorio(); renderCenarios(); renderClimaFatos();
    renderGenealogia(); renderGeneCards(); marcasTimebar(); renderCapitulos(); renderPredadores();
  }

  function renderHeroi() {
    const S = RES.resumo, mc = labMC || (RES === ORIG || ehPadrao(Object.assign(lerLab(), { anos: RES.parametros.anos }), true) ? D.mcBase : null);
    const st = [
      { v: fmt(S.Nmax), l: 'maior população (' + quando(S.iMax) + ')' },
      { v: S.extinta ? 'Extinta' : fmt(S.Nfinal), l: S.extinta ? 'população final: extinção ' + mesTxt(S.mesExtincao) : 'coelhos ao final dos ' + RES.parametros.anos + ' anos' },
      { v: mc ? pct(mc.pExtincao) : '—', l: mc ? `risco de extinção em ${RES.parametros.anos} anos (${mc.reps} repetições)` : 'risco de extinção: escolha repetições no Laboratório' },
      { v: Math.round(S.final.saude) + '/100', l: 'saúde do ecossistema no fim' }
    ];
    $('heroiStats').innerHTML = st.map(s => `<div class="hs"><div class="v">${s.v}</div><div class="l">${s.l}</div></div>`).join('');
    // minigráfico: coelhos ao fim de cada ano (barras claras = anos de queda)
    const A = RES.anual;
    $('heroiMgSub').textContent = `anos 1 a ${A.length} · clique para ir ao ano`;
    grafico('gHeroi', { _sazonal: false, _anual: true, altura: 150, legenda: false, padL: 44, padT: 8, padB: 24,
      passos: [1, 2, 5, 10, 20, 25], rotuloX: (i) => String(i + 1), titulo: (i) => 'Fim do ano ' + (i + 1),
      series: [{ rotulo: 'Coelhos', tipo: 'barra', dados: A.map(a => a.Nfim), cor: C.pop, corFn: (v, i) => i > 0 && v < A[i - 1].Nfim * 0.6 ? '#c9c5b6' : C.pop }],
      fmtV: (v) => fmt(v) + ' coelhos', onClick: (i) => { parar(); irPara((i + 1) * 4); } });
  }
  function mesTxt(m) { if (m === null || m === undefined) return ''; const y = Math.floor(m / 12), s = Math.floor((m % 12) / 3); return (s === 0 ? 'na ' : 'no ') + EST[s].toLowerCase() + ' do ano ' + (y + 1); }

  /* ---------------- gráficos ---------------- */
  function criarGraficos() {
    const R = RES.registros, P = RES.parametros;
    const marcas = RES.eventos.filter(e => e.i > 0).map(e => ({ i: e.i, icone: e.icone, rotulo: e.titulo, cor: e.nivel === 'mau' ? C.danger : e.nivel === 'bom' ? C.good : C.warn }));
    const mostrarK = $('popK').getAttribute('aria-pressed') === 'true';
    grafico('gPop', baseSaz({
      altura: 440, zoom: true, log: $('popLog').getAttribute('aria-pressed') === 'true', rotuloY: 'coelhos vivos', aria: 'Gráfico de linha da população de coelhos ao longo do tempo',
      series: [
        { rotulo: 'Capacidade da estação (dinâmica)', dados: col('K'), cor: C.sky, tracejado: true, largura: 1.4, oculto: !mostrarK, semPonto: true },
        { rotulo: 'População de coelhos', dados: col('N'), cor: C.pop, largura: 2.4, area: true }
      ],
      sombra: { a: 1, b: 0, cor: 'rgba(196,81,59,.22)' },
      refs: [{ y: P.K_referencia, cor: 'rgba(28,28,26,.35)', texto: 'Referência inicial: ' + fmt(P.K_referencia) + ' (estação chuvosa média, ilha intacta)', rotulo: 'Capacidade de referência (premissa)', incluir: true }],
      marcas,
      tooltip: (i) => {
        const r = R[i];
        return `<div class="tt-t">${rotulo(i)}</div>
          <div class="tt-r"><span><i class="tt-s" style="background:${C.pop}"></i>População</span><b>${fmt(r.N)}</b></div>
          <div class="tt-r"><span>Nascimentos</span><b>+${fmt(r.nasc)}</b></div>
          <div class="tt-r"><span>Mortes</span><b>−${fmt(r.mortes)}</b></div>
          <div class="tt-r"><span><i class="tt-s" style="background:${C.sky}"></i>Capacidade da estação</span><b>${fmt(r.K)}</b></div>
          <div class="tt-r"><span>Índice alimentar</span><b>${pct(r.indAlim)}</b></div>`;
      },
      onRange: (a, b) => { $('popFaixa').value = ''; }
    }));

    // Ecossistema
    grafico('gGrama', baseSaz({ rotuloY: 'kg MS/ha', series: [
      { rotulo: 'Grama verde', dados: col('Gg'), cor: C.grass, area: true },
      { rotulo: 'Grama seca em pé', dados: col('Gd'), cor: C.dry }], un: 'kg/ha' }));
    grafico('gGramaFlux', baseSaz({ rotuloY: 'kg MS/ha/estação', series: [
      { rotulo: 'Crescimento', tipo: 'barra', dados: col('gramaCresc'), cor: C.grass },
      { rotulo: 'Consumo', tipo: 'barra', dados: col('gramaCons'), cor: C.earth },
      { rotulo: 'Decomposição', tipo: 'barra', dados: col('gramaDecomp'), cor: '#6d7d70' }] }));
    grafico('gGramaIdx', baseSaz({ yMin: 0, yMax: 1, fmtY: (v) => v.toFixed(1).replace('.', ','), series: [
      { rotulo: 'Vigor das raízes (R)', dados: col('R'), cor: C.grass },
      { rotulo: 'Banco de sementes (S)', dados: col('S'), cor: C.sand },
      { rotulo: 'Perda permanente', dados: col('perdaPerm'), cor: C.danger, tracejado: true }] }));
    grafico('gArb', baseSaz({ rotuloY: 'kg MS/ha', series: [
      { rotulo: 'Estrutura lenhosa', dados: col('Hs'), cor: '#7fae6a', area: true },
      { rotulo: 'Folhas e brotos acessíveis', dados: col('Hb'), cor: C.grass }] }));
    grafico('gArbFlux', baseSaz({ rotuloY: 'kg MS/ha/estação', series: [
      { rotulo: 'Brotos consumidos', tipo: 'barra', dados: col('arbCons'), cor: C.earth },
      { rotulo: 'Crescimento lenhoso', tipo: 'barra', dados: col('arbCresc'), cor: C.grass },
      { rotulo: 'Estrutura morta', tipo: 'barra', dados: col('arbMort'), cor: C.danger }] }));
    grafico('gArv', baseSaz({ yMin: 0, yMax: 1, fmtY: (v) => v.toFixed(1).replace('.', ','), series: [
      { rotulo: 'Saúde geral', dados: col('arvSaude'), cor: C.grass, largura: 2.6 },
      { rotulo: 'Vigor', dados: col('arvVigor'), cor: C.good, tracejado: true },
      { rotulo: 'Casca intacta', dados: col('arvCasca'), cor: C.earth },
      { rotulo: 'Copa (folhas)', dados: col('arvFolhas'), cor: C.sky }] }));
    grafico('gSolo', baseSaz({ yMin: 0, yMax: 1.1, fmtY: (v) => v.toFixed(1).replace('.', ','), series: [
      { rotulo: 'Cobertura vegetal', dados: col('cobertura'), cor: C.grass },
      { rotulo: 'Matéria orgânica (rel.)', dados: col('MO'), cor: C.earth },
      { rotulo: 'Crosta superficial', dados: col('crosta'), cor: C.danger, tracejado: true },
      { rotulo: 'Umidade do solo', dados: col('umidade'), cor: C.sky }] }));
    grafico('gErosao', baseSaz({ rotuloY: 't/ha', series: [{ rotulo: 'Erosão acumulada', dados: col('erosaoAcum'), cor: C.earth, area: true }],
      tooltip: (i) => `<div class="tt-t">${rotulo(i)}</div><div class="tt-r"><span>Erosão acumulada</span><b>${fmt1(R[i].erosaoAcum)} t/ha</b></div><div class="tt-r"><span>Nesta estação</span><b>${fmt2(R[i].erosao)} t/ha</b></div><div class="tt-r"><span>Profundidade do solo</span><b>${fmt1(R[i].prof)} cm</b></div>` }));

    // Dinâmica
    grafico('gNascMort', baseSaz({ empilhado: true, rotuloY: 'coelhos/estação', altura: 250, series: [
      { rotulo: 'Nascimentos', tipo: 'barra', dados: col('nasc'), cor: C.good },
      { rotulo: 'Mortes', tipo: 'barra', dados: col('mortes', r => -r.mortes), cor: C.danger }],
      fmtY: (v) => fmtNum(Math.abs(v)) }));
    grafico('gCausas', baseSaz({ empilhado: true, rotuloY: 'mortes/estação', altura: 250,
      series: Eng.CAUSAS.map(c => ({ rotulo: NOME_CAUSA[c], tipo: 'area', dados: col(null, r => r.mc[c]), cor: COR_CAUSA[c], opac: .8 })) }));
    grafico('gEstrutura', baseSaz({ rotuloY: 'coelhos', series: [
      { rotulo: 'Adultos', dados: col('adultos'), cor: C.pop },
      { rotulo: 'Imaturos', dados: col('filhotes'), cor: C.sand, tracejado: true },
      { rotulo: 'Fêmeas reprodutivas', dados: col('femRep'), cor: C.femea }] }));
    grafico('gSobrev', baseSaz({ yMin: 0, yMax: 1, fmtY: (v) => Math.round(v * 100) + '%', series: [
      { rotulo: 'Filhotes que sobrevivem ao ninho', dados: col('sobrevFilhotes'), cor: C.earth },
      { rotulo: 'Sobrevivência da população na estação', dados: col('sobrev'), cor: C.good }], fmtV: (v) => pct(v) }));
    grafico('gIdade', baseSaz({ rotuloY: 'meses / gerações', series: [
      { rotulo: 'Idade média (meses)', dados: col('idadeMedia'), cor: C.sand },
      { rotulo: 'Geração mais avançada', dados: col('gerMax', r => r.N ? r.gerMax : null), cor: C.gene }] }));
    grafico('gSexo', baseSaz({ yMin: 0, yMax: 1, fmtY: (v) => Math.round(v * 100) + '%', refs: [{ y: .5, cor: 'rgba(28,28,26,.25)' }],
      series: [{ rotulo: 'Fração de machos', dados: col(null, r => r.N >= 4 ? r.machos / r.N : null), cor: C.macho }], fmtV: (v) => pct(v) }));
    const acum = {}; Eng.CAUSAS.forEach(c => { let s = 0; acum[c] = R.map(r => (s += r.mc[c])); });
    grafico('gMortAcum', baseSaz({ empilhado: true, rotuloY: 'mortes acumuladas',
      series: Eng.CAUSAS.map(c => ({ rotulo: NOME_CAUSA[c], tipo: 'area', dados: acum[c], cor: COR_CAUSA[c], opac: .8 })) }));

    // Genética
    grafico('gF', baseSaz({ yMin: 0, fmtY: (v) => v.toFixed(2).replace('.', ','), refs: [{ y: .25, cor: 'rgba(196,135,32,.7)', texto: 'F = 0,25 (filhos de irmãos)' }], series: [
      { rotulo: 'F médio da população', dados: col('F'), cor: C.gene, largura: 2.4 },
      { rotulo: 'F dos filhotes nascidos', dados: col('Fnasc'), cor: C.femea, tracejado: true }], fmtV: fmt3 }));
    grafico('gHe', baseSaz({ yMin: 0, yMax: 1.05, fmtY: (v) => v.toFixed(1).replace('.', ','), series: [
      { rotulo: 'Heterozigosidade relativa (He/He₀)', dados: col('He'), cor: C.gene, largura: 2.4 },
      { rotulo: 'Alelos fundadores restantes (fração)', dados: col(null, r => r.alelos === null ? null : r.alelos / (r.alelosMax || 4)), cor: C.sand }], fmtV: fmt3 }));
    grafico('gNe', baseSaz({ log: true, rotuloY: 'indivíduos', series: [
      { rotulo: 'Ne demográfico', dados: col('Ne'), cor: C.gene },
      { rotulo: 'Ne (média harmônica acumulada)', dados: col('NeHarm'), cor: C.sand, tracejado: true },
      { rotulo: 'População (N)', dados: col('N'), cor: 'rgba(28,28,26,.25)', largura: 1.2 }] }));

    // Clima
    const AN = RES.anual, pr = RES.regime ? RES.regime.principal : 0;
    $('tChuvaPrim').textContent = `Chuva do ${EST[pr].toLowerCase()} (estação chuvosa principal) por ano`.replace('do primavera', 'da primavera');
    $('sChuvaPrim').textContent = `1,0 = chuva média (${Math.round(chuvaRef()[pr])} mm). Barras ocre: anos secos (< 0,9); azuis: chuvosos (> 1,1). Regime: ${RES.regime ? RES.regime.nome : ''}.`;
    grafico('gChuvaPrim', baseAno({ yMin: 0, yMax: 1.4, fmtY: (v) => v.toFixed(1).replace('.', ','), refs: [{ y: 1, cor: 'rgba(28,28,26,.3)', texto: 'média' }], series: [
      { rotulo: 'Multiplicador da chuva da estação chuvosa', tipo: 'barra', dados: AN.map(a => a.multPrim), cor: C.sky, corFn: (v) => v < 0.9 ? C.dry : v > 1.1 ? C.sea : '#b9b4a3' }],
      tooltip: (i) => `<div class="tt-t">Ano ${i + 1}</div><div class="tt-r"><span>Estação chuvosa</span><b>${pct(AN[i].multPrim)} da média</b></div><div class="tt-r"><span>Chuva nela</span><b>${fmt1(AN[i].chuvaPrim)} mm</b></div><div class="tt-r"><span>População no fim do ano</span><b>${fmt(AN[i].Nfim)}</b></div>` }));
    const refAno = chuvaRef().reduce((a, b) => a + b, 0);
    grafico('gChuvaAno', baseAno({ rotuloY: 'mm/ano', refs: [{ y: refAno, cor: 'rgba(28,28,26,.3)', texto: 'referência' }], series: [{ rotulo: 'Chuva no ano', tipo: 'barra', dados: AN.map(a => a.chuva), cor: C.sea }], fmtV: (v) => fmt1(v) + ' mm' }));
    grafico('gTemp', baseSaz({ rotuloY: '°C', yMin: null, series: [{ rotulo: 'Temperatura média da estação', dados: col(null, r => r.inicial ? null : r.T), cor: C.warn }], fmtV: (v) => fmt1(v) + ' °C' }));
    grafico('gUmid', baseSaz({ yMin: 0, yMax: 1.1, fmtY: (v) => v.toFixed(1).replace('.', ','), series: [
      { rotulo: 'Umidade média do solo (relativa)', dados: col('umidade'), cor: C.sky, area: true },
      { rotulo: 'Capacidade de retenção (relativa à inicial)', dados: col(null, r => r.CRA / R[0].CRA), cor: C.earth, tracejado: true }], fmtV: fmt2 }));

    // Capacidade
    grafico('gCap', baseSaz({ altura: 300, rotuloY: 'coelhos', series: [
      { rotulo: 'Capacidade da estação', dados: col('K'), cor: C.sky, tracejado: true, semPonto: true },
      { rotulo: 'População', dados: col('N'), cor: C.pop, largura: 2.2 },
      { rotulo: 'Capacidade sustentável anual', dados: col('Ksust'), cor: C.good, largura: 1.6, semPonto: true }],
      sombra: { a: 1, b: 0, cor: 'rgba(196,81,59,.22)' },
      refs: [{ y: P.K_referencia, cor: 'rgba(28,28,26,.35)', texto: 'premissa: ' + fmt(P.K_referencia) }] }));
    grafico('gCapPrim', baseAno({ rotuloY: 'coelhos', refs: [{ y: P.K_referencia, cor: 'rgba(28,28,26,.35)', texto: fmt(P.K_referencia) }], series: [
      { rotulo: 'Capacidade da estação chuvosa', tipo: 'barra', dados: AN.map(a => a.Kprim), cor: C.grass2 },
      { rotulo: 'Capacidade sustentável', tipo: 'barra', dados: AN.map(a => a.Ksust), cor: C.good }] }));
    grafico('gAlim', baseSaz({ yMin: 0, yMax: 1.15, fmtY: (v) => Math.round(v * 100) + '%', refs: [{ y: 1, cor: 'rgba(28,28,26,.25)' }, { y: .7, cor: 'rgba(230,106,90,.6)', texto: 'crise alimentar (< 70%)' }], series: [
      { rotulo: 'Índice alimentar (média da estação)', dados: col(null, r => r.N > 0 || r.nasc > 0 ? r.indAlim : null), cor: C.warn, area: true }], fmtV: pct }));
    const fontes = [['verde', 'Grama verde', C.grass], ['broto', 'Brotos de arbustos', '#6fae7a'], ['arvore', 'Folhas da árvore', C.sky], ['seca', 'Grama seca', C.dry], ['casca', 'Cascas', C.earth], ['raiz', 'Raízes', C.danger]];
    grafico('gDieta', baseSaz({ empilhado: true, yMin: 0, yMax: 1, fmtY: (v) => Math.round(v * 100) + '%', altura: 240,
      series: fontes.map(f => ({ rotulo: f[1], tipo: 'barra', dados: col(null, r => r.dieta && r.N + r.mortes > 0 ? r.dieta[f[0]] || 0 : null), cor: f[2] })), fmtV: pct }));
  }

  /* ---------------- momento selecionado ---------------- */
  function irPara(i) {
    IDX = clamp(Math.round(i), 0, RES.registros.length - 1);
    atualizarMomento();
  }
  function atualizarMomento() {
    const R = RES.registros, r = R[IDX];
    $('tbRange').value = IDX;
    $('tbQuando').textContent = rotuloCurto(IDX);
    $('tbN').textContent = fmt(r.N) + ' coelhos';
    $('tbAno').value = r.ano; $('tbEst').value = r.est;
    $('momentoQuando').textContent = IDX === 0 ? 'Início do experimento' : `Ano ${r.ano}, fim do ${EST[r.est].toLowerCase()}`.replace('fim do primavera', 'fim da primavera');
    $('momentoChip').innerHTML = `${EST_IC[r.est]} ${EST[r.est]}`;
    renderSimples(); renderKPIs(); renderIlha(); renderInsights(); renderDetalhe(); renderPiramide(); renderEstacoes4();
    document.querySelectorAll('.capitulo').forEach(b => b.classList.toggle('ativo', +b.dataset.i === IDX));
    Object.values(G).forEach(g => { if (!g) return; if (g._anual) g.setCursor(Math.max(0, r.ano - 1)); else if (g._sazonal) g.setCursor(IDX); });
    document.querySelectorAll('#tabPop tbody tr').forEach(tr => tr.classList.toggle('sel', +tr.dataset.i === IDX));
    document.querySelectorAll('.ev').forEach(b => b.classList.toggle('ativo', +b.dataset.i === IDX));
    $('pirQuando').textContent = '· ' + rotuloCurto(IDX);
  }

  /* ---------------- camada simples (linguagem do dia a dia) ---------------- */
  function renderSimples() {
    const R = RES.registros, r = R[IDX], p = R[Math.max(0, IDX - 1)], r0 = R[0];
    const cards = [];
    const sc = (cls, ic, t, v, f, largo) => `<div class="sc ${cls}${largo ? ' largo' : ''}"><div class="sc-t"><i>${ic}</i>${t}</div><div class="sc-v">${v}</div><div class="sc-f">${f}</div></div>`;
    // Coelhos
    let fN, cN = 'info';
    if (IDX === 0) fN = 'O casal acabou de chegar.';
    else if (r.N === 0) { fN = 'Não há mais coelhos na ilha.'; cN = 'mau'; }
    else { const d = p.N ? (r.N - p.N) / p.N : 0; fN = d > 0.15 ? `Crescendo rápido (+${Math.round(d * 100)}% na estação).` : d < -0.15 ? `Caindo (−${Math.abs(Math.round(d * 100))}% na estação).` : 'Estável nesta estação.'; cN = d < -0.4 ? 'mau' : d < -0.15 ? 'alerta' : 'bom'; }
    cards.push(sc(cN, '🐇', 'Coelhos', fmt(r.N), fN));
    // Comida
    let fC, cC, vC;
    if (IDX === 0 || r.N + r.mortes === 0) { vC = '—'; fC = r.N ? 'Sobra comida para o casal.' : 'Sem coelhos para comer.'; cC = 'info'; }
    else { vC = pct(r.indAlim); fC = r.indAlim >= 0.95 ? 'Há comida para todos.' : r.indAlim >= 0.7 ? 'A comida está apertada.' : 'Os coelhos estão passando fome.'; cC = r.indAlim >= 0.95 ? 'bom' : r.indAlim >= 0.7 ? 'alerta' : 'mau'; }
    cards.push(sc(cC, '🍽️', 'Comida', vC, fC));
    // Vegetação
    const cV = r.R >= 0.8 ? 'bom' : r.R >= 0.4 ? 'alerta' : 'mau';
    const fV = r.R >= 0.8 ? (r.Gg > r.Gd ? 'Pasto verde e saudável.' : 'Raízes saudáveis; capim seco nesta época.') : r.R >= 0.4 ? 'O pasto está sendo destruído.' : 'Quase sem pasto vivo: só raízes fracas.';
    cards.push(sc(cV, '🌾', 'Pasto (raízes vivas)', pct(r.R), fV + (r.Hs < 0.5 * r0.Hs ? ' Arbustos muito danificados.' : '')));
    // Saúde
    const cS = r.saude >= 70 ? 'bom' : r.saude >= 45 ? 'alerta' : 'mau';
    cards.push(sc(cS, '💚', 'Saúde da ilha', Math.round(r.saude) + '<small>/100</small>', r.saude >= 70 ? 'Ilha em bom estado.' : r.saude >= 45 ? 'Ilha sob pressão.' : 'Ilha degradada.'));
    // Predadores (se houver)
    if (r.predTotal > 0 || RES.parametros.predadores.length) {
      const partes = Object.keys(r.pred || {}).map(t => `${Eng.PRED_TIPOS[t].icone} ${r.pred[t]}`).join('  ');
      const mp = r.mc.predacao || 0;
      cards.push(sc(r.predTotal ? 'alerta' : 'info', '🐾', 'Predadores', r.predTotal ? partes : '0', r.predTotal ? `Mataram ${fmt(mp)} coelhos nesta estação.` : (RES.parametros.predadores.some(x => (x.ano - 1) * 4 >= IDX) ? 'Ainda não chegaram.' : 'Não há predadores vivos.'), true));
    }
    $('cardsSimples').innerHTML = cards.join('');
    $('fraseMomento').textContent = fraseMomento(r, p, IDX);
  }
  function fraseMomento(r, p, i) {
    if (i === 0) return 'Primavera. Dois coelhos adultos exploram uma ilha coberta de vegetação, sem nenhum outro coelho e sem predadores.';
    const e = EST[r.est].toLowerCase();
    if (r.N === 0) return p.N > 0 ? `Neste ${e}, o último coelho morreu.` : `A ilha está sem coelhos. ${r.R > 0.7 ? 'A vegetação voltou a crescer.' : 'A vegetação tenta se recuperar.'}`;
    if (r.K > 0 && r.N > r.K * 1.2) return `Há coelhos demais: ${fmt(r.N)} para comida que daria para uns ${fmt(r.K)}. A fome está chegando.`;
    if (r.indAlim < 0.7) return `Fome: os coelhos conseguem só ${pct(r.indAlim)} do que precisam comer. Muitos morrem e quase nenhum filhote nasce.`;
    if (r.nasc > r.mortes * 2 && r.nasc > 20) return `Época de filhotes: nasceram ${fmt(r.nasc)} coelhos neste ${e} e a população cresce.`;
    if (r.mortes > r.nasc * 2 && r.mortes > 20) return `Neste ${e} morreram ${fmt(r.mortes)} coelhos, bem mais do que nasceram.`;
    if ((r.mc.predacao || 0) > r.mortes * 0.4 && r.mortes > 5) return `Os predadores são a principal causa de morte agora: ${fmt(r.mc.predacao)} coelhos caçados neste ${e}.`;
    return `${EST[r.est]}: ${fmt(r.N)} coelhos, comida ${r.indAlim >= 0.95 ? 'suficiente' : 'um pouco escassa'} e pasto com ${pct(r.R)} das raízes vivas.`;
  }
  function renderCapitulos() {
    const R = RES.registros, ev = (t) => RES.eventos.find(e => e.tipo === t), S = RES.resumo;
    const caps = [];
    const cap = (i, ic, t, txt) => caps.push({ i, ic, t, txt });
    cap(0, '🏝️', 'A chegada', 'Um casal de coelhos chega a uma ilha intacta, cheia de grama, alguns arbustos e uma única árvore.');
    const e1 = ev('mil') || ev('primeira_ninhada');
    if (e1) cap(e1.i, '🐣', e1.tipo === 'mil' ? 'A explosão' : 'Os primeiros filhotes', e1.tipo === 'mil' ? `Com comida farta e sem inimigos, os coelhos se multiplicam: já são ${fmt(R[e1.i].N)} ${quando(e1.i)}.` : e1.texto);
    cap(S.iMax, '🏔️', 'O auge', `A população chega a ${fmt(S.Nmax)} coelhos ${quando(S.iMax)}. ${S.Nmax > R[S.iMax].K ? 'É mais do que a ilha consegue alimentar.' : ''}`);
    const eP = ev('pred_chegada');
    if (eP) cap(eP.i, eP.icone, 'Chegam os predadores', eP.texto);
    // primeiro grande colapso (queda > 50% numa estação, depois do pico ou partindo de ≥ 200)
    let iC = -1;
    for (let k = 1; k < R.length; k++) if (R[k - 1].N >= 200 && R[k].N < 0.5 * R[k - 1].N) { iC = k; break; }
    const eG = ev('grama_degrada');
    if (iC > 0) {
      let fundo = iC; while (fundo + 1 < R.length && R[fundo + 1].N <= R[fundo].N && R[fundo].N > 0) fundo++;
      const causa = Object.entries(R[iC].mc).sort((a, b) => b[1] - a[1])[0][0];
      cap(iC, '📉', 'O colapso', `A população despenca de ${fmt(R[iC - 1].N)} para ${fmt(R[fundo].N)} coelhos. Principal causa: ${NOME_CAUSA[causa].toLowerCase()}.${eG && eG.i <= iC + 1 ? ' O pasto já estava sendo destruído.' : ''}`);
    }
    const eX = ev('extincao'), eR = ev('recuperacao');
    if (eX) cap(eX.i, '🕯️', 'O fim dos coelhos', `O último coelho morre ${quando(eX.i)}. ${eR && eR.i > eX.i ? 'Depois, a vegetação começa a voltar.' : ''}`);
    else if (S.colapsos >= 2) { const iz = R.length - 1; cap(iz, '🔁', 'Ciclos', `Depois do primeiro colapso, a história se repete: ${S.colapsos} quedas bruscas em ${RES.parametros.anos} anos, sempre que o pasto se recupera.`); }
    const f = R[R.length - 1];
    if (!eX || eX.i < R.length - 1) cap(R.length - 1, '🧭', `Depois de ${RES.parametros.anos} anos`, `${f.N ? fmt(f.N) + ' coelhos' : 'Nenhum coelho'}, pasto com ${pct(f.R)} das raízes vivas, arbustos com ${pct(f.Hs / R[0].Hs)} do que havia e a árvore ${f.arvViva ? 'ainda viva' : 'morta'}.`);
    caps.sort((a, b) => a.i - b.i);
    const vistos = new Set();
    const lista = caps.filter(c => !vistos.has(c.i) && vistos.add(c.i));
    $('capitulosBox').innerHTML = lista.map((c, k) => `<button class="capitulo" data-i="${c.i}"><span class="cap-n">Capítulo ${k + 1} · ${rotuloCurto(c.i)}</span><span class="cap-ic">${c.ic}</span><b>${esc(c.t)}</b><p>${esc(c.txt)}</p><span class="cap-q">Ver este momento →</span></button>`).join('');
    $('capitulosBox').querySelectorAll('.capitulo').forEach(b => b.addEventListener('click', () => { parar(); irPara(+b.dataset.i); window.irPagina('geral', 'painel'); }));
  }

  function kpi(l, v, d, cls, alerta, ic) {
    return `<div class="kpi${alerta ? ' alerta' : ''}"><div class="k-l">${ic || ''} ${l}</div><div class="k-v">${v}</div><div class="k-d ${cls || ''}">${d || ''}</div></div>`;
  }
  function delta(a, b) { if (b === null || b === undefined || b === 0) return null; return (a - b) / b; }
  function renderKPIs() {
    const R = RES.registros, r = R[IDX], p = R[Math.max(0, IDX - 1)], r0 = R[0];
    const dN = IDX > 0 ? delta(r.N, p.N) : null;
    const chuvaAno = R.filter(x => !x.inicial && x.ano === r.ano && x.est <= r.est).reduce((a, x) => a + x.chuva, 0);
    const refAte = chuvaRef().slice(0, r.est + 1).reduce((a, b) => a + b, 0);
    const grama = r.Gg + r.Gd, grama0 = r0.Gg + r0.Gd;
    const arvEstado = !r.arvViva ? 'Morta' : r.arvCasca < 0.5 ? 'Anelada' : r.arvSaude < 0.6 ? 'Estressada' : 'Saudável';
    const html = [
      kpi('População', fmt(r.N), dN === null ? 'início: 2 coelhos' : (dN >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(dN * 100)) + '% na estação', dN === null ? '' : dN >= 0 ? 'up' : 'down', r.K && r.N > r.K, '🐇'),
      kpi('Nascimentos', fmt(r.nasc), 'acumulado: ' + fmt(cumNasc[IDX]), '', false, '🐣'),
      kpi('Mortes', fmt(r.mortes), 'acumulado: ' + fmt(cumMort[IDX]), '', false, '⚰️'),
      kpi('Grama disponível', fmt(Math.round(grama)) + ' <small>kg/ha</small>', pct(r.Gg / Math.max(1, grama)) + ' verde · ' + (grama >= grama0 ? '▲ ' : '▼ ') + Math.abs(Math.round((grama / grama0 - 1) * 100)) + '% vs início', grama >= grama0 ? 'up' : 'down', r.R < 0.5, '🌾'),
      kpi('Arbustos', pct(r.Hs / r0.Hs), 'estrutura lenhosa vs inicial · ' + fmt(Math.round(r.Hs)) + ' kg/ha', '', r.Hs < 0.5 * r0.Hs, '🌿'),
      kpi('A árvore', arvEstado, 'saúde ' + pct(r.arvSaude) + ' · casca ' + pct(r.arvCasca), '', !r.arvViva || r.arvCasca < 0.5, '🌳'),
      kpi('Solo', pct(r.soloSaude), fmt1(r.prof) + ' cm · erosão ' + fmt(Math.round(r.erosaoAcum)) + ' t/ha', '', r.soloSaude < 0.6, '🟫'),
      kpi('Alimentação', IDX === 0 || (r.N === 0 && r.mortes === 0) ? '—' : pct(r.indAlim), 'energia obtida ÷ necessária', '', r.indAlim < 0.7 && r.N > 0, '🍽️'),
      kpi('Chuva no ano', fmt(Math.round(chuvaAno)) + ' <small>mm</small>', IDX === 0 ? '' : pct(chuvaAno / refAte) + ' da média até aqui', chuvaAno >= refAte ? 'up' : 'down', false, '🌧️'),
      kpi('Capacidade', fmt(r.K), 'estação · sustentável anual: ' + fmt(r.Ksust), '', false, '⚖️'),
      kpi('Gerações', r.N ? fmt(r.gerMax) : '—', r.gerMedia !== null ? 'média dos vivos: ' + fmt1(r.gerMedia) : '', '', false, '🧬'),
      kpi('Diversidade genética', r.He === null ? '—' : pct(r.He), 'He relativa · F = ' + (r.F === null ? '—' : fmt2(r.F)), '', r.He !== null && r.He < 0.8, '🧪')
    ];
    if (RES.parametros.predadores.length) html.push(kpi('Predadores', fmt(r.predTotal), 'coelhos caçados na estação: ' + fmt(r.mc.predacao || 0), '', r.predTotal > 0, '🐾'));
    $('kpis').innerHTML = html.join('');
    // Saúde
    const s = r.saude, cor = s >= 70 ? C.good : s >= 45 ? C.warn : C.danger;
    const ang = clamp(s / 100, 0, 1) * 2 * Math.PI, R0 = 48, cx = 60, cy = 60;
    const x = cx + R0 * Math.sin(ang), y = cy - R0 * Math.cos(ang);
    const arco = s >= 99.9 ? `<circle cx="60" cy="60" r="48" fill="none" stroke="${cor}" stroke-width="10"/>` : `<path d="M60 12 A48 48 0 ${ang > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${cor}" stroke-width="10" stroke-linecap="round"/>`;
    $('saudeGauge').innerHTML = `<circle cx="60" cy="60" r="48" fill="none" stroke="#ecebe3" stroke-width="10"/>${arco}<text x="60" y="64" text-anchor="middle" fill="#1c1c1a" font-family="Inter, sans-serif" font-size="26" font-weight="600">${Math.round(s)}</text><text x="60" y="82" text-anchor="middle" fill="#8c8a81" font-size="10">de 100</text>`;
    const comp = r.saudeComp;
    $('saudeComp').innerHTML = [['Grama', comp.grama, .30], ['Arbustos', comp.arbustos, .20], ['Árvore', comp.arvore, .15], ['Solo', comp.solo, .25], ['Equilíbrio população/capacidade', comp.equilibrio, .10]].map(c =>
      `<div><div class="comp-l"><span>${c[0]} <span class="muted">(peso ${Math.round(c[2] * 100)}%)</span></span><span class="mono">${pct(c[1])}</span></div><div class="barra"><i style="width:${clamp(c[1], 0, 1) * 100}%;background:${c[1] >= .7 ? C.good : c[1] >= .45 ? C.warn : C.danger}"></i></div></div>`).join('');
  }

  function renderDetalhe() {
    const R = RES.registros, r = R[IDX];
    const ev = RES.eventos.filter(e => e.i === IDX);
    const causas = Object.entries(r.mc).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    $('popDetalhe').innerHTML = `<h4>${EST_IC[r.est]} ${rotulo(IDX)}</h4>
      <dl class="dl">
        <dt>População</dt><dd>${fmt(r.N)}</dd>
        <dt>Nascimentos na estação</dt><dd>${fmt(r.nasc)}</dd>
        <dt>Mortes na estação</dt><dd>${fmt(r.mortes)}</dd>
        <dt>Taxa de sobrevivência</dt><dd>${pct(r.sobrev)}</dd>
        <dt>Fêmeas reprodutivas</dt><dd>${fmt(r.femRep)}</dd>
        <dt>Imaturos / adultos</dt><dd>${fmt(r.filhotes)} / ${fmt(r.adultos)}</dd>
        <dt>Ninhadas / reabsorções</dt><dd>${fmt(r.ninhadas)} / ${fmt(r.reabs)}</dd>
        <dt>Capacidade da estação</dt><dd>${fmt(r.K)}</dd>
        <dt>Ocupação da capacidade</dt><dd style="color:${r.pressao > 1 ? C.danger : 'inherit'}">${r.pressao === null ? '—' : pct(r.pressao)}</dd>
        <dt>Índice alimentar</dt><dd>${IDX ? pct(r.indAlim) : '—'}</dd>
        <dt>Chuva na estação</dt><dd>${IDX ? fmt1(r.chuva) + ' mm' : '—'}</dd>
        <dt>Endogamia média (F)</dt><dd>${fmt3(r.F)}</dd>
      </dl>
      ${causas.length ? `<p class="hint" style="margin-top:10px">Principais causas de morte: ${causas.map(c => NOME_CAUSA[c[0]].toLowerCase() + ' (' + fmt(c[1]) + ')').join(', ')}.</p>` : ''}
      ${ev.length ? `<div style="margin-top:10px">${ev.map(e => `<div class="chip" style="display:inline-block;margin:2px 4px 2px 0">${e.icone} ${esc(e.titulo)}</div>`).join('')}</div>` : ''}
      <p class="hint" style="margin-top:10px">Use ◀ ▶ na barra inferior ou as setas do teclado.</p>`;
  }

  /* ---------------- ilha (SVG procedural) ---------------- */
  const GEO = (function () {
    const rnd = Eng._interno.mulberry32(7);
    const cx = 400, cy = 275, n = 64, raio = [];
    for (let k = 0; k < n; k++) raio.push(1);
    const harm = [[2, .08, rnd() * 6], [3, .07, rnd() * 6], [5, .05, rnd() * 6], [7, .03, rnd() * 6]];
    const rFn = (t) => 1 + harm.reduce((a, h) => a + h[1] * Math.sin(h[0] * t + h[2]), 0);
    const RX = 300, RY = 185;
    const pts = (esc) => { const p = []; for (let k = 0; k < n; k++) { const t = k / n * 2 * Math.PI; const rr = rFn(t) * esc; p.push([cx + Math.cos(t) * RX * rr, cy + Math.sin(t) * RY * rr]); } return p; };
    const path = (p) => { let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`; for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length], c2 = p[(k + 2) % p.length]; const mx = (b[0] + c2[0]) / 2, my = (b[1] + c2[1]) / 2; d += ` Q${b[0].toFixed(1)},${b[1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`; } return d + 'Z'; };
    const dentro = (x, y, esc) => { const t = Math.atan2((y - cy) / RY, (x - cx) / RX); const rr = rFn(t < 0 ? t + 2 * Math.PI : t) * esc; const dx = (x - cx) / RX, dy = (y - cy) / RY; return dx * dx + dy * dy < rr * rr; };
    const ponto = (esc) => { for (let k = 0; k < 200; k++) { const x = cx - RX * 1.1 + rnd() * RX * 2.2, y = cy - RY * 1.1 + rnd() * RY * 2.2; if (dentro(x, y, esc) && Math.hypot(x - 430, y - 220) > 46) return [x, y]; } return [cx, cy]; };
    const tufos = Array.from({ length: 260 }, () => { const p = ponto(0.84); return { x: p[0], y: p[1], r: rnd(), s: 0.7 + rnd() * 0.6 }; });
    const nus = Array.from({ length: 26 }, () => { const p = ponto(0.8); return { x: p[0], y: p[1], rx: 14 + rnd() * 26, ry: 7 + rnd() * 13, r: rnd(), rot: rnd() * 180 }; });
    const arbustos = Array.from({ length: 16 }, () => { const p = ponto(0.78); return { x: p[0], y: p[1], r: rnd(), s: 0.8 + rnd() * 0.5 }; });
    const coelhos = Array.from({ length: 70 }, () => { const p = ponto(0.82); return { x: p[0], y: p[1], f: rnd() < .5 ? 1 : -1 }; });
    const brotos = Array.from({ length: 50 }, () => { const p = ponto(0.82); return { x: p[0], y: p[1] }; });
    const sulcos = Array.from({ length: 8 }, () => { const p = ponto(0.7); const a = rnd() * Math.PI * 2; return { x: p[0], y: p[1], a, l: 20 + rnd() * 30 }; });
    return { praia: path(pts(1)), terra: path(pts(0.9)), raso: path(pts(1.12)), tufos, nus, arbustos, coelhos, brotos, sulcos };
  })();
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); t = clamp(t, 0, 1);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
  }
  function escalaCoelho(N) { const opts = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]; for (const o of opts) if (N / o <= 60) return o; return 2000; }
  function renderIlha() {
    const r = RES.registros[IDX], r0 = RES.registros[0];
    if (vista === 'detalhe') { renderPerfil(r, r0); return; }
    const grama = r.Gg + r.Gd, greenFrac = r.Gg / Math.max(1, grama);
    const cov = r.cobertura;
    const corVerde = '#4f8f45', corSeca = '#b49a4c', corNu = '#8a6b47';
    const baseCor = mix(mix(corSeca, corVerde, Math.pow(greenFrac, 0.6)), corNu, clamp((1 - cov) * 1.25, 0, 1));
    const nNus = Math.round(26 * clamp(Math.pow(1 - cov, 0.8) * 1.3, 0, 1));
    const nTufos = Math.round(260 * clamp(grama / 700, 0.02, 1) * (0.4 + 0.6 * r.R));
    const arbRel = clamp(r.Hs / r0.Hs, 0, 1.25), nArb = Math.round(16 * Math.min(1, arbRel)), folha = clamp(r.Hb / Math.max(1, 0.1 * r.Hs), 0, 1);
    const tint = ['rgba(255,240,200,0)', 'rgba(255,214,120,.07)', 'rgba(214,140,60,.08)', 'rgba(200,225,255,.13)'][r.est];
    let s = `<svg viewBox="0 0 800 540" role="img" aria-label="Ilustração da ilha em ${esc(rotulo(IDX))}">
      <defs>
        <radialGradient id="mar" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1d6a86"/><stop offset="1" stop-color="#0b2732"/></radialGradient>
        <pattern id="ond" width="60" height="22" patternUnits="userSpaceOnUse"><path d="M0 11 Q15 4 30 11 T60 11" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1.4"/></pattern>
        <radialGradient id="sombraArv" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(0,0,0,.35)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
      </defs>
      <rect width="800" height="540" fill="url(#mar)"/>
      <g class="ondas"><rect x="0" y="0" width="900" height="540" fill="url(#ond)"/></g>
      <path d="${GEO.raso}" fill="rgba(120,200,220,.18)"/>
      <path d="${GEO.praia}" fill="#d8c08a"/>
      <path d="${GEO.terra}" fill="${baseCor}" style="transition:fill .6s"/>`;
    GEO.nus.slice(0, nNus).forEach(p => { s += `<ellipse cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" rx="${p.rx.toFixed(0)}" ry="${p.ry.toFixed(0)}" transform="rotate(${p.rot.toFixed(0)} ${p.x.toFixed(0)} ${p.y.toFixed(0)})" fill="${corNu}" opacity="${(0.55 + 0.4 * p.r).toFixed(2)}"/>`; });
    if (r.erosaoAcum > 40) { const op = clamp(r.erosaoAcum / 400, 0.15, 0.8); GEO.sulcos.forEach(g => { s += `<path d="M${g.x.toFixed(0)},${g.y.toFixed(0)} l${(Math.cos(g.a) * g.l).toFixed(0)},${(Math.sin(g.a) * g.l).toFixed(0)} l${(Math.cos(g.a + .5) * g.l * .5).toFixed(0)},${(Math.sin(g.a + .5) * g.l * .5).toFixed(0)}" stroke="#5a3f27" stroke-width="2.2" fill="none" opacity="${op.toFixed(2)}" stroke-linecap="round"/>`; }); }
    GEO.tufos.slice(0, nTufos).forEach(t => {
      const cor = t.r < greenFrac ? (t.r < greenFrac * .5 ? '#8fd16d' : '#6fb257') : (t.r > .85 ? '#c9ad60' : '#ab9450');
      const h = 5 + 6 * t.s * clamp(grama / 600, 0.3, 1.3);
      s += `<path d="M${t.x.toFixed(0)},${t.y.toFixed(0)} l-2.5,-${h.toFixed(1)} M${t.x.toFixed(0)},${t.y.toFixed(0)} l0,-${(h * 1.2).toFixed(1)} M${t.x.toFixed(0)},${t.y.toFixed(0)} l2.5,-${h.toFixed(1)}" stroke="${cor}" stroke-width="1.5" stroke-linecap="round"/>`;
    });
    if (r.regenera > 0.005 && r.est <= 1) { const nb = Math.round(clamp(r.regenera * 400, 4, 50)); GEO.brotos.slice(0, nb).forEach(b => { s += `<circle cx="${b.x.toFixed(0)}" cy="${b.y.toFixed(0)}" r="2.2" fill="#c8f59a"/>`; }); }
    GEO.arbustos.forEach((a, k) => {
      const x = a.x.toFixed(0), y = a.y.toFixed(0);
      if (k < nArb) {
        const cf = mix('#8a7a4a', '#3f7d3c', folha), sz = 9 * a.s * (0.75 + 0.35 * Math.min(1, arbRel));
        s += `<g><ellipse cx="${x}" cy="${(+y + 4)}" rx="${(sz * 1.2).toFixed(1)}" ry="3.5" fill="rgba(0,0,0,.25)"/>
          <circle cx="${(+x - sz * .5).toFixed(1)}" cy="${y}" r="${(sz * .8).toFixed(1)}" fill="${cf}"/><circle cx="${(+x + sz * .5).toFixed(1)}" cy="${(+y - 1)}" r="${(sz * .75).toFixed(1)}" fill="${mix(cf, '#000000', .12)}"/><circle cx="${x}" cy="${(+y - sz * .5).toFixed(1)}" r="${(sz * .85).toFixed(1)}" fill="${mix(cf, '#ffffff', .08)}"/></g>`;
      } else if (r.Hs < r0.Hs) {
        s += `<path d="M${x},${y} l-5,-9 M${x},${y} l1,-11 M${x},${y} l6,-8 M${(+x - 3)},${(+y - 6)} l-3,-3" stroke="#9c9486" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".8"/>`;
      }
    });
    // árvore
    const tx = 430, ty = 230;
    s += `<ellipse cx="${tx}" cy="${ty + 30}" rx="60" ry="16" fill="url(#sombraArv)" opacity="${r.arvViva ? clamp(r.arvFolhas * 1.2, 0.15, 1) : 0.1}"/>`;
    s += `<rect x="${tx - 6}" y="${ty - 10}" width="12" height="40" rx="3" fill="${r.arvViva ? '#6b4a2c' : '#7d766c'}"/>`;
    if (r.arvCasca < 0.98) { const gap = (1 - r.arvCasca); s += `<rect x="${tx - 6}" y="${ty + 18}" width="${(12 * gap).toFixed(1)}" height="7" fill="#e8dcc0"/>`; }
    if (r.arvViva) {
      const cs = 26 + 30 * clamp(r.arvFolhas, 0, 1), cc = mix('#8d7a3c', '#2f6a35', r.arvVigor);
      [[-.55, .1, .8], [.55, .05, .78], [0, -.45, .9], [-.2, .25, .7], [.3, .3, .7]].forEach(q => { s += `<circle cx="${(tx + q[0] * cs).toFixed(1)}" cy="${(ty - 18 + q[1] * cs).toFixed(1)}" r="${(q[2] * cs * .72).toFixed(1)}" fill="${mix(cc, '#000000', q[1] > 0 ? .1 : 0)}" opacity=".96"/>`; });
    } else {
      s += `<path d="M${tx},${ty - 8} l-18,-26 M${tx},${ty - 8} l14,-30 M${tx},${ty - 8} l2,-36 M${tx - 10},${ty - 22} l-12,-6 M${tx + 8},${ty - 26} l12,-8" stroke="#8a8378" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    }
    // coelhos
    const esc1 = escalaCoelho(r.N), nC = r.N > 0 ? Math.max(1, Math.round(r.N / esc1)) : 0;
    GEO.coelhos.slice(0, Math.min(nC, 70)).forEach(c => {
      const x = c.x, y = c.y, f = c.f;
      s += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${f} 1)"><ellipse cx="0" cy="0" rx="5" ry="3.6" fill="${C.rabbit}"/><circle cx="4.6" cy="-2.6" r="2.5" fill="${C.rabbit}"/><path d="M4.4,-4.6 l-1,-5 M5.8,-4.4 l0.6,-5" stroke="${C.rabbit}" stroke-width="1.5" stroke-linecap="round"/><circle cx="-5" cy="-.5" r="1.4" fill="#fff"/></g>`;
    });
    // predadores (cada ícone = 1 animal, até 10 por tipo)
    let kp = 0;
    Object.keys(r.pred || {}).forEach(t => {
      const n = Math.min(10, r.pred[t] || 0), T = Eng.PRED_TIPOS[t];
      for (let j = 0; j < n; j++) {
        if (T.migra) { const x = 260 + ((j * 97 + kp * 31) % 420), y = 40 + ((j * 53) % 70); s += `<text x="${x}" y="${y}" font-size="20" opacity=".95">${T.icone}</text>`; }
        else { const c = GEO.coelhos[69 - (kp % 70)]; s += `<text x="${(c.x - 9).toFixed(0)}" y="${(c.y + 6).toFixed(0)}" font-size="19">${T.icone}</text>`; }
        kp++;
      }
    });
    // nuvens / chuva / calor
    const ref = chuvaRef()[r.est];
    if (IDX > 0 && r.chuva > ref * 1.15) {
      s += `<g opacity=".85"><ellipse cx="120" cy="70" rx="42" ry="17" fill="#d6dde3"/><ellipse cx="150" cy="60" rx="30" ry="18" fill="#e3e9ee"/><ellipse cx="96" cy="76" rx="24" ry="12" fill="#c7d0d8"/>${[0, 1, 2, 3, 4, 5].map(k => `<path d="M${92 + k * 11},92 l-5,14" stroke="#9fd0ea" stroke-width="2" stroke-linecap="round"/>`).join('')}</g>`;
    } else if (IDX > 0 && r.chuva < ref * 0.8) {
      s += `<g><circle cx="120" cy="72" r="20" fill="#ffd56a" opacity=".9"/>${Array.from({ length: 10 }, (_, k) => { const a = k / 10 * Math.PI * 2; return `<path d="M${(120 + Math.cos(a) * 26).toFixed(1)},${(72 + Math.sin(a) * 26).toFixed(1)} L${(120 + Math.cos(a) * 34).toFixed(1)},${(72 + Math.sin(a) * 34).toFixed(1)}" stroke="#ffd56a" stroke-width="2.5" stroke-linecap="round"/>`; }).join('')}</g>`;
    }
    if ((r.eventosClima || []).some(e => e.tipo === 'tempestade')) s += `<text x="190" y="60" font-size="26">⛈️</text>`;
    if ((r.eventosClima || []).some(e => e.tipo === 'onda_calor')) s += `<text x="190" y="60" font-size="26">🔥</text>`;
    s += `<rect width="800" height="540" fill="${tint}" pointer-events="none"/>`;
    s += `<text x="20" y="522" fill="rgba(255,255,255,.7)" font-size="13" font-family="Inter, sans-serif">${EST_IC[r.est]} ${esc(rotulo(IDX))}</text></svg>`;
    $('ilhaSvg').innerHTML = s;
    $('ilhaInfo').innerHTML = `<b>${fmt(r.N)}</b> coelhos<br><span class="muted">${r.N > 0 ? 'cada símbolo ≈ ' + fmt(esc1) + ' coelho' + (esc1 > 1 ? 's' : '') : 'nenhum coelho vivo'}</span>`;
    $('ilhaLegenda').innerHTML = `<span><i style="background:#6fb257"></i>grama verde</span><span><i style="background:#ab9450"></i>grama seca</span><span><i style="background:#8a6b47"></i>solo exposto</span><span><i style="background:#3f7d3c;border-radius:50%"></i>arbusto (cor = folhagem)</span><span><i style="background:#9c9486"></i>arbusto morto</span><span><i style="background:#e8dcc0"></i>casca roída da árvore</span><span><i style="background:#c8f59a;border-radius:50%"></i>rebrota</span><span><i style="background:#5a3f27"></i>sulcos de erosão</span><span class="muted">A quantidade de símbolos é ilustrativa; a contagem real está no canto.</span>`;
  }
  function renderPerfil(r, r0) {
    const W = 800, H = 540, solo0 = 230, pxcm = 7;
    const perdido = Math.max(0, r0.prof - r.prof) * pxcm;
    const sup = solo0 + perdido;
    const corSolo = mix('#a8875c', '#3d2a1a', clamp(r.MO, 0, 1));
    const grama = r.Gg + r.Gd, gv = clamp(r.Gg / 400, 0, 1), gs = clamp(r.Gd / 700, 0, 1);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Perfil do solo e da vegetação">
      <rect width="${W}" height="${sup}" fill="#14303c"/>
      <rect y="${solo0}" width="${W}" height="${perdido}" fill="none" stroke="rgba(255,255,255,.35)" stroke-dasharray="4 4"/>
      ${perdido > 3 ? `<text x="${W - 16}" y="${solo0 + perdido / 2 + 4}" text-anchor="end" fill="#e8a94a" font-size="12">solo perdido por erosão: ${fmt1(r0.prof - r.prof)} cm</text>` : ''}
      <rect y="${sup}" width="${W}" height="${r.prof * pxcm}" fill="${corSolo}"/>
      <rect y="${sup + r.prof * pxcm}" width="${W}" height="${H - sup - r.prof * pxcm}" fill="#6b6257"/>
      <rect y="${sup}" width="${W}" height="${2 + r.crosta * 8}" fill="#c9b48a" opacity="${(0.3 + r.crosta * 0.7).toFixed(2)}"/>`;
    const rnd = Eng._interno.mulberry32(3);
    for (let k = 0; k < 120; k++) {
      const x = 10 + k * 6.6 + rnd() * 3;
      const viva = rnd() < r.R;
      const hv = viva ? 10 + gv * 110 * (0.6 + rnd() * 0.5) : 0, hs = 6 + gs * 70 * (0.5 + rnd() * 0.6);
      if (rnd() < clamp(grama / 300, 0.05, 1)) s += `<path d="M${x.toFixed(1)},${sup} q-3,-${(hs / 2).toFixed(0)} -6,-${hs.toFixed(0)}" stroke="#b49a4c" stroke-width="2" fill="none"/>`;
      if (hv > 0) s += `<path d="M${(x + 2).toFixed(1)},${sup} q2,-${(hv / 2).toFixed(0)} 4,-${hv.toFixed(0)}" stroke="#7fc35f" stroke-width="2.2" fill="none"/>`;
      if (viva) { const rl = 20 + r.R * 90 * (0.6 + rnd() * 0.4); s += `<path d="M${(x + 1).toFixed(1)},${sup} q${(rnd() * 8 - 4).toFixed(1)},${(rl / 2).toFixed(0)} ${(rnd() * 10 - 5).toFixed(1)},${rl.toFixed(0)}" stroke="rgba(235,220,190,.55)" stroke-width="1" fill="none"/>`; }
    }
    const nSem = Math.round(r.S * 140);
    for (let k = 0; k < nSem; k++) s += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(sup + 6 + rnd() * 26).toFixed(0)}" r="1.8" fill="#f0d68a"/>`;
    const nTocas = r.N > 0 ? clamp(Math.round(Math.sqrt(r.N) / 3), 1, 14) : 0;
    for (let k = 0; k < nTocas; k++) { const x = 40 + rnd() * (W - 80), y = sup + 40 + rnd() * Math.max(10, r.prof * pxcm - 60); s += `<path d="M${x.toFixed(0)},${sup} q10,${((y - sup) / 2).toFixed(0)} 30,${(y - sup).toFixed(0)}" stroke="#1d130b" stroke-width="7" fill="none" opacity=".7"/><ellipse cx="${(x + 34).toFixed(0)}" cy="${y.toFixed(0)}" rx="16" ry="8" fill="#1d130b" opacity=".75"/>`; }
    s += `<g font-family="Inter, sans-serif" font-size="12" fill="#e8eee5">
      <text x="16" y="26">Grama verde ${fmt(Math.round(r.Gg))} kg/ha · seca ${fmt(Math.round(r.Gd))} kg/ha · vigor das raízes ${pct(r.R)}</text>
      <text x="16" y="46" fill="#b9c6bb">Banco de sementes ${pct(r.S)} · cobertura ${pct(r.cobertura)} · umidade ${pct(r.umidade)}</text>
      <text x="16" y="${(sup + r.prof * pxcm - 10).toFixed(0)}" fill="#f2e2c4">Solo superficial: ${fmt1(r.prof)} cm · matéria orgânica ${pct(r.MO)} · retenção de água ${fmt(Math.round(r.CRA))} mm</text>
      ${nTocas ? `<text x="16" y="${H - 14}" fill="#d9c9a8">Tocas representadas: proporcionais à √população (ilustrativo) · capacidade estimada para ${fmt(r.tocas)} fêmeas reprodutoras</text>` : ''}
    </g></svg>`;
    $('ilhaSvg').innerHTML = s;
    $('ilhaInfo').innerHTML = `<b>${fmt(r.N)}</b> coelhos<br><span class="muted">perfil vertical (fora de escala)</span>`;
    $('ilhaLegenda').innerHTML = `<span><i style="background:#7fc35f"></i>folhas verdes</span><span><i style="background:#b49a4c"></i>grama seca</span><span><i style="background:rgba(235,220,190,.8)"></i>raízes vivas (∝ vigor)</span><span><i style="background:#f0d68a;border-radius:50%"></i>sementes no solo</span><span><i style="background:#c9b48a"></i>crosta superficial</span><span><i style="background:${corSolo}"></i>solo (cor ∝ matéria orgânica)</span>`;
  }

  /* ---------------- descobertas automáticas ---------------- */
  function renderInsights() {
    const R = RES.registros, r = R[IDX], p = IDX > 0 ? R[IDX - 1] : null, a = IDX >= 4 ? R[IDX - 4] : null;
    const L = [];
    const add = (nivel, ic, txt, vars) => L.push({ nivel, ic, txt, vars });
    if (IDX === 0) {
      add('info', '🏝️', `Dois coelhos adultos (um macho e uma fêmea, não aparentados) chegam a uma ilha intacta. A primeira estação tem capacidade estimada para ${fmt(r.K)} coelhos.`, ['condição inicial']);
      add('info', '🧬', 'Todos os coelhos que viverem aqui descenderão deste casal. Já na segunda geração, cruzamentos entre irmãos produzirão filhotes com F ≈ 0,25.', ['genética', 'fundadores']);
      mostrarInsights(L); return;
    }
    if (r.N === 0 && p && p.N > 0) add('mau', '🕯️', 'O último coelho morreu nesta estação: extinção local.', ['extinção', 'fome', 'demografia']);
    else if (r.N === 0) add('info', '🏝️', 'Não há coelhos na ilha. A vegetação evolui sem pastejo' + (r.regenera > 0.01 ? ' e as raízes da grama estão se recuperando.' : '.'), ['ausência de herbívoros']);
    if (p && p.N > 0 && r.N > 0) {
      const d = (r.N - p.N) / p.N;
      if (Math.abs(d) >= 0.15) add(d > 0 ? 'info' : (d < -0.4 ? 'mau' : 'alerta'), d > 0 ? '📈' : '📉', `A população ${d > 0 ? 'aumentou' : 'diminuiu'} ${Math.abs(Math.round(d * 100))}% desde a estação anterior (${fmt(p.N)} → ${fmt(r.N)}).`, d > 0 ? ['nascimentos', 'alimento'] : ['mortes', Object.entries(r.mc).sort((x, y) => y[1] - x[1])[0][0]]);
    }
    if (a && a.N > 0 && r.N > 0) { const d = (r.N - a.N) / a.N; if (Math.abs(d) >= 0.5) add('info', '🔁', `Em relação ao mesmo período do ano anterior, a população está ${d > 0 ? Math.round(d * 100) + '% maior' : Math.abs(Math.round(d * 100)) + '% menor'}.`, ['tendência anual']); }
    if (r.K > 0 && r.N > r.K) add('mau', '⚠️', `A população (${fmt(r.N)}) excedeu a capacidade estimada de alimentação desta estação (${fmt(r.K)}): ${pct(r.N / r.K)} de ocupação.`, ['capacidade de suporte', 'densidade']);
    if (r.N > 0 && r.indAlim < 0.9) add(r.indAlim < 0.7 ? 'mau' : 'alerta', '🍽️', `Os coelhos obtiveram em média só ${pct(r.indAlim)} da energia de que precisavam.`, ['alimento', 'densidade']);
    if (r.dieta) { const ruim = (r.dieta.seca || 0) + (r.dieta.casca || 0) + (r.dieta.raiz || 0); if (r.N > 0 && ruim > 0.35) add('alerta', '🥀', `A dieta mudou: ${pct(ruim)} da energia veio de grama seca, cascas e raízes (alimentos de baixa qualidade ou destrutivos).`, ['comportamento alimentar', 'escassez de grama verde']); }
    if (p && r.R < p.R - 0.04) add('mau', '🌾', `O vigor das raízes da grama caiu de ${pct(p.R)} para ${pct(r.R)}: o pastejo intenso e repetido está matando plantas, não só comendo folhas.`, ['sobrepastejo', 'estresse acumulado']);
    if (p && r.R > p.R + 0.04) add('bom', '🌱', `As raízes da grama estão se recuperando (vigor ${pct(p.R)} → ${pct(r.R)}).`, ['regeneração', 'banco de sementes', 'chuva']);
    if (r.arbCons > r.arbCresc * 3 && r.arbCons > 2) add('alerta', '🌿', 'A regeneração dos arbustos não está acompanhando o consumo de folhas e brotos.', ['arbustos', 'ramoneio']);
    if (r.arbMort > 20) add('mau', '🪓', `${fmt(Math.round(r.arbMort))} kg/ha de estrutura de arbustos morreram nesta estação, sobretudo por descascamento.`, ['arbustos', 'fome']);
    const ref = chuvaRef()[r.est];
    if (r.est <= 1 && r.chuva > ref * 1.1 && r.R < 0.5) add('alerta', '🌧️', `Apesar da chuva acima da média (${pct(r.chuva / ref)}), a vegetação não se recuperou o suficiente por causa da degradação anterior (vigor das raízes ${pct(r.R)}).`, ['chuva', 'degradação', 'efeito atrasado']);
    else if (r.chuva < ref * 0.75) add('alerta', '☀️', `Estação seca: ${fmt1(r.chuva)} mm (${pct(r.chuva / ref)} da média).`, ['chuva', 'umidade do solo']);
    else if (r.chuva > ref * 1.25) add('info', '🌧️', `Estação chuvosa: ${fmt1(r.chuva)} mm (${pct(r.chuva / ref)} da média).`, ['chuva']);
    if (p && r.sobrevFilhotes !== null && p.sobrevFilhotes !== null && r.sobrevFilhotes < p.sobrevFilhotes - 0.12) add('alerta', '🐣', `A sobrevivência dos filhotes no ninho caiu de ${pct(p.sobrevFilhotes)} para ${pct(r.sobrevFilhotes)}.`, ['condição das mães', 'endogamia', 'clima']);
    if (r.est <= 1 && r.nasc === 0 && r.femRep > 0) add('alerta', '⛔', `${fmt(r.femRep)} fêmeas adultas, mas nenhum filhote nasceu: má nutrição suprime a reprodução e provoca reabsorção embrionária.`, ['nutrição', 'reprodução']);
    if (a && r.F !== null && a.F !== null && r.F - a.F > 0.03) add('alerta', '🧬', `Os indicadores genéticos apontam aumento da consanguinidade (F ${fmt3(a.F)} → ${fmt3(r.F)} em um ano).`, ['gargalo', 'deriva genética']);
    if (r.mc.endogamia > 0 && r.mortes > 0 && r.mc.endogamia / r.mortes > 0.25) add('info', '🧬', `${pct(r.mc.endogamia / r.mortes)} das mortes desta estação foram de filhotes atribuídas à depressão endogâmica.`, ['equivalentes letais', 'F dos filhotes']);
    if (r.surto) add('mau', '🦠', 'Um surto de doença endêmica, desencadeado pela alta densidade, elevou a mortalidade.', ['densidade', 'condição corporal', 'endogamia']);
    (r.eventosClima || []).forEach(e => { const t = { onda_calor: ['🔥', 'Uma onda de calor aumentou o estresse térmico (pior sem sombra).', ['temperatura', 'abrigo']], tempestade: ['⛈️', 'Uma tempestade intensa caiu: risco de enchente nas tocas e de erosão.', ['chuva intensa', 'erosão']], frio_extremo: ['🥶', 'Frio extremo: maior gasto de energia e risco para os filhotes.', ['temperatura']], mes_seco: ['🏜️', 'Um mês praticamente sem chuva dentro da estação.', ['seca']] }[e.tipo]; if (t) add('info', t[0], t[1], t[2]); });
    if (p && r.arvCasca < p.arvCasca - 0.02) add('mau', '🪵', `Coelhos famintos roeram a casca da árvore (integridade ${pct(p.arvCasca)} → ${pct(r.arvCasca)}).`, ['árvore', 'fome']);
    if (p && p.arvViva && !r.arvViva) add('mau', '🥀', 'A árvore morreu. A sombra e o abrigo vão desaparecer aos poucos.', ['árvore', 'anelamento']);
    if (r.erosao > 3) add('alerta', '🌊', `Erosão forte: ${fmt1(r.erosao)} t/ha nesta estação (cobertura vegetal ${pct(r.cobertura)}).`, ['solo exposto', 'chuva']);
    if ((r.mc.predacao || 0) > 0) add((r.mc.predacao / Math.max(1, r.mortes)) > 0.4 ? 'alerta' : 'info', '🐾', `Predadores caçaram ${fmt(r.mc.predacao)} coelhos nesta estação (${pct(r.mc.predacao / Math.max(1, r.mortes))} das mortes).`, ['predação', 'cobertura vegetal', 'filhotes']);
    Object.keys(r.pred || {}).forEach(t => { const T = Eng.PRED_TIPOS[t], I = r.predIngestao[t]; if (r.pred[t] > 0 && I < 0.7) add('info', T.icone, `${T.nome}: os predadores estão com fome (comem ${pct(I)} do que precisam). Sem presas suficientes, morrem ou deixam de se reproduzir.`, ['fome dos predadores', 'presas alternativas']); });
    (r.eventosClima || []).forEach(e => { const [a, t] = e.tipo.split('_'); const T = Eng.PRED_TIPOS[t]; if (!T) return; if (a === 'chegada') add('alerta', T.icone, `${T.nome} chegaram à ilha nesta estação.`, ['predação']); if (a === 'extinto') add('info', '🪦', `${T.nome}: o último indivíduo morreu.`, ['fome dos predadores']); });
    if (!L.length) add('bom', '✅', 'Estação sem mudanças marcantes: população, vegetação e clima dentro do esperado para o período.', ['estabilidade']);
    mostrarInsights(L);
  }
  function mostrarInsights(L) {
    const ordem = { mau: 0, alerta: 1, bom: 2, info: 3 };
    const S = L.map((x, k) => [x, k]).sort((a, b) => (ordem[a[0].nivel] - ordem[b[0].nivel]) || (a[1] - b[1])).map(x => x[0]);
    $('insights').innerHTML = S.slice(0, 3).map(htmlInsight).join('');
    $('insightsMais').innerHTML = S.slice(3).map(htmlInsight).join('');
    $('insightsMaisBox').hidden = S.length <= 3;
    $('insightsMaisBox').querySelector('summary').textContent = `Ver mais ${S.length - 3} observaç${S.length - 3 === 1 ? 'ão' : 'ões'} deste momento`;
  }
  const htmlInsight = (x) => `<div class="insight ${x.nivel}"><div class="ic">${x.ic}</div><div><p>${x.txt}</p><div class="chips">${x.vars.map(v => `<span class="chip">${esc(v)}</span>`).join('')}</div></div></div>`;

  /* ---------------- pirâmide etária ---------------- */
  function renderPiramide() {
    const r = RES.registros[IDX];
    const cl = ['0–3 meses', '4–11 meses', '1–2 anos', '2–3 anos', '3–4 anos', '4+ anos'];
    const mx = Math.max(1, ...r.pir.M, ...r.pir.F);
    const W = 520, rowH = 30, top = 24, cx = W / 2, half = 200;
    let s = `<svg viewBox="0 0 ${W} ${top + rowH * 6 + 16}" role="img" aria-label="Pirâmide etária"><text x="${cx - 60}" y="14" text-anchor="end" fill="${C.macho}" font-size="12">♂ machos (${fmt(r.machos)})</text><text x="${cx + 60}" y="14" fill="${C.femea}" font-size="12">♀ fêmeas (${fmt(r.femeas)})</text>`;
    for (let k = 5; k >= 0; k--) {
      const y = top + (5 - k) * rowH, wm = r.pir.M[k] / mx * (half - 50), wf = r.pir.F[k] / mx * (half - 50);
      s += `<rect x="${cx - 48 - wm}" y="${y}" width="${wm}" height="${rowH - 6}" rx="3" fill="${C.macho}" opacity=".85"/><rect x="${cx + 48}" y="${y}" width="${wf}" height="${rowH - 6}" rx="3" fill="${C.femea}" opacity=".85"/>
        <text x="${cx}" y="${y + 16}" text-anchor="middle" fill="#4d4b45" font-size="11">${cl[k]}</text>
        <text x="${cx - 52 - wm}" y="${y + 16}" text-anchor="end" fill="#8c8a81" font-size="10" font-family="JetBrains Mono, monospace">${fmt(r.pir.M[k])}</text>
        <text x="${cx + 52 + wf}" y="${y + 16}" fill="#8c8a81" font-size="10" font-family="JetBrains Mono, monospace">${fmt(r.pir.F[k])}</text>`;
    }
    s += '</svg>';
    $('piramide').innerHTML = r.N ? s : '<p class="muted">Nenhum coelho vivo neste momento.</p>';
  }

  /* ---------------- genealogia ---------------- */
  function renderGenealogia() {
    const gen = RES.genealogia || [];
    if (!gen.length) { $('genealogia').innerHTML = '<p class="muted">Sem dados de genealogia.</p>'; return; }
    const byId = new Map(gen.map(g => [g.id, g]));
    const rows = [gen.filter(g => g.ger === 0)];
    const lim = [2, 22, 30, 34];
    for (let k = 1; k < 4; k++) {
      const prev = new Set(rows[k - 1].map(g => g.id));
      const cand = gen.filter(g => g.ger === k && (prev.has(g.mae) || prev.has(g.pai)));
      rows.push(cand.slice(0, lim[k]));
      rows[k].total = gen.filter(g => g.ger === k).length;
    }
    while (rows.length > 1 && !rows[rows.length - 1].length) rows.pop();
    const W = 900, rowH = 108, H = rows.length * rowH + 30;
    const pos = new Map();
    rows.forEach((row, k) => { row.forEach((g, j) => pos.set(g.id, [W * (j + 1) / (row.length + 1), 34 + k * rowH])); });
    const corF = (F) => F >= 0.4 ? C.danger : F >= 0.2 ? C.warn : C.good;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Árvore genealógica dos primeiros descendentes">`;
    const nomes = ['Fundadores', 'Geração 1 (filhos)', 'Geração 2 (netos)', 'Geração 3'];
    rows.forEach((row, k) => { s += `<text x="8" y="${34 + k * rowH - 20}" fill="#8c8a81" font-size="11">${nomes[k]}${row.total ? ` · mostrando ${row.length} de ${row.total} registrados` : ''}</text>`; });
    gen.forEach(g => {
      if (!pos.has(g.id)) return;
      const [x, y] = pos.get(g.id);
      [g.mae, g.pai].forEach(pid => { if (pos.has(pid)) { const [px, py] = pos.get(pid); s += `<path class="glink" data-a="${pid}" data-b="${g.id}" d="M${px.toFixed(1)},${py + 9} C${px.toFixed(1)},${(py + y) / 2} ${x.toFixed(1)},${(py + y) / 2} ${x.toFixed(1)},${y - 9}" stroke="${pid === g.mae ? 'rgba(201,107,142,.4)' : 'rgba(74,134,184,.4)'}" fill="none"/>`; } });
    });
    gen.forEach(g => {
      if (!pos.has(g.id)) return;
      const [x, y] = pos.get(g.id), rr = g.ger === 0 ? 13 : 8;
      const info = `#${g.id} · ${g.sexo === 'M' ? 'macho' : 'fêmea'} · ${g.ger === 0 ? 'fundador' : 'nascido ' + mesTxt(g.nasc)} · F = ${fmt3(g.F)} · ${g.morte === null ? 'vivo no fim ou não registrado' : 'morreu ' + mesTxt(g.morte)}`;
      s += `<g class="gnode" data-id="${g.id}" data-info="${esc(info)}"><circle cx="${x.toFixed(1)}" cy="${y}" r="${rr}" fill="${g.sexo === 'M' ? C.macho : C.femea}" stroke="${corF(g.F)}" stroke-width="2.5"/>${g.ger === 0 ? `<text x="${x.toFixed(1)}" y="${y + 4}" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">${g.sexo === 'M' ? '♂' : '♀'}</text>` : ''}<title>${esc(info)}</title></g>`;
    });
    s += '</svg>';
    $('genealogia').innerHTML = s + `<p class="hint" id="genInfo">Contorno: F &lt; 0,2 verde · 0,2–0,4 âmbar · ≥ 0,4 vermelho. Linhas rosa: mãe; azuis: pai.</p>`;
    const box = $('genealogia');
    const anc = (id, set) => { const g = byId.get(id); if (!g || set.has(id)) return; set.add(id); anc(g.mae, set); anc(g.pai, set); };
    const desc = (id, set) => { gen.forEach(g => { if ((g.mae === id || g.pai === id) && !set.has(g.id)) { set.add(g.id); desc(g.id, set); } }); };
    box.querySelectorAll('.gnode').forEach(n => {
      const on = () => {
        const id = +n.dataset.id, set = new Set(); anc(id, set); desc(id, set);
        box.classList.add('foco');
        box.querySelectorAll('.gnode').forEach(m => m.classList.toggle('on', set.has(+m.dataset.id)));
        box.querySelectorAll('.glink').forEach(l => l.classList.toggle('on', set.has(+l.dataset.a) && set.has(+l.dataset.b)));
        $('genInfo').textContent = n.dataset.info;
      };
      n.addEventListener('mouseenter', on); n.addEventListener('click', on);
      n.addEventListener('mouseleave', () => box.classList.remove('foco'));
    });
  }
  function renderGeneCards() {
    const R = RES.registros;
    const comF = R.filter(r => r.F !== null && r.N > 0);
    const ult = comF[comF.length - 1] || R[0];
    const Fmax = Math.max(0, ...comF.map(r => r.F));
    const iF2 = R.findIndex(r => r.Fnasc !== null && r.Fnasc >= 0.2);
    const minHe = Math.min(...comF.map(r => r.He));
    const mE = RES.resumo.mcTot.endogamia, tot = RES.resumo.mortes;
    $('geneCards').innerHTML = `
      <div class="cartao"><h3>Endogamia</h3><div class="mono" style="font-size:1.6rem">${fmt3(ult.F)}</div><p class="sub">F médio ${RES.resumo.extinta ? 'no último registro com coelhos' : 'ao final'} (máximo ${fmt3(Fmax)}). ${iF2 > 0 ? `F dos recém-nascidos passou de 0,2 ${quando(iF2)}.` : ''}</p></div>
      <div class="cartao"><h3>Diversidade</h3><div class="mono" style="font-size:1.6rem">${pct(ult.He)}</div><p class="sub">da heterozigosidade inicial (mínimo ${pct(minHe)}). ${fmt2(ult.alelos)} de ${ult.alelosMax || 4} alelos fundadores restam por locus, em média.</p></div>
      <div class="cartao"><h3>Custo da consanguinidade</h3><div class="mono" style="font-size:1.6rem">${fmt(mE)}</div><p class="sub">mortes de filhotes atribuídas à depressão endogâmica (${pct(mE / Math.max(1, tot))} de todas as mortes). Com 2B = 3,14, um filhote com F = 0,25 tem ${pct(1 - Math.exp(-1.57 * 0.25 * RES.parametros.endogamia_mult))} a mais de risco no ninho.</p></div>
      <div class="cartao span2" style="grid-column:1/-1"><h3>Em linguagem simples</h3><p class="sub" style="margin:0">Cada coelho tem duas cópias de cada gene, uma da mãe e uma do pai. Quando as duas cópias vêm do mesmo ancestral, defeitos recessivos que ficavam "escondidos" aparecem, e é por isso que filhos de parentes morrem mais. Como todos aqui descendem de dois animais, a consanguinidade chega a ~25% já na segunda geração. Depois, numa população grande, ela sobe devagar. Quando a população despenca (gargalo), poucos sobreviventes passam seus genes adiante e F volta a subir rápido.</p></div>`;
  }

  /* ---------------- clima ---------------- */
  function renderEstacoes4() {
    const r = RES.registros[IDX];
    const ano = r.ano, regs = RES.registros.filter(x => x.ano === ano && !x.inicial);
    const desc = (RES.regime && RES.regime.desc) || ['', '', '', ''];
    $('estacoes4').innerHTML = [0, 1, 2, 3].map(s => {
      const x = regs.find(q => q.est === s);
      return `<div class="est-card${s === r.est ? ' atual' : ''}"><div class="ic">${EST_IC[s]}</div><b>${EST[s]} · ano ${ano}</b>${desc[s]}<div class="mono" style="margin-top:6px;color:var(--text)">${x ? `${fmt1(x.chuva)} mm · ${fmt1(x.T)} °C · ${fmt(x.N)} coelhos` : '—'}</div></div>`;
    }).join('');
  }
  function renderClimaFatos() {
    const A = RES.anual;
    if (!A.length) return;
    const mx = A.reduce((a, b) => b.multPrim > a.multPrim ? b : a), mn = A.reduce((a, b) => b.multPrim < a.multPrim ? b : a);
    const seq = (fn) => { let best = 0, ini = 0, run = 0, cur = 0; A.forEach((a, k) => { if (fn(a)) { if (!run) cur = k; run++; if (run > best) { best = run; ini = cur; } } else run = 0; }); return [best, ini]; };
    const [sS, iS] = seq(a => a.multPrim < 0.9), [sC, iC] = seq(a => a.multPrim > 1.1);
    let calor = 0, temp = 0, frio = 0;
    RES.registros.forEach(r => (r.eventosClima || []).forEach(e => { if (e.tipo === 'onda_calor') calor++; if (e.tipo === 'tempestade') temp++; if (e.tipo === 'frio_extremo') frio++; }));
    $('climaFatos').innerHTML = `<div class="grid g4">
      <div><div class="muted small">Estação chuvosa mais farta</div><div class="mono" style="font-size:1.2rem">Ano ${mx.ano} · ${pct(mx.multPrim)}</div></div>
      <div><div class="muted small">Estação chuvosa mais fraca</div><div class="mono" style="font-size:1.2rem">Ano ${mn.ano} · ${pct(mn.multPrim)}</div></div>
      <div><div class="muted small">Maior sequência de anos secos</div><div class="mono" style="font-size:1.2rem">${sS ? sS + ' ano(s): ' + (iS + 1) + '–' + (iS + sS) : 'nenhuma'}</div></div>
      <div><div class="muted small">Maior sequência de anos chuvosos</div><div class="mono" style="font-size:1.2rem">${sC ? sC + ' ano(s): ' + (iC + 1) + '–' + (iC + sC) : 'nenhuma'}</div></div>
      <div><div class="muted small">Ondas de calor</div><div class="mono" style="font-size:1.2rem">${calor}</div></div>
      <div><div class="muted small">Tempestades intensas</div><div class="mono" style="font-size:1.2rem">${temp}</div></div>
      <div><div class="muted small">Episódios de frio extremo</div><div class="mono" style="font-size:1.2rem">${frio}</div></div>
      <div><div class="muted small">Chuva média anual</div><div class="mono" style="font-size:1.2rem">${fmt(Math.round(A.reduce((a, b) => a + b.chuva, 0) / A.length))} mm</div></div></div>`;
  }

  /* ---------------- linha do tempo ---------------- */
  function renderTimeline() {
    $('timeline').innerHTML = RES.eventos.map(e => `<button class="ev ${e.nivel}" data-i="${e.i}"><span class="ic">${e.icone}</span><span><b>${esc(e.titulo)}</b><span class="t">${esc(e.texto)}</span><span class="chips">${e.vars.map(v => `<span class="chip">${esc(v)}</span>`).join('')}</span></span><span class="quando">${rotuloCurto(e.i)}</span></button>`).join('') || '<p class="muted">Nenhum evento detectado.</p>';
    $('timeline').querySelectorAll('.ev').forEach(b => b.addEventListener('click', () => { irPara(+b.dataset.i); window.irPagina('geral', 'painel'); }));
  }

  /* ---------------- tabelas ---------------- */
  function renderTabelas() {
    const R = RES.registros;
    $('tabPop').innerHTML = `<thead><tr><th>Ano</th><th class="l">Estação</th><th>População</th><th>Nascimentos</th><th>Mortes</th><th>Sobrevivência</th><th>Fêmeas reprod.</th><th>Imaturos</th><th>Adultos</th><th>Índice alim.</th><th>Capacidade</th></tr></thead><tbody>` +
      R.map(r => `<tr data-i="${r.i}"><td>${r.inicial ? '—' : r.ano}</td><td class="l">${r.inicial ? 'Início' : EST_IC[r.est] + ' ' + EST[r.est]}</td><td class="num">${fmt(r.N)}</td><td class="num">${fmt(r.nasc)}</td><td class="num">${fmt(r.mortes)}</td><td class="num">${pct(r.sobrev)}</td><td class="num">${fmt(r.femRep)}</td><td class="num">${fmt(r.filhotes)}</td><td class="num">${fmt(r.adultos)}</td><td class="num">${r.inicial ? '—' : pct(r.indAlim)}</td><td class="num">${fmt(r.K)}</td></tr>`).join('') + '</tbody>';
    $('tabPop').querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', () => irPara(+tr.dataset.i)));
    $('tabAno').innerHTML = `<thead><tr><th>Ano</th><th>Chuva (mm)</th><th>Estação chuvosa</th><th>Grama média (kg/ha)</th><th>Vigor raízes</th><th>Arbustos (kg/ha)</th><th>Árvore</th><th>Solo</th><th>Erosão (t/ha)</th><th>Alimento</th><th>K primavera</th><th>K sustentável</th><th>N máx</th><th>F</th><th>He</th><th>Ne (harm.)</th><th>Gerações</th></tr></thead><tbody>` +
      RES.anual.map(a => `<tr data-i="${(a.ano - 1) * 4 + 1}"><td>${a.ano}</td><td class="num">${fmt(Math.round(a.chuva))}</td><td class="num">${pct(a.multPrim)}</td><td class="num">${fmt(Math.round(a.gramaMedia))}</td><td class="num">${pct(a.R)}</td><td class="num">${fmt(Math.round(a.arbustos))}</td><td class="num">${a.arvViva ? pct(a.arvore) : 'morta'}</td><td class="num">${pct(a.solo)}</td><td class="num">${fmt1(a.erosao)}</td><td class="num">${pct(a.alimento)}</td><td class="num">${fmt(a.Kprim)}</td><td class="num">${fmt(a.Ksust)}</td><td class="num">${fmt(a.Nmax)}</td><td class="num">${fmt3(a.F)}</td><td class="num">${pct(a.He)}</td><td class="num">${fmt1(a.Ne)}</td><td class="num">${fmt(a.ger)}</td></tr>`).join('') + '</tbody>';
    $('tabAno').querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', () => irPara(+tr.dataset.i)));
  }

  /* ---------------- relatório ---------------- */
  function renderRelatorio() {
    const S = RES.resumo, R = RES.registros, P = RES.parametros, ev = (t) => RES.eventos.find(e => e.tipo === t);
    const mc = RES === ORIG ? D.mcBase : labMC;
    const fim = R[R.length - 1];
    const eMax = R[S.iMax];
    const eG = ev('grama_degrada'), eA = ev('arbustos'), eT = ev('arvore_morte'), eE = ev('extincao'), eC = ev('colapso');
    const p = [];
    p.push(`A ilha recebeu ${S.Nini} coelhos e, ${eMax.ano <= 6 ? 'em poucos anos' : 'ao longo de ' + eMax.ano + ' anos'}, a população chegou a <b>${fmt(S.Nmax)}</b> ${quando(S.iMax)}, ${S.Nmax > P.K_referencia ? 'acima' : 'abaixo'} da capacidade de referência de ${fmt(P.K_referencia)}. No total nasceram ${fmt(S.nasc)} coelhos e morreram ${fmt(S.mortes)}.`);
    if (eG || eA) p.push(`O crescimento consumiu a base da qual dependia: ${eG ? `as raízes da grama começaram a morrer ${quando(eG.i)}` : 'a grama resistiu'}${eA ? `, e os arbustos, descascados quando faltou grama, caíram abaixo da metade ${quando(eA.i)}` : ''}. ${eC ? eC.texto + ' ' : ''}Houve ${S.crises} crise(s) alimentar(es) e ${S.colapsos} colapso(s) populacional(is).`);
    else p.push(`A vegetação não chegou a ser degradada de forma significativa (vigor mínimo das raízes ${pct(Math.min(...R.map(r => r.R)))}).`);
    p.push(`${eT ? 'A única árvore morreu ' + quando(eT.i) + '.' : `A única árvore sobreviveu (saúde final ${pct(fim.arvSaude)}).`} O solo perdeu ${fmt1(R[0].prof - fim.prof)} cm por erosão (${fmt(Math.round(fim.erosaoAcum))} t/ha) e a capacidade de suporte da estação chuvosa passou de ${fmt(RES.anual[0].Kprim)} para ${fmt(RES.anual[RES.anual.length - 1].Kprim)} coelhos.`);
    const ultF = R.filter(r => r.F !== null).pop();
    p.push(`Geneticamente, a origem em dois fundadores impôs F ≈ ${fmt2(ultF ? ultF.F : 0)} e ${pct(S.mcTot.endogamia / Math.max(1, S.mortes))} das mortes foram de filhotes atribuídas à depressão endogâmica. ${S.extinta ? `A população foi <b>extinta</b> ${mesTxt(S.mesExtincao)}, e a vegetação ${fim.R > 0.7 ? 'voltou a se recuperar sem pastejo' : 'começou a se recuperar lentamente'}.` : `Ao final restavam <b>${fmt(S.Nfinal)}</b> coelhos.`}`);
    if (mc) p.push(`Em ${mc.reps} repetições com outras sequências de chuva e de sorte demográfica, a probabilidade de extinção em ${P.anos} anos foi de <b>${pct(mc.pExtincao)}</b> (população final mediana: ${fmt(mc.NfinalMed)}). Resposta ao objetivo: uma ilha que alimentaria ~${fmt(P.K_referencia)} coelhos na estação chuvosa média <b>${mc.pExtincao >= 0.5 ? 'na maioria das vezes não consegue' : 'muitas vezes consegue, mas a um alto custo ecológico,'}</b> manter por ${P.anos} anos uma população descendente de dois fundadores, porque a primavera não representa o ano: a fome vem no outono e no inverno, depois que a explosão da primavera já degradou a vegetação.`);
    $('conclusao').innerHTML = p.map(x => `<p>${x}</p>`).join('');
    const ano = RES.anual;
    $('resumoDl').innerHTML = [
      ['População inicial', fmt(S.Nini)], ['População máxima', fmt(S.Nmax) + ' (' + rotuloCurto(S.iMax) + ')'], ['População final', fmt(S.Nfinal) + (S.extinta ? ' (extinta)' : '')],
      ['Nascimentos totais', fmt(S.nasc)], ['Mortes totais', fmt(S.mortes)], ['Taxa de sobrevivência (mortes ÷ todos que existiram)', pct(1 - S.mortes / Math.max(1, S.Nini + S.nasc))],
      ['Grama ao final', fmt(Math.round(S.final.Gg + S.final.Gd)) + ' kg/ha · vigor ' + pct(S.final.R)], ['Arbustos ao final', pct(S.final.Hs / S.final.Hs0) + ' da estrutura inicial'],
      ['Árvore ao final', S.final.arvViva ? 'viva · saúde ' + pct(S.final.arvSaude) : 'morta'], ['Solo ao final', pct(S.final.solo) + ' · ' + fmt1(S.final.prof) + ' cm'],
      ['Capacidade na estação chuvosa: ano 1 → último ano', fmt(ano[0].Kprim) + ' → ' + fmt(ano[ano.length - 1].Kprim)], ['Capacidade sustentável final', fmt(S.final.Ksust)],
      ['Endogamia (último F)', fmt3(ultF ? ultF.F : null)], ['Diversidade genética (He rel.)', pct(ultF ? ultF.He : null)],
      ['Crises alimentares', fmt(S.crises)], ['Colapsos populacionais', fmt(S.colapsos)], ['Eventos ecológicos detectados', fmt(RES.eventos.length)],
      ['Saúde final do ecossistema', Math.round(S.final.saude) + '/100']
    ].map(x => `<dt>${x[0]}</dt><dd>${x[1]}</dd>`).join('');
    const qa = Eng.analisar(RES);
    $('qa').innerHTML = qa.map((x, k) => `<details${k < 3 ? ' open' : ''}><summary>${k + 1}. ${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('');
  }

  /* ---------------- cenários ---------------- */
  function renderCenarios() {
    const cen = (D.cenarios || []).filter(c => c.grupo !== 'predadores');
    if (!cen.length || !D.mcBase) {
      $('cenIntro').innerHTML = '⚠️ O arquivo <code>dados/resultados.js</code> não foi encontrado, então os cenários e o Monte Carlo pré-calculados não estão disponíveis. Rode <code>node simular.js</code> (ou SIMULAR.bat), ou use o Laboratório.';
      ['gMC', 'gCmp', 'gCmpVeg', 'gHist'].forEach(id => { $(id).innerHTML = '<p class="muted">Indisponível.</p>'; });
      $('tabCen').innerHTML = ''; $('cenSens').innerHTML = ''; return;
    }
    const mc = D.mcBase, b = mc.bandas;
    $('mcSub').textContent = `${mc.reps} repetições (sementes ${D.meta.sementeMC}–${D.meta.sementeMC + mc.reps - 1}). Faixas: percentis 5–95 e 25–75; linha cheia: mediana; tracejada: a execução original (semente 42).`;
    grafico('gMC', baseSaz({ _sazonal: true, altura: 300, log: true, rotuloY: 'coelhos (escala log)', series: [
      { rotulo: 'P5–P95', tipo: 'faixa', lo: b.p5, hi: b.p95, cor: C.pop, opac: .16 },
      { rotulo: 'P25–P75', tipo: 'faixa', lo: b.p25, hi: b.p75, cor: C.pop, opac: .3 },
      { rotulo: 'Mediana', dados: b.p50, cor: C.pop, largura: 2.2 },
      { rotulo: 'Execução original', dados: ORIG.registros.map(r => r.N), cor: C.sky, tracejado: true, largura: 1.3 }] }));
    const corP = (p) => p >= 0.75 ? '#f6ddd6' : p >= 0.4 ? '#f8ebd2' : '#dcecd9';
    $('tabCen').innerHTML = `<thead><tr><th class="l">Cenário</th><th>P(extinção)</th><th>P(árvore morre)</th><th>N máx (mediana)</th><th>N final: mediana [P5–P95]</th><th>Colapsos</th><th>Vigor da grama final</th><th>Arbustos final</th><th>F final</th><th>Saúde final</th><th></th></tr></thead><tbody>` +
      cen.map(c => `<tr data-id="${c.id}" class="${c.id === cenSel ? 'sel' : ''}"><td class="l">${esc(c.nome)}</td><td><span class="prob" style="background:${corP(c.mc.pExtincao)}">${pct(c.mc.pExtincao)}</span></td><td class="num">${pct(c.mc.pArvoreMorre)}</td><td class="num">${fmt(c.mc.NmaxMed)}</td><td class="num">${fmt(c.mc.NfinalMed)} [${fmt(c.mc.NfinalP5)}–${fmt(c.mc.NfinalP95)}]</td><td class="num">${fmt1(c.mc.colapsosMed)}</td><td class="num">${pct(c.mc.RfinalMed)}</td><td class="num">${pct(c.mc.HsFinalMed)}</td><td class="num">${fmt3(c.mc.FfinalMed)}</td><td class="num">${fmt1(c.mc.saudeMed)}</td><td><button class="btn peq" data-lab="${c.id}" title="Abrir no Laboratório">⚗️</button></td></tr>`).join('') + '</tbody>';
    $('tabCen').querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-lab]')) { const c = cen.find(x => x.id === e.target.closest('[data-lab]').dataset.lab); abrirNoLab(c.p); return; }
      cenSel = tr.dataset.id; renderCenarios();
    }));
    const base = cen.find(c => c.id === 'base') || cen[0], sel = cen.find(c => c.id === cenSel) || cen[1] || base;
    $('cmpTitulo').textContent = 'Original × ' + sel.nome;
    grafico('gCmp', baseSaz({ _sazonal: true, log: true, rotuloY: 'coelhos (log)', onClick: null, series: [
      { rotulo: 'Original', dados: base.serie.N, cor: C.sky, tracejado: true, largura: 1.5 },
      { rotulo: sel.nome, dados: sel.serie.N, cor: C.pop, largura: 2 }] }));
    const H0b = base.serie.Hs[0], H0s = sel.serie.Hs[0] || 1;
    grafico('gCmpVeg', baseSaz({ _sazonal: true, yMin: 0, onClick: null, fmtY: (v) => v.toFixed(1).replace('.', ','), series: [
      { rotulo: 'Vigor da grama: original', dados: base.serie.R, cor: C.grass, tracejado: true, largura: 1.3 },
      { rotulo: 'Vigor da grama: cenário', dados: sel.serie.R, cor: C.grass, largura: 2 },
      { rotulo: 'Arbustos: original', dados: base.serie.Hs.map(v => v / H0b), cor: C.earth, tracejado: true, largura: 1.3 },
      { rotulo: 'Arbustos: cenário', dados: sel.serie.Hs.map(v => v / H0b), cor: C.earth, largura: 2 }] }));
    const h = mc.histFinal;
    grafico('gHist', { _sazonal: false, altura: 220, passos: [1, 2, 3, 6], rotuloX: (i) => fmt(i * h.largura), titulo: (i) => `${fmt(i * h.largura)}–${fmt((i + 1) * h.largura - 1)} coelhos`, rotuloY: 'repetições',
      series: [{ rotulo: 'Repetições', tipo: 'barra', dados: h.contagens, cor: C.pop }], fmtV: (v) => fmt(v) });
    const difs = cen.filter(c => (c.grupo ? c.grupo === 'ambiente' : !c.fundadores) && c.id !== 'base').map(c => ({ c, d: c.mc.pExtincao - base.mc.pExtincao })).sort((a, b2) => Math.abs(b2.d) - Math.abs(a.d));
    const top = difs[0];
    $('cenSens').innerHTML = `<p class="sub">Mudança na probabilidade de extinção em relação ao original (${pct(base.mc.pExtincao)}):</p>` + difs.map(x => `<div style="margin:6px 0"><div class="comp-l" style="font-size:.82rem"><span>${esc(x.c.nome)}</span><span class="mono" style="color:${x.d > 0 ? C.danger : C.good}">${x.d > 0 ? '+' : ''}${Math.round(x.d * 100)} p.p.</span></div><div class="barra"><i style="width:${Math.min(100, Math.abs(x.d) * 100)}%;background:${x.d > 0 ? C.danger : C.good}"></i></div></div>`).join('') +
      (top ? `<p class="small" style="margin-top:10px">A alteração com maior efeito foi <b>${esc(top.c.nome)}</b>. ${cen.find(c => c.id === 'F') && cen.find(c => c.id === 'E') ? `Velocidade de regeneração da vegetação (E × F) muda o risco de ${pct(cen.find(c => c.id === 'F').mc.pExtincao)} a ${pct(cen.find(c => c.id === 'E').mc.pExtincao)}.` : ''} Note que mais alimento na primavera nem sempre ajuda: alimenta explosões maiores e colapsos mais profundos.</p>` : '');
  }

  /* ---------------- predadores ---------------- */
  function renderPredadores() {
    const T = Eng.PRED_TIPOS;
    const repro = (t) => t.migra ? 'não se reproduz na ilha (migra)' : `${t.repro.length > 2 ? 'até 2 ninhadas' : '1 ninhada'}/ano · ~${t.ninhada} filhotes`;
    $('predCards').innerHTML = Object.keys(T).map(k => {
      const t = T[k];
      return `<div class="cartao pred-card"><div class="pc-top"><span class="pc-ic">${t.icone}</span><b>${t.nome}</b></div><p>${t.resumo}</p>
        <div class="pc-fatos"><span class="chip">come ~${t.need} coelhos/mês</span><span class="chip">${t.prot >= 0.6 ? 'vegetação protege bem' : t.prot >= 0.4 ? 'vegetação protege um pouco' : 'entra nas tocas'}</span><span class="chip">${repro(t)}</span></div>
        <button class="btn pri peq" data-predlab="${k}">▶ Simular com ${t.nome.toLowerCase()}</button></div>`;
    }).join('');
    $('predCards').querySelectorAll('[data-predlab]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.predlab;
      resetLab(); $('lpOn_' + k).checked = true; $('lp_' + k).classList.add('on'); sincronizarCentral();
      aplicarExperimento(true); setTimeout(() => window.irPagina('geral', 'painel'), 300);
    }));
    $('tabPredParam').innerHTML = Object.keys(T).map(k => { const t = T[k]; return `<tr><td class="l">${t.icone} ${t.nome}</td><td class="num">${t.need}</td><td class="num">${t.h}</td><td class="num">${t.juv}×</td><td class="num">${pct(t.prot)}</td><td class="num">${pct(t.alt)}</td><td class="l">${repro(t)}</td></tr>`; }).join('');
    // predadores na simulação atual (página Coelhos)
    const tem = RES.parametros.predadores.length > 0;
    $('cartaoPredRun').hidden = !tem;
    if (tem) {
      const tipos = Object.keys(RES.registros[0].pred);
      grafico('gPredRun', baseSaz({ rotuloY: 'predadores', fmtY: (v) => Math.round(v).toString(), series: tipos.map(t => ({ rotulo: T[t].nome, dados: col(null, r => r.pred[t]), cor: COR_PRED[t], largura: 2 })) }));
    }
    // resultados pré-calculados
    const pc = (D.cenarios || []).filter(c => c.grupo === 'predadores');
    const base = (D.cenarios || []).find(c => c.id === 'base');
    if (!pc.length || !base) { $('tabPred').innerHTML = ''; $('predSub').textContent = 'Resultados pré-calculados indisponíveis: rode "node simular.js" ou use o Laboratório.'; $('predLicao').innerHTML = ''; ['gPredCmp', 'gPredN'].forEach(id => { $(id).innerHTML = ''; }); return; }
    const corP = (p) => p >= 0.75 ? '#f6ddd6' : p >= 0.4 ? '#f8ebd2' : '#dcecd9';
    $('predSub').textContent = `${D.meta.repsCenario} repetições por cenário, ${DUR} anos. Clique em uma linha para ver o gráfico.`;
    const linhas = [base].concat(pc);
    $('tabPred').innerHTML = `<thead><tr><th class="l">Cenário</th><th>Chance de os coelhos sumirem</th><th>Coelhos em média</th><th>Pico de coelhos</th><th>Chance de o predador sobreviver</th><th>Pasto no final</th><th></th></tr></thead><tbody>` +
      linhas.map(c => `<tr data-id="${c.id}" class="${c.id === predSel ? 'sel' : ''}"><td class="l">${c.id === 'base' ? '🚫 Sem predadores (original)' : esc(c.nome)}</td><td><span class="prob" style="background:${corP(c.mc.pExtincao)}">${pct(c.mc.pExtincao)}</span></td><td class="num">${fmt(c.mc.NmedioMed)}</td><td class="num">${fmt(c.mc.NmaxMed)}</td><td class="num">${c.mc.pPredSobrevive === null || c.mc.pPredSobrevive === undefined ? '—' : pct(c.mc.pPredSobrevive)}</td><td class="num">${pct(c.mc.RfinalMed)}</td><td>${c.id === 'base' ? '' : `<button class="btn peq" data-lab="${c.id}" title="Abrir no Laboratório">⚗️</button>`}</td></tr>`).join('') + '</tbody>';
    $('tabPred').querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lab]'); if (b) { abrirNoLab(pc.find(x => x.id === b.dataset.lab).p); return; }
      if (tr.dataset.id !== 'base') { predSel = tr.dataset.id; renderPredadores(); }
    }));
    const sel = pc.find(c => c.id === predSel) || pc[0];
    $('predCmpTitulo').textContent = 'Coelhos: ' + sel.curto;
    grafico('gPredCmp', baseSaz({ _sazonal: true, onClick: null, log: true, rotuloY: 'coelhos (log)', series: [
      { rotulo: 'Sem predadores', dados: base.serie.N, cor: C.sky, tracejado: true, largura: 1.4 },
      { rotulo: 'Com ' + sel.curto.toLowerCase(), dados: sel.serie.N, cor: C.pop, largura: 2 }] }));
    const tipos = Object.keys(sel.serie.predPor || {});
    grafico('gPredN', baseSaz({ _sazonal: true, onClick: null, rotuloY: 'predadores', fmtY: (v) => Math.round(v).toString(), series: tipos.map(t => ({ rotulo: T[t].nome, dados: sel.serie.predPor[t], cor: COR_PRED[t], largura: 2 })) }));
    // compara só cenários com a mesma ilha (100 ha); a ilha maior é comparada com a ilha maior sem predadores
    const mesmaIlha = pc.filter(c => !c.p.area_ha);
    const melhor = mesmaIlha.reduce((a, b) => b.mc.pExtincao < a.mc.pExtincao ? b : a, mesmaIlha[0] || pc[0]);
    const pior = mesmaIlha.reduce((a, b) => b.mc.pExtincao > a.mc.pExtincao ? b : a, mesmaIlha[0] || pc[0]);
    const grande = pc.find(c => c.p.area_ha), grandeSem = (D.cenarios || []).find(c => c.grupo === 'ambiente' && c.p.area_ha === (grande && grande.p.area_ha));
    // texto gerado a partir dos resultados (não presume que predadores ajudam ou atrapalham)
    const ajuda = melhor.mc.pExtincao < base.mc.pExtincao - 0.15;
    const predVivo = pc.filter(c => c.mc.pPredSobrevive !== null && c.mc.pPredSobrevive >= 0.5);
    const p1 = ajuda
      ? `Parece estranho, mas <b>predadores podem salvar os coelhos</b>. Sem predadores, os coelhos se multiplicam até destruir o pasto e depois morrem de fome (chance de sumirem: ${pct(base.mc.pExtincao)}). Com <b>${esc(melhor.curto.toLowerCase())}</b>, a explosão é freada, o pasto sobrevive e a chance cai para <b>${pct(melhor.mc.pExtincao)}</b>.`
      : `Nesta configuração, <b>nenhum predador impediu o colapso</b> (sem predadores, a chance de os coelhos sumirem é ${pct(base.mc.pExtincao)}; o melhor resultado com predadores foi ${pct(melhor.mc.pExtincao)}, com ${esc(melhor.curto.toLowerCase())}). A explosão dos coelhos destrói o pasto antes que os predadores consigam freá-la.`;
    $('predLicao').innerHTML = `<h3>💡 O que os predadores ensinam</h3><p class="pp" style="margin-top:8px">${p1}</p>
      <p class="small muted">Predadores que dependem quase só dos coelhos (como ${esc(pior.curto.toLowerCase())}: ${pct(pior.mc.pExtincao)}) costumam derrubar a população e depois morrer de fome: é o ciclo predador-presa de Lotka–Volterra. ${predVivo.length ? `Os predadores sobreviveram na maioria das repetições em: ${predVivo.map(c => esc(c.curto.toLowerCase())).join(', ')}.` : 'Em nenhum cenário os predadores sobreviveram na maioria das repetições: numa ilha de 1 km² cabem poucos predadores, e populações tão pequenas somem por fome ou por azar.'} ${grande && grandeSem ? `Numa ilha de ${grande.p.area_ha} ha, a chance de os coelhos sumirem é ${pct(grandeSem.mc.pExtincao)} sem predadores e ${pct(grande.mc.pExtincao)} com ${esc(grande.curto.toLowerCase())}: com mais espaço, predadores podem conviver com os coelhos e frear as explosões.` : 'Experimente a ilha maior na Central de experimento.'}</p>`;
  }

  /* ---------------- laboratório ---------------- */
  function montarLab() {
    const grupos = {};
    Eng.PARAM_META.forEach(m => { (grupos[m.grupo] = grupos[m.grupo] || []).push(m); });
    let h = '';
    Object.keys(grupos).forEach(g => {
      h += `<div class="grupo-t">${g}</div>`;
      grupos[g].forEach(m => {
        const v = Eng.PADRAO[m.k];
        h += `<label class="slider" data-k="${m.k}"><span class="sl-top"><span>${m.rotulo}</span><output id="out_${m.k}">${fmtParam(m, v)}</output></span>
          <input type="range" id="par_${m.k}" min="${m.min}" max="${m.max}" step="${m.passo}" value="${v}" aria-label="${esc(m.rotulo)}">
          <span class="sl-desc">${m.desc} Padrão: ${fmtParam(m, v)}.</span></label>`;
      });
    });
    $('labGrid').innerHTML = h;
    const padraoPred = { gato: [3, 4], raposa: [3, 2], arminho: [3, 4], rapina: [1, 2] };
    $('labPred').innerHTML = Object.keys(Eng.PRED_TIPOS).map(k => { const t = Eng.PRED_TIPOS[k]; return `<div class="lp" id="lp_${k}"><label class="lp-t"><input type="checkbox" id="lpOn_${k}"> ${t.icone} ${t.nome}</label>
      <span>Chegam no ano</span><input type="number" id="lpAno_${k}" min="1" max="100" value="${padraoPred[k][0]}">
      <span>Quantos</span><input type="number" id="lpN_${k}" min="1" max="50" value="${padraoPred[k][1]}"></div>`; }).join('');
    Object.keys(Eng.PRED_TIPOS).forEach(k => $('lpOn_' + k).addEventListener('change', () => { $('lp_' + k).classList.toggle('on', $('lpOn_' + k).checked); sincronizarCentral(); }));
    $('labAnos').addEventListener('input', () => { $('labAnosVal').textContent = $('labAnos').value + ' anos'; });
    Eng.PARAM_META.forEach(m => {
      const inp = $('par_' + m.k);
      inp.addEventListener('input', () => { $('out_' + m.k).textContent = fmtParam(m, +inp.value); inp.closest('.slider').classList.toggle('mod', Math.abs(+inp.value - Eng.PADRAO[m.k]) > 1e-9); });
    });
    $('labRodar').addEventListener('click', () => { sincronizarCentral(); sincronizarDuracao(+$('labAnos').value); aplicarExperimento(false); });
    $('labReset').addEventListener('click', () => { resetLab(); $('labStatus').textContent = 'Valores originais restaurados (clique em Executar para rodar).'; });
  }
  function fmtParam(m, v) { if (m.k === 'K_referencia') return fmt(v); if (m.k === 'area_ha') return fmt(v) + ' ha'; if (m.k === 'pares_iniciais') return fmt(v) + (v === 1 ? ' casal' : ' casais'); if (m.k === 'chuva_vies') return (v > 0 ? '+' : '') + Math.round(v * 100) + '%'; return fmt2(v) + (m.un && m.un.startsWith('×') ? '×' : ''); }
  function resetLab() {
    Eng.PARAM_META.forEach(m => { const inp = $('par_' + m.k); inp.value = Eng.PADRAO[m.k]; inp.dispatchEvent(new Event('input')); });
    $('labFund').value = 'par_adulto'; $('labSemente').value = 42; $('labReps').value = '1'; $('labSurtos').value = '1'; $('labEstacoes').value = Eng.PADRAO.estacoes; $('labAnos').value = String(DUR); $('labAnosVal').textContent = DUR + ' anos';
    Object.keys(Eng.PRED_TIPOS).forEach(k => { $('lpOn_' + k).checked = false; $('lp_' + k).classList.remove('on'); });
  }
  function abrirNoLab(p) {
    resetLab();
    Object.keys(p).forEach(k => {
      if (k === 'fundadores') $('labFund').value = p[k];
      else if (k === 'predadores') p[k].forEach(x => { $('lpOn_' + x.tipo).checked = true; $('lp_' + x.tipo).classList.add('on'); $('lpAno_' + x.tipo).value = x.ano; $('lpN_' + x.tipo).value = x.n; });
      else if ($('par_' + k)) { $('par_' + k).value = p[k]; $('par_' + k).dispatchEvent(new Event('input')); }
    });
    sincronizarCentral();
    window.irPagina('experimentos', 'laboratorio');
    $('labStatus').textContent = 'Parâmetros carregados. Clique em Executar.';
  }
  function lerLab() {
    const p = {};
    Eng.PARAM_META.forEach(m => { p[m.k] = +$('par_' + m.k).value; });
    p.fundadores = $('labFund').value; p.semente = Math.max(1, Math.floor(+$('labSemente').value || 42)); p.surtos_doenca = $('labSurtos').value === '1';
    p.anos = +$('labAnos').value;
    p.estacoes = $('labEstacoes').value;
    p.predadores = Object.keys(Eng.PRED_TIPOS).filter(k => $('lpOn_' + k).checked).map(k => ({ tipo: k, ano: clamp(Math.floor(+$('lpAno_' + k).value || 1), 1, p.anos), n: clamp(Math.floor(+$('lpN_' + k).value || 1), 1, 50) }));
    return p;
  }
  function rodarLab(clicou) {
    const p = lerLab(), reps = +$('labReps').value;
    carregando(true, `Simulando ${p.anos * 12} meses…`);
    const pausa = () => new Promise(r => setTimeout(r, 15));
    setTimeout(async () => {
      try {
        if (p.anos !== DUR) { prepararDuracao(p.anos); sincronizarDuracao(p.anos); }   // compara com a original da mesma duração
        const t0 = performance.now();
        const res = Eng.simular(p);
        labMC = null;
        if (reps > 1) {
          // Monte Carlo em fatias: a página continua respondendo e mostra o progresso
          const series = [], runs = [];
          for (let k = 0; k < reps; k++) {
            carregando(true, `Monte Carlo: repetição ${k + 1} de ${reps}…`);
            await pausa();
            const rk = Eng.simular(Object.assign({}, p, { semente: 1000 + k }));
            series.push(rk.registros.map(x => x.N)); runs.push(Eng.linhaMC(rk));
          }
          labMC = Eng.resumirMC(series, runs);
        }
        RES = res;
        atualizarTimebarOpcoes(); renderTudo(); irPara(Math.min(IDX, RES.registros.length - 1));
        const dt = Math.round(performance.now() - t0);
        $('labStatus').textContent = `Concluído em ${dt} ms. Toda a página agora mostra este experimento.`;
        $('centralStatus').textContent = `Experimento simulado: ${p.anos} anos, ${Eng.REGIMES[p.estacoes].curto.toLowerCase()}, sorte nº ${p.semente} (${dt} ms).`;
        renderLabResultado(p);
      } catch (e) {
        console.error(e); $('labStatus').textContent = 'Erro ao executar: ' + e.message;
      } finally { carregando(false); }
    }, 40);
  }
  function renderLabResultado(p) {
    const a = ORIG.resumo, b = RES.resumo;
    const mudados = Eng.PARAM_META.filter(m => Math.abs(p[m.k] - Eng.PADRAO[m.k]) > 1e-9).map(m => `${m.rotulo}: ${fmtParam(m, p[m.k])}`);
    if (p.fundadores !== 'par_adulto') mudados.push('Fundadores: ' + $('labFund').selectedOptions[0].text);
    if (p.semente !== 42) mudados.push('Semente: ' + p.semente);
    if (!p.surtos_doenca) mudados.push('Surtos desativados');
    p.predadores.forEach(x => mudados.push(`${Eng.PRED_TIPOS[x.tipo].nome}: ${x.n} no ano ${x.ano}`));
    const linha = (l, x, y) => `<tr><td class="l">${l}</td><td class="num">${x}</td><td class="num">${y}</td></tr>`;
    $('labResultado').innerHTML = `<p class="small">${mudados.length ? 'Alterações: ' + mudados.map(esc).join(' · ') : 'Nenhum parâmetro alterado (o resultado é idêntico ao original).'}</p>
      <div class="tabela-box" style="max-height:none"><table><thead><tr><th class="l">Indicador</th><th>Original</th><th>Laboratório</th></tr></thead><tbody>
      ${linha('População máxima', fmt(a.Nmax), fmt(b.Nmax))}${linha('População final', fmt(a.Nfinal), fmt(b.Nfinal))}
      ${linha('Extinção nesta trajetória', a.extinta ? 'sim' : 'não', b.extinta ? 'sim' : 'não')}
      ${linha('Probabilidade de extinção (Monte Carlo)', D.mcBase ? pct(D.mcBase.pExtincao) : '—', labMC ? pct(labMC.pExtincao) + ` (${labMC.reps} rep.)` : 'escolha > 1 repetição')}
      ${linha('Colapsos', fmt(a.colapsos), fmt(b.colapsos))}${linha('Crises alimentares', fmt(a.crises), fmt(b.crises))}
      ${linha('Vigor da grama final', pct(a.final.R), pct(b.final.R))}${linha('Arbustos final (vs inicial)', pct(a.final.Hs / a.final.Hs0), pct(b.final.Hs / b.final.Hs0))}
      ${linha('Árvore', a.final.arvViva ? 'viva' : 'morta', b.final.arvViva ? 'viva' : 'morta')}${linha('Saúde final', Math.round(a.final.saude), Math.round(b.final.saude))}
      ${p.predadores.length ? linha('Coelhos mortos por predadores', '0', fmt(b.mcTot.predacao || 0)) + linha('Predadores vivos no final', '—', fmt(RES.registros[RES.registros.length - 1].predTotal)) : ''}
      </tbody></table></div>`;
  }

  /* ---------------- barra do tempo ---------------- */
  function atualizarTimebarOpcoes() {
    $('tbAno').innerHTML = Array.from({ length: RES.parametros.anos }, (_, k) => `<option value="${k + 1}">Ano ${k + 1}</option>`).join('');
    $('tbRange').max = RES.registros.length - 1;
  }
  function montarTimebar() {
    atualizarTimebarOpcoes();
    $('tbRange').addEventListener('input', () => irPara(+$('tbRange').value));
    $('tbMenos').addEventListener('click', () => { parar(); irPara(IDX - 1); });
    $('tbMais').addEventListener('click', () => { parar(); irPara(IDX + 1); });
    $('tbAnoMenos').addEventListener('click', () => { parar(); irPara(IDX - 4); });
    $('tbAnoMais').addEventListener('click', () => { parar(); irPara(IDX + 4); });
    const sel = () => { parar(); irPara((+$('tbAno').value - 1) * 4 + (+$('tbEst').value) + 1); };
    $('tbAno').addEventListener('change', sel); $('tbEst').addEventListener('change', sel);
    $('tbPlay').addEventListener('click', () => timer ? parar() : tocar());
    $('tbVel').addEventListener('change', () => { if (timer) { parar(); tocar(); } });
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input,select,textarea')) return;
      if (e.key === 'ArrowRight') { parar(); irPara(IDX + (e.shiftKey ? 4 : 1)); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { parar(); irPara(IDX - (e.shiftKey ? 4 : 1)); e.preventDefault(); }
      else if (e.key === ' ' && e.target === document.body) { timer ? parar() : tocar(); e.preventDefault(); }
    });
  }
  function tocar() {
    if (IDX >= RES.registros.length - 1) irPara(0);
    $('tbPlay').textContent = '⏸'; $('tbPlay').setAttribute('aria-label', 'Pausar');
    timer = setInterval(() => { if (IDX >= RES.registros.length - 1) { parar(); return; } irPara(IDX + 1); }, +$('tbVel').value);
  }
  function parar() { if (timer) clearInterval(timer); timer = null; $('tbPlay').textContent = '▶'; $('tbPlay').setAttribute('aria-label', 'Reproduzir'); }
  function marcasTimebar() {
    const n = RES.registros.length - 1;
    $('tbMarcas').innerHTML = RES.eventos.filter(e => e.i > 0).map(e => `<i style="left:calc(${(e.i / n * 100).toFixed(2)}% - 1px)" title="${esc(e.titulo)}"></i>`).join('');
  }

  /* ---------------- outros eventos de UI ---------------- */
  function montarEventosUI() {
    const tog = (id, fn) => $(id).addEventListener('click', () => { const b = $(id); b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); fn(b.getAttribute('aria-pressed') === 'true'); });
    tog('popLog', (on) => G.gPop.set({ log: on }));
    tog('popK', (on) => { G.gPop.o.series[0].oculto = !on; G.gPop.desenhar(); });
    $('popReset').addEventListener('click', () => { G.gPop.setRange(null); $('popFaixa').value = ''; });
    $('popFaixa').addEventListener('change', () => { const v = $('popFaixa').value; if (!v) G.gPop.setRange(null); else { const [a, b] = v.split('-').map(Number); G.gPop.setRange(a, b); } $('popFaixa').value = v; });
    $('vistaGeral').addEventListener('click', () => { vista = 'geral'; $('vistaGeral').setAttribute('aria-pressed', 'true'); $('vistaDetalhe').setAttribute('aria-pressed', 'false'); renderIlha(); });
    $('vistaDetalhe').addEventListener('click', () => { vista = 'detalhe'; $('vistaDetalhe').setAttribute('aria-pressed', 'true'); $('vistaGeral').setAttribute('aria-pressed', 'false'); renderIlha(); });
    $('voltarOriginal').addEventListener('click', () => { resetLab(); sincronizarCentral(); prepararDuracao(DUR); RES = ORIG; labMC = null; $('centralStatus').textContent = 'Mostrando a simulação original.'; atualizarTimebarOpcoes(); renderTudo(); irPara(IDX); $('labResultado').innerHTML = ''; $('labStatus').textContent = 'De volta à simulação original.'; });
    $('heroiPlay').addEventListener('click', () => { window.irPagina('geral', 'painel'); irPara(0); setTimeout(tocar, 600); });
    const nomeBase = () => RES === ORIG ? 'ilha40_original' : 'ilha40_laboratorio';
    $('expCsv').addEventListener('click', () => baixar(nomeBase() + '_sazonal.csv', '﻿' + Eng.csvSazonal(RES), 'text/csv;charset=utf-8'));
    $('expCsvAno').addEventListener('click', () => baixar(nomeBase() + '_anual.csv', '﻿' + Eng.csvAnual(RES), 'text/csv;charset=utf-8'));
    $('expJson').addEventListener('click', () => baixar(nomeBase() + '.json', JSON.stringify(RES, null, 1), 'application/json'));
    $('expPrint').addEventListener('click', () => { document.querySelectorAll('.qa details').forEach(d => d.open = true); window.print(); });
  }

  window.addEventListener('error', (e) => console.error('Erro na interface:', e.message));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
