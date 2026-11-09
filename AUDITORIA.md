# Auditoria do simulador · motor v2.2 → v2.3

Auditoria do código existente (`js/engine.js`), feita sobre a mesma arquitetura: nenhum arquivo foi
reescrito por inteiro, nenhum simulador paralelo foi criado e o design do site não foi alterado.
Todos os números abaixo vêm de testes **executados** com Node.js, comparando uma cópia guardada do
motor v2.2 (linha de base) com o motor v2.3, com as mesmas condições iniciais e as mesmas sementes.

## 1. Como o simulador funciona (diagnóstico)

- `js/engine.js`: modelo baseado em indivíduos, passo mensal. Ordem de cada mês: clima → água e
  vegetação → alimentação dos coelhos (balanço de massa) → danos do pastejo → solo → predação →
  mortalidade (riscos competitivos) → dinâmica dos predadores → reprodução dos coelhos → registro
  sazonal.
- `simular.js` pré-calcula 100 anos (original + 80 repetições + 20 cenários) em `dados/resultados.js`;
  o site recorta para qualquer duração (verificado: idêntico a simular N anos).
- `js/app.js` só lê os registros sazonais e os resumos; o Laboratório chama o mesmo motor.
- Aleatoriedade: dois geradores independentes (clima e demografia), ambos determinísticos pela
  semente. **Teste:** a mesma semente reproduz exatamente a mesma simulação (OK).

## 2. Por que a simulação parecia básica: evidências

| Sintoma | Evidência (40 sementes, 50 anos, linha de base) | Causa |
|---|---|---|
| A primeira explosão é sempre igual | Pico no ano 5–6 em 35/40 sementes; 1º colapso no ano 5–6 em 33/40 | Crescimento inicial sem limite de comida: a taxa de crescimento é quase constante (efeito biológico real, não bug). Depois do 1º colapso as trajetórias divergem muito (extinção entre os anos 1 e 50). |
| Predadores morrem pouco depois de chegar | Raposas: persistência mediana de 3 anos; arminhos: 3,3 anos | Ver seção 3 (mistura de efeito ecológico real com 4 erros de implementação). |
| Doenças quase nunca aconteciam | Surtos em 3 de 40 execuções | Limiar de 20 coelhos/ha com probabilidade muito baixa: o recurso existia, mas era inerte. |
| Ano seco não era mais quente | Correlação chuva × temperatura = −0,07 | Temperatura sorteada independentemente da chuva. |
| Pasto voltava "do nada" | Rebrota de 5%/mês da diferença até 100%, mesmo com 5% de raízes vivas | Equação de regeneração não dependia das raízes vivas. |

## 3. O problema dos predadores

**Não existe temporizador, multiplicador ou regra que mate os predadores numa data.** O rastreamento
mês a mês (cópia instrumentada do motor) mostrou:

1. **Efeito ecológico real (principal):** os predadores chegam no ano 3, *antes* da explosão, quando há
   120–300 coelhos. Um casal de raposas come ~28 coelhos/mês (~340/ano), mais do que essa população
   repõe: os coelhos caem para ~40 e as raposas passam fome (ingestão 1,1 → 0,2; condição 1,0 → 0,4).
   Chegando no ano 6, com ~2.400 coelhos, elas enfrentam o colapso por sobrepastejo que vem logo depois.
   É a superexploração do modelo de Lotka–Volterra.
2. **Erros de implementação que agravavam o efeito (categoria A, corrigidos):**
   - *Unidade:* o limite de caça (`kmax = 1,25 × necessidade`) era contado em **número de presas**, mas a
     necessidade é em **coelhos-adultos equivalentes**. Como os predadores preferem filhotes (0,4 de um
     adulto), um predador que caça filhotes nunca conseguia suprir a necessidade.
   - *Balanço de massa:* os predadores eram alimentados com as mortes **esperadas**, não com as que de
     fato ocorriam (um coelho que morre de fome não pode ser caçado).
   - *Sexo:* não havia sexo nos predadores; a cada mês cada adulto era "fêmea" com 50% de chance.
   - *Território:* jovens sem território **morriam imediatamente**. Na natureza viram flutuantes.
   - *Parâmetros:* arminho com o dobro da necessidade energética real (5 → 2,5 coelhos-eq./mês) e aves de
     rapina a 12 indivíduos/km² (irrealista; agora 3/km²).

## 4. Achados por categoria

Prioridade: 1 = maior. Dificuldade/risco: B = baixo, M = médio, A = alto.

### Categoria A — erros e comportamentos artificiais

| # | Achado | Onde | Por que é problema | Correção | Impacto | Pri. | Dif./risco | Status |
|---|---|---|---|---|---|---|---|---|
| A1 | Limite de caça em número de presas × necessidade em biomassa | predação, `kmax` | Predadores de filhotes nunca se saciavam | `kmax` dividido pela massa média da presa | Predadores conseguem se alimentar quando há presas | 1 | B/B | **Implementado** |
| A2 | Predadores comiam mortes esperadas, não realizadas | `predEaten` | Viola o balanço de massa | Cada morte por predação é atribuída a uma espécie e só ela come | Ingestão coerente com a mortalidade dos coelhos | 1 | B/B | **Implementado** |
| A3 | Sem sexo nos predadores | dinâmica dos predadores | Casal "de dois machos" podia reproduzir; sexo mudava todo mês | Adultos com contagem de fêmeas; raposas monogâmicas | Efeito Allee real em populações pequenas | 2 | M/B | **Implementado** |
| A4 | Jovens sem território morriam na hora | idem | Regra artificial que impedia repor adultos | Flutuantes: não se reproduzem, morrem 1,6× mais, ocupam vagas | Populações pequenas resistem mais a mortes isoladas | 2 | M/B | **Implementado** |
| A5 | Arminho com necessidade 2× maior; aves de rapina a 12/km² | `PRED_TIPOS` | Parâmetros irrealistas | 2,5 coelhos-eq./mês; 3 aves/km² | Aves de rapina deixam de "salvar" os coelhos (ver seção 6) | 2 | B/M | **Implementado** |
| A6 | Exposição das aves de rapina diferente da usada na caça | migração | Fórmulas inconsistentes | Mesma exposição (grama + arbustos) e resposta tipo III | Coerência | 3 | B/B | **Implementado** |
| A7 | Comentário dizia "tipo II" onde o código usa tipo III | `PRED_TIPOS` | Documentação errada | Corrigido | — | 4 | B/B | **Implementado** |

### Categoria B — simplificações importantes

| # | Achado | Onde | Melhoria | Impacto medido | Pri. | Dif./risco | Status |
|---|---|---|---|---|---|---|---|
| B1 | Rebrota da grama independia das raízes vivas | pastejo | Logística: `0,20·W·R·(1−R) + 0,02·W·(1−R)` (refúgios) + sementes | Recuperação após extinção: 6,0 → 2,6 anos (literatura: 2–5); lenta quando muito degradada. Calibração testada: r = 0,15 leva todos os cenários à extinção (ponto de virada) | 1 | M/**A** | **Implementado** (calibrado por teste) |
| B2 | Surtos de doença inertes | mortalidade | Limiar 15/ha e probabilidade dependente da densidade e da fome | 0,3 → 0,8 surtos por execução | 2 | B/B | **Implementado** |
| B3 | Temperatura independente da chuva | `gerarClima` | Primavera seca ⇒ ano mais quente (mais evaporação) | Secas mais severas e persistentes | 3 | B/B | **Implementado** |
| B4 | Predadores sem sazonalidade | dinâmica dos predadores | Custo energético no frio; presas alternativas escassas no inverno (×0,6) | Inverno vira gargalo para os predadores | 2 | B/B | **Implementado** |
| B5 | Predadores sem interferência entre si | predação | Beddington–DeAngelis acima da capacidade territorial | Limita explosões de predadores | 3 | B/B | **Implementado** |
| B6 | Configurações de predadores escassas | `PARAM_META` | Eficiência de caça (taxa de ataque de Holling), reprodução, mortalidade natural, território | Gatos eficientes ×2: coelhos médios 44; ×0,5: 250 | 2 | B/B | **Implementado** (aparecem sozinhos no Laboratório) |
| B7 | Só um casal fundador possível | fundadores | Parâmetro "Casais fundadores" (genética generalizada para 2·n alelos/locus) | 5 casais: pico sempre no mesmo ano (DP 0) | 3 | M/B | **Implementado** |
| B8 | Mortalidade juvenil basal fixa (9%/mês) | mortalidade | Depender de tocas e clima | — | 3 | B/M | Recomendação |
| B9 | Fenologia em calendário fixo (crescimento, secagem, reprodução) | perfis mensais | Início do crescimento disparado pelas chuvas | Mais variação no ano da 1ª explosão | 3 | M/M | Recomendação |
| B10 | Pouca variação individual nos coelhos (só ruído na condição) | indivíduos | Traço de "qualidade" individual herdável (fertilidade, forrageio) | Variância reprodutiva realista, Ne mais baixo | 4 | M/M | Recomendação |

### Categoria C — novas possibilidades (não implementadas)

| # | Mecanismo | Finalidade | Dificuldade |
|---|---|---|---|
| C1 | Presas alternativas como população dinâmica (aves marinhas que podem ser esgotadas) | Hiperpredação realista: gatos acabam com as aves e depois com os coelhos | M |
| C2 | Cenário de introdução de mixomatose ou doença hemorrágica viral | Testar o maior controle real de coelhos | M |
| C3 | Espaço explícito (grade de manchas) | Refúgios, tocas e predadores territoriais reais | A |
| C4 | "Paisagem do medo": coelhos reduzem o forrageio sob predação | Predadores afetam o pasto indiretamente | M |
| C5 | Estrutura etária dos predadores | Senescência e reprodução por idade | M |
| C6 | Evolução (seleção sobre fertilidade/resistência) | Adaptação ao longo de 100 anos | A |

## 5. Equações alteradas

```
ANTES  kPer = need·1,25·D²/(D²+h²)                      [presas/mês, comparadas com necessidade em biomassa]
DEPOIS kPer = (need·1,25·frio/massaMédia)·D²/(D²+h²/eficiência)/interferência

ANTES  ingestão = (mortes ESPERADAS + alternativas)/necessidade
DEPOIS ingestão = (mortes REALIZADAS atribuídas à espécie + alternativas·sazonalidade)/necessidade

ANTES  dR = 0,05·W·(1−R)                                [rebrota independente das raízes vivas]
DEPOIS dR = W·(0,20·R·(1−R) + 0,02·(1−R))               [logística + expansão a partir dos refúgios]

ANTES  anomalia de temperatura = 0,6·N(0,1)
DEPOIS anomalia de temperatura = 0,6·(−0,6·z_chuva + 0,8·N(0,1))

ANTES  surto se densidade > 20/ha: p = 0,004·(d/20 − 1)^1,5
DEPOIS surto se densidade > 15/ha: p = 0,012·(d/15 − 1)^1,2  (×2 com fome)
```

Conversões temporais conferidas e corretas: taxas anuais → mensais por `1 − (1 − a)^(1/12)`; riscos
mensais combinados por `1 − Π(1 − hᵢ)` (nenhuma taxa aplicada duas vezes); gestação de ~30 dias dentro
do passo mensal.

## 6. Testes executados (20 sementes, 50 anos, mesmas condições iniciais)

| Cenário | P(extinção) antes → depois | Coelhos médios | Colapsos | Diversidade de trajetórias* | Predador vivo no ano 50 |
|---|---|---|---|---|---|
| Chuva média (original) | 95% → 80% | 227 → 242 | 3,7 → 3,5 | 0,51 → 0,53 | — |
| Pouca chuva | 100% → 100% | 184 → 191 | 2,9 → 2,6 | 0,39 → 0,37 | — |
| Muita chuva | 40% → 65% | 280 → 312 | 5,3 → 5,6 | 0,71 → 0,65 | — |
| Poucos coelhos (casal de filhotes) | 95% → 100% | 76 → 63 | 0,9 → 0,6 | 0,60 → 0,51 | — |
| Muitos coelhos (5 casais)** | 95% → 90% | 227 → 266 | 3,7 → 4,6 | 0,51 → 0,43 | — |
| Muitos arbustos | 80% → 100% | 261 → 248 | 4,3 → 3,7 | 0,56 → 0,42 | — |
| Vegetação degradada | 100% → 100% | 159 → 154 | 1,6 → 1,6 | 0,24 → 0,18 | — |
| Gatos (4, ano 3) | 85% → 85% | 87 → 160 | 1,5 → 2,0 | 0,55 → 0,80 | 60% → 0% |
| Gatos eficientes ×2** | 85% → 90% | 87 → 44 | 1,5 → 0,9 | 0,55 → 0,34 | 60% → 0% |
| Gatos pouco eficientes ×0,5** | 85% → 65% | 87 → 250 | 1,5 → 3,3 | 0,55 → 0,88 | 60% → 0% |
| Gatos (2, ano 1) | 55% → 85% | 146 → 183 | 1,4 → 2,0 | 0,89 → 0,83 | 40% → 0% |
| Raposas (2, ano 3) | 70% → 90% | 236 → 263 | 4,3 → 4,4 | 0,63 → 0,64 | 0% → 0% |
| Arminhos (4, ano 3) | 75% → 95% | 201 → 251 | 3,5 → 4,3 | 0,69 → 0,66 | 0% → 0% |
| Aves de rapina (ano 1) | 5% → 90% | 261 → 239 | 2,5 → 3,7 | 0,27 → 0,44 | 95% → 10% |
| Gatos, ilha de 400 ha | 5% → 15% | — | — | — | 100% → 95% |

\* 1 − correlação média entre as séries log(N) de sementes diferentes (maior = trajetórias mais diferentes).
\*\* Parâmetros novos: na linha de base não existiam e foram ignorados.

**Recuperação ambiental:** anos até a grama voltar a 80% de vigor após a extinção dos coelhos: 6,0 → 2,6
(chuva média); 14,2 → 7,6 (vegetação degradada).

**Leitura honesta das diferenças:**
- Os gatos agora persistem menos numa ilha de 1 km², porque antes eram alimentados com coelhos que não
  morriam (A2) e não tinham inverno difícil (B4). Numa ilha de 400 ha, gatos e coelhos convivem (95% e 85%).
- O resultado anterior "aves de rapina salvam os coelhos" dependia de 12 aves/km², densidade irrealista.
  Com 3/km², elas não impedem o colapso. O texto do site agora é gerado pelos dados.
- O ano do 1º pico continua previsível (desvio-padrão de ~1,5 ano): isso é biologia (crescimento sem limite
  de comida), não falta de aleatoriedade.

## 7. Preservado

Design, cores, tipografia, cartões, gráficos, central de experimento, duração de 10–100 anos, Laboratório,
cenários, relatório, exportações, reprodutibilidade por semente e recorte de duração. Os quatro novos
controles de predadores e "Casais fundadores" aparecem automaticamente na grade existente do Laboratório.

## 8. Limitações que continuam

- Espaço implícito; refúgios aproximados (5%).
- Presas alternativas como reserva fixa (sazonal), não como população.
- Predadores sem estrutura etária; aves de rapina como migração simplificada.
- Coeficientes de vegetação, solo e predadores são hipóteses calibradas, não medições de uma ilha real.
- O ponto de virada da regeneração da grama (r entre 0,15 e 0,20) mostra que os resultados de longo prazo
  são sensíveis a esse parâmetro: use "Regeneração da grama" no Laboratório para explorar.
