// TS-02 Glasovanje (Specifikacija_testov.md, poglavje 6 in TP-02).
// Vsak primer si predpogoje (anketo, predhodni glas) pripravi sam prek API, zato so primeri neodvisni
// in neuspeh enega ne vpliva na ostale.
import { test, expect } from "@playwright/test";
import { RUN, NIL_UUID, sql, q, api, slot, createPollApi, voteApi, statusesOf, trackPosts, evidence, knownBug } from "../helpers.js";

const threeSlots = () => [slot(10, 10), slot(12, 14), slot(17, 9)];

test.describe("TS-02 Glasovanje", () => {
  test("TC-02-01 Oddaja glasu »Da« in »Če bo potrebno« (UI)", async ({ page }) => {
    const poll = await createPollApi(`TS02 Izlet ${RUN}`, threeSlots());
    const posts = trackPosts(page);

    await page.goto(`/invite/${poll.share_token}`);
    await page.getByPlaceholder("Vpiši svoje ime...").fill("Ana Novak");
    await page.getByPlaceholder("ime@example.com").fill("ana@primer.si");
    await page.getByRole("button", { name: "→" }).click();
    await page.getByRole("button", { name: /^10/ }).click(); // ne → da
    await page.getByRole("button", { name: /^12/ }).click(); // ne → da
    await page.getByRole("button", { name: /^12/ }).click(); // da → če bo potrebno
    await evidence(page, "TC-02-01_izbira");

    const respP = page.waitForResponse((r) => r.url().endsWith("/vote"));
    await page.getByRole("button", { name: "Potrdi udeležbo" }).click();
    const resp = await respP;

    await test.step("POST /vote vrne HTTP 201", () => {
      expect.soft(resp.status()).toBe(201);
    });
    await test.step("Prikazano »Hvala, Ana Novak!«", async () => {
      await expect.soft(page.getByText("Hvala, Ana Novak!")).toBeVisible();
    });
    await evidence(page, "TC-02-01_zahvala");

    await test.step("Telo zahteve: statusi yes / if_need_be / no", () => {
      const sent = JSON.parse(posts[0]?.body ?? "{}");
      expect.soft(sent.date_votes?.map((d) => d.status)).toEqual(["yes", "if_need_be", "no"]);
    });
    await test.step("GET vrne iste statuse in e-pošto ana@primer.si", async () => {
      const got = await statusesOf(poll.share_token, "Ana Novak", poll.slots);
      expect.soft(got).toEqual({ statuses: "yes/if_need_be/no", email: "ana@primer.si" });
    });
    await test.step("Skrbniški pogled: »Ustreza: Ana Novak« in »Če bo potrebno: Ana Novak«", async () => {
      await page.goto(`/admin/${poll.admin_token}?invite=${poll.share_token}`);
      await page.getByText("REZULTATI GLASOVANJA", { exact: false }).waitFor();
      const txt = await page.locator("body").innerText();
      expect.soft(txt).toContain("Ustreza: Ana Novak");
      expect.soft(txt).toContain("Če bo potrebno: Ana Novak");
      await evidence(page, "TC-02-01_skrbniski_pogled");
    });
  });

  test("TC-02-02 Zavrnitev glasu brez imena (UI)", async ({ page }) => {
    const poll = await createPollApi(`TS02 Brez imena ${RUN}`, threeSlots());
    const posts = trackPosts(page);
    await page.goto(`/invite/${poll.share_token}`);
    await page.getByRole("button", { name: "→" }).click();
    await page.getByRole("button", { name: /^10/ }).click();
    const nameInput = page.getByPlaceholder("Vpiši svoje ime...");
    const required = await nameInput.evaluate((e) => e.required);
    await page.getByRole("button", { name: "Potrdi udeležbo" }).click();
    await page.waitForTimeout(500);

    await test.step("Obvestilo »Vpišite ime.« ali opozorilo brskalnika", async () => {
      const msg = await page.getByText("Vpišite ime.").count();
      expect.soft(msg > 0 || required, "obvestilo aplikacije ali atribut required").toBe(true);
    });
    await test.step("Zahteva ni poslana (0 POST)", () => {
      expect.soft(posts).toHaveLength(0);
    });
    await evidence(page, "TC-02-02_brez_imena");
  });

  test("TC-02-03 Sprememba glasu z istim imenom (API)", async () => {
    const poll = await createPollApi(`TS02 Sprememba ${RUN}`, threeSlots());
    const [s1, s2, s3] = poll.slots;
    // Predpogoj: glas iz TC-02-01.
    await voteApi(poll.share_token, "Ana Novak", "ana@primer.si", [[s1.id, "yes"], [s2.id, "if_need_be"], [s3.id, "no"]]);

    await test.step("POST /vote (drugič) vrne HTTP 201", async () => {
      const r = await api("POST", `/api/polls/share/${poll.share_token}/vote`, {
        participant_name: "Ana Novak",
        participant_email: "ana.nova@primer.si",
        date_votes: [{ slot_id: s1.id, status: "no" }, { slot_id: s2.id, status: "yes" }, { slot_id: s3.id, status: "yes" }],
      });
      expect.soft(r.status, r.text).toBe(201);
    });
    await test.step("V bazi 1 zapis za Ana Novak", () => {
      const n = sql(`SELECT count(*) FROM votes v JOIN polls p ON p.id = v.poll_id WHERE p.share_token = ${q(poll.share_token)} AND v.participant_name = 'Ana Novak'`);
      expect.soft(n).toBe("1");
    });
    await test.step("Novi statusi no/yes/yes in e-pošta ana.nova@primer.si", async () => {
      const got = await statusesOf(poll.share_token, "Ana Novak", poll.slots);
      expect.soft(got).toEqual({ statuses: "no/yes/yes", email: "ana.nova@primer.si" });
    });
  });

  test("TC-02-04 Zavrnitev glasu za termin druge ankete (API)", async () => {
    const poll = await createPollApi(`TS02 Izlet tuj ${RUN}`, threeSlots());
    const other = await createPollApi(`TS02 Druga anketa ${RUN}`, [slot(11, 10)]);
    const name = `Vsiljivec ${RUN}`;

    await test.step("POST /vote s tujim terminom vrne HTTP 400", async () => {
      const r = await api("POST", `/api/polls/share/${poll.share_token}/vote`, {
        participant_name: name,
        date_votes: [{ slot_id: other.slots[0].id, status: "yes" }],
      });
      expect.soft(r.status, r.text).toBe(400);
      expect.soft(r.text).toContain("One or more time slots do not belong to this poll.");
    });
    await test.step("Glas ni shranjen", () => {
      expect.soft(sql(`SELECT count(*) FROM votes WHERE participant_name = ${q(name)}`)).toBe("0");
    });
  });

  test("TC-02-05 Zavrnitev neveljavnega statusa glasu (API)", async () => {
    knownBug("INC-03");
    const poll = await createPollApi(`TS02 Status ${RUN}`, threeSlots());
    const name = `Bojan ${RUN}`;

    await test.step("POST /vote s statusom »maybe« vrne HTTP 400", async () => {
      const r = await api("POST", `/api/polls/share/${poll.share_token}/vote`, {
        participant_name: name,
        date_votes: [{ slot_id: poll.slots[0].id, status: "maybe" }],
      });
      expect.soft(r.status, r.text).toBe(400);
    });
    await test.step("Glas ni shranjen", () => {
      expect.soft(sql(`SELECT count(*) FROM votes WHERE participant_name = ${q(name)}`)).toBe("0");
    });
  });

  test("TC-02-06 Glasovanje z neobstoječim ali neveljavnim žetonom (API)", async ({ page }) => {
    knownBug("INC-03");
    const poll = await createPollApi(`TS02 Zeton ${RUN}`, threeSlots());
    const body = { participant_name: "Cene", date_votes: [{ slot_id: poll.slots[0].id, status: "yes" }] };

    await test.step("(a) veljaven, a neobstoječ UUID → HTTP 404", async () => {
      const r = await api("POST", `/api/polls/share/${NIL_UUID}/vote`, body);
      expect.soft(r.status, r.text).toBe(404);
    });
    await test.step("(b) žeton v napačni obliki, POST → HTTP 404 ali 400", async () => {
      const r = await api("POST", `/api/polls/share/ni-uuid/vote`, body);
      expect.soft([400, 404]).toContain(r.status);
    });
    await test.step("(c) žeton v napačni obliki, GET → HTTP 404 ali 400", async () => {
      const r = await api("GET", `/api/polls/share/ni-uuid`);
      expect.soft([400, 404]).toContain(r.status);
    });
    await test.step("(d) brskalnik /invite/ni-uuid prikaže obvestilo", async () => {
      await page.goto("/invite/ni-uuid");
      await page.waitForTimeout(800);
      await evidence(page, "TC-02-06_neveljavna_povezava");
    });
  });
});
