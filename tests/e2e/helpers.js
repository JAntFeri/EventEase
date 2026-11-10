// Pomožne funkcije za funkcionalne teste (prenesene iz tests/functional/funkcionalni-testi.mjs).
import { execFileSync } from "node:child_process";
import { test } from "@playwright/test";

export const BASE = process.env.BASE_URL ?? "http://localhost:8080";
export const DB = process.env.TEST_DATABASE_URL ?? "postgresql://admin:admin@127.0.0.1:5433/eventeasedb";

// Oznaka zagona v naslovih anket, da so zagoni med seboj neodvisni (npr. 20261110T101500).
export const RUN = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);

// Termini v prihodnjem mesecu, ker koledar preteklih dni ne dovoli izbrati.
const now = new Date();
const target = new Date(now.getFullYear(), now.getMonth() + 1, 1);
export const YM = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
export const MONTHS = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];

export const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const NIL_UUID = "00000000-0000-4000-8000-000000000000";

// Poizvedba v testni bazi; vrne vrstice kot "stolpec|stolpec", ločene z \n.
export function sql(query) {
  return execFileSync("psql", [DB, "-At", "-F", "|", "-c", query], { encoding: "utf8" }).trim();
}
export const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

// Klic API mimo brskalnika. `raw` pošlje telo nespremenjeno (za neveljaven JSON).
export async function api(method, path, body, raw) {
  const init = { method, headers: {} };
  if (raw !== undefined || body !== undefined) {
    init.body = raw ?? JSON.stringify(body);
    init.headers["Content-Type"] = "application/json";
  }
  const r = await fetch(BASE + path, init);
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* telo ni JSON */ }
  return { status: r.status, text, json };
}

export const slot = (day, hour) => ({
  start_time: `${YM}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00`,
  end_time: `${YM}-${String(day).padStart(2, "0")}T${String(hour + 1).padStart(2, "0")}:00:00`,
});

// Predpogoj: anketa, ustvarjena prek API. Vrne žetone in termine (urejene po začetku).
export async function createPollApi(title, slots) {
  const r = await api("POST", "/api/polls", {
    title,
    description: "Testni podatki " + RUN,
    organizer_email: "organizator@primer.si",
    time_slots: slots,
  });
  if (r.status !== 201) throw new Error(`Predpogoj: ustvarjanje ankete vrnilo HTTP ${r.status}`);
  const poll = await api("GET", `/api/polls/share/${r.json.share_token}`);
  return { ...r.json, slots: poll.json.time_slots };
}

export async function voteApi(shareToken, name, email, votes) {
  const r = await api("POST", `/api/polls/share/${shareToken}/vote`, {
    participant_name: name,
    participant_email: email,
    date_votes: votes.map(([slot_id, status]) => ({ slot_id, status })),
  });
  if (r.status !== 201) throw new Error(`Predpogoj: glas ${name} vrnil HTTP ${r.status}`);
}

// Statusi glasovalca po terminih, npr. "yes/if_need_be/no".
export async function statusesOf(shareToken, name, slots) {
  const g = await api("GET", `/api/polls/share/${shareToken}`);
  const v = g.json.votes.find((x) => x.participant_name === name);
  const byId = Object.fromEntries((v?.date_votes ?? []).map((d) => [d.slot_id, d.status]));
  return { statuses: slots.map((s) => byId[s.id]).join("/"), email: v?.participant_email };
}

// Beleži POST zahteve strani na /api/, da preverimo, ali je UI sploh poslal zahtevo.
export function trackPosts(page) {
  const posts = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/api/")) posts.push({ url: r.url(), body: r.postData() });
  });
  page.on("dialog", (d) => d.dismiss());
  return posts;
}

export async function openCreateWizard(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Ustvari dogodek" }).click();
  await page.getByRole("button", { name: "→" }).click(); // naslednji mesec
}

export async function pickDay(page, day, time) {
  await page.getByRole("button", { name: String(day), exact: true }).click();
  if (time) await page.locator('input[type="time"]').fill(time);
  await page.getByRole("button", { name: "Potrdi" }).click();
}

export const dayLabel = (iso) => {
  const d = new Date(iso.replace(" ", "T").slice(0, 19));
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Posnetek zaslona kot priponka v poročilu (dokaz, kot pri ročni izvedbi).
export async function evidence(page, name) {
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}

// Znana napaka iz Poročila testiranja: test je pričakovano neuspešen. Ko bo napaka odpravljena,
// bo Playwright test označil kot »unexpected pass« in cevovod bo opozoril, da je oznako treba odstraniti.
export function knownBug(...incidents) {
  for (const inc of incidents) test.info().annotations.push({ type: "znana napaka", description: inc });
  test.fail(true, `Znana napaka: ${incidents.join(", ")} (docs/testiranje/Porocilo_testiranja.md)`);
}
