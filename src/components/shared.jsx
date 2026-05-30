import { useState } from "react";
import { M, sans, serif } from "../constants.js";

// ─── AVATAR ───────────────────────────────────────────────────────────────────
// Accepts either a member object (m) OR (name, color) directly
export function Av({ m, name, color, size = 32 }) {
  const displayName = m?.name || name || '?';
  const displayColor = m?.color || color || M.red;
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div title={displayName} style={{
      width: size, height: size, borderRadius: "50%",
      background: displayColor + "22", border: `2px solid ${displayColor}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: displayColor,
      flexShrink: 0, fontFamily: sans,
    }}>
      {initials}
    </div>
  );
}

// ─── TAG ──────────────────────────────────────────────────────────────────────
// Accepts label prop OR children
export function Tag({ children, label, color = M.red }) {
  const content = label !== undefined ? label : children;
  return (
    <span style={{
      fontFamily: sans, fontSize: 10, fontWeight: 700,
      letterSpacing: ".08em", textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 10,
      background: color + "18", color,
      border: `1px solid ${color}30`,
      display: "inline-block",
    }}>
      {content}
    </span>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick, highlight }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: M.white,
        border: `1.5px solid ${highlight ? M.gold : hov && onClick ? M.gray3 : M.gray2}`,
        borderRadius: 12, padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "all .15s",
        boxShadow: hov && onClick ? "0 4px 16px rgba(0,0,0,0.1)" : "0 1px 4px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── SECTION TITLE ────────────────────────────────────────────────────────────
export function SectionTitle({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: sans, fontSize: 11, fontWeight: 700,
      letterSpacing: ".1em", textTransform: "uppercase",
      color: M.gray5,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── BUTTONS ──────────────────────────────────────────────────────────────────
export function PrimaryBtn({ children, onClick, style = {}, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: sans, fontSize: 14, fontWeight: 700,
        letterSpacing: ".03em", padding: "12px 24px",
        borderRadius: 8, border: "none",
        background: disabled ? M.gray3 : hov ? M.redDark : M.red,
        color: M.white,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background .15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: sans, fontSize: 13, fontWeight: 600,
        letterSpacing: ".03em", padding: "11px 20px",
        borderRadius: 8, border: `1.5px solid ${hov ? M.gray4 : M.gray3}`,
        background: hov ? M.gray1 : "transparent", color: M.gray5,
        cursor: "pointer", transition: "all .15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── AI SEARCH / CONCIERGE ────────────────────────────────────────────────────
export function AISearch({ context = "", placeholder = "Ask me anything about your trip…", destination = "", onAddActivity = null }) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState(null);
  const [activityResults, setActivityResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Parse destination from context string if not passed directly ("Nashville, TN trip Jun 15 – Jun 20")
  const dest = destination || (() => {
    const m = context.match(/^([^t]+?)(?:\s+trip|\s+$)/);
    return m ? m[1].trim() : "your destination";
  })();

  const SUGGESTIONS = [
    `Best activities in ${dest}?`,
    "Which activities are free or under $20?",
    "What should we do on a rainy day?",
    "How do we maximize Bonvoy points?",
    `Best restaurants for a group in ${dest}?`,
    `Family-friendly things to do in ${dest}?`,
  ];

  const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  const FALLBACK = `The Marriott hotel's pool complex is a great starting point — typically free for guests. For off-property fun in ${dest || 'your destination'}, check local attraction sites or ask the hotel concierge for group discounts and Bonvoy partner perks.`;

  async function ask(question) {
    if (!question.trim()) return;
    setLoading(true); setAns(null); setActivityResults([]); setOpen(true);

    if (!ANTHROPIC_KEY) {
      setAns(`To enable AI answers, add your Anthropic API key as VITE_ANTHROPIC_API_KEY in .env.local and restart the dev server.`);
      setLoading(false);
      return;
    }

    // When onAddActivity is wired (Activities tab), ask for structured JSON list
    const isActivityMode = typeof onAddActivity === 'function';

    const systemPrompt = isActivityMode
      ? `You are a travel activity recommender for Crewfare, a group trip planning app.
Trip context: ${context || `visiting ${dest}`}
Destination: ${dest || 'the destination'}
CRITICAL: Return ONLY a raw JSON array. No markdown, no code fences, no explanation text before or after. Just the JSON array starting with [ and ending with ].
Each item: { "title": string, "category": one of [Outdoor,Culture,Food,Entertainment,Sports,Wellness,Adventure,Shopping,Nightlife], "emoji": single emoji string, "price": number (0 if free), "description": string (1 sentence max), "duration": string e.g. "2–3 hrs" }
Return 5–8 items. Be specific to ${dest || 'the destination'}. Include local favourites and Marriott hotel activities.`
      : `You are the Marriott Bonvoy AI Concierge for Crewfare, a group trip planning app.
Trip context: ${context || `visiting ${dest}`}
Destination: ${dest || 'the destination'}
IMPORTANT: Suggest activities, restaurants, and attractions specific to ${dest || 'the destination'}. Prioritize Marriott on-site amenities first, then nearby local attractions.
Respond in 2–4 sentences. Be specific with names, prices, and Bonvoy tips.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || data.error.type || JSON.stringify(data.error));
      const text = data.content?.[0]?.text || '';

      if (isActivityMode) {
        // Extract JSON array — handle code fences or raw JSON
        const stripped = text.replace(/```json\n?|```/g, '').trim();
        const match = stripped.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setActivityResults(parsed.map((a, i) => ({
                id: `a-ai-${Date.now()}-${i}`,
                title: a.title || 'Activity',
                category: a.category || 'Outdoor',
                emoji: a.emoji || '✨',
                price: parseFloat(a.price) || 0,
                priceType: 'per person',
                description: a.description || '',
                duration: a.duration || '',
                dates: [], times: [], ageMin: null, ageMax: null,
                deadline: null, cancellation: 'Check with venue',
                upvotes: 0, downvotes: 0, comments: [], voters: [],
                hotelPriority: false, booked: false,
              })));
            } else {
              setAns(text);
            }
          } catch {
            setAns(text);
          }
        } else {
          setAns(text);
        }
      } else {
        setAns(text || FALLBACK);
      }
    } catch (err) {
      console.error('AISearch error:', err?.message);
      setAns(FALLBACK);
    }
    setLoading(false);
  }

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{
        display: "flex",
        border: `2px solid ${open ? M.red : 'rgba(255,255,255,0.25)'}`,
        borderRadius: 10, background: "rgba(255,255,255,0.12)",
        overflow: "hidden", transition: "border-color .2s",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ padding: "0 14px", display: "flex", alignItems: "center", color: "#ffd" }}>
          {loading
            ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,200,100,0.3)", borderTop: "2px solid #ffd", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
            : <span style={{ fontSize: 16 }}>✦</span>}
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask(q)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", padding: "13px 0", fontSize: 14, fontFamily: sans, color: M.white, background: "transparent" }}
        />
        {q && (
          <button
            onClick={() => ask(q)}
            style={{ padding: "0 18px", background: M.red, color: M.white, border: "none", cursor: "pointer", fontFamily: sans, fontSize: 13, fontWeight: 700 }}
          >
            Ask
          </button>
        )}
      </div>

      {open && !ans && !loading && (
        <div style={{ border: `1.5px solid ${M.gray2}`, borderTop: "none", background: M.white, borderRadius: "0 0 10px 10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <div style={{ padding: "8px 14px 4px", fontFamily: sans, fontSize: 10, fontWeight: 700, color: M.gray4, letterSpacing: ".1em", textTransform: "uppercase" }}>
            Suggested questions
          </div>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => { setQ(s); ask(s); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", background: "transparent", border: "none", borderTop: `1px solid ${M.gray2}`, fontFamily: sans, fontSize: 13, color: M.gray5, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = M.gray1}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              ✦ {s}
            </button>
          ))}
        </div>
      )}

      {ans && (
        <div style={{ border: `1.5px solid ${M.gray2}`, borderTop: "none", padding: "14px 16px", background: M.white, borderRadius: "0 0 10px 10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, background: "#fff5f5", border: `1px solid #fdd`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: M.red, fontWeight: 700 }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, color: M.red, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 5 }}>Marriott AI Concierge</div>
              <div style={{ fontFamily: sans, fontSize: 13, color: M.black, lineHeight: 1.7 }}>{ans}</div>
              <button
                onClick={() => { setAns(null); setActivityResults([]); setQ(""); setOpen(false); }}
                style={{ fontFamily: sans, fontSize: 11, color: M.gray4, background: "none", border: "none", cursor: "pointer", marginTop: 8, textDecoration: "underline" }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {activityResults.length > 0 && (
        <div style={{ border: `1.5px solid ${M.gray2}`, borderTop: "none", background: M.white, borderRadius: "0 0 10px 10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, color: M.red, letterSpacing: ".1em", textTransform: "uppercase" }}>
              ✦ {activityResults.length} AI-suggested activities — click Add to add to board
            </div>
            <button
              onClick={() => { setActivityResults([]); setQ(""); setOpen(false); }}
              style={{ fontFamily: sans, fontSize: 11, color: M.gray4, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Clear
            </button>
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
            {activityResults.map((act, i) => (
              <div
                key={act.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i === 0 ? `1px solid ${M.gray2}` : `1px solid ${M.gray2}`, background: M.white }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{act.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: M.black, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.title}</div>
                  <div style={{ fontSize: 12, color: M.gray4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.description}</div>
                  <div style={{ fontSize: 11, color: M.gray4, marginTop: 2 }}>
                    {act.category}{act.duration ? ` · ${act.duration}` : ''}{act.price === 0 ? ' · Free' : ` · $${act.price}/person`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onAddActivity) {
                      onAddActivity({ ...act, suggestedBy: 'AI Concierge' });
                      setActivityResults(r => r.filter(a => a.id !== act.id));
                    }
                  }}
                  style={{ background: M.red, color: M.white, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: sans, fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
