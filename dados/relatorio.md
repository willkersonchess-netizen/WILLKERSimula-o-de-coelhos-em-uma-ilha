# Ilha — 40 anos — relatório automático

Gerado em 2026-11-08T08:09:58.969Z · motor v2.1.0 · semente 42

População: 2 → máx 6704 → final 0 · nascimentos 37509 · mortes 37511 · colapsos 6

Monte Carlo (100 rep.): P(extinção) = 69% · N final mediano 0

## Perguntas

**1. Em qual ano ocorreu a primeira grande explosão populacional?**

No ano 3 (verão): a população chegou a 591, mais que o triplo de um ano antes (115).

**2. Qual foi a maior população registrada?**

6.704 coelhos, no verão do ano 5.

**3. Em qual estação aconteceu o maior número de mortes?**

Primavera do ano 5: 5.490 mortes. Principal causa: endogamia (3.038).

**4. Qual foi o pior inverno?**

O inverno do ano 5: 73% dos coelhos morreram (3.243 mortes; índice alimentar 31%).

**5. Quantos coelhos sobreviveram ao pior inverno?**

1.199 coelhos chegaram vivos ao fim desse inverno.

**6. Em que momento a grama começou a apresentar degradação significativa?**

Outono do ano 5: o vigor das raízes ficou abaixo de 70%. O vigor das raízes caiu para 63% do original por sobrepastejo.

**7. Os arbustos conseguiram resistir ao consumo ou começaram a desaparecer?**

Mínimo de 0% da biomassa lenhosa inicial; ao final, 1%. Os arbustos foram em grande parte destruídos.

**8. A única árvore sobreviveu aos 40 anos?**

Sim. Saúde final 62%, integridade da casca 68%.

**9. A ilha conseguiu recuperar a vegetação depois de uma superpopulação?**

Não: após a degradação, o vigor da grama não voltou acima de 85%.

**10. A capacidade de suporte caiu em relação aos 6.000 iniciais?**

A capacidade da primavera foi de 6.442 no ano 1 e de 743 no ano 40. A capacidade sustentável anual (gargalo do ano) terminou em 387.

**11. Houve algum momento em que uma primavera chuvosa não conseguiu recuperar a população?**

Sim: no ano 13 a primavera teve 114% da chuva média, mas a população terminou o ano com 16 (sem crescimento), porque a vegetação estava degradada (vigor 20%).

**12. A consanguinidade prejudicou significativamente os coelhos?**

F médio no último registro com coelhos = 0.500 (máximo 0.531); diversidade genética = 33% da inicial. Já na 2ª geração, filhos de irmãos têm F ≈ 0,25: o gargalo de dois fundadores impõe esse custo de imediato. 12.921 mortes de filhotes foram atribuídas à depressão endogâmica (34% de todas as mortes). Efeito relevante.

**13. A população encontrou algum equilíbrio?**

Não um equilíbrio estável: nos últimos 10 anos a média foi 245, mas oscilou 164% (coeficiente de variação), com o ciclo sazonal de nascimentos e mortes.

**14. Houve ciclos recorrentes de crescimento e colapso?**

Sim: 6 colapsos (queda > 50% em uma estação, partindo de ≥100 coelhos).

**15. Existe risco realista de extinção local?**

Nesta execução, sim: a população foi extinta no inverno do ano 38. Veja as repetições de Monte Carlo para a probabilidade.

**16. Qual foi o estado geral da ilha ao final dos 40 anos?**

Índice de saúde do ecossistema 43/100. Grama 121 kg/ha (vigor 48%), arbustos 1% do inicial, árvore viva, solo com 386,2 t/ha de erosão acumulada e 27.0 cm de profundidade; 0 coelhos.

## Cenários (30 repetições cada)

| Cenário | P(extinção) | N médio | N final | Colapsos | Predador sobrevive |
|---|---|---|---|---|---|
| Chuva média (original) | 70% | 310 | 0 | 3.27 | — |
| A · Primaveras secas | 93% | 231 | 0 | 2.6 | — |
| B · Primaveras chuvosas | 53% | 376 | 0 | 4.43 | — |
| C · Poucos arbustos | 67% | 282 | 0 | 3.43 | — |
| D · Muitos arbustos | 70% | 361 | 0 | 4.27 | — |
| E · Recuperação lenta | 100% | 180 | 0 | 1.5 | — |
| F · Recuperação rápida | 17% | 462 | 42 | 6.33 | — |
| G · Depressão endogâmica forte | 73% | 285 | 0 | 1.33 | — |
| H · Depressão endogâmica fraca | 73% | 293 | 0 | 3.93 | — |
| Gatos ferais (4 no ano 3) | 57% | 294 | 0 | 2.57 | 0% |
| Raposas (casal no ano 3) | 67% | 285 | 0 | 3.13 | 0% |
| Arminhos (4 no ano 3) | 53% | 339 | 0 | 4 | 0% |
| Aves de rapina (desde o ano 1) | 7% | 310 | 90 | 2.43 | 93% |
| Gatos junto com os coelhos (ano 1) | 60% | 315 | 0 | 2.4 | 0% |
| Gatos + aves de rapina | 20% | 312 | 67 | 1.83 | 80% |
| Dois machos | 100% | 0 | 0 | 0 | — |
| Casal de filhotes (1 mês) | 83% | 214 | 0 | 1.8 | — |
| Fêmea infértil | 100% | 0 | 0 | 0 | — |
