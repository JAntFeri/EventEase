#!/usr/bin/env node
// Namerno vnašanje napak (ročno mutacijsko testiranje).
// Za vsako mutacijo zamenja natanko en odsek kode, požene teste te enote in preveri,
// ali so testi padli. Datoteko vedno povrne v izvirno stanje.
//
// Uporaba (iz korena repozitorija):  node scripts/mutation-test.mjs [filter]
// Izhodna koda je 1, če katera od mutacij preživi (testi je ne zaznajo).

import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const FE = "frontend/EventEase";
const BE = "backend/logic";

const nodeTest = (file) => ({ cwd: FE, cmd: "node", args: ["--test", file] });
const zigTest = { cwd: BE, cmd: "zig", args: ["build", "test"] };

const units = [
  {
    unit: "eventHelpers.js",
    file: `${FE}/src/utils/eventHelpers.js`,
    run: nodeTest("src/utils/eventHelpers.test.js"),
    mutations: [
      ["prazen lokalni del vrne prazen niz", `return name.length > 0 ? name : "Organizator";`, `return name;`],
      ["napačno ime statusa (if_needed)", `status === "if_need_be";`, `status === "if_needed";`],
      ["žeton ni URL-kodiran", "`/invite/${encodeURIComponent(shareToken)}`", "`/invite/${shareToken}`"],
    ],
  },
  {
    unit: "dateHelpers.js",
    file: `${FE}/src/utils/dateHelpers.js`,
    run: nodeTest("src/utils/dateHelpers.test.js"),
    mutations: [
      ["stara logika .split(\"+\") (ne odreže negativnega pasu)", `.replace(ZONE_AFTER_TIME, "$1")`, `.split("+")[0]`],
      ["termini brez start_time niso izločeni", `.filter((slot) => slot && slot.start_time)`, `.filter((slot) => slot)`],
      ["ura odrezana na 4 znake", `time.slice(0, 5)`, `time.slice(0, 4)`],
    ],
  },
  {
    unit: "voteHelpers.js",
    file: `${FE}/src/utils/voteHelpers.js`,
    run: nodeTest("src/utils/voteHelpers.test.js"),
    mutations: [
      ["dvojina 'glasa' namesto 'glasova'", `return "glasova";`, `return "glasa";`],
      ["starejši status if_needed ni štet", `new Set(["if_need_be", "if_needed"])`, `new Set(["if_need_be"])`],
      ["odstotek zaokrožen navzdol", `Math.round((count / total) * 100)`, `Math.floor((count / total) * 100)`],
      ["primerjava mod100 → count (napaka pri 102)", `if (mod100 === 2)`, `if (count === 2)`],
    ],
  },
  {
    unit: "api/polls.js",
    file: `${FE}/src/api/polls.js`,
    run: nodeTest("src/api/polls.test.js"),
    mutations: [
      ["HTTP napaka ni zaznana", `if (!response.ok) throw new ApiError(response.status);`, ``],
      ["napačno ime polja pri finalizaciji", `{ final_slot_id: slotId }`, `{ slot_id: slotId }`],
      ["žeton ni URL-kodiran", `const enc = encodeURIComponent;`, `const enc = (s) => s;`],
      ["napačna HTTP metoda", `method: "POST",`, `method: "PUT",`],
    ],
  },
  {
    unit: "email_content.zig (ICS)",
    file: `${BE}/src/email_content.zig`,
    run: zigTest,
    mutations: [
      ["napačen predznak časovnega pasu", `+ second - offset;`, `+ second + offset;`],
      ["podpičje v naslovu ni ubežano", String.raw`';' => try out.appendSlice(alloc, "\\;"),`, `';' => try out.append(alloc, c),`],
      ["vsak februar ima 29 dni", `if (m == 2 and isLeapYear(y)) return 29;`, `if (m == 2 and (isLeapYear(y) or true)) return 29;`],
      ["konec pred začetkom ni zavrnjen", `if (!std.mem.lessThan(u8, start_ics, end_ics)) return error.InvalidTimeRange;`, ``],
      ["vrstica DTEND brez CR", String.raw`"DTEND:{s}\r\n" ++`, String.raw`"DTEND:{s}\n" ++`],
    ],
  },
  {
    unit: "email_content.zig (HTML/JSON)",
    file: `${BE}/src/email_content.zig`,
    run: zigTest,
    mutations: [
      ["& ni ubežan v HTML", `'&' => try escaped.appendSlice(alloc, "&amp;"),`, `'&' => try escaped.append(alloc, c),`],
      ["nova vrstica ni <br>", String.raw`'\n' => try escaped.appendSlice(alloc, "<br>"),`, String.raw`'\n' => try escaped.append(alloc, c),`],
      ["narekovaj ni ubežan v JSON", String.raw`'"' => try out.appendSlice(alloc, "\\\""),`, `'"' => try out.append(alloc, c),`],
      ["kontrolni znaki niso ubežani v JSON", `0...0x08, 0x0B, 0x0C, 0x0E...0x1F => {`, `0x7F => {`],
    ],
  },
];

const COMPILE_ERROR = /\.zig:\d+:\d+: error:/;
const filter = process.argv[2];
const results = [];

for (const { unit, file, run, mutations } of units) {
  if (filter && !unit.includes(filter)) continue;
  const path = resolve(file);
  const original = readFileSync(path, "utf8");

  for (const [description, find, replace] of mutations) {
    const count = original.split(find).length - 1;
    if (count !== 1) {
      results.push({ unit, description, status: `NAPAKA: odsek najden ${count}×` });
      continue;
    }
    writeFileSync(path, original.replace(find, () => replace));
    try {
      const proc = spawnSync(run.cmd, run.args, { cwd: run.cwd, encoding: "utf8" });
      const output = `${proc.stdout}\n${proc.stderr}`;
      let status;
      if (proc.status === 0) status = "PREŽIVELA";
      else if (COMPILE_ERROR.test(output)) status = "NAPAKA PRI PREVAJANJU";
      else {
        const failed = (output.match(/^# fail (\d+)/m) || output.match(/(\d+) failed/))?.[1];
        status = failed ? `ujeta (${failed} testov pade)` : "ujeta";
      }
      results.push({ unit, description, status });
    } finally {
      writeFileSync(path, original);
    }
    process.stderr.write(".");
  }
}
process.stderr.write("\n");

console.log("| Enota | Vnesena napaka | Rezultat |");
console.log("|---|---|---|");
for (const r of results) console.log(`| ${r.unit} | ${r.description} | ${r.status} |`);

const bad = results.filter((r) => !r.status.startsWith("ujeta"));
if (bad.length > 0) {
  console.error(`\n${bad.length} mutacij ni bilo ujetih s testi.`);
  process.exit(1);
}
