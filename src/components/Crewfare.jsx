import { useState, useEffect, useRef } from 'react';
import { M, sans, serif, TABS, ITINERARY, HOTELS, MEMBERS, TRIP, MOCK_PHOTOS } from '../constants.js';
import { Av, SectionTitle, Tag, Card, PrimaryBtn, GhostBtn } from './shared.jsx';
import OrganizerOnboarding from './OrganizerOnboarding.jsx';
import AttendeeOnboarding from './AttendeeOnboarding.jsx';
import HomeTab from './tabs/HomeTab.jsx';
import ActivitiesTab from './tabs/ActivitiesTab.jsx';
import ItineraryTab from './tabs/ItineraryTab.jsx';
import MemoriesTab from './tabs/MemoriesTab.jsx';
import { useMembers, useHotels, useActivities } from '../hooks/useDatabase.js';
import { geocodeCity } from '../services/locations.js';
import { fetchMarriottHotels } from '../services/marriottHotels.js';
import { saveTrip, getTrip, resetAllData } from '../services/database.js';

// Palette of colors for new attendees added dynamically
const AVATAR_COLORS = ['#E91E63','#9C27B0','#3F51B5','#00BCD4','#FF5722','#795548','#607D8B','#FF9800'];

// ─── App-level state & routing ────────────────────────────────────────────────
export default function Crewfare() {
  const params = new URLSearchParams(window.location.search);
  const isAttendeeLink = params.has('trip') && params.has('ref');
  const skipOnboarding = params.get('skip') === '1';

  // Restore session from sessionStorage
  const savedUser = sessionStorage.getItem('crewfare_user');
  const savedView = sessionStorage.getItem('crewfare_view');

  // If no active session AND not joining via invite link, wipe stale localStorage data so we always start fresh
  if (!savedUser && !isAttendeeLink) {
    ['crewfare_members', 'crewfare_hotels', 'crewfare_activities', 'crewfare_trips', 'crewfare_itinerary', 'crewfare_real_hotels'].forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('crewfare_trip');
  }

  const [view, setView] = useState(() => {
    if (skipOnboarding || (savedUser && savedView === 'app')) return 'app';
    if (isAttendeeLink) return 'attendee-welcome';
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState('home');
  const [pendingRole, setPendingRole] = useState(isAttendeeLink ? 'attendee' : 'organizer');
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetState, setResetState] = useState(null); // null | 'confirm' | 'running' | 'done'
  const [resetResult, setResetResult] = useState(null);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef(null);
  const [itinerary, setItinerary] = useState(() => {
    try {
      const saved = localStorage.getItem('crewfare_itinerary');
      return saved ? JSON.parse(saved) : ITINERARY;
    } catch { return ITINERARY; }
  });

  // Persist itinerary to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('crewfare_itinerary', JSON.stringify(itinerary));
  }, [itinerary]);

  // Trip info set by organizer during onboarding
  const savedTrip = (() => { try { return JSON.parse(sessionStorage.getItem('crewfare_trip') || localStorage.getItem('crewfare_trip') || 'null'); } catch { return null; } })();

  // If attendee arrived via invite link and we have their tripSlug but no full tripInfo yet,
  // attempt to load it from localStorage keyed by tripSlug
  const urlTripSlug = (() => { try { return new URLSearchParams(window.location.search).get('trip') || null; } catch { return null; } })();
  const tripInfoFromSlug = (() => {
    if (!urlTripSlug) return null;
    try { return JSON.parse(localStorage.getItem(`crewfare_trip_${urlTripSlug}`) || 'null'); } catch { return null; }
  })();

  const [tripInfo, setTripInfo] = useState(savedTrip || tripInfoFromSlug || {
    name: TRIP.name,
    destination: TRIP.destination,
    startDate: TRIP.startDate,
    endDate: TRIP.endDate,
    startISO: TRIP.startISO,
    endISO: TRIP.endISO,
  });

  // If attendee has a URL slug but no local trip info, try fetching from DB
  useEffect(() => {
    if (!urlTripSlug || (tripInfoFromSlug || savedTrip)) return;
    getTrip(urlTripSlug).then(async data => {
      if (data && data.destination) {
        const loaded = { ...data, tripSlug: urlTripSlug };
        setTripInfo(loaded);
        localStorage.setItem(`crewfare_trip_${urlTripSlug}`, JSON.stringify(loaded));
        // Also fetch real hotels for this destination so the attendee sees the same hotels
        if (data.destination && !localStorage.getItem('crewfare_real_hotels')) {
          try {
            const { geocodeCity } = await import('../services/locations.js');
            const { fetchMarriottHotels } = await import('../services/marriottHotels.js');
            const coords = await geocodeCity(data.destination);
            if (coords) {
              const fetched = await fetchMarriottHotels(coords.lat, coords.lng);
              if (fetched && fetched.length > 0) {
                localStorage.setItem('crewfare_real_hotels', JSON.stringify(fetched));
                setRealHotels(fetched);
              }
            }
          } catch {}
        }
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTripSlug]);

  // Derive a stable trip ID: URL param → saved tripSlug → default
  const tripId = urlTripSlug || tripInfo.tripSlug || import.meta.env.VITE_TRIP_ID || 'trip-2026';

  const { members, addMember, updateMember } = useMembers(tripId);
  const [realHotels, setRealHotels] = useState(() => {
    try {
      const saved = localStorage.getItem('crewfare_real_hotels');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const { hotels, updateHotel } = useHotels(realHotels, tripId);
  const { activities, addActivity, updateActivity } = useActivities(tripId);

  const [currentUser, setCurrentUser] = useState(savedUser || '');

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

  const handleBook = (activity, date, time) => {
    if (!activity) return;
    // Mark as booked in activities list
    updateActivity(activity.id, { booked: true });
    // Add to itinerary on the selected date
    const newItem = {
      id: `act-${activity.id}-${Date.now()}`,
      title: activity.title,
      type: 'activity',
      time: time || '10:00 AM',
      who: 'All',
      private: false,
      note: activity.description || '',
      emoji: activity.emoji || '✨',
    };
    const eventDate = date || '';
    if (!eventDate) return;
    setItinerary(prev => {
      const existing = prev.find(day => day.date === eventDate);
      if (existing) {
        return prev.map(day =>
          day.date === eventDate
            ? { ...day, items: [...day.items, newItem] }
            : day
        );
      }
      return [...prev, { date: eventDate, items: [newItem] }];
    });
  };

  // ── Itinerary actions ─────────────────────────────────────────────────────
  const handleAddEvent = (event) => {
    setItinerary(prev => {
      const existing = prev.find(day => day.date === event.date);
      const newItem = { ...event, id: `custom-${Date.now()}` };
      if (existing) {
        return prev.map(day =>
          day.date === event.date
            ? { ...day, items: [...day.items, newItem] }
            : day
        );
      } else {
        return [...prev, { date: event.date, items: [newItem] }];
      }
    });
  };

  if (view === 'landing') return <LandingPage
    onOrganizer={() => { setPendingRole('organizer'); setView('marriott-login'); }}
    onAttendee={() => { setPendingRole('attendee'); setView('marriott-login'); }}
  />;

  if (view === 'marriott-login') return <MarriottLoginPage
    onSignIn={(name) => {
      setCurrentUser(name);
      sessionStorage.setItem('crewfare_user', name);
      setView(pendingRole === 'attendee' ? 'attendee-onboarding' : 'organizer-onboarding');
    }}
    onEnroll={(name) => {
      if (name) { setCurrentUser(name); sessionStorage.setItem('crewfare_user', name); }
      setView(pendingRole === 'attendee' ? 'attendee-onboarding' : 'organizer-onboarding');
    }}
    onBack={() => setView('landing')}
  />;

  if (view === 'choose-role') return <ChooseRolePage
    onOrganizer={() => setView('organizer-onboarding')}
    onAttendee={() => setView('attendee-onboarding')}
    onBack={() => setView('landing')}
  />;

  if (view === 'organizer-onboarding') return <OrganizerOnboarding onComplete={async (name, hotelId, form, fetchedHotels, tripSlug) => {
    if (name) {
      setCurrentUser(name);
      sessionStorage.setItem('crewfare_user', name);
      sessionStorage.setItem('crewfare_view', 'app');
      ['crewfare_members','crewfare_hotels','crewfare_activities'].forEach(k => localStorage.removeItem(k));

      // Save trip info from organizer's form
      const selectedHotel = (fetchedHotels || []).find(h => h.id === hotelId);
      const hotelName = selectedHotel?.name || '';
      const startISO = form?.startDate || TRIP.startISO;
      const endISO = form?.endDate || TRIP.endISO;
      const formatDate = (iso) => {
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };
      const newTripInfo = {
        name: form?.tripName || name + "'s Trip",
        destination: form?.destination || TRIP.destination,
        startDate: form?.startDate ? formatDate(startISO) : TRIP.startDate,
        endDate: form?.endDate ? formatDate(endISO) : TRIP.endDate,
        startISO, endISO,
        organizerName: name,
        tripSlug: tripSlug || 'trip-2026',
      };
      setTripInfo(newTripInfo);
      sessionStorage.setItem('crewfare_trip', JSON.stringify(newTripInfo));
      localStorage.setItem('crewfare_trip', JSON.stringify(newTripInfo));
      // Also save under slug-specific key so attendees can load the plan via invite link
      localStorage.setItem(`crewfare_trip_${newTripInfo.tripSlug}`, JSON.stringify(newTripInfo));
      // Persist trip to DynamoDB so attendees on other devices can load it
      // Adopt real Marriott hotels fetched during onboarding
      if (fetchedHotels && fetchedHotels.length > 0) {
        const hotelsWithHighlight = fetchedHotels.map((h, i) => ({
          ...h, highlight: i === 0, bookedBy: [],
        }));
        localStorage.setItem('crewfare_real_hotels', JSON.stringify(hotelsWithHighlight));
      }

      // Save trip to DynamoDB so attendees on other devices can load it via invite link
      try { await saveTrip({ ...newTripInfo, tripId: newTripInfo.tripSlug, id: newTripInfo.tripSlug }); } catch (e) { console.warn('saveTrip failed:', e); }

      // Persist organizer as member
      const orgMember = {
        id: `m-org-${Date.now()}`, name,
        initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        color: AVATAR_COLORS[0], role: 'organizer', hotel: hotelName, confirmed: true,
      };
      try { await addMember(orgMember); } catch {}

      // Persist organizer hotel booking
      if (hotelId) {
        const hotelObj = selectedHotel || HOTELS.find(h => h.id === hotelId);
        if (hotelObj) {
          try { await updateHotel(hotelId, { ...hotelObj, bookedBy: [name] }); } catch {}
        }
      }

      // Hard-redirect to ?trip=<slug>&skip=1 so ALL hooks reinitialise with the new tripId
      const url = new URL(window.location.href);
      url.search = `?trip=${newTripInfo.tripSlug}&skip=1`;
      window.location.replace(url.toString());
      return;
    }
    setView('app');  // fallback if name was empty
  }} />;

  if (view === 'attendee-welcome') return <AttendeeWelcomePage
    tripInfo={tripInfo}
    hotels={hotels}
    onGetStarted={() => { setPendingRole('attendee'); setView('marriott-login'); }}
  />;

  if (view === 'attendee-onboarding') return <AttendeeOnboarding startStep={1} tripInfo={tripInfo} hotels={hotels} currentUser={currentUser} onComplete={async (name, hotelId) => {
    const safeName = typeof name === 'string' ? name.trim() : '';
    try {
      if (safeName) {
        setCurrentUser(safeName);
        sessionStorage.setItem('crewfare_user', safeName);
        sessionStorage.setItem('crewfare_view', 'app');
        if (hotelId) {
          await handleBookRoom(hotelId, safeName);
        } else {
          const existingMember = members.find(m => m.name === safeName);
          if (!existingMember) {
            const colorIdx = members.length % AVATAR_COLORS.length;
            await addMember({
              id: `m-att-${Date.now()}`, name: safeName,
              initials: safeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              color: AVATAR_COLORS[colorIdx], role: 'attendee', hotel: '', confirmed: true,
            });
          }
        }
      }
    } catch (err) {
      console.error('[attendee onComplete] error:', err);
    }
    setView('app');
  }} />;

  // ─── Main App ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: M.gray1, fontFamily: sans, maxWidth: 700, margin: '0 auto', boxShadow: '0 0 40px rgba(0,0,0,0.1)' }}>
      {/* Sticky Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: M.black, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        {/* Brand bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: M.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: M.white, fontSize: 15, cursor: 'pointer', userSelect: 'none' }}
            title="Triple-click for admin tools"
            onClick={() => {
              logoClickCount.current += 1;
              clearTimeout(logoClickTimer.current);
              logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 600);
              if (logoClickCount.current >= 3) {
                logoClickCount.current = 0;
                setShowResetPanel(v => !v);
                setResetState(null);
                setResetResult(null);
              }
            }}
          >M</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: M.white, fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{tripInfo.name || TRIP.name}</div>
            <div style={{ color: M.gray4, fontSize: 11 }}>📍 {tripInfo.destination || TRIP.destination} · {tripInfo.startDate || TRIP.startDate} – {tripInfo.endDate || TRIP.endDate}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {members.slice(0, 4).map(m => <Av key={m.id} name={m.name} color={m.color} size={28} />)}
            {members.length > 4 && <div style={{ width: 28, height: 28, borderRadius: '50%', background: M.gray5, color: M.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>+{members.length - 4}</div>}
            {/* Plan Another Trip */}
            <button
              title="Plan another trip"
              onClick={() => {
                sessionStorage.removeItem('crewfare_user');
                sessionStorage.removeItem('crewfare_view');
                sessionStorage.removeItem('crewfare_trip');
                window.location.href = window.location.origin + window.location.pathname;
              }}
              style={{ marginLeft: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: M.white, fontSize: 11, fontWeight: 700, padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + New Trip
            </button>
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
            tripInfo={tripInfo}
            onUpvote={handleUpvote}
            onDownvote={handleDownvote}
            onCommentAdd={handleCommentAdd}
          />
        )}
        {activeTab === 'hotels' && <HotelsTab hotels={hotels} members={members} onBookRoom={handleBookRoom} currentUser={currentUser} tripInfo={tripInfo} />}
        {activeTab === 'activities' && (
          <ActivitiesTab
            activities={activities}
            currentUser={currentUser}
            tripInfo={tripInfo}
            onUpvote={handleUpvote}
            onDownvote={handleDownvote}
            onCommentAdd={handleCommentAdd}
            onBook={handleBook}
            onAddActivity={addActivity}
          />
        )}
        {activeTab === 'itinerary' && (
          <ItineraryTab
            itinerary={itinerary}
            members={members}
            tripInfo={tripInfo}
            onAddEvent={handleAddEvent}
          />
        )}
        {activeTab === 'expenses' && <ExpenseTab members={members} currentUser={currentUser} tripInfo={tripInfo} />}
        {activeTab === 'memories' && <MemoriesTab photos={MOCK_PHOTOS} tripInfo={tripInfo} />}
        {activeTab === 'invite' && <InviteTab members={members} tripInfo={tripInfo} />}
      </div>

      {/* ── Admin Reset Panel (triple-click brand logo to open) ── */}
      {showResetPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
          <div style={{ background: M.white, borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.white, fontWeight: 900, fontSize: 18 }}>⚙</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: M.black }}>Admin Reset</div>
                <div style={{ fontSize: 12, color: M.gray4 }}>Clears all data — DynamoDB tables + localStorage</div>
              </div>
            </div>

            {resetState === null && (
              <>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b', marginBottom: 4 }}>⚠️ This will permanently delete:</div>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 13, color: '#7f1d1d', lineHeight: 1.8 }}>
                    <li>All trips in <strong>CrewfareTrips</strong></li>
                    <li>All members in <strong>CrewfareMembers</strong></li>
                    <li>All hotels in <strong>CrewfareHotels</strong></li>
                    <li>All activities in <strong>CrewfareActivities</strong></li>
                    <li>All <strong>localStorage</strong> crewfare_* keys</li>
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowResetPanel(false)} style={{ padding: '9px 18px', borderRadius: 8, border: `1.5px solid ${M.gray3}`, background: M.white, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: M.gray5 }}>Cancel</button>
                  <button onClick={() => setResetState('confirm')} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: M.white, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Reset All Data…</button>
                </div>
              </>
            )}

            {resetState === 'confirm' && (
              <>
                <div style={{ fontSize: 14, color: M.gray5, marginBottom: 20, lineHeight: 1.6 }}>
                  Are you absolutely sure? Type <strong>RESET</strong> to confirm.
                </div>
                <ConfirmReset
                  onConfirm={async () => {
                    setResetState('running');
                    try {
                      const result = await resetAllData();
                      setResetResult(result);
                      setResetState('done');
                    } catch (e) {
                      setResetResult({ error: e.message });
                      setResetState('done');
                    }
                  }}
                  onCancel={() => setResetState(null)}
                />
              </>
            )}

            {resetState === 'running' && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 40, height: 40, border: '4px solid #fecaca', borderTop: '4px solid #dc2626', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontWeight: 600, color: M.gray5 }}>Deleting all records…</div>
              </div>
            )}

            {resetState === 'done' && (
              <>
                {resetResult?.error ? (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
                    Error: {resetResult.error}
                  </div>
                ) : (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px', marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, color: '#166534', marginBottom: 8 }}>✓ Reset complete</div>
                    {(resetResult?.tables || []).map(t => (
                      <div key={t.table} style={{ fontSize: 12, color: '#166534', lineHeight: 1.8 }}>
                        {t.status === 'ok' ? '✓' : '✗'} {t.table}: {t.deleted} rows deleted
                        {t.status !== 'ok' && <span style={{ color: '#dc2626' }}> ({t.status})</span>}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowResetPanel(false);
                    sessionStorage.clear();
                    window.location.replace(window.location.origin + window.location.pathname);
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: M.black, color: M.white, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                >
                  Restart App
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Confirm Reset (type RESET to confirm) ────────────────────────────────
function ConfirmReset({ onConfirm, onCancel }) {
  const [val, setVal] = useState('');
  return (
    <div>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder='Type RESET'
        autoFocus
        style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${val === 'RESET' ? '#dc2626' : M.gray3}`, borderRadius: 8, fontFamily: 'monospace', fontSize: 15, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 8, border: `1.5px solid ${M.gray3}`, background: M.white, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: M.gray5 }}>Cancel</button>
        <button
          disabled={val !== 'RESET'}
          onClick={onConfirm}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: val === 'RESET' ? '#dc2626' : M.gray3, color: M.white, cursor: val === 'RESET' ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 13 }}
        >
          Confirm Reset
        </button>
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
        <h1 style={{ fontFamily: serif, fontSize: 38, color: M.white, fontWeight: 400, marginBottom: 12, lineHeight: 1.2 }}>CoVoyage</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.7, marginBottom: 44 }}>Plan, Collaborate, Explore, and Book Your Adventure—All in One Place</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={onOrganizer}
            style={{ background: M.red, color: M.white, border: 'none', borderRadius: 12, padding: '20px 32px', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: sans, transition: 'all 0.2s', boxShadow: '0 4px 24px rgba(168,38,42,0.6)' }}
            onMouseEnter={e => { e.currentTarget.style.background = M.redDark; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = M.red; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            🗺 I'm Planning a Trip
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 4 }}>Create a microsite & invite your crew</div>
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

// ─── Attendee Welcome Page ────────────────────────────────────────────────────
function AttendeeWelcomePage({ tripInfo = {}, hotels = [], onGetStarted }) {
  const liveInfo = {
    name: TRIP.name, destination: TRIP.destination,
    startDate: TRIP.startDate, endDate: TRIP.endDate,
    discountPct: TRIP.discountPct, organizerName: '',
    ...tripInfo,
  };
  const bookedRooms = hotels.reduce((acc, h) => acc + (h.bookedBy?.length || 0), 0);
  const totalNeeded = TRIP.discountRooms;
  const STEPS = ['Welcome', 'Sign In', 'Your Room', 'Book Hotel', 'Flight Info', 'All Set!'];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a3a5c 0%, #0d2340 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: sans }}>
      <div style={{ width: '100%', maxWidth: 580, background: M.white, borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: M.black, padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: M.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: M.white, fontSize: 16 }}>M</div>
          <div>
            <div style={{ color: M.white, fontWeight: 700, fontSize: 16 }}>Marriott Bonvoy</div>
            <div style={{ color: M.gray4, fontSize: 12 }}>CoVoyage</div>
          </div>
          <div style={{ marginLeft: 'auto', background: 'rgba(0,107,107,0.3)', color: '#4dd', border: '1px solid rgba(0,200,200,0.4)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
            ATTENDEE
          </div>
        </div>

        <div style={{ padding: '28px 36px' }}>
          {/* Step bar */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i === 0 ? M.red : M.gray2 }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontFamily: sans, fontSize: 12, color: M.gray4 }}>Step 1 of {STEPS.length}</span>
              <span style={{ fontFamily: sans, fontSize: 12, color: M.red, fontWeight: 600 }}>Welcome</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎡</div>
            <h1 style={{ fontFamily: serif, fontSize: 28, color: M.black, marginBottom: 10 }}>You're Invited!</h1>
            <div style={{ display: 'inline-block', background: '#fff5f5', border: '1.5px solid #fdd', borderRadius: 12, padding: '12px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: M.gray5, marginBottom: 4 }}>Trip Organizer</div>
              <div style={{ fontWeight: 700, color: M.black, fontSize: 15 }}>{liveInfo.organizerName || 'Your Organizer'}</div>
              <div style={{ color: M.red, fontWeight: 700, fontSize: 17 }}>{liveInfo.name}</div>
              <div style={{ color: M.gray5, fontSize: 13 }}>{liveInfo.destination} · {liveInfo.startDate} – {liveInfo.endDate}</div>
            </div>
            <p style={{ color: M.gray5, fontSize: 14, lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px' }}>
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
              <div style={{ fontSize: 12, color: M.gray5, marginTop: 6 }}>
                Book {totalNeeded - bookedRooms} more rooms to unlock <strong style={{ color: M.red }}>{liveInfo.discountPct}% off</strong> for everyone!
              </div>
            </div>

            <button
              onClick={onGetStarted}
              style={{ width: '100%', background: M.red, color: M.white, border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: sans, boxShadow: '0 4px 16px rgba(168,38,42,0.4)' }}
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Marriott Bonvoy Login Page ───────────────────────────────────────────────
function MarriottLoginPage({ onSignIn, onEnroll, onBack }) {
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollPassword, setEnrollPassword] = useState('');

  const handleSignIn = (e) => {
    e.preventDefault();
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Guest';
    onSignIn(name);
  };

  const handleEnroll = (e) => {
    e.preventDefault();
    onEnroll(enrollName);
  };

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${M.black} 0%, #1a0505 60%, ${M.redDark} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: sans }}>
      <div style={{ width: '100%', maxWidth: 460, background: M.white, borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ background: M.black, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: M.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: M.white, fontSize: 16 }}>M</div>
          <div>
            <div style={{ color: M.white, fontWeight: 700, fontSize: 16 }}>Marriott Bonvoy</div>
            <div style={{ color: M.gray4, fontSize: 12 }}>CoVoyage</div>
          </div>
          <button onClick={onBack} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: M.gray4, cursor: 'pointer', fontSize: 13 }}>← Back</button>
        </div>

        <div style={{ display: 'flex', borderBottom: `2px solid ${M.gray2}` }}>
          {[['signin', 'Sign In'], ['enroll', 'Enroll']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '14px', background: 'none', border: 'none', borderBottom: `3px solid ${tab === id ? M.red : 'transparent'}`, marginBottom: -2, fontFamily: sans, fontSize: 14, fontWeight: tab === id ? 700 : 400, color: tab === id ? M.red : M.gray5, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '28px 32px' }}>
          {tab === 'signin' ? (
            <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address or Bonvoy Account #</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com or account number" required style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 15, outline: 'none' }} onFocus={e => (e.target.style.borderColor = M.red)} onBlur={e => (e.target.style.borderColor = M.gray3)} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 15, outline: 'none' }} onFocus={e => (e.target.style.borderColor = M.red)} onBlur={e => (e.target.style.borderColor = M.gray3)} />
              </div>
              <button type="submit" style={{ width: '100%', background: M.red, color: M.white, border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: sans }}>Sign In</button>
              <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: M.gray4 }}>
                Not a member?{' '}
                <button type="button" onClick={() => setTab('enroll')} style={{ background: 'none', border: 'none', color: M.red, fontWeight: 600, cursor: 'pointer', fontFamily: sans, fontSize: 13 }}>Enroll in Marriott Bonvoy →</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleEnroll}>
              <p style={{ color: M.gray5, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>Join Marriott Bonvoy to earn points, unlock exclusive rates, and enjoy member benefits on every stay.</p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <input value={enrollName} onChange={e => setEnrollName(e.target.value)} placeholder="Your full name" required style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 15, outline: 'none' }} onFocus={e => (e.target.style.borderColor = M.red)} onBlur={e => (e.target.style.borderColor = M.gray3)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                <input type="email" value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} placeholder="email@example.com" required style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 15, outline: 'none' }} onFocus={e => (e.target.style.borderColor = M.red)} onBlur={e => (e.target.style.borderColor = M.gray3)} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create Password</label>
                <input type="password" value={enrollPassword} onChange={e => setEnrollPassword(e.target.value)} placeholder="Create a password" required style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 15, outline: 'none' }} onFocus={e => (e.target.style.borderColor = M.red)} onBlur={e => (e.target.style.borderColor = M.gray3)} />
              </div>
              <button type="submit" style={{ width: '100%', background: M.red, color: M.white, border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: sans }}>Create Account & Join</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Choose Role Page ─────────────────────────────────────────────────────────
function ChooseRolePage({ onOrganizer, onAttendee, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${M.black} 0%, #1a0505 40%, ${M.redDark} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: sans }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <h2 style={{ fontFamily: serif, fontSize: 28, color: M.white, fontWeight: 400, marginBottom: 10 }}>How are you joining?</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 36 }}>Select your role to get started.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={onOrganizer} style={{ background: M.red, color: M.white, border: 'none', borderRadius: 12, padding: '18px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: sans }}>
            🗺 I'm Planning a Trip
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>Create a group trip & invite your crew</div>
          </button>
          <button onClick={onAttendee} style={{ background: 'rgba(255,255,255,0.1)', color: M.white, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '18px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: sans }}>
            ✈️ I Was Invited to a Trip
            <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>Join the group microsite</div>
          </button>
          <button onClick={onBack} style={{ background: 'none', color: 'rgba(255,255,255,0.5)', border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: sans, marginTop: 4 }}>← Back</button>
        </div>
      </div>
    </div>
  );
}

// ─── Hotels Tab ───────────────────────────────────────────────────────────────
function HotelsTab({ hotels: propHotels, members, onBookRoom, currentUser, tripInfo = {} }) {
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingStep, setBookingStep] = useState(0);
  const [bookerName, setBookerName] = useState('');
  const [confNum, setConfNum] = useState('');
  const [liveHotels, setLiveHotels] = useState(propHotels);
  const [hotelsLoading, setHotelsLoading] = useState(false);

  const destination = tripInfo.destination || TRIP.destination;

  // Fetch real Marriott hotels whenever destination changes
  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    setHotelsLoading(true);
    geocodeCity(destination).then(async coords => {
      if (cancelled) return;
      if (coords) {
        const fetched = await fetchMarriottHotels(coords.lat, coords.lng);
        if (!cancelled && fetched && fetched.length > 0) {
          setLiveHotels(fetched);
          // Persist for Hotels tab persistence
          try { localStorage.setItem('crewfare_real_hotels', JSON.stringify(fetched)); } catch {}
        }
      }
      if (!cancelled) setHotelsLoading(false);
    }).catch(() => { if (!cancelled) setHotelsLoading(false); });
    return () => { cancelled = true; };
  }, [destination]);

  // Also reflect any externally-updated propHotels (e.g. from organizer onboarding)
  useEffect(() => {
    if (propHotels && propHotels.length > 0 && propHotels !== HOTELS) {
      setLiveHotels(propHotels);
    }
  }, [propHotels]);

  const hotels = liveHotels;
  const bookedRooms = hotels.reduce((acc, h) => acc + (h.bookedBy || []).length, 0);

  const discountRooms = tripInfo.discountRooms || TRIP.discountRooms;
  const discountPct   = tripInfo.discountPct   || TRIP.discountPct;
  const startDate     = tripInfo.startDate     || TRIP.startDate;
  const endDate       = tripInfo.endDate       || TRIP.endDate;

  // Calculate nights between check-in and check-out
  const nights = (() => {
    try {
      const s = new Date(tripInfo.startISO || TRIP.startISO);
      const e = new Date(tripInfo.endISO   || TRIP.endISO);
      const n = Math.round((e - s) / 86400000);
      return n > 0 ? n : 6;
    } catch { return 6; }
  })();

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
        <p style={{ color: M.red, fontSize: 13, marginBottom: 2 }}>📍 {destination}</p>
        <p style={{ color: M.gray4, fontSize: 13 }}>
          {bookedRooms} of {discountRooms} rooms booked · {Math.max(0, discountRooms - bookedRooms)} more for {discountPct}% group discount
        </p>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, height: 6, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((bookedRooms / discountRooms) * 100, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${M.red}, ${M.gold})`, borderRadius: 20, transition: 'width 0.6s ease' }} />
        </div>
        {bookedRooms >= discountRooms && (
          <div style={{ marginTop: 8, fontSize: 12, color: M.gold, fontWeight: 700 }}>🎉 Group discount unlocked! {discountPct}% off all rooms.</div>
        )}
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {hotelsLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ color: M.gray4, fontSize: 13, textAlign: 'center' }}>🔍 Finding Marriott hotels near {destination}…</p>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: M.white, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ height: 140, background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 18, width: '60%', borderRadius: 6, background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                  <div style={{ height: 13, width: '40%', borderRadius: 6, background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!hotelsLoading && hotels.map(h => (
          <Card key={h.id} highlight={h.highlight} style={{ padding: 0, overflow: 'hidden' }}>
            {h.highlight && <div style={{ background: `linear-gradient(90deg, ${M.gold}, #e8c55a)`, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: '#5a3e00' }}>★ Organizer's Hotel</div>}
            <img src={h.image} alt={h.name} style={{ width: '100%', height: 160, objectFit: 'cover' }}
              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'; }} />
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: M.black, marginBottom: 4 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: M.gray4, marginBottom: 6 }}>📍 {h.distance}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(h.amenities || []).slice(0, 4).map(a => <Tag key={a} label={a} color={M.teal} />)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: M.red }}>${h.rate}</div>
                  <div style={{ fontSize: 11, color: M.gray4, textDecoration: 'line-through' }}>${h.originalRate}</div>
                  <div style={{ fontSize: 11, color: M.gold }}>⭐ {h.stars} · {(h.bonvoyPts || 0).toLocaleString()} pts/night</div>
                </div>
              </div>
              {/* Live bookedBy list */}
              {(h.bookedBy || []).length > 0 && (
                <div style={{ margin: '12px 0 4px' }}>
                  <div style={{ fontSize: 12, color: M.gray5, marginBottom: 6 }}>
                    {h.bookedBy.length} room{h.bookedBy.length !== 1 ? 's' : ''} booked:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {(h.bookedBy || []).map(name => {
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
      {selectedHotel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: M.white, borderRadius: 16, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {bookingStep === 0 && (
              <>
                <h3 style={{ fontFamily: serif, fontSize: 20, marginBottom: 6 }}>Confirm Booking</h3>
                <p style={{ color: M.gray5, fontSize: 14, marginBottom: 16 }}>{selectedHotel.name}</p>
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
                    ['Check-in',  startDate],
                    ['Check-out', endDate],
                    ['Rate',      `$${selectedHotel.rate}/night`],
                    [`Total (${nights} nights)`, `$${selectedHotel.rate * nights}`],
                    ['Bonvoy Points', `${((selectedHotel.bonvoyPts || 0) * nights).toLocaleString()} pts`],
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

// ─── Expense Tracking Tab ─────────────────────────────────────────────────────
function ExpenseTab({ members, currentUser, tripInfo = {} }) {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', paidBy: currentUser, splitWith: [], category: 'Activities' });
  const CATEGORIES = ['Activities', 'Food & Drink', 'Transport', 'Shopping', 'Other'];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSplit = (name) => {
    setForm(f => ({
      ...f,
      splitWith: f.splitWith.includes(name)
        ? f.splitWith.filter(n => n !== name)
        : [...f.splitWith, name],
    }));
  };

  const submitExpense = () => {
    if (!form.description || !form.amount) return;
    const expense = {
      id: `exp-${Date.now()}`,
      description: form.description,
      amount: parseFloat(form.amount),
      paidBy: form.paidBy || currentUser,
      splitWith: form.splitWith,
      category: form.category,
      date: new Date().toLocaleDateString(),
      settledBy: [],
    };
    setExpenses(prev => [...prev, expense]);
    setForm({ description: '', amount: '', paidBy: currentUser, splitWith: [], category: 'Activities' });
    setShowForm(false);
  };

  const markSettled = (expId, personName) => {
    setExpenses(prev => prev.map(e =>
      e.id === expId ? { ...e, settledBy: [...e.settledBy, personName] } : e
    ));
  };

  // Calculate who owes whom
  const balances = {};
  members.forEach(m => { balances[m.name] = 0; });
  expenses.forEach(exp => {
    const people = exp.splitWith.length > 0 ? exp.splitWith : [];
    if (people.length === 0) return;
    const share = exp.amount / (people.length + 1);
    people.forEach(person => {
      if (person !== exp.paidBy) {
        if (!balances[person]) balances[person] = 0;
        if (!balances[exp.paidBy]) balances[exp.paidBy] = 0;
        const settled = exp.settledBy.includes(person);
        if (!settled) {
          balances[person] -= share;
          balances[exp.paidBy] += share;
        }
      }
    });
  });

  const owes = Object.entries(balances).filter(([, b]) => b < -0.01);
  const owed = Object.entries(balances).filter(([, b]) => b > 0.01);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ background: M.black, padding: '20px 20px 16px' }}>
        <h2 style={{ fontFamily: serif, color: M.white, fontSize: 22, marginBottom: 4 }}>Expense Tracking</h2>
        {tripInfo.destination && (
          <p style={{ color: M.red, fontSize: 13, marginBottom: 4 }}>
            📍 {tripInfo.destination}{tripInfo.startDate && tripInfo.endDate ? ` · ${tripInfo.startDate} – ${tripInfo.endDate}` : ''}
          </p>
        )}
        <p style={{ color: M.gray4, fontSize: 13 }}>Submit shared expenses and track who owes who. Hotel costs are paid individually.</p>
      </div>

      <div style={{ padding: 20 }}>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ width: '100%', background: M.red, color: M.white, border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: sans, marginBottom: 20 }}
        >
          + Submit an Expense
        </button>

        {showForm && (
          <Card style={{ marginBottom: 20, background: '#fff8f8' }}>
            <SectionTitle>New Expense</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 5, textTransform: 'uppercase' }}>Description</label>
                <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Dinner at Mikado" style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }} onFocus={e => (e.target.style.borderColor = M.red)} onBlur={e => (e.target.style.borderColor = M.gray3)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 5, textTransform: 'uppercase' }}>Amount ($)</label>
                  <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" min="0" style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }} onFocus={e => (e.target.style.borderColor = M.red)} onBlur={e => (e.target.style.borderColor = M.gray3)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 5, textTransform: 'uppercase' }}>Category</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 5, textTransform: 'uppercase' }}>Paid By</label>
                <select value={form.paidBy} onChange={e => set('paidBy', e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}>
                  {members.map(m => <option key={m.id}>{m.name}</option>)}
                  {!members.find(m => m.name === currentUser) && currentUser && <option>{currentUser}</option>}
                </select>
              </div>
              {members.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 8, textTransform: 'uppercase' }}>Split With</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {members.filter(m => m.name !== form.paidBy).map(m => (
                      <button key={m.id} onClick={() => toggleSplit(m.name)}
                        style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${form.splitWith.includes(m.name) ? M.red : M.gray3}`, background: form.splitWith.includes(m.name) ? '#fff0f0' : M.white, color: form.splitWith.includes(m.name) ? M.red : M.gray5, fontFamily: sans, fontSize: 13, cursor: 'pointer', fontWeight: form.splitWith.includes(m.name) ? 700 : 400 }}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <GhostBtn onClick={() => setShowForm(false)}>Cancel</GhostBtn>
                <PrimaryBtn style={{ flex: 1 }} onClick={submitExpense} disabled={!form.description || !form.amount}>Add Expense</PrimaryBtn>
              </div>
            </div>
          </Card>
        )}

        {/* Balances */}
        {expenses.length > 0 && (owes.length > 0 || owed.length > 0) && (
          <Card style={{ marginBottom: 20, background: '#f0fafa' }}>
            <SectionTitle>💳 Who Owes What</SectionTitle>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {owes.map(([name, bal]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${M.gray2}`, fontSize: 13 }}>
                  <span style={{ color: M.black, fontWeight: 600 }}>{name}</span>
                  <span style={{ color: M.red, fontWeight: 700 }}>owes ${Math.abs(bal).toFixed(2)}</span>
                </div>
              ))}
              {owed.map(([name, bal]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${M.gray2}`, fontSize: 13 }}>
                  <span style={{ color: M.black, fontWeight: 600 }}>{name}</span>
                  <span style={{ color: M.green, fontWeight: 700 }}>gets back ${bal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Expense list */}
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: M.gray4 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: M.gray5, marginBottom: 6 }}>No expenses yet</div>
            <div style={{ fontSize: 13 }}>Submit your first shared expense above. Hotel costs are tracked individually.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {expenses.map(exp => {
              const perPerson = exp.splitWith.length > 0 ? (exp.amount / (exp.splitWith.length + 1)).toFixed(2) : exp.amount.toFixed(2);
              return (
                <Card key={exp.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: M.black }}>{exp.description}</div>
                      <div style={{ fontSize: 12, color: M.gray4, marginTop: 2 }}>{exp.date} · <Tag label={exp.category} color={M.teal} /></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: M.red }}>${exp.amount.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: M.gray4 }}>Paid by {exp.paidBy}</div>
                    </div>
                  </div>
                  {exp.splitWith.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: M.gray5, marginBottom: 6 }}>Split with: {exp.splitWith.join(', ')} · ${perPerson}/person</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {exp.splitWith.map(name => {
                          const settled = exp.settledBy.includes(name);
                          return (
                            <button key={name} onClick={() => !settled && markSettled(exp.id, name)}
                              style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${settled ? M.green : M.gray3}`, background: settled ? '#e8f5e9' : M.white, color: settled ? M.green : M.gray5, fontFamily: sans, fontSize: 12, cursor: settled ? 'default' : 'pointer', fontWeight: 600 }}>
                              {settled ? '✓ ' : ''}{name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Invite Tab ───────────────────────────────────────────────────────────────
function InviteTab({ members, tripInfo = {} }) {
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [sentEmails, setSentEmails] = useState([]);

  // Build a URL-safe trip slug from destination + year, e.g. "nashville-2026"
  const tripSlug = tripInfo.tripSlug || (() => {
    const dest = (tripInfo.destination || TRIP.destination).split(',')[0].trim().toLowerCase().replace(/\s+/g, '-');
    const year  = tripInfo.startISO ? tripInfo.startISO.slice(0, 4) : new Date().getFullYear();
    return `${dest}-${year}`;
  })();
  const shareLink = `${window.location.origin}?trip=${tripSlug}&ref=organizer`;

  const copy = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const sendEmailInvite = () => {
    const to = emailInput.trim();
    if (!to) return;
    const tripName = tripInfo.name || 'our group trip';
    const subject = encodeURIComponent(`You're invited to ${tripName}! 🌴`);
    const bodyLines = [
      `Hi there!`,
      ``,
      `You've been invited to join ${tripName}!`,
      ``,
      `📍 Destination: ${tripInfo.destination || ''}`,
      `📅 Dates: ${tripInfo.startDate || ''} – ${tripInfo.endDate || ''}`,
      tripInfo.organizerName ? `👤 Organized by: ${tripInfo.organizerName}` : '',
      ``,
      `Click the link below to join the trip, book your room, and start planning with the crew:`,
      shareLink,
      ``,
      `See you there! 🌴`,
    ].filter(l => l !== null);
    const body = encodeURIComponent(bodyLines.join('\n'));
    window.open(`mailto:${to}?subject=${subject}&body=${body}`);
    setSentEmails(prev => [...new Set([...prev, to])]);
    setEmailInput('');
  };

  const openWhatsApp = () => {
    const tripName = tripInfo.name || 'our group trip';
    const text = encodeURIComponent(`You're invited to ${tripName}! 🌴\n📍 ${tripInfo.destination || ''} · ${tripInfo.startDate || ''} – ${tripInfo.endDate || ''}\nJoin here: ${shareLink}`);
    window.open(`https://wa.me/?text=${text}`);
  };

  const openSMS = () => {
    const text = encodeURIComponent(`You're invited to ${tripInfo.name || 'our group trip'}! Join here: ${shareLink}`);
    window.open(`sms:?body=${text}`);
  };

  return (
    <div style={{ padding: '20px 20px 40px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>✉️</div>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: M.black, marginBottom: 6 }}>Invite Your Crew</h2>
        {tripInfo.destination && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: M.red, fontWeight: 600 }}>📍 {tripInfo.destination}</span>
            {tripInfo.startDate && tripInfo.endDate && (
              <span style={{ fontSize: 13, color: M.gray5 }}>📅 {tripInfo.startDate} – {tripInfo.endDate}</span>
            )}
          </div>
        )}
        <p style={{ color: M.gray5, fontSize: 14 }}>Your guests will go through a guided onboarding to book their room and add their travel info.</p>
      </div>

      {/* Email compose box */}
      <Card style={{ marginBottom: 20, background: '#f0f4ff' }}>
        <SectionTitle>📧 Send Email Invite</SectionTitle>
        <p style={{ fontSize: 13, color: M.gray5, marginTop: 4, marginBottom: 14 }}>
          Enter an email address and we'll open your mail client with a pre-filled invite.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendEmailInvite()}
            placeholder="attendee@example.com"
            style={{ flex: 1, padding: '10px 13px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none' }}
            onFocus={e => (e.target.style.borderColor = '#4285f4')}
            onBlur={e => (e.target.style.borderColor = M.gray3)}
          />
          <button
            onClick={sendEmailInvite}
            disabled={!emailInput.trim()}
            style={{ background: emailInput.trim() ? '#4285f4' : M.gray3, color: M.white, border: 'none', borderRadius: 8, padding: '10px 18px', cursor: emailInput.trim() ? 'pointer' : 'default', fontFamily: sans, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Send Invite →
          </button>
        </div>
        {sentEmails.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: M.gray5, marginBottom: 6 }}>Invites sent to:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sentEmails.map(email => (
                <span key={email} style={{ fontSize: 12, background: '#e8f0fe', color: '#4285f4', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>
                  ✓ {email}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Share link */}
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
      <Card style={{ marginBottom: 16 }}>
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

      {/* Other share options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { icon: '💬', label: 'Text Message', color: M.green, action: openSMS },
          { icon: '📱', label: 'WhatsApp', color: '#25d366', action: openWhatsApp },
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
