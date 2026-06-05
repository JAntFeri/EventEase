<div align="center">

# EventEase

<a href="frontend/EventEase/public/EventEaseIkonca.svg">
  <img src="frontend/EventEase/public/EventEaseIkonca.svg" alt="EventEase logo" width="88" />
</a>

**Usklajevanje terminov skupinskih dogodkov — brez registracije, brez kaosa.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](frontend/EventEase/)
[![Zig](https://img.shields.io/badge/Zig-0.16-F7A41D?logo=zig&logoColor=white)](backend/logic/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](compose.yaml)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](backend/database/podatkovna_shema.sql)

<br />

### Built with

[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![nginx](https://img.shields.io/badge/nginx-proxy-009639?logo=nginx&logoColor=white)](nginx.conf)

[Posnetki](#posnetki-zaslona) · [Zagon](#zagon-rešitve) · [Manjka](#kaj-še-manjka)

</div>

---

## Povzetek

EventEase nadomešča neskončne klepetalne niti pri iskanju skupnega termina. Organizator ustvari anketo z datumi in urami in jo pošlje udeležencem. Udeleženci glasujejo za termin preko enostavnega uporabniškega vmesnika, organizator na koncu potrdi zmagovalni termin.



## Posnetki zaslona

Slike shrani v `docs/screenshots/` in spodaj odkomentiraj vrstice, ki jih potrebuješ.

<!--
| Začetna stran | Ustvarjanje dogodka | Glasovanje | Admin |
|:---:|:---:|:---:|:---:|
| ![Začetna stran](docs/screenshots/landing.png) | ![Ustvarjanje](docs/screenshots/create.png) | ![Glasovanje](docs/screenshots/vote.png) | ![Admin](docs/screenshots/admin.png) |
-->

<!-- Posamezne slike:
![Začetna stran](docs/screenshots/landing.png)
![Ustvarjanje dogodka](docs/screenshots/create.png)
![Glasovanje](docs/screenshots/vote.png)
![Admin](docs/screenshots/admin.png)
-->

## Struktura repozitorija

```
Praktikum2/
├── compose.yaml              # Docker Compose (app + PostgreSQL)
├── Dockerfile                # Multi-stage build (Zig → React → nginx)
├── nginx.conf                # Statični frontend + proxy /api → Zig
├── backend/
│   ├── database/
│   │   └── podatkovna_shema.sql   # Izvorna SQL shema
│   └── logic/                     # Zig backend
│       ├── build.zig
│       ├── build.zig.zon          # Odvisnosti (httpz, pg)
│       └── src/
│           ├── main.zig           # Vstopna točka, routing
│           ├── routes.zig         # REST API
│           ├── db.zig             # Povezava in migracije
│           ├── static.zig         # Statične datoteke (prod)
│           └── podatkovna_shema.sql
└── frontend/EventEase/            # React SPA
    ├── src/
    │   ├── App.jsx                # React Router
    │   ├── pages/                 # LandingPage, CreateEventPage, InvitePage
    │   ├── views/                 # LandingView, InviteView, AdminFinalizeView
    │   └── components/            # CalendarPicker, VoteResults
    └── vite.config.js             # Dev proxy /api → localhost:3000
```

## Zunanje odvisnosti

<details>
<summary><strong>Backend</strong></summary>

| Paket | Verzija |
|-------|---------|
| [Zig](https://ziglang.org/) | 0.16.0 |
| [http.zig](https://github.com/karlseguin/http.zig) | git |
| [pg.zig](https://github.com/karlseguin/pg.zig) | git |

</details>

<details>
<summary><strong>Frontend</strong></summary>

| Paket | Verzija |
|-------|---------|
| react / react-dom | ^19.2.6 |
| react-router-dom | ^7.15.1 |
| tailwindcss | ^4.3.0 |
| vite | ^8.0.12 |

</details>

<details>
<summary><strong>Infrastruktura</strong></summary>

| Komponenta | Verzija |
|------------|---------|
| PostgreSQL | 16-alpine |
| nginx | 1.27-alpine |
| Node *(build)* | 24-alpine |

</details>

## Zagon rešitve

### Docker *(priporočeno)*

```bash
docker compose up --build
```

→ [http://localhost:8080](http://localhost:8080)

<details>
<summary>Privzeti podatki baze</summary>

| Parameter | Vrednost |
|-----------|----------|
| Uporabnik | `admin` |
| Geslo | `admin` |
| Baza | `eventeasedb` |

Aplikacija nima uporabniških računov — dostop je prek UUID povezav, ki jih backend generira ob ustvarjanju ankete.

</details>

### Lokalni razvoj

**1. PostgreSQL** — ustvari bazo in poženi shemo. Podrobnosti v [`backend/README.md`](backend/README.md).

**2. Backend** — `backend/logic/`:

```bash
export DATABASE_URL="postgresql://admin:admin@localhost/eventeasedb"
zig build run
```

**3. Frontend** — `frontend/EventEase/`:

```bash
npm ci && npm run dev
```

Vite proxy preusmeri `/api` → `localhost:3000`.


</details>

<details>
<summary><code>nginx.conf</code> — proxy v produkciji</summary>

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
}
```

</details>

## Nadaljnji razvoj

- [ ] Backend endpointi: naloge, predlogi datumov, e-poštna obvestila
- [ ] Validacija vhodnih podatkov
- [ ] Enotni in integracijski testi + CI/CD
- [ ] Seed skripta z demo anketo
- [ ] iCal izvoz potrjenega termina

## Kaj še manjka

- **Naloge** — frontend jih zbira, backend jih ne shranjuje
- **Predlogi datumov** — tabela `slot_suggestions` obstaja, API `/suggest` manjka
- **E-pošta** — endpoint `/api/polls/share-email` ni implementiran
- **Avtentikacija** — samo skrivni žetoni v URL
- **Testi in CI** — trenutno ni avtomatiziranih testov
- **Demo podatki** — ob prvem zagonu je baza prazna

---

<div align="center">

