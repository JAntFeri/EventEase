import test from "node:test";
import assert from "node:assert/strict";
import {
  organizerNameFromEmail,
  isValidVoteStatus,
  buildSharePath,
} from "./eventHelpers.js";

test("organizerNameFromEmail extracts local part", () => {
  assert.equal(organizerNameFromEmail("janez.novak@mail.com"), "janez.novak");
});

test("organizerNameFromEmail handles missing email", () => {
  assert.equal(organizerNameFromEmail(""), "Organizator");
  assert.equal(organizerNameFromEmail(null), "Organizator");
});

test("organizerNameFromEmail handles email without @", () => {
  assert.equal(organizerNameFromEmail("organizator"), "organizator");
});

test("isValidVoteStatus accepts allowed values", () => {
  assert.equal(isValidVoteStatus("yes"), true);
  assert.equal(isValidVoteStatus("no"), true);
  assert.equal(isValidVoteStatus("if_need_be"), true);
  assert.equal(isValidVoteStatus("maybe"), false);
});

test("buildSharePath returns invite route", () => {
  assert.equal(
    buildSharePath("550e8400-e29b-41d4-a716-446655440000"),
    "/invite/550e8400-e29b-41d4-a716-446655440000",
  );
});
