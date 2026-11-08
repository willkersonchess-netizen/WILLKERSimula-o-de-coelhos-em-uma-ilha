#!/usr/bin/env python3
"""
ILHA - Analise estatistica complementar dos resultados.

Le dados/resultados.json (gerado por `node simular.js`, 100 anos) e recorta
para a duracao pedida (padrao 50 anos):  python analyze_results.py [anos]
Grava dados/analise.txt (ou dados/analise_<anos>.txt) com analises que o site
nao mostra diretamente:
  - periodo dos ciclos populacionais (autocorrelacao da serie log)
  - relacao entre chuva da primavera e crescimento populacional
  - defasagem entre o pico populacional e a degradacao da grama
  - distribuicao das mortes por estacao do ano
  - Monte Carlo do cenario original e dos cenarios (incl. predadores)

Usa apenas a biblioteca padrao do Python (3.8+).
"""
import json
import math
import sys
from pathlib import Path

PASTA = Path(__file__).resolve().parent
ARQ = PASTA / "dados" / "resultados.json"
EST = ["Primavera", "Verao", "Outono", "Inverno"]


def media(v):
    return sum(v) / len(v) if v else float("nan")


def mediana(v):
    s = sorted(v)
    return s[len(s) // 2] if s else float("nan")


def correl(x, y):
    pares = [(a, b) for a, b in zip(x, y) if a is not None and b is not None]
    if len(pares) < 3:
        return float("nan")
    xs, ys = zip(*pares)
    mx, my = media(xs), media(ys)
    sxy = sum((a - mx) * (b - my) for a, b in pares)
    sx = math.sqrt(sum((a - mx) ** 2 for a in xs))
    sy = math.sqrt(sum((b - my) ** 2 for b in ys))
    return sxy / (sx * sy) if sx > 0 and sy > 0 else float("nan")


def autocorr(serie, lag):
    return correl(serie[:-lag], serie[lag:])


def resumo_reps(reps, anos):
    """Mesma logica de mcDeReps (engine.js) para os primeiros `anos`."""
    idx = anos * 4
    ext = [r["N"][idx] == 0 for r in reps]
    nmed = [sum(r["N"][: idx + 1]) / (idx + 1) for r in reps]
    nfin = [r["N"][idx] for r in reps]
    col = []
    for r in reps:
        s = r["N"][: idx + 1]
        col.append(sum(1 for i in range(1, len(s)) if s[i - 1] >= 100 and s[i] < 0.5 * s[i - 1]))
    pred = [r["P"][anos] > 0 for r in reps if "P" in r]
    return {
        "n": len(reps),
        "pext": sum(ext) / len(reps),
        "nmed": mediana(nmed),
        "nfin": mediana(nfin),
        "col": media(col),
        "grama": media([r["R"][anos] for r in reps]),
        "pred": (sum(pred) / len(pred)) if pred else None,
        "anos_ext": sorted(next(i for i, v in enumerate(r["N"]) if v == 0 and i > 0) / 4 for r in reps if r["N"][idx] == 0),
    }


def main():
    anos = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 50
    if not ARQ.exists():
        print("ERRO: dados/resultados.json nao encontrado. Rode primeiro: node simular.js (ou SIMULAR.bat)")
        sys.exit(1)
    dados = json.loads(ARQ.read_text(encoding="utf-8"))
    base = dados["base"]
    anos = max(10, min(anos, base["parametros"]["anos"]))
    saida = PASTA / "dados" / ("analise.txt" if anos == 50 else f"analise_{anos}.txt")
    R = base["registros"][: anos * 4 + 1]
    anual = base["anual"][:anos]
    L = []
    w = L.append

    w("=" * 74)
    w(f" ILHA - ANALISE ESTATISTICA COMPLEMENTAR ({anos} anos)")
    w("=" * 74)
    w(f" Motor v{base['versao']} | semente {base['parametros']['semente']} | gerado em {base.get('gerado')}")
    w("")
    nasc = sum(r["nasc"] for r in R)
    mortes = sum(r["mortes"] for r in R)
    i_max = max(range(len(R)), key=lambda i: R[i]["N"])
    colapsos = sum(1 for i in range(1, len(R)) if R[i - 1]["N"] >= 100 and R[i]["N"] < 0.5 * R[i - 1]["N"])
    w("1. RESUMO DA EXECUCAO ORIGINAL")
    w(f"   Populacao: inicial {R[0]['N']} | maxima {R[i_max]['N']} (ano {R[i_max]['ano']}, {EST[R[i_max]['est']]}) | final {R[-1]['N']}")
    w(f"   Nascimentos {nasc} | Mortes {mortes} | Colapsos {colapsos} | Extinta: {'sim' if R[-1]['N'] == 0 else 'nao'}")
    w("")

    w("2. CICLOS POPULACIONAIS (autocorrelacao de log(N+1), registros sazonais)")
    logn = [math.log(r["N"] + 1) for r in R]
    melhores = [(autocorr(logn, lag), lag) for lag in range(4, min(120, len(logn) // 2))]
    melhores = [(a, l) for a, l in melhores if not math.isnan(a)]
    picos = [(a, l) for i, (a, l) in enumerate(melhores[1:-1], 1) if a > melhores[i - 1][0] and a > melhores[i + 1][0] and a > 0.1]
    if picos:
        a, lag = max(picos)
        w(f"   Periodicidade dominante: ~{lag} estacoes (~{lag / 4:.1f} anos), autocorrelacao {a:.2f}.")
        w("   Interpretacao: tempo medio entre explosoes, ditado pela recuperacao da vegetacao.")
    else:
        w("   Nenhuma periodicidade clara (autocorrelacao < 0,1).")
    w("")

    w("3. CHUVA DA PRIMAVERA x CRESCIMENTO DA POPULACAO NO ANO")
    mult, cresc = [], []
    for k in range(1, len(anual)):
        n0, n1 = anual[k - 1]["Nfim"], anual[k]["Nfim"]
        if n0 >= 10:
            mult.append(anual[k]["multPrim"])
            cresc.append(math.log((n1 + 1) / (n0 + 1)))
    w(f"   Anos com >= 10 coelhos no inicio: {len(mult)}")
    w(f"   Correlacao (chuva da primavera x log da taxa de crescimento): {correl(mult, cresc):.2f}")
    w("   Correlacao fraca = a chuva sozinha nao explica o crescimento; a degradacao")
    w("   acumulada da vegetacao e a densidade pesam mais.")
    w("")

    w("4. DEFASAGEM ENTRE PICO POPULACIONAL E DEGRADACAO")
    i_grama = next((r["i"] for r in R if r["R"] < 0.7), None)
    i_arb = next((r["i"] for r in R if r["Hs"] < 0.5 * R[0]["Hs"]), None)
    w(f"   Pico populacional: registro {i_max}")
    if i_grama is not None:
        w(f"   Raizes da grama < 70%: registro {i_grama} ({i_grama - i_max:+d} estacoes em relacao ao pico)")
    if i_arb is not None:
        w(f"   Arbustos < 50%: registro {i_arb} ({i_arb - i_max:+d} estacoes em relacao ao pico)")
    w("")

    w("5. MORTES POR ESTACAO DO ANO")
    tot = mortes or 1
    for s in range(4):
        m = sum(r["mortes"] for r in R if not r.get("inicial") and r["est"] == s)
        n = sum(r["nasc"] for r in R if not r.get("inicial") and r["est"] == s)
        w(f"   {EST[s]:<10} mortes {m:>8} ({100 * m / tot:5.1f}%)   nascimentos {n:>8}")
    causas = {}
    for r in R:
        for k, v in r["mc"].items():
            causas[k] = causas.get(k, 0) + v
    w("   Causas: " + ", ".join(f"{k} {v}" for k, v in sorted(causas.items(), key=lambda x: -x[1]) if v))
    w("")

    if dados.get("repsBase"):
        m = resumo_reps(dados["repsBase"], anos)
        ep = math.sqrt(m["pext"] * (1 - m["pext"]) / m["n"])
        w(f"6. MONTE CARLO DO CENARIO ORIGINAL ({m['n']} repeticoes)")
        w(f"   Probabilidade de extincao em {anos} anos: {100 * m['pext']:.0f}%  (IC 95% aprox.: {100 * max(0, m['pext'] - 1.96 * ep):.0f}% a {100 * min(1, m['pext'] + 1.96 * ep):.0f}%)")
        w(f"   Populacao media (mediana entre repeticoes): {m['nmed']:.0f} | final (mediana): {m['nfin']}")
        if m["anos_ext"]:
            a = m["anos_ext"]
            w(f"   Ano da extincao, quando ocorre: mediana {a[len(a) // 2]:.1f} | min {a[0]:.1f} | max {a[-1]:.1f}")
        w("")

    cen = dados.get("cenarios") or []
    if cen:
        w(f"7. CENARIOS ({dados['meta']['repsCenario']} repeticoes cada, mesmas sementes, {anos} anos)")
        w(f"   {'Cenario':<38}{'Grupo':<12}{'P(ext)':>8}{'N medio':>9}{'Colapsos':>10}{'Grama':>8}{'Pred.vivo':>10}")
        for c in cen:
            m = resumo_reps(c["reps"], anos)
            ps = "-" if m["pred"] is None else f"{100 * m['pred']:.0f}%"
            w(f"   {c['nome']:<38}{c.get('grupo', ''):<12}{100 * m['pext']:>7.0f}%{m['nmed']:>9.0f}{m['col']:>10.2f}{100 * m['grama']:>7.0f}%{ps:>10}")
        w("")
    w("=" * 74)
    texto = "\n".join(L)
    saida.write_text(texto, encoding="utf-8")
    print(texto)
    print(f"\nAnalise gravada em: {saida}")


if __name__ == "__main__":
    main()
