# Ilha · O Experimento dos Dois Coelhos

Simulação ecológica de **10 a 100 anos** (padrão: 50) de uma ilha isolada que recebe **um único casal de coelhos**,
com a opção de introduzir **predadores** (gato feral, raposa-vermelha, arminho, aves de rapina).
Modelo baseado em indivíduos (IBM), com passo mensal, acoplado a modelos de grama, arbustos,
uma árvore, solo, água e clima, e um site interativo que mostra tudo.

## Como usar

| Arquivo | O que faz |
|---|---|
| `INICIAR.bat` | Abre o site (se os dados não existirem, roda a simulação antes). |
| `SIMULAR.bat` | Pré-calcula 100 anos: simulação original, Monte Carlo e 20 cenários (alguns minutos) e abre o site. |
| `ANALISAR.bat` | Análise estatística complementar em Python → `dados/analise.txt`. |
| `SERVIDOR.bat` | (Opcional) serve a pasta em http://localhost:8040. |

O `index.html` também abre direto com dois cliques: os dados ficam em `dados/resultados.js`,
que funciona sem servidor (o `fetch()` de JSON é bloqueado em `file://`, causa do antigo erro
"ecosystem_results.json não foi encontrado").

Pela linha de comando:

```bash
node simular.js            # completo: 100 anos, 80 repetições + 25 por cenário
node simular.js --rapido   # rápido, para testes
python analyze_results.py 70   # análise para 70 anos (padrão 50)
python analyze_results.py
```

## Estrutura

```
index.html            interface (seções, barra do tempo)
css/style.css         identidade visual
js/engine.js          MOTOR da simulação (o mesmo no Node e no navegador)
js/charts.js          biblioteca de gráficos em Canvas (sem dependências)
js/app.js             interface: painel, ilha, gráficos, laboratório, relatório
simular.js            executor: original + Monte Carlo + cenários → dados/
analyze_results.py    análise estatística complementar (Python, só biblioteca padrão)
dados/
  resultados.js/.json   100 anos + repetições compactas (o site recorta para qualquer duração)
  tabela_sazonal.csv    161 registros (início + 160 estações)
  tabela_anual.csv      40 anos
  cenarios.csv          comparação dos cenários
  relatorio.md          respostas automáticas às 16 perguntas
  analise.txt           saída do analyze_results.py
_antigo/              versão anterior (só na cópia local; fora do repositório)
```

**Separação dados / motor / interface:** o motor (`engine.js`) não sabe nada da interface; o
site só lê os resultados. O Laboratório chama o mesmo motor no navegador, então mudar um
parâmetro realmente muda a matemática. Mesma semente + mesmos parâmetros = resultado idêntico
(o `simular.js` confere isso, e também o balanço N(t) = N(t−1) + nascimentos − mortes).

## O site

Página única com barra lateral de navegação. No topo, a **Central de experimento**: duração de 10 a
100 anos (padrão 50), predadores, chuva e tamanho da ilha, com o botão Simular. Depois vêm a história em
capítulos, a ilha agora (cartões em linguagem simples), o gráfico principal, as observações, natureza,
coelhos, experimentos (predadores, cenários, Laboratório) e relatório. Termos técnicos têm ajuda "?";
gráficos detalhados ficam em "Ver mais".

**Duração livre sem recalcular:** com a mesma semente, os primeiros N anos de uma simulação de 100 anos
são idênticos a uma simulação de N anos (o clima é gerado ano a ano e a demografia mês a mês). O
`simular.js` verifica isso; o site recorta os 100 anos pré-calculados para a duração escolhida, com
Monte Carlo e cenários.


Painel com 12 indicadores e índice de saúde (com fórmula explícita) · ilustração da ilha que
muda com o estado (grama verde/seca, solo exposto, erosão, arbustos mortos, casca roída,
rebrota) e vista em perfil do solo · **gráfico principal com uma única linha de população**,
zoom por arrasto, eventos marcados e capacidade dinâmica · viagem no tempo (estação, ano,
reprodução automática, velocidade, setas do teclado) · comentários automáticos por regras ·
monitoramento de grama, arbustos, árvore e solo · nascimentos, mortes por causa, pirâmide
etária · genealogia real dos fundadores · genética (F medido por marcadores, He, Ne) · clima ·
capacidade de suporte sazonal × sustentável · linha do tempo · cenários com Monte Carlo ·
Laboratório · relatório com conclusão automática, as 16 perguntas, CSV/JSON e versão para imprimir.

## Resultado principal (semente 42; 100 repetições)

- A população explode para ~6.700 no verão do ano 5, acima da capacidade, e colapsa no
  inverno seguinte: as raízes da grama e os arbustos (descascados) morrem logo depois do pico.
- Depois vêm ciclos de recuperação e colapso (periodicidade de ~14 anos nesta execução).
- **Probabilidade de extinção em 40 anos: ~69%** (IC 95% aproximado: 60–78%).
- Velocidade de regeneração da vegetação é o fator mais influente (15% de extinção com
  recuperação rápida, 100% com recuperação lenta). Primaveras chuvosas reduzem o risco, mas
  aumentam o número de colapsos.
- A consanguinidade chega a F ≈ 0,25–0,5. Com equivalentes letais da literatura, é uma causa
  importante de morte de filhotes, mas não decide sozinha o destino da ilha.

Os números dependem de hipóteses (veja a seção **Método** do site): eles mostram mecanismos e
ordens de grandeza, não previsões de uma ilha real.

## Predadores

Cada predador tem necessidade alimentar, preferência por filhotes, proteção que a vegetação
oferece aos coelhos, presas alternativas e reprodução próprias. A caça segue uma resposta
funcional tipo III (o predador troca de presa quando os coelhos ficam raros). Resultado
principal: **sem predadores, os coelhos destroem o pasto e somem em ~70% das repetições
(40 anos) e ~94% (100 anos); com aves de rapina, ~7% e ~12%**: o predador freia a explosão
que levaria ao colapso. Predadores que dependem só dos coelhos (raposas) costumam morrer de
fome depois de derrubar a população.

## Revisão de realismo (motor v2.2)

- Predadores: filhotes passam a depender dos pais (não caçam e comem menos) e morrem primeiro quando
  falta comida; adultos têm reservas corporais; cada espécie tem território máximo por km². Na ilha
  de 100 ha (1 km²) cabem poucos predadores, por isso populações pequenas podem sumir por azar.
- Tamanho da ilha virou experimento: com 400 ha, gatos e coelhos convivem (extinção dos coelhos cai
  de ~80% para ~16% em 50 anos).
- Reprodução dos coelhos menos exigente quanto à grama verde no verão.

## Hospedar de graça

O site é estático (HTML + CSS + JS); basta publicar a pasta, sem `_antigo/`.

- **Netlify Drop**: arraste a pasta em https://app.netlify.com/drop.
- **GitHub Pages**: crie um repositório, envie os arquivos e ative *Settings → Pages → Deploy from branch*.
- **Cloudflare Pages**: conecte o repositório ou envie a pasta.

## Dependências

- **Site**: nenhuma biblioteca externa. Única conexão opcional: fontes do Google Fonts
  (Fraunces, Inter, JetBrains Mono); sem internet, o site usa as fontes do sistema.
- **Simulação**: Node.js (testado na v26). **Análise**: Python 3.8+ (só biblioteca padrão).

## O que estava errado na versão anterior (`_antigo/`)

1. Filhotes nasciam com `age_weeks = 52·ano + …` (tempo absoluto), ou seja, já "velhos", e
   morriam de senescência: a extinção era um bug.
2. A idade nunca aumentava; IDs repetidos (`len(rabbits)`) faziam `remove_rabbit` apagar vários coelhos.
3. "Endogamia" era a média do número da geração (0,857 no ano 0), não um coeficiente F.
4. 4 ninhadas por fêmea **por estação**; mortalidade neonatal aplicada duas vezes.
5. Unidades sem sentido (kcal × 0,001 tratado como kg/ha), grama crescendo × (ano+1),
   arbustos sem limite (+1903%), sem balanço de massa, sem passo mensal e sem cenários.
6. `index.html` lia `simulationData.year` (a chave era `years`) e quebrava; números fixos no HTML.
7. Os `.bat` usavam `& "python.exe"` (sintaxe de PowerShell), que não funciona no cmd.
