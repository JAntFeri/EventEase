# EventEase – pregled dokumentacije, standardov kodiranja in zagotavljanja kakovosti

Poročilo ima tri dele:

1. preverjanje namestitvene dokumentacije (`README.md`),
2. standardi kodiranja in popravek ene datoteke,
3. stanje testiranja in zagotavljanja kakovosti.

> Namestitev je bila dejansko preizkušena na Linuxu (Debian, Zig 0.16.0, Node 20.19.2, Docker). Opažanja za Windows in macOS izhajajo iz analize `Dockerfile`, `compose.yaml` in README. Člani ekipe, ki uporabljajo ta sistema, naj jih potrdijo ali dopolnijo.

---

## 1. Preverjanje dokumentacije za namestitev

### 1.1 Postopek, ki smo mu sledili

1. `docker compose up --build` → odpremo http://localhost:8080
2. Lokalni razvoj: baza (`psql … -f backend/database/podatkovna_shema.sql`) → backend (`zig build run`) → frontend (`npm ci && npm run dev`)

### 1.2 Opažanja (združena)

| # | Področje | Opažanje | Resnost | Predlog popravka |
|---|----------|----------|---------|------------------|
| 1 | Shema baze | README za ročno namestitev uporablja `backend/database/podatkovna_shema.sql`. Backend ob zagonu sam izvede **drugo** datoteko (`backend/logic/src/podatkovna_shema.sql`, `@embedFile`). Datoteki se razlikujeta: starejši manjka stolpec `votes.participant_email`, poleg tega ni idempotentna (`CREATE TABLE` brez `IF NOT EXISTS`). | Visoka | Korak `psql` odstranimo iz README, ker backend shemo ustvari sam. Podvojeno datoteko izbrišemo ali jo nadomestimo s povezavo na `src/` različico. |
| 2 | Začetno stanje baze | Ukaz `psql -U admin -d eventeasedb` predpostavlja, da uporabnik `admin` in baza `eventeasedb` že obstajata. README ne pove, kako ju ustvariti. | Visoka | Dodamo korak `createuser`/`createdb` ali predlagamo `docker compose up db`, ki bazo pripravi samodejno. |
| 3 | Okoljske spremenljivke | `RESEND_API_KEY`, `DISABLE_EMAILS` in `PORT` v README niso opisane, prav tako ni opisana datoteka `.env` (compose jo prebere, ni pa obvezna). Primera `.env.example` ni, čeprav ga `.gitignore` izrecno dovoljuje. | Srednja | Dodamo tabelo spremenljivk in datoteko `.env.example`. |
| 4 | E-pošta lokalno | README navaja: »Lokalni e-maili so onemogočeni … Mailpit UI na :8025«. Mailpit se zažene, vendar ga aplikacija ne uporablja več, ker pošilja prek Resend HTTP API. `msmtprc` in zakomentirana koda msmtp sta ostanka. Uporabnik zato v Mailpitu nikoli ne vidi ničesar. | Srednja | Omembo Mailpita odstranimo ali jasno napišemo, da e-pošta lokalno ni na voljo. Odstranimo tudi storitev `mailpit` in `msmtprc`. |
| 5 | macOS (Apple Silicon) | `Dockerfile` vedno prenese `zig-x86_64-linux`. Na ARM gostitelju je builder slika arm64, zato se binarna datoteka Zig ne izvede in gradnja odpove. | Visoka (za uporabnike Mac M1+) | V README dodamo `DOCKER_DEFAULT_PLATFORM=linux/amd64` ali v `Dockerfile` arhitekturo izberemo glede na `TARGETARCH`. |
| 6 | Windows | Ukaz `export DATABASE_URL=…` deluje samo v bash. V PowerShellu je treba uporabiti `$env:DATABASE_URL="…"`. Docker na Windows potrebuje Docker Desktop + WSL2, kar ni omenjeno. Ob `core.autocrlf=true` dobi `scripts/ci-smoke-test.sh` konce vrstic CRLF in se ne izvede. | Srednja | Dodamo razdelek »Windows« in datoteko `.gitattributes` z `*.sh text eol=lf`. |
| 7 | Predpogoji | Zahtevane različice niso navedene kot predpogoj. Zig mora biti **točno 0.16** (koda uporablja novi `std.Io`/`std.process.Init` API, zato se s starejšimi različicami ne prevede). Node mora biti vsaj 20.19 ali 22.12 (zahteva Vite 8). Potreben je PostgreSQL 16. | Srednja | Dodamo razdelek »Predpogoji« z različicami in povezavami. |
| 8 | Internet ob prvem buildu | `zig build` ob prvem zagonu prenese odvisnosti (`httpz`, `pg`) z GitHuba. Brez povezave gradnja ne uspe. | Nizka | To omenimo v README. |
| 9 | Kloniranje | `git clone <repo>` je ostal kot nadomestno besedilo. | Nizka | Vstavimo `https://github.com/JAntFeri/EventEase`. |
| 10 | Vrata | Compose izpostavi vrata `5432`. Če na gostitelju že teče PostgreSQL, se `docker compose up` ustavi z napako »port already allocated«. | Nizka | To omenimo v README ali vrata spremenimo v `5433:5432`. |
| 11 | API dokumentacija | V tabeli API poti manjka `POST /api/polls/share-email`, ki ga frontend uporablja pri deljenju prek e-pošte. | Nizka | Dodamo vrstico. |
| 12 | Sledenje datotekam | `msmtprc` je v `.gitignore`, a je kljub temu v repozitoriju. Datoteka `frontend/fn.txt` je izpis `grep` brez namena. `i18j.js` in `src/locales/*.json` se nikjer ne uporabljajo (`i18j.js` uvaža neobstoječi `es.json`, knjižnica `i18next` pa ni nameščena). | Nizka | Neuporabljene datoteke odstranimo iz repozitorija. |
| 13 | Samostojen frontend | `npm run dev` brez zagnanega backenda ob vsakem klicu `/api` vrne napako proxyja. README tega ne pove. | Nizka | Dodamo opombo, da mora backend teči na :3000. |

### 1.3 Kaj deluje po navodilih

- `docker compose up --build` na Linuxu (x86_64) zgradi in zažene aplikacijo. Baza se inicializira samodejno.
- `zig build run` z nastavljenim `DATABASE_URL` zažene backend na :3000, migracija se izvede sama.
- `npm ci && npm run dev` zažene frontend na :5173 s proxyjem na backend.

---

## 2. Standardi kodiranja

### 2.1 Standardi, ki smo jih (večinoma) upoštevali

**Zig (backend)** – sledimo uradnemu Zig style guide:

| Element | Pravilo | Primer |
|---------|---------|--------|
| Funkcije | `camelCase` | `createPoll`, `sendEmail`, `uuidV4Hex` |
| Spremenljivke, polja | `snake_case` | `poll_id_str`, `admin_token`, `final_slot_id` |
| Tipi / strukture | `PascalCase` | `App`, `VoteRecord`, `MimeMap` |
| Datoteke | `snake_case.zig` | `routes.zig`, `cleanup.zig` |
| Oblikovanje | `zig fmt` (4 presledki) | — |
| Napake | `try` / `catch` z `std.log.err`; PG napake se izpišejo prek `conn.err` | `routes.zig` |

**JavaScript / React (frontend):**

| Element | Pravilo | Primer |
|---------|---------|--------|
| Komponente in datoteke komponent | `PascalCase` (`.jsx`) | `CalendarPicker.jsx`, `InviteView` |
| Funkcije, spremenljivke, state | `camelCase`, `[x, setX]` | `navigateHome`, `isFinalized` |
| Pomožne datoteke | `camelCase.js` | `eventHelpers.js` |
| Polja iz API | ostanejo `snake_case` (kot v bazi) | `share_token`, `start_time` |
| Struktura | `pages/` (povezane z routerjem), `views/` (prikazi), `components/` (ponovno uporabni deli), `utils/` (čiste funkcije) | — |
| Lint | ESLint (`@eslint/js` recommended, `react-hooks`, `react-refresh`) | `eslint.config.js` |
| Slogi | Tailwind razredi, barve prek CSS spremenljivk (`var(--color-…)`) | `theme.css` |

**Skupno:**

- Identifikatorji so v angleščini, besedila v uporabniškem vmesniku in e-poštah pa v slovenščini.
- Commit sporočila so v slovenščini.

### 2.2 Ugotovljena odstopanja

| Odstopanje | Kje |
|------------|-----|
| Mešani narekovaji (`'…'` in `"…"`). Projekt nima Prettierja ali drugega orodja za oblikovanje. | `LandingPage.jsx` (17× enojni), ostale datoteke dvojni |
| Mešan jezik in neprimerni komentarji (»// add this line«, »// 1. Import Tailwind«, »<-- This must sit right here«). Nekateri komentarji so v slovenščini, večina v angleščini. | `routes.zig`, `vite.config.js`, `main.jsx` |
| Mrtva koda: `handleEventCreation`, stanje `activeEvent`, pogled `invite-view` (`CreateEventWizard` sploh ne sprejme `onCreate`), odvečna odvisnost `activeEvent` v `useEffect`, zastareli `substr`. | `LandingPage.jsx` |
| Podvojena logika: `uuidV4Hex` v `routes.zig` podvaja `uuid.zig`. Pretvorbo časa `.replace(" ", "T").split("+")[0]` ponavljamo v več pogledih. | `routes.zig`, `InvitePage.jsx`, `AdminFinalizeView.jsx` |
| Pregloboko gnezdenje in predolge datoteke. | `routes.zig` (1164 vrstic, ena datoteka za vse poti in e-pošto), `InviteView.jsx` (637 vrstic, zamik do 32 presledkov) |
| Večkrat ponovljeni inline slogi `style={{…}}` namesto Tailwind razredov. | `LandingPage.jsx` |
| Velika zakomentirana koda (stara msmtp implementacija). | `routes.zig` |

### 2.3 Dopolnjeni standardi (definirani na podlagi pregleda)

1. **Narekovaji:** v JS/JSX uporabljamo samo dvojne narekovaje.
2. **Komentarji:** pišemo jih v angleščini, tako kot identifikatorje. Komentar razloži *zakaj*, ne *kaj*. Na vrhu datoteke je pot in en stavek o namenu. Ne puščamo navodil tipa »add this line« ali zakomentirane kode, ker zgodovino hrani git.
3. **Brez mrtve kode:** neuporabljeno stanje, props in veje odstranimo.
4. **Konstante namesto magičnih nizov:** ponavljajoče se vrednosti (imena pogledov, naslovi) shranimo v konstante z imeni `UPPER_SNAKE_CASE`.
5. **Slogi:** uporabljamo Tailwind razrede. `style={{…}}` je dovoljen samo za dinamične vrednosti.
6. **Gnezdenje:** JSX gnezdimo največ do 4–5 nivojev. Globlje dele izločimo v podkomponento. Pri Zig ločimo datoteke po odgovornosti (npr. `email.zig`, `ics.zig`).
7. **Oblikovanje:** Zig oblikujemo z `zig fmt`, JS pa po pravilih ESLint (pred commitom `npm run lint`).

### 2.4 Popravljena datoteka: `frontend/EventEase/src/pages/LandingPage.jsx`

Spremembe glede na standarde iz 2.3:

- Vsi narekovaji so dvojni (pravilo 1).
- Dodan je komentar z namenom datoteke (pravilo 2).
- Odstranjena mrtva koda: `handleEventCreation`, `activeEvent`, pogled `invite-view`, uvoz `InviteView`, neuporabljeni prop `onCreate`, prazna vrstica v footerju (pravilo 3).
- Imena pogledov in naslovi strani so v konstantah `VIEW_LANDING`, `VIEW_CREATE`, `PAGE_TITLES`. `switch` je nadomeščen z iskanjem po objektu (pravilo 4).
- Inline `style` je zamenjan s Tailwind razredi (`h-7 w-7`, `text-[var(--color-…)]`) (pravilo 5).

Po spremembi `npm run lint` ne javi napak, `npm run build` pa uspe. Delovanje ostaja enako: začetna stran → čarovnik → nazaj.

---

## 3. Testiranje in zagotavljanje kakovosti

### 3.1 Prisotne aktivnosti

| Aktivnost | Vrsta | Stanje | Pokriti del rešitve | Orodja / ogrodja | Uporaba UI |
|-----------|-------|--------|---------------------|------------------|------------|
| Enotski testi frontenda | Avtomatsko, enotsko testiranje | Deluje, 5/5 testov uspešnih | Samo `src/utils/eventHelpers.js` (3 pomožne funkcije). Komponente niso testirane. | Vgrajeni Node test runner (`node:test`, `node:assert`), `npm test` | *dopolni ekipa* |
| Enotski testi backenda | Avtomatsko, enotsko testiranje | Deluje, vsi testi uspešni | Samo `uuid.zig` (pretvorbe in validacija UUID, 6 testov). `routes.zig`, e-pošta in ICS niso testirani. | Vgrajeni `zig test`, korak `zig build test` | *dopolni ekipa* |
| Statična analiza (lint) | Statično preverjanje kode | Deluje, 0 napak | Celoten frontend (`**/*.{js,jsx}`) | ESLint 10 + `react-hooks` + `react-refresh` | *dopolni ekipa* |
| Preverjanje prevajanja | Statično preverjanje | Deluje | Backend (prevajalnik Zig) in frontend (`vite build`) | Zig 0.16, Vite 8 | — |
| API smoke test | Avtomatsko, integracijsko / end-to-end testiranje API | Deluje v CI | Glavni tok: ustvari anketo → pridobi → glasuj → potrdi → preveri `is_finalized`. Ni pokrito: predlogi, admin GET, napake (404, 409). | Bash, `curl`, `jq`, `scripts/ci-smoke-test.sh` | *dopolni ekipa* |
| Neprekinjena integracija | Avtomatizacija QA | Deluje ob vsakem push/PR na `main` | Lint + testi + build frontenda, build + testi backenda, Docker build + smoke test | GitHub Actions (`.github/workflows/ci.yml`), Docker Compose | *dopolni ekipa* |
| Kontejnerizacija | Ponovljivost okolja | Deluje (x86_64) | Celotna aplikacija + PostgreSQL | Docker, Docker Compose | — |
| Ročno testiranje | Ročno, sistemsko / uporabniško | Izvajano sproti, brez zapisanih testnih primerov | UI tokovi (ustvarjanje, glasovanje, predlogi, potrditev, e-pošta na produkciji) | Brskalnik, Railway deploy, logi | — |
| Beleženje napak | Podpora odpravljanju napak | Prisotno | Backend: PG napake in napake pri e-pošti (`std.log.err`) | Zig `std.log`, Railway logi | — |
| Sledenje težavam | Upravljanje napak | Delno (npr. commit »email fix #32«) | — | GitHub Issues | — |

### 3.2 Uporaba umetne inteligence

| Kje | Orodje | Način uporabe | Kako je bil rezultat preverjen |
|-----|--------|---------------|--------------------------------|
| To poročilo (analiza dokumentacije, standardov in QA) | Claude Code | Pregled kode in konfiguracije, zagon lint/testov, osnutek poročila | Ekipa pregleda vsako trditev. Lint, testi in build so bili dejansko zagnani (rezultati v 3.1). |
| Popravek `LandingPage.jsx` | Claude Code | Preoblikovanje datoteke po standardih iz 2.3 | `npm run lint`, `npm run build`, ročni preizkus v brskalniku *(dopolni)* |
| Testi, CI, ostala koda | *dopolni ekipa* | *dopolni ekipa* | *dopolni ekipa* |

### 3.3 Glavne vrzeli in predlogi

1. **Ni testov za poslovno logiko backenda** (`routes.zig`). Predlagamo integracijske teste proti testni bazi ali razširitev smoke testa na predloge, admin pogled in napake (404, 409 pri dvojni potrditvi).
2. **Ni testov komponent React.** Predlagamo Vitest + React Testing Library vsaj za `CalendarPicker` in `InviteView`.
3. **Ni E2E testov uporabniškega vmesnika.** Predlagamo Playwright za tok ustvari → glasuj → potrdi.
4. **Ni merjenja pokritosti.** Predlagamo `node --test --experimental-test-coverage` in poročilo v CI.
5. **Ni samodejnega oblikovanja.** Predlagamo Prettier za frontend in korak `zig fmt --check` v CI.
6. **Ni validacije vhoda na backendu** (dolžina naslova, oblika e-pošte, veljavnost UUID žetona pred poizvedbo). `isValidUuidHex` že obstaja, vendar se ne uporablja.
