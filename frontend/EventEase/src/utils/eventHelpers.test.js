import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  organizerNameFromEmail,
  isValidVoteStatus,
  buildSharePath,
} from "./eventHelpers.js";

describe("organizerNameFromEmail", () => {
  test("običajen e-naslov → lokalni del pred @", () => {
    assert.equal(organizerNameFromEmail("janez.novak@mail.com"), "janez.novak");
  });

  test("presledki okoli naslova → odrezani", () => {
    assert.equal(organizerNameFromEmail("  ana@mail.com "), "ana");
  });

  test("prazen lokalni del (@domena.si) → 'Organizator'", () => {
    assert.equal(organizerNameFromEmail("@domena.si"), "Organizator");
  });

  test("samo presledki → 'Organizator'", () => {
    assert.equal(organizerNameFromEmail("   "), "Organizator");
  });

  test("brez @ → celoten vnos kot ime", () => {
    assert.equal(organizerNameFromEmail("organizator"), "organizator");
  });

  test("več znakov @ → del pred prvim @", () => {
    assert.equal(organizerNameFromEmail("a@b@c.si"), "a");
  });

  for (const missing of ["", null, undefined, 42, {}]) {
    test(`neveljaven vnos (${JSON.stringify(missing) ?? "undefined"}) → 'Organizator'`, () => {
      assert.equal(organizerNameFromEmail(missing), "Organizator");
    });
  }
});

describe("isValidVoteStatus", () => {
  for (const status of ["yes", "no", "if_need_be"]) {
    test(`dovoljen status '${status}' → true`, () => {
      assert.equal(isValidVoteStatus(status), true);
    });
  }

  // "if_needed" je interno ime v InviteView; backend ga ne sprejme.
  for (const status of ["if_needed", "maybe", "YES", " yes", "", null, undefined]) {
    test(`nedovoljen status ${JSON.stringify(status) ?? "undefined"} → false`, () => {
      assert.equal(isValidVoteStatus(status), false);
    });
  }
});

describe("buildSharePath", () => {
  test("UUID žeton → pot /invite/<žeton>", () => {
    const token = "550e8400-e29b-41d4-a716-446655440000";
    assert.equal(buildSharePath(token), `/invite/${token}`);
  });

  test("žeton s posebnimi znaki → URL-kodiran, ne more pobegniti iz poti", () => {
    assert.equal(buildSharePath("a/../admin?x=1"), "/invite/a%2F..%2Fadmin%3Fx%3D1");
  });

  for (const bad of ["", "   ", undefined, null, 123]) {
    test(`manjkajoč žeton (${JSON.stringify(bad) ?? "undefined"}) → TypeError`, () => {
      assert.throws(() => buildSharePath(bad), TypeError);
    });
  }
});
