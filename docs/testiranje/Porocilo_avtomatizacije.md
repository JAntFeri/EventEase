# EventEase – poročilo avtomatizacije funkcionalnih testov

| | |
|---|---|
| **Dokument** | Izbira orodja, vključitev v cevovod, dnevnik izvedbe in preverjanje zaznave napak |
| **Predloga** | prirejena po ISO/IEC/IEEE 29119-3:2021 (Test Execution Log, Test Completion Report) |
| **Testirani sistem** | EventEase, veja `jureQA`, commit `c4690e2` (izhodišče) |
| **Testni primeri** | [Specifikacija_testov.md](Specifikacija_testov.md), poglavje 6 (TC-01-01 – TC-03-07) |
| **Prejšnje poročilo** | [Porocilo_testiranja.md](Porocilo_testiranja.md) (ročno vodena izvedba, incidenti INC-01 – INC-06) |
| **Izvajalec** | Jure Antolič |
| **Datum** | 10. 11. 2026 |
| **Dokazi** | [dokazi/avtomatizacija/](dokazi/avtomatizacija/) |

---

## 1. Povzetek

Vseh **18 testnih primerov** iz specifikacije smo avtomatizirali z orodjem **Playwright Test** (`tests/e2e/`) in jih vključili v cevovod GitHub Actions. Nabor se izvede v približno 15 sekundah, brez grafičnega vmesnika, ob vsakem pushu na `main`, `master` in `jureQA` ter ročno.

| | Lokalno | CI |
|---|---|---|
| Izhodišče (`c4690e2`) | 18 / 18 po pričakovanju: 11 uspešnih, 7 pričakovano neuspešnih (znane napake) | ✅ [zagon 42908628075](https://github.com/JAntFeri/EventEase/actions/runs/42908628075) |
| Namerni napaki (`c2ab642`) | **2 nepričakovano neuspešna** (TC-01-02, TC-03-07), izhodna koda 1 | ❌ [zagon 42910750227](https://github.com/JAntFeri/EventEase/actions/runs/42910750227) |
| Po razveljavitvi | 18 / 18 po pričakovanju | ✅ ZAGON_3 |

Rezultati avtomatizirane izvedbe se ujemajo z ročno vodeno izvedbo iz prejšnje naloge: isti primeri uspejo in isti padejo iz istih razlogov. Obe namerno vneseni napaki sta bili zaznani, lokalno in v cevovodu.

---

## 2. Izbira orodja

### 2.1 Zahteve

Testni primeri so sistemski testi po metodi črne škatle, ki v enem primeru pogosto preverijo tri sloje:

1. **uporabniški vmesnik** (React SPA): klik v koledarju, obvestilo, ali je bila zahteva sploh poslana,
2. **HTTP API** (Zig, `/api/polls/...`): odzivne kode in telesa, tudi namerno neveljavne zahteve,
3. **stanje v bazi** (PostgreSQL): npr. `is_finalized`, število zapisov v `votes`.

Orodje mora zato krmiliti brskalnik in hkrati pošiljati poljubne HTTP zahteve ter poizvedbe v bazo. Teči mora brez grafičnega vmesnika na strežniku CI in vrniti rezultat v obliki, ki jo cevovod razume (izhodna koda, strojno berljivo poročilo).

### 2.2 Primerjava

| Orodje | UI | API in baza | Brez GUI v CI | Rezultati | Ocena |
|---|---|---|---|---|---|
| **Playwright Test** | ✅ Chromium, Firefox, WebKit | ✅ test je navaden Node.js: `fetch`, `psql` | ✅ privzeto brez glave, `playwright install --with-deps` | izhodna koda, JUnit XML, JSON, HTML s posnetki in sledjo | **izbrano** |
| Cypress | ✅ | ⚠️ API prek `cy.request`, baza samo prek `cy.task` v ločenem procesu | ✅ (Electron) | izhodna koda, JUnit prek vtičnika | težje za primere, ki mešajo UI, API in bazo |
| Selenium WebDriver | ✅ | ⚠️ odvisno od jezika | ✅, a potrebuje ujemajoč gonilnik brskalnika | brez lastnega izvajalnika, potreben še Mocha/JUnit | več sestavljanja za enak rezultat |
| `node --test` / `zig build test` | ❌ | ✅ | ✅ | TAP / izhodna koda | že v uporabi za teste enot, brskalnika ne krmilita |

### 2.3 Utemeljitev

- **Pokrije vse tri sloje v istem testu.** Brskalnik prek `page`, API prek vgrajenega `fetch`, baza prek `psql`. TC-01-01 na primer klikne v vmesniku, prestreže zahtevo in nato preveri vrstice v bazi.
- **Nadaljuje prejšnjo nalogo.** Ročno vodeni izvajalnik `tests/functional/funkcionalni-testi.mjs` je že uporabljal knjižnico Playwright 1.61.1. Lokatorji in postopki so ostali enaki, zamenjali smo samo lastno ogrodje (`tc()`, `check()`, `rezultati.json`) s standardnim izvajalnikom.
- **Pričakovane napake.** `test.fail()` omogoča, da znane, še neodpravljene napake (INC-01 – INC-06) cevovoda ne ustavijo, nova napaka pa ga (poglavje 5.3).
- **Poročila za CI.** JUnit XML, JSON in HTML poročilo so vgrajeni, ob neuspehu se samodejno shranita posnetek zaslona in sled (trace).
- JavaScript je že jezik frontenda, zato v projekt ne vnašamo novega jezika.

---

## 3. Vključitev v cevovod

### 3.1 Kaj potrebuje okolje cevovoda

| Potreba | Kako je zagotovljena v GitHub Actions |
|---|---|
| Zagnana aplikacija | Posel `docker-smoke` že zgradi sliko in zažene `docker compose up -d` (nginx + Zig + Postgres, `DISABLE_EMAILS=true`). Playwright teče za smoke testom. |
| Testna baza | Postgres iz `compose.yaml`, izpostavljen na `localhost:5432`. Ob vsakem zagonu je prazna, ker se posel konča z `docker compose down -v`. |
| Node.js | `actions/setup-node@v4` (Node 24), predpomnilnik npm iz `tests/e2e/package-lock.json`. |
| Brskalnik in sistemske knjižnice | `npx playwright install --with-deps chromium`. Grafični strežnik (X/xvfb) ni potreben, Chromium teče brez glave. |
| `psql` | Že nameščen na slikah `ubuntu-latest`. |

### 3.2 Potek

```
frontend (lint, testi enot, build) ─┐
                                     ├─► docker-smoke: compose build → compose up → smoke test
backend (zig build, zig build test) ─┘        → npm ci + playwright install → playwright test
                                               → povzetek v $GITHUB_STEP_SUMMARY
                                               → artefakt »playwright-porocilo«
                                               → compose down -v
```

Sprememba [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

- sprožilci: dodana veja `jureQA` in `workflow_dispatch` (ročni zagon),
- koraki »Namesti Playwright«, »Funkcionalni testi (Playwright)«, »Povzetek funkcionalnih testov« in »Naloži poročilo Playwright«.

### 3.3 Oblika rezultatov

| Izhod | Uporaba |
|---|---|
| Izhodna koda `npx playwright test` | 0, če so vsi primeri izšli po pričakovanju. Sicer 1 in korak ter posel padeta. |
| Izpis `list` | dnevnik v izpisu koraka (✓ / ✘ za vsak primer, napake s pričakovano in dejansko vrednostjo) |
| `test-results/junit.xml` | standardni format za orodja CI |
| `test-results/rezultati.json` | iz njega korak »Povzetek« sestavi tabelo primerov na strani zagona |
| `playwright-report/` | HTML poročilo s koraki `test.step`, posnetki zaslona (priponke `TC-*`), ob neuspehu sled |

---

## 4. Namestitev in lokalni zagon

```bash
cd tests/e2e
npm ci                                 # @playwright/test 1.61.1 (natančna različica)
npx playwright install chromium        # v CI: --with-deps

# aplikacija mora teči (Specifikacija, poglavje 4.2)
sudo docker compose -p eventease-qa -f compose.yaml -f tests/functional/compose.qa.yaml up -d --build

BASE_URL=http://localhost:8080 \
TEST_DATABASE_URL=postgresql://admin:admin@127.0.0.1:5433/eventeasedb \
npx playwright test                    # privzete vrednosti so prav te
npx playwright show-report playwright-report
```

Struktura:

| Datoteka | Vsebina |
|---|---|
| [`playwright.config.js`](../../tests/e2e/playwright.config.js) | Chromium 1280 × 1000, brez glave, 1 delavec, poročila `list`, `junit`, `json`, `html`, posnetek in sled ob neuspehu |
| [`helpers.js`](../../tests/e2e/helpers.js) | `sql()`, `api()`, `createPollApi()`, `voteApi()`, `pickDay()`, `trackPosts()`, `evidence()`, `knownBug()` |
| [`specs/ts01-ustvarjanje.spec.js`](../../tests/e2e/specs/ts01-ustvarjanje.spec.js) | TC-01-01 – TC-01-05 |
| [`specs/ts02-glasovanje.spec.js`](../../tests/e2e/specs/ts02-glasovanje.spec.js) | TC-02-01 – TC-02-06 |
| [`specs/ts03-potrditev.spec.js`](../../tests/e2e/specs/ts03-potrditev.spec.js) | TC-03-01 – TC-03-07 |

Stari izvajalnik `tests/functional/funkcionalni-testi.mjs` je ostal nespremenjen kot dokaz prejšnje naloge.

---

## 5. Avtomatizirani testni primeri

### 5.1 Preslikava iz specifikacije

Vsak pričakovani rezultat iz specifikacije je en `test.step` z eno ali več trditvami `expect.soft`. Mehke trditve primer ob prvi neujemajoči vrednosti ne prekinejo, zato poročilo pokaže vse korake, tako kot ročno vodena izvedba. Posnetki zaslona iz prejšnje naloge so priponke v HTML poročilu.

| Primer | Sloj | Pričakovanje v naboru | Izid (izhodišče) |
|---|---|---|---|
| TC-01-01 Uspešno ustvarjanje ankete | UI + baza | mora uspeti | ✅ |
| TC-01-02 Brez naslova | UI | mora uspeti | ✅ |
| TC-01-03 Brez termina | UI | mora uspeti | ✅ |
| TC-01-04 Termin ob 23:30 | UI + baza | `test.fail` – INC-01 | ✘ po pričakovanju |
| TC-01-05 Strežniška validacija | API + baza | `test.fail` – INC-02, INC-03, INC-04 | ✘ po pričakovanju |
| TC-02-01 Glas »Da« in »Če bo potrebno« | UI + API | mora uspeti | ✅ |
| TC-02-02 Glas brez imena | UI | mora uspeti | ✅ |
| TC-02-03 Sprememba glasu | API + baza | mora uspeti | ✅ |
| TC-02-04 Termin druge ankete | API + baza | mora uspeti | ✅ |
| TC-02-05 Neveljaven status | API + baza | `test.fail` – INC-03 | ✘ po pričakovanju |
| TC-02-06 Neveljaven žeton | API + UI | `test.fail` – INC-03 | ✘ po pričakovanju |
| TC-03-01 Potrditev termina | UI + API + baza | mora uspeti | ✅ |
| TC-03-02 Potrditev brez izbire | UI | mora uspeti | ✅ |
| TC-03-03 Ponovna potrditev | API + baza | mora uspeti | ✅ |
| TC-03-04 Glas po potrditvi | API + baza | `test.fail` – INC-05 | ✘ po pričakovanju |
| TC-03-05 Termin druge ankete | API + baza | `test.fail` – INC-06 | ✘ po pričakovanju |
| TC-03-06 Neobstoječ termin | API + baza | `test.fail` – INC-03 | ✘ po pričakovanju |
| TC-03-07 Žeton za udeležence na skrbniški poti | API + baza | mora uspeti | ✅ |

Pri vseh sedmih pričakovano neuspešnih primerih smo preverili, da padejo na koraku, ki ustreza incidentu (npr. TC-01-04: `end 2026-12-20T00:30:00`, TC-03-05: `{"success":true}` namesto 400), in ne zaradi lokatorja ali časovne omejitve. Glej [`1_izhodisce.txt`](dokazi/avtomatizacija/1_izhodisce.txt).

### 5.2 Odstopanje od specifikacije: neodvisni predpogoji

V specifikaciji nekateri primeri gradijo na prejšnjih (TC-02-02 in TC-02-03 na anketi in glasu iz TC-02-01, TC-03-03 in TC-03-04 na anketi, potrjeni v TC-03-01, TC-03-05 na anketi iz TS-02). V avtomatiziranem naboru si **vsak primer predpogoj pripravi sam prek API** (`createPollApi`, `voteApi`, finalizacija prek API) z enakimi podatki, kot jih določa specifikacija.

Razlog: Playwright po neuspelem testu zamenja delavca. Pri verigi odvisnih testov bi neuspeh enega povzročil, da bi naslednji preskočili ali tekli nad napačnim stanjem. TC-02-03 bi na primer brez glasu iz TC-02-01 glas ustvaril namesto spremenil in lažno uspel. Pogoj, ki ga primer preverja, ostane enak, primeri pa so med seboj neodvisni in jih je mogoče poganjati posamično (`npx playwright test -g TC-02-03`).

Imena glasovalcev, ki jih primer preverja po vsej bazi (`Vsiljivec`, `Bojan`), vsebujejo oznako zagona, da ostanki prejšnjih zagonov ne vplivajo na rezultat.

### 5.3 Znane napake: `test.fail()`

Sedem primerov pade zaradi napak INC-01 – INC-06, ki so prijavljene, a še niso odpravljene. Če bi jih pustili neuspešne, bi bil cevovod stalno rdeč in nova napaka ne bi izstopala. Primeri zato kličejo `knownBug("INC-xx")`, ki doda opombo in `test.fail()`:

- dokler napaka obstaja, primer šteje kot »po pričakovanju« in cevovod je zelen,
- ko bo napaka odpravljena, bo primer **nepričakovano uspel** in cevovod bo padel. To je opomnik, da je treba oznako odstraniti, primer pa od takrat naprej varuje popravek.

Primerov samih nismo spreminjali: pričakovani rezultati so iz specifikacije, ne iz trenutnega obnašanja aplikacije.

---

## 6. Preverjanje zaznave napak

### 6.1 Postopek

1. Izhodiščni zagon (`c4690e2`), lokalno in v CI: vse po pričakovanju.
2. V kodo namerno vnesemo dve napaki in ju objavimo kot ločen commit `c2ab642` (»NAMERNA NAPAKA«).
3. Ponovni zagon, lokalno (po ponovni gradnji slike) in v CI.
4. Razveljavitev: obe datoteki vrnemo na stanje iz `c4690e2` in ponovno poženemo nabor.

### 6.2 Vnesene napake

| # | Datoteka | Sprememba | Simulira | Pričakovan neuspeh |
|---|---|---|---|---|
| N-1 | `frontend/EventEase/src/pages/CreateEventPage.jsx` | preverjanje `if (!formData.title)` v `handleSubmit` zakomentirano | regresija validacije v vmesniku | TC-01-02 |
| N-2 | `backend/logic/src/routes.zig` (`getAdminPoll`, `finalizePoll`) | `WHERE admin_token = $1` → `WHERE admin_token = $1 OR share_token = $1` | varnostna napaka: udeleženec dobi pravice organizatorja | TC-03-07 |

Napako N-1 smo izbrali, ker polje za naslov nima atributa `required`, zato zahteve ne ustavi niti brskalnik. N-2 je napaka, ki bi jo bilo s pregledom vmesnika težko opaziti, saj se vmesnik ne spremeni.

### 6.3 Rezultat

Lokalno ([`2_namerna_napaka.txt`](dokazi/avtomatizacija/2_namerna_napaka.txt)): **16 po pričakovanju, 2 nepričakovano neuspešna, izhodna koda 1.**

| Primer | Korak | Pričakovano | Dejansko |
|---|---|---|---|
| TC-01-02 | Obvestilo ali opozorilo brskalnika | `true` | `false` |
| TC-01-02 | Zahteva ni poslana | 0 POST | 1 POST, telo `{"title":"", ...}` |
| TC-03-07 | POST `/admin/<share_token>/finalize` | 404 | 200 `{"success":true}` |
| TC-03-07 | GET `/admin/<share_token>` | 404 | 200 |
| TC-03-07 | Anketa ostane odprta | `f\|-` | `t\|2b6142ca-…` (anketa zaključena) |

Ostalih 16 primerov se ni spremenilo, tudi sedem pričakovano neuspešnih ne. Napaki sta bili torej zaznani natančno v primerih, ki pokrivajo spremenjeno obnašanje.

V CI ([zagon 42910750227](https://github.com/JAntFeri/EventEase/actions/runs/42910750227)): posla »Frontend« in »Backend (Zig)« sta uspela, ker napaki ne pokvarita gradnje, linta ali testov enot. Posel »Docker + API smoke« je **padel na koraku »Funkcionalni testi (Playwright)« z izhodno kodo 1**. Tudi smoke test (`scripts/ci-smoke-test.sh`) je uspel, ker preverja samo srečno pot. Napaki je torej zaznal samo novi nabor. Koraka »Povzetek« in »Naloži poročilo Playwright« sta se izvedla tudi po neuspehu (`if: always()`), zato sta na strani zagona tabela primerov in artefakt `playwright-porocilo` s posnetkom zaslona in sledjo neuspelih primerov.

Po razveljavitvi: RAZVELJAVITEV_REZULTAT

---

## 7. Omejitve

- **`test.fail()` ne loči vzroka neuspeha.** Pričakovano neuspešen primer bi »uspel« tudi, če bi padel zaradi pokvarjenega lokatorja. Vzroke smo ob uvedbi preverili ročno (5.1), ob vsaki spremembi primerov jih je treba znova.
- **E-pošta in `.ics` (FZ-19)** tudi v CI nista preverjena, ker compose nastavi `DISABLE_EMAILS=true`.
- Samo Chromium, en zaslon (1280 × 1000). Firefox in WebKit sta v Playwrightu na voljo z dodatnim projektom v konfiguraciji, a ju nismo vključili.
- Testi tečejo zaporedno (1 delavec), ker preverjajo število zapisov v skupni bazi (npr. TC-01-05). Pri 15 sekundah to ni ovira.
- V CI so testi le za vejami `main`, `master` in `jureQA`, ne za zahtevki za združitev na drugih vejah.

---

## 8. Uporaba orodja Claude Code

Pri tej nalogi smo uporabili agenta **Claude Code** (Anthropic, model Claude Opus 5.5).

**Odločitve izvajalca** (agent je pred začetkom pripravil načrt in postavil vprašanja):
- znane napake označiti s `test.fail()` in oznako incidenta (ne pustiti rdečih in ne popravljati),
- vnesti dve namerni napaki, eno v frontend in eno v backend,
- stari izvajalnik ohraniti nespremenjen,
- CI sprožiti tudi na veji `jureQA` in ročno; namerno napako objaviti kot ločen commit, da nastane pravi neuspešen zagon.

**Kaj je naredil Claude Code:** predlagal in utemeljil orodje, prenesel 18 primerov v Playwright Test, dopolnil `ci.yml`, izvedel lokalne zagone, vnesel in razveljavil napaki ter pripravil osnutek tega poročila.

**Kaj je naredil izvajalec:** ker uporabnik ni v skupini `docker` in agent nima poverilnic za GitHub, je izvajalec sam zagnal in ponovno gradil aplikacijo (`sudo docker compose ... up -d --build`) in objavil commite (`git push`).

**Kako smo preverili delo agenta:** primerjali smo izid vsakega primera z ročno vodeno izvedbo iz prejšnje naloge, za pričakovano neuspešne primere preverili, na katerem koraku padejo (5.1), in preverili, da po namerni napaki padeta natanko pričakovana primera in nobeden drug.
