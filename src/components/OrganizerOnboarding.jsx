import { useState } from 'react';
import { M, sans, serif, HOTELS } from '../constants.js';
import { PrimaryBtn, GhostBtn } from './shared.jsx';

const STEPS = ['Welcome', 'Destination', 'Your Hotel', 'Flight Info', 'Group Setup', 'Share'];

const Input = ({ label, type = 'text', value, onChange, placeholder, required }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: 'block', fontFamily: sans, fontSize: 13, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}{required && <span style={{ color: M.red }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '12px 14px', border: `1.5px solid ${M.gray3}`,
        borderRadius: 8, fontFamily: sans, fontSize: 15, color: M.black,
        background: M.white, outline: 'none', transition: 'border-color 0.2s',
      }}
      onFocus={e => (e.target.style.borderColor = M.red)}
      onBlur={e => (e.target.style.borderColor = M.gray3)}
    />
  </div>
);

const StepIndicator = ({ current, total }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
    {STEPS.map((s, i) => (
      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: i < current ? M.green : i === current ? M.red : M.gray2,
          color: i <= current ? M.white : M.gray4, fontSize: 13, fontWeight: 700, fontFamily: sans,
          transition: 'all 0.3s',
        }}>
          {i < current ? '✓' : i + 1}
        </div>
        {i < total - 1 && <div style={{ width: 24, height: 2, background: i < current ? M.green : M.gray2, borderRadius: 1 }} />}
      </div>
    ))}
  </div>
);

export default function OrganizerOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    tripName: '',
    destination: '',
    startDate: '',
    endDate: '',
    hotel: null,
    notFlying: false,
    flightArrival: '',
    flightDeparture: '',
    airline: '',
    flightNum: '',
    groupName: '',
    organizerName: '',
    organizerEmail: '',
    estimatedRooms: '',
    notes: '',
  });
  const [copied, setCopied] = useState(false);
  const shareLink = `${window.location.origin}?trip=orlando-2026&ref=organizer`;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${M.red} 0%, ${M.redDark} 50%, #3a1010 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: sans }}>
      <div style={{ width: '100%', maxWidth: 600, background: M.white, borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: M.black, padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: M.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: M.white, fontSize: 16 }}>M</div>
          <div>
            <div style={{ color: M.white, fontWeight: 700, fontSize: 16 }}>Marriott Bonvoy</div>
            <div style={{ color: M.gray4, fontSize: 12 }}>CoVoyage</div>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(200,168,76,0.15)', color: M.gold, border: `1px solid ${M.gold}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
            ORGANIZER
          </div>
        </div>

        <div style={{ padding: '32px 40px' }}>
          <StepIndicator current={step} total={STEPS.length} />

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🌴</div>
              <h1 style={{ fontFamily: serif, fontSize: 30, color: M.black, marginBottom: 12 }}>Plan Your Trip</h1>
              <p style={{ color: M.gray5, fontSize: 16, lineHeight: 1.6, marginBottom: 32, maxWidth: 420, margin: '0 auto 32px' }}>
                You're the <strong>Trip Organizer</strong>. Set the destination, book the first room, and invite your crew — all in one place.
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Select destination', 'Book hotel', 'Add flight info', 'Share invite link'].map((s, i) => (
                  <div key={s} style={{ background: M.gray1, borderRadius: 20, padding: '6px 14px', fontSize: 13, color: M.gray5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: M.red, color: M.white, borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
              <PrimaryBtn onClick={next}>Start Planning →</PrimaryBtn>
            </div>
          )}

          {/* Step 1: Destination */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Set Your Destination</h2>
              <p style={{ color: M.gray5, marginBottom: 28, fontSize: 14 }}>This will be shared with all trip attendees.</p>
              <Input label="Trip Name" value={form.tripName} onChange={v => set('tripName', v)} placeholder="e.g. Family Summer Trip" required />
              <Input label="Destination" value={form.destination} onChange={v => set('destination', v)} placeholder="e.g. Orlando, FL" required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input label="Arrival Date" type="date" value={form.startDate} onChange={v => set('startDate', v)} required />
                <Input label="Departure Date" type="date" value={form.endDate} onChange={v => set('endDate', v)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <GhostBtn onClick={back}>Back</GhostBtn>
                <PrimaryBtn onClick={next} disabled={!form.tripName || !form.destination}>Continue →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* Step 2: Hotel */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Book Your Hotel Room</h2>
              <p style={{ color: M.gray5, marginBottom: 24, fontSize: 14 }}>Your attendees will see where you've booked and can book the same hotel or a nearby one.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {HOTELS.map(h => (
                  <div
                    key={h.id}
                    onClick={() => set('hotel', h.id)}
                    style={{
                      border: `2px solid ${form.hotel === h.id ? M.red : M.gray2}`,
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      background: form.hotel === h.id ? '#fff5f5' : M.white,
                      transition: 'all 0.2s', display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}
                  >
                    <img src={h.image} alt={h.name} style={{ width: 72, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: M.black }}>{h.name}</div>
                      <div style={{ fontSize: 12, color: M.gray4, marginBottom: 4 }}>{h.distance}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: M.red, fontSize: 15 }}>${h.rate}<span style={{ fontWeight: 400, fontSize: 12, color: M.gray4 }}>/night</span></span>
                        <span style={{ fontSize: 12, color: M.gray4, textDecoration: 'line-through' }}>${h.originalRate}</span>
                        <span style={{ fontSize: 11, color: M.gold, fontWeight: 600 }}>⭐ {h.stars}</span>
                      </div>
                    </div>
                    {form.hotel === h.id && <div style={{ color: M.red, fontSize: 20, flexShrink: 0 }}>✓</div>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <GhostBtn onClick={back}>Back</GhostBtn>
                <PrimaryBtn onClick={next} disabled={!form.hotel}>Continue →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* Step 3: Flight Info */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Your Travel Details</h2>
              <p style={{ color: M.gray5, marginBottom: 16, fontSize: 14 }}>Let others in your group know when you'll be arriving and departing for easier planning.</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer', fontSize: 14, color: M.black, fontFamily: sans, background: M.gray1, borderRadius: 10, padding: '12px 14px' }}>
                <input type="checkbox" checked={form.notFlying} onChange={e => set('notFlying', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: M.red }} />
                <span>I will not be flying to the destination</span>
              </label>
              {!form.notFlying && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Input label="Airline" value={form.airline} onChange={v => set('airline', v)} placeholder="e.g. Delta, United" />
                    <Input label="Flight #" value={form.flightNum} onChange={v => set('flightNum', v)} placeholder="e.g. DL 2204" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Input label="Arrival Date & Time" type="datetime-local" value={form.flightArrival} onChange={v => set('flightArrival', v)} />
                    <Input label="Departure Date & Time" type="datetime-local" value={form.flightDeparture} onChange={v => set('flightDeparture', v)} />
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <GhostBtn onClick={back}>Back</GhostBtn>
                <PrimaryBtn onClick={next}>Continue →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* Step 4: Group Setup */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Group Setup</h2>
              <p style={{ color: M.gray5, marginBottom: 28, fontSize: 14 }}>Tell us a bit about your group so we can customize the experience.</p>
              <Input label="Your Name" value={form.organizerName} onChange={v => set('organizerName', v)} placeholder="e.g. Sarah Martinez" required />
              <Input label="Your Email" type="email" value={form.organizerEmail} onChange={v => set('organizerEmail', v)} placeholder="sarah@example.com" required />
              <Input label="Group Name" value={form.groupName} onChange={v => set('groupName', v)} placeholder="e.g. The Martinez Family Crew" />
              <Input label="Expected Number of Rooms" type="number" value={form.estimatedRooms} onChange={v => set('estimatedRooms', v)} placeholder="e.g. 8" />
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontFamily: sans, fontSize: 13, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note to Group</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Add a welcome message or instructions for your group..."
                  rows={3}
                  style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 15, color: M.black, background: M.white, outline: 'none', resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = M.red)}
                  onBlur={e => (e.target.style.borderColor = M.gray3)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <GhostBtn onClick={back}>Back</GhostBtn>
                <PrimaryBtn onClick={next} disabled={!form.organizerName || !form.organizerEmail}>Generate Share Link →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* Step 5: Share */}
          {step === 5 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontFamily: serif, fontSize: 26, color: M.black, marginBottom: 8 }}>Your Trip is Ready!</h2>
              <p style={{ color: M.gray5, fontSize: 14, marginBottom: 28 }}>
                Share this link with your crew. They'll go through a guided setup to book rooms and add their flight details.
              </p>

              {/* Share Link Box */}
              <div style={{ background: M.gray1, border: `1.5px solid ${M.gray2}`, borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: M.black, wordBreak: 'break-all', textAlign: 'left' }}>{shareLink}</span>
                <button
                  onClick={copyLink}
                  style={{ background: copied ? M.green : M.red, color: M.white, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: sans, whiteSpace: 'nowrap', transition: 'background 0.3s' }}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>

              {/* Summary Card */}
              <div style={{ background: M.gray1, borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: M.black, marginBottom: 12 }}>Trip Summary</div>
                {[
                  ['Destination', form.destination],
                  ['Dates', `${form.startDate} → ${form.endDate}`],
                  ['Hotel', HOTELS.find(h => h.id === form.hotel)?.name || '—'],
                  ['Organizer', form.organizerName],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${M.gray2}`, fontSize: 13 }}>
                    <span style={{ color: M.gray5 }}>{k}</span>
                    <span style={{ color: M.black, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              <PrimaryBtn onClick={() => onComplete(form.organizerName, form.hotel, form)} style={{ width: '100%' }}>Go to Trip Dashboard →</PrimaryBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
