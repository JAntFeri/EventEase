# EventEase – specifikacija funkcionalnih testov

| | |
|---|---|
| **Dokument** | Specifikacija testov (načrt testov, testni primeri, testni postopki) |
| **Predloga** | prirejena po ISO/IEC/IEEE 29119-3:2021, *Test documentation* |
| **Testirani sistem** | EventEase, različica `9c0310e` (veja `jureQA`) |
| **Avtor** | Jure Antolič |
| **Datum** | 4. 11. 2026 |
| **Povezani dokumenti** | [Poročilo testiranja](Porocilo_testiranja.md), [README](../../README.md), [Strategija testiranja enot](../Strategija_testiranja.md), [Pregled dokumentacije in QA](../Pregled_dokumentacije_standardov_QA.md) |

Standard ISO/IEC/IEEE 29119-3 določa dokumente, ki nastanejo med testiranjem, ne pa njihove točne oblike. Iz njega smo vzeli tiste dele, ki jih potrebuje majhen projekt z enim izvajalcem:

| Dokument po 29119-3 | Kje je |
|---|---|
| Test Design Specification (pogoji in pokritost) | poglavje 5 |
| Test Case Specification | poglavje 6 |
| Test Procedure Specification | poglavje 7 |
| Test Environment Requirements | poglavje 4 |
| Test Execution Log, Test Incident Report, Test Completion Report | [Poročilo testiranja](Porocilo_testiranja.md) |

Načrta testiranja na ravni projekta (Test Plan) in strategije organizacije ne pišemo posebej. Obseg in pristop sta opisana v poglavjih 1 in 5.

---

## 1. Uvod

### 1.1 Namen

Dokument opisuje funkcionalne (sistemske, črna škatla) teste treh ključnih funkcionalnosti EventEase: ustvarjanja ankete, glasovanja in potrditve termina. Za vsak test določi pogoje, vhodne podatke, pričakovane rezultate in natančen postopek, tako da ga lahko kdorkoli ponovi in dobi primerljiv rezultat.

### 1.2 Obseg

**V obsegu:** obnašanje prek uporabniškega vmesnika (React SPA) in prek HTTP API (`/api/polls/...`), kot ga vidi uporabnik ali odjemalec, ter stanje v bazi po vsaki operaciji.

**Izven obsega:** predlaganje in sprejemanje terminov, deljenje po e-pošti, čiščenje starih anket, dejansko pošiljanje e-pošte in vsebina priponke `.ics` (v testnem okolju je pošiljanje izklopljeno, glej 4.3), zmogljivost, varnost (razen ločitve žetonov) in dostopnost. Testi enot so opisani v [Strategiji testiranja enot](../Strategija_testiranja.md).

### 1.3 Pojmi

| Pojem | Pomen |
|---|---|
| Anketa (poll) | Dogodek z več možnimi termini, o katerih glasujejo udeleženci. |
| Termin (time slot) | Par `start_time`–`end_time`, ki pripada natanko eni anketi. |
| `share_token` | UUID v povezavi za udeležence (`/invite/<share_token>`). Omogoča ogled in glasovanje. |
| `admin_token` | UUID v povezavi za organizatorja (`/admin/<admin_token>`). Omogoča ogled rezultatov in potrditev. |
| Finalizacija | Organizator izbere končni termin. Anketa je nato zaključena (`is_finalized = true`). |
| TS / TC / TP | testni scenarij / testni primer / testni postopek |

---

## 2. Pregled obstoječe dokumentacije in obnovljene funkcionalnosti

### 2.1 Pregled obstoječe dokumentacije

| Dokument | Kaj vsebuje | Kaj manjka za funkcionalno testiranje |
|---|---|---|
| `README.md` | Namen, seznam 7 funkcionalnosti v eni vrstici, arhitektura, tabela API poti, zagon. | Ni pravil (kaj je veljaven vhod, kaj se zgodi ob napaki), ni odzivnih kod, ni opisa stanj ankete. Manjka pot `POST /api/polls/share-email`. |
| `docs/Strategija_testiranja.md` | Testi enot (čiste funkcije v frontendu in Zig), mutacijsko testiranje. | Integracija frontend–backend–baza ni pokrita, poteki uporabnika niso opisani. |
| `docs/Pregled_dokumentacije_standardov_QA.md` | Preverjanje namestitve, standardi kodiranja, stanje QA. | Funkcionalnosti niso opisane. |
| `scripts/ci-smoke-test.sh` | En srečen potek prek API (ustvari, glasuj, potrdi). | Negativni in robni primeri ne obstajajo. |
| `CLAUDE.md` | Arhitektura za razvijalce. | Ni namenjen opisu zahtev. |
| `Info_doc.pdf` | Projektna informacija (ni del razvojne dokumentacije). | – |

**Ugotovitev:** obstoječa dokumentacija funkcionalnosti samo našteje. Zahtev, iz katerih bi lahko izpeljali pričakovane rezultate, ni. Zato smo ključne funkcionalnosti obnovili (2.2) iz README, besedil v uporabniškem vmesniku (obvestila o napakah so dejansko specifikacija pravil), API pogodbe in sheme baze.

### 2.2 Obnovljene funkcionalne zahteve

Viri: **R** = README, **UI** = besedilo/obnašanje vmesnika, **API** = odzivi backenda (`routes.zig`), **DB** = omejitve v shemi (`podatkovna_shema.sql`), **HTTP** = splošni dogovor (napaka odjemalca → 4xx).

#### Ustvarjanje ankete

| ID | Zahteva | Vir |
|---|---|---|
| FZ-01 | Organizator brez registracije ustvari anketo z naslovom, e-pošto, neobveznim opisom in vsaj enim terminom. | R, UI |
| FZ-02 | Naslov in e-pošta organizatorja sta obvezna. Brez naslova se prikaže »Prosimo, vnesite naslov dogodka.« | UI |
| FZ-03 | Izbran mora biti vsaj en termin: »Prosimo, izberite vsaj en termin na koledarju.« Preteklih dni ni mogoče izbrati. | UI |
| FZ-04 | Termin ima začetek in konec. Konec je eno uro po izbrani uri začetka. | UI (`CalendarPicker`) |
| FZ-05 | Po ustvarjanju sistem vrne in prikaže dve različni povezavi: za organizatorja (`/admin/<admin_token>?invite=<share_token>`) in za udeležence (`/invite/<share_token>`). | R, API |
| FZ-06 | Strežnik neveljavno zahtevo zavrne z odzivom 4xx in ne shrani ničesar. | HTTP |

#### Glasovanje

| ID | Zahteva | Vir |
|---|---|---|
| FZ-07 | Udeleženec prek povezave za udeležence brez prijave vnese ime (obvezno) in e-pošto (neobvezno) ter za vsak termin izbere »Da«, »Če bo potrebno« ali »Ne«. | R, UI |
| FZ-08 | Uspešna oddaja vrne 201 in prikaže »Hvala, <ime>!«. Glas je viden v rezultatih (»Ustreza: …«, »Če bo potrebno: …«). | UI, API |
| FZ-09 | Ponovna oddaja z istim imenom glas posodobi in ne ustvari novega udeleženca. | API (posodobitev obstoječega glasu) |
| FZ-10 | Glas lahko vsebuje samo termine iste ankete, sicer 400 »One or more time slots do not belong to this poll.« | API |
| FZ-11 | Dovoljeni statusi so `yes`, `if_need_be`, `no`. | DB (`CHECK`) |
| FZ-12 | Neobstoječa ali neveljavna povezava vrne 404, vmesnik pa »Dogodka ni mogoče najti …«. | API, UI |

#### Potrditev termina (finalizacija)

| ID | Zahteva | Vir |
|---|---|---|
| FZ-13 | Organizator v skrbniškem pogledu vidi rezultate, izbere en termin in ga potrdi. Brez izbire: »Prosimo, izberite končni termin za zaklep dogodka.« | R, UI |
| FZ-14 | Potrditev je trajna: »Izbira in potrditev termina bosta trajno zaključili glasovanje.« Anketa dobi `is_finalized = true` in `final_slot_id`. | UI, API |
| FZ-15 | Ponovna potrditev vrne 409 »Poll has already been finalized.« | API |
| FZ-16 | Po potrditvi udeleženci vidijo potrjen termin in ne morejo več glasovati. | UI (opozorilo pri FZ-14) |
| FZ-17 | Potrdi se lahko samo termin te ankete. Neobstoječ termin vrne 400 »Final slot not found«. | API, R |
| FZ-18 | Potrjevati sme samo imetnik `admin_token`. `share_token` na skrbniških poteh vrne 404. | R (»Dostop je izključno prek UUID žetonov«) |
| FZ-19 | Ob potrditvi prejmejo organizator in vsi udeleženci z e-pošto obvestilo s priponko `.ics`. | R |

---

## 3. Testni scenariji in odgovorne osebe

| ID | Testni scenarij | Pokrite zahteve | Št. primerov | Odgovorna oseba |
|---|---|---|---|---|
| TS-01 | Ustvarjanje ankete | FZ-01 – FZ-06 | 5 | Jure Antolič |
| TS-02 | Glasovanje udeleženca | FZ-07 – FZ-12 | 6 | Jure Antolič |
| TS-03 | Potrditev (finalizacija) termina | FZ-13 – FZ-19 | 7 | Jure Antolič |

> Tabelo dopolnijo ostali člani skupine s svojimi scenariji (npr. predlaganje novih terminov, sprejem predloga, deljenje po e-pošti, čiščenje starih anket, temni/svetli način).

---

## 4. Testno okolje

### 4.1 Strojna in programska oprema

| Element | Vrednost |
|---|---|
| Gostitelj | Linux x86_64 (Debian, jedro 6.12) |
| Aplikacija | Docker Compose, ena slika (nginx 1.27 + Zig binarka `logic`), `http://localhost:8080` |
| Baza | PostgreSQL 16.14 (vsebnik `postgres:16-alpine`), `127.0.0.1:5433` |
| Brskalnik | Chromium (Playwright 1.61.1, brez glave, 1280 × 1000) |
| Izvajalnik | Node.js 20.19.2, `tests/functional/funkcionalni-testi.mjs` |
| Orodja za preverjanje | `psql` (stanje baze), vgrajeni `fetch` (API) |

### 4.2 Postavitev

Na gostitelju že teče lokalni PostgreSQL na vratih 5432, zato smo uporabili prepis [`tests/functional/compose.qa.yaml`](../../tests/functional/compose.qa.yaml), ki testno bazo izpostavi samo na `127.0.0.1:5433`, Mailpita pa ne izpostavi:

```yaml
services:
  db:
    ports: !override
      - "127.0.0.1:5433:5432"
  mailpit:
    ports: !reset []
```

```bash
sudo docker compose -p eventease-qa -f compose.yaml -f tests/functional/compose.qa.yaml up -d --build
```

Testna baza je ob zagonu prazna (nov volumen projekta `eventease-qa`). Vsak testni primer ustvari svoje ankete z naslovom, ki vsebuje oznako zagona (npr. `TS02 Izlet 20261104T101329`), zato so primeri med seboj neodvisni in zagon je mogoče ponoviti brez čiščenja.

### 4.3 Omejitve okolja

- `compose.yaml` nastavi `DISABLE_EMAILS=true`, zato backend e-pošte ne pošlje. **FZ-19 v tem okolju ni preverljiva.** Vsebino `.ics` pokrivajo testi enot v `email_content.zig`.
- Termini so v podatkih izbrani v prihodnjem mesecu glede na dan izvedbe, ker koledar preteklih dni ne dovoli izbrati.

### 4.4 Ponovitev izvedbe

```bash
# Playwright ni odvisnost projekta; potrebna je pot do node_modules, ki ga vsebuje
NODE_PATH=<pot>/node_modules \
BASE_URL=http://localhost:8080 \
TEST_DATABASE_URL=postgresql://admin:admin@127.0.0.1:5433/eventeasedb \
node tests/functional/funkcionalni-testi.mjs
```

Izvajalnik izvede postopke iz poglavja 7, za vsak korak zapiše pričakovani in dejanski rezultat ter shrani dokaze v `docs/testiranje/dokazi/` (`rezultati.json`, posnetki zaslona `TC-*.png`). Primer, ki ga ni mogoče izvesti do konca, označi kot BLOKIRAN, ostali primeri se izvedejo naprej. Izhodna koda je 0 samo, če so vsi primeri uspešni.

---

## 5. Načrt testov (pogoji in pokritost)

### 5.1 Pristop

- **Ekvivalenčni razredi**: veljaven vhod, manjkajoče obvezno polje, neveljavna vrednost, tuj objekt (termin druge ankete).
- **Mejne vrednosti**: termin, katerega konec pade v naslednji dan (23:30).
- **Prehodi stanj**: anketa *odprta* → *zaključena*. Preverimo dovoljene in nedovoljene operacije v obeh stanjih.
- **Dva sloja**: vsak glavni potek najprej prek UI (kot uporabnik), pravila pa tudi neposredno prek API, ker vmesnik ni edini odjemalec in ne sme biti edina obramba (FZ-06).
- **Preizkusna točka**: po vsaki operaciji preverimo tudi stanje v bazi, ne samo odziv.

Pričakovane rezultate smo izpeljali iz zahtev v 2.2, **ne iz trenutnega obnašanja kode**.

### 5.2 TS-01 Ustvarjanje ankete

| Pogoj | Tehnika | Primer |
|---|---|---|
| Veljavna anketa z več termini se shrani in vrne dve različni povezavi. | ekvivalenčni razred (veljaven) | TC-01-01 |
| Manjka naslov (UI). | ekvivalenčni razred (manjkajoče polje) | TC-01-02 |
| Ni izbranega termina (UI). | ekvivalenčni razred (prazen seznam) | TC-01-03 |
| Termin, ki se konča po polnoči. | mejna vrednost | TC-01-04 |
| Strežnik zavrne neveljavne vhode, tudi mimo UI. | ekvivalenčni razredi (6 neveljavnih) | TC-01-05 |

### 5.3 TS-02 Glasovanje

| Pogoj | Tehnika | Primer |
|---|---|---|
| Glas z vsemi tremi statusi se shrani in prikaže v rezultatih. | ekvivalenčni razred (veljaven) | TC-02-01 |
| Manjka ime (UI). | ekvivalenčni razred (manjkajoče polje) | TC-02-02 |
| Ponovni glas z istim imenom posodobi obstoječega. | prehod stanj (glas obstaja) | TC-02-03 |
| Termin druge ankete. | ekvivalenčni razred (tuj objekt) | TC-02-04 |
| Neveljaven status. | ekvivalenčni razred (vrednost izven domene) | TC-02-05 |
| Neobstoječ in napačno oblikovan žeton. | ekvivalenčni razred (neveljaven ključ) | TC-02-06 |

### 5.4 TS-03 Potrditev termina

| Pogoj | Tehnika | Primer |
|---|---|---|
| Organizator potrdi termin; stanje in pogled udeleženca se spremenita. | prehod *odprta → zaključena* | TC-03-01 |
| Potrditev brez izbire (UI). | ekvivalenčni razred (manjkajoče polje) | TC-03-02 |
| Ponovna potrditev. | prehod *zaključena → zaključena* (nedovoljen) | TC-03-03 |
| Glasovanje po potrditvi. | operacija v stanju *zaključena* (nedovoljena) | TC-03-04 |
| Termin druge ankete. | ekvivalenčni razred (tuj objekt) | TC-03-05 |
| Neobstoječ termin. | ekvivalenčni razred (neobstoječ ključ) | TC-03-06 |
| Žeton za udeležence na skrbniški poti. | ekvivalenčni razred (napačna vloga) | TC-03-07 |
| Prejem e-pošte z `.ics`. | – | ni izveden (4.3) |

---

## 6. Testni primeri

Prioriteta: **V** = visoka (glavni potek ali celovitost podatkov), **S** = srednja, **N** = nizka.

### TS-01 Ustvarjanje ankete

| ID | Naziv | Prior. | Zahteve | Predpogoj | Vhod | Pričakovani rezultat |
|---|---|---|---|---|---|---|
| TC-01-01 | Uspešno ustvarjanje ankete z dvema terminoma (UI) | V | FZ-01, FZ-04, FZ-05 | Aplikacija teče. | Naslov `TS01 Sestanek <oznaka>`, e-pošta `organizator@primer.si`, opis `Mesečni sestanek ekipe`, termina 10. ob 18:00 in 15. ob 09:30 (naslednji mesec). | HTTP 201. Prikazani povezavi `/admin/<uuid>?invite=<uuid>` in `/invite/<uuid>` z različnima žetonoma. V bazi 1 nezaključena anketa z 2 terminoma: 18:00–19:00 in 09:30–10:30. Poslana natanko 1 zahteva. |
| TC-01-02 | Zavrnitev ankete brez naslova (UI) | S | FZ-02 | Aplikacija teče. | Naslov prazen, e-pošta izpolnjena, izbran 1 termin. | Obvestilo »Prosimo, vnesite naslov dogodka.« (ali opozorilo brskalnika). Zahteva ni poslana. |
| TC-01-03 | Zavrnitev ankete brez izbranega termina (UI) | S | FZ-03 | Aplikacija teče. | Naslov in e-pošta izpolnjena, brez termina. | Obvestilo »Prosimo, izberite vsaj en termin na koledarju.« Zahteva ni poslana. |
| TC-01-04 | Robna vrednost: termin ob 23:30 (UI) | S | FZ-04 | Aplikacija teče. | Termin 20. ob 23:30. | Poslani in shranjeni `end_time` je za `start_time` (21. ob 00:30) ali pa strežnik zahtevo zavrne. |
| TC-01-05 | Strežniška validacija vhodov (API) | V | FZ-06 | Aplikacija teče. | `POST /api/polls` s/z: (a) praznim naslovom, (b) praznim seznamom terminov, (c) koncem pred začetkom, (d) brez `organizer_email`, (e) datumom `"jutri"`, (f) neveljavnim JSON. | Vsak odziv HTTP 400. Število anket v bazi se ne spremeni. |

### TS-02 Glasovanje

| ID | Naziv | Prior. | Zahteve | Predpogoj | Vhod | Pričakovani rezultat |
|---|---|---|---|---|---|---|
| TC-02-01 | Oddaja glasu »Da« in »Če bo potrebno« (UI) | V | FZ-07, FZ-08 | Anketa s 3 termini (10., 12., 17.) brez glasov. | Ime `Ana Novak`, e-pošta `ana@primer.si`; 10. = Da, 12. = Če bo potrebno, 17. = brez izbire. | HTTP 201, »Hvala, Ana Novak!«. Poslani statusi `yes`, `if_need_be`, `no`. GET vrne iste statuse in e-pošto. Skrbniški pogled kaže »Ustreza: Ana Novak« in »Če bo potrebno: Ana Novak«. |
| TC-02-02 | Zavrnitev glasu brez imena (UI) | S | FZ-07 | Anketa iz TC-02-01. | Ime prazno, 10. = Da. | Obvestilo »Vpišite ime.« ali opozorilo brskalnika. Zahteva ni poslana. |
| TC-02-03 | Sprememba glasu z istim imenom (API) | V | FZ-09 | Glas `Ana Novak` iz TC-02-01. | Ime `Ana Novak`, e-pošta `ana.nova@primer.si`, statusi `no`, `yes`, `yes`. | HTTP 201. V bazi še vedno 1 zapis za `Ana Novak`, z novimi statusi in novo e-pošto. |
| TC-02-04 | Termin druge ankete (API) | V | FZ-10 | Druga anketa s svojim terminom. | Ime `Vsiljivec`, `slot_id` termina druge ankete. | HTTP 400 »One or more time slots do not belong to this poll.« Glas ni shranjen. |
| TC-02-05 | Neveljaven status (API) | S | FZ-11, FZ-06 | Anketa iz TC-02-01. | Ime `Bojan`, status `maybe`. | HTTP 400. Glas ni shranjen. |
| TC-02-06 | Neobstoječ ali neveljaven žeton (API) | S | FZ-12 | – | (a) `POST /share/00000000-0000-4000-8000-000000000000/vote`, (b) `POST /share/ni-uuid/vote`, (c) `GET /share/ni-uuid`, (d) brskalnik `/invite/ni-uuid`. | (a) 404; (b), (c) 404 ali 400; (d) obvestilo, da dogodka ni mogoče najti. |

### TS-03 Potrditev termina

| ID | Naziv | Prior. | Zahteve | Predpogoj | Vhod | Pričakovani rezultat |
|---|---|---|---|---|---|---|
| TC-03-01 | Potrditev zmagovalnega termina (UI) | V | FZ-13, FZ-14, FZ-16 | Anketa s terminoma 5. in 6. ob 19:00, glasovi Ana (da/ne), Bor (da/če bo potrebno), Cvetka (ne/da). | V skrbniškem pogledu izberemo 5. in kliknemo »Potrdi izbran termin in obvesti vse«. | HTTP 200 `{"success":true}`. V bazi `is_finalized = t`, `final_slot_id` = termin 5. GET za udeležence vrne isto. Pogled udeleženca kaže potrjen termin in nima gumba »Potrdi udeležbo«. |
| TC-03-02 | Potrditev brez izbire (UI) | S | FZ-13 | Ista anketa, še odprta. | Klik na gumb za potrditev brez izbire termina. | »Prosimo, izberite končni termin za zaklep dogodka.« Zahteva ni poslana. |
| TC-03-03 | Ponovna potrditev (API) | V | FZ-15 | Anketa iz TC-03-01 (zaključena). | `final_slot_id` = termin 6. | HTTP 409. `final_slot_id` ostane termin 5. |
| TC-03-04 | Glasovanje po potrditvi (API) | V | FZ-16 | Anketa iz TC-03-01 (zaključena). | Ime `Zamudnik`, termin 6. = `yes`. | Zavrnjeno (409 ali 400). Število glasov ostane 3. |
| TC-03-05 | Termin druge ankete (API) | V | FZ-17 | Nova odprta anketa z enim terminom; obstaja anketa iz TS-02. | `final_slot_id` = termin ankete iz TS-02. | HTTP 400. Anketa ostane odprta (`is_finalized = f`, `final_slot_id` prazen). |
| TC-03-06 | Neobstoječ termin (API) | S | FZ-17 | Nova odprta anketa. | `final_slot_id = 00000000-0000-4000-8000-000000000000`. | HTTP 400 »Final slot not found«. Anketa ostane odprta. |
| TC-03-07 | Žeton za udeležence na skrbniški poti (API) | V | FZ-18 | Nova odprta anketa. | `POST /admin/<share_token>/finalize`, `GET /admin/<share_token>`. | Oba HTTP 404. Anketa ostane odprta. |

---

## 7. Testni postopki

Splošna pravila za vse postopke:

- **Začetek:** aplikacija teče (4.2), `GET /` vrne 200.
- **Preverjanje baze:** `psql $TEST_DATABASE_URL` z navedeno poizvedbo.
- **Spremljanje zahtev:** v brskalniku beležimo vse zahteve `POST /api/...` (v ročni izvedbi: zavihek *Network* v razvijalskih orodjih).
- **Konec:** zapremo zavihek. Podatkov ne brišemo; vsak primer uporablja svoje ankete.

### TP-01 Ustvarjanje ankete

**TP-01-01** (za TC-01-01)

| # | Korak | Pričakovano |
|---|---|---|
| 1 | Odpri `http://localhost:8080/`, klikni »Ustvari dogodek«. | Obrazec »Ustvari nov dogodek«. |
| 2 | Vpiši naslov, e-pošto in opis iz TC-01-01. | – |
| 3 | V koledarju klikni »→« (naslednji mesec), klikni 10., v polje ure vpiši 18:00, klikni »Potrdi«. | Dan 10 je označen, pod njim 18:00. |
| 4 | Klikni 15., vpiši 09:30, klikni »Potrdi«. | Dan 15 je označen. |
| 5 | Klikni »Ustvari in deli«. | `POST /api/polls` → 201. Prikazano »Dogodek je ustvarjen«. |
| 6 | Preberi obe povezavi. | Oblika `/admin/<uuid>?invite=<uuid>` in `/invite/<uuid>`, žetona različna. |
| 7 | `SELECT p.title, p.is_finalized, t.start_time, t.end_time FROM polls p JOIN time_slots t ON t.poll_id = p.id WHERE p.share_token = '<share>'` | 2 vrstici, `f`, 18:00–19:00 in 09:30–10:30. |

**TP-01-02** (za TC-01-02): korak 1 kot zgoraj, izpolni samo e-pošto, izberi 10., klikni »Ustvari in deli«. Pričakovano: obvestilo, nobene zahteve `POST`.

**TP-01-03** (za TC-01-03): korak 1, izpolni naslov in e-pošto, ne izberi termina, klikni »Ustvari in deli«. Pričakovano: obvestilo, nobene zahteve `POST`.

**TP-01-04** (za TC-01-04)

| # | Korak | Pričakovano |
|---|---|---|
| 1 | Odpri obrazec, izpolni naslov `TS01 pozni termin <oznaka>` in e-pošto. | – |
| 2 | Izberi 20. naslednjega meseca, uro 23:30, »Potrdi«. | – |
| 3 | Klikni »Ustvari in deli«, v *Network* poglej telo zahteve. | `end_time` > `start_time` (21. ob 00:30). |
| 4 | `SELECT start_time, end_time, end_time > start_time FROM time_slots ...` | `t` (ali pa ni zapisa, če je strežnik zavrnil). |

**TP-01-05** (za TC-01-05)

| # | Korak | Pričakovano |
|---|---|---|
| 1 | `SELECT count(*) FROM polls` → zapiši N. | – |
| 2 | Za vsak vhod (a)–(e) pošlji `curl -s -w '%{http_code}' -H 'Content-Type: application/json' -d '<telo>' http://localhost:8080/api/polls`. | 400 |
| 3 | `curl ... -d '{ to ni json' ...` | 400 |
| 4 | `SELECT count(*) FROM polls` | N |

### TP-02 Glasovanje

**Priprava** (za vse TC-02): `POST /api/polls` z naslovom `TS02 Izlet <oznaka>` in termini 10. ob 10:00, 12. ob 14:00, 17. ob 09:00 naslednjega meseca. Zapiši `share_token`, `admin_token` in ID-je terminov (`GET /api/polls/share/<share>`).

**TP-02-01** (za TC-02-01)

| # | Korak | Pričakovano |
|---|---|---|
| 1 | Odpri `/invite/<share>`. | Obrazec z naslovom ankete. |
| 2 | Vpiši ime `Ana Novak` in e-pošto `ana@primer.si`. | – |
| 3 | Klikni »→«, enkrat klikni 10., dvakrat klikni 12. | 10 zelen (Da), 12 rumen (Če bo potrebno), 17 rdeč (Ne). |
| 4 | Klikni »Potrdi udeležbo«. | `POST .../vote` → 201, »Hvala, Ana Novak!«. Telo vsebuje 3 glasove `yes`, `if_need_be`, `no`. |
| 5 | `GET /api/polls/share/<share>` | Ana: statusi kot zgoraj, e-pošta `ana@primer.si`. |
| 6 | Odpri `/admin/<admin>?invite=<share>`. | »Ustreza: Ana Novak«, »Če bo potrebno: Ana Novak«. |

**TP-02-02** (za TC-02-02): odpri `/invite/<share>`, ime pusti prazno, izberi 10., klikni »Potrdi udeležbo«. Pričakovano: opozorilo, nobene zahteve `POST`.

**TP-02-03** (za TC-02-03): `POST .../vote` z imenom `Ana Novak`, e-pošto `ana.nova@primer.si` in statusi `no/yes/yes` → 201. Nato `SELECT count(*) FROM votes v JOIN polls p ON p.id = v.poll_id WHERE p.share_token = '<share>' AND participant_name = 'Ana Novak'` → 1. `GET` share → novi statusi in e-pošta.

**TP-02-04** (za TC-02-04): ustvari drugo anketo, vzemi ID njenega termina, pošlji `POST /share/<share>/vote` z imenom `Vsiljivec` in tem ID-jem → 400. `SELECT count(*) FROM votes WHERE participant_name = 'Vsiljivec'` → 0.

**TP-02-05** (za TC-02-05): `POST .../vote` z imenom `Bojan` in statusom `maybe` → 400. `SELECT count(*) FROM votes WHERE participant_name = 'Bojan'` → 0.

**TP-02-06** (za TC-02-06): pošlji zahteve (a)–(c) s `curl` in odpri (d) v brskalniku. Pričakovano kot v TC-02-06.

### TP-03 Potrditev termina

**Priprava** (za TC-03-01 do TC-03-04): `POST /api/polls` z naslovom `TS03 Zabava <oznaka>` in terminoma 5. in 6. ob 19:00. Prek API oddaj glasove: Ana (`ana@primer.si`; da/ne), Bor (brez e-pošte; da/če bo potrebno), Cvetka (`cvetka@primer.si`; ne/da).

**TP-03-02** (za TC-03-02, izvede se **pred** TP-03-01): odpri `/admin/<admin>?invite=<share>`, brez izbire klikni »Potrdi izbran termin in obvesti vse«. Pričakovano: obvestilo, nobene zahteve `POST`.

**TP-03-01** (za TC-03-01)

| # | Korak | Pričakovano |
|---|---|---|
| 1 | Odpri `/admin/<admin>?invite=<share>`. | Rezultati: 5. »Ustreza: Ana, Bor«; 6. »Ustreza: Cvetka«, »Če bo potrebno: Bor«. |
| 2 | Klikni kartico 5. decembra. | Kartica je označena. |
| 3 | Klikni »Potrdi izbran termin in obvesti vse«. | `POST .../finalize` → 200 `{"success":true}`; pogled »Glasovanje zaključeno« s terminom 5. ob 19:00–20:00. |
| 4 | `SELECT is_finalized, final_slot_id FROM polls WHERE admin_token = '<admin>'` | `t`, ID termina 5. |
| 5 | `GET /api/polls/share/<share>` | `is_finalized: true`, `final_slot_id` = termin 5. |
| 6 | Odpri `/invite/<share>`. | »Termin potrjen«, prikazan termin 5., ni gumba »Potrdi udeležbo«. |

**TP-03-03** (za TC-03-03): `POST /admin/<admin>/finalize` s terminom 6. → 409. `final_slot_id` ostane termin 5.

**TP-03-04** (za TC-03-04): preštej glasove ankete (3), pošlji `POST /share/<share>/vote` z imenom `Zamudnik` → pričakovano 409 ali 400. Število glasov ostane 3.

**TP-03-05** (za TC-03-05): ustvari novo anketo `TS03 Tuj termin <oznaka>` z enim terminom. Pošlji `POST /admin/<admin>/finalize` z `final_slot_id` termina ankete iz TS-02 → pričakovano 400. Preveri `is_finalized`, `final_slot_id` → `f`, prazno. Odpri `/invite/<share>` in shrani posnetek.

**TP-03-06** (za TC-03-06): ustvari novo anketo, pošlji `finalize` z ničelnim UUID → pričakovano 400. Anketa ostane odprta.

**TP-03-07** (za TC-03-07): ustvari novo anketo, pošlji `POST /admin/<share_token>/finalize` in `GET /admin/<share_token>` → oba 404. Anketa ostane odprta.
