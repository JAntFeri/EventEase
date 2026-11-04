// Izvajalnik funkcionalnih testov EventEase (TS-01 ustvarjanje, TS-02 glasovanje, TS-03 finalizacija).
// Postopki so opisani v docs/testiranje/Specifikacija_testov.md. Skripta za vsak korak zapiše
// pričakovan in dejanski rezultat, rezultata pa ne "popravlja" – neuspešen korak ostane neuspešen.
//
// Zagon (aplikacija mora teči, glej specifikacijo, poglavje Testno okolje):
//   NODE_PATH=<pot do node_modules s paketom playwright> \
//   BASE_URL=http://localhost:8080 \
//   TEST_DATABASE_URL=postgresql://admin:admin@127.0.0.1:5433/eventeasedb \
//   node tests/functional/funkcionalni-testi.mjs
//
// Izhod: docs/testiranje/dokazi/rezultati.json in posnetki zaslona TC-*.png.

import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const DB = process.env.TEST_DATABASE_URL ?? "postgresql://admin:admin@127.0.0.1:5433/eventeasedb";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "docs", "testiranje", "dokazi");
const RUN = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15); // npr. 20261104T101500
mkdirSync(OUT, { recursive: true });

// Termini v prihodnjem mesecu, da koledar ne zavrne preteklih dni.
const now = new Date();
const target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const YM = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
const MONTHS = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];

// ---------------------------------------------------------------------------
// Pomožne funkcije
// ---------------------------------------------------------------------------

function sql(query) {
  return execFileSync("psql", [DB, "-At", "-F", "|", "-c", query], { encoding: "utf8" }).trim();
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

async function api(method, path, body, raw) {
  const init = { method, headers: {} };
  if (raw !== undefined) {
    init.body = raw;
    init.headers["Content-Type"] = "application/json";
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }
  const r = await fetch(BASE + path, init);
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* telo ni JSON */ }
  return { status: r.status, text, json };
}

async function createPollApi(title, slots) {
  const r = await api("POST", "/api/polls", {
    title,
    description: "Testni podatki " + RUN,
    organizer_email: "organizator@primer.si",
    time_slots: slots,
  });
  if (r.status !== 201) throw new Error(`Predpogoj: ustvarjanje ankete vrnilo ${r.status}`);
  const poll = await api("GET", `/api/polls/share/${r.json.share_token}`);
  return { ...r.json, slots: poll.json.time_slots };
}

const slot = (day, hour) => ({
  start_time: `${YM}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00`,
  end_time: `${YM}-${String(day).padStart(2, "0")}T${String(hour + 1).padStart(2, "0")}:00:00`,
});

const results = [];
let current;

// En testni primer. Izjema v postopku (npr. element ni najden) primer označi kot BLOKIRAN,
// ostali primeri se izvedejo naprej.
async function tc(id, title, fn) {
  current = { id, title, steps: [], started: new Date().toISOString() };
  results.push(current);
  console.log(`\n${id} ${title}`);
  try {
    await fn();
  } catch (err) {
    check("Izvedba postopka", "postopek se izvede do konca", `PREKINJENO: ${err.message.split("\n")[0]}`, false);
    current.blocked = true;
  }
}

// Zapiše en korak: pričakovano / dejansko / ali se ujema.
function check(step, expected, actual, pass) {
  current.steps.push({ step, expected, actual, pass });
  console.log(`  [${pass ? "OK " : "NOK"}] ${step}\n        pričakovano: ${expected}\n        dejansko:    ${actual}`);
}

function note(text) {
  current.notes = [...(current.notes ?? []), text];
}

async function shot(page, name) {
  const file = `${name}.png`;
  await page.screenshot({ path: join(OUT, file), fullPage: true });
  current.evidence = [...(current.evidence ?? []), file];
}

// Spremlja POST zahteve strani, da lahko preverimo, ali je UI sploh poslal zahtevo.
function trackPosts(page) {
  page.setDefaultTimeout(8000);
  const posts = [];
  page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/api/")) posts.push({ url: r.url(), body: r.postData() }); });
  page.on("dialog", (d) => d.dismiss());
  return posts;
}

async function openCreateWizard(page) {
  await page.goto(BASE + "/");
  await page.getByRole("button", { name: "Ustvari dogodek" }).click();
  await page.getByRole("button", { name: "→" }).click(); // naslednji mesec
}

async function pickDay(page, day, time) {
  await page.getByRole("button", { name: String(day), exact: true }).click();
  if (time) await page.locator('input[type="time"]').fill(time);
  await page.getByRole("button", { name: "Potrdi" }).click();
}

const noticeText = (page) => page.locator("[class*='rounded']").filter({ hasText: /Prosimo|Vpišite/ }).last().innerText().catch(() => "(ni obvestila)");

// ---------------------------------------------------------------------------
// TS-01 Ustvarjanje ankete
// ---------------------------------------------------------------------------

async function ts01(browser, ctx) {
  // TC-01-01
  await tc("TC-01-01", "Uspešno ustvarjanje ankete z dvema terminoma (UI)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const posts = trackPosts(page);
    const title = `TS01 Sestanek ${RUN}`;
    await openCreateWizard(page);
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="organizer_email"]', "organizator@primer.si");
    await page.fill('textarea[name="description"]', "Mesečni sestanek ekipe");
    await pickDay(page, 10, "18:00");
    await pickDay(page, 15, "09:30");
    const respP = page.waitForResponse((r) => r.url().endsWith("/api/polls") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Ustvari in deli" }).click();
    const resp = await respP;
    check("POST /api/polls", "HTTP 201", `HTTP ${resp.status()}`, resp.status() === 201);
    await page.getByText("Dogodek je ustvarjen").waitFor({ timeout: 5000 }).catch(() => {});
    const links = await page.locator("input[readonly]").evaluateAll((els) => els.map((e) => e.value));
    const admin = links.find((l) => l.includes("/admin/")) ?? "";
    const invite = links.find((l) => l.includes("/invite/")) ?? "";
    const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    const okLinks = new RegExp(`/admin/${uuid}\\?invite=${uuid}$`).test(admin) && new RegExp(`/invite/${uuid}$`).test(invite);
    check("Prikaz povezav", "povezava za organizatorja /admin/<uuid>?invite=<uuid> in za udeležence /invite/<uuid>", `${admin} | ${invite}`, okLinks);
    const share = invite.split("/invite/")[1];
    const adminTok = admin.split("/admin/")[1]?.split("?")[0];
    check("Žetona sta različna", "admin_token ≠ share_token", `${adminTok} / ${share}`, !!share && adminTok !== share);
    await shot(page, "TC-01-01_povezave");
    const rows = sql(`SELECT p.title, p.description, p.organizer_email, p.is_finalized, t.start_time, t.end_time FROM polls p JOIN time_slots t ON t.poll_id = p.id WHERE p.share_token = ${q(share)} ORDER BY t.start_time`);
    const expectedRows = [
      `${title}|Mesečni sestanek ekipe|organizator@primer.si|f|${YM}-10 18:00:00+00|${YM}-10 19:00:00+00`,
      `${title}|Mesečni sestanek ekipe|organizator@primer.si|f|${YM}-15 09:30:00+00|${YM}-15 10:30:00+00`,
    ].join("\n");
    check("Zapis v bazi", "1 anketa (nezaključena), 2 termina: 10. ob 18:00–19:00 in 15. ob 09:30–10:30", rows.replace(/\n/g, " ⏎ "), rows === expectedRows);
    check("Število POST zahtev", "1", String(posts.length), posts.length === 1);
    ctx.ts01 = { share, admin: adminTok, title };
    await page.close();
  });

  // TC-01-02
  await tc("TC-01-02", "Zavrnitev ankete brez naslova (UI)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const posts = trackPosts(page);
    await openCreateWizard(page);
    await page.fill('input[name="organizer_email"]', "organizator@primer.si");
    await pickDay(page, 10);
    // Atribut required bi obrazec ustavil že v brskalniku; preverimo oba sloja.
    const required = await page.locator('input[name="title"]').evaluate((e) => e.required);
    await page.getByRole("button", { name: "Ustvari in deli" }).click();
    await page.waitForTimeout(500);
    const msg = await page.getByText("Prosimo, vnesite naslov dogodka.").count();
    const valid = await page.locator('input[name="title"]').evaluate((e) => e.validationMessage);
    check("Obvestilo uporabniku", "»Prosimo, vnesite naslov dogodka.« ali brskalnikovo opozorilo na polju", msg ? "prikazano obvestilo aplikacije" : (required ? `opozorilo brskalnika: ${valid}` : "ni obvestila"), msg > 0 || required);
    check("Zahteva ni poslana", "0 POST zahtev", `${posts.length} POST zahtev`, posts.length === 0);
    await shot(page, "TC-01-02_brez_naslova");
    await page.close();
  });

  // TC-01-03
  await tc("TC-01-03", "Zavrnitev ankete brez izbranega termina (UI)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const posts = trackPosts(page);
    await openCreateWizard(page);
    await page.fill('input[name="title"]', `TS01 brez termina ${RUN}`);
    await page.fill('input[name="organizer_email"]', "organizator@primer.si");
    await page.getByRole("button", { name: "Ustvari in deli" }).click();
    await page.waitForTimeout(500);
    const msg = await page.getByText("Prosimo, izberite vsaj en termin na koledarju.").count();
    check("Obvestilo uporabniku", "»Prosimo, izberite vsaj en termin na koledarju.«", msg ? "prikazano" : "ni prikazano", msg > 0);
    check("Zahteva ni poslana", "0 POST zahtev", `${posts.length} POST zahtev`, posts.length === 0);
    await shot(page, "TC-01-03_brez_termina");
    await page.close();
  });

  // TC-01-04
  await tc("TC-01-04", "Robna vrednost: termin, ki se začne ob 23:30 (UI)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    trackPosts(page);
    const title = `TS01 pozni termin ${RUN}`;
    await openCreateWizard(page);
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="organizer_email"]', "organizator@primer.si");
    await pickDay(page, 20, "23:30");
    const reqP = page.waitForRequest((r) => r.url().endsWith("/api/polls") && r.method() === "POST");
    await page.getByRole("button", { name: "Ustvari in deli" }).click();
    const req = await reqP;
    const sent = JSON.parse(req.postData()).time_slots[0];
    check("Poslani termin", "end_time je za start_time (konec 21. ob 00:30)", `start ${sent.start_time}, end ${sent.end_time}`, sent.end_time > sent.start_time);
    await page.waitForTimeout(500);
    const row = sql(`SELECT t.start_time, t.end_time, t.end_time > t.start_time FROM polls p JOIN time_slots t ON t.poll_id = p.id WHERE p.title = ${q(title)}`);
    check("Zapis v bazi", "konec termina je za začetkom (ali pa strežnik zahtevo zavrne)", row || "(ni zapisa)", row === "" || row.endsWith("|t"));
    await shot(page, "TC-01-04_pozni_termin");
    await page.close();
  });

  // TC-01-05
  await tc("TC-01-05", "Strežniška validacija neveljavnih vhodov pri ustvarjanju (API)", async () => {
    const before = Number(sql("SELECT count(*) FROM polls"));
    const cases = [
      ["prazen naslov", { title: "", organizer_email: "o@primer.si", time_slots: [slot(10, 10)] }],
      ["brez terminov", { title: `TS01 API brez terminov ${RUN}`, organizer_email: "o@primer.si", time_slots: [] }],
      ["konec pred začetkom", { title: `TS01 API obrnjen ${RUN}`, organizer_email: "o@primer.si", time_slots: [{ start_time: `${YM}-10T12:00:00`, end_time: `${YM}-10T11:00:00` }] }],
      ["manjka organizer_email", { title: `TS01 API brez e-pošte ${RUN}`, time_slots: [slot(10, 10)] }],
      ["neveljaven datum", { title: `TS01 API datum ${RUN}`, organizer_email: "o@primer.si", time_slots: [{ start_time: "jutri", end_time: "pojutrišnjem" }] }],
    ];
    for (const [name, body] of cases) {
      const r = await api("POST", "/api/polls", body);
      check(`Vhod: ${name}`, "HTTP 400 (zahteva zavrnjena)", `HTTP ${r.status}${r.json ? " " + JSON.stringify(r.json) : ""}`, r.status === 400);
    }
    const r = await api("POST", "/api/polls", undefined, "{ to ni json");
    check("Vhod: neveljaven JSON", "HTTP 400", `HTTP ${r.status}`, r.status === 400);
    const after = Number(sql("SELECT count(*) FROM polls"));
    check("V bazi ni novih anket", `${before} anket`, `${after} anket`, after === before);
    if (after !== before) {
      const leaked = sql(`SELECT title || ' (terminov: ' || (SELECT count(*) FROM time_slots t WHERE t.poll_id = p.id) || ')' FROM polls p WHERE created_at >= ${q(current.started)} AND (title LIKE ${q("TS01 API%" + RUN)} OR title = '')`);
      note("Shranjene neveljavne ankete: " + leaked.replace(/\n/g, "; "));
    }
  });
}

// ---------------------------------------------------------------------------
// TS-02 Glasovanje
// ---------------------------------------------------------------------------

async function ts02(browser, ctx) {
  const poll = await createPollApi(`TS02 Izlet ${RUN}`, [slot(10, 10), slot(12, 14), slot(17, 9)]);
  ctx.ts02 = poll;
  const [s1, s2, s3] = poll.slots;

  // TC-02-01
  await tc("TC-02-01", "Oddaja glasu »Da« in »Če bo potrebno« (UI)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const posts = trackPosts(page);
    await page.goto(`${BASE}/invite/${poll.share_token}`);
    await page.getByPlaceholder("Vpiši svoje ime...").fill("Ana Novak");
    await page.getByPlaceholder("ime@example.com").fill("ana@primer.si");
    await page.getByRole("button", { name: "→" }).click();
    await page.getByRole("button", { name: /^10/ }).click(); // ne → da
    await page.getByRole("button", { name: /^12/ }).click(); // ne → da
    await page.getByRole("button", { name: /^12/ }).click(); // da → če bo potrebno
    await shot(page, "TC-02-01_izbira");
    const respP = page.waitForResponse((r) => r.url().endsWith("/vote"));
    await page.getByRole("button", { name: "Potrdi udeležbo" }).click();
    const resp = await respP;
    check("POST /vote", "HTTP 201", `HTTP ${resp.status()}`, resp.status() === 201);
    const thanks = await page.getByText("Hvala, Ana Novak!").count();
    check("Potrditev uporabniku", "»Hvala, Ana Novak!«", thanks ? "prikazano" : "ni prikazano", thanks > 0);
    await shot(page, "TC-02-01_zahvala");
    const sent = JSON.parse(posts[0]?.body ?? "{}");
    check("Telo zahteve", "vsi 3 termini; statusi yes / if_need_be / no", JSON.stringify(sent.date_votes?.map((d) => d.status)), JSON.stringify(sent.date_votes?.map((d) => d.status)) === '["yes","if_need_be","no"]');
    const g = await api("GET", `/api/polls/share/${poll.share_token}`);
    const v = g.json.votes.find((x) => x.participant_name === "Ana Novak");
    const byId = Object.fromEntries((v?.date_votes ?? []).map((d) => [d.slot_id, d.status]));
    const got = `${byId[s1.id]}/${byId[s2.id]}/${byId[s3.id]}`;
    check("Shranjeni glas (GET share)", "yes/if_need_be/no, e-pošta ana@primer.si", `${got}, e-pošta ${v?.participant_email}`, got === "yes/if_need_be/no" && v?.participant_email === "ana@primer.si");
    // Rezultati v skrbniškem pogledu
    await page.goto(`${BASE}/admin/${poll.admin_token}?invite=${poll.share_token}`);
    await page.getByText("REZULTATI GLASOVANJA", { exact: false }).waitFor();
    const txt = await page.locator("main, body").first().innerText();
    const ok = txt.includes("Ustreza: Ana Novak") && txt.includes("Če bo potrebno: Ana Novak");
    check("Prikaz v skrbniškem pogledu", "»Ustreza: Ana Novak« pri 10., »Če bo potrebno: Ana Novak« pri 12.", ok ? "prikazano" : "ni prikazano", ok);
    await shot(page, "TC-02-01_skrbniski_pogled");
    await page.close();
  });

  // TC-02-02
  await tc("TC-02-02", "Zavrnitev glasu brez imena (UI)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const posts = trackPosts(page);
    await page.goto(`${BASE}/invite/${poll.share_token}`);
    await page.getByRole("button", { name: "→" }).click();
    await page.getByRole("button", { name: /^10/ }).click();
    const required = await page.getByPlaceholder("Vpiši svoje ime...").evaluate((e) => e.required);
    await page.getByRole("button", { name: "Potrdi udeležbo" }).click();
    await page.waitForTimeout(500);
    const msg = await page.getByText("Vpišite ime.").count();
    const valid = await page.getByPlaceholder("Vpiši svoje ime...").evaluate((e) => e.validationMessage);
    check("Obvestilo uporabniku", "»Vpišite ime.« ali brskalnikovo opozorilo na polju", msg ? "obvestilo aplikacije" : (required ? `opozorilo brskalnika: ${valid}` : "ni obvestila"), msg > 0 || required);
    check("Zahteva ni poslana", "0 POST zahtev", `${posts.length} POST zahtev`, posts.length === 0);
    await shot(page, "TC-02-02_brez_imena");
    await page.close();
  });

  // TC-02-03
  await tc("TC-02-03", "Sprememba glasu z istim imenom (API)", async () => {
    const r = await api("POST", `/api/polls/share/${poll.share_token}/vote`, {
      participant_name: "Ana Novak",
      participant_email: "ana.nova@primer.si",
      date_votes: [{ slot_id: s1.id, status: "no" }, { slot_id: s2.id, status: "yes" }, { slot_id: s3.id, status: "yes" }],
    });
    check("POST /vote (drugič)", "HTTP 201", `HTTP ${r.status}`, r.status === 201);
    const rows = sql(`SELECT count(*) FROM votes v JOIN polls p ON p.id = v.poll_id WHERE p.share_token = ${q(poll.share_token)} AND v.participant_name = 'Ana Novak'`);
    check("Ni podvojenega glasovalca", "1 zapis v votes", `${rows} zapis(ov)`, rows === "1");
    const g = await api("GET", `/api/polls/share/${poll.share_token}`);
    const v = g.json.votes.find((x) => x.participant_name === "Ana Novak");
    const byId = Object.fromEntries((v?.date_votes ?? []).map((d) => [d.slot_id, d.status]));
    const got = `${byId[s1.id]}/${byId[s2.id]}/${byId[s3.id]}`;
    check("Novi statusi in e-pošta", "no/yes/yes, ana.nova@primer.si", `${got}, ${v?.participant_email}`, got === "no/yes/yes" && v?.participant_email === "ana.nova@primer.si");
  });

  // TC-02-04
  await tc("TC-02-04", "Zavrnitev glasu za termin druge ankete (API)", async () => {
    const other = await createPollApi(`TS02 Druga anketa ${RUN}`, [slot(11, 10)]);
    const r = await api("POST", `/api/polls/share/${poll.share_token}/vote`, {
      participant_name: "Vsiljivec",
      date_votes: [{ slot_id: other.slots[0].id, status: "yes" }],
    });
    check("POST /vote s tujim terminom", "HTTP 400 »One or more time slots do not belong to this poll.«", `HTTP ${r.status} ${r.text}`, r.status === 400);
    const n = sql(`SELECT count(*) FROM votes WHERE participant_name = 'Vsiljivec'`);
    check("Glas ni shranjen", "0 zapisov", `${n} zapis(ov)`, n === "0");
  });

  // TC-02-05
  await tc("TC-02-05", "Zavrnitev neveljavnega statusa glasu (API)", async () => {
    const r = await api("POST", `/api/polls/share/${poll.share_token}/vote`, {
      participant_name: "Bojan",
      date_votes: [{ slot_id: s1.id, status: "maybe" }],
    });
    check("POST /vote s statusom »maybe«", "HTTP 400 (napaka odjemalca)", `HTTP ${r.status}`, r.status === 400);
    const n = sql(`SELECT count(*) FROM votes WHERE participant_name = 'Bojan'`);
    check("Glas ni shranjen (transakcija povrnjena)", "0 zapisov", `${n} zapis(ov)`, n === "0");
  });

  // TC-02-06
  await tc("TC-02-06", "Glasovanje z neobstoječim ali neveljavnim žetonom (API)", async () => {
    const body = { participant_name: "Cene", date_votes: [{ slot_id: s1.id, status: "yes" }] };
    const r1 = await api("POST", `/api/polls/share/00000000-0000-4000-8000-000000000000/vote`, body);
    check("Veljaven, a neobstoječ UUID", "HTTP 404", `HTTP ${r1.status} ${r1.text}`, r1.status === 404);
    const r2 = await api("POST", `/api/polls/share/ni-uuid/vote`, body);
    check("Žeton v napačni obliki", "HTTP 404 (ali 400)", `HTTP ${r2.status}`, r2.status === 404 || r2.status === 400);
    const r3 = await api("GET", `/api/polls/share/ni-uuid`);
    check("GET ankete z žetonom v napačni obliki", "HTTP 404 (ali 400)", `HTTP ${r3.status}`, r3.status === 404 || r3.status === 400);
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await page.goto(`${BASE}/invite/ni-uuid`);
    await page.waitForTimeout(800);
    await shot(page, "TC-02-06_neveljavna_povezava");
    const t = await page.locator("body").innerText();
    note("Prikaz v brskalniku za /invite/ni-uuid: " + t.replace(/\s+/g, " ").slice(0, 160));
    await page.close();
  });
}

// ---------------------------------------------------------------------------
// TS-03 Finalizacija
// ---------------------------------------------------------------------------

async function ts03(browser, ctx) {
  const poll = await createPollApi(`TS03 Zabava ${RUN}`, [slot(5, 19), slot(6, 19)]);
  const [s1, s2] = poll.slots;
  for (const [name, email, a, b] of [["Ana", "ana@primer.si", "yes", "no"], ["Bor", "", "yes", "if_need_be"], ["Cvetka", "cvetka@primer.si", "no", "yes"]]) {
    await api("POST", `/api/polls/share/${poll.share_token}/vote`, { participant_name: name, participant_email: email, date_votes: [{ slot_id: s1.id, status: a }, { slot_id: s2.id, status: b }] });
  }
  const adminUrl = `${BASE}/admin/${poll.admin_token}?invite=${poll.share_token}`;
  const dayLabel = (iso) => {
    const d = new Date(iso.replace(" ", "T").slice(0, 19));
    return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  // TC-03-02 (pred TC-03-01, ker zahteva nezaključeno anketo)
  await tc("TC-03-02", "Zavrnitev potrditve brez izbranega termina (UI)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const posts = trackPosts(page);
    await page.goto(adminUrl);
    await page.getByRole("button", { name: "Potrdi izbran termin in obvesti vse" }).click();
    await page.waitForTimeout(500);
    const msg = await page.getByText("Prosimo, izberite končni termin za zaklep dogodka.").count();
    check("Obvestilo uporabniku", "»Prosimo, izberite končni termin za zaklep dogodka.«", msg ? "prikazano" : "ni prikazano", msg > 0);
    check("Zahteva ni poslana", "0 POST zahtev", `${posts.length} POST zahtev`, posts.length === 0);
    await shot(page, "TC-03-02_brez_izbire");
    await page.close();
  });

  // TC-03-01
  await tc("TC-03-01", "Potrditev zmagovalnega termina (UI)", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    trackPosts(page);
    await page.goto(adminUrl);
    // Besedilo kartice ima pointer-events: none, klik prejme kartica (kot pri uporabniku).
    await page.locator("div.cursor-pointer").filter({ hasText: dayLabel(s1.start_time) }).click();
    await shot(page, "TC-03-01_izbira");
    const respP = page.waitForResponse((r) => r.url().endsWith("/finalize"));
    await page.getByRole("button", { name: "Potrdi izbran termin in obvesti vse" }).click();
    const resp = await respP;
    check("POST /finalize", "HTTP 200 {success:true}", `HTTP ${resp.status()} ${await resp.text()}`, resp.status() === 200);
    await page.waitForTimeout(800);
    await shot(page, "TC-03-01_potrjeno_admin");
    const row = sql(`SELECT is_finalized, final_slot_id::text FROM polls WHERE admin_token = ${q(poll.admin_token)}`);
    check("Stanje v bazi", `is_finalized = t, final_slot_id = ${s1.id}`, row, row === `t|${s1.id}`);
    const g = await api("GET", `/api/polls/share/${poll.share_token}`);
    check("GET share vrne zaključeno anketo", `is_finalized: true, final_slot_id: ${s1.id}`, `is_finalized: ${g.json.is_finalized}, final_slot_id: ${g.json.final_slot_id}`, g.json.is_finalized === true && g.json.final_slot_id === s1.id);
    const p2 = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await p2.goto(`${BASE}/invite/${poll.share_token}`);
    await p2.waitForTimeout(800);
    const t = await p2.locator("body").innerText();
    const voteBtn = await p2.getByRole("button", { name: "Potrdi udeležbo" }).count();
    check("Pogled udeleženca po zaključku", "prikazan potrjen termin, obrazca za glasovanje ni", `glasovalni gumb: ${voteBtn ? "prisoten" : "ni"}; besedilo: ${t.replace(/\s+/g, " ").slice(0, 120)}`, voteBtn === 0);
    await shot(p2, "TC-03-01_potrjeno_udelezenec");
    await p2.close();
    await page.close();
    note("Pošiljanje e-pošte je v testnem okolju izklopljeno (DISABLE_EMAILS=true); prejem e-pošte in .ics ni preverjen.");
  });

  // TC-03-03
  await tc("TC-03-03", "Ponovna finalizacija zaključene ankete (API)", async () => {
    const r = await api("POST", `/api/polls/admin/${poll.admin_token}/finalize`, { final_slot_id: s2.id });
    check("POST /finalize (drugič)", "HTTP 409 »Poll has already been finalized.«", `HTTP ${r.status} ${r.text}`, r.status === 409);
    const row = sql(`SELECT final_slot_id::text FROM polls WHERE admin_token = ${q(poll.admin_token)}`);
    check("Izbrani termin ostane nespremenjen", s1.id, row, row === s1.id);
  });

  // TC-03-04
  await tc("TC-03-04", "Glasovanje po zaključku ankete (API)", async () => {
    const before = sql(`SELECT count(*) FROM votes WHERE poll_id = (SELECT id FROM polls WHERE admin_token = ${q(poll.admin_token)})`);
    const r = await api("POST", `/api/polls/share/${poll.share_token}/vote`, { participant_name: "Zamudnik", date_votes: [{ slot_id: s2.id, status: "yes" }] });
    check("POST /vote na zaključeno anketo", "zavrnjeno (HTTP 409 ali 400)", `HTTP ${r.status} ${r.text}`, r.status === 409 || r.status === 400);
    const after = sql(`SELECT count(*) FROM votes WHERE poll_id = (SELECT id FROM polls WHERE admin_token = ${q(poll.admin_token)})`);
    check("Število glasov nespremenjeno", before, after, before === after);
  });

  // TC-03-05
  await tc("TC-03-05", "Finalizacija s terminom, ki ne pripada anketi (API)", async () => {
    const p = await createPollApi(`TS03 Tuj termin ${RUN}`, [slot(7, 10)]);
    const foreign = ctx.ts02.slots[0].id; // termin ankete iz TS-02
    const r = await api("POST", `/api/polls/admin/${p.admin_token}/finalize`, { final_slot_id: foreign });
    check("POST /finalize s tujim terminom", "HTTP 400, anketa ostane odprta", `HTTP ${r.status} ${r.text}`, r.status === 400);
    const row = sql(`SELECT is_finalized, coalesce(final_slot_id::text, '-') FROM polls WHERE admin_token = ${q(p.admin_token)}`);
    check("Stanje v bazi", "is_finalized = f, final_slot_id = -", row, row === "f|-");
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE}/invite/${p.share_token}`);
    await page.waitForTimeout(800);
    await shot(page, "TC-03-05_tuj_termin_udelezenec");
    note("Pogled udeleženca: " + (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));
    await page.close();
  });

  // TC-03-06
  await tc("TC-03-06", "Finalizacija z neobstoječim terminom (API)", async () => {
    const p = await createPollApi(`TS03 Neobstojec termin ${RUN}`, [slot(8, 10)]);
    const r = await api("POST", `/api/polls/admin/${p.admin_token}/finalize`, { final_slot_id: "00000000-0000-4000-8000-000000000000" });
    check("POST /finalize z neobstoječim terminom", "HTTP 400 »Final slot not found«", `HTTP ${r.status} ${r.text}`, r.status === 400);
    const row = sql(`SELECT is_finalized, coalesce(final_slot_id::text, '-') FROM polls WHERE admin_token = ${q(p.admin_token)}`);
    check("Anketa ostane odprta", "f|-", row, row === "f|-");
  });

  // TC-03-07
  await tc("TC-03-07", "Finalizacija z žetonom za udeležence namesto skrbniškega (API)", async () => {
    const p = await createPollApi(`TS03 Dostop ${RUN}`, [slot(9, 10)]);
    const r = await api("POST", `/api/polls/admin/${p.share_token}/finalize`, { final_slot_id: p.slots[0].id });
    check("POST /admin/<share_token>/finalize", "HTTP 404", `HTTP ${r.status} ${r.text}`, r.status === 404);
    const g = await api("GET", `/api/polls/admin/${p.share_token}`);
    check("GET /admin/<share_token>", "HTTP 404", `HTTP ${g.status}`, g.status === 404);
    const row = sql(`SELECT is_finalized FROM polls WHERE admin_token = ${q(p.admin_token)}`);
    check("Anketa ostane odprta", "f", row, row === "f");
  });
}

// ---------------------------------------------------------------------------

const browser = await chromium.launch();
const ctx = {};
const started = new Date().toISOString();
for (const ts of [ts01, ts02, ts03]) await ts(browser, ctx);
await browser.close();

for (const r of results) r.verdict = r.blocked ? "BLOKIRAN" : r.steps.every((s) => s.pass) ? "USPEŠEN" : "NEUSPEŠEN";
const env = {
  base_url: BASE,
  run_id: RUN,
  started,
  finished: new Date().toISOString(),
  git: execFileSync("git", ["-C", ROOT, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
  node: process.version,
  postgres: sql("SHOW server_version"),
};
writeFileSync(join(OUT, "rezultati.json"), JSON.stringify({ env, results }, null, 2));
console.log("\nPovzetek:");
for (const r of results) console.log(`  ${r.verdict.padEnd(10)} ${r.id} ${r.title}`);
process.exitCode = results.every((r) => r.verdict === "USPEŠEN") ? 0 : 1;
