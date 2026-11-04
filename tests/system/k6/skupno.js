// Skupni uporabniški tok za sistemske teste EventEase (k6).
//
// Vsak navidezni uporabnik (VU) simulira eno skupino: najprej kot organizator ustvari anketo,
// nato v naslednjih iteracijah kot različni udeleženci glasuje (vsak udeleženec ima unikatno ime),
// po GLASOV_NA_ANKETO glasovih pa kot organizator anketo potrdi in začne novo. Tako ankete ostanejo
// realne velikosti (≈ 20 udeležencev), mešanica zahtevkov pa pokrije vse glavne končne točke.

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

export const BASE = __ENV.BASE_URL || "http://localhost:8080";
export const RUN_ID = __ENV.RUN_ID || `lokalno-${Date.now()}`;
export const GLASOV_NA_ANKETO = Number(__ENV.GLASOV_NA_ANKETO || 20);

// Števci za preverjanje celovitosti podatkov (primerjamo jih s stanjem v bazi po testu).
export const anketeUstvarjene = new Counter("ankete_ustvarjene");
export const glasoviPoskusi = new Counter("glasovi_poskusi");
export const glasoviPotrjeni = new Counter("glasovi_potrjeni");
export const predlogiPotrjeni = new Counter("predlogi_potrjeni");
export const potrditvePotrjene = new Counter("potrditve_potrjene");

const JSON_HDR = { "Content-Type": "application/json" };
const STATUSI = ["yes", "if_need_be", "no"];

// Stanje VU (spremenljivke na ravni modula so v k6 ločene za vsak VU).
let anketa = null; // { share, admin, slots: [id], glasov }

function pocakaj(min, max, razmislek) {
  if (razmislek) sleep(min + Math.random() * (max - min));
}

function termini(n) {
  // Termini čez 30–60 dni, da niso v preteklosti.
  const out = [];
  const zacetek = new Date(Date.now() + (30 + Math.floor(Math.random() * 30)) * 86400000);
  for (let i = 0; i < n; i++) {
    const d = new Date(zacetek.getTime() + i * 86400000);
    const dan = d.toISOString().slice(0, 10);
    out.push({ start_time: `${dan}T17:00:00`, end_time: `${dan}T18:00:00` });
  }
  return out;
}

function ustvariAnketo(razmislek) {
  // Organizator odpre domačo stran in izpolni čarovnika.
  const dom = http.get(`${BASE}/`, { tags: { name: "GET /", vrsta: "staticno" } });
  check(dom, { "domača stran 200": (r) => r.status === 200 });
  pocakaj(5, 15, razmislek);

  const res = http.post(
    `${BASE}/api/polls`,
    JSON.stringify({
      title: `k6-${RUN_ID}-vu${__VU}-it${__ITER}`,
      description: "Sistemski test (k6)",
      organizer_email: "",
      time_slots: termini(3 + Math.floor(Math.random() * 3)),
    }),
    { headers: JSON_HDR, tags: { name: "POST /api/polls", vrsta: "api" } },
  );
  const ok = check(res, {
    "ustvarjanje 201": (r) => r.status === 201,
    "ustvarjanje vrne žetone": (r) => r.status === 201 && !!r.json("share_token") && !!r.json("admin_token"),
  });
  if (!ok) return null;
  anketeUstvarjene.add(1);
  const share = res.json("share_token");
  const admin = res.json("admin_token");

  // Organizator pogleda skrbniški pogled (od tod dobimo tudi ID-je terminov).
  const adm = http.get(`${BASE}/api/polls/admin/${admin}`, {
    tags: { name: "GET /api/polls/admin/:token", vrsta: "api" },
  });
  const okAdm = check(adm, { "skrbniški pogled 200": (r) => r.status === 200 });
  if (!okAdm) return null;
  const slots = adm.json("time_slots").map((s) => s.id);
  return { share, admin, slots, glasov: 0 };
}

function glasuj(a, razmislek) {
  // Udeleženec odpre povezavo (SPA + podatki ankete).
  const stran = http.get(`${BASE}/invite/${a.share}`, { tags: { name: "GET /invite/:token", vrsta: "staticno" } });
  check(stran, { "stran povabila 200": (r) => r.status === 200 });
  const poll = http.get(`${BASE}/api/polls/share/${a.share}`, {
    tags: { name: "GET /api/polls/share/:token", vrsta: "api" },
  });
  check(poll, { "branje ankete 200": (r) => r.status === 200 });
  pocakaj(5, 20, razmislek); // izpolnjevanje obrazca

  const ime = `udelezenec-${RUN_ID}-vu${__VU}-it${__ITER}`;
  glasoviPoskusi.add(1);
  const vote = http.post(
    `${BASE}/api/polls/share/${a.share}/vote`,
    JSON.stringify({
      participant_name: ime,
      participant_email: "",
      date_votes: a.slots.map((id) => ({ slot_id: id, status: STATUSI[Math.floor(Math.random() * 3)] })),
    }),
    { headers: JSON_HDR, tags: { name: "POST /api/polls/share/:token/vote", vrsta: "api" } },
  );
  const ok = check(vote, {
    "glas 201": (r) => r.status === 201,
    "glas success": (r) => r.status === 201 && r.json("success") === true,
  });
  if (ok) glasoviPotrjeni.add(1);
  a.glasov++;

  // ~10 % udeležencev predlaga dodaten termin.
  if (Math.random() < 0.1) {
    pocakaj(2, 6, razmislek);
    const d = new Date(Date.now() + 70 * 86400000).toISOString().slice(0, 10);
    const sug = http.post(
      `${BASE}/api/polls/share/${a.share}/suggest`,
      JSON.stringify({ suggested_by: ime, dates: [`${d}T19:00:00`] }),
      { headers: JSON_HDR, tags: { name: "POST /api/polls/share/:token/suggest", vrsta: "api" } },
    );
    if (check(sug, { "predlog 201": (r) => r.status === 201 })) predlogiPotrjeni.add(1);
  }
  pocakaj(1, 3, razmislek);
}

function potrdi(a, razmislek) {
  const adm = http.get(`${BASE}/api/polls/admin/${a.admin}`, {
    tags: { name: "GET /api/polls/admin/:token", vrsta: "api" },
  });
  check(adm, { "skrbniški pogled 200": (r) => r.status === 200 });
  pocakaj(3, 10, razmislek);
  const fin = http.post(
    `${BASE}/api/polls/admin/${a.admin}/finalize`,
    JSON.stringify({ final_slot_id: a.slots[0] }),
    { headers: JSON_HDR, tags: { name: "POST /api/polls/admin/:token/finalize", vrsta: "api" } },
  );
  if (check(fin, { "potrditev 200": (r) => r.status === 200 })) potrditvePotrjene.add(1);
}

// Ena iteracija = ena akcija enega uporabnika v skupini.
export function iteracija(razmislek) {
  if (anketa === null) {
    anketa = ustvariAnketo(razmislek);
    if (anketa === null) pocakaj(1, 2, true); // ob napaki ne vrtimo zanke v prazno
    return;
  }
  if (anketa.glasov >= GLASOV_NA_ANKETO) {
    potrdi(anketa, razmislek);
    anketa = null;
    return;
  }
  glasuj(anketa, razmislek);
}
