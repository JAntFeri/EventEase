#!/usr/bin/env python3
"""Analiza rezultatov sistemskega testa (k6 CSV + viri) -> povzetki, kriteriji in grafi.

Uporaba: analiza.py obremenitveni|stresni <mapa_dokazov> <mapa_surovih_meritev>
Izhod v <mapa_dokazov>: casovna_vrsta.csv, koncne_tocke.csv, [stopnje.csv, okrevanje.csv],
rezultat.json (ključne številke in ocena kriterijev) in graf.png.
"""
import csv
import gzip
import json
import math
import os
import sys
from collections import defaultdict

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

TIP, OUT, RAW = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))

# Referenčna paleta (dataviz, svetli način): kategorične serije v stalnem vrstnem redu, rdeča samo za napake.
MODRA, ORANZNA, AQUA, RDECA = "#2a78d6", "#eb6834", "#1baf7a", "#e34948"
TEKST, TEKST2, MREZA, POVRSINA = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb"


def pct(vals, p):
    if not vals:
        return float("nan")
    vals = sorted(vals)
    k = (len(vals) - 1) * p
    lo, hi = math.floor(k), math.ceil(k)
    return vals[lo] + (vals[hi] - vals[lo]) * (k - lo)


def ok_status(s):
    return s in ("200", "201")


# ---------------------------------------------------------------- branje k6 meritev
sek = defaultdict(lambda: {"req": 0, "err": 0, "eof": 0, "e5xx": 0, "it": 0, "drop": 0, "vus": 0, "dur": []})
konc = defaultdict(lambda: {"req": 0, "err": 0, "dur": []})
scen_dur = defaultdict(list)  # (scenarij, sekunda) -> trajanja API
t0 = None
with gzip.open(os.path.join(RAW, "k6_meritve.csv.gz"), "rt", newline="") as f:
    for r in csv.DictReader(f):
        m = r["metric_name"]
        t = int(float(r["timestamp"]))
        if t0 is None or t < t0:
            t0 = t
        b = sek[t]
        if m == "http_reqs":
            b["req"] += 1
            k = konc[r["name"]]
            k["req"] += 1
            if not ok_status(r["status"]):
                b["err"] += 1
                k["err"] += 1
                if r["status"] == "0":
                    b["eof"] += 1
                elif r["status"].startswith("5"):
                    b["e5xx"] += 1
        elif m == "http_req_duration":
            v = float(r["metric_value"])
            konc[r["name"]]["dur"].append(v)
            if "vrsta=api" in r.get("extra_tags", "") or r.get("name", "").find("/api/") >= 0:
                b["dur"].append(v)
                scen_dur[(r["scenario"], t)].append(v)
        elif m == "iterations":
            b["it"] += 1
        elif m == "dropped_iterations":
            b["drop"] += int(float(r["metric_value"]))
        elif m == "vus":
            b["vus"] = int(float(r["metric_value"]))

# ---------------------------------------------------------------- viri
viri = {}
with open(os.path.join(RAW, "viri.csv")) as f:
    for r in csv.DictReader(f):
        viri[int(float(r["cas"]))] = r
# Vzorčenje je ≈1,05 s, zato kakšna sekunda manjka – zapolnimo s prejšnjim vzorcem.
for t in range(min(viri), max(viri)):
    if t not in viri:
        viri[t] = viri[t - 1]

zagon = json.load(open(os.path.join(OUT, "zagon.json")))
povzetek = json.load(open(os.path.join(OUT, "k6_povzetek.json")))

# ---------------------------------------------------------------- časovna vrsta
t_end = max(max(sek), max(viri))
t_start = min(t0, min(viri))
vrstice = []
for t in range(t_start, t_end + 1):
    b = sek.get(t)
    v = viri.get(t, {})
    d = b["dur"] if b else []
    vrstice.append({
        "s": t - t0,
        "vus": b["vus"] if b else "",
        "req_s": b["req"] if b else 0,
        "iter_s": b["it"] if b else 0,
        "napake_s": b["err"] if b else 0,
        "napake_povezava_s": b["eof"] if b else 0,
        "napake_5xx_s": b["e5xx"] if b else 0,
        "zavrzene_iter_s": b["drop"] if b else 0,
        "api_p50_ms": round(pct(d, .5), 1) if d else "",
        "api_p95_ms": round(pct(d, .95), 1) if d else "",
        "api_p99_ms": round(pct(d, .99), 1) if d else "",
        "app_cpu_pct": v.get("app_cpu_pct", ""),
        "app_mem_mb": v.get("app_mem_mb", ""),
        "db_cpu_pct": v.get("db_cpu_pct", ""),
        "db_mem_mb": v.get("db_mem_mb", ""),
        "logic_rss_mb": v.get("logic_rss_mb", ""),
        "logic_pid": v.get("logic_pid", ""),
        "gostitelj_cpu_pct": v.get("gostitelj_cpu_pct", ""),
    })
with open(os.path.join(OUT, "casovna_vrsta.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(vrstice[0]))
    w.writeheader()
    w.writerows(vrstice)

# ---------------------------------------------------------------- končne točke
with open(os.path.join(OUT, "koncne_tocke.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["koncna_tocka", "zahtevkov", "napak", "napake_pct", "p50_ms", "p95_ms", "p99_ms", "max_ms"])
    for name, k in sorted(konc.items(), key=lambda x: -x[1]["req"]):
        w.writerow([name, k["req"], k["err"], f"{100 * k['err'] / k['req']:.2f}",
                    f"{pct(k['dur'], .5):.1f}", f"{pct(k['dur'], .95):.1f}", f"{pct(k['dur'], .99):.1f}",
                    f"{max(k['dur']) if k['dur'] else float('nan'):.1f}"])


def okno(a, b):
    """Zbirni podatki za sekunde [a, b) relativno na t0."""
    req = err = eof = e5 = it = drop = 0
    dur, acpu, dcpu, rss, amem = [], [], [], [], []
    for t in range(t0 + a, t0 + b):
        x = sek.get(t)
        if x:
            req += x["req"]; err += x["err"]; eof += x["eof"]; e5 += x["e5xx"]
            it += x["it"]; drop += x["drop"]; dur += x["dur"]
        v = viri.get(t)
        if v:
            acpu.append(float(v["app_cpu_pct"])); dcpu.append(float(v["db_cpu_pct"]))
            amem.append(float(v["app_mem_mb"]))
            if v["logic_rss_mb"]:
                rss.append(float(v["logic_rss_mb"]))
    n = max(1, b - a)
    avg = lambda xs: sum(xs) / len(xs) if xs else float("nan")  # noqa: E731
    return {
        "iter_s": round(it / n, 1), "req_s": round(req / n, 1),
        "napake_pct": round(100 * err / req, 2) if req else 0.0,
        "napake_povezava": eof, "napake_5xx": e5, "zavrzene_iter": drop,
        "p50_ms": round(pct(dur, .5), 1), "p95_ms": round(pct(dur, .95), 1), "p99_ms": round(pct(dur, .99), 1),
        "app_cpu_pct": round(avg(acpu), 1), "db_cpu_pct": round(avg(dcpu), 1),
        "app_mem_mb": round(avg(amem), 1), "logic_rss_mb": round(avg(rss), 1),
    }


# ---------------------------------------------------------------- celovitost podatkov
def metrika(ime):
    m = povzetek["metrics"].get(ime, {})
    return int(m.get("count", 0))


ank, potrj, glas, pred, glas_brez = map(int, zagon["baza"].split(","))
pg_pred = list(map(int, zagon["pg_pred"].split(",")))
pg_po = list(map(int, zagon["pg_po"].split(",")))
celovitost = {
    "ankete_k6": metrika("ankete_ustvarjene"), "ankete_baza": ank,
    "potrditve_k6": metrika("potrditve_potrjene"), "potrditve_baza": potrj,
    "glasovi_poskusi_k6": metrika("glasovi_poskusi"), "glasovi_potrjeni_k6": metrika("glasovi_potrjeni"),
    "glasovi_baza": glas, "glasovi_brez_moznosti_baza": glas_brez,
    "predlogi_k6": metrika("predlogi_potrjeni"), "predlogi_baza": pred,
    "pg_rollback": pg_po[1] - pg_pred[1], "pg_deadlock": pg_po[2] - pg_pred[2],
}
# Vsak potrjen (201) glas mora biti v bazi; v bazi ne sme biti več glasov kot poskusov.
celovitost["izgubljeni_potrjeni_glasovi"] = max(0, celovitost["glasovi_potrjeni_k6"] - glas)
celovitost["ok"] = (
    glas >= celovitost["glasovi_potrjeni_k6"] and glas <= celovitost["glasovi_poskusi_k6"]
    and ank >= celovitost["ankete_k6"] and glas_brez == 0
)

pids = sorted({r["logic_pid"] for r in viri.values() if r["logic_pid"]})
rezultat = {"tip": TIP, "run_id": zagon["run_id"], "k6_izhodna_koda": zagon["k6_izhodna_koda"],
            "trajanje_s": t_end - t0, "logic_pid": pids, "celovitost": celovitost,
            "skupaj": okno(0, t_end - t0 + 1)}

stopnje_meje = []
if TIP == "stresni":
    plan = json.load(open(os.path.join(HERE, "k6", "stresni_stopnje.json")))
    korak = plan["naras_s"] + plan["vzdrzevanje_s"]
    stopnje = []
    for i, h in enumerate(plan["stopnje"]):
        a, b = i * korak + plan["naras_s"], (i + 1) * korak
        stopnje_meje.append((i * korak, a, b, h))
        stopnje.append({"stopnja": i + 1, "ciljna_iter_s": h, **okno(a, b)})
    with open(os.path.join(OUT, "stopnje.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(stopnje[0]))
        w.writeheader(); w.writerows(stopnje)
    o0 = len(plan["stopnje"]) * korak + plan["okrevanje"]["premor_s"]
    okr = [{"od_s": s, "do_s": s + 10, **okno(o0 + s, o0 + s + 10)}
           for s in range(0, plan["okrevanje"]["trajanje_s"], 10)]
    with open(os.path.join(OUT, "okrevanje.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(okr[0]))
        w.writeheader(); w.writerows(okr)
    # Točka zloma: prva stopnja, kjer p95 > 1000 ms ali napake > 5 %.
    zlom = next((s for s in stopnje if s["p95_ms"] > 1000 or s["napake_pct"] > 5), None)
    zadnja_ok = max((s for s in stopnje if s["p95_ms"] <= 300 and s["napake_pct"] < 1),
                    key=lambda s: s["ciljna_iter_s"], default=None)
    # Okrevanje: prvo 10-s okno, od katerega naprej so vsa okna v mejah (p95 < 300 ms, napake < 1 %).
    okrevano_po = None
    for i in range(len(okr)):
        if all(x["p95_ms"] < 300 and x["napake_pct"] < 1 for x in okr[i:]):
            okrevano_po = okr[i]["od_s"]
            break
    rezultat.update({"stopnje": stopnje, "okrevanje": okr, "tocka_zloma": zlom,
                     "zadnja_stopnja_v_mejah": zadnja_ok, "okrevano_po_s": okrevano_po,
                     "okrevanje_skupaj": okno(o0, o0 + plan["okrevanje"]["trajanje_s"])})
else:
    # Vzdrževanje: 120 s .. 120 s + VZDRZEVANJE; primerjamo prvo in zadnjo minuto (lezenje).
    nar = int(os.environ.get("NARAS_S", 120))
    vzd = int(os.environ.get("VZDRZEVANJE_S", 600))
    a, b = nar, nar + vzd
    rezultat.update({"vzdrzevanje": okno(a, b), "prva_minuta": okno(a, a + 60), "zadnja_minuta": okno(b - 60, b)})

json.dump(rezultat, open(os.path.join(OUT, "rezultat.json"), "w"), indent=2, ensure_ascii=False)

# ---------------------------------------------------------------- graf (male večkratnice, skupna os x)
xs = [r["s"] for r in vrstice]


def stolpec(k):
    return [float(r[k]) if r[k] != "" else float("nan") for r in vrstice]


plt.rcParams.update({"font.size": 9, "axes.edgecolor": MREZA, "axes.labelcolor": TEKST2,
                     "xtick.color": TEKST2, "ytick.color": TEKST2, "axes.titlecolor": TEKST,
                     "axes.titlesize": 10, "axes.titleweight": "bold", "axes.titlelocation": "left",
                     "figure.facecolor": POVRSINA, "axes.facecolor": POVRSINA})
fig, ax = plt.subplots(5, 1, figsize=(10, 12), sharex=True, constrained_layout=True)


def oblikuj(a, naslov, enota):
    a.set_title(naslov)
    a.set_ylabel(enota)
    a.grid(axis="y", color=MREZA, linewidth=0.8)
    a.spines[["top", "right"]].set_visible(False)
    a.set_ylim(bottom=0)


if TIP == "stresni":
    a = ax[0]
    a.plot(xs, stolpec("iter_s"), color=MODRA, lw=2, label="dosežene iteracije/s")
    for z, hz, kz, h in stopnje_meje:
        a.hlines(h, hz, kz, color=TEKST2, lw=1, ls="--")
        a.text((hz + kz) / 2, h, f"{h}", ha="center", va="bottom", color=TEKST2, fontsize=8)
    a.legend(loc="lower right", bbox_to_anchor=(1, 1), frameon=False)
    a.text(0.01, 0.97, "črtkano: ciljna hitrost stopnje", transform=a.transAxes, ha="left", va="top", color=TEKST2, fontsize=8)
    oblikuj(a, "Prepustnost: ciljna in dosežena hitrost iteracij", "iteracij / s")
else:
    a = ax[0]
    a.plot(xs, stolpec("vus"), color=MODRA, lw=2)
    oblikuj(a, "Sočasni navidezni uporabniki (VU)", "VU")

a = ax[1]
a.plot(xs, stolpec("req_s"), color=MODRA, lw=2, label="vsi zahtevki")
a.plot(xs, stolpec("napake_s"), color=RDECA, lw=2, label="neuspešni zahtevki")
a.legend(loc="lower right", bbox_to_anchor=(1, 1), frameon=False, ncols=3)
oblikuj(a, "Zahtevki na sekundo", "zahtevkov / s")

a = ax[2]
a.plot(xs, stolpec("api_p50_ms"), color=MODRA, lw=1.5, label="p50")
a.plot(xs, stolpec("api_p95_ms"), color=ORANZNA, lw=1.5, label="p95")
a.plot(xs, stolpec("api_p99_ms"), color=AQUA, lw=1.5, label="p99")
a.axhline(300, color=TEKST2, lw=1, ls="--")
a.text(xs[-1], 300, "prag p95 = 300 ms ", va="bottom", ha="right", color=TEKST2, fontsize=8)
a.legend(loc="lower right", bbox_to_anchor=(1, 1), frameon=False, ncols=3)
if TIP == "stresni":
    a.set_yscale("symlog", linthresh=10)
oblikuj(a, "Odzivni čas API (po sekundah)", "ms" + (" (log)" if TIP == "stresni" else ""))

a = ax[3]
a.plot(xs, stolpec("app_cpu_pct"), color=MODRA, lw=1.5, label="aplikacija (nginx + logic)")
a.plot(xs, stolpec("db_cpu_pct"), color=ORANZNA, lw=1.5, label="baza (PostgreSQL)")
a.legend(loc="lower right", bbox_to_anchor=(1, 1), frameon=False, ncols=3)
oblikuj(a, "Poraba CPU vsebnikov (100 % = eno jedro)", "% jedra")

a = ax[4]
a.plot(xs, stolpec("app_mem_mb"), color=MODRA, lw=1.5, label="vsebnik aplikacije")
a.plot(xs, stolpec("logic_rss_mb"), color=AQUA, lw=1.5, label="proces logic (RSS)")
a.legend(loc="lower right", bbox_to_anchor=(1, 1), frameon=False, ncols=3)
oblikuj(a, "Pomnilnik", "MB")
a.set_xlabel("čas od začetka testa [s]")

if TIP == "stresni":
    for a in ax:
        for z, hz, kz, h in stopnje_meje:
            a.axvline(z, color=MREZA, lw=0.8)
        a.axvspan(o0, o0 + plan["okrevanje"]["trajanje_s"], color=AQUA, alpha=0.08, lw=0)
    ax[0].text(o0 + 5, ax[0].get_ylim()[1] * 0.45, "okrevanje", color=TEKST2, fontsize=8)

fig.savefig(os.path.join(OUT, "graf.png"), dpi=130)
print(json.dumps({k: rezultat[k] for k in rezultat if k not in ("stopnje", "okrevanje")}, indent=2, ensure_ascii=False))
