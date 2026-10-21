# EventEase – strategija testiranja enot

Dokument opisuje, kako testiramo enote v EventEase, kaj testi pokrivajo, kako smo preverili, da testi res zaznajo napake, katere pomanjkljive teste smo našli in kako so testi vključeni v cevovod CI.

---

## 1. Ogrodje in orodja

| Del | Ogrodje | Zakaj |
|---|---|---|
| Frontend (`frontend/EventEase`) | vgrajeni Node test runner (`node:test` + `node:assert/strict`) | Brez novih odvisnosti. Ima `describe`/`test`, nadomestne objekte (`mock.fn`, `mock.method`) in merjenje pokritosti (`--experimental-test-coverage`). |
| Backend (`backend/logic`) | vgrajeni Zig testi (`test "…" {}` + `std.testing`) | Del jezika. `std.testing.allocator` sam zazna puščanje pomnilnika, `checkAllAllocationFailures` pa simulira pomanjkanje pomnilnika. |

Teste pišemo samo za **čiste funkcije** (brez DOM, baze ali omrežja). Zato smo logiko, ki je bila zakopana v komponentah React in v `routes.zig`, prestavili v ločene module:

| Enota | Datoteka | Od kod |
|---|---|---|
| `eventHelpers` | `src/utils/eventHelpers.js` | obstoječa |
| `dateHelpers` | `src/utils/dateHelpers.js` | podvojeni `.replace(" ", "T").split("+")[0]` iz 4 pogledov |
| `voteHelpers` | `src/utils/voteHelpers.js` | štetje glasov in sklanjatev iz `VoteResults.jsx` |
| `api/polls` | `src/api/polls.js` | vsi klici `fetch` iz 5 komponent |
| ICS | `src/email_content.zig` | `formatIcsTimestamp`, `buildIcsContent` iz `routes.zig` |
| HTML/JSON e-pošta | `src/email_content.zig` | `buildHtmlEmail`, `jsonEscape` (prej podvojeno v `sendEmail`) |
| `uuid` | `src/uuid.zig` | obstoječa (samo popravljeni testi) |

## 2. Kaj testi pokrivajo

Za vsako enoto pokrijemo štiri skupine primerov. Pričakovane vrednosti vzamemo iz **specifikacije** (RFC 5545 za ICS, RFC 8259 za JSON, slovenska slovnica za sklanjatev, API pogodba backenda), ne iz trenutnega obnašanja kode.

| Enota | Običajni primeri | Robne vrednosti | Neveljavni vhodi | Izjeme |
|---|---|---|---|---|
| `eventHelpers` | `janez@mail.com` → `janez`; vsi trije statusi | `@domena.si`, presledki, več znakov `@` | `null`, `undefined`, število, objekt, `"YES"`, `" yes"` | `buildSharePath` brez žetona vrže `TypeError` |
| `dateHelpers` | Postgres `+00` → ISO | pasovi `-05`, `+05:30`, delne sekunde, polnoč, samo datum | prazen niz, presledki, `null`, število | – (vrača `""`/`null`/`[]`) |
| `voteHelpers` | mešani glasovi, več udeležencev | 0 glasov, 0 udeležencev, sklanjatev 0/1/2/3/4/5/11/12/101/102/103/111 | neznan `slot_id`, neznan status, manjkajoče ime, `null` | glasovalec brez izbir ne vrže izjeme |
| `api/polls` | pravilen URL, metoda, glave in telo za vseh 8 klicev | odgovor 204 brez telesa, žeton s `/` in `?` | 200 z neveljavnim JSON | HTTP 400/404/500 → `ApiError`, omrežna napaka → izvirna izjema |
| ICS | `+00`, `Z`, brez pasu | prestop čez polnoč, leto, 29. februar (2024, 2000, 1900), 00:00:00 in 23:59:59 | mesec 13, 31. april, 24:00, `+24`, napačni ločili, predolg niz | `InvalidTimestamp`, `InvalidTimeRange`, `OutOfMemory` brez puščanja |
| HTML/JSON | `<`, `>`, `&`, nova vrstica, narekovaji | prazen niz, že ubežan `&amp;`, UTF-8 | kontrolni znaki `\x00`–`\x1f` | `OutOfMemory` brez puščanja |

## 3. Nadomestni objekti (mock)

- **`fetch` v `api/polls.test.js`**: `mock.method(globalThis, "fetch")` pred vsakim testom zamenja globalni `fetch`. Vsak test sam določi odgovor z resničnim objektom `Response` (`new Response(body, { status })`), tako da koda dobi enak vmesnik kot v brskalniku. Po testu `mock.restoreAll()` povrne izvirnik.
- **Kaj preverjamo na mocku**: samo opazljivo pogodbo (URL, metoda, glava `Content-Type`, JSON telo, število klicev). Ne preverjamo notranjih podrobnosti, na primer v kakšnem vrstnem redu se kličejo pomožne funkcije.
- **Simulacija napak**: `mockImplementation(async () => { throw new TypeError("Failed to fetch") })` simulira omrežno napako, ki je brez mocka ne bi mogli zanesljivo sprožiti.
- **Zig**: `std.testing.allocator` deluje kot preverjajoči alokator (ob koncu testa javi puščanje). `checkAllAllocationFailures` po vrsti pusti spodleteti vsaki alokaciji in preveri, da funkcija vrne `error.OutOfMemory` in ne pušča pomnilnika.
- **Česa ne mockamo**: čistih funkcij (`dateHelpers`, `voteHelpers`, ICS) ne mockamo. Tak mock bi testiral sam sebe.

## 4. Poimenovanje testov

Oblika je **`enota: pogoj → pričakovan rezultat`**, v slovenščini. Teste iste enote združimo v `describe("<enota>")`.

```js
describe("normalizePgTimestamp", () => {
  test("negativen pas (-05) → odrezan, ura ostane nespremenjena", …);
});
```
```zig
test "formatIcsTimestamp: pozitiven pas (+02) → odšteje 2 uri" { … }
```

Pravila:
- en test preverja eno obnašanje. Parametrizirane primere generiramo z zanko, tako da ima vsak primer svoje ime in svoj rezultat.
- ime pove pričakovanje, da ob padcu testa brez branja kode vemo, kaj je narobe;
- testna datoteka leži poleg enote: `x.js` ↔ `x.test.js`. Zig testi so na koncu iste datoteke.

## 5. Zagon

```bash
# frontend
cd frontend/EventEase
npm test                      # samo testi
npm run test:coverage         # testi + pokritost (Node ≥ 22.8), lcov → coverage/lcov.info

# backend
cd backend/logic
zig build test --summary all

# namerno vnesene napake (iz korena repozitorija)
node scripts/mutation-test.mjs          # vse enote
node scripts/mutation-test.mjs ICS      # samo ena enota
```

## 6. Ali testi zaznajo napake? (namerno vnesene napake)

Skripta `scripts/mutation-test.mjs` v vsako enoto vnese po eno napako naenkrat (zamenja natanko en odsek kode), požene teste te enote in datoteko nato povrne. Mutacije, ki se ne prevedejo, šteje posebej, ker take mutacije ne dokazujejo ničesar. Če katera mutacija preživi, se skripta konča s kodo 1.

Rezultat (23 mutacij, 6 enot, vse ujete):

| Enota | Vnesena napaka | Rezultat |
|---|---|---|
| eventHelpers.js | prazen lokalni del vrne prazen niz | ujeta (2 testa padeta) |
| eventHelpers.js | napačno ime statusa (`if_needed`) | ujeta (2) |
| eventHelpers.js | žeton ni URL-kodiran | ujeta (1) |
| dateHelpers.js | stara logika `.split("+")` (ne odreže negativnega pasu) | ujeta (2) |
| dateHelpers.js | termini brez `start_time` niso izločeni | ujeta (1) |
| dateHelpers.js | ura odrezana na 4 znake | ujeta (2) |
| voteHelpers.js | dvojina »glasa« namesto »glasova« | ujeta (2) |
| voteHelpers.js | starejši status `if_needed` ni štet | ujeta (1) |
| voteHelpers.js | odstotek zaokrožen navzdol | ujeta (1) |
| voteHelpers.js | `mod100 === 2` → `count === 2` (napaka pri 102) | ujeta (1) |
| api/polls.js | HTTP napaka ni zaznana | ujeta (4) |
| api/polls.js | napačno ime polja pri finalizaciji | ujeta (1) |
| api/polls.js | žeton ni URL-kodiran | ujeta (1) |
| api/polls.js | napačna HTTP metoda | ujeta (1) |
| email_content.zig (ICS) | napačen predznak časovnega pasu | ujeta (1) |
| email_content.zig (ICS) | podpičje v naslovu ni ubežano | ujeta (1) |
| email_content.zig (ICS) | vsak februar ima 29 dni | ujeta (1) |
| email_content.zig (ICS) | konec pred začetkom ni zavrnjen | ujeta (1) |
| email_content.zig (ICS) | vrstica `DTEND` brez CR | ujeta (1) |
| email_content.zig (HTML/JSON) | `&` ni ubežan v HTML | ujeta (1) |
| email_content.zig (HTML/JSON) | nova vrstica ni `<br>` | ujeta (1) |
| email_content.zig (HTML/JSON) | narekovaj ni ubežan v JSON | ujeta (1) |
| email_content.zig (HTML/JSON) | kontrolni znaki niso ubežani v JSON | ujeta (1) |

**Primerjava s starimi testi:** iste tri mutacije v `eventHelpers.js` smo pognali tudi proti izvirni datoteki `eventHelpers.test.js`. Ta je ujela samo 1 od 3 napak. Prazen lokalni del in manjkajoče URL-kodiranje sta preživela.

## 7. Pomanjkljivi testi in popravki

| # | Test (izvirni) | Težava | Popravek |
|---|---|---|---|
| 1 | `buildSharePath returns invite route` | Pričakovana vrednost je prepisana iz implementacije (`` `/invite/${token}` ``). Test pokrije samo en srečen primer, zato bi spremembo poti ali manjkajoče kodiranje spregledal. | Testa za URL-kodiranje (`a/../admin?x=1`) in `TypeError` za prazen ali manjkajoč žeton. |
| 2 | `organizerNameFromEmail handles email without @` | Prepiše trenutno obnašanje (vrne vnos nespremenjen) brez vprašanja, ali je to prav. Za `"   "` je funkcija vračala `"   "`, zato je bilo v vabilu prikazano prazno ime organizatorja. | Test »samo presledki → 'Organizator'« in popravek funkcije (najprej `trim`). |
| 3 | `isValidVoteStatus accepts allowed values` | Ime pravi »accepts«, test pa preverja tudi zavrnitev. Štiri trditve so v enem testu, zato ob padcu ne vemo, katera je padla. Manjka ravno `if_needed`, interno ime v `InviteView`, ki ga backend ne sprejme. | Ločen test za vsak status, dodani `if_needed`, velike črke, presledki, `null`. |
| 4 | `organizerNameFromEmail handles missing email` | Pokrije `""` in `null`, ne pa `undefined` in ne-nizov. | Parametriziran test za 5 neveljavnih vhodov. |
| 5 | `uuid.zig`: `isValidUuidHex` | Preveri samo dolžino in hex znake, ne pa mest vezajev. `"550e8400e29b41d4a716446655440000----"` je veljal za veljaven UUID. Enako je veljalo za `hexToUuid`. | Testa za vezaje na napačnih mestih in popravek obeh funkcij. |
| 6 | `uuid.zig`: `uuidV4 format` | En sam fiksen seme. Če bi bila nastavitev bitov različice pravilna le slučajno, test tega ne bi opazil. | Test z več semeni, vključno z 0 in `maxInt`, ter robni bajti `0x00`/`0xFF`. |
| 7 | (manjkajoči testi) | Logika v komponentah (`VoteResults`, normalizacija datumov, klici API) ni imela nobenega testa, ker je bila nedostopna. | Logiko smo izločili v module in jo pokrili s testi (poglavje 1). |

Opomba: `uuid.zig` produkcijska koda ne uporablja (`routes.zig` ima svojo kopijo `uuidV4Hex`). Testi zato pokrivajo mrtvo kodo in dajejo lažen občutek varnosti. Predlog: `routes.zig` naj uporablja `uuid.zig`.

## 8. Resnične napake, ki so jih odkrili novi testi (popravljene)

| Napaka | Posledica | Popravek |
|---|---|---|
| `formatIcsTimestamp` je le pobrisal `-` in `:`. Backend mu podaja Postgresov zapis `"2024-06-15 14:00:00+00"`, iz katerega je nastal `"20240615 140000+00"`. | Neveljaven `DTSTART`/`DTEND` v priponki `.ics`, zato koledarji dogodka niso uvozili oziroma so ga uvozili ob napačni uri. Časovni pas je bil prezrt. | Pravi razčlenjevalnik s pretvorbo v UTC (`20240615T140000Z`). |
| ICS: medpomnilnik 32 B brez preverjanja dolžine | Daljši vhod je povzročil zapis izven tabele (panic v Debug, nedefinirano obnašanje v Release). | Fiksen izhod 16 B in zavrnitev neveljavnega vhoda. |
| ICS: naslov ni ubežan, vrstice so ločene z `\n` | Naslov z novo vrstico je lahko vrinil poljubno lastnost (npr. `ATTENDEE:`). RFC 5545 zahteva CRLF. | `escapeIcsText` in vrstice CRLF. UID je zdaj brez presledkov (zgoščena vrednost naslova). |
| `sendEmailWithIcs`: polja v JSON niso ubežana, ukaz gre skozi `sh -c '…'` | Telo z novimi vrsticami je neveljaven JSON (Resend ga pričakovano zavrne). Naslov z `'` je pokvaril ukaz lupine (možnost vrivanja ukazov). | `jsonEscape` za vsa polja, `curl` klican neposredno prek `argv` brez lupine. |
| `sendEmail`: zadeva (naslov dogodka) ni ubežana v JSON | Naslov z `"` je pokvaril JSON. | `jsonEscape`. Odstranjena tudi mrtva podvojena `buildHtmlEmail`. |
| `voteLabel(2)` je vrnil »glasa« | Napačna slovnica: »2 glasa« namesto »2 glasova«. | Popravljeno. Test je zapisan iz slovnice, ne iz kode. |
| Normalizacija datuma z `.split("+")` | Negativni pasovi (`-05`) niso bili odrezani. | `normalizePgTimestamp`, ki pazi tudi, da `-15` v `2024-06-15` ni pas. |
| `AdminFinalizeView` je klical `slot.start_time.replace(...)` brez preverjanja | Termin brez `start_time` je sesul stran. | `toSuggestedDates` takšne termine izloči. |

## 9. Cevovod CI (`.github/workflows/ci.yml`)

- **Frontend**: `npm ci` → `lint` → `npm run test:coverage` → `build`. Korak s testi teče z `shell: bash`, ki vklopi `pipefail`, zato neuspešen test (ali pokritost pod pragom 90 % vrstic, 85 % vej, 90 % funkcij) ustavi posel, preden se začne `build`.
- **Pokritost kot rezultat cevovoda**:
  - tabela pokritosti je izpisana v *Job Summary* zagona,
  - artefakt `coverage-frontend` vsebuje `lcov.info` (za uvoz v IDE ali Codecov) in celoten izpis testov. Oba koraka tečeta tudi ob padcu testov (`if: always()`), da je poročilo na voljo prav takrat, ko ga potrebujemo.
- **Backend**: `zig build` → `zig build test --summary all`. Padec katerega koli Zig testa ustavi posel.
- **Docker + smoke test** ima `needs: [frontend, backend]`, zato se ob padcu testov sploh ne zažene.

Trenutna pokritost frontend enot: **100 % vrstic, vej in funkcij** za `api/polls.js`, `dateHelpers.js`, `eventHelpers.js` in `voteHelpers.js`.

## 10. Omejitve in nadaljnje delo

- **Pokritost meri samo module, ki jih testi naložijo.** Komponente JSX niso testirane in niso vključene v poročilo. Za to bi potrebovali React Testing Library in jsdom.
- **Pokritost Zig kode ni merjena.** Zig nima vgrajenega orodja. Možnost je `kcov` v CI, ki pa z Zig 0.16 ni preizkušen.
- **Smoke test API** ostaja v ločenem poslu in je integracijski, ne test enot.
- **ICS**: manjka obvezna lastnost `DTSTAMP` (RFC 5545), dolge vrstice niso prelomljene pri 75 oktetih. Večina odjemalcev to tolerira.
- **`sendEmail`** piše v skupno datoteko `/tmp/resend_payload.json`, zato se lahko dve sočasni pošiljanji prepišeta. Pošiljanje e-pošte (`curl` prek `argv`) ni bilo preizkušeno proti pravemu Resend API, ker lokalno ni ključa.

## 11. Uporaba orodja Claude Code

Pri tej nalogi smo uporabili agenta **Claude Code** (Anthropic, model Claude Opus 5.5).

**Odločitve ekipe** (agent je pred začetkom postavil vprašanja, mi smo izbrali odgovore):
- obseg: frontend (datumi, glasovi, `eventHelpers`) in Zig (ICS, HTML e-pošta),
- ogrodje: ostanemo pri vgrajenem `node:test`,
- nadomestni objekti: mock za `fetch`,
- poimenovanje testov: `enota: pogoj → rezultat`,
- najdene resnične napake popravimo in pokrijemo s testom,
- vnesene napake prikažemo s skripto in poročilom.

**Kaj je naredil Claude Code:**
- pregledal obstoječe teste in kodo ter predlagal enote za testiranje,
- izločil logiko iz komponent in `routes.zig` v ločene module (`dateHelpers`, `voteHelpers`, `api/polls`, `email_content.zig`),
- napisal teste (92 frontend, 42 Zig) in popravke resničnih napak (poglavje 8),
- napisal skripto `scripts/mutation-test.mjs`, z njo vnesel 23 napak in preveril, da jih testi ujamejo (poglavje 6),
- poiskal pomanjkljive teste in jih popravil ali dopolnil (poglavje 7), vključno s primerjavo starih testov proti istim vnesenim napakam,
- dopolnil cevovod CI s pokritostjo in artefaktom (poglavje 9),
- pripravil osnutek tega dokumenta.

**Kako smo preverili delo agenta:**
- vse teste smo pognali lokalno (`npm test`, `npm run test:coverage` z Node 24, `zig build test`), prav tako `npm run lint`, `npm run build` in `zig build`,
- skripta z vnesenimi napakami je ob prvem zagonu napačno razvrstila 7 mutacij kot »napaka pri prevajanju« (iskala je niz `SyntaxError`, ki se pojavi tudi v imenih testov). Napako smo opazili, popravili zaznavanje in skripto pognali znova,
- pregledali smo spremembe v `routes.zig` (`git diff`), da `zig fmt` ni spremenil nepovezanih vrstic.

**Česa nismo preverili:**
- Docker smoke testa lokalno nismo mogli pognati (ni bilo dovoljenja za Docker),
- pošiljanja e-pošte prek Resend API nismo preizkusili (ni ključa),
- refaktoriranih komponent React nismo ročno preizkusili v brskalniku.
