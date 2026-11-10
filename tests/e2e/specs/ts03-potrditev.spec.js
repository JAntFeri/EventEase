// TS-03 Potrditev termina (Specifikacija_testov.md, poglavje 6 in TP-03).
// Vsak primer si predpogoje pripravi sam prek API (anketa z glasovi, po potrebi že zaključena).
import { test, expect } from "@playwright/test";
import { BASE, RUN, NIL_UUID, sql, q, api, slot, createPollApi, voteApi, trackPosts, dayLabel, evidence, knownBug } from "../helpers.js";

// Predpogoj TS-03: anketa s terminoma 5. in 6. ob 19:00 in tremi glasovi.
async function partyPoll(label) {
  const poll = await createPollApi(`TS03 Zabava ${label} ${RUN}`, [slot(5, 19), slot(6, 19)]);
  const [s1, s2] = poll.slots;
  await voteApi(poll.share_token, "Ana", "ana@primer.si", [[s1.id, "yes"], [s2.id, "no"]]);
  await voteApi(poll.share_token, "Bor", "", [[s1.id, "yes"], [s2.id, "if_need_be"]]);
  await voteApi(poll.share_token, "Cvetka", "cvetka@primer.si", [[s1.id, "no"], [s2.id, "yes"]]);
  return poll;
}

async function finalizedPartyPoll(label) {
  const poll = await partyPoll(label);
  const r = await api("POST", `/api/polls/admin/${poll.admin_token}/finalize`, { final_slot_id: poll.slots[0].id });
  if (r.status !== 200) throw new Error(`Predpogoj: finalizacija vrnila HTTP ${r.status}`);
  return poll;
}

const pollState = (adminToken) =>
  sql(`SELECT is_finalized, coalesce(final_slot_id::text, '-') FROM polls WHERE admin_token = ${q(adminToken)}`);

test.describe("TS-03 Potrditev termina", () => {
  test("TC-03-01 Potrditev zmagovalnega termina (UI)", async ({ page, browser }) => {
    const poll = await partyPoll("UI");
    const [s1] = poll.slots;
    trackPosts(page);
    await page.goto(`/admin/${poll.admin_token}?invite=${poll.share_token}`);
    // Besedilo kartice ima pointer-events: none, klik prejme kartica (kot pri uporabniku).
    await page.locator("div.cursor-pointer").filter({ hasText: dayLabel(s1.start_time) }).click();
    await evidence(page, "TC-03-01_izbira");

    const respP = page.waitForResponse((r) => r.url().endsWith("/finalize"));
    await page.getByRole("button", { name: "Potrdi izbran termin in obvesti vse" }).click();
    const resp = await respP;

    await test.step("POST /finalize vrne HTTP 200 {success:true}", async () => {
      expect.soft(resp.status()).toBe(200);
      expect.soft(await resp.json()).toEqual({ success: true });
    });
    await page.waitForTimeout(800);
    await evidence(page, "TC-03-01_potrjeno_admin");

    await test.step("V bazi is_finalized = t, final_slot_id = termin 5.", () => {
      expect.soft(pollState(poll.admin_token)).toBe(`t|${s1.id}`);
    });
    await test.step("GET za udeležence vrne zaključeno anketo s terminom 5.", async () => {
      const g = await api("GET", `/api/polls/share/${poll.share_token}`);
      expect.soft({ is_finalized: g.json.is_finalized, final_slot_id: g.json.final_slot_id }).toEqual({ is_finalized: true, final_slot_id: s1.id });
    });
    await test.step("Pogled udeleženca nima gumba »Potrdi udeležbo«", async () => {
      const p2 = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
      await p2.goto(`${BASE}/invite/${poll.share_token}`);
      await p2.waitForTimeout(800);
      await expect.soft(p2.getByRole("button", { name: "Potrdi udeležbo" })).toHaveCount(0);
      await evidence(p2, "TC-03-01_potrjeno_udelezenec");
      await p2.close();
    });
    test.info().annotations.push({ type: "opomba", description: "DISABLE_EMAILS=true: prejem e-pošte in .ics (FZ-19) ni preverjen." });
  });

  test("TC-03-02 Zavrnitev potrditve brez izbranega termina (UI)", async ({ page }) => {
    const poll = await partyPoll("brez izbire");
    const posts = trackPosts(page);
    await page.goto(`/admin/${poll.admin_token}?invite=${poll.share_token}`);
    await page.getByRole("button", { name: "Potrdi izbran termin in obvesti vse" }).click();

    await test.step("Obvestilo »Prosimo, izberite končni termin za zaklep dogodka.«", async () => {
      await expect.soft(page.getByText("Prosimo, izberite končni termin za zaklep dogodka.")).toBeVisible();
    });
    await test.step("Zahteva ni poslana (0 POST)", () => {
      expect.soft(posts).toHaveLength(0);
    });
    await evidence(page, "TC-03-02_brez_izbire");
  });

  test("TC-03-03 Ponovna finalizacija zaključene ankete (API)", async () => {
    const poll = await finalizedPartyPoll("ponovna");
    const [s1, s2] = poll.slots;

    await test.step("POST /finalize (drugič, termin 6.) vrne HTTP 409", async () => {
      const r = await api("POST", `/api/polls/admin/${poll.admin_token}/finalize`, { final_slot_id: s2.id });
      expect.soft(r.status, r.text).toBe(409);
    });
    await test.step("final_slot_id ostane termin 5.", () => {
      expect.soft(pollState(poll.admin_token)).toBe(`t|${s1.id}`);
    });
  });

  test("TC-03-04 Glasovanje po zaključku ankete (API)", async () => {
    knownBug("INC-05");
    const poll = await finalizedPartyPoll("zamudnik");
    const countVotes = () => sql(`SELECT count(*) FROM votes WHERE poll_id = (SELECT id FROM polls WHERE admin_token = ${q(poll.admin_token)})`);

    await test.step("POST /vote na zaključeno anketo je zavrnjen (409 ali 400)", async () => {
      const r = await api("POST", `/api/polls/share/${poll.share_token}/vote`, { participant_name: "Zamudnik", date_votes: [{ slot_id: poll.slots[1].id, status: "yes" }] });
      expect.soft([400, 409]).toContain(r.status);
    });
    await test.step("Število glasov ostane 3", () => {
      expect.soft(countVotes()).toBe("3");
    });
  });

  test("TC-03-05 Finalizacija s terminom, ki ne pripada anketi (API)", async ({ page }) => {
    knownBug("INC-06");
    const foreignPoll = await createPollApi(`TS02 Izlet za TS03 ${RUN}`, [slot(10, 10)]);
    const p = await createPollApi(`TS03 Tuj termin ${RUN}`, [slot(7, 10)]);

    await test.step("POST /finalize s terminom druge ankete vrne HTTP 400", async () => {
      const r = await api("POST", `/api/polls/admin/${p.admin_token}/finalize`, { final_slot_id: foreignPoll.slots[0].id });
      expect.soft(r.status, r.text).toBe(400);
    });
    await test.step("Anketa ostane odprta (is_finalized = f, final_slot_id prazen)", () => {
      expect.soft(pollState(p.admin_token)).toBe("f|-");
    });
    await page.goto(`/invite/${p.share_token}`);
    await page.waitForTimeout(800);
    await evidence(page, "TC-03-05_tuj_termin_udelezenec");
  });

  test("TC-03-06 Finalizacija z neobstoječim terminom (API)", async () => {
    knownBug("INC-03");
    const p = await createPollApi(`TS03 Neobstojec termin ${RUN}`, [slot(8, 10)]);

    await test.step("POST /finalize z neobstoječim terminom vrne HTTP 400", async () => {
      const r = await api("POST", `/api/polls/admin/${p.admin_token}/finalize`, { final_slot_id: NIL_UUID });
      expect.soft(r.status, r.text).toBe(400);
    });
    await test.step("Anketa ostane odprta", () => {
      expect.soft(pollState(p.admin_token)).toBe("f|-");
    });
  });

  test("TC-03-07 Žeton za udeležence na skrbniški poti (API)", async () => {
    const p = await createPollApi(`TS03 Dostop ${RUN}`, [slot(9, 10)]);

    await test.step("POST /admin/<share_token>/finalize vrne HTTP 404", async () => {
      const r = await api("POST", `/api/polls/admin/${p.share_token}/finalize`, { final_slot_id: p.slots[0].id });
      expect.soft(r.status, r.text).toBe(404);
    });
    await test.step("GET /admin/<share_token> vrne HTTP 404", async () => {
      const g = await api("GET", `/api/polls/admin/${p.share_token}`);
      expect.soft(g.status).toBe(404);
    });
    await test.step("Anketa ostane odprta", () => {
      expect.soft(pollState(p.admin_token)).toBe("f|-");
    });
  });
});
