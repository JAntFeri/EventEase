import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { normalizePgTimestamp, timeOfDay, toSuggestedDates } from "./dateHelpers.js";

describe("normalizePgTimestamp", () => {
  test("Postgres zapis s +00 → ISO brez pasu", () => {
    assert.equal(normalizePgTimestamp("2024-06-15 14:00:00+00"), "2024-06-15T14:00:00");
  });

  test("negativen pas (-05) → odrezan, ura ostane nespremenjena", () => {
    assert.equal(normalizePgTimestamp("2024-06-15 14:00:00-05"), "2024-06-15T14:00:00");
  });

  test("pas z minutami (+05:30) → odrezan", () => {
    assert.equal(normalizePgTimestamp("2024-06-15 14:00:00+05:30"), "2024-06-15T14:00:00");
  });

  test("delne sekunde → ohranjene, pas odrezan", () => {
    assert.equal(normalizePgTimestamp("2024-06-15 14:00:00.123456+00"), "2024-06-15T14:00:00.123456");
  });

  test("ISO z Z → Z odrezan", () => {
    assert.equal(normalizePgTimestamp("2024-06-15T14:00:00Z"), "2024-06-15T14:00:00");
  });

  test("že normaliziran ISO → nespremenjen (idempotentno)", () => {
    const iso = "2024-06-15T14:00:00";
    assert.equal(normalizePgTimestamp(normalizePgTimestamp(iso)), iso);
  });

  test("samo datum → nespremenjen (dan '-15' ni časovni pas)", () => {
    assert.equal(normalizePgTimestamp("2024-06-15"), "2024-06-15");
  });

  test("polnoč na prelomu leta → pravilno", () => {
    assert.equal(normalizePgTimestamp("2024-12-31 00:00:00+00"), "2024-12-31T00:00:00");
  });

  for (const bad of ["", "   ", null, undefined, 1718460000000]) {
    test(`neveljaven vnos ${JSON.stringify(bad) ?? "undefined"} → prazen niz`, () => {
      assert.equal(normalizePgTimestamp(bad), "");
    });
  }
});

describe("timeOfDay", () => {
  test("Postgres zapis → 'HH:MM'", () => {
    assert.equal(timeOfDay("2024-06-15 09:05:00+00"), "09:05");
  });

  test("ISO zapis → 'HH:MM'", () => {
    assert.equal(timeOfDay("2024-06-15T23:59:59"), "23:59");
  });

  test("samo datum → null", () => {
    assert.equal(timeOfDay("2024-06-15"), null);
  });

  test("manjkajoč vnos → null", () => {
    assert.equal(timeOfDay(undefined), null);
  });
});

describe("toSuggestedDates", () => {
  test("termini iz backenda → id, datum, normaliziran začetek, nespremenjen konec", () => {
    const slots = [
      { id: "s1", start_time: "2024-06-15 14:00:00+00", end_time: "2024-06-15 15:00:00+00" },
    ];
    assert.deepEqual(toSuggestedDates(slots), [
      {
        id: "s1",
        date: "2024-06-15",
        start_time: "2024-06-15T14:00:00",
        end_time: "2024-06-15 15:00:00+00",
      },
    ]);
  });

  test("termin brez start_time ali null → izpuščen, vrstni red ostalih ohranjen", () => {
    const slots = [
      { id: "a", start_time: "2024-01-02 10:00:00+00" },
      { id: "b", start_time: null },
      null,
      { id: "c", start_time: "2024-01-01 10:00:00+00" },
    ];
    assert.deepEqual(
      toSuggestedDates(slots).map((s) => s.id),
      ["a", "c"],
    );
  });

  for (const bad of [undefined, null, {}, "x"]) {
    test(`ne-tabela ${JSON.stringify(bad) ?? "undefined"} → prazna tabela`, () => {
      assert.deepEqual(toSuggestedDates(bad), []);
    });
  }
});
