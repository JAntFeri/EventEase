import { describe, test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  ApiError,
  getSharedPoll,
  getAdminPoll,
  createPoll,
  shareByEmail,
  submitVote,
  suggestDates,
  acceptSuggestion,
  finalizePoll,
} from "./polls.js";

// Nadomestni objekt za globalni fetch: vsak test sam določi odgovor.
let fetchMock;

function respondWith(status, body) {
  fetchMock.mock.mockImplementation(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1).arguments;
  return { url, init, body: init?.body ? JSON.parse(init.body) : undefined };
}

beforeEach(() => {
  fetchMock = mock.method(globalThis, "fetch");
  respondWith(200, {});
});

afterEach(() => {
  mock.restoreAll();
});

describe("GET klici", () => {
  test("getSharedPoll: 200 → vrne razčlenjen JSON", async () => {
    respondWith(200, { title: "Piknik" });
    assert.deepEqual(await getSharedPoll("tok"), { title: "Piknik" });
    assert.equal(lastCall().url, "/api/polls/share/tok");
    assert.equal(lastCall().init, undefined);
  });

  test("getAdminPoll: pravilna pot do skrbniškega vira", async () => {
    await getAdminPoll("adm");
    assert.equal(lastCall().url, "/api/polls/admin/adm");
  });

  test("žeton s posebnimi znaki → URL-kodiran", async () => {
    await getSharedPoll("a/../admin");
    assert.equal(lastCall().url, "/api/polls/share/a%2F..%2Fadmin");
  });
});

describe("POST klici", () => {
  test("createPoll: POST z JSON telesom in glavo Content-Type", async () => {
    respondWith(201, { share_token: "s", admin_token: "a" });
    const poll = { title: "Piknik", time_slots: [] };
    assert.deepEqual(await createPoll(poll), { share_token: "s", admin_token: "a" });
    const { url, init, body } = lastCall();
    assert.equal(url, "/api/polls");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.deepEqual(body, poll);
  });

  test("shareByEmail: pravilna pot in telo", async () => {
    await shareByEmail({ recipients: ["a@b.si"] });
    assert.equal(lastCall().url, "/api/polls/share-email");
    assert.deepEqual(lastCall().body, { recipients: ["a@b.si"] });
  });

  test("submitVote: pot /vote pod share žetonom", async () => {
    await submitVote("tok", { participant_name: "Ana" });
    assert.equal(lastCall().url, "/api/polls/share/tok/vote");
    assert.deepEqual(lastCall().body, { participant_name: "Ana" });
  });

  test("suggestDates: pot /suggest pod share žetonom", async () => {
    await suggestDates("tok", { dates: [] });
    assert.equal(lastCall().url, "/api/polls/share/tok/suggest");
  });

  test("acceptSuggestion: telo vsebuje suggestion_id", async () => {
    await acceptSuggestion("adm", "sug-1");
    assert.equal(lastCall().url, "/api/polls/admin/adm/accept-suggestion");
    assert.deepEqual(lastCall().body, { suggestion_id: "sug-1" });
  });

  test("finalizePoll: telo vsebuje final_slot_id", async () => {
    await finalizePoll("adm", "slot-1");
    assert.equal(lastCall().url, "/api/polls/admin/adm/finalize");
    assert.deepEqual(lastCall().body, { final_slot_id: "slot-1" });
  });

  test("prazno telo odgovora (204) → null", async () => {
    respondWith(204);
    assert.equal(await submitVote("tok", {}), null);
  });
});

describe("napake", () => {
  for (const status of [400, 404, 500]) {
    test(`HTTP ${status} → ApiError s statusom ${status}`, async () => {
      respondWith(status, { error: "x" });
      await assert.rejects(getSharedPoll("tok"), (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, status);
        return true;
      });
    });
  }

  test("omrežna napaka → izvirna izjema, ne ApiError", async () => {
    fetchMock.mock.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    await assert.rejects(finalizePoll("adm", "s"), (err) => {
      assert.ok(!(err instanceof ApiError));
      assert.equal(err.message, "Failed to fetch");
      return true;
    });
  });

  test("200 z neveljavnim JSON → SyntaxError", async () => {
    fetchMock.mock.mockImplementation(async () => new Response("<html>", { status: 200 }));
    await assert.rejects(getSharedPoll("tok"), SyntaxError);
  });

  test("vsak klic pokliče fetch natanko enkrat (brez ponovnih poskusov)", async () => {
    respondWith(500);
    await assert.rejects(createPoll({}));
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});
