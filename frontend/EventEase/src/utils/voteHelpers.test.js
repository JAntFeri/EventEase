import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { tallyVotes, votePercentage, voteLabel } from "./voteHelpers.js";

const slots = [{ id: "s1" }, { id: "s2" }];

describe("tallyVotes", () => {
  test("mešani glasovi → imena razvrščena po terminu in statusu", () => {
    const votes = [
      {
        participant_name: "Ana",
        choices: [
          { slot_id: "s1", status: "yes" },
          { slot_id: "s2", status: "if_need_be" },
        ],
      },
      {
        participant_name: "Bor",
        choices: [
          { slot_id: "s1", status: "yes" },
          { slot_id: "s2", status: "no" },
        ],
      },
    ];
    assert.deepEqual(tallyVotes(slots, votes), {
      s1: { yes: ["Ana", "Bor"], maybe: [] },
      s2: { yes: [], maybe: ["Ana"] },
    });
  });

  test("brez glasov → vsak termin ima prazne sezname", () => {
    assert.deepEqual(tallyVotes(slots, []), {
      s1: { yes: [], maybe: [] },
      s2: { yes: [], maybe: [] },
    });
  });

  test("starejši status 'if_needed' → šteje kot 'če bo potrebno'", () => {
    const votes = [{ participant_name: "Ana", choices: [{ slot_id: "s1", status: "if_needed" }] }];
    assert.deepEqual(tallyVotes(slots, votes).s1.maybe, ["Ana"]);
  });

  test("glasovi v polju date_votes namesto choices → upoštevani", () => {
    const votes = [{ participant_name: "Ana", date_votes: [{ slot_id: "s2", status: "yes" }] }];
    assert.deepEqual(tallyVotes(slots, votes).s2.yes, ["Ana"]);
  });

  test("manjkajoče ime → 'Neznanec'", () => {
    const votes = [{ choices: [{ slot_id: "s1", status: "yes" }] }];
    assert.deepEqual(tallyVotes(slots, votes).s1.yes, ["Neznanec"]);
  });

  test("glas za neznan slot_id → prezrt, ne ustvari novega termina", () => {
    const votes = [{ participant_name: "Ana", choices: [{ slot_id: "izbrisan", status: "yes" }] }];
    assert.deepEqual(Object.keys(tallyVotes(slots, votes)), ["s1", "s2"]);
  });

  test("neznan status → ni štet nikjer", () => {
    const votes = [{ participant_name: "Ana", choices: [{ slot_id: "s1", status: "maybe" }] }];
    assert.deepEqual(tallyVotes(slots, votes).s1, { yes: [], maybe: [] });
  });

  test("glasovalec brez izbir → ne vrže izjeme", () => {
    assert.doesNotThrow(() => tallyVotes(slots, [{ participant_name: "Ana" }]));
  });

  test("null termini in glasovi → prazen objekt", () => {
    assert.deepEqual(tallyVotes(null, null), {});
  });
});

describe("votePercentage", () => {
  test("1 od 3 → 33 (zaokroženo)", () => {
    assert.equal(votePercentage(1, 3), 33);
  });

  test("2 od 3 → 67 (zaokroženo navzgor)", () => {
    assert.equal(votePercentage(2, 3), 67);
  });

  test("vsi → 100", () => {
    assert.equal(votePercentage(4, 4), 100);
  });

  test("0 udeležencev → 0, ne NaN ali Infinity", () => {
    assert.equal(votePercentage(0, 0), 0);
  });
});

describe("voteLabel", () => {
  // Pričakovane oblike so iz slovenske slovnice, ne iz trenutne kode.
  const cases = [
    [0, "glasov"],
    [1, "glas"],
    [2, "glasova"],
    [3, "glasovi"],
    [4, "glasovi"],
    [5, "glasov"],
    [11, "glasov"],
    [12, "glasov"],
    [101, "glas"],
    [102, "glasova"],
    [103, "glasovi"],
    [111, "glasov"],
  ];
  for (const [count, label] of cases) {
    test(`${count} → '${label}'`, () => {
      assert.equal(voteLabel(count), label);
    });
  }
});
