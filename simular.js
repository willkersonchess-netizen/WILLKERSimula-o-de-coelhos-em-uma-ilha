#!/usr/bin/env node
/* =====================================================================
   ILHA 40 — Executor da simulação original + cenários + Monte Carlo
   Uso:  node simular.js            (padrão: 100 repetições base, 40 por cenário)
         node simular.js --rapido   (20 / 10 repetições)
   Gera, na pasta dados/:
     resultados.js        -> carregado pelo index.html (funciona abrindo o arquivo direto)
     resultados.json      -> mesmos dados, para Python/Excel/outras ferramentas
     tabela_sazonal.csv   -> 161 registros (início + 160 estações)
     tabela_anual.csv     -> 40 anos
     cenarios.csv         -> comparação dos cenários
     relatorio.md         -> respostas automáticas às 16 perguntas
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('./js/engine.js');

const rapido = process.argv.includes('--rapido');
const REPS_BASE = rapido ? 20 : 100;
const REPS_CEN = rapido ? 10 : 40;
const SEMENTE = 42;
const SEMENTE_MC = 1000; // números aleatórios comuns: mesmas sementes em todos os cenários
const dir = path.join(__dirname, 'dados');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const t0 = Date.now();
const barra = (rot, i, n) => { if (!process.stdout.isTTY) { if (i === n) console.log(`  ${rot.padEnd(34)} ${n}/${n} ok`); return; } process.stdout.write(`\r  ${rot.padEnd(34)} ${'#'.repeat(Math.round(20 * i / n)).padEnd(20, '.')} ${i}/${n}`); if (i === n) process.stdout.write('\n'); };

console.log('==============================================================');
console.log(' ILHA 40 — O experimento dos dois coelhos (motor v' + E.VERSAO + ')');
console.log('==============================================================');
console.log(' Simulação original (semente ' + SEMENTE + ')...');
const base = E.simular({ semente: SEMENTE });
base.gerado = new Date().toISOString();
const respostas = E.analisar(base);
// Verificação de determinismo
const conf = E.simular({ semente: SEMENTE });
const igual = JSON.stringify(conf.registros) === JSON.stringify(base.registros);
console.log('  Reprodutibilidade (2ª execução idêntica): ' + (igual ? 'OK' : 'FALHOU'));
// Verificação do balanço populacional
let balancoOk = true;
for (let i = 1; i < base.registros.length; i++) {
  const r = base.registros[i], a = base.registros[i - 1];
  if (a.N + r.nasc - r.mortes !== r.N) { balancoOk = false; console.log('  balanço falhou no registro', i); }
}
console.log('  Balanço N(t) = N(t-1) + nascimentos - mortes: ' + (balancoOk ? 'OK' : 'FALHOU'));

console.log(' Monte Carlo do cenário original:');
const mcBase = E.monteCarlo({}, REPS_BASE, SEMENTE_MC, (i, n) => barra('repetições', i, n));

console.log(' Cenários alternativos:');
const cenarios = [];
for (const c of E.CENARIOS.concat(E.FUNDADORES_ALT)) {
  const rep = E.simular(Object.assign({}, c.p, { semente: SEMENTE }));
  const mc = E.monteCarlo(c.p, REPS_CEN, SEMENTE_MC, (i, n) => barra(c.nome, i, n));
  delete mc.runs;
  cenarios.push({ id: c.id, nome: c.nome, curto: c.curto || c.nome, p: c.p, fundadores: !!c.p.fundadores, serie: E.compactar(rep), mc });
}

const dados = {
  base, respostas, mcBase, cenarios,
  meta: { repsBase: REPS_BASE, repsCenario: REPS_CEN, sementeMC: SEMENTE_MC, segundos: Math.round((Date.now() - t0) / 1000), reprodutivel: igual, balanco: balancoOk }
};

fs.writeFileSync(path.join(dir, 'resultados.json'), JSON.stringify(dados));
fs.writeFileSync(path.join(dir, 'resultados.js'), '/* Gerado por simular.js — não edite à mão */\nwindow.ILHA_DADOS = ' + JSON.stringify(dados) + ';\n');
fs.writeFileSync(path.join(dir, 'tabela_sazonal.csv'), '﻿' + E.csvSazonal(base));
fs.writeFileSync(path.join(dir, 'tabela_anual.csv'), '﻿' + E.csvAnual(base));
const linCen = ['cenario;prob_extincao;prob_arvore_morre;N_max_mediana;N_final_mediana;N_final_p5;N_final_p95;colapsos_medios;crises_medias;vigor_grama_final;arbustos_final_rel;F_final;saude_final'];
cenarios.forEach(c => { const m = c.mc; linCen.push([c.nome, m.pExtincao, m.pArvoreMorre, m.NmaxMed, m.NfinalMed, m.NfinalP5, m.NfinalP95, m.colapsosMed, m.crisesMed, m.RfinalMed, m.HsFinalMed, m.FfinalMed, m.saudeMed].map(v => String(v).replace('.', ',')).join(';')); });
fs.writeFileSync(path.join(dir, 'cenarios.csv'), '﻿' + linCen.join('\n'));

const S = base.resumo;
let md = `# Ilha 40 — Relatório automático\n\nGerado em ${base.gerado} · motor v${E.VERSAO} · semente ${SEMENTE}\n\n`;
md += `## Resumo da execução original\n\n| Indicador | Valor |\n|---|---|\n`;
md += `| População inicial | ${S.Nini} |\n| População máxima | ${S.Nmax} (registro ${S.iMax}) |\n| População final | ${S.Nfinal} |\n| Nascimentos | ${S.nasc} |\n| Mortes | ${S.mortes} |\n| Crises alimentares | ${S.crises} |\n| Colapsos (>50% em uma estação) | ${S.colapsos} |\n| Saúde final do ecossistema | ${S.final.saude}/100 |\n\n`;
md += `## Monte Carlo (${REPS_BASE} repetições)\n\n- Probabilidade de extinção em 40 anos: **${Math.round(mcBase.pExtincao * 100)}%**\n- População final (mediana / P5–P95): ${mcBase.NfinalMed} / ${mcBase.NfinalP5}–${mcBase.NfinalP95}\n- Colapsos médios: ${mcBase.colapsosMed}\n\n`;
md += `## As 16 perguntas\n\n`;
respostas.forEach((r, i) => { md += `**${i + 1}. ${r.q}**\n\n${r.a}\n\n`; });
md += `## Cenários (${REPS_CEN} repetições cada)\n\n| Cenário | P(extinção) | N final (mediana) | Colapsos | Vigor da grama | Arbustos |\n|---|---|---|---|---|---|\n`;
cenarios.forEach(c => { md += `| ${c.nome} | ${Math.round(c.mc.pExtincao * 100)}% | ${c.mc.NfinalMed} | ${c.mc.colapsosMed} | ${Math.round(c.mc.RfinalMed * 100)}% | ${Math.round(c.mc.HsFinalMed * 100)}% |\n`; });
fs.writeFileSync(path.join(dir, 'relatorio.md'), md);

console.log('--------------------------------------------------------------');
console.log(` População: 2 -> máx ${S.Nmax} -> final ${S.Nfinal}   | extinção (MC): ${Math.round(mcBase.pExtincao * 100)}%`);
console.log(` Arquivos gravados em dados/  (${Math.round((Date.now() - t0) / 1000)} s)`);
console.log('==============================================================');
