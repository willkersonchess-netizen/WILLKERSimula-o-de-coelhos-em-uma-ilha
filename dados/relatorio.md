# Ilha — relatório automático (50 anos)

Gerado em 2026-11-08T12:47:05.482Z · motor v2.2.0 · semente 42. No site é possível escolher de 10 a 100 anos.

População: 2 → máx 7397 → final 87 · nascimentos 44308 · mortes 44223 · colapsos 7

Monte Carlo (80 rep.): P(extinção em 50 anos) = 74% · em 100 anos = 99%

## Perguntas

**1. Em qual ano ocorreu a primeira grande explosão populacional?**

No ano 3 (verão): a população chegou a 586, mais que o triplo de um ano antes (106).

**2. Qual foi a maior população registrada?**

7.397 coelhos, no verão do ano 5.

**3. Em qual estação aconteceu o maior número de mortes?**

Verão do ano 5: 5.856 mortes. Principal causa: endogamia (2.027).

**4. Qual foi o pior inverno?**

O inverno do ano 5: 82% dos coelhos morreram (4.007 mortes; índice alimentar 26%).

**5. Quantos coelhos sobreviveram ao pior inverno?**

851 coelhos chegaram vivos ao fim desse inverno.

**6. Em que momento a grama começou a apresentar degradação significativa?**

Outono do ano 5: o vigor das raízes ficou abaixo de 70%. O vigor das raízes caiu para 47% do original por sobrepastejo.

**7. Os arbustos conseguiram resistir ao consumo ou começaram a desaparecer?**

Mínimo de 0% da biomassa lenhosa inicial; ao final, 1%. Os arbustos foram em grande parte destruídos.

**8. A única árvore sobreviveu aos 50 anos?**

Sim. Saúde final 59%, integridade da casca 66%.

**9. A ilha conseguiu recuperar a vegetação depois de uma superpopulação?**

Não: após a degradação, o vigor da grama não voltou acima de 85%.

**10. A capacidade de suporte caiu em relação aos 6.000 iniciais?**

A capacidade da primavera foi de 6.442 no ano 1 e de 1.077 no ano 50. A capacidade sustentável anual (gargalo do ano) terminou em 538.

**11. Houve algum momento em que uma primavera chuvosa não conseguiu recuperar a população?**

Sim: no ano 8 a primavera teve 122% da chuva média, mas a população terminou o ano com 62 (sem crescimento), porque a vegetação estava degradada (vigor 12%).

**12. A consanguinidade prejudicou significativamente os coelhos?**

F médio final = 0.602 (máximo 0.611); diversidade genética = 49% da inicial. Já na 2ª geração, filhos de irmãos têm F ≈ 0,25: o gargalo de dois fundadores impõe esse custo de imediato. 15.315 mortes de filhotes foram atribuídas à depressão endogâmica (35% de todas as mortes). Efeito relevante.

**13. A população encontrou algum equilíbrio?**

Não um equilíbrio estável: nos últimos 10 anos a média foi 133, mas oscilou 180% (coeficiente de variação), com o ciclo sazonal de nascimentos e mortes.

**14. Houve ciclos recorrentes de crescimento e colapso?**

Sim: 7 colapsos (queda > 50% em uma estação, partindo de ≥100 coelhos).

**15. Existe risco realista de extinção local?**

Nesta execução a população sobreviveu (mínimo após o primeiro ano: 9). A probabilidade deve ser lida nas repetições de Monte Carlo.

**16. Qual foi o estado geral da ilha ao final dos 50 anos?**

Índice de saúde do ecossistema 45/100. Grama 156 kg/ha (vigor 59%), arbustos 1% do inicial, árvore viva, solo com 550,1 t/ha de erosão acumulada e 25.8 cm de profundidade; 87 coelhos.

## Cenários (25 repetições, 50 anos)

| Cenário | P(extinção) | N médio | Colapsos | Predador sobrevive |
|---|---|---|---|---|
| Chuva média (original) | 72% | 255 | 3.84 | — |
| A · Primaveras secas | 96% | 201 | 2.72 | — |
| B · Primaveras chuvosas | 48% | 309 | 5.08 | — |
| C · Poucos arbustos | 80% | 200 | 3.24 | — |
| D · Muitos arbustos | 84% | 317 | 4.48 | — |
| E · Recuperação lenta | 100% | 148 | 1.44 | — |
| F · Recuperação rápida | 16% | 394 | 7.72 | — |
| G · Depressão endogâmica forte | 88% | 216 | 1.4 | — |
| H · Depressão endogâmica fraca | 68% | 248 | 4.28 | — |
| I · Ilha maior (400 ha) | 100% | 274 | 1.52 | — |
| Gatos ferais (4 no ano 3) | 80% | 12 | 1.04 | 60% |
| Raposas (casal no ano 3) | 84% | 258 | 3.56 | 0% |
| Arminhos (4 no ano 3) | 76% | 264 | 3.88 | 0% |
| Aves de rapina (desde o ano 1) | 8% | 269 | 2.8 | 92% |
| Gatos junto com os coelhos (ano 1) | 88% | 8 | 0.72 | 60% |
| Gatos + aves de rapina | 68% | 11 | 0.44 | 80% |
| Gatos numa ilha maior (400 ha) | 16% | 40 | 0.36 | 96% |
| Dois machos | 100% | 0 | 0 | — |
| Casal de filhotes (1 mês) | 84% | 225 | 2.72 | — |
| Fêmea infértil | 100% | 0 | 0 | — |
