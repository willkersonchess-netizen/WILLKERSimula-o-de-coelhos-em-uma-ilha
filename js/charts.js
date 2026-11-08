/* =====================================================================
   ILHA 40 — Biblioteca de gráficos em Canvas (sem dependências)
   Tipos de série: 'linha' (opcional área), 'area' (empilhável), 'barra'
   (agrupada ou empilhada), 'faixa' (entre dois limites).
   Recursos: tooltip, cursor de tempo, marcadores de eventos, linhas de
   referência, sombreamento entre séries, zoom por arrasto, escala log.
   ===================================================================== */
(function (root) {
  'use strict';
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmtPadrao = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + ' mi';
    if (a >= 1e4) return (v / 1e3).toFixed(0) + ' mil';
    if (a >= 1000) return Math.round(v).toLocaleString('pt-BR');
    if (a >= 100) return Math.round(v).toString();
    if (a >= 10) return v.toFixed(1).replace('.', ',');
    if (a >= 1) return v.toFixed(2).replace('.', ',');
    if (a === 0) return '0';
    return v.toFixed(3).replace('.', ',');
  };
  function niceTicks(min, max, n) {
    if (max === min) { max = min + 1; }
    const span = max - min, step0 = span / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag;
    const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  }
  function alpha(cor, a) {
    if (cor.startsWith('#')) {
      let h = cor.slice(1); if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const n = parseInt(h, 16);
      return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
    }
    return cor;
  }

  class Grafico {
    constructor(el, opcoes) {
      this.el = el;
      this.o = Object.assign({
        altura: 260, log: false, empilhado: false, zoom: false, cursor: true,
        padL: 58, padR: 14, padT: 16, padB: 30,
        yMin: null, yMax: null, fmtY: fmtPadrao, fmtV: null,
        passos: [4, 8, 20, 40, 80], rotuloX: (i) => 'Ano ' + (i / 4), tituloX: null, rotuloY: '',
        refs: [], marcas: [], series: [], sombra: null, legenda: true,
        titulo: (i) => 'Registro ' + i, tooltip: null, onClick: null, onRange: null
      }, opcoes || {});
      el.classList.add('grafico');
      el.innerHTML = '';
      this.cv = document.createElement('canvas');
      this.cv.setAttribute('role', 'img');
      if (this.o.aria) this.cv.setAttribute('aria-label', this.o.aria);
      el.appendChild(this.cv);
      this.tt = document.createElement('div'); this.tt.className = 'g-tooltip'; el.appendChild(this.tt);
      if (this.o.legenda) { this.leg = document.createElement('div'); this.leg.className = 'g-leg'; el.appendChild(this.leg); }
      this.i0 = 0; this.i1 = null; this.cursorI = null; this.hoverI = null; this.drag = null;
      this._eventos();
      if (typeof ResizeObserver !== 'undefined') { this.ro = new ResizeObserver(() => this.desenhar()); this.ro.observe(el); }
      else window.addEventListener('resize', () => this.desenhar());
      this.desenhar();
    }
    set(o) { Object.assign(this.o, o); if (o.series) this._legenda(); this.desenhar(); return this; }
    n() { let n = 0; this.o.series.forEach(s => { const d = s.dados || s.hi || []; if (d.length > n) n = d.length; }); return n; }
    setCursor(i) { this.cursorI = i; this.desenhar(); }
    setRange(a, b) {
      const n = this.n(); if (!n) return;
      if (a === null || a === undefined) { this.i0 = 0; this.i1 = null; }
      else { this.i0 = Math.max(0, Math.min(a, n - 2)); this.i1 = Math.min(n - 1, Math.max(b, this.i0 + 1)); }
      this.desenhar();
      if (this.o.onRange) this.o.onRange(this.i0, this.i1 === null ? n - 1 : this.i1);
    }
    _legenda() {
      if (!this.leg) return;
      this.leg.innerHTML = this.o.series.filter(s => s.rotulo && !s.semLegenda).map(s => {
        const cor = s.cor || '#888';
        const cls = s.tipo === 'barra' || s.tipo === 'area' || s.tipo === 'faixa' ? 'bar' : (s.tracejado ? 'dash' : '');
        return `<span><i class="${cls}" style="background:${s.tipo === 'faixa' ? alpha(cor, .35) : cor};color:${cor}"></i>${s.rotulo}</span>`;
      }).join('') + this.o.refs.filter(r => r.rotulo).map(r => `<span><i class="dash" style="color:${r.cor}"></i>${r.rotulo}</span>`).join('');
    }
    _geo() {
      const W = this.el.clientWidth || 600, H = this.o.altura;
      const n = this.n();
      const i1 = this.i1 === null ? n - 1 : this.i1;
      const temBarra = this.o.series.some(s => s.tipo === 'barra');
      return { W, H, n, i0: this.i0, i1, x0: this.o.padL, x1: W - this.o.padR, y0: this.o.padT, y1: H - this.o.padB, temBarra };
    }
    _x(g, i) {
      const span = Math.max(1, g.i1 - g.i0);
      if (g.temBarra) { const bw = (g.x1 - g.x0) / (span + 1); return g.x0 + bw / 2 + (i - g.i0) * bw; }
      return g.x0 + (i - g.i0) / span * (g.x1 - g.x0);
    }
    _idx(g, px) {
      const span = Math.max(1, g.i1 - g.i0);
      let i;
      if (g.temBarra) { const bw = (g.x1 - g.x0) / (span + 1); i = Math.floor((px - g.x0) / bw) + g.i0; }
      else i = Math.round((px - g.x0) / (g.x1 - g.x0) * span) + g.i0;
      return Math.max(g.i0, Math.min(g.i1, i));
    }
    _dominio(g) {
      let mn = Infinity, mx = -Infinity;
      const S = this.o.series.filter(s => !s.oculto);
      const acum = this.o.empilhado;
      for (let i = g.i0; i <= g.i1; i++) {
        let pos = 0, neg = 0;
        S.forEach(s => {
          if (s.tipo === 'faixa') { const a = s.lo[i], b = s.hi[i]; if (a != null) { mn = Math.min(mn, a); } if (b != null) { mx = Math.max(mx, b); } return; }
          const v = s.dados[i]; if (v === null || v === undefined || isNaN(v)) return;
          if (acum && (s.tipo === 'area' || s.tipo === 'barra')) { if (v >= 0) pos += v; else neg += v; }
          else { mn = Math.min(mn, v); mx = Math.max(mx, v); }
        });
        if (acum) { mx = Math.max(mx, pos); mn = Math.min(mn, neg); }
      }
      this.o.refs.forEach(r => { if (r.incluir !== false) { mx = Math.max(mx, r.y); mn = Math.min(mn, r.y); } });
      if (!isFinite(mn)) { mn = 0; mx = 1; }
      if (this.o.yMin !== null) mn = this.o.yMin; else if (mn > 0 && !this.o.log) mn = 0;
      if (this.o.yMax !== null) mx = Math.max(this.o.yMax, this.o.yMaxMinimo ? mx : this.o.yMax);
      if (mx === mn) mx = mn + 1;
      if (this.o.yMax === null) mx = mx + (mx - mn) * 0.06;
      return { mn, mx };
    }
    _y(g, d, v) {
      if (this.o.log) {
        const t = (v2) => Math.log10(Math.max(0, v2) + 1);
        return g.y1 - (t(v) - t(Math.max(0, d.mn))) / ((t(d.mx) - t(Math.max(0, d.mn))) || 1) * (g.y1 - g.y0);
      }
      return g.y1 - (v - d.mn) / (d.mx - d.mn) * (g.y1 - g.y0);
    }
    desenhar() {
      const g = this._geo();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cv = this.cv;
      cv.width = Math.round(g.W * dpr); cv.height = Math.round(g.H * dpr);
      cv.style.height = g.H + 'px';
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, g.W, g.H);
      if (!this._legOk) { this._legenda(); this._legOk = true; }
      if (g.n < 2) { c.fillStyle = css('--muted'); c.font = '13px ' + css('--sans'); c.textAlign = 'center'; c.fillText(this.o.vazio || 'Sem dados para exibir', g.W / 2, g.H / 2); return; }
      const d = this._dominio(g); this._d = d; this._g = g;
      const grid = css('--border'), muted = css('--muted');
      c.font = '11px ' + css('--mono');
      // grade Y
      let ticks;
      if (this.o.log) { ticks = [0, 1, 10, 100, 1000, 10000, 100000].filter(t => t >= d.mn && t <= d.mx); }
      else ticks = niceTicks(d.mn, d.mx, Math.max(3, Math.floor((g.y1 - g.y0) / 46)));
      c.strokeStyle = grid; c.lineWidth = 1; c.fillStyle = muted; c.textAlign = 'right'; c.textBaseline = 'middle';
      ticks.forEach(t => { const y = Math.round(this._y(g, d, t)) + .5; c.beginPath(); c.moveTo(g.x0, y); c.lineTo(g.x1, y); c.stroke(); c.fillText(this.o.fmtY(t), g.x0 - 7, y); });
      if (this.o.rotuloY) { c.save(); c.translate(12, (g.y0 + g.y1) / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.fillStyle = muted; c.font = '11px ' + css('--sans'); c.fillText(this.o.rotuloY, 0, 0); c.restore(); }
      // grade X
      const span = g.i1 - g.i0;
      const larg = g.x1 - g.x0;
      let passo = this.o.passos[this.o.passos.length - 1];
      for (const p of this.o.passos) { if (larg / (span / p) >= 62) { passo = p; break; } }
      c.textAlign = 'center'; c.textBaseline = 'top'; c.font = '11px ' + css('--mono');
      for (let i = Math.ceil(g.i0 / passo) * passo; i <= g.i1; i += passo) {
        const x = Math.round(this._x(g, i)) + .5;
        c.strokeStyle = grid; c.globalAlpha = .55; c.beginPath(); c.moveTo(x, g.y0); c.lineTo(x, g.y1); c.stroke(); c.globalAlpha = 1;
        const lab = this.o.rotuloX(i);
        if (lab !== null) {
          const tw = c.measureText(lab).width;
          c.textAlign = x + tw / 2 > g.W - 2 ? 'right' : x - tw / 2 < 2 ? 'left' : 'center';
          c.fillStyle = muted; c.fillText(lab, c.textAlign === 'right' ? g.W - 2 : x, g.y1 + 8);
        }
      }
      // sombreamento entre séries (ex.: população acima da capacidade)
      if (this.o.sombra) {
        const A = this.o.series[this.o.sombra.a], B = this.o.series[this.o.sombra.b];
        if (A && B && !A.oculto && !B.oculto) {
          c.fillStyle = this.o.sombra.cor;
          for (let i = g.i0; i < g.i1; i++) {
            const a0 = A.dados[i], a1 = A.dados[i + 1], b0 = B.dados[i], b1 = B.dados[i + 1];
            if ([a0, a1, b0, b1].some(v => v == null)) continue;
            if (a0 > b0 || a1 > b1) {
              c.beginPath();
              c.moveTo(this._x(g, i), this._y(g, d, Math.max(a0, b0)));
              c.lineTo(this._x(g, i + 1), this._y(g, d, Math.max(a1, b1)));
              c.lineTo(this._x(g, i + 1), this._y(g, d, b1));
              c.lineTo(this._x(g, i), this._y(g, d, b0));
              c.closePath(); c.fill();
            }
          }
        }
      }
      // séries
      const S = this.o.series.filter(s => !s.oculto);
      const barras = S.filter(s => s.tipo === 'barra');
      const base = new Float64Array(g.n), baseN = new Float64Array(g.n);
      // faixas primeiro
      S.filter(s => s.tipo === 'faixa').forEach(s => {
        c.fillStyle = alpha(s.cor, s.opac || .22); c.beginPath();
        let ok = false;
        for (let i = g.i0; i <= g.i1; i++) { const v = s.hi[i]; if (v == null) continue; const x = this._x(g, i), y = this._y(g, d, v); if (!ok) { c.moveTo(x, y); ok = true; } else c.lineTo(x, y); }
        for (let i = g.i1; i >= g.i0; i--) { const v = s.lo[i]; if (v == null) continue; c.lineTo(this._x(g, i), this._y(g, d, v)); }
        c.closePath(); c.fill();
      });
      // áreas (empilhadas ou não)
      const acc = new Float64Array(g.n);
      S.filter(s => s.tipo === 'area').forEach(s => {
        c.fillStyle = alpha(s.cor, s.opac || .55); c.beginPath();
        const top = [];
        for (let i = g.i0; i <= g.i1; i++) { const v = s.dados[i] || 0; const b = this.o.empilhado ? acc[i] : 0; top.push([this._x(g, i), this._y(g, d, b + v)]); }
        top.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
        for (let i = g.i1; i >= g.i0; i--) { const b = this.o.empilhado ? acc[i] : 0; c.lineTo(this._x(g, i), this._y(g, d, b)); }
        c.closePath(); c.fill();
        if (this.o.empilhado) for (let i = g.i0; i <= g.i1; i++) acc[i] += s.dados[i] || 0;
      });
      // barras
      if (barras.length) {
        const bw = (g.x1 - g.x0) / (span + 1);
        const nb = this.o.empilhado ? 1 : barras.length;
        const w = Math.max(1, bw * .78 / nb);
        barras.forEach((s, k) => {
          c.fillStyle = s.cor;
          for (let i = g.i0; i <= g.i1; i++) {
            const v = s.dados[i]; if (v == null || v === 0) continue;
            const cx = this._x(g, i) - bw * .39 + (this.o.empilhado ? 0 : k * w);
            let y0v, y1v;
            if (this.o.empilhado) { if (v >= 0) { y0v = base[i]; base[i] += v; y1v = base[i]; } else { y0v = baseN[i]; baseN[i] += v; y1v = baseN[i]; } }
            else { y0v = 0; y1v = v; }
            const ya = this._y(g, d, y0v), yb = this._y(g, d, y1v);
            const corI = s.corFn ? s.corFn(v, i) : null; if (corI) c.fillStyle = corI; else c.fillStyle = s.cor;
            c.fillRect(cx, Math.min(ya, yb), this.o.empilhado ? bw * .78 : w, Math.max(1, Math.abs(yb - ya)));
          }
        });
      }
      // linhas
      S.filter(s => s.tipo === 'linha' || !s.tipo).forEach(s => {
        const pts = [];
        for (let i = g.i0; i <= g.i1; i++) { const v = s.dados[i]; pts.push(v === null || v === undefined || isNaN(v) ? null : [this._x(g, i), this._y(g, d, v)]); }
        if (s.area) {
          const grad = c.createLinearGradient(0, g.y0, 0, g.y1); grad.addColorStop(0, alpha(s.cor, .32)); grad.addColorStop(1, alpha(s.cor, .02));
          c.fillStyle = grad; c.beginPath(); let st = null, last = null;
          pts.forEach(p => { if (!p) return; if (!st) { c.moveTo(p[0], g.y1); c.lineTo(p[0], p[1]); st = p; } else c.lineTo(p[0], p[1]); last = p; });
          if (last) { c.lineTo(last[0], g.y1); c.closePath(); c.fill(); }
        }
        c.strokeStyle = s.cor; c.lineWidth = s.largura || 2; c.lineJoin = 'round'; c.lineCap = 'round';
        c.setLineDash(s.tracejado ? [5, 4] : []);
        c.beginPath(); let pen = false;
        pts.forEach(p => { if (!p) { pen = false; return; } if (!pen) { c.moveTo(p[0], p[1]); pen = true; } else c.lineTo(p[0], p[1]); });
        c.stroke(); c.setLineDash([]);
        if (s.pontos && span <= 60) { c.fillStyle = s.cor; pts.forEach(p => { if (p) { c.beginPath(); c.arc(p[0], p[1], 2.2, 0, 7); c.fill(); } }); }
      });
      // referências horizontais
      this.o.refs.forEach(r => {
        if (r.y < d.mn || r.y > d.mx) return;
        const y = Math.round(this._y(g, d, r.y)) + .5;
        c.strokeStyle = r.cor; c.lineWidth = 1.3; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(g.x0, y); c.lineTo(g.x1, y); c.stroke(); c.setLineDash([]);
        if (r.texto) { c.fillStyle = r.cor; c.font = '11px ' + css('--sans'); c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText(r.texto, g.x1 - 4, y - 3); }
      });
      // marcadores de eventos
      c.font = '13px ' + css('--sans'); c.textAlign = 'center'; c.textBaseline = 'top';
      this._marcasPx = [];
      this.o.marcas.forEach(m => {
        if (m.i < g.i0 || m.i > g.i1) return;
        const x = Math.round(this._x(g, m.i)) + .5;
        c.strokeStyle = alpha(m.cor || css('--warn'), .55); c.lineWidth = 1; c.setLineDash([2, 3]);
        c.beginPath(); c.moveTo(x, g.y0 + 14); c.lineTo(x, g.y1); c.stroke(); c.setLineDash([]);
        c.fillText(m.icone || '◆', x, g.y0 - 4);
        this._marcasPx.push({ x, m });
      });
      // cursor (momento selecionado)
      if (this.o.cursor && this.cursorI !== null && this.cursorI >= g.i0 && this.cursorI <= g.i1) {
        const x = Math.round(this._x(g, this.cursorI)) + .5;
        c.strokeStyle = css('--sand'); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, g.y0); c.lineTo(x, g.y1); c.stroke();
        S.filter(s => (s.tipo === 'linha' || !s.tipo) && !s.semPonto).forEach(s => {
          const v = s.dados[this.cursorI]; if (v == null) return;
          c.fillStyle = s.cor; c.strokeStyle = css('--bg'); c.lineWidth = 2;
          c.beginPath(); c.arc(x, this._y(g, d, v), 4.5, 0, 7); c.fill(); c.stroke();
        });
      }
      // hover
      if (this.hoverI !== null && this.hoverI !== this.cursorI) {
        const x = Math.round(this._x(g, this.hoverI)) + .5;
        c.strokeStyle = alpha('#ffffff', .25); c.lineWidth = 1; c.beginPath(); c.moveTo(x, g.y0); c.lineTo(x, g.y1); c.stroke();
      }
      // seleção de zoom
      if (this.drag && this.drag.ativo) {
        c.fillStyle = alpha(css('--grass'), .12); c.strokeStyle = alpha(css('--grass'), .6);
        const a = Math.min(this.drag.x0, this.drag.x1), b = Math.max(this.drag.x0, this.drag.x1);
        c.fillRect(a, g.y0, b - a, g.y1 - g.y0); c.strokeRect(a + .5, g.y0 + .5, b - a, g.y1 - g.y0);
      }
    }
    _tooltip(i, px, py) {
      const g = this._g; if (!g) return;
      let html;
      if (this.o.tooltip) html = this.o.tooltip(i);
      else {
        const fmt = this.o.fmtV || this.o.fmtY;
        html = `<div class="tt-t">${this.o.titulo(i)}</div>` + this.o.series.filter(s => !s.oculto && s.rotulo).map(s => {
          if (s.tipo === 'faixa') return `<div class="tt-r"><span><i class="tt-s" style="background:${alpha(s.cor, .5)}"></i>${s.rotulo}</span><b>${fmt(s.lo[i])}–${fmt(s.hi[i])}</b></div>`;
          const v = s.dados[i];
          return `<div class="tt-r"><span><i class="tt-s" style="background:${s.cor}"></i>${s.rotulo}</span><b>${(s.fmt || fmt)(v)}${s.un ? ' ' + s.un : ''}</b></div>`;
        }).join('');
      }
      const mk = (this._marcasPx || []).filter(p => p.m.i === i);
      if (mk.length) html += mk.map(p => `<div style="margin-top:5px;color:${css('--warn')}">${p.m.icone || ''} ${p.m.rotulo}</div>`).join('');
      this.tt.innerHTML = html;
      this.tt.classList.add('vis');
      const tw = this.tt.offsetWidth, th = this.tt.offsetHeight;
      let left = px + 14; if (left + tw > g.W - 4) left = px - tw - 14; if (left < 2) left = 2;
      let top = py - th / 2; top = Math.max(2, Math.min(top, g.H - th - 2));
      this.tt.style.left = left + 'px'; this.tt.style.top = top + 'px';
    }
    _eventos() {
      const pos = (e) => { const r = this.cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [t.clientX - r.left, t.clientY - r.top]; };
      this.cv.addEventListener('mousemove', (e) => {
        const g = this._g; if (!g) return;
        const [x, y] = pos(e);
        if (this.drag) { this.drag.x1 = x; if (Math.abs(this.drag.x1 - this.drag.x0) > 6) this.drag.ativo = true; }
        if (x < g.x0 - 4 || x > g.x1 + 4) { this.hoverI = null; this.tt.classList.remove('vis'); this.desenhar(); return; }
        const i = this._idx(g, x);
        this.hoverI = i; this.desenhar(); this._tooltip(i, x, y);
        this.cv.style.cursor = this.o.onClick ? 'pointer' : 'crosshair';
      });
      this.cv.addEventListener('mouseleave', () => { this.hoverI = null; this.drag = null; this.tt.classList.remove('vis'); this.desenhar(); });
      this.cv.addEventListener('mousedown', (e) => { if (!this.o.zoom || e.button !== 0) return; const [x] = pos(e); this.drag = { x0: x, x1: x, ativo: false }; });
      this.cv.addEventListener('mouseup', (e) => {
        const g = this._g; if (!g) return;
        const [x] = pos(e);
        if (this.drag && this.drag.ativo) {
          const a = this._idx(g, Math.min(this.drag.x0, this.drag.x1)), b = this._idx(g, Math.max(this.drag.x0, this.drag.x1));
          this.drag = null; if (b - a >= 2) this.setRange(a, b); else this.desenhar();
          return;
        }
        this.drag = null;
        if (this.o.onClick && x >= g.x0 - 4 && x <= g.x1 + 4) this.o.onClick(this._idx(g, x));
      });
      this.cv.addEventListener('dblclick', () => { if (this.o.zoom) this.setRange(null); });
      this.cv.addEventListener('touchstart', (e) => {
        const g = this._g; if (!g) return; const [x, y] = pos(e);
        if (x < g.x0 - 4 || x > g.x1 + 4) return;
        const i = this._idx(g, x); this.hoverI = i; this.desenhar(); this._tooltip(i, x, y);
        if (this.o.onClick) this.o.onClick(i);
      }, { passive: true });
    }
  }

  root.Grafico = Grafico;
  root.fmtNum = fmtPadrao;
  root.corAlpha = alpha;
})(window);
