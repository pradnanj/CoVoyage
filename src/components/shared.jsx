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
export function AISearch({ context = "", placeholder = "Ask me anything about your trip…" }) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const SUGGESTIONS = [
    "Best hotel activities for kids in Orlando?",
    "Which activities are free or under $20?",
    "What should we do on a rainy day?",
    "How do we maximize Bonvoy points?",
    "Best restaurants for a group of 18?",
    "How far is Disney from the Marriott World Center?",
  ];

  async function ask(question) {
    if (!question.trim()) return;
    setLoading(true); setAns(null); setOpen(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: `You are the Marriott Bonvoy AI Concierge for Crewfare, a group trip planning app.
Group: 5 families, 18 travelers, visiting Orlando FL Jul 12–18 2026.
Staying primarily at Orlando World Center Marriott ($289/nt, hotel shuttle to Disney).
Nearby: Disney World, Universal Studios, Kennedy Space Center, Cocoa Beach, SeaWorld.
On-site: Pool complex, Mikado restaurant (teppanyaki), Spa, Kids Club.
${context}
IMPORTANT: Prioritize activities AT or offered by the Marriott World Center (pool, spa, restaurants, shuttle, kids club) and mention them first. Then cover nearby attractions.
Respond in 2–4 sentences. Be specific with names, prices, and Bonvoy tips.`,
          messages: [{ role: "user", content: question }],
        }),
      });
      const data = await res.json();
      setAns(data.content?.[0]?.text || FALLBACK);
    } catch {
      setAns(FALLBACK);
    }
    setLoading(false);
  }

  const FALLBACK = "The Marriott World Center's pool complex is perfect for a family day — free for hotel guests with a kids splash zone, waterslide, and swim-up bar. For off-property, Disney World's Magic Kingdom ($109/person) is a 10-min shuttle ride and the most popular pick with the group right now.";

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
                onClick={() => { setAns(null); setQ(""); setOpen(false); }}
                style={{ fontFamily: sans, fontSize: 11, color: M.gray4, background: "none", border: "none", cursor: "pointer", marginTop: 8, textDecoration: "underline" }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
