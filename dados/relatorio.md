# Ilha 40 — Relatório automático

Gerado em 2026-11-08T07:29:08.868Z · motor v2.0.0 · semente 42

## Resumo da execução original

| Indicador | Valor |
|---|---|
| População inicial | 2 |
| População máxima | 6704 (registro 18) |
| População final | 0 |
| Nascimentos | 37509 |
| Mortes | 37511 |
| Crises alimentares | 5 |
| Colapsos (>50% em uma estação) | 6 |
| Saúde final do ecossistema | 42.9/100 |

## Monte Carlo (100 repetições)

- Probabilidade de extinção em 40 anos: **69%**
- População final (mediana / P5–P95): 0 / 0–327
- Colapsos médios: 3.59

## As 16 perguntas

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

## Cenários (40 repetições cada)

| Cenário | P(extinção) | N final (mediana) | Colapsos | Vigor da grama | Arbustos |
|---|---|---|---|---|---|
| Chuva média (original) | 70% | 0 | 3.35 | 79% | 17% |
| A · Primaveras secas | 93% | 0 | 2.55 | 86% | 18% |
| B · Primaveras chuvosas | 53% | 0 | 4.55 | 63% | 16% |
| C · Poucos arbustos | 70% | 0 | 3.48 | 75% | 29% |
| D · Muitos arbustos | 73% | 0 | 4.22 | 76% | 10% |
| E · Recuperação lenta | 100% | 0 | 1.48 | 90% | 13% |
| F · Recuperação rápida | 15% | 42 | 6.43 | 51% | 16% |
| G · Depressão endogâmica forte | 68% | 0 | 1.48 | 89% | 26% |
| H · Depressão endogâmica fraca | 75% | 0 | 3.98 | 77% | 18% |
| Dois machos | 100% | 0 | 0 | 100% | 126% |
| Casal de filhotes (1 mês) | 88% | 0 | 1.58 | 91% | 69% |
| Fêmea infértil | 100% | 0 | 0 | 100% | 126% |
