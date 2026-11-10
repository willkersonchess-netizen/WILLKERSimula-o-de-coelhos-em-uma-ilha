/* =====================================================================
   ILHA 40 — Motor da simulação ecológica (v2)
   Modelo baseado em indivíduos (IBM), passo mensal (480 meses),
   acoplado a modelos de vegetação, solo, água e clima.

   Funciona no navegador (window.IlhaEngine) e no Node (require).
   Totalmente determinístico: mesma semente + mesmos parâmetros
   => resultado idêntico, em qualquer ambiente.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.IlhaEngine = factory(); root.IlhaEngineFactory = factory; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSAO = '2.5.0';
  const ESTACOES = ['Primavera', 'Verão', 'Outono', 'Inverno'];

  /* ---------------- Regimes de estações ----------------
     Cada regime define o calendário biológico (12 meses, começando no 1º mês da
     primavera: setembro no hemisfério sul). As estações "predominantes" concentram
     chuva, crescimento e reprodução; as de transição têm efeito intermediário.
       T        temperatura média mensal (°C)
       chuva    chuva média por estação (mm): [primavera, verão, outono, inverno]
       principal estação cuja chuva varia de 70% a 130% (a mais chuvosa)
       grama    crescimento potencial relativo da grama em cada mês (limitado depois pela umidade)
       senesc   taxa mensal de secagem (verde → seca)
       arb      rebrota de folhas/brotos dos arbustos e da árvore
       foto     estímulo sazonal à reprodução dos coelhos
       cresc    meses de estação de crescimento (pastejo pesado danifica mais; raízes rebrotam)
       flor     meses de produção de sementes · germ: meses de germinação · seco: meses da estação seca
       altSaz   presas alternativas dos predadores por estação · rapSaz: presença das aves de rapina
       pSeco    chance de um mês quase sem chuva por estação · eventos: ondas de calor, frio, tempestades */
  const REGIMES = {
    brasil: {
      nome: 'Brasil: verão chuvoso e inverno seco', curto: 'Brasil (verão e inverno)', principal: 1,
      T: [22, 23, 24, 25, 26, 26, 25, 23, 21, 19, 18, 20],
      chuva: [270, 620, 260, 60],
      grama: [0.6, 0.85, 0.95, 1.0, 1.0, 1.0, 0.9, 0.75, 0.55, 0.35, 0.3, 0.4],
      senesc: [0.05, 0.04, 0.04, 0.04, 0.04, 0.05, 0.07, 0.10, 0.15, 0.20, 0.20, 0.12],
      arb: [0.9, 1.0, 1.0, 1.0, 1.0, 0.95, 0.85, 0.7, 0.55, 0.45, 0.45, 0.65],
      foto: [0.85, 0.95, 1.0, 1.0, 1.0, 0.95, 0.85, 0.7, 0.55, 0.4, 0.4, 0.6],
      cresc: [0, 1, 2, 3, 4, 5, 6, 7], flor: [4, 5, 6], germ: [0, 1, 2, 3], seco: [9, 10, 11],
      altSaz: [1.0, 1.15, 1.0, 0.85], rapSaz: [1.0, 0.9, 1.0, 1.1], pSeco: [0.15, 0.03, 0.12, 0.45],
      eventos: { calor: [1, 0.06, 4], frio: [3, 0.03, -5], tempestade: [[1], 0.06] },
      desc: ['Volta das chuvas: a grama rebrota e a reprodução recomeça.', 'Estação predominante: chuva forte, calor, muito crescimento e muitos filhotes.', 'As chuvas diminuem; o crescimento desacelera.', 'Estação predominante: seca. A grama seca por falta de água (não por frio); a fome vem da falta de capim verde.']
    },
    bimodal: {
      nome: 'Primavera e outono chuvosos', curto: 'Primavera e outono', principal: 0,
      T: [17, 19, 21, 24, 26, 25, 22, 19, 17, 14, 13, 15],
      chuva: [240, 80, 230, 110],
      grama: [0.8, 1.0, 0.9, 0.5, 0.3, 0.4, 0.9, 1.0, 0.8, 0.35, 0.3, 0.5],
      senesc: [0.04, 0.04, 0.06, 0.15, 0.20, 0.15, 0.05, 0.05, 0.08, 0.15, 0.15, 0.08],
      arb: [0.9, 1.0, 1.0, 0.7, 0.5, 0.6, 0.9, 1.0, 0.9, 0.5, 0.5, 0.7],
      foto: [0.9, 1.0, 1.0, 0.7, 0.5, 0.6, 0.9, 1.0, 0.9, 0.4, 0.4, 0.6],
      cresc: [0, 1, 2, 6, 7, 8], flor: [1, 2, 7, 8], germ: [0, 1, 6, 7], seco: [3, 4, 5],
      altSaz: [1.0, 0.9, 1.0, 0.8], rapSaz: [1.0, 0.8, 1.0, 1.1], pSeco: [0.06, 0.3, 0.06, 0.1],
      eventos: { calor: [1, 0.07, 5], frio: [3, 0.03, -4], tempestade: [[2], 0.04] },
      desc: ['Estação predominante: chuva e crescimento. Época principal de filhotes.', 'Calor e seca moderada: o capim amarela.', 'Estação predominante: segunda temporada de chuvas e de crescimento.', 'Fresco e úmido, crescimento lento.']
    },
    temperado: {
      nome: 'Quatro estações (clima temperado)', curto: 'Quatro estações', principal: 0,
      T: [14, 17, 20, 23, 25, 24, 20, 16, 13, 10, 9, 11],
      chuva: [210, 90, 150, 130],
      grama: [0.75, 1.0, 0.95, 0.70, 0.45, 0.30, 0.15, 0.20, 0.12, 0.05, 0.06, 0.15],
      senesc: [0.03, 0.04, 0.06, 0.12, 0.18, 0.25, 0.35, 0.35, 0.30, 0.25, 0.20, 0.10],
      arb: [0.9, 1.0, 1.0, 0.8, 0.6, 0.5, 0.4, 0.35, 0.3, 0.2, 0.2, 0.4],
      foto: [0.95, 1.0, 1.0, 0.95, 0.85, 0.65, 0.35, 0.25, 0.2, 0.1, 0.15, 0.5],
      cresc: [0, 1, 2, 3, 4, 5], flor: [2, 3, 4], germ: [0, 1, 2, 6, 7], seco: [3, 4, 5],
      altSaz: [1.0, 1.1, 0.9, 0.75], rapSaz: [0.7, 0.5, 1.0, 1.3], pSeco: [0.06, 0.25, 0.08, 0.06],
      eventos: { calor: [1, 0.08, 5], frio: [3, 0.06, -4], tempestade: [[2, 3], 0.035] },
      desc: ['A grama volta a crescer; brotos e folhas novas. Época principal de reprodução.', 'Crescimento desacelera com o calor; muitos filhotes crescendo.', 'A grama seca; mais dependência de arbustos e capim seco.', 'Frio, pouca grama verde, reprodução baixa.']
    }
  };
  // conjuntos de meses em formato de consulta rápida
  Object.values(REGIMES).forEach(R => ['cresc', 'flor', 'germ', 'seco'].forEach(k => { const s = new Array(12).fill(false); R[k].forEach(m => { s[m] = true; }); R[k + 'B'] = s; }));
  const regimeDe = (P) => REGIMES[P.estacoes] || REGIMES.brasil;

  /* ---------------- Constantes biológicas ---------------- */
  const DIAS_MES = 30.4;
  const NEED_ADULTO_DIA = 0.050;   // kg de matéria seca DIGESTÍVEL / dia (adulto ~1,6 kg)
  const DMCAP_ADULTO_DIA = 0.095;  // limite de ingestão (capacidade do trato digestivo), kg MS/dia
  const NEED_MES = NEED_ADULTO_DIA * DIAS_MES;
  const DMCAP_MES = DMCAP_ADULTO_DIA * DIAS_MES;
  const MULT_IDADE = [0.15, 0.55, 0.75, 0.9]; // necessidade relativa por idade (meses 0..3)
  const DIG = { verde: 0.72, broto: 0.55, arvore: 0.50, seca: 0.40, casca: 0.28, raiz: 0.45 };
  const QSECA = 0.8;      // penalidade de qualidade da grama seca no cálculo de capacidade
  const USO_SUST = 0.45;  // fração do alimento que pode ser usada sem degradar (capacidade)
  const MAXG = 700;       // nº de indivíduos guardados na genealogia detalhada
  const REFUGIO = 0.05;   // fração da vegetação em refúgios quase inacessíveis (hipótese)

  /* ---------------- Parâmetros padrão ---------------- */
  const PADRAO = {
    semente: 42,
    anos: 40,
    area_ha: 100,
    K_referencia: 6000,
    // clima
    chuva_mult: 1.0,
    chuva_vies: 0.0,
    chuva_primavera_mm: 210,
    chuva_verao_mm: 90,
    chuva_outono_mm: 150,
    chuva_inverno_mm: 130,
    chuva_autocorr: 0.45,
    // vegetação
    grama_verde_ini: 250,
    grama_seca_ini: 400,
    grama_mult_ini: 1.0,
    grama_max: 2600,
    grama_regen: 1.0,
    arbusto_estrutura_ini: 900,
    arbusto_mult_ini: 1.0,
    arbusto_regen: 1.0,
    arvore_folhas_max: 300,
    // coelhos
    maturidade_meses: 4,
    fertilidade: 0.85,
    ninhada_media: 5.0,
    reproducao_mult: 1.0,
    mort_adulto_anual: 0.25,
    mort_mult: 1.0,
    agua_livre: 0.25,
    sobrepastejo_sens: 1.0,
    tocas_por_ha: 45,
    // genética
    loci: 48,
    endogamia_B_juv: 1.57,
    endogamia_B_fec: 0.6,
    endogamia_mult: 1.0,
    surtos_doenca: true,
    fundadores: 'par_adulto',
    estacoes: 'brasil',      // regime de estações: 'brasil' | 'bimodal' | 'temperado'
    presas_alt: 1.0,        // disponibilidade de presas alternativas para os predadores (× padrão)
    pred_eficiencia: 1.0,   // taxa de ataque (Holling): maior = caça melhor quando há poucos coelhos
    pred_reproducao: 1.0,   // multiplica probabilidade de reprodução e tamanho da ninhada dos predadores
    pred_mortalidade: 1.0,  // multiplica a mortalidade natural (não a fome) dos predadores
    pred_territorio: 1.0,   // multiplica quantos adultos territoriais cabem por km²
    pares_iniciais: 1,      // casais fundadores de coelhos (a premissa original é 1)
    refugio_tocas: 0.5,     // coelhos por ha protegidos dos predadores junto às tocas
    estresse_densidade: 35, // densidade (coelhos/ha) em que o estresse social reduz a reprodução à metade
    predadores: []          // ex.: [{ tipo: 'gato', ano: 3, n: 4 }]
  };

  const PARAM_META = [
    { k: 'chuva_mult', rotulo: 'Quantidade de chuva', min: 0.5, max: 1.5, passo: 0.05, un: '× média', grupo: 'Clima', desc: 'Multiplica toda a chuva da sequência climática.' },
    { k: 'chuva_vies', rotulo: 'Chuva na estação chuvosa', min: -0.3, max: 0.3, passo: 0.05, un: '', grupo: 'Clima', desc: 'Desloca a média da chuva da estação chuvosa principal, que varia de 70% a 130% de ano para ano.' },
    { k: 'grama_mult_ini', rotulo: 'Biomassa inicial de grama', min: 0.2, max: 2.5, passo: 0.1, un: '× padrão', grupo: 'Vegetação', desc: 'Grama verde e seca no início (padrão 250 + 400 kg MS/ha).' },
    { k: 'arbusto_mult_ini', rotulo: 'Quantidade inicial de arbustos', min: 0.1, max: 3, passo: 0.1, un: '× padrão', grupo: 'Vegetação', desc: 'Biomassa estrutural de arbustos (padrão 900 kg MS/ha).' },
    { k: 'grama_regen', rotulo: 'Regeneração da grama', min: 0.2, max: 2.5, passo: 0.1, un: '× padrão', grupo: 'Vegetação', desc: 'Velocidade de recuperação do vigor das raízes e do banco de sementes.' },
    { k: 'arbusto_regen', rotulo: 'Regeneração dos arbustos', min: 0.2, max: 2.5, passo: 0.1, un: '× padrão', grupo: 'Vegetação', desc: 'Rebrota de folhas, crescimento lenhoso e recrutamento.' },
    { k: 'sobrepastejo_sens', rotulo: 'Intensidade dos danos do sobrepastejo', min: 0.25, max: 3, passo: 0.25, un: '×', grupo: 'Vegetação', desc: 'Quanto o pastejo excessivo danifica raízes, arbustos e árvore.' },
    { k: 'pares_iniciais', rotulo: 'Casais fundadores', min: 1, max: 10, passo: 1, un: 'casais', grupo: 'Coelhos', desc: 'A premissa original é 1 casal. Mais fundadores = mais diversidade genética e menos azar no início.' },
    { k: 'mort_mult', rotulo: 'Mortalidade natural', min: 0.5, max: 2, passo: 0.1, un: '× padrão', grupo: 'Coelhos', desc: 'Multiplica a mortalidade basal (acidentes, parasitas comuns).' },
    { k: 'reproducao_mult', rotulo: 'Taxa de reprodução', min: 0.5, max: 1.5, passo: 0.05, un: '× padrão', grupo: 'Coelhos', desc: 'Multiplica a probabilidade mensal de concepção.' },
    { k: 'agua_livre', rotulo: 'Disponibilidade de água doce', min: 0, max: 1, passo: 0.05, un: '0–1', grupo: 'Coelhos', desc: '0 = sem água livre (só a da forragem e da chuva); 1 = nascente permanente.' },
    { k: 'endogamia_mult', rotulo: 'Efeito da consanguinidade', min: 0, max: 4, passo: 0.25, un: '× padrão', grupo: 'Genética', desc: 'Multiplica os equivalentes letais (padrão 2B = 3,14 na sobrevivência juvenil).' },
    { k: 'presas_alt', rotulo: 'Presas alternativas para predadores', min: 0, max: 1.5, passo: 0.1, un: '× padrão', grupo: 'Predadores', desc: 'Aves, insetos e lagartos que predadores comem além dos coelhos (menos no inverno). 0 = só coelhos.' },
    { k: 'pred_eficiencia', rotulo: 'Eficiência de caça', min: 0.25, max: 3, passo: 0.25, un: '× padrão', grupo: 'Predadores', desc: 'Taxa de ataque da resposta de Holling: predadores mais eficientes continuam caçando quando os coelhos ficam raros.' },
    { k: 'pred_reproducao', rotulo: 'Reprodução dos predadores', min: 0.25, max: 2, passo: 0.25, un: '× padrão', grupo: 'Predadores', desc: 'Multiplica a chance de reproduzir e o tamanho da ninhada.' },
    { k: 'pred_mortalidade', rotulo: 'Mortalidade natural dos predadores', min: 0.25, max: 2.5, passo: 0.25, un: '× padrão', grupo: 'Predadores', desc: 'Acidentes, doenças e velhice (a fome é calculada à parte).' },
    { k: 'pred_territorio', rotulo: 'Território dos predadores', min: 0.25, max: 3, passo: 0.25, un: '× padrão', grupo: 'Predadores', desc: 'Quantos adultos territoriais cabem por km². Os excedentes viram flutuantes, que não se reproduzem e morrem mais.' },
    { k: 'area_ha', rotulo: 'Tamanho da ilha', min: 50, max: 1000, passo: 50, un: 'ha', grupo: 'Ilha', desc: 'A capacidade de referência continua 6.000: ilha maior = terra mais pobre por hectare e mais espaço para predadores.' },
    { k: 'K_referencia', rotulo: 'Capacidade de referência (estação chuvosa média)', min: 1000, max: 15000, passo: 500, un: 'coelhos', grupo: 'Ilha', desc: 'Premissa do experimento. O crescimento potencial da grama é calibrado a partir dela.' }
  ];

  const CENARIOS = [
    { id: 'base', nome: 'Chuva média (original)', curto: 'Original', p: {} },
    { id: 'A', nome: 'A · Estação chuvosa fraca', curto: 'Pouca chuva', p: { chuva_vies: -0.15 } },
    { id: 'B', nome: 'B · Estação chuvosa farta', curto: 'Muita chuva', p: { chuva_vies: 0.15 } },
    { id: 'C', nome: 'C · Poucos arbustos', curto: 'Poucos arbustos', p: { arbusto_mult_ini: 0.4 } },
    { id: 'D', nome: 'D · Muitos arbustos', curto: 'Muitos arbustos', p: { arbusto_mult_ini: 2.0 } },
    { id: 'E', nome: 'E · Recuperação lenta', curto: 'Recup. lenta', p: { grama_regen: 0.4, arbusto_regen: 0.4 } },
    { id: 'F', nome: 'F · Recuperação rápida', curto: 'Recup. rápida', p: { grama_regen: 1.8, arbusto_regen: 1.8 } },
    { id: 'G', nome: 'G · Depressão endogâmica forte', curto: 'Endogamia forte', p: { endogamia_mult: 3.0 } },
    { id: 'H', nome: 'H · Depressão endogâmica fraca', curto: 'Endogamia fraca', p: { endogamia_mult: 0.25 } },
    { id: 'I', nome: 'I · Ilha maior (400 ha)', curto: 'Ilha maior', p: { area_ha: 400 } },
    { id: 'R1', nome: 'Estações: primavera e outono', curto: 'Primavera e outono', p: { estacoes: 'bimodal' } },
    { id: 'R2', nome: 'Estações: quatro estações (temperado)', curto: 'Quatro estações', p: { estacoes: 'temperado' } }
  ];

  const CENARIOS_PRED = [
    { id: 'P1', nome: 'Gatos ferais (4 no ano 3)', curto: 'Gatos', p: { predadores: [{ tipo: 'gato', ano: 3, n: 4 }] } },
    { id: 'P2', nome: 'Raposas (casal no ano 3)', curto: 'Raposas', p: { predadores: [{ tipo: 'raposa', ano: 3, n: 2 }] } },
    { id: 'P3', nome: 'Arminhos (4 no ano 3)', curto: 'Arminhos', p: { predadores: [{ tipo: 'arminho', ano: 3, n: 4 }] } },
    { id: 'P4', nome: 'Aves de rapina (desde o ano 1)', curto: 'Aves de rapina', p: { predadores: [{ tipo: 'rapina', ano: 1, n: 2 }] } },
    { id: 'P5', nome: 'Gatos junto com os coelhos (ano 1)', curto: 'Gatos no ano 1', p: { predadores: [{ tipo: 'gato', ano: 1, n: 2 }] } },
    { id: 'P6', nome: 'Gatos + aves de rapina', curto: 'Gatos + aves', p: { predadores: [{ tipo: 'gato', ano: 3, n: 4 }, { tipo: 'rapina', ano: 1, n: 2 }] } },
    { id: 'P7', nome: 'Gatos numa ilha maior (400 ha)', curto: 'Gatos, ilha maior', p: { area_ha: 400, predadores: [{ tipo: 'gato', ano: 3, n: 4 }] } }
  ];

  const FUNDADORES_ALT = [
    { id: 'dois_machos', nome: 'Dois machos', p: { fundadores: 'dois_machos' } },
    { id: 'dois_filhotes', nome: 'Casal de filhotes (1 mês)', p: { fundadores: 'dois_filhotes' } },
    { id: 'femea_infertil', nome: 'Fêmea infértil', p: { fundadores: 'femea_infertil' } }
  ];

  const CAUSAS = ['fome', 'desidratacao', 'doenca', 'surto', 'idade', 'neonatal', 'endogamia', 'clima', 'basal', 'predacao'];

  /* ---------------- Predadores ----------------
     need   : coelhos-equivalentes adultos comidos por predador por mês, se só comesse coelhos
     h      : densidade de meia-saturação (coelhos vulneráveis/ha) da resposta funcional tipo III (Holling)
     juv    : preferência relativa por coelhos jovens (< 4 meses)
     prot   : quanto a cobertura vegetal (grama alta + arbustos) protege os coelhos desse predador
     alt    : fração da necessidade que presas alternativas (aves marinhas, insetos, lagartos) podem suprir
     altCap : nº de predadores que as presas alternativas da ilha sustentam por inteiro
     repro  : meses de nascimento (0 = 1º mês da primavera); ninhada e sobrevivência dos filhotes
     mort   : mortalidade basal anual; fome: mortalidade mensal extra quando a ingestão cai a 0
     dens   : máximo de adultos por km² (territorialidade); matur: meses até o filhote virar adulto
     max    : (aves de rapina) máximo de indivíduos caçando por km² na melhor época
     monogamo: forma casais (cada fêmea precisa do seu macho)
     migra  : aves de rapina não se reproduzem na ilha; vêm e vão conforme a oferta de presas */
  const PRED_TIPOS = {
    gato: { nome: 'Gato feral', icone: '🐈', need: 9, h: 0.6, juv: 2.5, prot: 0.6, alt: 0.85, altCap: 6, repro: [0, 1, 3, 4], pRepro: 0.65, ninhada: 4, sobrevFilhote: 0.6, mort: 0.2, fome: 0.5, dens: 8, matur: 6, migra: false,
      resumo: 'Caçador solitário e de emboscada. Prefere filhotes e coelhos jovens; também come aves e insetos, por isso pode persistir mesmo quando os coelhos ficam raros.' },
    raposa: { nome: 'Raposa-vermelha', icone: '🦊', need: 14, h: 0.8, juv: 2, prot: 0.45, alt: 0.6, altCap: 2.5, repro: [0], pRepro: 0.8, ninhada: 4.5, sobrevFilhote: 0.6, mort: 0.3, fome: 0.6, dens: 3, matur: 7, monogamo: true, migra: false,
      resumo: 'Predador grande e onívoro: come coelhos, mas também frutas, insetos, aves e carniça. Uma ninhada por ano, na primavera. Forma casais.' },
    arminho: { nome: 'Arminho', icone: '🐾', entraToca: true, need: 2.5, h: 0.5, juv: 4, prot: 0.15, alt: 0.55, altCap: 5, repro: [1], pRepro: 0.9, ninhada: 6, sobrevFilhote: 0.5, mort: 0.5, fome: 0.7, dens: 10, matur: 3, migra: false,
      resumo: 'Pequeno e ágil, entra nas tocas (a vegetação quase não protege os coelhos dele). Mata sobretudo filhotes. Vive pouco e se reproduz muito.' },
    rapina: { nome: 'Aves de rapina', icone: '🦅', need: 6, h: 1.2, juv: 3, prot: 0.75, alt: 0.5, altCap: 0, max: 3, migra: true,
      resumo: 'Gaviões e águias que chegam voando. Não se reproduzem na ilha: o número acompanha a oferta de coelhos. Cobertura vegetal protege bem contra elas.' }
  };

  /* ---------------- Utilidades ---------------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(s, salt) {
    let h = (Math.imul((s | 0) ^ 0x9E3779B9, 2654435761) + Math.imul(salt, 0x85EBCA6B)) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0; h ^= h >>> 16;
    return h >>> 0;
  }
  function normal(rng) {
    let u = 0; while (u === 0) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  }
  function poisson(rng, lam) {
    if (lam <= 0) return 0;
    if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * normal(rng)));
    const L = Math.exp(-lam); let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const r2 = (x) => Math.round(x * 100) / 100;
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const r1 = (x) => Math.round(x * 10) / 10;

  function mesclarParametros(p) {
    const P = Object.assign({}, PADRAO);
    if (p) for (const k in p) if (p[k] !== undefined && p[k] !== null && p[k] !== '') P[k] = p[k];
    for (const k in PADRAO) if (typeof PADRAO[k] === 'number') P[k] = Number(P[k]);
    P.predadores = (Array.isArray(P.predadores) ? P.predadores : [])
      .filter(x => x && PRED_TIPOS[x.tipo] && +x.n > 0)
      .map(x => ({ tipo: x.tipo, ano: Math.max(1, Math.floor(+x.ano || 1)), n: Math.max(1, Math.floor(+x.n)) }));
    P.semente = Math.floor(P.semente);
    P.anos = clamp(Math.floor(P.anos), 1, 100);
    return P;
  }

  /* ---------------- Clima ---------------- */
  // Multiplicador da chuva de primavera: processo AR(1) (permite secas e anos
  // chuvosos consecutivos), limitado a 70–130% da média, como na premissa.
  function gerarClima(P, rng) {
    const meses = [], anual = [];
    const rho = clamp(P.chuva_autocorr, 0, 0.95);
    let z = normal(rng) * 0.5;
    const RG = regimeDe(P), ev = RG.eventos;
    const bases = RG.chuva;
    for (let y = 0; y < P.anos; y++) {
      z = rho * z + Math.sqrt(1 - rho * rho) * normal(rng);
      // a estação chuvosa principal varia de 70% a 130% (AR(1)); as demais acompanham em parte e têm ruído próprio
      const mult = [0, 1, 2, 3].map(s => s === RG.principal ? clamp(1 + P.chuva_vies + 0.17 * z, 0.70, 1.30) : clamp(1 + 0.22 * (0.5 * z + 0.85 * normal(rng)), 0.45, 1.7));
      const anomT = 0.6 * (-0.6 * z + 0.8 * normal(rng));   // primavera seca ⇒ ano mais quente (mais evaporação)
      for (let s = 0; s < 4; s++) {
        const total = bases[s] * mult[s] * P.chuva_mult;
        const pSeco = RG.pSeco[s];
        const w = [0, 1, 2].map(() => { let v = rng() + 0.35; if (rng() < pSeco) v *= 0.08; return v; });
        const sw = w[0] + w[1] + w[2];
        for (let k = 0; k < 3; k++) {
          const mo = s * 3 + k;
          let chuva = total * w[k] / sw;
          let intens = 0.2 + 0.6 * rng();
          let T = RG.T[mo] + anomT + 0.8 * normal(rng);
          let evento = null;
          if (s === ev.calor[0] && rng() < ev.calor[1]) { T += ev.calor[2]; evento = 'onda_calor'; }
          if (s === ev.frio[0] && rng() < ev.frio[1]) { T += ev.frio[2]; evento = 'frio_extremo'; }
          if (ev.tempestade[0].indexOf(s) >= 0 && rng() < ev.tempestade[1]) { chuva += (70 + 60 * rng()) * P.chuva_mult; intens = 0.9; evento = 'tempestade'; }
          if (w[k] / sw < 0.05 && total > 20) evento = evento || 'mes_seco';
          meses.push({ chuva, intens, T, evento });
        }
      }
      anual.push({ multPrim: mult[RG.principal], mult, anomT });
    }
    return { meses, anual };
  }

  /* ---------------- Estado do ecossistema ---------------- */
  function estadoInicial(P, cal) {
    const gm = P.grama_mult_ini, am = P.arbusto_mult_ini;
    const ini = cal && cal.ini;
    const Hs = (ini ? ini.Hs : P.arbusto_estrutura_ini) * am;
    return {
      Gg: (ini ? ini.Gg : P.grama_verde_ini) * gm, Gd: (ini ? ini.Gd : P.grama_seca_ini) * gm, // kg MS/ha
      R: 1.0, S: 0.6, Z: 0,                                     // vigor das raízes, banco de sementes, estresse de pastejo
      Hs, Hb: (ini ? ini.Hb : 0.08 * Hs) * am, Hdead: 0, Hs0: ini ? ini.Hs : P.arbusto_estrutura_ini, // arbustos (kg MS/ha)
      Lc: ini ? ini.Lc : P.arvore_folhas_max * 0.85, Lg: ini ? ini.Lg : 4, Bk: 1.0, V: ini ? ini.V : 1.0, arvViva: true, mesesMorta: 0, // árvore (kg)
      OM: 1.0, C: 0.05, prof: 30, erosaoAcum: 0, SW: ini ? ini.SW : 60, // solo
      W: 1, umid: 0.6, WHC: 110,
      surto: 0, surtoInt: 0,
      cal
    };
  }

  function cobertura(E) {
    return 1 - Math.exp(-(E.Gg + 0.7 * E.Gd + 1.5 * E.Hb + 0.25 * E.Hs + (E.arvViva ? 30 : 0)) / 350);
  }
  function capacidadeTocas(P, E) { return P.tocas_por_ha * P.area_ha * clamp(E.prof / 20, 0, 1); }

  function estoqueDigestivel(E, A) {
    return (Math.max(0, E.Gg - 15) * DIG.verde + Math.max(0, E.Gd - 30) * DIG.seca * QSECA + E.Hb * DIG.broto) * A
      + (E.Lg + (E.arvViva ? 0.06 * E.Lc : 0)) * DIG.arvore;
  }
  function capacidade(stockDig, prodVerdeKg, prodBrotoKg, meses) {
    const comida = USO_SUST * (stockDig + prodVerdeKg * DIG.verde + prodBrotoKg * DIG.broto);
    return comida / (NEED_MES * meses);
  }

  /* ---------------- Passo de vegetação + água ---------------- */
  function passoVegetacao(E, P, cm, mo, Gpot) {
    const A = P.area_ha;
    // Balanço hídrico do solo (modelo de balde, tipo Thornthwaite–Mather)
    const WHC = 110 * (0.7 + 0.3 * E.OM) * (1 - 0.3 * E.C) * clamp(E.prof / 12, 0.2, 1);
    if (E.SW > WHC) E.SW = WHC;
    const cov = cobertura(E);
    const runoffFrac = clamp(0.04 + 0.4 * cm.intens * (1 - cov) + 0.3 * E.C, 0, 0.75);
    E.SW += cm.chuva * (1 - runoffFrac);
    const PET = Math.max(10, 5 * cm.T + 5);
    const AET = Math.min(E.SW, PET * Math.min(1, E.SW / (0.6 * WHC)));
    E.SW -= AET;
    if (E.SW > WHC) E.SW = WHC;
    const W = AET / PET;
    E.W = W; E.WHC = WHC; E.umid = E.SW / WHC; E.runoff = runoffFrac;

    const RG = regimeDe(P);
    const T = cm.T;
    const fT = T < 4 ? 0.05 : T < 12 ? 0.05 + 0.95 * (T - 4) / 8 : T <= 26 ? 1 : Math.max(0.2, 1 - (T - 26) / 10);

    // Grama: crescimento depende de chuva (via umidade), temperatura, fertilidade,
    // vigor das raízes, área foliar remanescente e saturação logística.
    const folha = (E.Gg + 60) / (E.Gg + 100);
    const fert = 0.6 + 0.4 * E.OM;
    const g = Gpot * RG.grama[mo] * fT * W * fert * E.R * folha * Math.max(0, 1 - E.Gg / P.grama_max);
    E.Gg += g;
    const sen = clamp(RG.senesc[mo] + 0.25 * (1 - W) * RG.grama[mo], 0, 0.8);   // seca por falta de água quando deveria crescer
    const tr = E.Gg * sen; E.Gg -= tr; E.Gd += tr;
    const dec = E.Gd * clamp(0.025 + 0.06 * W, 0, 0.2); E.Gd -= dec;

    // Arbustos: folhas/brotos acessíveis (Hb) e estrutura lenhosa (Hs)
    const capB = 0.10 * E.Hs;
    const gb = 0.06 * P.arbusto_regen * E.Hs * RG.arb[mo] * (0.3 + 0.7 * W) * Math.max(0, 1 - E.Hb / Math.max(1e-6, capB));
    E.Hb += gb;
    const quedaB = E.Hb * 0.015; E.Hb -= quedaB;
    const gs = 0.008 * P.arbusto_regen * E.Hs * W * RG.arb[mo] * Math.max(0, 1 - E.Hs / 1800) * Math.max(0.25, Math.sqrt(clamp(E.Hb / Math.max(1e-6, capB), 0, 1)));
    E.Hs += gs;
    let mortSeca = 0;
    if (RG.secoB[mo] && W < 0.3) { mortSeca = E.Hs * 0.005; E.Hs -= mortSeca; E.Hdead += mortSeca; }
    const decMad = E.Hdead * 0.02; E.Hdead -= decMad;

    // Árvore (oliveira-brava hipotética, Olea europaea, perene)
    let quedaF = 0, crescF = 0;
    if (E.arvViva) {
      crescF = 0.04 * E.V * P.arvore_folhas_max * RG.arb[mo] * (0.4 + 0.6 * W) * Math.max(0, 1 - E.Lc / P.arvore_folhas_max);
      E.Lc += crescF;
      quedaF = E.Lc * (0.015 + (RG.secoB[mo] ? 0.02 * (1 - W) : 0));
      E.Lc -= quedaF; E.Lg += quedaF;
      if (RG.secoB[mo] && W < 0.35) E.V -= 0.01 * (0.35 - W) / 0.35;
      if (E.Bk < 0.6) E.V -= 0.04 * (0.6 - E.Bk) / 0.6;
      else if (W > 0.4) E.V += 0.01 * (1 - E.V);
      if (RG.crescB[mo] && E.Bk > 0.3) E.Bk += 0.004 * E.V * (1 - E.Bk);
      E.V = clamp(E.V, 0, 1);
      if (E.V <= 0.05) { E.arvViva = false; E.V = 0; E.mesesMorta = 0; }
    } else {
      E.mesesMorta++;
      quedaF = E.Lc * 0.15; E.Lc -= quedaF; E.Lg += quedaF;
    }
    const decLg = E.Lg * 0.08; E.Lg -= decLg;

    return { g, dec, W, gb, gs, mortSeca, decMad, decLg, quedaB, T, crescF };
  }

  /* ---------------- Alimentação (balanço de massa) ---------------- */
  function alimentar(E, P, need, dmCap) {
    const A = P.area_ha;
    const out = { dig: 0, dm: 0, verde: 0, broto: 0, arvore: 0, seca: 0, casca: 0, raiz: 0, dmPor: {} };
    if (need <= 0) return out;
    let rest = need, dmRest = dmCap;
    // Heterogeneidade espacial: poucos coelhos escolhem as melhores manchas
    // (refúgios); com muitos coelhos, a biomassa efetiva tende à média.
    const dens = (dmCap / DMCAP_MES) / A;
    const mancha = 1 + 6 / (1 + dens / 2);
    const fontes = [
      ['verde', Math.max(0, E.Gg * (1 - REFUGIO) - 15) * A, 110],
      ['broto', E.Hb * A, 35],
      ['arvore', E.Lg + (E.arvViva ? 0.06 * E.Lc : 0), 0],
      ['seca', Math.max(0, E.Gd - 30) * A, 150],
      ['casca', 0.03 * E.Hs * A, 10],
      ['raiz', E.R * 60 * A, 20]
    ];
    for (let f = 0; f < fontes.length; f++) {
      const k = fontes[f][0], disp = fontes[f][1], h = fontes[f][2];
      if (disp <= 0 || rest <= 1e-9 || dmRest <= 1e-9) { out.dmPor[k] = 0; continue; }
      if ((k === 'casca' || k === 'raiz') && out.dig / need > 0.8) { out.dmPor[k] = 0; continue; }
      const d = DIG[k];
      const porHa = disp / A * mancha;
      const FR = h > 0 ? porHa / (porHa + h) : 1;       // resposta funcional tipo II
      const take = Math.min(0.9 * disp * d, rest * FR, dmRest * d);
      const dm = take / d;
      out[k] = take; out.dmPor[k] = dm;
      out.dig += take; out.dm += dm; rest -= take; dmRest -= dm;
    }
    // Remove o que foi efetivamente comido (sem recontagem)
    E.Gg -= out.dmPor.verde / A;
    E.Hb -= out.dmPor.broto / A;
    let arv = out.dmPor.arvore;
    const doChao = Math.min(E.Lg, arv); E.Lg -= doChao; arv -= doChao;
    if (arv > 0) E.Lc = Math.max(0, E.Lc - arv);
    E.Gd -= out.dmPor.seca / A;
    if (out.dmPor.casca > 0) {
      const morto = Math.min(E.Hs * 0.5, (out.dmPor.casca / A) * 8 * P.sobrepastejo_sens);
      E.Hs -= morto; E.Hdead += morto; out.arbMortoCasca = morto;
    }
    if (out.dmPor.raiz > 0) E.R = Math.max(0, E.R - 0.5 * (out.dmPor.raiz / (60 * A)) * P.sobrepastejo_sens);
    return out;
  }

  /* ---------------- Calibração (premissa de 6000 coelhos) ---------------- */
  const _cacheCal = {};
  function calibrar(P) {
    const chave = [P.estacoes, P.area_ha, P.K_referencia, P.grama_max, P.arbusto_regen, P.arbusto_estrutura_ini].join('|');
    if (_cacheCal[chave]) return _cacheCal[chave];
    // A calibração usa a ilha PADRÃO (vegetação inicial padrão, chuva média),
    // assim cenários com menos arbustos ou mais grama mudam a capacidade real.
    const Pc = Object.assign({}, P, { grama_mult_ini: 1, arbusto_mult_ini: 1, grama_regen: 1, chuva_mult: 1 });
    const RGc = regimeDe(Pc), bases = RGc.chuva;
    const climaMedio = (mo) => ({ chuva: bases[Math.floor(mo / 3)] / 3, intens: 0.45, T: RGc.T[mo] });
    // "Spin-up": a ilha sem coelhos roda 8 anos de clima médio até um ciclo
    // anual estável; esse estado (início da primavera) é a condição inicial.
    const spinUp = (Gpot) => {
      const E = estadoInicial(Pc, null);
      let soma = 0, n = 0;
      for (let y = 0; y < 8; y++) for (let mo = 0; mo < 12; mo++) {
        const v = passoVegetacao(E, Pc, climaMedio(mo), mo, Gpot);
        if (y === 7) { soma += v.dec + v.quedaB + v.decMad + v.decLg / Pc.area_ha; n++; }
      }
      return { E, aporte: soma / n };
    };
    const Kprim = (Gpot) => {
      const E = spinUp(Gpot).E;
      let pv = 0, pb = 0;
      // a premissa vale para a estação chuvosa principal do regime (média)
      const m0 = RGc.principal * 3;
      for (let mo = 0; mo < m0; mo++) passoVegetacao(E, Pc, climaMedio(mo), mo, Gpot);
      const stockP = estoqueDigestivel(E, Pc.area_ha);
      for (let mo = m0; mo < m0 + 3; mo++) { const v = passoVegetacao(E, Pc, climaMedio(mo), mo, Gpot); pv += v.g * Pc.area_ha; pb += v.gb * Pc.area_ha; }
      return capacidade(stockP, pv, pb, 3);
    };
    let g0 = 50, g1 = 400, k0 = Kprim(g0), k1 = Kprim(g1);
    for (let it = 0; it < 30; it++) {
      if (Math.abs(k1 - P.K_referencia) < 1) break;
      const g2 = Math.max(1, g1 + (P.K_referencia - k1) * (g1 - g0) / ((k1 - k0) || 1e-9));
      g0 = g1; k0 = k1; g1 = g2; k1 = Kprim(g1);
    }
    const Gpot = g1;
    const su = spinUp(Gpot);
    const e = su.E;
    const ini = { Gg: e.Gg, Gd: e.Gd, Hs: e.Hs, Hb: e.Hb, Lc: e.Lc, Lg: e.Lg, SW: e.SW, V: e.V };
    const res = { Gpot, K0: Kprim(Gpot), aporteRef: su.aporte, ini };
    _cacheCal[chave] = res;
    return res;
  }

  /* ---------------- População (struct of arrays) ---------------- */
  function novaPop(L) { return { n: 0, cap: 0, L }; }
  function garantir(pop, need) {
    if (need <= pop.cap) return;
    let cap = Math.max(512, pop.cap * 2); while (cap < need) cap *= 2;
    const L2 = pop.L * 2;
    const g = (C, old, m) => { const a = new C(cap * m); if (old) a.set(old.subarray(0, pop.n * m)); return a; };
    pop.id = g(Int32Array, pop.id, 1); pop.idade = g(Int16Array, pop.idade, 1);
    pop.sexo = g(Uint8Array, pop.sexo, 1); pop.cond = g(Float32Array, pop.cond, 1);
    pop.F = g(Float32Array, pop.F, 1); pop.ger = g(Uint16Array, pop.ger, 1);
    pop.mae = g(Int32Array, pop.mae, 1); pop.pai = g(Int32Array, pop.pai, 1);
    pop.fertil = g(Uint8Array, pop.fertil, 1); pop.lact = g(Uint8Array, pop.lact, 1);
    pop.alelos = g(Uint8Array, pop.alelos, L2);
    pop.cap = cap;
  }
  function copiar(pop, i, w) {
    pop.id[w] = pop.id[i]; pop.idade[w] = pop.idade[i]; pop.sexo[w] = pop.sexo[i]; pop.cond[w] = pop.cond[i];
    pop.F[w] = pop.F[i]; pop.ger[w] = pop.ger[i]; pop.mae[w] = pop.mae[i]; pop.pai[w] = pop.pai[i];
    pop.fertil[w] = pop.fertil[i]; pop.lact[w] = pop.lact[i];
    const L2 = pop.L * 2; pop.alelos.copyWithin(w * L2, i * L2, (i + 1) * L2);
  }

  function estatPop(pop, P) {
    const n = pop.n, L = P.loci, mat = P.maturidade_meses;
    const pir = { M: [0, 0, 0, 0, 0, 0], F: [0, 0, 0, 0, 0, 0] };
    let machos = 0, femeas = 0, femRep = 0, machRep = 0, filhotes = 0, somaIdade = 0, somaF = 0, somaGer = 0, gerMax = 0;
    const NA = P._nAlelos || 4;   // alelos fundadores distintos por locus (2 por fundador)
    const cnt = new Uint32Array(L * NA);
    for (let i = 0; i < n; i++) {
      const a = pop.idade[i], sx = pop.sexo[i];
      const c = a < 4 ? 0 : a < 12 ? 1 : a < 24 ? 2 : a < 36 ? 3 : a < 48 ? 4 : 5;
      if (sx === 1) { machos++; pir.M[c]++; if (a >= mat && pop.fertil[i]) machRep++; }
      else { femeas++; pir.F[c]++; if (a >= mat && pop.fertil[i]) femRep++; }
      if (a < mat) filhotes++;
      somaIdade += a; somaF += pop.F[i]; somaGer += pop.ger[i]; if (pop.ger[i] > gerMax) gerMax = pop.ger[i];
      const b = i * L * 2;
      for (let l = 0; l < L; l++) { cnt[l * NA + pop.alelos[b + 2 * l]]++; cnt[l * NA + pop.alelos[b + 2 * l + 1]]++; }
    }
    let He = null, alelos = null;
    if (n > 0) {
      let hs = 0, as = 0;
      for (let l = 0; l < L; l++) {
        let s2 = 0, pres = 0;
        for (let a = 0; a < NA; a++) { const p = cnt[l * NA + a] / (2 * n); s2 += p * p; if (cnt[l * NA + a] > 0) pres++; }
        hs += 1 - s2; as += pres;
      }
      He = (hs / L) / (1 - 1 / NA); alelos = as / L;
    }
    const Ne = machRep > 0 && femRep > 0 ? 4 * machRep * femRep / (machRep + femRep) : 0;
    return {
      N: n, machos, femeas, femRep, machRep, filhotes, adultos: n - filhotes,
      idadeMedia: n ? somaIdade / n : null, F: n ? somaF / n : null, gerMedia: n ? somaGer / n : null, gerMax,
      He, alelos, Ne, pir
    };
  }

  // adultos territoriais que cabem na ilha (mínimo de um casal)
  function capTerritorio(T, P) { return Math.max(2, Math.round(T.dens * P.area_ha / 100 * P.pred_territorio)); }

  /* ---------------- SIMULAÇÃO PRINCIPAL ---------------- */
  function simular(entrada, opcoes) {
    opcoes = opcoes || {};
    const P = mesclarParametros(entrada);
    const A = P.area_ha, L = P.loci, L2 = L * 2, meses = P.anos * 12;
    const rngC = mulberry32(hashSeed(P.semente, 11));   // clima (independente da biologia)
    const rng = mulberry32(hashSeed(P.semente, 29));    // demografia
    const clima = gerarClima(P, rngC);
    const cal = calibrar(P);
    const E = estadoInicial(P, cal);
    // predadores configurados (chegam no ano indicado)
    E.pred = {};
    P.predadores.forEach(x => { if (!E.pred[x.tipo]) E.pred[x.tipo] = { n: 0, f: 0, flut: 0, flutF: 0, jov: [], c: 1, I: 1, chegou: false, extinto: false }; });
    const chegadas = P.predadores.map(x => ({ tipo: x.tipo, mes: (x.ano - 1) * 12, n: x.n }));
    const pop = novaPop(L);
    const genealogia = [];
    let proxId = 0;

    function adicionar(sexo, idade, ger, mae, pai, F, fertil, cond, mes) {
      garantir(pop, pop.n + 1);
      const j = pop.n;
      pop.id[j] = proxId; pop.idade[j] = idade; pop.sexo[j] = sexo; pop.cond[j] = cond;
      pop.F[j] = F; pop.ger[j] = ger; pop.mae[j] = mae; pop.pai[j] = pai; pop.fertil[j] = fertil; pop.lact[j] = 0;
      if (proxId < MAXG) genealogia.push({ id: proxId, mae, pai, sexo: sexo ? 'M' : 'F', nasc: mes, morte: null, ger, F: r3(F) });
      proxId++; pop.n++;
      return j;
    }

    // Fundadores: alelos neutros distintos (0,1) e (2,3) em cada locus =>
    // homozigose em um locus significa identidade por descendência (IBD).
    const fund = P.fundadores;
    const pares = fund === 'par_adulto' ? clamp(Math.round(P.pares_iniciais), 1, 20) : 1;
    const sexos = [];
    for (let k = 0; k < pares; k++) sexos.push(...(fund === 'dois_machos' ? [1, 1] : [1, 0]));
    P._nAlelos = 2 * sexos.length;
    const idadeF = fund === 'dois_filhotes' ? 1 : 12;
    for (let f = 0; f < sexos.length; f++) {
      const j = adicionar(sexos[f], idadeF, 0, -1, -1, 0, (fund === 'femea_infertil' && sexos[f] === 0) ? 0 : 1, 1.0, -1);
      for (let l = 0; l < L; l++) { pop.alelos[j * L2 + 2 * l] = 2 * f; pop.alelos[j * L2 + 2 * l + 1] = 2 * f + 1; }
    }

    const registros = [];
    const mensal = { N: [], I: [], chuva: [], T: [], W: [], nasc: [], mortes: [] };
    let acc = null;
    let neHarm = 0, neCnt = 0;
    let surtosTotal = 0;

    function novaAcc() {
      return {
        Nini: pop.n, nasc: 0, mortes: 0, mc: Object.fromEntries(CAUSAS.map(c => [c, 0])),
        ninhadas: 0, reabs: 0, nascVivosNinho: 0, sumFnasc: 0, nNasc: 0,
        prodVerde: 0, prodBroto: 0, consVerde: 0, consSeca: 0, consBroto: 0, consArv: 0, consCasca: 0, consRaiz: 0,
        decomp: 0, arbCresc: 0, arbMort: 0, erosao: 0, chuva: 0, somaT: 0, somaI: 0, nI: 0, somaUmid: 0,
        digTot: 0, eventos: [], stock0: estoqueDigestivel(E, A), R0: E.R, surtoMeses: 0, predNasc: 0, predMortes: 0,
        dietaDig: { verde: 0, broto: 0, arvore: 0, seca: 0, casca: 0, raiz: 0 }
      };
    }

    function saudeEco(Kref) {
      const totG0 = (P.grama_verde_ini + P.grama_seca_ini);
      const grassScore = 0.6 * E.R + 0.4 * clamp((E.Gg + E.Gd) / totG0, 0, 1);
      const shrubScore = clamp(E.Hs / E.Hs0, 0, 1) * (0.6 + 0.4 * clamp(E.Hb / Math.max(1, 0.1 * E.Hs), 0, 1));
      const treeScore = saudeArvore();
      const soilScore = saudeSolo();
      const bal = Kref > 0 ? 1 - clamp(pop.n / Kref - 1, 0, 1) : 1;
      return { total: 100 * (0.30 * grassScore + 0.20 * shrubScore + 0.15 * treeScore + 0.25 * soilScore + 0.10 * bal), grassScore, shrubScore, treeScore, soilScore, bal };
    }
    function saudeArvore() { return E.arvViva ? 0.45 * E.V + 0.30 * E.Bk + 0.25 * E.Lc / P.arvore_folhas_max : 0; }
    function saudeSolo() { return 0.4 * clamp(E.OM, 0, 1) + 0.25 * (1 - E.C) + 0.35 * clamp(E.prof / 30, 0, 1); }

    function registrar(idx, ano, est, K, extra) {
      const st = estatPop(pop, P);
      if (st.Ne > 0) { neHarm += 1 / st.Ne; neCnt++; }
      const a = acc;
      const tot = a ? a.Nini + a.nasc : st.N;
      const digT = a ? a.digTot : 0;
      const dieta = {};
      if (a) for (const k in a.dietaDig) dieta[k] = digT > 0 ? r3(a.dietaDig[k] / digT) : 0;
      const sh = saudeEco(K);
      const capB = Math.max(1, 0.1 * E.Hs);
      const reg = {
        i: idx, ano, est, t: r2(idx / 4),
        N: st.N, Nini: a ? a.Nini : st.N, nasc: a ? a.nasc : 0, mortes: a ? a.mortes : 0,
        mc: a ? Object.assign({}, a.mc) : Object.fromEntries(CAUSAS.map(c => [c, 0])),
        sobrev: a && tot > 0 ? r3(1 - a.mortes / tot) : 1,
        ninhadas: a ? a.ninhadas : 0, reabs: a ? a.reabs : 0,
        sobrevFilhotes: a && a.nasc > 0 ? r3(a.nascVivosNinho / a.nasc) : null,
        femRep: st.femRep, machRep: st.machRep, filhotes: st.filhotes, adultos: st.adultos, machos: st.machos, femeas: st.femeas,
        idadeMedia: st.idadeMedia === null ? null : r1(st.idadeMedia), pir: st.pir,
        gerMedia: st.gerMedia === null ? null : r2(st.gerMedia), gerMax: st.gerMax,
        F: st.F === null ? null : r3(st.F), Fnasc: a && a.nNasc > 0 ? r3(a.sumFnasc / a.nNasc) : null,
        He: st.He === null ? null : r3(st.He), alelos: st.alelos === null ? null : r2(st.alelos), alelosMax: P._nAlelos,
        Ne: r1(st.Ne), NeHarm: neCnt ? r1(neCnt / neHarm) : 0,
        Gg: r1(E.Gg), Gd: r1(E.Gd), gramaCresc: a ? r1(a.prodVerde / A) : 0, gramaCons: a ? r1((a.consVerde + a.consSeca) / A) : 0,
        gramaDecomp: a ? r1(a.decomp) : 0, R: r3(E.R), S: r3(E.S),
        regenera: a ? r3(E.R - a.R0) : 0,
        perdaPerm: r3(clamp(1 - E.R / 0.15, 0, 1) * clamp(1 - E.S / 0.1, 0, 1)),
        Hb: r1(E.Hb), Hs: r1(E.Hs), Hdead: r1(E.Hdead), arbCresc: a ? r1(a.arbCresc) : 0, arbCons: a ? r1(a.consBroto / A) : 0, arbMort: a ? r1(a.arbMort) : 0,
        arbCond: r3(clamp(E.Hs / E.Hs0, 0, 2) * (0.6 + 0.4 * clamp(E.Hb / capB, 0, 1))),
        arvSaude: r3(saudeArvore()), arvFolhas: r3(E.Lc / P.arvore_folhas_max), arvCasca: r3(E.Bk), arvVigor: r3(E.V),
        arvRegen: r3(E.arvViva ? E.V * Math.exp(-(st.N / A) / 4) : 0), arvViva: E.arvViva, arvCons: a ? r1(a.consArv) : 0,
        cobertura: r3(cobertura(E)), MO: r3(E.OM), crosta: r3(E.C), erosaoAcum: r1(E.erosaoAcum), erosao: a ? r2(a.erosao) : 0,
        prof: r2(E.prof), CRA: r1(E.WHC), umidade: a && a.nI ? r3(a.somaUmid / a.nI) : r3(E.umid), soloSaude: r3(saudeSolo()),
        chuva: a ? r1(a.chuva) : 0, T: a && a.nI ? r1(a.somaT / a.nI) : regimeDe(P).T[0],
        eventosClima: a ? a.eventos : [],
        indAlim: a && a.nI ? r3(a.somaI / a.nI) : 1, dieta,
        alimDisp: r1(estoqueDigestivel(E, A) / 1000),
        K: Math.round(K), Ksust: null,
        pressao: K > 0 ? r3(st.N / K) : null,
        saude: r1(sh.total), saudeComp: { grama: r3(sh.grassScore), arbustos: r3(sh.shrubScore), arvore: r3(sh.treeScore), solo: r3(sh.soilScore), equilibrio: r3(sh.bal) },
        tocas: Math.round(capacidadeTocas(P, E)),
        surto: a ? a.surtoMeses > 0 : false,
        pred: Object.fromEntries(Object.keys(E.pred).map(t => [t, E.pred[t].n + E.pred[t].flut + E.pred[t].jov.reduce((a, x) => a + x.n, 0)])),
        predTotal: Object.values(E.pred).reduce((s, x) => s + x.n + x.flut + x.jov.reduce((a, j) => a + j.n, 0), 0),
        predDet: Object.fromEntries(Object.keys(E.pred).map(t => [t, { adultos: E.pred[t].n, femeas: E.pred[t].f, flutuantes: E.pred[t].flut, filhotes: E.pred[t].jov.reduce((a, x) => a + x.n, 0), cond: r2(E.pred[t].c) }])),
        predIngestao: Object.fromEntries(Object.keys(E.pred).map(t => [t, r2(E.pred[t].I)])),
        predNasc: a ? a.predNasc : 0, predMortes: a ? a.predMortes : 0
      };
      if (extra) Object.assign(reg, extra);
      registros.push(reg);
      return reg;
    }

    acc = null;
    registrar(0, 1, 0, cal.K0 * (P.K_referencia > 0 ? 1 : 0), { inicial: true });

    const coef = P.endogamia_mult;
    const RG = regimeDe(P);
    const m0 = 1 - Math.pow(1 - P.mort_adulto_anual, 1 / 12);
    let maleIdx = new Int32Array(1024);
    let mesExtincao = null, primeiraNinhada = null;

    for (let m = 0; m < meses; m++) {
      const y = Math.floor(m / 12), mo = m % 12, s = Math.floor(mo / 3);
      const cm = clima.meses[m];
      if (mo % 3 === 0) acc = novaAcc();
      if (cm.evento) acc.eventos.push({ mes: mo % 3, tipo: cm.evento });

      /* 1. vegetação e água */
      const veg = passoVegetacao(E, P, cm, mo, cal.Gpot);
      acc.prodVerde += veg.g * A; acc.prodBroto += veg.gb * A; acc.decomp += veg.dec;
      acc.arbCresc += veg.gs; acc.arbMort += veg.mortSeca;

      /* 2. demanda alimentar */
      const N0 = pop.n;
      const cold = 1 + 0.025 * Math.max(0, 8 - cm.T);
      let needA = 0, needJ = 0, dmCap = 0;
      for (let i = 0; i < N0; i++) {
        const a = pop.idade[i];
        let f = a < 4 ? MULT_IDADE[a] : 1;
        if (pop.lact[i]) f *= 1.5;
        if (a < P.maturidade_meses) needJ += f; else needA += f;
        dmCap += (a < 4 ? MULT_IDADE[a] : 1) * (pop.lact[i] ? 1.3 : 1);
      }
      needA *= NEED_MES * cold; needJ *= NEED_MES * cold; dmCap *= DMCAP_MES;
      const need = needA + needJ;
      const GgAntes = E.Gg;
      const ali = alimentar(E, P, need, dmCap);
      acc.consVerde += ali.dmPor.verde || 0; acc.consSeca += ali.dmPor.seca || 0; acc.consBroto += ali.dmPor.broto || 0;
      acc.consArv += ali.dmPor.arvore || 0; acc.consCasca += ali.dmPor.casca || 0; acc.consRaiz += ali.dmPor.raiz || 0;
      if (ali.arbMortoCasca) acc.arbMort += ali.arbMortoCasca;
      for (const k in acc.dietaDig) acc.dietaDig[k] += ali[k] || 0;
      acc.digTot += ali.dig;
      const Itot = need > 0 ? ali.dig / need : 1;
      let Ia, Ij;
      if (Itot < 1 && need > 0) {
        Ia = Math.min(1, ali.dig / (needA + 0.7 * needJ || 1));
        Ij = needJ > 0 ? Math.max(0, (ali.dig - Ia * needA) / needJ) : 0;
      } else { Ia = Ij = Math.min(1.1, Itot); }
      if (N0 > 0) { acc.somaI += Itot; }
      acc.nI++; acc.somaT += cm.T; acc.chuva += cm.chuva; acc.somaUmid += E.umid;
      const verdeShare = ali.dig > 0 ? (ali.verde + 0.6 * ali.broto + 0.5 * ali.arvore) / ali.dig : 1;
      const greenOnly = ali.dig > 0 ? ali.verde / ali.dig : 0;

      /* 3. efeitos do pastejo sobre raízes, sementes, arbustos e árvore */
      const d = (ali.dmPor.verde || 0) / A / (GgAntes + 30);
      const sens = P.sobrepastejo_sens;
      // Estresse de pastejo acumulado (memória de vários meses): a planta tolera
      // desfolha intensa por pouco tempo, mas perde raízes se ela se repete.
      E.Z = 0.8 * (E.Z || 0) + Math.max(0, d - 0.4) * (RG.crescB[mo] ? 1 : 0.5);
      if (E.Z > 0.5) E.R -= sens * 0.035 * (E.Z - 0.5);
      // rebrota vegetativa: proporcional às raízes VIVAS (logística) + expansão lenta a partir dos refúgios;
      // uma grama muito degradada não volta sozinha só porque chegou a primavera
      if (RG.crescB[mo]) E.R += P.grama_regen * veg.W * (0.30 * E.R * (1 - E.R) + 0.03 * (1 - E.R)) * (1 - Math.min(1, d));
      if (RG.germB[mo] && veg.W > 0.3) {
        const rec = P.grama_regen * 0.08 * E.S * veg.W * (1 - E.R) * (1 - Math.min(1, d));
        E.R += rec; E.S -= rec * 0.5;
      }
      if (!RG.crescB[mo] && E.Gg + E.Gd < 80 && N0 > 0) E.R -= 0.015 * sens * Math.min(1, (N0 / A) / 10);
      E.R = clamp(E.R, REFUGIO, 1); // refúgios (penhascos, matagal denso) mantêm coroas vivas
      if (RG.florB[mo]) { const sp = 0.22 * E.R * Math.pow(Math.max(0, 1 - d / 0.6), 2) * veg.W; E.S += sp * (1 - E.S); }
      E.S *= 0.985;
      const capB = 0.1 * E.Hs;
      if (RG.crescB[mo] && E.Hb < 0.15 * capB && N0 > 0) { const dm = E.Hs * 0.005 * sens * Math.min(1, (N0 / A) / 8); E.Hs -= dm; E.Hdead += dm; acc.arbMort += dm; }
      if (RG.germB[mo]) { // recrutamento de novos arbustos (banco de sementes do solo; plântulas comidas em alta densidade)
        const rec = (0.003 * E.Hs + 3 * Math.min(1, E.prof / 15)) * P.arbusto_regen * veg.W * Math.exp(-(N0 / A) / 10) * Math.max(0, 1 - E.Hs / 1800);
        E.Hs += rec; E.Hb += 0.05 * rec; acc.arbCresc += rec;
      }
      const falta = 1 - Itot;
      if (E.arvViva && falta > 0.25 && N0 > 0) E.Bk = Math.max(0, E.Bk - 0.08 * sens * (falta - 0.25) * Math.min(1, N0 / 800));

      /* 4. solo: erosão, matéria orgânica, crosta, profundidade */
      const cov = cobertura(E);
      const bare2 = (1 - cov) * (1 - cov);
      const eros = (1.6 * Math.pow(cm.chuva / 70, 1.2) * (0.5 + cm.intens) + 1.2 * (1 - veg.W)) * bare2;
      E.erosaoAcum += eros; acc.erosao += eros;
      E.prof = Math.max(0, E.prof - eros / 130);
      E.S *= Math.max(0, 1 - 0.04 * eros);
      const fezes = N0 > 0 ? (ali.dm - ali.dig) / A : 0;
      const aporte = veg.dec + veg.quedaB + veg.decMad + veg.decLg / A + fezes;
      E.OM += 0.002 * (aporte / cal.aporteRef - E.OM) - 0.003 * eros;
      E.OM = clamp(E.OM, 0, 1.5);
      E.C = clamp(E.C + 0.01 * (1 - cov) * (1 - cov) * (cm.chuva / 70) - 0.03 * E.C * (cov + 0.2), 0, 1);

      /* 5. mortalidade */
      const dens = N0 / A;
      const hyd = clamp(P.agua_livre + 0.3 * Math.min(1, cm.chuva / 60) + verdeShare * Math.min(1, Itot + 0.2) + (cm.T < 14 ? 0.25 : 0), 0, 1);
      const abrigo = clamp(0.35 * (E.arvViva ? E.Lc / P.arvore_folhas_max : Math.max(0, 1 - E.mesesMorta / 36) * 0.3) + 0.65 * clamp(E.Hs / E.Hs0, 0, 1), 0, 1);
      // surtos de doença endêmica dependentes da densidade
      if (E.surto > 0) { E.surto--; acc.surtoMeses++; }
      else if (P.surtos_doenca && dens > 15) {
        const pS = 0.012 * Math.pow(dens / 15 - 1, 1.2) * (Itot < 0.8 ? 2 : 1);
        if (rng() < pS) { E.surto = 2 + Math.floor(rng() * 2); E.surtoInt = 0.06 + 0.09 * rng(); acc.eventos.push({ mes: mo % 3, tipo: 'surto' }); surtosTotal++; acc.surtoMeses++; }
      }
      const coccid = Math.min(0.3, 0.035 * (dens / 25) * (0.6 + 0.8 * veg.W));

      /* 5b. predação: resposta funcional tipo II sobre coelhos "vulneráveis".
         Jovens e coelhos em má condição são mais vulneráveis; a cobertura
         vegetal (grama + arbustos) protege conforme o tipo de predador. */
      chegadas.forEach(c => { if (c.mes === m) { const st0 = E.pred[c.tipo], Tc = PRED_TIPOS[c.tipo]; let fem = Math.floor(c.n / 2) + (c.n % 2 && rng() < 0.5 ? 1 : 0);
        // introduzidos ocupam territórios livres; o excedente vira flutuante
        const vagas = Tc.migra ? c.n : Math.max(0, capTerritorio(Tc, P) - st0.n), entram = Math.min(vagas, c.n);
        const femT = Math.min(fem, Math.ceil(entram / 2)); st0.n += entram; st0.f += femT; st0.flut += c.n - entram; st0.flutF += fem - femT; st0.chegou = true; E.pred[c.tipo].extinto = false; acc.eventos.push({ mes: mo % 3, tipo: 'chegada_' + c.tipo }); } });
      let lamJ = 0, lamA = 0;
      const predEaten = {};                 // coelhos-equivalentes REALMENTE comidos (preenchido na mortalidade)
      const lamPor = [];                    // [tipo, λ para jovens, λ para adultos] — para atribuir cada morte a um predador
      const frioPred = 1 + 0.015 * Math.max(0, 10 - cm.T);   // custo energético extra no frio
      const tiposAtivos = Object.keys(E.pred).filter(t => E.pred[t].n + E.pred[t].flut > 0);
      if (tiposAtivos.length && N0 > 0) {
        let SJ = 0, SA = 0;
        for (let i = 0; i < N0; i++) { const cf = 1 + 0.8 * Math.max(0, 0.8 - pop.cond[i]); if (pop.idade[i] < P.maturidade_meses) SJ += cf; else SA += cf; }
        // refúgio: com poucos coelhos, quase todos ficam junto às tocas, fora do alcance da maioria dos predadores
        const nRef = P.refugio_tocas * A * clamp(E.prof / 20, 0.2, 1);
        const fracExposta = N0 > 0 ? Math.max(0, 1 - nRef / N0) : 0;
        const arbRel = clamp(E.Hs / E.Hs0, 0, 1);
        let totK = 0;
        const Ks = {};
        tiposAtivos.forEach(t => {
          const T = PRED_TIPOS[t], st = E.pred[t];
          const expo = 1 - T.prot * (0.6 * cov + 0.4 * arbRel);
          const Wt = T.juv * SJ + SA;
          const exposta = 1 - (1 - fracExposta) * (T.entraToca ? 0.3 : 1);   // arminho entra nas tocas
          const Dv = Wt / A * expo * exposta;
          // Holling tipo III: k = kmax·D²/(D² + h²), com h² = kmax/(a) — a eficiência de caça multiplica a taxa de ataque a
          const h2 = T.h * T.h / Math.max(0.05, P.pred_eficiencia);
          // O limite de manuseio é de BIOMASSA (coelhos-equivalentes), não de número de presas:
          // um filhote (0,4 de adulto) é capturado e comido mais depressa que um adulto.
          const fracJ0 = Wt > 0 ? T.juv * SJ / Wt : 0;
          const eqMedio = fracJ0 * 0.4 + (1 - fracJ0);
          const kmax = T.need * 1.25 * frioPred / Math.max(0.4, eqMedio);   // presas/mês
          // caçadores: adultos territoriais + flutuantes (caçam em áreas piores, 60% da eficiência)
          const cacadores = st.n + 0.6 * st.flut;
          // interferência (Beddington–DeAngelis): acima da capacidade territorial, brigas reduzem o sucesso por indivíduo
          const capT = capTerritorio(T, P);
          const interf = 1 + 0.5 * Math.max(0, (st.n + st.flut) / capT - 1);
          const kPer = kmax * Dv * Dv / (Dv * Dv + h2) / interf;
          Ks[t] = { K: cacadores * kPer, Wt, T };
          totK += cacadores * kPer;
        });
        const cap = 0.6 * N0, esc = totK > cap ? cap / totK : 1;
        tiposAtivos.forEach(t => {
          const k = Ks[t], K = k.K * esc;
          const lam = k.Wt > 0 ? K / k.Wt : 0;   // K já considera só a fração exposta; λ é distribuído por todos
          lamJ += lam * k.T.juv; lamA += lam;
          lamPor.push([t, lam * k.T.juv, lam]);
          predEaten[t] = 0;
        });
      }
      const NH = CAUSAS.length;
      const hz = new Float64Array(NH);
      let w = 0;
      for (let i = 0; i < N0; i++) {
        const age = pop.idade[i];
        const juv = age < P.maturidade_meses;
        const Fi = pop.F[i];
        // condição corporal relaxa em direção à ingestão relativa
        const alvo = clamp(juv ? Ij : Ia, 0, 1.1);
        let c = pop.cond[i] + 0.55 * (alvo - pop.cond[i]) + 0.04 * (rng() - 0.5);
        if (hyd < 0.5) c -= 0.1 * (0.5 - hyd);
        c = clamp(c, 0, 1.15); pop.cond[i] = c;
        pop.lact[i] = 0;
        // riscos mensais (cada um é uma probabilidade independente)
        hz[0] = 0.85 / (1 + Math.exp((c - (juv ? 0.42 : 0.36)) / 0.06));                         // fome
        hz[1] = hyd < 0.6 ? Math.min(0.6, 0.35 * Math.pow((0.6 - hyd) / 0.6, 1.5) * (juv ? 1.5 : 1)) : 0; // desidratação
        hz[2] = (juv && age >= 1 ? coccid : 0.002 * dens / 25) * (1 + Fi);                         // doença endêmica
        hz[3] = E.surto > 0 ? Math.min(0.5, E.surtoInt * (1 + Fi) * (c < 0.6 ? 1.5 : 1)) : 0;       // surto
        hz[4] = age > 30 ? Math.min(1, 0.004 * Math.exp(0.09 * (age - 30))) : 0;                    // senescência
        hz[5] = 0; hz[6] = 0;
        hz[7] = (cm.T > 30 ? 0.05 * (cm.T - 30) / 5 * (1 - abrigo) : 0) + (cm.T < 4 && juv ? 0.03 : 0); // clima
        hz[8] = (juv ? 0.09 : m0) * P.mort_mult;                                                   // basal
        hz[9] = (lamA > 0) ? 1 - Math.exp(-(juv ? lamJ : lamA) * (1 + 0.8 * Math.max(0, 0.8 - c))) : 0; // predação
        let sobrev = 1, somaH = 0;
        for (let k = 0; k < NH; k++) { sobrev *= 1 - hz[k]; somaH += hz[k]; }
        if (rng() < 1 - sobrev) {
          let r = rng() * somaH, k = 0;
          while (k < NH - 1 && r > hz[k]) { r -= hz[k]; k++; }
          acc.mc[CAUSAS[k]]++; acc.mortes++;
          if (k === 9 && lamPor.length) {
            // atribui a presa ao predador que a caçou (proporcional ao risco de cada tipo) — balanço de massa
            let tot = 0; for (const lp of lamPor) tot += juv ? lp[1] : lp[2];
            let r2_ = rng() * tot, q = 0;
            while (q < lamPor.length - 1 && r2_ > (juv ? lamPor[q][1] : lamPor[q][2])) { r2_ -= juv ? lamPor[q][1] : lamPor[q][2]; q++; }
            predEaten[lamPor[q][0]] += juv ? 0.4 : 1;   // jovem ≈ 0,4 de um adulto em massa comestível
          }
          const id = pop.id[i]; if (id < MAXG && genealogia[id]) genealogia[id].morte = m;
          continue;
        }
        if (w !== i) copiar(pop, i, w);
        w++;
      }
      pop.n = w;

      /* 5c. dinâmica dos predadores (alimentação, mortes, nascimentos, migração) */
      Object.keys(E.pred).forEach(t => {
        const T = PRED_TIPOS[t], st = E.pred[t];
        const altSaz = RG.altSaz[s];   // aves e insetos variam com a estação
        const aT = Math.min(0.95, T.alt * P.presas_alt);
        if (T.migra) {
          if (!st.chegou) return;
          // mesma exposição usada na caça (grama + arbustos), densidade realista por km²
          const expo = 1 - T.prot * (0.6 * cov + 0.4 * clamp(E.Hs / E.Hs0, 0, 1));
          const Dv = (N0 / A) * expo;
          const alvo = T.max * (A / 100) * P.pred_territorio * Dv * Dv / (Dv * Dv + T.h * T.h) * RG.rapSaz[s];
          const delta = (alvo - st.n) * 0.3 + (rng() - 0.5);
          st.n = Math.max(0, Math.round(st.n + delta));
          st.I = st.n > 0 ? Math.min(1.3, ((predEaten[t] || 0) + aT * altSaz * T.need * st.n) / (T.need * frioPred * st.n)) : 0;
          return;
        }
        if (st.n + st.flut + st.jov.length === 0) return;
        // Adultos territoriais e flutuantes caçam; filhotes dependem dos pais (comem ~35% de um adulto).
        const Pn = st.n, Fl = st.flut;
        const J = st.jov.reduce((a, x) => a + x.n, 0);
        const necTot = T.need * frioPred * (Pn + Fl + 0.35 * J);
        const altTot = Math.min(aT * necTot, aT * T.need * T.altCap * P.presas_alt * (A / 100) * altSaz);
        st.I = necTot > 0 ? Math.min(1.3, ((predEaten[t] || 0) + altTot) / necTot) : 0;
        // reservas corporais: a condição acompanha a ingestão com atraso (semanas de jejum são toleradas)
        st.c = clamp(st.c + 0.3 * (Math.min(1.1, st.I) - st.c), 0, 1.1);
        const mBase = (1 - Math.pow(1 - T.mort, 1 / 12)) * P.pred_mortalidade;
        const mFome = st.c < 0.55 ? T.fome * Math.pow((0.55 - st.c) / 0.55, 1.2) : 0;
        const pmA = Math.min(1, mBase + mFome);
        const pmF = Math.min(1, 1.6 * mBase + 1.3 * mFome);                                  // flutuantes: sem território, mais expostos
        // cuidado parental: os pais gastam as próprias reservas alimentando a cria; os filhotes só passam fome quando os pais já estão magros
        const pmJ = Math.min(1, 2 * mBase + (st.c < 0.7 ? 0.6 * (0.7 - st.c) / 0.7 : 0) + (st.I < 0.4 ? 0.3 * (0.4 - st.I) / 0.4 : 0));
        let dA = 0, dF = 0, dJ = 0;
        // mortes de adultos (cada morte é de fêmea com probabilidade f/n)
        for (let k = 0; k < Pn; k++) if (rng() < pmA) { dA++; if (rng() < st.f / Math.max(1, st.n)) st.f--; st.n--; }
        for (let k = 0; k < Fl; k++) if (rng() < pmF) { dF++; if (rng() < st.flutF / Math.max(1, st.flut)) st.flutF--; st.flut--; }
        st.jov.forEach(co => { let d = 0; for (let k = 0; k < co.n; k++) if (rng() < pmJ) d++; co.n -= d; dJ += d; co.idade++; });
        // filhotes maduros viram flutuantes (sexo sorteado); flutuantes ocupam territórios vagos
        st.jov.filter(co => co.idade >= T.matur && co.n > 0).forEach(co => { for (let k = 0; k < co.n; k++) { st.flut++; if (rng() < 0.5) st.flutF++; } });
        st.jov = st.jov.filter(co => co.idade < T.matur && co.n > 0);
        const capT = capTerritorio(T, P);
        while (st.n < capT && st.flut > 0) {
          const machosF = st.flut - st.flutF;
          let vemF;
          if (st.f === 0 && st.flutF > 0) vemF = true;                 // falta fêmea com território
          else if (st.n - st.f === 0 && machosF > 0) vemF = false;     // falta macho com território
          else vemF = rng() < st.flutF / st.flut;
          st.n++; st.flut--; if (vemF) { st.f++; st.flutF--; }
        }
        // reprodução: precisa de ao menos um macho e uma fêmea com território; raposas formam casais
        let nascidos = 0;
        const machos = st.n - st.f;
        if (T.repro.indexOf(mo) >= 0 && st.f > 0 && machos > 0) {
          const ok = clamp((st.c - 0.45) / 0.35, 0, 1);
          const rep = Math.sqrt(Math.max(0, P.pred_reproducao));
          const reprodutoras = T.monogamo ? Math.min(st.f, machos) : st.f;
          for (let k = 0; k < reprodutoras; k++) if (rng() < Math.min(1, T.pRepro * ok * rep)) nascidos += poisson(rng, T.ninhada * T.sobrevFilhote * rep);
          if (nascidos > 0) st.jov.push({ n: nascidos, idade: 0 });
        }
        acc.predNasc += nascidos; acc.predMortes += dA + dF + dJ;
        if (st.n + st.flut + st.jov.reduce((a, x) => a + x.n, 0) === 0 && (Pn > 0 || Fl > 0 || J > 0) && !st.extinto) { st.extinto = true; acc.eventos.push({ mes: mo % 3, tipo: 'extinto_' + t }); }
      });

      /* 6. reprodução */
      let nasc = 0, mortN = 0;
      const n1 = pop.n;
      let nM = 0, nF = 0;
      if (maleIdx.length < n1) maleIdx = new Int32Array(n1 * 2);
      for (let i = 0; i < n1; i++) {
        if (pop.idade[i] >= P.maturidade_meses && pop.fertil[i]) { if (pop.sexo[i] === 1) maleIdx[nM++] = i; else nF++; }
      }
      // envelhecimento antes de adicionar recém-nascidos
      for (let i = 0; i < n1; i++) pop.idade[i]++;
      if (nM > 0 && nF > 0) {
        const mate = 1 - Math.exp(-12 * nM / nF);
        // estresse social em alta densidade reduz ovulação e sobrevivência das ninhadas (Rödel et al. 2004)
        const densRep = 1 / (1 + Math.pow((n1 / A) / Math.max(1, P.estresse_densidade), 2));
        const tocas = capacidadeTocas(P, E);
        const fracToca = Math.min(1, tocas / nF);
        const flood = (cm.chuva > 100 && cm.intens > 0.5) ? 0.75 : 1;
        const frio = cm.T < 4 ? 0.85 : 1;
        for (let im = 0; im < n1; im++) {
          if (pop.sexo[im] !== 0 || !pop.fertil[im]) continue;
          const age = pop.idade[im] - 1;
          if (age < P.maturidade_meses) continue;
          const c = pop.cond[im];
          const nutr = clamp((greenOnly - 0.05) / 0.3, 0, 1) * clamp((c - 0.55) / 0.3, 0, 1);
          const ageF = age < 6 ? 0.7 : age > 48 ? 0.7 : 1;
          const temToca = rng() < fracToca;
          const p = P.fertilidade * P.reproducao_mult * RG.foto[mo] * nutr * mate * ageF * densRep * (temToca ? 1 : 0.6);
          if (rng() >= p) continue;
          const pReabs = 0.07 + 0.6 * Math.pow(1 - clamp(c / 0.95, 0, 1), 1.5);
          if (rng() < pReabs) { acc.reabs++; continue; }
          const Fm = pop.F[im];
          const lam = P.ninhada_media * (0.7 + 0.3 * Math.min(1, c)) * Math.exp(-P.endogamia_B_fec * coef * Fm) * (age < 6 ? 0.8 : 1);
          const nk = poisson(rng, lam);
          if (nk <= 0) { acc.reabs++; continue; }
          acc.ninhadas++;
          if (primeiraNinhada === null) primeiraNinhada = m;
          pop.lact[im] = 1;
          const ip = maleIdx[Math.floor(rng() * nM)];
          const baseS = 0.82 * Math.pow(clamp(c, 0.3, 1), 0.7) * (0.5 + 0.5 * hyd) * flood * (temToca ? 1 : 0.55) * frio;
          const gerK = Math.max(pop.ger[im], pop.ger[ip]) + 1;
          const idM = pop.id[im], idP = pop.id[ip];
          for (let k = 0; k < nk; k++) {
            garantir(pop, pop.n + 1);
            const j = pop.n, al = pop.alelos, bj = j * L2, bm = im * L2, bp = ip * L2;
            let hom = 0;
            for (let l = 0; l < L; l++) {
              const x = al[bm + 2 * l + (rng() < 0.5 ? 0 : 1)];
              const z = al[bp + 2 * l + (rng() < 0.5 ? 0 : 1)];
              al[bj + 2 * l] = x; al[bj + 2 * l + 1] = z; if (x === z) hom++;
            }
            const F = hom / L;
            nasc++; acc.sumFnasc += F; acc.nNasc++;
            const hF = 1 - Math.exp(-P.endogamia_B_juv * coef * F);
            const hB = 1 - baseS;
            if (rng() < 1 - (1 - hB) * (1 - hF)) {
              mortN++;
              if (rng() * (hB + hF) < hF) acc.mc.endogamia++; else acc.mc.neonatal++;
              continue;
            }
            acc.nascVivosNinho++;
            adicionar(rng() < 0.5 ? 1 : 0, 0, gerK, idM, idP, F, 1, 0.8, m);
            // adicionar() sobrescreve o índice j com os campos; alelos já escritos
          }
        }
      }
      acc.nasc += nasc; acc.mortes += mortN;
      if (pop.n === 0 && mesExtincao === null && m > 0) mesExtincao = m;

      mensal.N.push(pop.n); mensal.I.push(r3(Itot)); mensal.chuva.push(r1(cm.chuva)); mensal.T.push(r1(cm.T)); mensal.W.push(r3(veg.W));
      mensal.nasc.push(nasc); mensal.mortes.push(acc.mortes);

      /* 7. registro sazonal */
      if (mo % 3 === 2) {
        const K = capacidade(acc.stock0, acc.prodVerde, acc.prodBroto, 3);
        registrar(y * 4 + s + 1, y + 1, s, K);
        if (s === 3) {
          const ult = registros.slice(-4);
          const Ks = Math.round(Math.min(...ult.map(r => r.K)));
          ult.forEach(r => { r.Ksust = Ks; });
        }
      }
    }
    registros[0].Ksust = registros[4] ? registros[4].Ksust : null;

    const res = {
      versao: VERSAO, gerado: null, parametros: P, calibracao: { Gpot: r1(cal.Gpot), K0: Math.round(cal.K0), aporteRef: r2(cal.aporteRef) },
      estacoes: ESTACOES, causas: CAUSAS, registros, mensal,
      regime: { id: P.estacoes in REGIMES ? P.estacoes : 'brasil', nome: RG.nome, curto: RG.curto, chuva: RG.chuva.map(v => v * P.chuva_mult), principal: RG.principal, desc: RG.desc },
      clima: clima.anual.map((a, y) => ({ ano: y + 1, multPrim: r3(a.multPrim), mult: a.mult.map(r3), anomT: r2(a.anomT) })),
      genealogia, mesExtincao, primeiraNinhada, surtosTotal
    };
    res.anual = tabelaAnual(res);
    res.eventos = detectarEventos(res);
    res.resumo = resumir(res);
    return res;
  }

  /* ---------------- Pós-processamento ---------------- */
  function tabelaAnual(res) {
    const R = res.registros, out = [];
    const princ = res.regime ? res.regime.principal : 0;
    for (let y = 1; y <= res.parametros.anos; y++) {
      const rs = R.filter(r => r.ano === y && !r.inicial);
      if (!rs.length) continue;
      const fim = rs[rs.length - 1];
      out.push({
        ano: y,
        chuva: r1(rs.reduce((a, r) => a + r.chuva, 0)),
        chuvaPrim: (rs.find(r => r.est === princ) || rs[0]).chuva,
        multPrim: res.clima[y - 1].multPrim,
        T: r1(rs.reduce((a, r) => a + r.T, 0) / rs.length),
        Nmax: Math.max(...rs.map(r => r.N)), Nmin: Math.min(...rs.map(r => r.N)), Nfim: fim.N,
        nasc: rs.reduce((a, r) => a + r.nasc, 0), mortes: rs.reduce((a, r) => a + r.mortes, 0),
        gramaPrim: r1(rs[0].Gg + rs[0].Gd), gramaMedia: r1(rs.reduce((a, r) => a + r.Gg + r.Gd, 0) / rs.length),
        R: fim.R, arbustos: fim.Hs, arbCond: fim.arbCond, arvore: fim.arvSaude, arvViva: fim.arvViva,
        solo: fim.soloSaude, erosao: r1(rs.reduce((a, r) => a + r.erosao, 0)),
        alimento: r3(rs.reduce((a, r) => a + r.indAlim, 0) / rs.length),
        Kprim: (rs.find(r => r.est === princ) || rs[0]).K, Ksust: fim.Ksust,
        F: fim.F, He: fim.He, Ne: fim.NeHarm, ger: fim.gerMax, saude: fim.saude
      });
    }
    return out;
  }

  function nomeEst(r) { return ESTACOES[r.est] + ' do ano ' + r.ano; }
  // "na primavera do ano 3" / "no verão do ano 5"
  function noEst(r) { return (r.est === 0 ? 'na ' : 'no ') + ESTACOES[r.est].toLowerCase() + ' do ano ' + r.ano; }
  function mesTexto(m) { const y = Math.floor(m / 12), s = Math.floor((m % 12) / 3); return noEst({ est: s, ano: y + 1 }); }

  function detectarEventos(res) {
    const R = res.registros, P = res.parametros, ev = [];
    const add = (i, tipo, titulo, texto, icone, nivel, vars) => ev.push({ i, tipo, titulo, texto, icone, nivel: nivel || 'info', vars: vars || [] });
    const find = (fn, from) => { for (let i = from || 1; i < R.length; i++) if (fn(R[i], i)) return i; return -1; };
    let i;
    if (res.primeiraNinhada !== null) {
      const idx = Math.floor(res.primeiraNinhada / 3) + 1;
      add(idx, 'primeira_ninhada', 'Primeira ninhada', `A primeira ninhada nasceu no mês ${res.primeiraNinhada % 3 + 1} (${noEst(R[idx])}). ${R[idx].nasc} filhotes nasceram nessa estação.`, '🐣', 'bom', ['reprodução', 'grama verde']);
    } else add(R.length - 1, 'sem_reproducao', 'Nenhuma reprodução', 'Os fundadores nunca produziram filhotes.', '⛔', 'mau', ['fundadores']);
    i = find(r => r.N >= 1000);
    if (i > 0) add(i, 'mil', 'Mil coelhos', `A população passou de 1.000 indivíduos (${R[i].N}) ${noEst(R[i])}.`, '📈', 'info', ['reprodução']);
    i = find(r => r.K > 0 && r.N > r.K);
    if (i > 0) add(i, 'superpop', 'Primeira superpopulação', `${R[i].N} coelhos para uma capacidade estimada de ${R[i].K} nessa estação (${Math.round(R[i].pressao * 100)}%).`, '⚠️', 'alerta', ['capacidade de suporte', 'estação']);
    i = find(r => r.N > P.K_referencia);
    if (i > 0) add(i, 'supera_ref', `Ultrapassou ${P.K_referencia.toLocaleString('pt-BR')}`, `A população (${R[i].N}) superou a capacidade de referência da estação chuvosa média.`, '🚨', 'alerta', ['capacidade de referência']);
    i = find(r => r.N > 0 && r.indAlim < 0.7);
    if (i > 0) add(i, 'crise_alimentar', 'Primeira crise alimentar', `Os coelhos obtiveram em média só ${Math.round(R[i].indAlim * 100)}% da energia necessária.`, '🍂', 'mau', ['alimento', 'grama seca', 'densidade']);
    i = find(r => r.est === 3 && (r.Nini + r.nasc) > 50 && r.mortes / (r.Nini + r.nasc) > 0.5);
    if (i > 0) add(i, 'inverno_extra', 'Inverno de mortalidade extraordinária', `${Math.round(R[i].mortes / (R[i].Nini + R[i].nasc) * 100)}% dos coelhos morreram nesse inverno (${R[i].mortes} mortes).`, '❄️', 'mau', ['fome', 'inverno']);
    i = find(r => r.R < 0.7);
    if (i > 0) add(i, 'grama_degrada', 'Degradação significativa da grama', `O vigor das raízes caiu para ${Math.round(R[i].R * 100)}% do original por sobrepastejo.`, '🌾', 'mau', ['sobrepastejo', 'raízes']);
    const Hs0 = R[0].Hs;
    i = find(r => r.Hs < 0.5 * Hs0);
    if (i > 0) add(i, 'arbustos', 'Redução expressiva dos arbustos', `A biomassa lenhosa dos arbustos caiu para ${Math.round(R[i].Hs / Hs0 * 100)}% da inicial (descascamento e ramoneio).`, '🌿', 'mau', ['arbustos', 'escassez de grama']);
    i = find(r => r.arvCasca < 0.5);
    if (i > 0) add(i, 'arvore_anelada', 'Árvore com casca anelada', `Mais da metade da circunferência do tronco foi roída (integridade ${Math.round(R[i].arvCasca * 100)}%).`, '🪵', 'mau', ['árvore', 'fome']);
    i = find(r => !r.arvViva);
    if (i > 0) add(i, 'arvore_morte', 'Morte da árvore', 'A única árvore da ilha morreu. Sombra e abrigo começam a desaparecer.', '🥀', 'mau', ['árvore', 'casca']);
    let iMax = 1; for (let k = 1; k < R.length; k++) if (R[k].N > R[iMax].N) iMax = k;
    if (R[iMax].N > 2) add(iMax, 'max_pop', 'Maior população registrada', `${R[iMax].N.toLocaleString('pt-BR')} coelhos ${noEst(R[iMax])}.`, '🏔️', 'info', ['pico']);
    let iMort = 1; for (let k = 1; k < R.length; k++) if (R[k].mortes > R[iMort].mortes) iMort = k;
    if (R[iMort].mortes > 0) add(iMort, 'max_mortes', 'Maior mortalidade registrada', `${R[iMort].mortes.toLocaleString('pt-BR')} mortes em uma única estação.`, '⚰️', 'mau', ['mortalidade']);
    let best = 0, bi = -1;
    for (let k = 1; k < R.length; k++) if (R[k - 1].N >= 50) { const q = 1 - R[k].N / R[k - 1].N; if (q > best) { best = q; bi = k; } }
    if (bi > 0 && best > 0.4) add(bi, 'colapso', 'Maior colapso populacional', `A população caiu ${Math.round(best * 100)}% em uma estação (${R[bi - 1].N} → ${R[bi].N}).`, '📉', 'mau', ['colapso']);
    // seca mais longa
    let run = 0, runMax = 0, runIni = 0, cur = 0;
    res.clima.forEach((c, y) => { if (c.multPrim < 0.9) { if (run === 0) cur = y; run++; if (run > runMax) { runMax = run; runIni = cur; } } else run = 0; });
    if (runMax >= 2) add(runIni * 4 + 1, 'seca', `Seca: ${runMax} anos seguidos`, `Do ano ${runIni + 1} ao ano ${runIni + runMax}, a estação chuvosa principal teve menos de 90% da chuva média.`, '☀️', 'alerta', ['chuva']);
    i = find(r => r.Fnasc !== null && r.Fnasc >= 0.2);
    if (i > 0) add(i, 'endogamia', 'Primeiro sinal de endogamia', `Os filhotes nascidos tinham coeficiente de endogamia médio F = ${R[i].Fnasc.toFixed(2)} (equivalente a cruzamento entre irmãos).`, '🧬', 'alerta', ['consanguinidade']);
    i = find(r => r.surto);
    if (i > 0) add(i, 'surto', 'Primeiro surto de doença', 'Um surto de doença endêmica foi desencadeado pela alta densidade de coelhos.', '🦠', 'mau', ['densidade', 'doença']);
    // predadores: chegada e extinção
    R.forEach((r, k) => (r.eventosClima || []).forEach(e => {
      const [acao, tipo] = e.tipo.split('_');
      const T = PRED_TIPOS[tipo];
      if (!T || (acao !== 'chegada' && acao !== 'extinto')) return;
      if (acao === 'chegada') add(k, 'pred_chegada', `Chegada: ${T.nome.toLowerCase()}`, `${T.nome} ${tipo === 'rapina' ? 'começaram a caçar' : 'foram introduzidos'} na ilha ${noEst(r)}.`, T.icone, 'alerta', ['predação']);
      else add(k, 'pred_extinto', `${T.nome}: extinção`, `O último predador desse tipo morreu ${noEst(r)}, provavelmente por falta de presas.`, '🪦', 'info', ['predação', 'fome dos predadores']);
    }));
    // recuperação ambiental
    let teveBaixa = false;
    for (let k = 1; k < R.length; k++) { if (R[k].R < 0.6) teveBaixa = true; else if (teveBaixa && R[k].R > 0.85) { add(k, 'recuperacao', 'Recuperação da vegetação', `O vigor da grama voltou a ${Math.round(R[k].R * 100)}% após um período de degradação.`, '🌱', 'bom', ['regeneração']); break; } }
    i = find(r => r.N === 0);
    if (i > 0) add(i, 'extincao', 'Extinção local', `A população de coelhos chegou a zero ${noEst(R[i])}.`, '🕯️', 'mau', ['extinção']);
    // gargalo após o pico
    if (R[iMax].N > 200) { const k = find((r, k) => k > iMax && r.N > 0 && r.N < R[iMax].N * 0.05, iMax + 1); if (k > 0) add(k, 'gargalo', 'Gargalo populacional', `Restaram apenas ${R[k].N} coelhos (menos de 5% do pico). Gargalos aceleram a perda de diversidade genética.`, '⏳', 'alerta', ['gargalo', 'genética']); }
    ev.sort((a, b) => a.i - b.i);
    return ev;
  }

  function resumir(res) {
    const R = res.registros, fim = R[R.length - 1];
    const nasc = R.reduce((a, r) => a + r.nasc, 0), mortes = R.reduce((a, r) => a + r.mortes, 0);
    let iMax = 0; R.forEach((r, k) => { if (r.N > R[iMax].N) iMax = k; });
    let crises = 0, emCrise = false;
    R.forEach(r => { const c = r.N > 0 && r.indAlim < 0.7; if (c && !emCrise) crises++; emCrise = c; });
    let colapsos = 0;
    for (let k = 1; k < R.length; k++) if (R[k - 1].N >= 100 && R[k].N < 0.5 * R[k - 1].N) colapsos++;
    const mcTot = Object.fromEntries(CAUSAS.map(c => [c, R.reduce((a, r) => a + r.mc[c], 0)]));
    return {
      Nini: R[0].N, Nmax: R[iMax].N, iMax, Nfinal: fim.N, nasc, mortes,
      sobrev: r3(1 - mortes / Math.max(1, R[0].N + nasc)),
      extinta: fim.N === 0, mesExtincao: res.mesExtincao,
      crises, colapsos, mcTot,
      final: { Gg: fim.Gg, Gd: fim.Gd, R: fim.R, S: fim.S, Hs: fim.Hs, Hs0: R[0].Hs, arbCond: fim.arbCond, arvSaude: fim.arvSaude, arvViva: fim.arvViva, solo: fim.soloSaude, prof: fim.prof, erosao: fim.erosaoAcum, MO: fim.MO, K: fim.K, Ksust: fim.Ksust, F: fim.F, He: fim.He, alelos: fim.alelos, ger: fim.gerMax, saude: fim.saude },
      K0: res.calibracao.K0
    };
  }

  /* ---------------- Respostas automáticas às 16 perguntas ---------------- */
  function analisar(res) {
    const R = res.registros, S = res.resumo, P = res.parametros, ev = res.eventos;
    const evt = (t) => ev.find(e => e.tipo === t);
    const fmt = (n) => (n === null || n === undefined) ? '—' : Number(n).toLocaleString('pt-BR');
    const pct = (x) => Math.round(x * 100) + '%';
    const out = [];
    // 1
    let boom = -1;
    for (let k = 4; k < R.length; k++) if (R[k].N >= 500 && R[k].N >= 3 * R[k - 4].N) { boom = k; break; }
    out.push({ q: 'Em qual ano ocorreu a primeira grande explosão populacional?', a: boom > 0 ? `No ano ${R[boom].ano} (${ESTACOES[R[boom].est].toLowerCase()}): a população chegou a ${fmt(R[boom].N)}, mais que o triplo de um ano antes (${fmt(R[boom - 4].N)}).` : 'Não houve explosão (critério: ≥500 coelhos e triplicar em um ano).' });
    // 2
    out.push({ q: 'Qual foi a maior população registrada?', a: `${fmt(S.Nmax)} coelhos, ${noEst(R[S.iMax])}.` });
    // 3
    let iM = 1; for (let k = 1; k < R.length; k++) if (R[k].mortes > R[iM].mortes) iM = k;
    const cM = Object.entries(R[iM].mc).sort((a, b) => b[1] - a[1])[0];
    out.push({ q: 'Em qual estação aconteceu o maior número de mortes?', a: R[iM].mortes > 0 ? `${nomeEst(R[iM])}: ${fmt(R[iM].mortes)} mortes. Principal causa: ${cM[0]} (${fmt(cM[1])}).` : 'Não houve mortes.' });
    // 4/5
    let iW = -1, wq = -1;
    R.forEach((r, k) => { if (k > 0 && r.est === 3 && r.Nini + r.nasc >= 20) { const q = r.mortes / (r.Nini + r.nasc); if (q > wq) { wq = q; iW = k; } } });
    out.push({ q: 'Qual foi o pior inverno?', a: iW > 0 ? `O inverno do ano ${R[iW].ano}: ${pct(wq)} dos coelhos morreram (${fmt(R[iW].mortes)} mortes; índice alimentar ${pct(R[iW].indAlim)}).` : 'Não houve invernos com coelhos.' });
    out.push({ q: 'Quantos coelhos sobreviveram ao pior inverno?', a: iW > 0 ? `${fmt(R[iW].N)} coelhos chegaram vivos ao fim desse inverno.` : '—' });
    // 6
    const eG = evt('grama_degrada');
    out.push({ q: 'Em que momento a grama começou a apresentar degradação significativa?', a: eG ? `${nomeEst(R[eG.i])}: o vigor das raízes ficou abaixo de 70%. ${eG.texto}` : `O vigor das raízes nunca caiu abaixo de 70% (mínimo: ${pct(Math.min(...R.map(r => r.R)))}).` });
    // 7
    const minHs = Math.min(...R.map(r => r.Hs));
    out.push({ q: 'Os arbustos conseguiram resistir ao consumo ou começaram a desaparecer?', a: `Mínimo de ${pct(minHs / R[0].Hs)} da biomassa lenhosa inicial; ao final, ${pct(S.final.Hs / R[0].Hs)}. ` + (S.final.Hs < 0.3 * R[0].Hs ? 'Os arbustos foram em grande parte destruídos.' : S.final.Hs < 0.7 * R[0].Hs ? 'Houve perda importante, mas parcial.' : 'Os arbustos resistiram.') });
    // 8
    const eA = evt('arvore_morte');
    out.push({ q: `A única árvore sobreviveu aos ${P.anos} anos?`, a: eA ? `Não. Ela morreu ${noEst(R[eA.i])}, depois que a casca foi roída durante crises alimentares.` : `Sim. Saúde final ${pct(S.final.arvSaude)}, integridade da casca ${pct(R[R.length - 1].arvCasca)}.` });
    // 9
    const eR = evt('recuperacao');
    out.push({ q: 'A ilha conseguiu recuperar a vegetação depois de uma superpopulação?', a: eR ? `Sim, parcialmente: ${eR.texto} (${noEst(R[eR.i])}).` : (Math.min(...R.map(r => r.R)) >= 0.6 ? 'A vegetação não chegou a degradar a ponto de precisar de recuperação.' : 'Não: após a degradação, o vigor da grama não voltou acima de 85%.') });
    // 10
    const Kp = res.anual.map(a => a.Kprim);
    out.push({ q: 'A capacidade de suporte caiu em relação aos 6.000 iniciais?', a: `A capacidade da estação chuvosa principal foi de ${fmt(Kp[0])} no ano 1 e de ${fmt(Kp[Kp.length - 1])} no ano ${Kp.length}. A capacidade sustentável anual (gargalo do ano) terminou em ${fmt(S.final.Ksust)}.` });
    // 11
    let falha = null;
    res.anual.forEach((a, k) => { if (k > 0 && a.multPrim >= 1.1 && a.Nfim <= res.anual[k - 1].Nfim && res.anual[k - 1].Nfim > 0) falha = falha || a; });
    out.push({ q: 'Houve algum momento em que uma estação chuvosa farta não conseguiu recuperar a população?', a: falha ? `Sim: no ano ${falha.ano} a estação chuvosa teve ${pct(falha.multPrim)} da chuva média, mas a população terminou o ano com ${fmt(falha.Nfim)} (sem crescimento), porque a vegetação estava degradada (vigor ${pct(falha.R)}).` : 'Não foi identificado um ano com estação chuvosa farta (≥110%) seguido de população estagnada ou em queda.' });
    // 12
    const ultG = R.filter(r => r.F !== null).pop() || R[0];
    const fF = ultG.F, mE = S.mcTot.endogamia;
    const Fmax = Math.max(...R.filter(r => r.F !== null).map(r => r.F));
    out.push({ q: 'A consanguinidade prejudicou significativamente os coelhos?', a: `F médio ${S.extinta ? 'no último registro com coelhos' : 'final'} = ${fF.toFixed(3)} (máximo ${Fmax.toFixed(3)}); diversidade genética = ${pct(ultG.He)} da inicial. Já na 2ª geração, filhos de irmãos têm F ≈ 0,25: o gargalo de dois fundadores impõe esse custo de imediato. ${fmt(mE)} mortes de filhotes foram atribuídas à depressão endogâmica (${pct(mE / Math.max(1, S.mortes))} de todas as mortes). ` + (mE / Math.max(1, S.mortes) > 0.1 ? 'Efeito relevante.' : 'Efeito real, mas secundário frente à fome e à degradação.') });
    // 13/14
    const ult = R.slice(-40).map(r => r.N);
    const media = ult.reduce((a, b) => a + b, 0) / ult.length;
    const cv = media > 0 ? Math.sqrt(ult.reduce((a, b) => a + (b - media) ** 2, 0) / ult.length) / media : 0;
    out.push({ q: 'A população encontrou algum equilíbrio?', a: media === 0 ? 'Não — a população foi extinta.' : cv < 0.25 ? `Sim, aproximadamente: nos últimos 10 anos a média foi ${fmt(Math.round(media))} com variação de ${pct(cv)}.` : `Não um equilíbrio estável: nos últimos 10 anos a média foi ${fmt(Math.round(media))}, mas oscilou ${pct(cv)} (coeficiente de variação), com o ciclo sazonal de nascimentos e mortes.` });
    out.push({ q: 'Houve ciclos recorrentes de crescimento e colapso?', a: S.colapsos >= 2 ? `Sim: ${S.colapsos} colapsos (queda > 50% em uma estação, partindo de ≥100 coelhos).` : S.colapsos === 1 ? 'Houve um colapso, mas não um ciclo recorrente.' : 'Não houve colapsos de mais de 50% em uma estação.' });
    // 15
    out.push({ q: 'Existe risco realista de extinção local?', a: S.extinta ? `Nesta execução, sim: a população foi extinta ${mesTexto(S.mesExtincao)}. Veja as repetições de Monte Carlo para a probabilidade.` : `Nesta execução a população sobreviveu (mínimo após o primeiro ano: ${fmt(Math.min(...R.slice(5).map(r => r.N)))}). A probabilidade deve ser lida nas repetições de Monte Carlo.` });
    // 16
    if (P.predadores.length) {
      const mp = S.mcTot.predacao || 0;
      const tipos = [...new Set(P.predadores.map(x => x.tipo))];
      const fim = R[R.length - 1];
      const estado = tipos.map(t => `${PRED_TIPOS[t].nome}: ${fim.pred[t] || 0} no final (máximo ${Math.max(...R.map(r => r.pred[t] || 0))})`).join('; ');
      const ini = Math.min(...P.predadores.map(x => x.ano));
      const depois = R.filter(r => !r.inicial && r.ano >= ini + 2);
      const mediaN = depois.length ? Math.round(depois.reduce((a, r) => a + r.N, 0) / depois.length) : 0;
      out.push({ q: 'Os predadores controlaram a população de coelhos?', a: `${fmt(mp)} coelhos foram mortos por predadores (${pct(mp / Math.max(1, S.mortes))} de todas as mortes). ${estado}. Depois da chegada dos predadores, a população média foi de ${fmt(mediaN)} coelhos. Compare com o cenário sem predadores para ver o efeito.` });
    }
    out.push({ q: `Qual foi o estado geral da ilha ao final dos ${P.anos} anos?`, a: `Índice de saúde do ecossistema ${Math.round(S.final.saude)}/100. Grama ${fmt(Math.round(S.final.Gg + S.final.Gd))} kg/ha (vigor ${pct(S.final.R)}), arbustos ${pct(S.final.Hs / S.final.Hs0)} do inicial, árvore ${S.final.arvViva ? 'viva' : 'morta'}, solo com ${fmt(S.final.erosao)} t/ha de erosão acumulada e ${S.final.prof.toFixed(1)} cm de profundidade; ${fmt(S.Nfinal)} coelhos.` });
    return out;
  }

  /* ---------------- Monte Carlo ---------------- */
  function linhaMC(res) {
    const fimR = res.registros[res.registros.length - 1];
    return { predFinal: fimR.predTotal, predMax: Math.max(...res.registros.map(r => r.predTotal)), predSobrevive: res.parametros.predadores.length ? fimR.predTotal > 0 : null,
      Nmedio: Math.round(res.registros.reduce((a, r) => a + r.N, 0) / res.registros.length),
      semente: res.parametros.semente, extinta: res.resumo.extinta, mesExt: res.mesExtincao, Nmax: res.resumo.Nmax, Nfinal: res.resumo.Nfinal, colapsos: res.resumo.colapsos, crises: res.resumo.crises, arvMorreu: !res.resumo.final.arvViva, Rfinal: res.resumo.final.R, HsFinal: r3(res.resumo.final.Hs / res.resumo.final.Hs0), Ffinal: res.resumo.final.F, saude: res.resumo.final.saude };
  }
  function monteCarlo(params, reps, sementeBase, onProgress) {
    const series = [], runs = [];
    for (let r = 0; r < reps; r++) {
      const res = simular(Object.assign({}, params, { semente: (sementeBase || 1000) + r }));
      series.push(res.registros.map(x => x.N));
      runs.push(linhaMC(res));
      if (onProgress) onProgress(r + 1, reps);
    }
    return resumirMC(series, runs);
  }
  function resumirMC(series, runs) {
    const n = series.length, T = series[0].length;
    const q = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
    const bandas = { p5: [], p25: [], p50: [], p75: [], p95: [] };
    for (let t = 0; t < T; t++) { const col = series.map(s => s[t]); bandas.p5.push(Math.round(q(col, 0.05))); bandas.p25.push(Math.round(q(col, 0.25))); bandas.p50.push(Math.round(q(col, 0.5))); bandas.p75.push(Math.round(q(col, 0.75))); bandas.p95.push(Math.round(q(col, 0.95))); }
    const ext = runs.filter(r => r.extinta).length;
    const media = (k) => runs.reduce((a, r) => a + (r[k] || 0), 0) / n;
    return {
      reps: n, bandas,
      pExtincao: r3(ext / n), pArvoreMorre: r3(runs.filter(r => r.arvMorreu).length / n),
      NmaxMed: Math.round(q(runs.map(r => r.Nmax), 0.5)), NfinalMed: Math.round(q(runs.map(r => r.Nfinal), 0.5)),
      NfinalP5: Math.round(q(runs.map(r => r.Nfinal), 0.05)), NfinalP95: Math.round(q(runs.map(r => r.Nfinal), 0.95)),
      colapsosMed: r2(media('colapsos')), crisesMed: r2(media('crises')), RfinalMed: r3(media('Rfinal')), HsFinalMed: r3(media('HsFinal')),
      FfinalMed: r3(runs.filter(r => r.Ffinal !== null).reduce((a, r) => a + r.Ffinal, 0) / Math.max(1, runs.filter(r => r.Ffinal !== null).length)),
      saudeMed: r1(media('saude')),
      NmedioMed: Math.round(q(runs.map(r => r.Nmedio), 0.5)),
      predMaxMed: Math.round(q(runs.map(r => r.predMax), 0.5)),
      pPredSobrevive: runs[0].predSobrevive === null ? null : r3(runs.filter(r => r.predSobrevive).length / n),
      histFinal: histograma(runs.map(r => r.Nfinal)),
      runs
    };
  }
  function histograma(v) {
    const max = Math.max(1, ...v), nb = 12, w = Math.ceil((max + 1) / nb);
    const b = new Array(nb).fill(0); v.forEach(x => { b[Math.min(nb - 1, Math.floor(x / w))]++; });
    return { largura: w, contagens: b };
  }

  /* ---------------- Duração variável ----------------
     Com a mesma semente, os primeiros N anos de uma simulação de 100 anos são
     idênticos a uma simulação de N anos (o clima é gerado ano a ano e a
     demografia mês a mês, em sequência). Por isso o site pré-calcula 100 anos
     e recorta para qualquer duração, recalculando eventos e resumos. */
  function truncar(res, anos) {
    anos = clamp(Math.floor(anos), 1, res.parametros.anos);
    if (anos === res.parametros.anos) return res;
    const meses = anos * 12, n = anos * 4 + 1;
    const r = Object.assign({}, res);
    r.parametros = Object.assign({}, res.parametros, { anos });
    r.registros = res.registros.slice(0, n);
    r.mensal = Object.fromEntries(Object.entries(res.mensal).map(([k, v]) => [k, v.slice(0, meses)]));
    r.clima = res.clima.slice(0, anos);
    r.genealogia = res.genealogia.filter(g => g.nasc < meses).map(g => Object.assign({}, g, { morte: g.morte !== null && g.morte < meses ? g.morte : null }));
    r.mesExtincao = res.mesExtincao !== null && res.mesExtincao < meses ? res.mesExtincao : null;
    r.primeiraNinhada = res.primeiraNinhada !== null && res.primeiraNinhada < meses ? res.primeiraNinhada : null;
    r.anual = tabelaAnual(r); r.eventos = detectarEventos(r); r.resumo = resumir(r);
    return r;
  }
  // Resumo compacto de uma repetição (série sazonal de N + indicadores anuais)
  function repCompacto(res) {
    const R = res.registros, Y = res.parametros.anos, Hs0 = R[0].Hs;
    const anual = (f) => Array.from({ length: Y + 1 }, (_, y) => f(R[y * 4]));
    let arv = null; for (let y = 0; y <= Y; y++) if (!R[y * 4].arvViva) { arv = y; break; }
    const o = { N: R.map(r => r.N), R: anual(r => r2(r.R)), H: anual(r => r2(r.Hs / Hs0)), S: anual(r => Math.round(r.saude)), F: anual(r => r.F === null ? null : r2(r.F)), A: arv };
    if (res.parametros.predadores.length) o.P = anual(r => r.predTotal);
    return o;
  }
  // Monte Carlo para os primeiros `anos` a partir das repetições compactas
  function mcDeReps(reps, anos) {
    const idx = anos * 4;
    const series = reps.map(r => r.N.slice(0, idx + 1));
    const runs = reps.map((r, k) => {
      const s = series[k];
      let colapsos = 0; for (let i = 1; i < s.length; i++) if (s[i - 1] >= 100 && s[i] < 0.5 * s[i - 1]) colapsos++;
      const i0 = s.indexOf(0, 1);
      return {
        extinta: s[idx] === 0, mesExt: i0 > 0 ? i0 * 3 : null, Nmax: Math.max(...s), Nfinal: s[idx], Nmedio: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
        colapsos, crises: 0, arvMorreu: r.A !== null && r.A <= anos, Rfinal: r.R[anos], HsFinal: r.H[anos], Ffinal: r.F ? r.F.slice(0, anos + 1).filter(v => v !== null).pop() : null, saude: r.S[anos],
        predSobrevive: r.P ? r.P[anos] > 0 : null, predMax: r.P ? Math.max(...r.P.slice(0, anos + 1)) : 0, predFinal: r.P ? r.P[anos] : 0
      };
    });
    return resumirMC(series, runs);
  }

  /* Série compacta de uma execução (para comparação de cenários) */
  function compactar(res) {
    const R = res.registros;
    return {
      N: R.map(r => r.N), grama: R.map(r => Math.round(r.Gg + r.Gd)), R: R.map(r => r.R), Hs: R.map(r => Math.round(r.Hs)),
      arvore: R.map(r => r.arvSaude), solo: R.map(r => r.soloSaude), F: R.map(r => r.F), K: R.map(r => r.K), saude: R.map(r => r.saude),
      pred: R.map(r => r.predTotal), predPor: Object.fromEntries(Object.keys(R[0].pred).map(t => [t, R.map(r => r.pred[t])])),
      resumo: res.resumo, eventos: res.eventos.map(e => ({ i: e.i, tipo: e.tipo, titulo: e.titulo }))
    };
  }

  /* CSV */
  function csvSazonal(res) {
    const cab = ['indice', 'ano', 'estacao', 'populacao', 'nascimentos', 'mortes', 'taxa_sobrevivencia', 'femeas_reprodutivas', 'filhotes_imaturos', 'adultos', 'machos', 'femeas', 'idade_media_meses',
      ...CAUSAS.map(c => 'mortes_' + c), 'F_medio', 'F_nascidos', 'diversidade_He_rel', 'alelos_por_locus', 'Ne_demografico', 'geracao_max',
      'grama_verde_kg_ha', 'grama_seca_kg_ha', 'vigor_raizes', 'banco_sementes', 'arbusto_brotos_kg_ha', 'arbusto_lenho_kg_ha', 'arvore_saude', 'arvore_casca', 'arvore_viva',
      'cobertura', 'materia_organica', 'erosao_acum_t_ha', 'profundidade_solo_cm', 'umidade_solo', 'chuva_mm', 'temperatura_C', 'indice_alimentar', 'K_estacao', 'K_sustentavel_anual', 'saude_ecossistema', 'predadores_total'];
    const linhas = [cab.join(';')];
    res.registros.forEach(r => {
      linhas.push([r.i, r.ano, r.inicial ? 'Início' : ESTACOES[r.est], r.N, r.nasc, r.mortes, r.sobrev, r.femRep, r.filhotes, r.adultos, r.machos, r.femeas, r.idadeMedia,
        ...CAUSAS.map(c => r.mc[c]), r.F, r.Fnasc, r.He, r.alelos, r.Ne, r.gerMax,
        r.Gg, r.Gd, r.R, r.S, r.Hb, r.Hs, r.arvSaude, r.arvCasca, r.arvViva ? 1 : 0,
        r.cobertura, r.MO, r.erosaoAcum, r.prof, r.umidade, r.chuva, r.T, r.indAlim, r.K, r.Ksust, r.saude, r.predTotal
      ].map(v => v === null || v === undefined ? '' : String(v).replace('.', ',')).join(';'));
    });
    return linhas.join('\n');
  }
  function csvAnual(res) {
    const cab = ['ano', 'chuva_mm', 'chuva_estacao_chuvosa_mm', 'mult_estacao_chuvosa', 'temperatura_C', 'N_max', 'N_min', 'N_fim', 'nascimentos', 'mortes', 'grama_media_kg_ha', 'vigor_raizes', 'arbustos_lenho_kg_ha', 'arvore_saude', 'solo_saude', 'erosao_t_ha', 'indice_alimentar', 'K_estacao_chuvosa', 'K_sustentavel', 'F', 'He_rel', 'Ne_harmonico', 'geracoes', 'saude_ecossistema'];
    const linhas = [cab.join(';')];
    res.anual.forEach(a => linhas.push([a.ano, a.chuva, a.chuvaPrim, a.multPrim, a.T, a.Nmax, a.Nmin, a.Nfim, a.nasc, a.mortes, a.gramaMedia, a.R, a.arbustos, a.arvore, a.solo, a.erosao, a.alimento, a.Kprim, a.Ksust, a.F, a.He, a.Ne, a.ger, a.saude].map(v => v === null || v === undefined ? '' : String(v).replace('.', ',')).join(';')));
    return linhas.join('\n');
  }

  return {
    VERSAO, ESTACOES, REGIMES, PADRAO, PARAM_META, CENARIOS, CENARIOS_PRED, FUNDADORES_ALT, CAUSAS, PRED_TIPOS,
    simular, monteCarlo, resumirMC, linhaMC, compactar, truncar, repCompacto, mcDeReps, analisar, csvSazonal, csvAnual,
    _interno: { gerarClima, calibrar, mulberry32, estadoInicial, passoVegetacao }
  };
});
