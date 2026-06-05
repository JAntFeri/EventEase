
const steps = [
  { n: '1', title: 'Ustvari brez prijave', body: 'Klikni gumb, vnesi naslov dogodka in predlagaj datume brez registracije.' },
  { n: '2', title: 'Deli povezavo', body: 'Pošlji unikatno vabilo skupini preko tvojega najljubšega klepeta.' },
  { n: '3', title: 'Glasujte in razdelite delo', body: 'Udeleženci izberejo termin, sistem pa jih samodejno opomni in doda v koledar.' },
];

const features = [
  { name: 'Group Polls', desc: 'Poiščite idealen termin brez neskončnih sporočil.' },
  { name: 'Dodeljevanje nalog', desc: 'Delegirajte zadolžitve neposredno znotraj vabila.' },
  { name: 'E-mail opomniki', desc: 'Avtomatska obvestila poskrbijo, da nihče ne pozabi.' },
  { name: 'No Login / No Register', desc: 'Hitro, varno in povsem preprosto za vse udeležence.' },
];

export default function LandingView({ onStartCreating }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-16 text-slate-800">
      {/* Hero Section */}
      <div className="text-center space-y-6 my-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Organizacija dogodkov,<br />
          <em className="text-blue-600 not-italic">brez kaosa.</em>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
          Najpreprostejši način za študentska društva, ekipe in posameznike, da uskladijo termine, razdelijo naloge in spremljajo potrditve udeležbe.
        </p>
        <div className="pt-4">
          <button 
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition cursor-pointer" 
            type="button" 
            onClick={onStartCreating}
          >
            Ustvari dogodek — Brezplačno
          </button>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Steps Section */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center text-slate-900">Kako deluje</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(s => (
            <div className="flex gap-4 items-start p-4 bg-slate-50 rounded-xl" key={s.n}>
              <span className="flex items-center justify-center bg-blue-600 text-white font-bold rounded-full h-8 w-8 shrink-0">
                {s.n}
              </span>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{s.title}</p>
                <p className="text-sm text-slate-600">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Features Section */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-center text-slate-900">Vse kar potrebujete</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map(f => (
            <div className="p-5 border border-slate-200 rounded-xl hover:shadow-sm transition" key={f.name}>
              <span className="block font-bold text-lg text-blue-600 mb-1">{f.name}</span>
              <span className="text-sm text-slate-600">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}