#!/usr/bin/env python3
"""Spremljanje virov med sistemskim testom (brez sudo, bere cgroup v2 in /proc).

Vsako sekundo zapiše v CSV: porabo CPU (v % enega jedra) in pomnilnik vsebnika aplikacije
(nginx + logic) in vsebnika baze, PID / RSS / niti procesa `logic` (sprememba PID = sesutje in
ponovni zagon) ter skupno obremenjenost gostitelja (k6 teče na istem gostitelju).

Uporaba: spremljaj_vire.py <izhod.csv>     (ustavi se s SIGTERM/SIGINT)
Vsebnik baze se poišče samodejno prek TCP povezave procesa `logic` na vrata 5432;
lahko ga podate tudi z okoljsko spremenljivko DB_CGROUP (pot do docker-*.scope).
"""
import csv
import glob
import os
import signal
import socket
import struct
import subprocess
import sys
import time

CG_ROOT = "/sys/fs/cgroup"


def cgroup_of(pid):
    with open(f"/proc/{pid}/cgroup") as f:
        for line in f:
            if line.startswith("0::"):
                return CG_ROOT + line.strip()[3:]
    raise RuntimeError(f"cgroup procesa {pid} ni najden")


def logic_pid():
    out = subprocess.run(["pgrep", "-x", "logic"], capture_output=True, text=True).stdout.split()
    return int(out[0]) if out else None


def hex_ip(h):
    return socket.inet_ntoa(struct.pack("<I", int(h, 16)))


def tcp_entries(pid):
    rows = []
    try:
        with open(f"/proc/{pid}/net/tcp") as f:
            next(f)
            for line in f:
                p = line.split()
                lip, lport = p[1].split(":")
                rip, rport = p[2].split(":")
                rows.append((hex_ip(lip), int(lport, 16), hex_ip(rip), int(rport, 16)))
    except OSError:
        pass
    return rows


def find_db_cgroup(lpid):
    if os.environ.get("DB_CGROUP"):
        return os.environ["DB_CGROUP"]
    peers = {rip for _, _, rip, rport in tcp_entries(lpid) if rport == 5432}
    for scope in glob.glob(f"{CG_ROOT}/system.slice/docker-*.scope"):
        procs = open(f"{scope}/cgroup.procs").read().split()
        if not procs:
            continue
        try:
            comm = open(f"/proc/{procs[0]}/comm").read().strip()
        except OSError:
            continue
        if comm != "postgres":
            continue
        local = {lip for lip, lport, _, _ in tcp_entries(procs[0]) if lport == 5432}
        if peers & local:
            return scope
    raise RuntimeError("vsebnika baze ni bilo mogoče najti (nastavite DB_CGROUP)")


def cpu_usec(cg):
    with open(f"{cg}/cpu.stat") as f:
        for line in f:
            if line.startswith("usage_usec"):
                return int(line.split()[1])
    return 0


def mem_mb(cg):
    return int(open(f"{cg}/memory.current").read()) / 1048576


def host_cpu():
    v = list(map(int, open("/proc/stat").readline().split()[1:]))
    idle = v[3] + v[4]
    return sum(v), idle


def proc_status(pid):
    rss = thr = None
    try:
        for line in open(f"/proc/{pid}/status"):
            if line.startswith("VmRSS:"):
                rss = int(line.split()[1]) / 1024
            elif line.startswith("Threads:"):
                thr = int(line.split()[1])
    except OSError:
        pass
    return rss, thr


def main():
    out = sys.argv[1]
    lpid = logic_pid()
    if lpid is None:
        sys.exit("proces `logic` ne teče – zaženite aplikacijo")
    app_cg = cgroup_of(lpid)
    db_cg = find_db_cgroup(lpid)
    print(f"[viri] aplikacija: {os.path.basename(app_cg)[:19]}  baza: {os.path.basename(db_cg)[:19]}", file=sys.stderr)

    stop = False

    def handler(*_):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGTERM, handler)
    signal.signal(signal.SIGINT, handler)

    ncpu = os.cpu_count()
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["cas", "app_cpu_pct", "app_mem_mb", "db_cpu_pct", "db_mem_mb",
                    "logic_pid", "logic_rss_mb", "logic_niti", "gostitelj_cpu_pct"])
        prev = (time.time(), cpu_usec(app_cg), cpu_usec(db_cg), *host_cpu())
        while not stop:
            time.sleep(1)
            now = time.time()
            try:
                a, d = cpu_usec(app_cg), cpu_usec(db_cg)
                am, dm = mem_mb(app_cg), mem_mb(db_cg)
            except OSError:  # vsebnik je izginil
                a = d = 0
                am = dm = float("nan")
            tot, idle = host_cpu()
            dt = now - prev[0]
            pid = logic_pid()
            rss, thr = proc_status(pid) if pid else (None, None)
            host = 100 * (1 - (idle - prev[4]) / max(1, tot - prev[3])) * ncpu
            w.writerow([f"{now:.3f}",
                        f"{(a - prev[1]) / 1e4 / dt:.1f}", f"{am:.1f}",
                        f"{(d - prev[2]) / 1e4 / dt:.1f}", f"{dm:.1f}",
                        pid or "", f"{rss:.1f}" if rss else "", thr or "", f"{host:.1f}"])
            f.flush()
            prev = (now, a, d, tot, idle)


if __name__ == "__main__":
    main()
