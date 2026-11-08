#!/usr/bin/env python3
"""
ILHA 40 - Analise estatistica complementar dos resultados.

Le dados/resultados.json (gerado por `node simular.js`) e grava
dados/analise.txt com analises que o site nao mostra diretamente:
  - periodo dos ciclos populacionais (autocorrelacao da serie log)
  - relacao entre chuva da primavera e crescimento populacional
  - defasagem entre o pico populacional e a degradacao da grama
  - distribuicao das mortes por estacao do ano
  - estatisticas das repeticoes de Monte Carlo e dos cenarios

Usa apenas a biblioteca padrao do Python (3.8+).
"""
import json
import math
import sys
from pathlib import Path

PASTA = Path(__file__).resolve().parent
ARQ = PASTA / "dados" / "resultados.json"
SAIDA = PASTA / "dados" / "analise.txt"
EST = ["Primavera", "Verao", "Outono", "Inverno"]


def media(v):
    return sum(v) / len(v) if v else float("nan")


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


def main():
    if not ARQ.exists():
        print("ERRO: dados/resultados.json nao encontrado. Rode primeiro: node simular.js (ou SIMULAR.bat)")
        sys.exit(1)
    dados = json.loads(ARQ.read_text(encoding="utf-8"))
    base = dados["base"]
    R = base["registros"]
    anual = base["anual"]
    S = base["resumo"]
    L = []
    w = L.append

    w("=" * 70)
    w(" ILHA 40 - ANALISE ESTATISTICA COMPLEMENTAR")
    w("=" * 70)
    w(f" Motor v{base['versao']} | semente {base['parametros']['semente']} | gerado em {base.get('gerado')}")
    w("")
    w("1. RESUMO DA EXECUCAO ORIGINAL")
    w(f"   Populacao: inicial {S['Nini']} | maxima {S['Nmax']} | final {S['Nfinal']}")
    w(f"   Nascimentos {S['nasc']} | Mortes {S['mortes']} | Colapsos {S['colapsos']} | Crises alimentares {S['crises']}")
    w(f"   Extinta: {'sim' if S['extinta'] else 'nao'}")
    w("")

    # 2. ciclos
    w("2. CICLOS POPULACIONAIS (autocorrelacao de log(N+1), registros sazonais)")
    logn = [math.log(r["N"] + 1) for r in R]
    melhores = []
    for lag in range(4, 80):
        ac = autocorr(logn, lag)
        if not math.isnan(ac):
            melhores.append((ac, lag))
    picos = [(ac, lag) for i, (ac, lag) in enumerate(melhores[1:-1], 1)
             if ac > melhores[i - 1][0] and ac > melhores[i + 1][0] and ac > 0.1]
    if picos:
        ac, lag = max(picos)
        w(f"   Periodicidade dominante: ~{lag} estacoes (~{lag / 4:.1f} anos), autocorrelacao {ac:.2f}.")
        w("   Interpretacao: tempo medio entre explosoes, ditado pela recuperacao da vegetacao.")
    else:
        w("   Nenhuma periodicidade clara (autocorrelacao < 0,1).")
    ac4 = autocorr(logn, 4)
    w(f"   Autocorrelacao com 1 ano de defasagem: {ac4:.2f}")
    w("")

    # 3. chuva x crescimento
    w("3. CHUVA DA PRIMAVERA x CRESCIMENTO DA POPULACAO NO ANO")
    mult, cresc = [], []
    for k in range(1, len(anual)):
        n0, n1 = anual[k - 1]["Nfim"], anual[k]["Nfim"]
        if n0 >= 10:
            mult.append(anual[k]["multPrim"])
            cresc.append(math.log((n1 + 1) / (n0 + 1)))
    r = correl(mult, cresc)
    w(f"   Anos com >= 10 coelhos no inicio: {len(mult)}")
    w(f"   Correlacao (multiplicador da chuva x log da taxa de crescimento): {r:.2f}")
    w("   Uma correlacao fraca indica que a chuva sozinha nao explica o crescimento:")
    w("   a degradacao acumulada da vegetacao e a densidade pesam mais.")
    w("")

    # 4. defasagem pico -> degradacao
    w("4. DEFASAGEM ENTRE PICO POPULACIONAL E DEGRADACAO")
    i_max = S["iMax"]
    i_grama = next((r["i"] for r in R if r["R"] < 0.7), None)
    i_arb = next((r["i"] for r in R if r["Hs"] < 0.5 * R[0]["Hs"]), None)
    w(f"   Pico populacional: registro {i_max} (ano {R[i_max]['ano']}, {EST[R[i_max]['est']]})")
    if i_grama is not None:
        w(f"   Raizes da grama < 70%: registro {i_grama} -> {i_grama - i_max:+d} estacoes em relacao ao pico")
    if i_arb is not None:
        w(f"   Arbustos < 50%: registro {i_arb} -> {i_arb - i_max:+d} estacoes em relacao ao pico")
    w("")

    # 5. mortes por estacao
    w("5. MORTES POR ESTACAO DO ANO (soma dos 40 anos)")
    tot = sum(r["mortes"] for r in R) or 1
    for s in range(4):
        m = sum(r["mortes"] for r in R if not r.get("inicial") and r["est"] == s)
        nasc = sum(r["nasc"] for r in R if not r.get("inicial") and r["est"] == s)
        w(f"   {EST[s]:<10} mortes {m:>8} ({100 * m / tot:5.1f}%)   nascimentos {nasc:>8}")
    w("   Causas (total): " + ", ".join(f"{k} {v}" for k, v in sorted(S["mcTot"].items(), key=lambda x: -x[1])))
    w("")

    # 6. Monte Carlo
    mc = dados.get("mcBase")
    if mc:
        w(f"6. MONTE CARLO DO CENARIO ORIGINAL ({mc['reps']} repeticoes)")
        w(f"   Probabilidade de extincao em 40 anos: {100 * mc['pExtincao']:.0f}%")
        w(f"   Probabilidade de a arvore morrer:      {100 * mc['pArvoreMorre']:.0f}%")
        w(f"   Populacao maxima (mediana): {mc['NmaxMed']}")
        w(f"   Populacao final: mediana {mc['NfinalMed']} | P5 {mc['NfinalP5']} | P95 {mc['NfinalP95']}")
        anos_ext = sorted(r["mesExt"] / 12 for r in mc["runs"] if r["extinta"] and r["mesExt"] is not None)
        if anos_ext:
            w(f"   Ano da extincao (quando ocorre): mediana {anos_ext[len(anos_ext) // 2]:.1f} | min {anos_ext[0]:.1f} | max {anos_ext[-1]:.1f}")
        # erro padrao da probabilidade
        p, n = mc["pExtincao"], mc["reps"]
        ep = math.sqrt(p * (1 - p) / n)
        w(f"   Intervalo aproximado de 95% para P(extincao): {100 * max(0, p - 1.96 * ep):.0f}% a {100 * min(1, p + 1.96 * ep):.0f}%")
        w("")

    # 7. Cenarios
    cen = dados.get("cenarios") or []
    if cen:
        w(f"7. CENARIOS ({dados['meta']['repsCenario']} repeticoes cada, mesmas sementes)")
        w(f"   {'Cenario':<34}{'P(ext)':>8}{'Nfinal':>9}{'Colapsos':>10}{'Grama':>8}{'Arbustos':>10}")
        for c in cen:
            m = c["mc"]
            w(f"   {c['nome']:<34}{100 * m['pExtincao']:>7.0f}%{m['NfinalMed']:>9}{m['colapsosMed']:>10.2f}{100 * m['RfinalMed']:>7.0f}%{100 * m['HsFinalMed']:>9.0f}%")
        w("")
    w("=" * 70)

    texto = "\n".join(L)
    SAIDA.write_text(texto, encoding="utf-8")
    print(texto)
    print(f"\nAnalise gravada em: {SAIDA}")


if __name__ == "__main__":
    main()
