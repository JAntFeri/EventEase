// ST-01 Obremenitveni test (load test) – pričakovana konična obremenitev.
// Profil: 2 min naraščanja do 150 sočasnih uporabnikov, 10 min vzdrževanja, 1 min upadanja.
// Uporabniki imajo realen čas razmisleka (izpolnjevanje obrazca), zato je to zaprt model obremenitve.
//
// Zagon: tests/system/zazeni.sh obremenitveni   (ali neposredno: k6 run tests/system/k6/obremenitveni.js)

import { iteracija } from "./skupno.js";

const VU = Number(__ENV.VU || 150);
const VZDRZEVANJE = __ENV.VZDRZEVANJE || "10m";
const NARAS = __ENV.NARAS || "2m";
const UPAD = __ENV.UPAD || "1m";

export const options = {
  scenarios: {
    obremenitev: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: NARAS, target: VU },
        { duration: VZDRZEVANJE, target: VU },
        { duration: UPAD, target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  // Kriteriji sprejemljivosti (poglavje 2.4 poročila). Neizpolnjen prag = test NEUSPEŠEN.
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{vrsta:api}": ["p(95)<300", "p(99)<800"],
    "http_req_duration{vrsta:staticno}": ["p(95)<100"],
    "http_req_duration{name:POST /api/polls/share/:token/vote}": ["p(95)<300"],
    checks: ["rate>0.99"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export default function () {
  iteracija(true);
}
