#!/usr/bin/env node
/* =====================================================================
   ILHA — Executor: simulação original + cenários + Monte Carlo (100 anos)
   O site recorta esses 100 anos para qualquer duração entre 10 e 100:
   com a mesma semente, os primeiros N anos são idênticos a uma simulação
   de N anos (verificado abaixo).
   Uso:  node simular.js            completo (alguns minutos)
         node simular.js --rapido   menos repetições (teste)
   Gera em dados/: resultados.js/.json, tabela_sazonal.csv, tabela_anual.csv,
                   cenarios.csv, relatorio.md (os três últimos para 50 anos)
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('./js/engine.js');

const rapido = process.argv.includes('--rapido');
const ANOS = 100, ANOS_PADRAO = 50;
const REPS_BASE = rapido ? 12 : 80, REPS_CEN = rapido ? 6 : 25;
const SEMENTE = 42, SEMENTE_MC = 1000;
const dir = path.join(__dirname, 'dados');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
const T0 = Date.now();

function barra(rot, i, n) {
  if (!process.stdout.isTTY) { if (i === n) console.log(`  ${rot.padEnd(40)} ${n}/${n} ok`); return; }
  process.stdout.write(`\r  ${rot.padEnd(40)} ${'#'.repeat(Math.round(20 * i / n)).padEnd(20, '.')} ${i}/${n}`);
  if (i === n) process.stdout.write('\n');
}
function reps(params, n, rot) {
  const out = [];
  for (let k = 0; k < n; k++) { out.push(E.repCompacto(E.simular(Object.assign({}, params, { anos: ANOS, semente: SEMENTE_MC + k })))); barra(rot, k + 1, n); }
  return out;
}

console.log('==============================================================');
console.log(' ILHA — O experimento dos dois coelhos (motor v' + E.VERSAO + ')');
console.log('==============================================================');
const base = E.simular({ semente: SEMENTE, anos: ANOS });
base.gerado = new Date().toISOString();
const igual = JSON.stringify(E.simular({ semente: SEMENTE, anos: ANOS }).registros) === JSON.stringify(base.registros);
const curta = E.simular({ semente: SEMENTE, anos: ANOS_PADRAO });
const recorteOk = JSON.stringify(E.truncar(base, ANOS_PADRAO).registros) === JSON.stringify(curta.registros);
let balancoOk = true;
for (let i = 1; i < base.registros.length; i++) { const r = base.registros[i], a = base.registros[i - 1]; if (a.N + r.nasc + (r.soltos || 0) - r.mortes !== r.N) balancoOk = false; }
console.log(`  Reprodutibilidade: ${igual ? 'OK' : 'FALHOU'} | Balanço: ${balancoOk ? 'OK' : 'FALHOU'} | Recorte 100→${ANOS_PADRAO} anos = simulação de ${ANOS_PADRAO}: ${recorteOk ? 'OK' : 'FALHOU'}`);

const repsBase = reps({}, REPS_BASE, 'Monte Carlo (original)');
const cenarios = [];
const lista = E.CENARIOS.map(c => Object.assign({ grupo: 'ambiente' }, c))
  .concat(E.CENARIOS_PRED.map(c => Object.assign({ grupo: 'predadores' }, c)))
  .concat(E.FUNDADORES_ALT.map(c => Object.assign({ grupo: 'fundadores' }, c)));
for (const c of lista) {
  const rep = E.simular(Object.assign({}, c.p, { anos: ANOS, semente: SEMENTE }));
  const rr = c.id === 'base' ? repsBase.slice(0, REPS_CEN) : reps(c.p, REPS_CEN, c.nome);
  cenarios.push({ id: c.id, nome: c.nome, curto: c.curto || c.nome, grupo: c.grupo, p: c.p, fundadores: c.grupo === 'fundadores', serie: E.compactar(rep), reps: rr });
}
const dados = { base, repsBase, cenarios, meta: { anos: ANOS, anosPadrao: ANOS_PADRAO, repsBase: REPS_BASE, repsCenario: REPS_CEN, sementeMC: SEMENTE_MC, reprodutivel: igual, balanco: balancoOk, recorte: recorteOk } };
fs.writeFileSync(path.join(dir, 'resultados.json'), JSON.stringify(dados));
fs.writeFileSync(path.join(dir, 'resultados.js'), '/* Gerado por simular.js — não edite à mão */\nwindow.ILHA_DADOS = ' + JSON.stringify(dados) + ';\n');
for (const velho of ['resultados100.js', 'resultados100.json', 'tabela_sazonal100.csv', 'tabela_anual100.csv', 'cenarios100.csv', 'relatorio100.md', 'analise100.txt']) { const p = path.join(dir, velho); if (fs.existsSync(p)) fs.unlinkSync(p); }

// Arquivos de leitura humana para a duração padrão (50 anos)
const b50 = E.truncar(base, ANOS_PADRAO);
fs.writeFileSync(path.join(dir, 'tabela_sazonal.csv'), '﻿' + E.csvSazonal(b50));
fs.writeFileSync(path.join(dir, 'tabela_anual.csv'), '﻿' + E.csvAnual(b50));
const mc50 = E.mcDeReps(repsBase, ANOS_PADRAO);
const lin = ['cenario;grupo;prob_extincao;N_medio_mediana;N_max_mediana;N_final_mediana;colapsos_medios;prob_predador_sobrevive;vigor_grama_final;arbustos_final_rel'];
cenarios.forEach(c => { const m = E.mcDeReps(c.reps, ANOS_PADRAO); lin.push([c.nome, c.grupo, m.pExtincao, m.NmedioMed, m.NmaxMed, m.NfinalMed, m.colapsosMed, m.pPredSobrevive === null ? '' : m.pPredSobrevive, m.RfinalMed, m.HsFinalMed].map(v => String(v).replace('.', ',')).join(';')); c.m50 = m; });
fs.writeFileSync(path.join(dir, 'cenarios.csv'), '﻿' + lin.join('\n'));
const S = b50.resumo;
let md = `# Ilha — relatório automático (${ANOS_PADRAO} anos)\n\nGerado em ${base.gerado} · motor v${E.VERSAO} · semente ${SEMENTE}. No site é possível escolher de 10 a 100 anos.\n\n`;
md += `População: ${S.Nini} → máx ${S.Nmax} → final ${S.Nfinal} · nascimentos ${S.nasc} · mortes ${S.mortes} · colapsos ${S.colapsos}\n\n`;
md += `Monte Carlo (${REPS_BASE} rep.): P(extinção em ${ANOS_PADRAO} anos) = ${Math.round(mc50.pExtincao * 100)}% · em 100 anos = ${Math.round(E.mcDeReps(repsBase, 100).pExtincao * 100)}%\n\n## Perguntas\n\n`;
E.analisar(b50).forEach((r, i) => { md += `**${i + 1}. ${r.q}**\n\n${r.a}\n\n`; });
md += `## Cenários (${REPS_CEN} repetições, ${ANOS_PADRAO} anos)\n\n| Cenário | P(extinção) | N médio | Colapsos | Predador sobrevive |\n|---|---|---|---|---|\n`;
cenarios.forEach(c => { const m = c.m50; delete c.m50; md += `| ${c.nome} | ${Math.round(m.pExtincao * 100)}% | ${m.NmedioMed} | ${m.colapsosMed} | ${m.pPredSobrevive === null ? '—' : Math.round(m.pPredSobrevive * 100) + '%'} |\n`; });
fs.writeFileSync(path.join(dir, 'relatorio.md'), md);
console.log(`  -> ${ANOS_PADRAO} anos: população 2 → máx ${S.Nmax} → final ${S.Nfinal} | extinção (MC) ${Math.round(mc50.pExtincao * 100)}%`);
console.log(`\n Arquivos gravados em dados/  (${Math.round((Date.now() - T0) / 1000)} s)`);
