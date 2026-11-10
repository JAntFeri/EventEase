// TS-01 Ustvarjanje ankete (Specifikacija_testov.md, poglavje 6 in TP-01).
import { test, expect } from "@playwright/test";
import { RUN, YM, UUID, sql, q, api, slot, trackPosts, openCreateWizard, pickDay, evidence, knownBug } from "../helpers.js";

test.describe("TS-01 Ustvarjanje ankete", () => {
  test("TC-01-01 Uspešno ustvarjanje ankete z dvema terminoma (UI)", async ({ page }) => {
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

    await test.step("POST /api/polls vrne HTTP 201", () => {
      expect.soft(resp.status()).toBe(201);
    });

    await page.getByText("Dogodek je ustvarjen").waitFor();
    const links = await page.locator("input[readonly]").evaluateAll((els) => els.map((e) => e.value));
    const admin = links.find((l) => l.includes("/admin/")) ?? "";
    const invite = links.find((l) => l.includes("/invite/")) ?? "";
    const share = invite.split("/invite/")[1];
    const adminTok = admin.split("/admin/")[1]?.split("?")[0];
    await evidence(page, "TC-01-01_povezave");

    await test.step("Prikazani povezavi /admin/<uuid>?invite=<uuid> in /invite/<uuid>", () => {
      expect.soft(admin).toMatch(new RegExp(`/admin/${UUID}\\?invite=${UUID}$`));
      expect.soft(invite).toMatch(new RegExp(`/invite/${UUID}$`));
    });

    await test.step("Žetona sta različna (admin_token ≠ share_token)", () => {
      expect.soft(share).toBeTruthy();
      expect.soft(adminTok).not.toBe(share);
    });

    await test.step("V bazi 1 nezaključena anketa z 2 terminoma (18:00–19:00, 09:30–10:30)", () => {
      const rows = sql(`SELECT p.title, p.description, p.organizer_email, p.is_finalized, t.start_time, t.end_time FROM polls p JOIN time_slots t ON t.poll_id = p.id WHERE p.share_token = ${q(share)} ORDER BY t.start_time`);
      expect.soft(rows.split("\n")).toEqual([
        `${title}|Mesečni sestanek ekipe|organizator@primer.si|f|${YM}-10 18:00:00+00|${YM}-10 19:00:00+00`,
        `${title}|Mesečni sestanek ekipe|organizator@primer.si|f|${YM}-15 09:30:00+00|${YM}-15 10:30:00+00`,
      ]);
    });

    await test.step("Poslana natanko 1 zahteva POST", () => {
      expect.soft(posts).toHaveLength(1);
    });
  });

  test("TC-01-02 Zavrnitev ankete brez naslova (UI)", async ({ page }) => {
    const posts = trackPosts(page);
    await openCreateWizard(page);
    await page.fill('input[name="organizer_email"]', "organizator@primer.si");
    await pickDay(page, 10);
    const required = await page.locator('input[name="title"]').evaluate((e) => e.required);
    await page.getByRole("button", { name: "Ustvari in deli" }).click();
    await page.waitForTimeout(500);

    await test.step("Obvestilo »Prosimo, vnesite naslov dogodka.« ali opozorilo brskalnika", async () => {
      const msg = await page.getByText("Prosimo, vnesite naslov dogodka.").count();
      expect.soft(msg > 0 || required, "obvestilo aplikacije ali atribut required").toBe(true);
    });
    await test.step("Zahteva ni poslana (0 POST)", () => {
      expect.soft(posts).toHaveLength(0);
    });
    await evidence(page, "TC-01-02_brez_naslova");
  });

  test("TC-01-03 Zavrnitev ankete brez izbranega termina (UI)", async ({ page }) => {
    const posts = trackPosts(page);
    await openCreateWizard(page);
    await page.fill('input[name="title"]', `TS01 brez termina ${RUN}`);
    await page.fill('input[name="organizer_email"]', "organizator@primer.si");
    await page.getByRole("button", { name: "Ustvari in deli" }).click();

    await test.step("Obvestilo »Prosimo, izberite vsaj en termin na koledarju.«", async () => {
      await expect.soft(page.getByText("Prosimo, izberite vsaj en termin na koledarju.")).toBeVisible();
    });
    await test.step("Zahteva ni poslana (0 POST)", () => {
      expect.soft(posts).toHaveLength(0);
    });
    await evidence(page, "TC-01-03_brez_termina");
  });

  test("TC-01-04 Robna vrednost: termin, ki se začne ob 23:30 (UI)", async ({ page }) => {
    knownBug("INC-01");
    trackPosts(page);
    const title = `TS01 pozni termin ${RUN}`;
    await openCreateWizard(page);
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="organizer_email"]', "organizator@primer.si");
    await pickDay(page, 20, "23:30");

    const reqP = page.waitForRequest((r) => r.url().endsWith("/api/polls") && r.method() === "POST");
    await page.getByRole("button", { name: "Ustvari in deli" }).click();
    const sent = JSON.parse((await reqP).postData()).time_slots[0];
    await page.waitForTimeout(500);
    await evidence(page, "TC-01-04_pozni_termin");

    await test.step("Poslani end_time je za start_time (21. ob 00:30)", () => {
      expect.soft(sent.end_time > sent.start_time, `start ${sent.start_time}, end ${sent.end_time}`).toBe(true);
    });
    await test.step("V bazi je konec za začetkom (ali zahteva zavrnjena)", () => {
      const row = sql(`SELECT t.start_time, t.end_time, t.end_time > t.start_time FROM polls p JOIN time_slots t ON t.poll_id = p.id WHERE p.title = ${q(title)}`);
      expect.soft(row === "" || row.endsWith("|t"), row).toBe(true);
    });
  });

  test("TC-01-05 Strežniška validacija neveljavnih vhodov pri ustvarjanju (API)", async () => {
    knownBug("INC-02", "INC-03", "INC-04");
    const before = Number(sql("SELECT count(*) FROM polls"));
    const cases = [
      ["prazen naslov", { title: "", organizer_email: "o@primer.si", time_slots: [slot(10, 10)] }],
      ["brez terminov", { title: `TS01 API brez terminov ${RUN}`, organizer_email: "o@primer.si", time_slots: [] }],
      ["konec pred začetkom", { title: `TS01 API obrnjen ${RUN}`, organizer_email: "o@primer.si", time_slots: [{ start_time: `${YM}-10T12:00:00`, end_time: `${YM}-10T11:00:00` }] }],
      ["manjka organizer_email", { title: `TS01 API brez e-pošte ${RUN}`, time_slots: [slot(10, 10)] }],
      ["neveljaven datum", { title: `TS01 API datum ${RUN}`, organizer_email: "o@primer.si", time_slots: [{ start_time: "jutri", end_time: "pojutrišnjem" }] }],
    ];
    for (const [name, body] of cases) {
      await test.step(`Vhod »${name}« → HTTP 400`, async () => {
        const r = await api("POST", "/api/polls", body);
        expect.soft(r.status, r.text).toBe(400);
      });
    }
    await test.step("Vhod »neveljaven JSON« → HTTP 400", async () => {
      const r = await api("POST", "/api/polls", undefined, "{ to ni json");
      expect.soft(r.status).toBe(400);
    });
    await test.step("Število anket v bazi se ne spremeni", () => {
      expect.soft(Number(sql("SELECT count(*) FROM polls"))).toBe(before);
    });
  });
});
