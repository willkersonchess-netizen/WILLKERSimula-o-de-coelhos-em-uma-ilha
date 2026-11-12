# Island · The Two Rabbits Experiment

Simulação ecológica interativa: um casal de coelhos chega a uma ilha isolada. Cada coelho nasce, come, envelhece e morre dentro do modelo, e a vegetação, o solo, o clima e os predadores respondem a isso.

O site funciona direto no navegador, em **inglês, espanhol e português** (botão EN / ES / PT no topo).

## Como abrir

Abra o arquivo `index.html` no navegador. Não precisa instalar nada.

Para publicar na internet, ative o GitHub Pages neste repositório (Settings → Pages → branch `main`, pasta raiz).

## O que dá para fazer

- Simular de 10 a 100 anos, com uma "sorte" nova a cada vez.
- Colocar predadores (gato, raposa, arminho, aves de rapina) e mudar o regime de estações.
- Intervir na ilha no meio da história: caçar, soltar animais, plantar, cercar o pasto, provocar seca ou chuva.
- Ver o mapa de sensibilidade (dois controles mudando juntos) e o modo sala de aula.
- Exportar um relatório e copiar o link de um experimento.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | A página. |
| `css/style.css` | Aparência. |
| `js/engine.js` | O modelo (coelhos, vegetação, solo, clima, predadores). |
| `js/app.js`, `js/charts.js` | Interface e gráficos. |
| `js/i18n.js`, `js/i18n-dict.js` | Tradução. Para corrigir um texto, edite a linha no dicionário. |
| `dados/resultados.js` | Resultados pré-calculados (simulação original, repetições e cenários). |
| `simular.js` | Recalcula `dados/resultados.js` (`node simular.js`). Só é preciso depois de mudar o modelo. |

## Aviso

É uma ferramenta de estudo. Mostra mecanismos reais da ecologia, mas muitos números são hipóteses para uma ilha fictícia: não é uma previsão para uma ilha real.
