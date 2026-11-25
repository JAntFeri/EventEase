# EventEase – upravljanje funkcionalnih napak

| | |
|---|---|
| **Dokument** | Poročilo o upravljanju napak (naloga 6) |
| **Testirani sistem** | EventEase, različica `fee8af9` (veja `jureQA`) |
| **Orodje** | MantisBT 2.29.0 (Docker, lokalno na `http://localhost:8989`) |
| **Avtor** | Jure Antolič |
| **Datum** | 24.–25. 11. 2026 |
| **Povezani dokumenti** | [Specifikacija testov](Specifikacija_testov.md), [Poročilo testiranja](Porocilo_testiranja.md) (incidenti INC-01–INC-06), [Poročilo avtomatizacije](Porocilo_avtomatizacije.md) |
| **Dokazi** | [dokazi/napake/](dokazi/napake/) |

---

## 1. Povzetek

Za upravljanje napak smo izbrali in namestili **MantisBT**. Projekt EventEase smo v njem nastavili z lastno klasifikacijo napak (*Napaka, Pomanjkljivost, Nedoslednost, Varnostna ranljivost, Napaka v testu*), **štirimi nivoji kritičnosti** (*nizek, srednji, visok, kritičen*) in razširjenim naborom podatkov o napaki (stanje, različica, brskalnik, komponenta, okolje, testni primer, zahteva, vzrok v kodi, rok, dodeljeni razvijalec, ponovljivost, prioriteta, priloge).

Funkcionalne teste iz [Specifikacije](Specifikacija_testov.md) (scenariji TS-01 ustvarjanje ankete, TS-02 glasovanje, TS-03 potrditev termina) smo ponovno izvedli v **Chromium 149 in Firefox 151** in jih razširili z raziskovalnimi testi: preverjanjem e-pošte in `.ics`, sočasnimi zahtevami in robnimi primeri v vmesniku. V orodje smo vpisali **22 napak**:

| Kritičnost | Število | | Vrsta | Število |
|---|---|---|---|---|
| kritičen | 2 | | Napaka | 12 |
| visok | 5 | | Pomanjkljivost | 4 |
| srednji | 5 | | Nedoslednost | 4 |
| nizek | 10 | | Varnostna ranljivost | 1 |
| | | | Napaka v testu | 1 |

6 napak je iz naloge 3 (INC-01–INC-06), vse so ponovno potrjene. **16 napak je novih** (EE-N01–EE-N16). Najresnejši novi napaki sta:

- **EE-N01:** strežnik se sesuje, ko približno 10 udeležencev hkrati glasuje in je e-pošta vklopljena. V produkcijski gradnji se je to zgodilo v 7 od 8 ponovitev. Ker Dockerfile procesa ne zažene znova, je API nato nedosegljiv.
- **EE-N02:** končna točka `/api/polls/share-email` je odprt posrednik e-pošte. Kdorkoli lahko brez žetona pošlje poljubno sporočilo s poljubno povezavo na poljubno število naslovov v imenu EventEase.

---

## 2. Izbira orodja

| Orodje | Prednosti | Slabosti za naš primer |
|---|---|---|
| **MantisBT** ✅ | odprtokoden, lahek (PHP + MariaDB), en vsebnik Docker; polja po meri (seznam, večizbirni seznam, besedilo), nastavljive naštevne vrednosti (kritičnost), rok (*due date*), različice, povezave med napakami, REST API, slovenski prevod vmesnika | starejši videz; nekatere nastavitve samo v `config_inc.php` |
| Bugzilla | zrel, natančen potek stanj | zahtevnejša namestitev (Perl), polja po meri bolj okorna |
| Jira | zmogljiv, razširjen v industriji | oblačna storitev (nič se ne namesti), zahteva račun; besedila samo prek konfiguracije sheme |
| GitHub Issues | brez namestitve, ob kodi | ni prave namestitve orodja; kritičnost in stanja samo kot oznake, brez polj za rok in različico |

MantisBT je ogrodju projekta nevtralen (EventEase je React + Zig, zato orodje, vezano na en jezik, ne pride v poštev) in izpolni vse zahteve naloge brez dodatnih vtičnikov.

---

## 3. Namestitev

MantisBT teče v Dockerju poleg aplikacije, v mapi `~/mantisbt` (zunaj repozitorija, da podatki o napakah ne pridejo v git):

```yaml
# ~/mantisbt/compose.yaml
services:
  mantisbt:
    image: xlrl/mantisbt:latest          # MantisBT 2.29.0
    environment:
      MANTIS_TIMEZONE: Europe/Ljubljana
      MANTIS_ENABLE_ADMIN: "1"           # potrebno za admin/install.php; po namestitvi "0"
    ports: ["127.0.0.1:8989:80"]
    volumes: ["./config:/var/www/html/config"]
    depends_on: [mysql]
    restart: unless-stopped
  mysql:
    image: mariadb:11.4
    environment: { MYSQL_ROOT_PASSWORD: root, MYSQL_DATABASE: bugtracker, MYSQL_USER: mantisbt, MYSQL_PASSWORD: mantisbt }
    ports: ["127.0.0.1:3307:3306"]
    volumes: ["./mysql:/var/lib/mysql"]
    restart: unless-stopped
```

Postopek:

1. `sudo docker compose up -d` v `~/mantisbt`.
2. Namestitev sheme baze: `http://localhost:8989/admin/install.php` (tip `mysqli`, gostitelj `mysql`) → 31 tabel, različica sheme 215.
3. Prijava kot `administrator`, ustvarjanje žetona API (*Moj račun → API žetoni*). Projekt, uporabnik, različice, napake in povezave so nato ustvarjeni prek REST API (`/api/rest`), kategorije in polja po meri pa prek skrbniškega vmesnika (avtomatizirano s Playwright).

Nastavitve v `config/config_inc.php`, ki se razlikujejo od privzetih:

```php
$g_default_language = 'slovene';
$g_default_timezone = 'Europe/Ljubljana';
$g_enable_email_notification = OFF;          // lokalno brez SMTP
$g_allow_signup = OFF;
$g_severity_enum_string = '10:nizek,30:srednji,50:visok,70:kriticen';   // 4 nivoji kritičnosti
$g_default_bug_severity = 30;
$g_severity_significant_threshold = 50;
$g_due_date_update_threshold = DEVELOPER;     // rok lahko nastavi razvijalec
$g_due_date_view_threshold   = REPORTER;
$g_bug_report_page_fields = [... 'platform', 'os', 'os_version', 'product_version', 'target_version', 'steps_to_reproduce', 'additional_info', 'due_date' ...];
```

V `config/custom_strings_inc.php` so slovenska imena naštevnih vrednosti (kritičnost, prioriteta, ponovljivost, stanja, razrešitve).

**Varnost namestitve.** Namestitev je samo lokalna (vrata vezana na `127.0.0.1`). MantisBT opozarja, da je mapa `admin` dostopna in da ima `administrator` privzeto geslo. Pred kakršno koli javno uporabo je treba nastaviti `MANTIS_ENABLE_ADMIN: "0"` in zamenjati geslo.

---

## 4. Model napake

### 4.1 Klasifikacija (polje po meri *Vrsta napake*, obvezno)

| Vrsta | Pomen | Primer |
|---|---|---|
| **Napaka** | sistem se obnaša drugače, kot določa zahteva | INC-06 potrditev s tujim terminom |
| **Pomanjkljivost** | manjka preverjanje ali funkcionalnost, ki jo zahteva implicitno predvideva | EE-N10 naslov iz presledkov |
| **Nedoslednost** | sistem deluje, a neenotno (jezik, oblika, odzivne kode, standardi) | EE-N08 angleške zadeve e-pošte |
| **Varnostna ranljivost** | napako je mogoče zlorabiti | EE-N02 odprt posrednik e-pošte |
| **Napaka v testu** | napaka je v testni zbirki, ne v aplikaciji | EE-N14 TC-01-01 odvisen od časovnega pasu baze |

### 4.2 Kritičnost (polje *Resnost*, 4 nivoji)

| Nivo | Merilo | Rok za odpravo | Prioriteta |
|---|---|---|---|
| **kritičen** | izpad celotne storitve ali varnostna zloraba brez pogojev | 1. 12. 2026 | takojšnja |
| **visok** | izguba ali okvara podatkov, napačen termin pri udeležencih, sesutje v podprtem načinu | 8. 12. 2026 | nujna |
| **srednji** | napačno obnašanje, ki ga uporabnik lahko sproži, a obstaja obvoz | 22. 12. 2026 | visoka |
| **nizek** | kozmetične napake, napačne kode, redki robni primeri brez vpliva na podatke | 15. 1. 2027 | normalna |

Kritičnost opisuje **posledico**, prioriteta pa **vrstni red odprave**. Prioriteto smo izpeljali iz kritičnosti, razvijalec pa jo lahko spremeni.

### 4.3 Podatki o napaki

| Polje | Vir | Vrednosti / pomen |
|---|---|---|
| ID, Povzetek, Opis | standardno | povzetek ima predpono z oznako (`[EE-N01]`, `[INC-06]`) za sledljivost do poročil |
| Koraki za ponovitev, Dodatne informacije | standardno | koraki; *pričakovano / dejansko / predlog popravka* |
| **Stanje** | standardno | nova → povratna informacija → prevzeta → potrjena → dodeljena → odpravljena → zaprta |
| **Različica izdelka** | standardno | `9c0310e` (naloga 3), `fee8af9` (testirano), ciljna različica `1.1` |
| Resnost, Prioriteta, Ponovljivost | standardno | 4.2; ponovljivost: vedno / občasno / naključno / ni preizkušeno … |
| Kategorija | standardno | funkcionalno področje: Ustvarjanje ankete, Glasovanje, Potrditev termina, E-pošta in .ics, Stabilnost strežnika, Testna zbirka |
| Dodeljena, Datum zapadlosti | standardno | odgovorni razvijalec, rok iz 4.2 |
| Platforma, OS, Verzija OS | standardno | `PC x86_64`, `Debian GNU/Linux 13`, `6.12.118` |
| **Vrsta napake** | po meri, seznam, obvezno | 4.1 |
| **Brskalnik** | po meri, večizbirni seznam, obvezno | `Chromium 149`, `Firefox 151`, `Ni odvisno (API ali strežnik)`, `Ni preizkušeno` |
| Komponenta | po meri, seznam, obvezno | Frontend (React), Backend (Zig), Podatkovna baza, E-pošta (Resend), Infrastruktura, Testi |
| Okolje | po meri, seznam, obvezno | Lokalno (ReleaseFast + Vite), Lokalno (Debug), Docker Compose, Railway |
| Testni primer, Zahteva | po meri, besedilo | sledljivost do TC-xx in FZ-xx iz specifikacije |
| Vzrok v kodi | po meri, besedilo | datoteka in vrstica, kjer smo vzrok poiskali |
| Priloge, Oznake, Povezave | standardno | dnevniki zagonov, posnetki zaslona, skripte; oznaki `naloga3`/`naloga6`; povezave med sorodnimi napakami |

Polja po meri so na voljo pri prijavi, posodobitvi, razrešitvi in zaprtju. Po prvih treh poljih je mogoče filtrirati seznam.

---

## 5. Izvedba testov

### 5.1 Okolje

| | |
|---|---|
| Aplikacija | `fee8af9`; backend Zig 0.16.0, gradnja **ReleaseFast** (kot v `Dockerfile`), za diagnostiko še Debug in ReleaseSafe; frontend Vite na `:8080` (posreduje `/api` na `:3000`) |
| Baza | PostgreSQL 16 v Dockerju (`127.0.0.1:5433`, `TimeZone=UTC`, kot Docker Compose in Railway); za EE-N14 še lokalni PostgreSQL 17 (`Europe/Ljubljana`) |
| Brskalnika | Chromium 149.0.7827.55, Firefox 151.0 (Playwright 1.61.1) |
| E-pošta | lažni `curl` ([skripte/lazni-curl](dokazi/napake/skripte/lazni-curl)) v `PATH` strežnika zajame vsebino, ki bi šla na Resend API, in ničesar ne pošlje. Tako smo prvič preverili FZ-19 (e-pošta in `.ics`), ki je bila v nalogi 3 nepreverjena. |
| Produkcija | `eventeaseapp.up.railway.app` je 25. 11. 2026 vračala »Application not found«, zato je vse izvedeno lokalno. |

Aplikacija je tekla neposredno (ne v vsebniku aplikacije), ker zagon Dockerja zahteva `sudo`.

### 5.2 Potek

1. **Zbirka Playwright Test** (`tests/e2e`, 18 primerov) v obeh brskalnikih, 36 zagonov. Vsi rezultati so enaki pričakovanim: 22 uspešnih, 14 pričakovano neuspešnih (7 na brskalnik) zaradi znanih napak INC-01–INC-06 ([izpis](dokazi/napake/zagon_playwright_chromium_firefox.txt)).
2. **Raziskovalni testi vmesnika** (začasna specifikacija, oba brskalnika, ura brskalnika nastavljena s `page.clock`): naslov iz presledkov, včerajšnji dan po polnoči, pretekla ura danes, izbira termina s tipkovnico ([izpis](dokazi/napake/raziskovalni_testi_UI.txt)).
3. **E-pošta in `.ics`:** celoten potek ustvari → glasuj → potrdi z zajemom vseh sporočil ([izpis](dokazi/napake/EE-N04_email_ics_casovni_pas.txt)), vabila po e-pošti ([izpis](dokazi/napake/EE-N02_odprti_rele.txt)).
4. **Sočasnost:** 10 hkratnih glasov v 10 anketah z e-pošto (8 ponovitev × 2 gradnji + kontrola brez e-pošte), 10 hkratnih potrditev iste ankete (15 ponovitev) ([izpis glasov](dokazi/napake/EE-N01_N03_hkratni_glasovi.txt), [izpis potrditev](dokazi/napake/EE-N06_hkratne_potrditve.txt)).
5. **Gradnja Debug:** zbirka in branje ankete s 3 glasovi ([izpis](dokazi/napake/EE-N05_uaf_getPoll.txt)).

Za vsako najdbo smo vzrok poiskali v kodi in ga vpisali v polje *Vzrok v kodi*. Skripte za ponovitev so v [dokazi/napake/skripte/](dokazi/napake/skripte/) in so priložene napakam v MantisBT.

**Popravek med delom.** Prvi poskus testa EE-N11 je kliknil 30. **december** namesto 30. novembra, ker se koledar odpre na trenutnem mesecu. Test smo popravili (premik na november, kontrola z 29. 11. in z uro 01:30) in šele nato napako vpisali. Prva meritev sočasnosti je zaradi prehitrega ponovnega zagona strežnika napačno poročala »ŽIV«. Meritev smo ponovili s preverjanjem PID-a in jedrnih izpisov (`coredumpctl`), v poročilu pa so samo rezultati ponovljene meritve.

---

## 6. Vpisane napake

Stanje v MantisBT na dan 25. 11. 2026 ([izvoz CSV](dokazi/napake/mantis/izvoz_napak.csv), [posnetek seznama](dokazi/napake/mantis/01_seznam_napak.png)). Vse napake so dodeljene razvijalcu `jure` (Jure Antolič), različica `fee8af9`, ciljna različica `1.1`.

| # | Oznaka | Povzetek | Vrsta | Kritičnost | Ponovljivost | Brskalnik | Kategorija | Stanje | Rok |
|---|---|---|---|---|---|---|---|---|---|
| 1 | EE-N01 | Strežnik se sesuje (SIGSEGV) ob hkratnih glasovih z e-pošto | Napaka | **kritičen** | občasno (7/8) | API | Stabilnost strežnika | dodeljena | 1. 12. |
| 2 | EE-N02 | `/api/polls/share-email` je odprt posrednik e-pošte | Varnostna ranljivost | **kritičen** | vedno | API | E-pošta in .ics | dodeljena | 1. 12. |
| 3 | INC-06 | Anketo je mogoče zaključiti s terminom druge ankete | Napaka | visok | vedno | Chromium, Firefox | Potrditev termina | dodeljena | 8. 12. |
| 4 | EE-N03 | Hkratna obvestila se izgubijo, podvojijo ali pokvarijo | Napaka | visok | vedno | API | E-pošta in .ics | dodeljena | 8. 12. |
| 5 | EE-N04 | Termin v `.ics` je 1–2 uri kasnejši od izbranega | Napaka | visok | vedno | Chromium, Firefox | E-pošta in .ics | dodeljena | 8. 12. |
| 6 | EE-N05 | Branje ankete uporabi sproščen pomnilnik (Debug se sesuje) | Napaka | visok | vedno | API | Glasovanje | dodeljena | 8. 12. |
| 7 | EE-N15 | Pošiljatelj `onboarding@resend.dev` doseže samo lastnika računa | Napaka | visok | ni preizkušeno | API | E-pošta in .ics | povratna informacija | 8. 12. |
| 8 | INC-01 | Termin po 23:00 se konča pred začetkom | Napaka | srednji | vedno | Chromium, Firefox | Ustvarjanje ankete | dodeljena | 22. 12. |
| 9 | INC-05 | Glasovanje po zaključku ankete je sprejeto | Napaka | srednji | vedno | API | Potrditev termina | dodeljena | 22. 12. |
| 10 | INC-02 | Strežnik shrani neveljavne ankete | Pomanjkljivost | srednji | vedno | API | Ustvarjanje ankete | dodeljena | 22. 12. |
| 11 | EE-N06 | Hkratne potrditve uspejo večkrat z različnimi termini | Napaka | srednji | občasno (4/15) | API | Potrditev termina | dodeljena | 22. 12. |
| 12 | EE-N16 | Termina ni mogoče izbrati s tipkovnico | Pomanjkljivost | srednji | vedno | Chromium, Firefox | Potrditev termina | dodeljena | 22. 12. |
| 13 | EE-N07 | `.ics` ni skladen z RFC 5545/5546 | Nedoslednost | nizek | vedno | API | E-pošta in .ics | dodeljena | 15. 1. |
| 14 | EE-N08 | Angleške zadeve e-pošte, surov zapis časa | Nedoslednost | nizek | vedno | API | E-pošta in .ics | dodeljena | 15. 1. |
| 15 | EE-N09 | Organizator dobi »vsi so prejeli obvestilo«, tudi ko ga niso | Napaka | nizek | vedno | API | E-pošta in .ics | dodeljena | 15. 1. |
| 16 | EE-N10 | Naslov iz samih presledkov je sprejet | Pomanjkljivost | nizek | vedno | Chromium, Firefox | Ustvarjanje ankete | dodeljena | 15. 1. |
| 17 | EE-N11 | Po polnoči je izbirljiv včerajšnji dan | Napaka | nizek | vedno | Chromium, Firefox | Ustvarjanje ankete | dodeljena | 15. 1. |
| 18 | EE-N12 | Danes je mogoče izbrati že pretečeno uro | Pomanjkljivost | nizek | vedno | Chromium, Firefox | Ustvarjanje ankete | dodeljena | 15. 1. |
| 19 | INC-04 | Neuspešno ustvarjanje pusti delno anketo | Napaka | nizek | vedno | API | Ustvarjanje ankete | dodeljena | 15. 1. |
| 20 | INC-03 | Napake odjemalca vrnejo 500 namesto 4xx | Nedoslednost | nizek | vedno | API | Glasovanje | dodeljena | 15. 1. |
| 21 | EE-N13 | Logotip v e-pošti kaže na star gostitelj | Nedoslednost | nizek | vedno | API | E-pošta in .ics | dodeljena | 15. 1. |
| 22 | EE-N14 | TC-01-01 pade na bazi, ki ni v UTC | Napaka v testu | nizek | vedno | Chromium | Testna zbirka | dodeljena | 15. 1. |

Povezave v orodju: EE-N01 ↔ EE-N03 (isti vzrok, pošiljanje e-pošte), EE-N04 ↔ EE-N14, EE-N09 ↔ EE-N15, EE-N06 ↔ INC-06, INC-02 ↔ INC-01, INC-04, EE-N10; INC-03 ↔ INC-04.

Ocenjevanje kritičnosti incidentov iz naloge 3: »visoka/srednja/nizka« smo preslikali v »visok/srednji/nizek«, nivo *kritičen* je nov.

### 6.1 Nove napake na kratko

Celoten opis, koraki, pričakovano/dejansko in predlog popravka so pri vsaki napaki v MantisBT. Tu so bistvena dejstva.

**EE-N01 Sesutje strežnika pri hkratnih glasovih (kritičen).** 10 hkratnih glasov v 10 anketah: gradnja ReleaseFast se je sesula v 7 od 8 ponovitev (SIGSEGV), ReleaseSafe v 1 od 8 (`Segmentation fault at address 0x2f8`, httpz `worker.zig:1670 getState`). Kontrola brez e-pošte: 0 od 8. Sesutje je torej povezano z zaganjanjem podprocesov `sh`/`curl` iz delovnih niti. V produkciji `Dockerfile` zažene `logic &` pod nginx, zato po padcu nihče ne zažene procesa znova in API vrača 502.

**EE-N02 Odprt posrednik e-pošte (kritičen, varnostna ranljivost).** `POST /api/polls/share-email` ne zahteva žetona in ne preveri povezave. Ena zahteva je pripravila 50 sporočil »Vabilo: Vaš račun bo zaklenjen – potrdite podatke« s povezavo `https://zlonamerna-stran.example/prijava`, od »EventEase«.

**EE-N03 Skupna datoteka `/tmp/resend_payload.json` (visok).** V vseh 16 ponovitvah je pravilno obvestilo dobilo največ 4 od 10 organizatorjev, drugi so ga dobili večkrat ali nikoli, v 11 ponovitvah je bil vsaj en zahtevek pokvarjen JSON.

**EE-N04 Časovni pas v `.ics` (visok).** Izbrano 10. 12. 2026 ob 18:00 → v bazi `18:00:00+00` → `DTSTART:20261210T180000Z` = **19:00** v Ljubljani (poleti 20:00). Potrjuje opažanje O-1 iz naloge 3.

**EE-N05 Uporaba sproščenega pomnilnika v `getPoll`/`getAdminPoll` (visok).** `options_list.items` se vrne po `defer options_list.deinit`. Gradnja Debug (`zig build run` iz README) se ob branju ankete s 3 glasovi vedno sesuje. ReleaseFast trenutno slučajno vrne pravilne podatke.

**EE-N15 Pošiljatelj `onboarding@resend.dev` (visok, ni preizkušeno).** Po [dokumentaciji Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain) lahko domena `resend.dev` pošilja samo lastniku računa. Brez preverjene domene udeleženci ne prejmejo ničesar. Na pravem računu ni preverjeno, zato je stanje *povratna informacija*.

**EE-N06 Hkratne potrditve (srednji).** 10 hkratnih potrditev iste ankete: v 4 od 15 ponovitev več kot en HTTP 200, dvakrat 5 × 200.

**EE-N16 Dostopnost (srednji).** S tipko Tab fokus doseže samo gumb »Potrdi izbran termin«, kartic terminov (`<div onClick>`) ne. Brez miške ankete ni mogoče zaključiti. Potrjuje O-2 iz naloge 3.

**EE-N07–EE-N09, EE-N13 (nizek):** `.ics` brez `DTSTAMP`, `METHOD:REQUEST` brez `ORGANIZER`, UID iz naslova in časa; zadeve »New vote in poll«/»Poll finalized« in čas `2026-12-10 18:00:00+00`; stavek »Vsi udeleženci so prejeli obvestilo«, čeprav Bojan brez e-pošte ni prejel ničesar; logotip na `eventease-production-5c24.up.railway.app` vrne 404.

**EE-N10–EE-N12 (nizek, vmesnik):** naslov `"     "` ustvari anketo (oba brskalnika); ob 00:30 je 30. 11. izbirljiv, ob 01:30 ne (`toISOString()` vrne datum v UTC); ob 20:00 je sprejet termin danes ob 08:00.

**EE-N14 (napaka v testu):** TC-01-01 pričakuje `+00` in na bazi `Europe/Ljubljana` pade (`18:00:00+01`), na bazi v UTC uspe.

---

## 7. Priporočen vrstni red odprave

1. **EE-N02** – onemogočiti ali zaščititi `share-email` (zloraba je možna takoj in brez pogojev).
2. **EE-N01, EE-N03** – pošiljanje e-pošte brez skupne datoteke in brez zaganjanja lupine iz delovnih niti; nadzornik procesov v `Dockerfile`.
3. **INC-06, EE-N06** – preverjanje termina in pogojni `UPDATE` v transakciji v `finalizePoll`.
4. **EE-N04, INC-01, EE-N11** – enoten zapis časa z odmikom (vsi trije izvirajo iz ročnega sestavljanja datumov v `CalendarPicker.jsx`).
5. **EE-N05** – ena vrstica, a prepreči sesutje pri lokalnem razvoju.
6. **EE-N15** – preveriti domeno pri Resend; brez tega e-pošta v produkciji verjetno ne deluje.
7. Ostale srednje in nizke.

Ko je napaka odpravljena, razvijalec nastavi stanje *odpravljena* in *Popravljeno v različici*. Preizkuševalec po ponovnem zagonu skripte ali testnega primera iz polja *Testni primer* napako zapre ali jo vrne v stanje *dodeljena*. Testi z oznako `knownBug` v `tests/e2e` bodo po popravku javili »unexpected pass«, kar je znak, da je treba oznako odstraniti in napako zapreti.

---

## 8. Omejitve

- MantisBT teče samo lokalno. Podatki so v `~/mantisbt/mysql`, zato ta dokument in [izvoz CSV](dokazi/napake/mantis/izvoz_napak.csv) služita kot trajen zapis.
- Produkcija na Railwayu v času testiranja ni tekla. EE-N01 (posledica v produkciji), EE-N13 in EE-N15 so izpeljani iz konfiguracije, kode in dokumentacije.
- Pošiljanje prave e-pošte ni bilo izvedeno (lažni `curl`). Prikaz `.ics` v konkretnih koledarjih (Google, Outlook) ni preverjen.
- Natančen vzrok sesutja EE-N01 v knjižnici httpz ni določen, dokazana je samo povezava z vklopljeno e-pošto.
- Mobilni brskalniki in Safari/WebKit niso preizkušeni.

---

## 9. Uporaba orodja Claude Code

Pri nalogi smo uporabili agenta **Claude Code** (Anthropic, model Claude Opus 5.5).

**Odločitve izvajalca** (agent je pred začetkom postavil vprašanja): orodje MantisBT v Dockerju; vir napak je novo izvedeno testiranje; obseg so obstoječi scenariji TS-01–TS-03; izdelek je poročilo v repozitoriju; namestitev v `~/mantisbt`; vse napake dodeljene izvajalcu; roki po kritičnosti. Vsebnike je z `sudo` zagnal izvajalec.

**Kaj je naredil Claude Code:** pripravil konfiguracijo MantisBT in jo nastavil (namestitev, polja po meri, kategorije, različice, uporabnik) prek skrbniškega vmesnika in REST API; zagnal zbirko v dveh brskalnikih; napisal raziskovalne teste in skripte za ponovitev; s lažnim `curl` preveril e-pošto; izvedel teste sočasnosti; v kodi poiskal vzroke; vpisal 22 napak s prilogami in povezavami; pripravil osnutek tega dokumenta.

**Kako smo preverili delo agenta:** vsaka napaka ima priložen dnevnik ali posnetek zaslona; meritvi sočasnosti in test EE-N11 sta bila zaradi napak v testnem okolju ponovljena (5.2); za EE-N01 je izvedena kontrolna meritev brez e-pošte; vzroke smo preverili na navedenih vrsticah kode; EE-N15 je zaradi nepreverjenosti označena kot *ni preizkušeno*.
