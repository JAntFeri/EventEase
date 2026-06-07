import { useEffect, useRef, useState } from "react";
import CalendarPicker from "../components/CalendarPicker";
import { buildSharePath } from "../utils/eventHelpers.js";

export default function CreateEventWizard({ onCancel}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    organizer_email: "",
    tasks: "",
  });
  const [pollDates, setPollDates] = useState([]);
  const [notice, setNotice] = useState(null);
  const noticeRef = useRef(null);

  const [adminLink, setAdminLink] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [recipientEmails, setRecipientEmails] = useState([]);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddEmail = (e) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) return;
    if (!emailRegex.test(email)) {
      alert("Prosimo, vnesite veljaven e-poštni naslov.");
      return;
    }
    if (recipientEmails.includes(email)) {
      alert("Ta e-poštni naslov je že dodan.");
      return;
    }

    setRecipientEmails([...recipientEmails, email]);
    setEmailInput("");
  };

  const handleRemoveEmail = (indexToRemove) => {
    setRecipientEmails(recipientEmails.filter((_, index) => index !== indexToRemove));
  };

  const handleSendEmails = async () => {
    if (recipientEmails.length === 0) return;
    setSendingEmails(true);
    setEmailSuccess(false);

    try {
      // TTUKI BO ŠOU API KLIC ZA EMAIL
      /*const response = await fetch("/api/polls/share-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_link: shareLink,
          title: formData.title,
          recipients: recipientEmails,
        }),
      })*/

      await new Promise(resolve => setTimeout(resolve, 1000));

      setEmailSuccess(true);
      setRecipientEmails([]); 
    } catch (error) {
      console.error("Napaka pri pošiljanju e-pošte:", error);
      alert("Prišlo je do napake pri pošiljanju vabil.");
    } finally {
      setSendingEmails(false);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: formData.title || "Vabilo na dogodek",
          text: `Živijo! Glasuj za termin za dogodek: ${formData.title}`,
          url: shareLink,
        });
      } catch (err) {
        console.log("Uporabnik je preklical deljenje ali pa je prišlo do napake", err);
      }
    } else {
      navigator.clipboard.writeText(shareLink);
      alert("Povezava kopirana v odložišče! (Vaš brskalnik ne podpira sistemskega deljenja)");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      setNotice({ type: "error", message: "Prosimo, vnesite naslov dogodka." });
      return;
    }
    if (!formData.organizer_email) {
      setNotice({
        type: "error",
        message: "Prosimo, vnesite e-poštni naslov organizatorja.",
      });
      return;
    }
    setNotice(null);

    if (!pollDates || pollDates.length === 0) {
      setNotice({ type: 'error', message: 'Prosimo, izberite vsaj en termin na koledarju.' });
      return;
    }

    const timeSlots = pollDates.map(item => {
      if (!item.start_time) {
        return {
          start_time: `${item.date}T12:00:00`,
          end_time: `${item.date}T13:00:00`
        };
      }
      return {
        start_time: item.start_time,
        end_time: item.end_time
      };
    });

    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          organizer_email: formData.organizer_email,
          time_slots: timeSlots,
          tasks: formData.tasks.split("\n").filter((t) => t.trim() !== ""),
        }),
      });

      if (!response.ok) throw new Error("Napaka na strežniku.");

      const data = await response.json();

      if (data.admin_token && data.share_token) {
        setAdminLink(
          `${window.location.origin}/admin/${data.admin_token}?invite=${data.share_token}`,
        );
        setShareLink(`${window.location.origin}${buildSharePath(data.share_token)}`);
      } else {
        setNotice({
          type: "error",
          message: "Strežnik ni vrnil vseh potrebnih žetonov za povezave.",
        });
      }
    } catch (error) {
      console.error("Napaka pri ustvarjanju dogodka:", error);
      setNotice({
        type: "error",
        message: "Napaka pri komuniciranju s strežnikom.",
      });
    }
  };

  useEffect(() => {
    if (notice && noticeRef.current) {
      noticeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [notice]);

  const encodedUrl = encodeURIComponent(shareLink);
  const encodedText = encodeURIComponent(`Glasuj za termin za dogodek: ${formData.title}`);

  if (adminLink && shareLink) {
    return (
      <div className="py-12 md:py-16 px-4 max-w-xl mx-auto animate-fade-in">
        <div className="w-16 h-16 bg-accent-1 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-normal text-gray-900 text-center mb-2">
          Dogodek uspešno ustvarjen!
        </h1>
        <p className="text-sm text-gray-600 font-light text-center mb-8">
          Shranite spodnji povezavi ali pa ju takoj delite s povabljenci.
        </p>

        <div className="space-y-6">
          {/* LINK 1: FOR ADMIN */}
          <div className="block p-4 border border-accent-2 rounded-xl bg-accent-2 shadow-sm">
            <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
              🔑 Povezava za ustvarjalca
            </label>
            <p className="text-xs text-primary font-light mb-3">
              S to povezavo lahko dodajate termine, spremljate rezultate in zaključite glasovanje. Ne delite je z drugimi!
            </p>
            <div className="flex items-center gap-2 p-2 border border-accent-2 rounded-lg bg-white">
              <input type="text" readOnly value={adminLink} className="bg-transparent text-sm text-gray-800 px-2 outline-none w-full select-all" />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(adminLink);
                  setCopiedAdmin(true);
                  setTimeout(() => setCopiedAdmin(false), 2000);
                }}
                className={`text-xs font-medium py-2 px-4 rounded transition shrink-0 ${copiedAdmin ? "bg-primary text-on-primary" : "bg-accent-2 text-on-primary hover:opacity-90"}`}
              >
                {copiedAdmin ? "Kopirano!" : "Kopiraj"}
              </button>
            </div>
          </div>

          {/* LINK 2: FOR PARTICIPANTS */}
          <div className="block p-4 border border-accent-1 rounded-xl bg-accent-1 shadow-sm">
            <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
              📢 Povezava za Udeležence
            </label>
            <p className="text-xs text-primary font-light mb-3">
              To povezavo pošljite prijateljem, sodelavcem ali udeležencem, da bodo lahko oddali svoje glasove.
            </p>
            <div className="flex items-center gap-2 p-2 border border-accent-1 rounded-lg bg-white">
              <input type="text" readOnly value={shareLink} className="bg-transparent text-sm text-gray-800 px-2 outline-none w-full select-all" />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2000);
                }}
                className={`text-xs font-medium py-2 px-4 rounded transition shrink-0 ${copiedShare ? "bg-primary text-on-primary" : "bg-accent-1 text-primary hover:opacity-90"}`}
              >
                {copiedShare ? "Kopirano!" : "Kopiraj"}
              </button>
            </div>
          </div>

          <div className="block p-4 border border-gray-200 rounded-xl bg-gray-50/50 shadow-sm">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              🔗 Hitro deljenje na družbena omrežja
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-accent-1 hover:text-primary transition"
              >
                WhatsApp
              </a>
              
              {/* Telegram */}
              <a
                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-sky-50 hover:text-sky-600 transition"
              >
                Telegram
              </a>

              {/* Messenger / Facebook Link Fallback */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-accent-1 hover:text-primary transition"
              >
                Messenger
              </a>

              {/* Sistemski share za telefon */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium bg-primary text-on-primary rounded-lg hover:opacity-90 transition col-span-2 sm:col-span-1"
              >
                📱 Drugo...
              </button>
            </div>
          </div>

          {/* Email-seznam*/}
          <div className="block p-4 border border-accent-3 rounded-xl bg-accent-3 shadow-sm">
            <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
              ✉️ Pošlji vabila na e-naslove
            </label>
            <p className="text-xs text-primary font-light mb-3">
              Vnesite e-poštne naslove povabljencev in jim neposredno pošljite povezavo.
            </p>

            {emailSuccess && (
              <div className="mb-3 text-xs text-primary font-medium bg-accent-1 p-2 rounded border border-accent-1">
                ✓ Vabila so bila uspešno oddana v pošiljanje!
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <input
                type="email"
                placeholder="npr. prijatelj@primer.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddEmail(e)}
                className="text-sm p-2.5 border border-gray-200 rounded-lg outline-none focus:border-primary bg-white text-gray-950 transition flex-1 shadow-sm"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="text-xs font-medium bg-accent-3 text-on-primary px-4 rounded-lg hover:opacity-90 transition"
              >
                Dodaj
              </button>
            </div>

            {recipientEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-accent-3 rounded-lg max-h-24 overflow-y-auto mb-4">
                {recipientEmails.map((email, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-xs bg-accent-3 text-primary px-2 py-1 rounded-md border border-accent-3 font-light">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(idx)}
                      className="text-primary hover:text-accent-3 font-bold focus:outline-none ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={recipientEmails.length === 0 || sendingEmails}
              onClick={handleSendEmails}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                recipientEmails.length === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-accent-3 text-on-primary hover:opacity-90 shadow-sm"
              }`}
            >
              {sendingEmails ? "Pošiljanje..." : `Pošlji vabilo (${recipientEmails.length})`}
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-900 font-medium underline transition"
          >
            Nazaj na začetno stran
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16 px-4 max-w-xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-normal text-gray-900 mb-2">
          Ustvari nov dogodek
        </h1>
        <p className="text-sm text-gray-600 font-light">
          Brez registracije. Izpolnite osnovne podatke in prejmite povezavo do vabila.
        </p>
      </div>

      {notice && (
        <div ref={noticeRef} className={`mb-6 rounded-xl border px-4 py-3 text-xs font-light ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-accent-1 bg-accent-1 text-primary"}`}>
          {notice.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="title">
            Naslov dogodka *
          </label>
          <input type="text" id="title" name="title" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="npr. Sestanek študentskega društva..." value={formData.title} onChange={handleChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="organizer_email">
            E-pošta organizatorja *
          </label>
          <input type="email" id="organizer_email" name="organizer_email" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="npr. tvoj.email@primer.com" value={formData.organizer_email} onChange={handleChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="description">
            Opis dogodka
          </label>
          <textarea id="description" name="description" rows="3" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="Kratek opis, lokacija ali namen srečanja..." value={formData.description} onChange={handleChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Predlagaj datume za glasovanje
          </label>
          <CalendarPicker selectedDates={pollDates} onChange={setPollDates} isPollMode={true} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider" htmlFor="tasks">
            Dodelitev nalog (Ena naloga na vrstico)
          </label>
          <textarea id="tasks" name="tasks" rows="2" className="text-base p-3 border border-gray-200 rounded-lg outline-none focus:border-black bg-white text-gray-950 transition w-full shadow-sm" placeholder="npr. Rezervacija prostora&#10;Priprava gradiva" value={formData.tasks} onChange={handleChange} />
        </div>

        <div className="flex flex-wrap-reverse gap-3 pt-4">
          <button type="button" className="flex-1 min-w-[140px] text-sm text-gray-600 font-medium bg-transparent border border-gray-300 py-3 px-5 rounded-md hover:bg-gray-50 hover:text-gray-900 transition" onClick={onCancel}>
            Prekliči
          </button>
          <button type="submit" className="flex-1 min-w-[140px] text-sm text-on-primary font-medium bg-primary py-3 px-5 rounded-md hover:opacity-90 active:scale-95 transition shadow-sm">
            Ustvari in deli
          </button>
        </div>
      </form>
    </div>
  );
}