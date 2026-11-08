# Ilha — 100 anos — relatório automático

Gerado em 2026-11-08T08:13:17.526Z · motor v2.1.0 · semente 42

População: 2 → máx 6704 → final 0 · nascimentos 37509 · mortes 37511 · colapsos 6

Monte Carlo (50 rep.): P(extinção) = 98% · N final mediano 0

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

Mínimo de 0% da biomassa lenhosa inicial; ao final, 41%. Houve perda importante, mas parcial.

**8. A única árvore sobreviveu aos 100 anos?**

Sim. Saúde final 76%, integridade da casca 91%.

**9. A ilha conseguiu recuperar a vegetação depois de uma superpopulação?**

Sim, parcialmente: O vigor da grama voltou a 87% após um período de degradação. (na primavera do ano 47).

**10. A capacidade de suporte caiu em relação aos 6.000 iniciais?**

A capacidade da primavera foi de 6.442 no ano 1 e de 4.180 no ano 100. A capacidade sustentável anual (gargalo do ano) terminou em 2.482.

**11. Houve algum momento em que uma primavera chuvosa não conseguiu recuperar a população?**

Sim: no ano 13 a primavera teve 114% da chuva média, mas a população terminou o ano com 16 (sem crescimento), porque a vegetação estava degradada (vigor 20%).

**12. A consanguinidade prejudicou significativamente os coelhos?**

F médio no último registro com coelhos = 0.500 (máximo 0.531); diversidade genética = 33% da inicial. Já na 2ª geração, filhos de irmãos têm F ≈ 0,25: o gargalo de dois fundadores impõe esse custo de imediato. 12.921 mortes de filhotes foram atribuídas à depressão endogâmica (34% de todas as mortes). Efeito relevante.

**13. A população encontrou algum equilíbrio?**

Não — a população foi extinta.

**14. Houve ciclos recorrentes de crescimento e colapso?**

Sim: 6 colapsos (queda > 50% em uma estação, partindo de ≥100 coelhos).

**15. Existe risco realista de extinção local?**

Nesta execução, sim: a população foi extinta no inverno do ano 38. Veja as repetições de Monte Carlo para a probabilidade.

**16. Qual foi o estado geral da ilha ao final dos 100 anos?**

Índice de saúde do ecossistema 75/100. Grama 551 kg/ha (vigor 100%), arbustos 41% do inicial, árvore viva, solo com 472,9 t/ha de erosão acumulada e 26.4 cm de profundidade; 0 coelhos.

## Cenários (16 repetições cada)

| Cenário | P(extinção) | N médio | N final | Colapsos | Predador sobrevive |
|---|---|---|---|---|---|
| Chuva média (original) | 94% | 133 | 0 | 4.13 | — |
| A · Primaveras secas | 100% | 96 | 0 | 2.56 | — |
| B · Primaveras chuvosas | 94% | 159 | 0 | 6.44 | — |
| C · Poucos arbustos | 100% | 117 | 0 | 3.94 | — |
| D · Muitos arbustos | 100% | 154 | 0 | 4.69 | — |
| E · Recuperação lenta | 100% | 72 | 0 | 1.75 | — |
| F · Recuperação rápida | 81% | 249 | 0 | 9.25 | — |
| G · Depressão endogâmica forte | 100% | 114 | 0 | 1.31 | — |
| H · Depressão endogâmica fraca | 100% | 140 | 0 | 5.13 | — |
| Gatos ferais (4 no ano 3) | 100% | 137 | 0 | 3.31 | 0% |
| Raposas (casal no ano 3) | 100% | 119 | 0 | 3.38 | 0% |
| Arminhos (4 no ano 3) | 100% | 141 | 0 | 4.75 | 0% |
| Aves de rapina (desde o ano 1) | 13% | 207 | 120 | 2.19 | 88% |
| Gatos junto com os coelhos (ano 1) | 100% | 139 | 0 | 3 | 0% |
| Gatos + aves de rapina | 31% | 202 | 70 | 2 | 69% |
| Dois machos | 100% | 0 | 0 | 0 | — |
| Casal de filhotes (1 mês) | 100% | 46 | 0 | 1.94 | — |
| Fêmea infértil | 100% | 0 | 0 | 0 | — |
