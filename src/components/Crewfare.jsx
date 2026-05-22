import { useState, useEffect } from 'react';
import { M, sans, serif, TABS, ACTIVITIES, ITINERARY, HOTELS, MEMBERS, BUDGET_ITEMS, REWARDS, TRIP, MOCK_PHOTOS } from '../constants.js';
import { Av, SectionTitle, Tag, Card, PrimaryBtn, GhostBtn } from './shared.jsx';
import OrganizerOnboarding from './OrganizerOnboarding.jsx';
import AttendeeOnboarding from './AttendeeOnboarding.jsx';
import HomeTab from './tabs/HomeTab.jsx';
import ActivitiesTab from './tabs/ActivitiesTab.jsx';
import ItineraryTab from './tabs/ItineraryTab.jsx';
import MemoriesTab from './tabs/MemoriesTab.jsx';
import { useMembers, useHotels, useActivities } from '../hooks/useDatabase.js';

// Palette of colors for new attendees added dynamically
const AVATAR_COLORS = ['#E91E63','#9C27B0','#3F51B5','#00BCD4','#FF5722','#795548','#607D8B','#FF9800'];

// ─── App-level state & routing ────────────────────────────────────────────────
export default function Crewfare() {
  // Determine initial view from URL params
  const params = new URLSearchParams(window.location.search);
  const isAttendeeLink = params.has('trip') && params.has('ref');
  const skipOnboarding = params.get('skip') === '1';

  const [view, setView] = useState(() => {
    if (skipOnboarding) return 'app';
    if (isAttendeeLink) return 'attendee-onboarding';
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState('home');
  const [itinerary, setItinerary] = useState(ITINERARY);

  // ── Database-synchronized state ────────────────────────────────────────
  const { members, addMember, updateMember } = useMembers();
  const { hotels, updateHotel } = useHotels();
  const { activities, updateActivity } = useActivities();

  // ── Local UI state ─────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState('You');

  // Book a room: add attendee name to hotel.bookedBy and update/add member record
  const handleBookRoom = async (hotelId, userName) => {
    const name = (typeof userName === 'string' ? userName : '').trim() || currentUser;
    const hotelName = (hotels.find(h => h.id === hotelId) || HOTELS.find(h => h.id === hotelId))?.name || '';

    console.log('[handleBookRoom] called with:', { hotelId, userName, resolvedName: name, hotelName });

    // Update hotel's bookedBy list (no duplicates) and save to database
    const hotel = hotels.find(h => h.id === hotelId) || HOTELS.find(h => h.id === hotelId);
    if (hotel && !hotel.bookedBy.includes(name)) {
      await updateHotel(hotelId, { ...hotel, bookedBy: [...hotel.bookedBy, name] });
      console.log('[handleBookRoom] hotel updated:', hotelId);
    }

    // Add or update member — always run so Hotels tab booking also adds to crew list
    const existingMember = members.find(m => m.name === name);
    if (existingMember) {
      await updateMember(existingMember.id, { hotel: hotelName || existingMember.hotel, confirmed: true });
      console.log('[handleBookRoom] member updated:', name);
    } else {
      const colorIdx = members.length % AVATAR_COLORS.length;
      const newMember = {
        id:       `m-${Date.now()}`,
        name,
        initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        color:    AVATAR_COLORS[colorIdx],
        role:     'attendee',
        hotel:    hotelName,
        confirmed: true,
      };
      await addMember(newMember);
      console.log('[handleBookRoom] NEW member added:', newMember);
    }
  };

  // ── Activity actions ──────────────────────────────────────────────────────
  // Sort happens at render time — upvote/downvote just update counts
  const handleUpvote = (id) => {
    const activity = activities.find(a => a.id === id);
    if (activity) {
      const voters = activity.voters.includes(currentUser) ? activity.voters : [...activity.voters, currentUser];
      updateActivity(id, { upvotes: activity.upvotes + 1, voters });
    }
  };

  const handleDownvote = (id) => {
    const activity = activities.find(a => a.id === id);
    if (activity) {
      updateActivity(id, { downvotes: activity.downvotes + 1 });
    }
  };

  const handleCommentAdd = (id, text) => {
    const activity = activities.find(a => a.id === id);
    if (activity) {
      updateActivity(id, { comments: [...activity.comments, { user: currentUser, text, time: 'just now' }] });
    }
  };

  const handleBook = (id) => {
    const activity = activities.find(a => a.id === id);
    if (activity) {
      updateActivity(id, { booked: true });
    }
  };

  // ── Itinerary actions ─────────────────────────────────────────────────────
  const handleAddEvent = (event) => {
    setItinerary(prev => prev.map(day =>
      day.date === event.date
        ? { ...day, items: [...day.items, { ...event, id: `custom-${Date.now()}` }] }
        : day
    ));
  };

  if (view === 'landing') return <LandingPage onOrganizer={() => setView('organizer-onboarding')} onAttendee={() => setView('attendee-onboarding')} />;

  if (view === 'organizer-onboarding') return <OrganizerOnboarding onComplete={async (name) => {
    if (name) {
      setCurrentUser(name);
      // Add organizer to members if not already present
      const exists = members.some(m => m.name === name);
      if (!exists) {
        await addMember({
          id: `m-org-${Date.now()}`, name,
          initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
          color: AVATAR_COLORS[0], role: 'organizer', hotel: '', confirmed: true,
        });
      }
    }
    setView('app');
  }} />;

  if (view === 'attendee-onboarding') return <AttendeeOnboarding onComplete={async (name, hotelId) => {
    const safeName = typeof name === 'string' ? name.trim() : '';
    console.log('[AttendeeOnboarding onComplete] name:', name, '| hotelId:', hotelId, '| safeName:', safeName);
    if (safeName) {
      setCurrentUser(safeName);
      // Always add the attendee to members, then optionally book a room
      const existingMember = members.find(m => m.name === safeName);
      if (existingMember) {
        const hotelName = (HOTELS.find(h => h.id === hotelId) || hotels.find(h => h.id === hotelId))?.name || '';
        await updateMember(existingMember.id, { hotel: hotelName || existingMember.hotel, confirmed: true });
        console.log('[onComplete] updated existing member:', safeName);
      } else {
        const hotelName = (HOTELS.find(h => h.id === hotelId) || hotels.find(h => h.id === hotelId))?.name || '';
        const colorIdx = members.length % AVATAR_COLORS.length;
        const newMember = {
          id: `m-att-${Date.now()}`, name: safeName,
          initials: safeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
          color: AVATAR_COLORS[colorIdx], role: 'attendee', hotel: hotelName, confirmed: true,
        };
        await addMember(newMember);
        console.log('[onComplete] NEW member added:', newMember);
      }
    } else {
      console.warn('[onComplete] safeName is empty — member NOT added. Raw name was:', name);
    }
    if (hotelId && safeName) await handleBookRoom(hotelId, safeName);
    setView('app');
  }} />;

  // ─── Main App ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: M.gray1, fontFamily: sans, maxWidth: 700, margin: '0 auto', boxShadow: '0 0 40px rgba(0,0,0,0.1)' }}>
      {/* Sticky Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: M.black, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        {/* Brand bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: M.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: M.white, fontSize: 15 }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: M.white, fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{TRIP.name}</div>
            <div style={{ color: M.gray4, fontSize: 11 }}>📍 {TRIP.destination} · {TRIP.startDate} – {TRIP.endDate}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {members.slice(0, 4).map(m => <Av key={m.id} name={m.name} color={m.color} size={28} />)}
            {members.length > 4 && <div style={{ width: 28, height: 28, borderRadius: '50%', background: M.gray5, color: M.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>+{members.length - 4}</div>}
          </div>
        </div>

        {/* Tab Nav */}
        <div style={{ display: 'flex', overflowX: 'auto', padding: '0 6px 0', scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 10px 10px', fontFamily: sans, fontSize: 12, fontWeight: 600,
                color: activeTab === t.id ? M.white : M.gray5,
                borderBottom: `3px solid ${activeTab === t.id ? M.red : 'transparent'}`,
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'home' && (
          <HomeTab
            activities={activities}
            hotels={hotels}
            members={members}
            onUpvote={handleUpvote}
            onDownvote={handleDownvote}
            onCommentAdd={handleCommentAdd}
          />
        )}
        {activeTab === 'hotels' && <HotelsTab hotels={hotels} members={members} onBookRoom={handleBookRoom} currentUser={currentUser} />}
        {activeTab === 'activities' && (
          <ActivitiesTab
            activities={activities}
            onUpvote={handleUpvote}
            onDownvote={handleDownvote}
            onCommentAdd={handleCommentAdd}
            onBook={handleBook}
          />
        )}
        {activeTab === 'itinerary' && (
          <ItineraryTab
            itinerary={itinerary}
            members={members}
            onAddEvent={handleAddEvent}
          />
        )}
        {activeTab === 'budget' && <BudgetTab />}
        {activeTab === 'memories' && <MemoriesTab photos={MOCK_PHOTOS} />}
        {activeTab === 'invite' && <InviteTab members={members} />}
      </div>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({ onOrganizer, onAttendee }) {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${M.black} 0%, #1a0505 40%, ${M.redDark} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: sans }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: M.red, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, fontWeight: 900, color: M.white, boxShadow: '0 8px 32px rgba(168,38,42,0.6)' }}>M</div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Marriott Bonvoy</div>
        <h1 style={{ fontFamily: serif, fontSize: 38, color: M.white, fontWeight: 400, marginBottom: 12, lineHeight: 1.2 }}>Group Trip Planner</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.7, marginBottom: 44 }}>Plan, collaborate, and book your group adventure — all in one beautiful microsite.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={onOrganizer}
            style={{ background: M.red, color: M.white, border: 'none', borderRadius: 12, padding: '18px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: sans, transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(168,38,42,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.background = M.redDark; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = M.red; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            🗺 I'm Planning a Trip
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>Create a microsite & invite your crew</div>
          </button>

          <button
            onClick={onAttendee}
            style={{ background: 'rgba(255,255,255,0.1)', color: M.white, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '18px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: sans, transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            ✈️ I Was Invited to a Trip
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>Join the group microsite</div>
          </button>
        </div>

        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
          {[['🏨', 'Hotel booking'], ['🎯', 'Activity planning'], ['📅', 'Group itinerary'], ['💬', 'Collaborate']].map(([icon, label]) => (
            <div key={label} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Hotels Tab ───────────────────────────────────────────────────────────────
function HotelsTab({ hotels, members, onBookRoom, currentUser }) {
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [bookerName, setBookerName] = useState('');
  const [confNum, setConfNum] = useState('');
  const bookedRooms = hotels.reduce((acc, h) => acc + h.bookedBy.length, 0);

  const openBooking = (h) => {
    setSelectedHotel(h);
    setBookingStep(0);
    setBookerName(currentUser !== 'You' ? currentUser : '');
    setConfNum(Math.random().toString(36).slice(2, 10).toUpperCase());
  };

  const confirmBook = () => {
    onBookRoom(selectedHotel.id, bookerName || currentUser);
    setBookingStep(1);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ background: M.black, padding: '20px 20px 16px' }}>
        <h2 style={{ fontFamily: serif, color: M.white, fontSize: 22, marginBottom: 4 }}>Hotels</h2>
        <p style={{ color: M.gray4, fontSize: 13 }}>
          {bookedRooms} of {TRIP.discountRooms} rooms booked · {Math.max(0, TRIP.discountRooms - bookedRooms)} more for {TRIP.discountPct}% group discount
        </p>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, height: 6, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((bookedRooms / TRIP.discountRooms) * 100, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${M.red}, ${M.gold})`, borderRadius: 20, transition: 'width 0.6s ease' }} />
        </div>
        {bookedRooms >= TRIP.discountRooms && (
          <div style={{ marginTop: 8, fontSize: 12, color: M.gold, fontWeight: 700 }}>🎉 Group discount unlocked! {TRIP.discountPct}% off all rooms.</div>
        )}
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {hotels.map(h => (
          <Card key={h.id} highlight={h.highlight} style={{ padding: 0, overflow: 'hidden' }}>
            {h.highlight && <div style={{ background: `linear-gradient(90deg, ${M.gold}, #e8c55a)`, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: '#5a3e00' }}>★ Organizer's Hotel</div>}
            <img src={h.image} alt={h.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: M.black, marginBottom: 4 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: M.gray4, marginBottom: 6 }}>📍 {h.distance}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {h.amenities.slice(0, 4).map(a => <Tag key={a} label={a} color={M.teal} />)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: M.red }}>${h.rate}</div>
                  <div style={{ fontSize: 11, color: M.gray4, textDecoration: 'line-through' }}>${h.originalRate}</div>
                  <div style={{ fontSize: 11, color: M.gold }}>⭐ {h.stars} · {h.bonvoyPts.toLocaleString()} pts/night</div>
                </div>
              </div>
              {/* Live bookedBy list */}
              {h.bookedBy.length > 0 && (
                <div style={{ margin: '12px 0 4px' }}>
                  <div style={{ fontSize: 12, color: M.gray5, marginBottom: 6 }}>
                    {h.bookedBy.length} room{h.bookedBy.length !== 1 ? 's' : ''} booked:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {h.bookedBy.map(name => {
                      const m = members.find(m => m.name === name);
                      return (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Av name={name} size={26} color={m?.color} />
                          <span style={{ fontSize: 12, color: M.gray5 }}>{name.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <PrimaryBtn style={{ marginTop: 12, width: '100%' }} onClick={() => openBooking(h)}>
                Book This Room
              </PrimaryBtn>
            </div>
          </Card>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedHotel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: M.white, borderRadius: 16, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {bookingStep === 0 && (
              <>
                <h3 style={{ fontFamily: serif, fontSize: 20, marginBottom: 6 }}>Confirm Booking</h3>
                <p style={{ color: M.gray5, fontSize: 14, marginBottom: 16 }}>{selectedHotel.name}</p>
                {/* Name input */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Your Name <span style={{ color: M.red }}>*</span>
                  </label>
                  <input
                    value={bookerName}
                    onChange={e => setBookerName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    style={{ width: '100%', padding: '11px 13px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = M.red)}
                    onBlur={e => (e.target.style.borderColor = M.gray3)}
                  />
                </div>
                <div style={{ background: M.gray1, borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  {[
                    ['Check-in',        TRIP.startDate],
                    ['Check-out',       TRIP.endDate],
                    ['Rate',            `$${selectedHotel.rate}/night`],
                    ['Total (6 nights)',`$${selectedHotel.rate * 6}`],
                    ['Bonvoy Points',   `${(selectedHotel.bonvoyPts * 6).toLocaleString()} pts`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: `1px solid ${M.gray2}` }}>
                      <span style={{ color: M.gray5 }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <GhostBtn onClick={() => setSelectedHotel(null)}>Cancel</GhostBtn>
                  <PrimaryBtn style={{ flex: 1 }} disabled={!bookerName.trim()} onClick={confirmBook}>Confirm & Book</PrimaryBtn>
                </div>
              </>
            )}
            {bookingStep === 1 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontFamily: serif, fontSize: 22, color: M.black, marginBottom: 8 }}>Room Booked!</h3>
                <p style={{ color: M.gray5, fontSize: 14, marginBottom: 4 }}>{selectedHotel.name}</p>
                <p style={{ color: M.gray5, fontSize: 14, marginBottom: 4 }}>Booked for: <strong>{bookerName}</strong></p>
                <p style={{ color: M.gray4, fontSize: 13, marginBottom: 24 }}>Confirmation #{confNum}</p>
                <PrimaryBtn style={{ width: '100%' }} onClick={() => { setSelectedHotel(null); setBookingStep(0); }}>Done</PrimaryBtn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Budget Tab ───────────────────────────────────────────────────────────────
function BudgetTab() {
  const total = BUDGET_ITEMS.reduce((s, b) => s + b.amount, 0);
  const committed = BUDGET_ITEMS.filter(b => b.committed).reduce((s, b) => s + b.amount, 0);
  const pct = Math.min((committed / total) * 100, 100);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ background: M.black, padding: '20px 20px 16px' }}>
        <h2 style={{ fontFamily: serif, color: M.white, fontSize: 22, marginBottom: 4 }}>Group Budget</h2>
        <p style={{ color: M.gray4, fontSize: 13 }}>{TRIP.destination} · {TRIP.startDate} – {TRIP.endDate}</p>
      </div>
      <div style={{ padding: 20 }}>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Estimated', val: `$${total.toLocaleString()}`, color: M.black },
            { label: 'Committed', val: `$${committed.toLocaleString()}`, color: M.red },
            { label: 'Remaining', val: `$${(total - committed).toLocaleString()}`, color: M.green },
            { label: 'Per Person (~18)', val: `$${Math.round(total / 18).toLocaleString()}`, color: M.teal },
          ].map(({ label, val, color }) => (
            <Card key={label} style={{ textAlign: 'center', padding: '14px 10px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 11, color: M.gray5, marginTop: 2 }}>{label}</div>
            </Card>
          ))}
        </div>

        <Card>
          <SectionTitle>Budget Breakdown</SectionTitle>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BUDGET_ITEMS.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${M.gray2}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: M.black }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: M.gray4, marginTop: 2 }}>
                    <Tag label={b.category} color={M.gray4} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: M.black }}>${b.amount.toLocaleString()}</div>
                  {b.committed
                    ? <div style={{ fontSize: 11, color: M.green, fontWeight: 600 }}>✓ Committed</div>
                    : <div style={{ fontSize: 11, color: M.gray4 }}>Estimated</div>
                  }
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ marginTop: 16, background: '#fffdf2', border: `1.5px solid ${M.gold}` }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: M.black, marginBottom: 4 }}>Marriott Bonvoy Savings</div>
              <div style={{ fontSize: 13, color: M.gray5, lineHeight: 1.6 }}>
                With {TRIP.families} families booking through Bonvoy, you could earn up to <strong style={{ color: M.gold }}>{TRIP.bonvoyPts.toLocaleString()} points</strong> total — redeemable for future free nights.
                {' '}Reaching the 10-room milestone unlocks an additional <strong style={{ color: M.red }}>{TRIP.discountPct}% group discount</strong>.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Invite Tab ───────────────────────────────────────────────────────────────
function InviteTab({ members }) {
  const [copied, setCopied] = useState(false);
  const shareLink = `${window.location.origin}?trip=orlando-2026&ref=organizer`;

  const copy = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ padding: '20px 20px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>✉️</div>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Invite Your Crew</h2>
        <p style={{ color: M.gray5, fontSize: 14 }}>Share this link. Your guests will go through a guided onboarding to book their room and add their travel info.</p>
      </div>

      <div style={{ background: M.gray1, border: `1.5px solid ${M.gray2}`, borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: M.black, wordBreak: 'break-all' }}>{shareLink}</span>
        <button
          onClick={copy}
          style={{ background: copied ? M.green : M.red, color: M.white, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: sans, whiteSpace: 'nowrap', transition: 'background 0.3s' }}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      {/* Crew list */}
      <Card>
        <SectionTitle>👥 Current Crew ({members.length} members)</SectionTitle>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${M.gray2}` }}>
              <Av name={m.name} color={m.color} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: M.black }}>{m.name}</div>
                <div style={{ fontSize: 12, color: M.gray4 }}>{m.hotel || 'No hotel booked yet'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {m.role === 'organizer' && <Tag label="Organizer" color={M.red} />}
                {m.confirmed
                  ? <span style={{ fontSize: 11, background: '#e8f5e9', color: M.green, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>✓ Joined</span>
                  : <span style={{ fontSize: 11, background: M.gray1, color: M.gray4, borderRadius: 20, padding: '2px 8px' }}>Pending</span>
                }
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Share options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        {[
          { icon: '📧', label: 'Email', color: '#4285f4' },
          { icon: '💬', label: 'Text Message', color: M.green },
          { icon: '📱', label: 'WhatsApp', color: '#25d366' },
          { icon: '🔗', label: 'Copy Link', color: M.gray5, action: copy },
        ].map(({ icon, label, color, action }) => (
          <button
            key={label}
            onClick={action}
            style={{ background: M.white, border: `1.5px solid ${M.gray2}`, borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontFamily: sans, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, color: M.black, fontWeight: 600, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = M.gray2; e.currentTarget.style.color = M.black; }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
