import { useState, useRef, useCallback, useEffect } from "react";
import { M, sans, serif, TRIP, MOCK_PHOTOS } from "../../constants.js";
import { SectionTitle, PrimaryBtn, GhostBtn, Tag } from "../shared.jsx";

const TAGS = ["All", "Arrival", "Culture", "Adventure", "Food", "Family", "Music"];

const TRIP_HIGHLIGHTS = [
  "Nashville Shores Water Park", "Broadway Honky Tonks", "Country Music Hall of Fame",
  "Ryman Auditorium", "Arnold's Country Kitchen", "Group Bonfire at Percy Warner",
];

const FALLBACK_POSTCARD = {
  headline: "Thirteen Hearts, One Music City",
  subheadline: "Four families. Four nights. A lifetime of Nashville memories.",
  story: "From the first honky tonk note on Broadway to the last splash at Nashville Shores, the Nashville Family Adventure of June 2026 was everything a family trip should be — loud, warm, sun-soaked, and full of moments we'll retell for years. Bharath gathered the crew, Priya found the best BBQ in town, Arjun won every trivia round, and Meera kept everyone on schedule (mostly). The Cumberland River sparkled as the General Jackson carried us into the evening, and the kids discovered that country music isn't just for grown-ups.",
  bestMoment: "The whole crew — all thirteen of us — singing along to Sweet Home Alabama at a honky tonk on Broadway at 10pm on Saturday night.",
  insiderTip: "The Bluebird Cafe seats only 90 people — show up 30 minutes early, order a round of drinks, and the kids are welcome before 9pm.",
  closingLine: "Until the next adventure, crew. Bonvoy. 🎸",
  hashtag: "#NashvilleCrew2026",
};

async function claudeCaption(label, day, tag) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 120,
        system: `You write warm, specific, funny photo captions for family travel memories.
Trip: Nashville TN, Jun 14–18 2026, 13 people across 4 families.
Write ONE caption: 1–2 sentences, warm + specific to Nashville.
No hashtags. No emojis. Sound like a real family memory, not a travel brochure.`,
        messages: [{ role: "user", content: `Photo: "${label}" taken on ${day}. Tag: ${tag}. Write the caption.` }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

const FALLBACK_CAPTIONS = {
  "Nashville Shores Water Park": "Three hours into the water park and nobody wanted to leave — even the dads who said they'd just watch from the deck.",
  "Country Music Hall of Fame": "Forty-five minutes was never going to be enough. The kids found Dolly Parton's tour bus and refused to move on.",
  "Arnold's Country Kitchen": "Meat-and-three for thirteen people, cash only, best meal of the entire trip. We came back the next day.",
  "Ryman Auditorium Tour": "Standing on that stage, even just for a selfie, felt like something. The kids didn't quite get it. The adults absolutely did.",
  "Broadway at Night": "Nobody told us Broadway would still be going at midnight. Nobody told the kids either — that was on us.",
  "The Whole Crew at Sunset": "One photo. Thirteen people. Eight attempts. This was the one where everyone was actually looking.",
};

async function claudePostcard(photos) {
  const captionSummaries = photos
    .filter(p => p.caption)
    .map(p => `"${p.label}": ${p.caption}`)
    .join("\n");

  const memberNames = [];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: `You create warm, poetic trip memorabilia text for family travel scrapbooks. Write in editorial travel-memoir style — specific, evocative, personal.`,
        messages: [{
          role: "user",
          content: `Trip: ${tripInfo?.name || TRIP.name}, ${tripInfo?.startDate && tripInfo?.endDate ? `${tripInfo.startDate} – ${tripInfo.endDate}` : TRIP.dates}, ${tripInfo?.destination || TRIP.destination}
Families: ${memberNames.join(", ")}
Highlights: ${TRIP_HIGHLIGHTS.join(", ")}
Photo moments:\n${captionSummaries}

Generate JSON:
{
  "headline": "5–7 word poetic trip headline",
  "subheadline": "one evocative sentence",
  "story": "3–4 sentences — specific moments and Nashville details",
  "bestMoment": "one sentence — the single best moment",
  "insiderTip": "one Nashville insider tip the group discovered",
  "closingLine": "one warm closing line",
  "hashtag": "one custom trip hashtag"
}`,
        }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return FALLBACK_POSTCARD;
  } catch {
    return FALLBACK_POSTCARD;
  }
}

// ─── POSTCARD MODAL ───────────────────────────────────────────────────────────
function Postcard({ data, photos, onClose }) {
  const postcardRef = useRef(null);
  const displayPhotos = [...photos.filter(p => p.selected), ...photos.filter(p => !p.selected)].slice(0, 6);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 600, overflowY: "auto", padding: "24px 16px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Trip Postcard · Print-ready</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => window.print()}
              style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, padding: "9px 18px", background: M.red, color: M.white, border: "none", cursor: "pointer" }}
            >
              Save / Print
            </button>
            <button
              onClick={onClose}
              style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, padding: "9px 18px", background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Postcard */}
        <div ref={postcardRef} id="printable-postcard" style={{ background: M.white, width: "100%" }}>
          {/* Header bar */}
          <div style={{ background: M.black, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: M.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: M.white, fontSize: 15, fontWeight: 900, fontFamily: serif }}>M</span>
            </div>
            <span style={{ color: M.white, fontSize: 13, fontWeight: 700, letterSpacing: ".1em" }}>MARRIOTT BONVOY</span>
            <span style={{ color: "#555", fontSize: 11, marginLeft: 4 }}>· Crewfare Trip Memories</span>
          </div>

          {/* Headline */}
          <div style={{ padding: "28px 28px 20px", borderBottom: `1px solid ${M.gray10}` }}>
            <div style={{ fontFamily: serif, fontSize: 38, color: M.black, lineHeight: 1.15, marginBottom: 10 }}>{data.headline}</div>
            <div style={{ fontFamily: serif, fontSize: 15, color: M.gray50, fontStyle: "italic" }}>{data.subheadline}</div>
          </div>

          {/* Photo grid */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "160px 160px", gap: 3, padding: "3px" }}>
            {displayPhotos.map((p, i) => (
              <div key={p.id} style={{
                gridColumn: i === 0 ? "1" : "auto",
                gridRow: i === 0 ? "1 / 3" : "auto",
                background: p.src ? "transparent" : p.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", position: "relative",
              }}>
                {p.src
                  ? <img src={p.src} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: i === 0 ? 52 : 36 }}>{p.emoji}</div>
                      <div style={{ fontFamily: sans, fontSize: 10, color: M.gray50, marginTop: 6, padding: "0 8px" }}>{p.label}</div>
                    </div>
                }
                {p.caption && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.55)", padding: "6px 8px" }}>
                    <div style={{ fontFamily: sans, fontSize: 10, color: M.white, lineHeight: 1.4 }}>{p.caption}</div>
                  </div>
                )}
              </div>
            ))}
            {/* Fill empty slots */}
            {Array.from({ length: Math.max(0, 5 - (displayPhotos.length - 1)) }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: M.gray05 }} />
            ))}
          </div>

          {/* Story columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "24px 28px", borderBottom: `1px solid ${M.gray10}` }}>
            <div>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: M.red, marginBottom: 10 }}>The Story</div>
              <div style={{ fontFamily: serif, fontSize: 13, color: M.charcoal, lineHeight: 1.8 }}>{data.story}</div>
            </div>
            <div>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: M.teal, marginBottom: 10 }}>Best Moment</div>
              <div style={{ fontFamily: serif, fontSize: 13, color: M.charcoal, lineHeight: 1.7, marginBottom: 18, fontStyle: "italic" }}>"{data.bestMoment}"</div>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: M.gold, marginBottom: 8 }}>Insider Tip</div>
              <div style={{ fontFamily: sans, fontSize: 12, color: M.charcoal, lineHeight: 1.6 }}>{data.insiderTip}</div>
            </div>
          </div>

          {/* Highlights strip */}
          <div style={{ background: M.gray05, padding: "14px 28px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: M.gray50, marginRight: 4 }}>Highlights</span>
            {TRIP_HIGHLIGHTS.map(h => (
              <Tag key={h} color={M.charcoal}>{h}</Tag>
            ))}
          </div>

          {/* Footer */}
          <div style={{ background: M.black, padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: sans, fontSize: 13, color: M.gold, fontWeight: 700 }}>{data.hashtag}</div>
            <div style={{ fontFamily: serif, fontSize: 13, color: "#666", fontStyle: "italic" }}>{data.closingLine}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 18, background: M.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: M.white, fontSize: 10, fontWeight: 900, fontFamily: serif }}>M</span>
              </div>
              <span style={{ fontFamily: sans, fontSize: 10, color: "#555", letterSpacing: ".06em" }}>BONVOY</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { body > *:not(#printable-postcard){ display:none!important } #printable-postcard{ display:block!important } }`}</style>
    </div>
  );
}

// ─── MEMORIES TAB ─────────────────────────────────────────────────────────────
export default function MemoriesTab({ tripInfo }) {
  const [photos, setPhotos] = useState(() => {
    try {
      const saved = localStorage.getItem('crewfare_memories');
      if (saved) return JSON.parse(saved);
    } catch {}
    return MOCK_PHOTOS;
  });

  // Persist photos to localStorage; strip large base64 srcs if quota is exceeded
  useEffect(() => {
    try {
      localStorage.setItem('crewfare_memories', JSON.stringify(photos));
    } catch {
      try {
        const stripped = photos.map(p => ({
          ...p,
          src: p.src?.startsWith('data:') ? undefined : p.src,
        }));
        localStorage.setItem('crewfare_memories', JSON.stringify(stripped));
      } catch { /* ignore */ }
    }
  }, [photos]);
  const [view, setView] = useState("grid");
  const [activeTag, setActiveTag] = useState("All");
  const [captioningId, setCaptioningId] = useState(null);
  const [captioningAll, setCaptioningAll] = useState(false);
  const [postcardData, setPostcardData] = useState(null);
  const [generatingPostcard, setGeneratingPostcard] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const filtered = activeTag === "All" ? photos : photos.filter(p => p.tag === activeTag);

  function readFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = e => {
        const tags = ["Arrival", "Culture", "Adventure", "Food", "Family", "Music"];
        const days = ["Jun 14", "Jun 15", "Jun 16", "Jun 17", "Jun 18"];
        setPhotos(prev => [...prev, {
          id: "up_" + Date.now() + Math.random(),
          src: e.target.result,
          emoji: "📷",
          color: M.gray05,
          label: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          day: days[Math.floor(Math.random() * days.length)],
          tag: tags[Math.floor(Math.random() * tags.length)],
          caption: null,
          selected: false,
        }]);
      };
      reader.readAsDataURL(file);
    });
  }

  async function captionOne(photo) {
    setCaptioningId(photo.id);
    const fallback = FALLBACK_CAPTIONS[photo.label] || `One of those Nashville moments you can't quite put into words — but this photo gets close.`;
    const caption = (await claudeCaption(photo.label, photo.day, photo.tag)) || fallback;
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, caption } : p));
    setCaptioningId(null);
  }

  async function captionAll() {
    setCaptioningAll(true);
    const uncaptioned = photos.filter(p => !p.caption);
    for (const photo of uncaptioned) {
      setCaptioningId(photo.id);
      const fallback = FALLBACK_CAPTIONS[photo.label] || `One of those Nashville moments you can't quite put into words — but this photo gets close.`;
      const caption = (await claudeCaption(photo.label, photo.day, photo.tag)) || fallback;
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, caption } : p));
      await new Promise(r => setTimeout(r, 300));
    }
    setCaptioningId(null);
    setCaptioningAll(false);
  }

  async function generatePostcard() {
    setGeneratingPostcard(true);
    const data = await claudePostcard(photos);
    setPostcardData(data);
    setGeneratingPostcard(false);
  }

  function toggleSelect(id) {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  }

  const selectedCount = photos.filter(p => p.selected).length;

  return (
    <div className="fu">
      <style>{`
        @media print {
          body > *:not(#printable-postcard) { display: none !important; }
          #printable-postcard { display: block !important; }
        }
      `}</style>

      {postcardData && (
        <Postcard data={postcardData} photos={photos} onClose={() => setPostcardData(null)} />
      )}

      {/* Header actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <SectionTitle>Trip Memories · {photos.length} photos</SectionTitle>
          <p style={{ fontFamily: sans, fontSize: 13, color: M.gray50, lineHeight: 1.6, margin: 0 }}>
            Upload photos, get AI captions, and create a printable trip postcard.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <GhostBtn
            onClick={captionAll}
            style={{ fontSize: 11, padding: "8px 14px", opacity: captioningAll ? 0.6 : 1 }}
          >
            {captioningAll ? "Captioning…" : "✦ Caption All Photos"}
          </GhostBtn>
          <PrimaryBtn
            onClick={generatePostcard}
            disabled={generatingPostcard}
            style={{ fontSize: 11, padding: "8px 16px" }}
          >
            {generatingPostcard ? "Generating…" : "✦ Create Trip Postcard"}
          </PrimaryBtn>
        </div>
      </div>

      {/* View + tag toggles */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TAGS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTag(t)}
              style={{
                fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
                padding: "5px 12px", borderRadius: 2, border: `1px solid ${activeTag === t ? M.red : M.gray10}`,
                background: activeTag === t ? M.redPale : "transparent",
                color: activeTag === t ? M.red : M.gray50, cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["grid", "scrapbook"].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
                padding: "5px 12px", borderRadius: 2, border: `1px solid ${view === v ? M.teal : M.gray10}`,
                background: view === v ? M.tealPale : "transparent",
                color: view === v ? M.teal : M.gray50, cursor: "pointer", textTransform: "capitalize",
              }}
            >
              {v === "grid" ? "⊞ Grid" : "✦ Scrapbook"}
            </button>
          ))}
        </div>
      </div>

      {/* Upload drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); readFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? M.red : M.gray10}`,
          background: dragOver ? M.redPale : M.gray05,
          padding: "20px", textAlign: "center", marginBottom: 20,
          cursor: "pointer", transition: "all .15s", borderRadius: 2,
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>📸</div>
        <div style={{ fontFamily: sans, fontSize: 13, color: M.gray50 }}>
          Drag & drop photos here or <span style={{ color: M.red, fontWeight: 700 }}>browse</span>
        </div>
        <div style={{ fontFamily: sans, fontSize: 11, color: M.gray30, marginTop: 4 }}>
          JPG, PNG, HEIC, WebP — multiple files OK
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => readFiles(e.target.files)}
        />
      </div>

      {selectedCount > 0 && (
        <div style={{ background: M.tealPale, border: `1px solid ${M.teal}30`, padding: "10px 14px", marginBottom: 14, fontFamily: sans, fontSize: 12, color: M.teal }}>
          ✓ {selectedCount} photo{selectedCount !== 1 ? "s" : ""} selected for postcard — they'll appear first in the grid.
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {filtered.map((p, i) => {
            const isCapturing = captioningId === p.id;
            return (
              <div
                key={p.id}
                className="fu"
                style={{ animationDelay: `${i * 0.05}s`, border: `1.5px solid ${p.selected ? M.teal : M.gray10}`, background: M.white, position: "relative" }}
              >
                {/* Selection toggle */}
                <div
                  onClick={() => toggleSelect(p.id)}
                  style={{
                    position: "absolute", top: 8, right: 8, zIndex: 10,
                    width: 22, height: 22, borderRadius: "50%",
                    background: p.selected ? M.teal : "rgba(255,255,255,0.8)",
                    border: `2px solid ${p.selected ? M.teal : M.gray30}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 12, color: M.white,
                  }}
                >
                  {p.selected && "✓"}
                </div>

                {/* Photo area */}
                <div style={{ height: 140, background: p.src ? "transparent" : p.color, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {p.src
                    ? <img src={p.src} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 44 }}>{p.emoji}</span>
                  }
                </div>

                {/* Info */}
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: M.black, marginBottom: 3 }}>{p.label}</div>
                  <div style={{ fontFamily: sans, fontSize: 11, color: M.gray50, marginBottom: 8 }}>{p.day} · <Tag color={M.teal}>{p.tag}</Tag></div>

                  {p.caption
                    ? <div style={{ fontFamily: serif, fontSize: 12, color: M.charcoal, lineHeight: 1.6, fontStyle: "italic" }}>"{p.caption}"</div>
                    : (
                      <button
                        onClick={() => captionOne(p)}
                        disabled={isCapturing || captioningAll}
                        style={{
                          fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
                          padding: "6px 12px", border: `1px solid ${M.red}30`,
                          background: isCapturing ? M.redPale : "transparent",
                          color: M.red, cursor: isCapturing ? "default" : "pointer", borderRadius: 2,
                        }}
                      >
                        {isCapturing ? "✦ Writing…" : "✦ AI Caption"}
                      </button>
                    )
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scrapbook view */}
      {view === "scrapbook" && (
        <div style={{ background: "#FAF6F0", padding: 24, borderRadius: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {filtered.map((p, i) => {
              const rotation = ((i * 17) % 9) - 4;
              const isSpan = i % 7 === 0;
              return (
                <div
                  key={p.id}
                  className="fu"
                  style={{
                    animationDelay: `${i * 0.06}s`,
                    gridColumn: isSpan ? "span 2" : "auto",
                    transform: `rotate(${rotation}deg)`,
                    transition: "transform .2s",
                    background: M.white,
                    boxShadow: "0 4px 18px rgba(0,0,0,0.12)",
                    padding: "10px 10px 32px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "rotate(0deg) scale(1.02)"}
                  onMouseLeave={e => e.currentTarget.style.transform = `rotate(${rotation}deg)`}
                >
                  <div style={{ height: isSpan ? 200 : 150, background: p.src ? "transparent" : p.color, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10 }}>
                    {p.src
                      ? <img src={p.src} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: isSpan ? 52 : 40 }}>{p.emoji}</span>
                    }
                  </div>
                  <div style={{ fontFamily: serif, fontSize: 12, color: M.charcoal, textAlign: "center", lineHeight: 1.5 }}>
                    {p.caption ? `"${p.caption}"` : p.label}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 6, fontFamily: sans, fontSize: 10, color: M.gray30 }}>{p.day}</div>
                  {/* Sticker decorations */}
                  {i % 3 === 0 && (
                    <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 14, color: M.red, fontWeight: 900, fontFamily: sans, opacity: 0.6 }}>★</div>
                  )}
                  {i % 4 === 0 && (
                    <div style={{ position: "absolute", bottom: 6, left: 8, fontSize: 12, color: M.gold, fontWeight: 900, fontFamily: sans, opacity: 0.7 }}>✦</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
