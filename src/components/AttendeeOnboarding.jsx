import { useState } from 'react';
import { M, sans, serif, HOTELS, MEMBERS, TRIP } from '../constants.js';
import { PrimaryBtn, GhostBtn } from './shared.jsx';

const STEPS = ['Welcome', 'Sign In', 'Your Room', 'Book Hotel', 'Flight Info', 'All Set!'];

const Input = ({ label, type = 'text', value, onChange, placeholder, required, half }) => (
  <div style={{ marginBottom: 16, flex: half ? '1 1 calc(50% - 8px)' : '1 1 100%' }}>
    <label style={{ display: 'block', fontFamily: sans, fontSize: 13, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}{required && <span style={{ color: M.red }}> *</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 15, color: M.black, background: M.white, outline: 'none' }}
      onFocus={e => (e.target.style.borderColor = M.red)}
      onBlur={e => (e.target.style.borderColor = M.gray3)}
    />
  </div>
);

const StepBar = ({ current }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{ display: 'flex', gap: 4 }}>
      {STEPS.map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= current ? M.red : M.gray2, transition: 'background 0.4s' }} />
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
      <span style={{ fontFamily: sans, fontSize: 12, color: M.gray4 }}>Step {current + 1} of {STEPS.length}</span>
      <span style={{ fontFamily: sans, fontSize: 12, color: M.red, fontWeight: 600 }}>{STEPS[current]}</span>
    </div>
  </div>
);

export default function AttendeeOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    signInMethod: '',
    guests: [{ name: '', isChild: false, age: '' }],
    hotel: null,
    airline: '',
    flightNum: '',
    flightArrival: '',
    flightDeparture: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addGuest = () => set('guests', [...form.guests, { name: '', isChild: false, age: '' }]);
  const updateGuest = (i, field, val) => {
    const updated = [...form.guests];
    updated[i] = { ...updated[i], [field]: val };
    set('guests', updated);
  };
  const removeGuest = i => set('guests', form.guests.filter((_, j) => j !== i));

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const bookedRooms = HOTELS.reduce((acc, h) => acc + h.bookedBy.length, 0);
  const totalNeeded = TRIP.discountRooms;

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, #1a3a5c 0%, #0d2340 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: sans }}>
      <div style={{ width: '100%', maxWidth: 580, background: M.white, borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: M.black, padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: M.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: M.white, fontSize: 16 }}>M</div>
          <div>
            <div style={{ color: M.white, fontWeight: 700, fontSize: 16 }}>Marriott Bonvoy</div>
            <div style={{ color: M.gray4, fontSize: 12 }}>Group Trip Planner</div>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(0,107,107,0.3)', color: '#4dd', border: '1px solid rgba(0,200,200,0.4)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
            ATTENDEE
          </div>
        </div>

        <div style={{ padding: '28px 36px' }}>
          <StepBar current={step} />

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎡</div>
              <h1 style={{ fontFamily: serif, fontSize: 28, color: M.black, marginBottom: 10 }}>You're Invited!</h1>
              <div style={{ display: 'inline-block', background: '#fff5f5', border: `1.5px solid #fdd`, borderRadius: 12, padding: '12px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: M.gray5, marginBottom: 4 }}>Trip Organizer</div>
                <div style={{ fontWeight: 700, color: M.black, fontSize: 15 }}>Sarah M.</div>
                <div style={{ color: M.red, fontWeight: 700, fontSize: 17 }}>{TRIP.name}</div>
                <div style={{ color: M.gray5, fontSize: 13 }}>{TRIP.destination} · {TRIP.startDate} – {TRIP.endDate}</div>
              </div>
              <p style={{ color: M.gray5, fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
                Collaborate with your crew, book a room at the group hotel, add your flight details, and help plan the ultimate trip — together.
              </p>

              {/* Group Discount Bar */}
              <div style={{ background: M.gray1, borderRadius: 12, padding: '14px 18px', marginBottom: 28, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: M.black }}>🎁 Group Discount Progress</span>
                  <span style={{ fontSize: 13, color: M.red, fontWeight: 700 }}>{bookedRooms}/{totalNeeded} rooms</span>
                </div>
                <div style={{ background: M.gray2, borderRadius: 20, height: 8 }}>
                  <div style={{ width: `${Math.min((bookedRooms / totalNeeded) * 100, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${M.red}, ${M.gold})`, borderRadius: 20, transition: 'width 0.6s' }} />
                </div>
                <div style={{ fontSize: 12, color: M.gray5, marginTop: 6 }}>Book {totalNeeded - bookedRooms} more rooms to unlock <strong style={{ color: M.red }}>{TRIP.discountPct}% off</strong> for everyone!</div>
              </div>

              <PrimaryBtn onClick={next}>Get Started →</PrimaryBtn>
            </div>
          )}

          {/* Step 1: Sign In */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Sign In to Join</h2>
              <p style={{ color: M.gray5, marginBottom: 24, fontSize: 14 }}>Sign in with Marriott Bonvoy to earn points on your booking.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {[
                  { id: 'bonvoy', label: '🏨 Continue with Marriott Bonvoy', color: M.red, text: M.white },
                  { id: 'google', label: '🔵 Continue with Google',          color: M.white, text: M.black, border: M.gray3 },
                  { id: 'apple',  label: '🍎 Continue with Apple',           color: M.black, text: M.white },
                ].map(btn => (
                  <button
                    key={btn.id}
                    onClick={() => { set('signInMethod', btn.id); }}
                    style={{
                      padding: '13px 20px', borderRadius: 10, border: `1.5px solid ${btn.border || 'transparent'}`,
                      background: form.signInMethod === btn.id ? (btn.id === 'bonvoy' ? M.redDark : btn.color) : btn.color,
                      color: btn.text, fontFamily: sans, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
                      outline: form.signInMethod === btn.id ? `2px solid ${M.gold}` : 'none',
                    }}
                  >
                    {btn.label}
                    {form.signInMethod === btn.id && <span>✓</span>}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                <Input label="First Name" value={form.firstName} onChange={v => set('firstName', v)} required half />
                <Input label="Last Name" value={form.lastName} onChange={v => set('lastName', v)} required half />
              </div>
              <Input label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="you@example.com" required />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <GhostBtn onClick={back}>Back</GhostBtn>
                <PrimaryBtn onClick={next} disabled={!form.firstName || !form.lastName || !form.email || !form.signInMethod}>Continue →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* Step 2: Room Guests */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Who's Staying in Your Room?</h2>
              <p style={{ color: M.gray5, marginBottom: 24, fontSize: 14 }}>Enter names and ages of all guests. Children's ages help us tailor activity recommendations.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {form.guests.map((g, i) => (
                  <div key={i} style={{ background: M.gray1, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: M.black }}>Guest {i + 1}</span>
                      {i > 0 && (
                        <button onClick={() => removeGuest(i)} style={{ background: 'none', border: 'none', color: M.gray4, cursor: 'pointer', fontSize: 18 }}>×</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 180px' }}>
                        <input
                          value={g.name}
                          onChange={e => updateGuest(i, 'name', e.target.value)}
                          placeholder={i === 0 ? `${form.firstName} ${form.lastName}` : 'Full name'}
                          style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '0 0 auto' }}>
                        <label style={{ fontSize: 13, color: M.gray5, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={g.isChild} onChange={e => updateGuest(i, 'isChild', e.target.checked)} />
                          Child
                        </label>
                        {g.isChild && (
                          <input
                            type="number"
                            value={g.age}
                            onChange={e => updateGuest(i, 'age', e.target.value)}
                            placeholder="Age"
                            min={0}
                            max={17}
                            style={{ width: 64, padding: '8px 10px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addGuest} style={{ background: 'none', border: `1.5px dashed ${M.gray3}`, borderRadius: 10, width: '100%', padding: 12, color: M.gray4, cursor: 'pointer', fontFamily: sans, fontSize: 14, marginBottom: 24 }}>
                + Add another guest
              </button>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <GhostBtn onClick={back}>Back</GhostBtn>
                <PrimaryBtn onClick={next}>Continue →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* Step 3: Book Hotel */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 4 }}>Book Your Room</h2>
              <p style={{ color: M.gray5, marginBottom: 6, fontSize: 14 }}>Dates: <strong>{TRIP.startDate} – {TRIP.endDate}</strong> (set by organizer)</p>

              {/* Group Discount Bar */}
              <div style={{ background: '#fff5f5', border: `1px solid #fdd`, borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
                <strong style={{ color: M.red }}>🎁 {bookedRooms} of {totalNeeded} rooms booked</strong>
                <span style={{ color: M.gray5 }}> — {totalNeeded - bookedRooms} more needed for {TRIP.discountPct}% group discount!</span>
              </div>

              {/* Who booked where */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: M.gray5, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Crew's Hotels</div>
                {MEMBERS.filter(m => m.confirmed).map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.color, color: M.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{m.initials}</div>
                    <span style={{ color: M.black, fontWeight: 600 }}>{m.name}</span>
                    <span style={{ color: M.gray4 }}>→</span>
                    <span style={{ color: M.gray5 }}>{m.hotel}</span>
                    {m.role === 'organizer' && <span style={{ background: '#fff5f5', color: M.red, border: `1px solid #fdd`, borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>ORGANIZER</span>}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {HOTELS.map(h => (
                  <div
                    key={h.id}
                    onClick={() => set('hotel', h.id)}
                    style={{
                      border: `2px solid ${form.hotel === h.id ? M.red : h.highlight ? M.gold : M.gray2}`,
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      background: form.hotel === h.id ? '#fff5f5' : h.highlight ? '#fffdf2' : M.white,
                      transition: 'all 0.2s', display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative',
                    }}
                  >
                    {h.highlight && (
                      <div style={{ position: 'absolute', top: -1, left: 12, background: M.gold, color: M.white, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: '0 0 6px 6px' }}>
                        ★ Organizer's Hotel
                      </div>
                    )}
                    <img src={h.image} alt={h.name} style={{ width: 68, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0, marginTop: h.highlight ? 8 : 0 }} />
                    <div style={{ flex: 1, marginTop: h.highlight ? 8 : 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: M.black }}>{h.name}</div>
                      <div style={{ fontSize: 12, color: M.gray4, marginBottom: 4 }}>{h.distance}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: M.red, fontSize: 15 }}>${h.rate}<span style={{ fontWeight: 400, fontSize: 11, color: M.gray4 }}>/night</span></span>
                        <span style={{ fontSize: 12, color: M.gray4, textDecoration: 'line-through' }}>${h.originalRate}</span>
                        {h.bookedBy.length > 0 && <span style={{ fontSize: 11, background: M.gray1, borderRadius: 10, padding: '2px 8px', color: M.gray5 }}>{h.bookedBy.length} crew member{h.bookedBy.length !== 1 ? 's' : ''} here</span>}
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

          {/* Step 4: Flight Info */}
          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Your Travel Details</h2>
              <p style={{ color: M.gray5, marginBottom: 24, fontSize: 14 }}>Share your arrival and departure info to help the group coordinate shuttles and plans.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
                <Input label="Airline" value={form.airline} onChange={v => set('airline', v)} placeholder="e.g. Delta" half />
                <Input label="Flight #" value={form.flightNum} onChange={v => set('flightNum', v)} placeholder="e.g. DL 2204" half />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <Input label="Arrival Date & Time" type="datetime-local" value={form.flightArrival} onChange={v => set('flightArrival', v)} half />
                <Input label="Departure Date & Time" type="datetime-local" value={form.flightDeparture} onChange={v => set('flightDeparture', v)} half />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <GhostBtn onClick={back}>Back</GhostBtn>
                <PrimaryBtn onClick={next}>Continue →</PrimaryBtn>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🌴</div>
              <h2 style={{ fontFamily: serif, fontSize: 26, color: M.black, marginBottom: 8 }}>You're All Set, {form.firstName}!</h2>
              <p style={{ color: M.gray5, fontSize: 14, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
                You've joined the <strong>{TRIP.name}</strong>. Head to the trip dashboard to explore activities, check the itinerary, and collaborate with your crew.
              </p>

              {/* Confirmation summary */}
              <div style={{ background: M.gray1, borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 24 }}>
                {[
                  ['Hotel', HOTELS.find(h => h.id === form.hotel)?.name || '—'],
                  ['Room Guests', form.guests.map(g => g.name || form.firstName).join(', ')],
                  ['Flight', form.airline && form.flightNum ? `${form.airline} ${form.flightNum}` : 'Not entered'],
                  ['Arrival', form.flightArrival ? form.flightArrival.replace('T', ' ') : 'Not entered'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${M.gray2}`, fontSize: 13 }}>
                    <span style={{ color: M.gray5 }}>{k}</span>
                    <span style={{ color: M.black, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                  </div>
                ))}
              </div>

              <PrimaryBtn onClick={() => onComplete(`${form.firstName} ${form.lastName}`.trim(), form.hotel)} style={{ width: '100%' }}>Go to Trip Dashboard →</PrimaryBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
