#!/usr/bin/env node
/* =====================================================================
   ILHA 40 — Executor: simulação original + cenários + Monte Carlo,
   para duas durações (40 e 100 anos).
   Uso:  node simular.js            completo (alguns minutos)
         node simular.js --rapido   menos repetições (teste)
         node simular.js --so40     só a duração de 40 anos
   Gera em dados/:
     resultados.js / .json         40 anos (carregado pelo site)
     resultados100.js / .json      100 anos (carregado quando o visitante escolhe 100 anos)
     tabela_sazonal[_100].csv, tabela_anual[_100].csv, cenarios[_100].csv, relatorio[_100].md
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('./js/engine.js');

const rapido = process.argv.includes('--rapido');
const so40 = process.argv.includes('--so40');
const SEMENTE = 42, SEMENTE_MC = 1000;
const dir = path.join(__dirname, 'dados');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
const T0 = Date.now();

function barra(rot, i, n) {
  if (!process.stdout.isTTY) { if (i === n) console.log(`  ${rot.padEnd(40)} ${n}/${n} ok`); return; }
  process.stdout.write(`\r  ${rot.padEnd(40)} ${'#'.repeat(Math.round(20 * i / n)).padEnd(20, '.')} ${i}/${n}`);
  if (i === n) process.stdout.write('\n');
}

function rodar(anos, repsBase, repsCen, varName, suf) {
  console.log(`\n=== ${anos} ANOS ====================================================`);
  const base = E.simular({ semente: SEMENTE, anos });
  base.gerado = new Date().toISOString();
  const respostas = E.analisar(base);
  const igual = JSON.stringify(E.simular({ semente: SEMENTE, anos }).registros) === JSON.stringify(base.registros);
  let balancoOk = true;
  for (let i = 1; i < base.registros.length; i++) { const r = base.registros[i], a = base.registros[i - 1]; if (a.N + r.nasc - r.mortes !== r.N) balancoOk = false; }
  console.log('  Reprodutibilidade: ' + (igual ? 'OK' : 'FALHOU') + ' | Balanço populacional: ' + (balancoOk ? 'OK' : 'FALHOU'));
  const mcBase = E.monteCarlo({ anos }, repsBase, SEMENTE_MC, (i, n) => barra('Monte Carlo (original)', i, n));
  const cenarios = [];
  const lista = E.CENARIOS.map(c => Object.assign({ grupo: 'ambiente' }, c))
    .concat(E.CENARIOS_PRED.map(c => Object.assign({ grupo: 'predadores' }, c)))
    .concat(E.FUNDADORES_ALT.map(c => Object.assign({ grupo: 'fundadores' }, c)));
  for (const c of lista) {
    const p = Object.assign({}, c.p, { anos });
    const rep = E.simular(Object.assign({}, p, { semente: SEMENTE }));
    const mc = E.monteCarlo(p, repsCen, SEMENTE_MC, (i, n) => barra(c.nome, i, n));
    delete mc.runs;
    cenarios.push({ id: c.id, nome: c.nome, curto: c.curto || c.nome, grupo: c.grupo, p: c.p, fundadores: c.grupo === 'fundadores', serie: E.compactar(rep), mc });
  }
  const dados = { base, respostas, mcBase, cenarios, meta: { anos, repsBase, repsCenario: repsCen, sementeMC: SEMENTE_MC, reprodutivel: igual, balanco: balancoOk } };
  fs.writeFileSync(path.join(dir, `resultados${suf}.json`), JSON.stringify(dados));
  fs.writeFileSync(path.join(dir, `resultados${suf}.js`), `/* Gerado por simular.js — não edite à mão */\nwindow.${varName} = ` + JSON.stringify(dados) + ';\n');
  fs.writeFileSync(path.join(dir, `tabela_sazonal${suf}.csv`), '﻿' + E.csvSazonal(base));
  fs.writeFileSync(path.join(dir, `tabela_anual${suf}.csv`), '﻿' + E.csvAnual(base));
  const lin = ['cenario;grupo;prob_extincao;N_medio_mediana;N_max_mediana;N_final_mediana;N_final_p5;N_final_p95;colapsos_medios;prob_predador_sobrevive;vigor_grama_final;arbustos_final_rel;F_final;saude_final'];
  cenarios.forEach(c => { const m = c.mc; lin.push([c.nome, c.grupo, m.pExtincao, m.NmedioMed, m.NmaxMed, m.NfinalMed, m.NfinalP5, m.NfinalP95, m.colapsosMed, m.pPredSobrevive === null ? '' : m.pPredSobrevive, m.RfinalMed, m.HsFinalMed, m.FfinalMed, m.saudeMed].map(v => String(v).replace('.', ',')).join(';')); });
  fs.writeFileSync(path.join(dir, `cenarios${suf}.csv`), '﻿' + lin.join('\n'));
  const S = base.resumo;
  let md = `# Ilha — ${anos} anos — relatório automático\n\nGerado em ${base.gerado} · motor v${E.VERSAO} · semente ${SEMENTE}\n\n`;
  md += `População: ${S.Nini} → máx ${S.Nmax} → final ${S.Nfinal} · nascimentos ${S.nasc} · mortes ${S.mortes} · colapsos ${S.colapsos}\n\n`;
  md += `Monte Carlo (${repsBase} rep.): P(extinção) = ${Math.round(mcBase.pExtincao * 100)}% · N final mediano ${mcBase.NfinalMed}\n\n## Perguntas\n\n`;
  respostas.forEach((r, i) => { md += `**${i + 1}. ${r.q}**\n\n${r.a}\n\n`; });
  md += `## Cenários (${repsCen} repetições cada)\n\n| Cenário | P(extinção) | N médio | N final | Colapsos | Predador sobrevive |\n|---|---|---|---|---|---|\n`;
  cenarios.forEach(c => { md += `| ${c.nome} | ${Math.round(c.mc.pExtincao * 100)}% | ${c.mc.NmedioMed} | ${c.mc.NfinalMed} | ${c.mc.colapsosMed} | ${c.mc.pPredSobrevive === null ? '—' : Math.round(c.mc.pPredSobrevive * 100) + '%'} |\n`; });
  fs.writeFileSync(path.join(dir, `relatorio${suf}.md`), md);
  console.log(`  -> população 2 → máx ${S.Nmax} → final ${S.Nfinal} | extinção (MC) ${Math.round(mcBase.pExtincao * 100)}%`);
}

console.log('==============================================================');
console.log(' ILHA — O experimento dos dois coelhos (motor v' + E.VERSAO + ')');
console.log('==============================================================');
rodar(40, rapido ? 20 : 100, rapido ? 8 : 30, 'ILHA_DADOS', '');
if (!so40) rodar(100, rapido ? 10 : 50, rapido ? 6 : 16, 'ILHA_DADOS_100', '100');
console.log(`\n Arquivos gravados em dados/  (${Math.round((Date.now() - T0) / 1000)} s)`);
