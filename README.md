<div align="center">

<img src="frontend/EventEase/public/EventEaseIkonca.svg" alt="EventEase" width="72" />

# EventEase

**Usklajevanje terminov skupinskih dogodkov — brez registracije, brez kaosa.**

[![Live](https://img.shields.io/badge/🌐_Deluje_tukaj-eventeaseapp.up.railway.app-4E598C)](https://eventeaseapp.up.railway.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](frontend/EventEase/)
[![Zig](https://img.shields.io/badge/Zig-0.16-F7A41D?logo=zig&logoColor=white)](backend/logic/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](compose.yaml)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](backend/database/podatkovna_shema.sql)

</div>

---

## Namen

Iskanje skupnega termina za skupinski dogodek po navadi pomeni neskončne klepetalne niti. EventEase to reši z glasovalno anketo: organizator ustvari anketo z datumi, jo deli z udeleženci, ti glasujejo, organizator pa potrdi zmagovalni termin. Vsi, ki so vnesli e-naslov, samodejno prejmejo .ics datoteko za uvoz v koledar.

**Uporabniki:** kdorkoli, ki organizira skupinski dogodek (ekipni sestanek, izlet, zabava…). Registracija ni potrebna.

---

## Funkcionalnosti

- Ustvarjanje ankete z naslovom, opisom in izbranimi termini
- Deljenje ankete prek povezave, e-pošte ali socialnih omrežij
- Glasovanje z interaktivnim koledarjem (da / če je nujno / ne)
- Predlaganje novih terminov s strani udeležencev
- Admin pogled za organizatorja z vsemi glasovi in predlogi
- Potrditev termina → e-pošta + .ics vsem udeležencem
- Temni/svetli način

---

## Demonstracija

| Ustvarjanje | Glasovanje | Zaključevanje|
|:---:|:---:|:---:|
| ![Ustvarjanje](docs/gifs/Demonstracija1.gif) | ![Glasovanje](docs/gifs/Demonstracija2.gif) | ![Glasovanje](docs/gifs/Demonstracija3.gif) |

---

## Arhitektura

```
Browser → nginx (:8080)
              ├── /api/*  → Zig backend (:3000)  → PostgreSQL
              └── /*      → React SPA (static)
```

Vse teče v enem Docker kontejnerju — nginx posreduje API zahteve Zig procesu, statične datoteke pa streže neposredno.

### Izsek: ustvarjanje ankete (Zig)

```zig
pub fn createPoll(app: *App, req: *httpz.Request, res: *httpz.Response) !void {
    const poll_id  = try uuidV4Hex(res.arena, app.rng);
    const admin_token = try uuidV4Hex(res.arena, app.rng);
    const share_token = try uuidV4Hex(res.arena, app.rng);

    _ = try app.db.exec(
        "INSERT INTO polls (id, title, organizer_email, admin_token, share_token) VALUES ($1,$2,$3,$4,$5)",
        .{ poll_id, input.title, input.organizer_email, admin_token, share_token },
    );
    // ...
}
```

Dostop je izključno prek UUID žetonov — admin_token za organizatorja, share_token za udeležence. Ni sej, ni prijav.

### API poti

| Metoda | Pot | Namen |
|--------|-----|-------|
| `POST` | `/api/polls` | Ustvari anketo |
| `GET`  | `/api/polls/share/:token` | Pridobi anketo (udeleženec) |
| `POST` | `/api/polls/share/:token/vote` | Odda glas |
| `POST` | `/api/polls/share/:token/suggest` | Predlaga termin |
| `GET`  | `/api/polls/admin/:token` | Admin pogled |
| `POST` | `/api/polls/admin/:token/finalize` | Potrdi termin |
| `POST` | `/api/polls/admin/:token/accept-suggestion` | Sprejme predlog |

---

## Struktura repozitorija

```
Praktikum2/
├── .github/workflows/          # Avtomatizacija CI/CD
│   └── ci.yml
├── backend/                   
│   ├── database/               # Sheme in skripte za podatkovno bazo
│   └── logic/                  # Glavna logika aplikacije v jeziku Zig
│       ├── src/ 📁            
│       ├── build.zig
│       └── build.zig.zon
├── docs/                       # Dokumentacija projekta in slikovno gradivo
├── frontend/EventEase/         # Prednji del aplikacije (React + Vite)
│   ├── public/                 # Statične datoteke (logotipi, ikone)
│   ├── src/ 📁                 # Komponente, strani, pogledi
│   ├── index.html              
│   ├── package.json            # Knjižnice in npm skripte
│   └── vite.config.js          
├── scripts/                    # Pomožne skripte za testiranje
│   └── ci-smoke-test.sh
├── Dockerfile                  # Navodila za gradnjo Docker kontejnerja
├── compose.yaml                # Konfiguracija Docker Compose za lokalni zagon
└── nginx.conf                  
```

---

## Zagon

### Docker (priporočeno)

```bash
git clone <repo>
cd Praktikum2
docker compose up --build
```

Odpri [http://localhost:8080](http://localhost:8080). Baza se inicializira samodejno.

> Lokalni e-maili so onemogočeni (`DISABLE_EMAILS=true`). Mailpit UI na [http://localhost:8025](http://localhost:8025).

### Lokalni razvoj

**1. Baza** — poženi shemo:
```bash
psql -U admin -d eventeasedb -f backend/database/podatkovna_shema.sql
```

**2. Backend:**
```bash
cd backend/logic
export DATABASE_URL="postgresql://admin:admin@localhost/eventeasedb"
zig build run
```

**3. Frontend:**
```bash
cd frontend/EventEase
npm ci && npm run dev   # → http://localhost:5173, /api proxy → :3000
```

---

## Zunanje odvisnosti

**Backend:** [Zig 0.16](https://ziglang.org/) · [http.zig](https://github.com/karlseguin/http.zig) · [pg.zig](https://github.com/karlseguin/pg.zig) · [Resend](https://resend.com) (e-pošta)

**Frontend:** React 19 · React Router 7 · Tailwind CSS 4 · Vite 8

**Infrastruktura:** PostgreSQL 16 · nginx 1.27 · Docker

---

## Kaj še manjka / Nadaljnji razvoj

- Omejevanje pogostosti pošiljanja e-pošte
- Anonimen način glasovanja
- Določanje trajanja termina (npr. od 7.7 do 13.7)

## Avtorji:
- Jure Antolič
- Lenart Beršnak
- Nikolaj Logar

### Opombe:
Zaradi tega ker nimamo registrirane domene, trenutno epoštna sporočila prihajajo samo na en naslov (za demonstracijo).
