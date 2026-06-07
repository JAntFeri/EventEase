
const steps = [
  {
    n: "01",
    title: "Ustvari dogodek v minuti",
    body: "Vnesi naslov, opis in predlagaj termine brez registracije.",
  },
  {
    n: "02",
    title: "Deli povezavo skupini",
    body: "Pošlji eno povezavo in vsi glasujejo v istem pregledu.",
  },
  {
    n: "03",
    title: "Zaključi termin brez kaosa",
    body: "Preglej rezultate, izberi najboljši datum in potrdi dogodek.",
  },
];

const features = [
  {
    name: "Pametno glasovanje",
    desc: "Jasen pregled odgovorov yes / if needed / no za vsak termin.",
  },
  {
    name: "Delitev nalog",
    desc: "Dodaj opravila in razdeli odgovornosti med prijatelje.",
  },
  {
    name: "Hiter start",
    desc: "Brez prijave, brez izgube casa, samo ustvari in deli.",
  },
  {
    name: "Opomniki",
    desc: "Samodejna obvestila pomagajo, da se dogodek ne pozabi.",
  },
];

export default function LandingView({ onStartCreating }) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="landing-float absolute -top-20 -left-14 h-72 w-72 rounded-full bg-accent-1 opacity-30 blur-3xl" />
        <div className="landing-float-delay absolute top-32 right-[-5rem] h-80 w-80 rounded-full bg-accent-2 opacity-25 blur-3xl" />
        <div className="landing-float absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-accent-3 opacity-20 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12 text-slate-800">
        <div className="landing-fade-up [animation-delay:80ms]">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-2 bg-accent-1-soft px-3 py-1 text-xs font-semibold tracking-wide text-slate-700">
            EventEase
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-3" />
            organizacija brez trenja
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6 landing-fade-up [animation-delay:160ms]">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
              Planiraj srečanja,
              <span className="block text-primary">ne zapletov.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-xl">
              EventEase poveže organizatorja in prijatelje v enostaven tok: predlog terminov,
              glasovanje in potrditev dogodka v enem prostoru.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-xl shadow-md hover:opacity-90 transition cursor-pointer"
                type="button"
                onClick={onStartCreating}
              >
                Ustvari dogodek
              </button>
              <a
                href="#how"
                className="px-6 py-3 bg-white text-slate-800 font-semibold rounded-xl border border-accent-2 hover:bg-accent-1-soft transition"
              >
                Kako deluje
              </a>
            </div>
          </div>

          <div className="landing-fade-up [animation-delay:240ms]">
            <div className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur p-5 sm:p-6 shadow-lg">
              <div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)] to-[var(--color-accent-3)] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] opacity-80">Live pregled</p>
                <p className="mt-2 text-2xl font-bold">Piknik na Pohorju</p>
                <p className="mt-1 text-sm opacity-90">12 ljudi glasuje, 3 predlagani termini</p>
                <div className="mt-5 space-y-2.5 text-sm">
                  <div className="rounded-lg bg-white/15 px-3 py-2 flex items-center justify-between">
                    <span>Petek, 18:00</span>
                    <span className="font-semibold">8 da</span>
                  </div>
                  <div className="rounded-lg bg-white/15 px-3 py-2 flex items-center justify-between">
                    <span>Sobota, 16:00</span>
                    <span className="font-semibold">10 da</span>
                  </div>
                  <div className="rounded-lg bg-white/15 px-3 py-2 flex items-center justify-between">
                    <span>Nedelja, 17:00</span>
                    <span className="font-semibold">6 da</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="how" className="landing-fade-up [animation-delay:320ms] space-y-5 pt-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Kako deluje?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <article
                key={step.n}
                className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover:shadow-md transition"
              >
                <p className="text-xs font-bold tracking-wider text-primary">KORAK {step.n}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="landing-fade-up [animation-delay:380ms] space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Zakaj EventEase?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <article
                key={feature.name}
                className={`rounded-2xl p-5 border shadow-sm hover:shadow-md transition ${idx % 3 === 0 ? "bg-accent-1-soft border-accent-1 text-slate-900" : idx % 3 === 1 ? "bg-accent-2 border-accent-2 text-slate-900" : "bg-accent-3 border-accent-3 text-white"}`}
              >
                <h3 className="text-lg font-semibold">{feature.name}</h3>
                <p className={`mt-1 text-sm ${idx % 3 === 2 ? "text-white/90" : "text-slate-700"}`}>{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}