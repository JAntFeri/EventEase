# EventEase – poročilo funkcionalnega testiranja

| | |
|---|---|
| **Dokument** | Dnevnik izvedbe, poročila o incidentih in zaključno poročilo testiranja |
| **Predloga** | prirejena po ISO/IEC/IEEE 29119-3:2021 (Test Execution Log, Test Incident Report, Test Completion Report) |
| **Testirani sistem** | EventEase, različica `9c0310e` (veja `jureQA`) |
| **Specifikacija** | [Specifikacija_testov.md](Specifikacija_testov.md) |
| **Izvajalec** | Jure Antolič |
| **Datum izvedbe** | 4. 11. 2026, 11:13:29–11:13:41 (končni zagon `20261104T101329`) |
| **Dokazi** | [dokazi/](dokazi/): `rezultati.json` (vsi koraki), `izpis_zagona.txt`, posnetki zaslona `TC-*.png` |

---

## 1. Povzetek

Izvedli smo **18 testnih primerov** v treh scenarijih (52 preverjenih korakov). **11 primerov je uspešnih, 7 neuspešnih, nobeden ni blokiran.** Iz neuspešnih primerov izhaja **6 incidentov**: 1 visoke resnosti, 3 srednje in 2 nizke.

| Scenarij | Primerov | Uspešnih | Neuspešnih | Koraki OK |
|---|---|---|---|---|
| TS-01 Ustvarjanje ankete | 5 | 3 | 2 | 9 / 18 |
| TS-02 Glasovanje | 6 | 4 | 2 | 14 / 17 |
| TS-03 Potrditev termina | 7 | 4 | 3 | 12 / 17 |
| **Skupaj** | **18** | **11** | **7** | **35 / 52** |

**Ocena:** glavni potek (ustvari → glasuj → potrdi) prek uporabniškega vmesnika deluje pravilno. Vsi primeri srečne poti in vse validacije v vmesniku so uspešni. Težave so v **strežniku, ki ne preverja vhodov in stanja ankete**. Pravila zato veljajo samo, dokler odjemalec ravna pravilno. Najresnejša napaka (INC-06) dovoli, da anketo trajno zaključimo s terminom druge ankete.

---

## 2. Dnevnik izvedbe (Test Execution Log)

Primere je izvedel avtomatski izvajalnik `tests/functional/funkcionalni-testi.mjs` po postopkih iz specifikacije (poglavje 7). Okolje: [Specifikacija, poglavje 4](Specifikacija_testov.md#4-testno-okolje).

| Čas | Primer | Naziv | Koraki OK | Rezultat | Incident | Dokaz |
|---|---|---|---|---|---|---|
| 11:13:29 | TC-01-01 | Uspešno ustvarjanje ankete z dvema terminoma (UI) | 5/5 | ✅ USPEŠEN | – | [povezave](dokazi/TC-01-01_povezave.png) |
| 11:13:30 | TC-01-02 | Zavrnitev ankete brez naslova (UI) | 2/2 | ✅ USPEŠEN | – | [posnetek](dokazi/TC-01-02_brez_naslova.png) |
| 11:13:31 | TC-01-03 | Zavrnitev ankete brez izbranega termina (UI) | 2/2 | ✅ USPEŠEN | – | [posnetek](dokazi/TC-01-03_brez_termina.png) |
| 11:13:32 | TC-01-04 | Robna vrednost: termin ob 23:30 (UI) | 0/2 | ❌ NEUSPEŠEN | INC-01 | [posnetek](dokazi/TC-01-04_pozni_termin.png) |
| 11:13:33 | TC-01-05 | Strežniška validacija vhodov (API) | 0/7 | ❌ NEUSPEŠEN | INC-02, INC-03, INC-04 | `rezultati.json` |
| 11:13:33 | TC-02-01 | Oddaja glasu »Da« in »Če bo potrebno« (UI) | 5/5 | ✅ USPEŠEN | – | [izbira](dokazi/TC-02-01_izbira.png), [zahvala](dokazi/TC-02-01_zahvala.png), [rezultati](dokazi/TC-02-01_skrbniski_pogled.png) |
| 11:13:34 | TC-02-02 | Zavrnitev glasu brez imena (UI) | 2/2 | ✅ USPEŠEN | – | [posnetek](dokazi/TC-02-02_brez_imena.png) |
| 11:13:35 | TC-02-03 | Sprememba glasu z istim imenom (API) | 3/3 | ✅ USPEŠEN | – | `rezultati.json` |
| 11:13:35 | TC-02-04 | Termin druge ankete (API) | 2/2 | ✅ USPEŠEN | – | `rezultati.json` |
| 11:13:35 | TC-02-05 | Neveljaven status glasu (API) | 1/2 | ❌ NEUSPEŠEN | INC-03 | `rezultati.json` |
| 11:13:35 | TC-02-06 | Neobstoječ ali neveljaven žeton (API) | 1/3 | ❌ NEUSPEŠEN | INC-03 | [posnetek](dokazi/TC-02-06_neveljavna_povezava.png) |
| 11:13:36 | TC-03-02 | Potrditev brez izbire (UI) | 2/2 | ✅ USPEŠEN | – | [posnetek](dokazi/TC-03-02_brez_izbire.png) |
| 11:13:37 | TC-03-01 | Potrditev zmagovalnega termina (UI) | 4/4 | ✅ USPEŠEN | – | [izbira](dokazi/TC-03-01_izbira.png), [organizator](dokazi/TC-03-01_potrjeno_admin.png), [udeleženec](dokazi/TC-03-01_potrjeno_udelezenec.png) |
| 11:13:40 | TC-03-03 | Ponovna potrditev (API) | 2/2 | ✅ USPEŠEN | – | `rezultati.json` |
| 11:13:40 | TC-03-04 | Glasovanje po potrditvi (API) | 0/2 | ❌ NEUSPEŠEN | INC-05 | `rezultati.json` |
| 11:13:40 | TC-03-05 | Termin druge ankete (API) | 0/2 | ❌ NEUSPEŠEN | INC-06 | [posnetek](dokazi/TC-03-05_tuj_termin_udelezenec.png) |
| 11:13:41 | TC-03-06 | Neobstoječ termin (API) | 1/2 | ❌ NEUSPEŠEN | INC-03 | `rezultati.json` |
| 11:13:41 | TC-03-07 | Žeton za udeležence na skrbniški poti (API) | 3/3 | ✅ USPEŠEN | – | `rezultati.json` |

**Ponovljivost:** celoten nabor smo pognali štirikrat (11:10, 11:12, 11:13, 11:13). Rezultati primerov TS-01 in TS-02 so bili vsakič enaki. V prvem zagonu se je TC-03-01 ustavil zaradi napake v izvajalniku: besedilo kartice termina ima `pointer-events: none`, zato Playwright klika nanj ni izvedel. Lokator smo popravili, da klikne kartico (tako kot uporabnik), in vsak primer izolirali, da napaka enega ne ustavi ostalih. V drugem, tretjem in četrtem zagonu je bilo vseh 18 primerov izvedenih z enakimi rezultati. Med zagoni smo dodali samo posnetek zaslona v TC-03-05 in zožili opombo v TC-01-05 na trenutni zagon.

### 2.1 Odstopanja v neuspešnih korakih

| Primer | Korak | Pričakovano | Dejansko |
|---|---|---|---|
| TC-01-04 | Poslani termin | konec 21. ob 00:30 | `start 2026-12-20T23:30:00`, `end 2026-12-20T00:30:00` |
| TC-01-04 | Zapis v bazi | `end_time > start_time` | `2026-12-20 23:30:00+00 \| 2026-12-20 00:30:00+00 \| f` |
| TC-01-05 | (a) prazen naslov | 400 | **201**, anketa shranjena |
| TC-01-05 | (b) brez terminov | 400 | **201**, anketa brez terminov shranjena |
| TC-01-05 | (c) konec pred začetkom | 400 | **201**, shranjena |
| TC-01-05 | (d) manjka `organizer_email` | 400 | **500** |
| TC-01-05 | (e) datum `"jutri"` | 400 | **500**, anketa (brez terminov) kljub temu shranjena |
| TC-01-05 | (f) neveljaven JSON | 400 | **500** |
| TC-01-05 | Število anket | nespremenjeno | +4 (a, b, c, e) |
| TC-02-05 | Status `maybe` | 400 | **500** (glas pravilno ni shranjen) |
| TC-02-06 | `POST /share/ni-uuid/vote` | 404 ali 400 | **500** |
| TC-02-06 | `GET /share/ni-uuid` | 404 ali 400 | **500** (vmesnik kljub temu pravilno prikaže »Dogodka ni mogoče najti«) |
| TC-03-04 | Glas na zaključeno anketo | 409 ali 400 | **201**, glas shranjen (3 → 4) |
| TC-03-05 | Potrditev s tujim terminom | 400, anketa odprta | **200**, anketa zaključena s terminom druge ankete |
| TC-03-06 | Potrditev z neobstoječim terminom | 400 »Final slot not found« | **500** (anketa pravilno ostane odprta) |

---

## 3. Poročila o incidentih (Test Incident Reports)

Resnost: **visoka** = izguba ali okvara podatkov brez možnosti popravka v aplikaciji; **srednja** = napačno obnašanje, ki ga uporabnik lahko sproži ali opazi; **nizka** = napačna odzivna koda brez vpliva na podatke.

Vzroke smo po izvedbi poiskali v kodi. Testi sami so črna škatla.

### INC-06 Anketo je mogoče zaključiti s terminom druge ankete — **visoka**

| | |
|---|---|
| **Primer** | TC-03-05 |
| **Zahteva** | FZ-17 |
| **Okolje** | `9c0310e`, Docker Compose, 4. 11. 2026 11:13:40 |
| **Koraki** | 1. Ustvari anketo A (TS-02) in anketo B z enim terminom. 2. `POST /api/polls/admin/<admin_B>/finalize` z `{"final_slot_id": "<ID termina ankete A>"}`. |
| **Pričakovano** | HTTP 400, anketa B ostane odprta. |
| **Dejansko** | HTTP 200 `{"success":true}`. Anketa B ima `is_finalized = t` in `final_slot_id` = termin ankete A. Udeleženci ankete B vidijo »Termin potrjen … Podatki o terminu niso na voljo« ([posnetek](dokazi/TC-03-05_tuj_termin_udelezenec.png)). |
| **Vpliv** | Anketa je trajno zaključena brez veljavnega termina. Ponovna potrditev vrne 409, zato napake v aplikaciji ni mogoče popraviti. Če bi bila e-pošta vklopljena, bi organizator in udeleženci ankete B prejeli obvestilo in `.ics` s časom termina **ankete A**. Napaka zahteva poznavanje ID-ja tujega termina; ta je viden vsem, ki imajo povezavo za udeležence ankete A. |
| **Vzrok** | `finalizePoll` ([routes.zig:1035](../../backend/logic/src/routes.zig#L1035)) najprej izvede `UPDATE polls SET is_finalized = TRUE, final_slot_id = $1` in šele nato poišče termin, pri tem pa ne preveri `poll_id` ([routes.zig:1040](../../backend/logic/src/routes.zig#L1040)). Operaciji nista v transakciji. |
| **Predlog** | Pred posodobitvijo preveri `SELECT ... FROM time_slots WHERE id = $1 AND poll_id = $2` (enako kot `submitVote`). Če termina ni, vrni 400. Posodobitev naj bo pogojna (`... WHERE id = $2 AND NOT is_finalized`) in v transakciji. |

### INC-05 Glasovanje po zaključku ankete je sprejeto — **srednja**

| | |
|---|---|
| **Primer** | TC-03-04 |
| **Zahteva** | FZ-16 |
| **Koraki** | 1. Zaključi anketo (TC-03-01). 2. `POST /api/polls/share/<share>/vote` z imenom `Zamudnik`. |
| **Pričakovano** | Zavrnjeno (409 ali 400), število glasov ostane 3. |
| **Dejansko** | HTTP 201, glas shranjen (4 glasovi). |
| **Vpliv** | Vmesnik po zaključku obrazca ne prikaže, zato običajni uporabnik napake ne sproži. Odjemalec z zastarelo stranjo (odprto pred zaključkom) ali neposreden klic API pa spremeni rezultate že zaključene ankete. Udeleženec, ki glasuje po zaključku, dobi potrditev »Hvala!«, obvestila o terminu pa ne prejme, ker so bila poslana že ob zaključku. |
| **Vzrok** | `submitVote` ([routes.zig:798](../../backend/logic/src/routes.zig#L798)) ne bere `is_finalized`. |
| **Predlog** | Pri iskanju ankete prebrati tudi `is_finalized` in vrniti 409 »Poll has already been finalized.« (enako kot `finalizePoll`). Enako velja za `suggestDate`. |

### INC-02 Strežnik shrani neveljavne ankete — **srednja**

| | |
|---|---|
| **Primer** | TC-01-05 (a, b, c) |
| **Zahteva** | FZ-02, FZ-03, FZ-06 |
| **Koraki** | `POST /api/polls` s praznim naslovom / praznim seznamom `time_slots` / terminom, ki se konča pred začetkom. |
| **Pričakovano** | HTTP 400, nič shranjeno. |
| **Dejansko** | Vsi trije vrnejo 201 in anketo shranijo. |
| **Vpliv** | Pravila iz vmesnika (obvezen naslov, vsaj en termin) na strežniku ne veljajo. Anketa brez terminov je neuporabna (glasovati ni mogoče, potrditi tudi ne). Pri terminu z negativnim trajanjem `buildIcsContent` vrne `InvalidTimeRange` ([email_content.zig:79](../../backend/logic/src/email_content.zig#L79)), zato udeleženci ob potrditvi takega termina ne prejmejo obvestila (napaka se samo zabeleži). |
| **Vzrok** | `createPoll` ([routes.zig:380](../../backend/logic/src/routes.zig#L380)) vhod samo razčleni, ne preveri pa ga. |
| **Predlog** | Na strežniku preveriti: naslov ni prazen (po `trim`), e-pošta vsebuje `@`, vsaj en termin, `end_time > start_time`. Ob kršitvi vrniti 400. Dodatno omejitev v bazi: `CHECK (end_time > start_time)` na `time_slots` (idempotentno, v `DO $$` bloku). |

### INC-01 Termin po 23:00 se konča pred začetkom — **srednja**

| | |
|---|---|
| **Primer** | TC-01-04 |
| **Zahteva** | FZ-04 |
| **Koraki** | V obrazcu za ustvarjanje izberi dan in uro 23:30, ustvari anketo. |
| **Pričakovano** | Termin 20. 23:30 – 21. 00:30. |
| **Dejansko** | Poslano in shranjeno `2026-12-20 23:30` – `2026-12-20 00:30` (konec 23 ur pred začetkom). |
| **Vpliv** | Običajen uporabnik napako sproži z izbiro večernega termina (23:00–23:59). Skrbniški pogled termin prikaže, ob potrditvi pa udeleženci ne prejmejo e-pošte, ker `.ics` ni mogoče ustvariti (glej INC-02). Samodejno čiščenje (`cleanup.zig`, 7 dni po koncu termina) pa anketo izbriše 1 dan prezgodaj. |
| **Vzrok** | `formatBackendSlot` ([CalendarPicker.jsx:123](../../frontend/EventEase/src/components/CalendarPicker.jsx#L123)) izračuna uro konca kot `(ura + 1) % 24`, datuma pa ne poveča. |
| **Predlog** | Konec izračunati z `Date` (začetek + 60 min) in ga zapisati z datumom naslednjega dne. Dodati test enote za `formatBackendSlot` ob 23:30 in strežniško preverjanje iz INC-02. |

### INC-04 Neuspešno ustvarjanje pusti delno shranjeno anketo — **nizka**

| | |
|---|---|
| **Primer** | TC-01-05 (e) |
| **Zahteva** | FZ-06 |
| **Koraki** | `POST /api/polls` s terminom `{"start_time": "jutri", "end_time": "pojutrišnjem"}`. |
| **Pričakovano** | HTTP 400, nič shranjeno. |
| **Dejansko** | HTTP 500, v bazi pa ostane anketa brez terminov (`TS01 API datum 20261104T101329`, 0 terminov). |
| **Vpliv** | Odjemalec misli, da anketa ne obstaja, v bazi pa ostane neuporaben zapis. Samodejno čiščenje ga nikoli ne izbriše, ker briše samo zaključene ankete. |
| **Vzrok** | `createPoll` vstavi anketo ([routes.zig:402](../../backend/logic/src/routes.zig#L402)) in nato termine ([routes.zig:409](../../backend/logic/src/routes.zig#L409)) brez transakcije. Ko Postgres zavrne neveljaven datum, je anketa že zapisana. |
| **Predlog** | Vse vstavke izvesti v eni transakciji (`BEGIN`/`COMMIT` z `errdefer ROLLBACK`, kot v `submitVote`). |

### INC-03 Napake odjemalca vrnejo 500 namesto 4xx — **nizka**

| | |
|---|---|
| **Primeri** | TC-01-05 (d, e, f), TC-02-05, TC-02-06 (b, c), TC-03-06 |
| **Zahteva** | FZ-06, FZ-11, FZ-12, FZ-17 |
| **Dejansko** | Manjkajoče obvezno polje, neveljaven JSON, neveljaven datum, status `maybe`, žeton, ki ni UUID, in neobstoječ `final_slot_id` vrnejo HTTP 500 »Internal Server Error«. |
| **Vpliv** | Podatki ostanejo pravilni (razen INC-04). Odjemalec pa ne loči svoje napake od napake strežnika, nadzor strežnika pa beleži lažne napake 500. Vmesnik vse napake prikaže enako (»Napaka pri oddaji glasu na strežniku.«), zato uporabnik ne izve, kaj je narobe. |
| **Vzrok** | Napake `jsonParse` in napake Postgresa (neveljaven `uuid`/`timestamptz`, kršitev `CHECK` in tujega ključa) se iz upravljavcev vrnejo z `try` in httpz jih spremeni v 500. Pri TC-03-06 prepreči shranjevanje samo tuji ključ `fk_final_slot`. Preverjanje »Final slot not found« ([routes.zig:1040](../../backend/logic/src/routes.zig#L1040)) se nikoli ne izvede, ker je za `UPDATE`. |
| **Predlog** | Napako `jsonParse` ujeti in vrniti 400. Žetone in ID-je preveriti z `uuid.isValidUuidHex` (obstaja v `uuid.zig`) in ob neveljavni obliki vrniti 404/400. Status preveriti pred vstavljanjem. |

---

## 4. Opažanja izven testnih primerov

Opažanja so nastala med pripravo in izvedbo, s testnim primerom pa niso potrjena.

| # | Opažanje | Podlaga |
|---|---|---|
| O-1 | **Časovni pas.** Vmesnik pošlje uro brez pasu (`2026-12-10T18:00:00`), strežnik jo shrani kot UTC (`18:00:00+00`, TC-01-01), vmesnik pa jo prikaže kot 18:00. Datoteka `.ics` termin pravilno pretvori v `20261210T180000Z`, kar je v Sloveniji **19:00** (poleti 20:00). Udeleženci bi termin v koledarju videli eno do dve uri pozneje, kot je bil izbran. | podatki v bazi (TC-01-01) in koda `formatIcsTimestamp`. Ni preverjeno, ker je e-pošta izklopljena. |
| O-2 | **Dostopnost izbire termina.** V skrbniškem pogledu je termin izbran s klikom na `<div>` brez vloge `radio` in brez možnosti izbire s tipkovnico. Uporabnik brez miške termina ne more potrditi. | opaženo pri avtomatizaciji TC-03-01 |
| O-3 | **Drug glasovalec z istim imenom prepiše glas.** Glas je identificiran samo z imenom (TC-02-03). Dva udeleženca z imenom »Ana« si prepisujeta glasove. To je verjetno namerno (sprememba glasu brez prijave), a v dokumentaciji ni omenjeno. | TC-02-03 |

---

## 5. Zaključno poročilo (Test Completion Report)

### 5.1 Izvedeno glede na načrt

| Načrtovano | Izvedeno | Odstopanje |
|---|---|---|
| 3 scenariji, 18 primerov | 3 scenariji, 18 primerov | – |
| Zahteve FZ-01 – FZ-19 | FZ-01 – FZ-18 | **FZ-19 (e-pošta in `.ics`) ni preverjena**, ker ima testno okolje `DISABLE_EMAILS=true` (Specifikacija, 4.3). |
| Okolje Docker Compose | Docker Compose s prepisom vrat | Baza na `127.0.0.1:5433` namesto 5432 (lokalni PostgreSQL zaseda 5432). Na obnašanje aplikacije ne vpliva. |

### 5.2 Pokritost zahtev

| Zahteva | Primeri | Stanje |
|---|---|---|
| FZ-01 Ustvarjanje ankete | TC-01-01 | ✅ |
| FZ-02 Obvezen naslov | TC-01-02 ✅, TC-01-05 ❌ | ⚠️ samo v UI (INC-02) |
| FZ-03 Vsaj en termin | TC-01-03 ✅, TC-01-05 ❌ | ⚠️ samo v UI (INC-02) |
| FZ-04 Trajanje termina 1 h | TC-01-01 ✅, TC-01-04 ❌ | ❌ INC-01 |
| FZ-05 Dve povezavi | TC-01-01 | ✅ |
| FZ-06 Zavrnitev neveljavnih vhodov | TC-01-05, TC-02-05 | ❌ INC-02, INC-03, INC-04 |
| FZ-07 Glasovanje brez prijave | TC-02-01, TC-02-02 | ✅ |
| FZ-08 Potrditev in prikaz glasu | TC-02-01 | ✅ |
| FZ-09 Sprememba glasu | TC-02-03 | ✅ |
| FZ-10 Termini iste ankete | TC-02-04 | ✅ |
| FZ-11 Dovoljeni statusi | TC-02-05 | ⚠️ zavrnjeno, a z 500 (INC-03) |
| FZ-12 Neveljavna povezava | TC-02-06 | ⚠️ UI pravilno, API 500 (INC-03) |
| FZ-13 Izbira in potrditev | TC-03-01, TC-03-02 | ✅ |
| FZ-14 Trajna potrditev | TC-03-01 | ✅ |
| FZ-15 Ponovna potrditev 409 | TC-03-03 | ✅ |
| FZ-16 Po potrditvi ni glasovanja | TC-03-01 ✅, TC-03-04 ❌ | ❌ samo v UI (INC-05) |
| FZ-17 Samo termin te ankete | TC-03-05 ❌, TC-03-06 ⚠️ | ❌ INC-06 |
| FZ-18 Ločitev žetonov | TC-03-07 | ✅ |
| FZ-19 E-pošta z `.ics` | – | ⏸ ni izvedeno |

### 5.3 Ocena kakovosti in priporočilo

Za **običajnega uporabnika** prek vmesnika aplikacija deluje: vsi primeri UI so uspešni razen večernega termina (INC-01). **Strežnik** pa se zanaša na to, da odjemalec pošilja samo veljavne zahteve. Ker je API javen in dostop temelji samo na poznavanju žetona, to ni dovolj.

Priporočen vrstni red popravkov:

1. **INC-06** – preverjanje pripadnosti termina in transakcija v `finalizePoll`. Napaka trajno pokvari anketo.
2. **INC-01** – izračun konca termina čez polnoč. Pogost dejanski primer, ki ga sproži navaden uporabnik.
3. **INC-05, INC-02, INC-04** – preverjanje stanja ankete in vhodov ter transakcija v `createPoll`.
4. **INC-03** – pravilne odzivne kode.
5. **O-1** – časovni pas. Najprej ga potrditi s testom (glej 5.4), ker bi vplival na vse udeležence.

Po popravkih ponovno poženemo celoten nabor. Primeri, ki zdaj padejo, so napisani tako, da bodo po popravku uspešni brez sprememb.

### 5.4 Preostala tveganja in nadaljnje delo

- **E-pošta in `.ics` (FZ-19) nista preverjena v delujočem sistemu.** Predlog: ločen testni zagon z `DISABLE_EMAILS=false` in testnim ključem Resend, ali pa prestrezanje ukaza `curl` in preverjanje vsebine `/tmp/resend_payload.json`.
- Izvajalnik ni vključen v CI. Ob vključitvi bi bilo treba dodati `playwright` kot razvojno odvisnost in korak po `docker compose up` v `ci.yml`.
- Primeri ne pokrivajo sočasnosti (dva organizatorja hkrati potrdita, dva glasova z istim imenom hkrati) in velikih anket.
- Testni podatki ostanejo v bazi projekta `eventease-qa`. Odstranimo jih z `sudo docker compose -p eventease-qa down -v`.

---

## 6. Uporaba orodja Claude Code

Pri tej nalogi smo uporabili agenta **Claude Code** (Anthropic, model Claude Opus 5.5).

**Odločitve izvajalca** (agent je pred začetkom postavil vprašanja):
- izvajalec dobi 3 scenarije: ustvarjanje, glasovanje, potrditev,
- izvedba lokalno v Docker Compose (ne v produkciji na Railway),
- dokumentacija v Markdown v repozitoriju,
- ker uporabnik ni v skupini `docker`, je aplikacijo zagnal izvajalec s `sudo`; agent je pripravil prepis vrat.

**Kaj je naredil Claude Code:**
- pregledal obstoječo dokumentacijo in iz kode, besedil vmesnika in sheme obnovil zahteve FZ-01 – FZ-19,
- predlagal testne primere in pričakovane rezultate, izpeljane iz zahtev,
- napisal izvajalnik `tests/functional/funkcionalni-testi.mjs` (Playwright za UI, `fetch` za API, `psql` za stanje baze),
- izvedel teste, analiziral neuspešne primere in v kodi poiskal vzroke,
- pripravil osnutka obeh dokumentov.

**Kako smo preverili delo agenta:**
- nabor smo pognali štirikrat in primerjali rezultate (2. poglavje),
- posnetke zaslona smo pregledali ročno (npr. INC-06: pogled udeleženca »Podatki o terminu niso na voljo«),
- pri prvem zagonu je bil TC-03-01 blokiran zaradi napake v izvajalniku, ne v aplikaciji. Napako smo prepoznali in popravili lokator, pričakovanega rezultata pa nismo spreminjali,
- za vsak incident smo vzrok preverili v navedeni vrstici kode.

**Česa nismo preverili:** prejema e-pošte in vsebine `.ics` v delujočem sistemu, obnašanja v drugih brskalnikih (samo Chromium) in na mobilnih napravah.
