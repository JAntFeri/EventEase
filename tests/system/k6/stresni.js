// ST-02 Stresni test – stopnjevanje obremenitve preko zmogljivosti sistema in preverjanje okrevanja.
// Odprt model (ramping-arrival-rate): nove iteracije prihajajo s predpisano hitrostjo ne glede na to,
// kako hitro sistem odgovarja – tako kot novi uporabniki, ki odpirajo povezavo. Brez časa razmisleka.
// Po zadnji stopnji sledi faza "okrevanje" z nizko hitrostjo, s katero preverimo, ali se sistem povrne.
//
// Zagon: tests/system/zazeni.sh stresni   (ali neposredno: k6 run tests/system/k6/stresni.js)

import { iteracija } from "./skupno.js";

const plan = JSON.parse(open("./stresni_stopnje.json"));

const stages = [];
for (const hitrost of plan.stopnje) {
  stages.push({ duration: `${plan.naras_s}s`, target: hitrost });
  stages.push({ duration: `${plan.vzdrzevanje_s}s`, target: hitrost });
}
const trajanjeStresa = plan.stopnje.length * (plan.naras_s + plan.vzdrzevanje_s);

export const options = {
  scenarios: {
    stres: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 3000,
      stages,
      gracefulStop: "0s",
    },
    okrevanje: {
      executor: "constant-arrival-rate",
      rate: plan.okrevanje.hitrost,
      timeUnit: "1s",
      duration: `${plan.okrevanje.trajanje_s}s`,
      preAllocatedVUs: 100,
      maxVUs: 500,
      startTime: `${trajanjeStresa + plan.okrevanje.premor_s}s`,
    },
  },
  // Med stresom pričakujemo odpoved, zato so pragovi postavljeni samo za fazo okrevanja (kriterij K4).
  // Ostale kriterije (K1–K3, K5) ovrednoti tests/system/analiza.py po stopnjah.
  thresholds: {
    "http_req_failed{scenario:okrevanje}": ["rate<0.01"],
    "http_req_duration{scenario:okrevanje,vrsta:api}": ["p(95)<300"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

export default function () {
  iteracija(false);
}
