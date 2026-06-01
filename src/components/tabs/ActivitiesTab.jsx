import { useState, useMemo } from 'react';
import { M, sans, serif, CATEGORY_COLORS } from '../../constants.js';
import { Card, SectionTitle, Tag, Av, PrimaryBtn, GhostBtn, AISearch } from '../shared.jsx';

const FOOD_PREFS = ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nut Allergy', 'Dairy-Free', 'Halal', 'Kosher', 'No Spice'];

export default function ActivitiesTab({ activities, currentUser, tripInfo = {}, onUpvote, onDownvote, onCommentAdd, onBook, onAddActivity }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [sort, setSort] = useState('popular');
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [showFoodPrefs, setShowFoodPrefs] = useState(false);
  const [foodPrefs, setFoodPrefs] = useState([]);
  const [mealTimes, setMealTimes] = useState({ breakfast: '8:00 AM', lunch: '12:30 PM', dinner: '7:00 PM' });
  const [allergyNote, setAllergyNote] = useState('');
  const [bookingActivity, setBookingActivity] = useState(null); // activity being booked

  // Generate trip days for the date picker
  const tripDays = useMemo(() => {
    const days = [];
    if (!tripInfo.startISO || !tripInfo.endISO) return days;
    const start = new Date(tripInfo.startISO + 'T00:00:00');
    const end = new Date(tripInfo.endISO + 'T00:00:00');
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(`${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`);
    }
    return days;
  }, [tripInfo.startISO, tripInfo.endISO]);

  const categories = ['All', ...new Set(activities.map(a => a.category))];

  const filtered = activities
    .filter(a => a.title) // skip malformed/partial records
    .filter(a => filterCat === 'All' || a.category === filterCat)
    .filter(a => !search || (a.title || '').toLowerCase().includes(search.toLowerCase()) || (a.description || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'popular') return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      if (sort === 'price-low') return a.price - b.price;
      if (sort === 'price-high') return b.price - a.price;
      return 0;
    });

  const toggleFoodPref = pref => setFoodPrefs(p => p.includes(pref) ? p.filter(x => x !== pref) : [...p, pref]);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: M.black, padding: '20px 20px 0', marginBottom: 0 }}>
        <h2 style={{ fontFamily: serif, color: M.white, fontSize: 22, marginBottom: 6 }}>Activity Brainstorming</h2>
        <p style={{ color: M.gray4, fontSize: 13, marginBottom: 16 }}>Discover, upvote, and comment on activities for your {tripInfo.destination || 'trip'} trip. Ask AI to get suggestions, then click <strong style={{ color: M.white }}>+ Add</strong> to add them to the board.</p>
        <AISearch
          placeholder={`Ask AI: 'Best activities in ${tripInfo.destination || 'your destination'}…'`}
          context={`${tripInfo.destination || ''} trip${tripInfo.startDate ? ` ${tripInfo.startDate}` : ''}${tripInfo.endDate ? ` – ${tripInfo.endDate}` : ''}`}
          destination={tripInfo.destination || ''}
          onAddActivity={onAddActivity}
        />
        {/* Priority badge hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0 14px', fontSize: 12, color: M.gold }}>
          <span style={{ background: M.gold, color: '#5a3e00', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>★ HOTEL</span>
          Activities with this badge are available at or through the Marriott World Center.
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                background: filterCat === cat ? M.red : M.gray1,
                color: filterCat === cat ? M.white : M.gray5,
                border: 'none', borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                fontFamily: sans, fontSize: 13, fontWeight: filterCat === cat ? 700 : 400,
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ padding: '7px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 13, background: M.white, color: M.black, outline: 'none' }}
          >
            <option value="popular">Most Popular</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
          <button
            onClick={() => setShowFoodPrefs(v => !v)}
            style={{ background: showFoodPrefs ? M.teal : M.gray1, color: showFoodPrefs ? M.white : M.gray5, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: sans, fontSize: 13, fontWeight: 600 }}
          >
            🍽 Food Preferences {foodPrefs.length > 0 && `(${foodPrefs.length})`}
          </button>
        </div>

        {/* Food Preferences Panel */}
        {showFoodPrefs && (
          <Card style={{ marginBottom: 20, background: '#f0fafa' }}>
            <SectionTitle>🍽 Food Preferences & Dietary Needs</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
              {FOOD_PREFS.map(pref => (
                <button
                  key={pref}
                  onClick={() => toggleFoodPref(pref)}
                  style={{
                    background: foodPrefs.includes(pref) ? M.teal : M.white,
                    color: foodPrefs.includes(pref) ? M.white : M.gray5,
                    border: `1.5px solid ${foodPrefs.includes(pref) ? M.teal : M.gray3}`,
                    borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontFamily: sans, fontSize: 13,
                  }}
                >
                  {pref}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              {['breakfast', 'lunch', 'dinner'].map(meal => (
                <div key={meal} style={{ flex: '1 1 120px' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: M.gray5, marginBottom: 4, textTransform: 'capitalize' }}>{meal} time</label>
                  <input
                    value={mealTimes[meal]}
                    onChange={e => setMealTimes(p => ({ ...p, [meal]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 13, outline: 'none' }}
                  />
                </div>
              ))}
            </div>
            <input
              value={allergyNote}
              onChange={e => setAllergyNote(e.target.value)}
              placeholder="Additional allergy or dietary notes..."
              style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 13, outline: 'none' }}
            />
          </Card>
        )}

        {/* Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map(act => (
            <ActivityFeedCard
              key={act.id || act.activityId}
              act={act}
              currentUser={currentUser}
              onUpvote={onUpvote}
              onDownvote={onDownvote}
              onCommentAdd={onCommentAdd}
              onBook={() => setBookingActivity(act)}
              commentInputs={commentInputs}
              setCommentInputs={setCommentInputs}
              expanded={expandedId === (act.id || act.activityId)}
              onToggleExpand={() => setExpandedId(id => id === (act.id || act.activityId) ? null : (act.id || act.activityId))}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: M.gray4, fontSize: 14 }}>
              No activities yet. Use the AI search above to discover activities for your destination!
            </div>
          )}
        </div>
      </div>

      {/* Book Activity Modal — fixed overlay, lives inside root div */}
      {bookingActivity && (
        <BookActivityModal
          activity={bookingActivity}
          tripDays={tripDays}
          currentUser={currentUser}
          onConfirm={(act, date, time) => {
            if (onBook) onBook(act, date, time);
            setBookingActivity(null);
          }}
          onCancel={() => setBookingActivity(null)}
        />
      )}
    </div>
  );
}

// ── Book Activity Modal ──────────────────────────────────────────────────
function BookActivityModal({ activity, tripDays, currentUser, onConfirm, onCancel }) {
  const [selectedDate, setSelectedDate] = useState(tripDays[0] || '');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  const TIME_SLOTS = [
    '7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM',
    '1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM',
    '7:00 PM','8:00 PM','9:00 PM',
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ background: M.white, borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 32 }}>{activity.emoji}</span>
          <div>
            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: M.black }}>{activity.title}</div>
            <div style={{ fontSize: 12, color: M.gray4 }}>{activity.category}{activity.duration ? ` · ${activity.duration}` : ''}{activity.price === 0 ? ' · Free' : ` · $${activity.price}/person`}</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: M.gray5, marginBottom: 20, lineHeight: 1.5 }}>{activity.description}</p>

        {tripDays.length === 0 ? (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#856404', marginBottom: 16 }}>
            ⚠️ No trip dates set. Complete organizer onboarding to set trip dates.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Date
              </label>
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}
              >
                {tripDays.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: M.gray5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Time
              </label>
              <select
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: M.white }}
              >
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
          <PrimaryBtn
            onClick={() => onConfirm(activity, selectedDate, selectedTime)}
            disabled={!selectedDate}
          >
            ✓ Confirm & Add to Itinerary
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function ActivityFeedCard({ act, currentUser, onUpvote, onDownvote, onCommentAdd, onBook, commentInputs, setCommentInputs, expanded, onToggleExpand }) {
  const netVotes = (act.upvotes || 0) - (act.downvotes || 0);
  const bookedBy = Array.isArray(act.bookedBy) ? act.bookedBy : [];
  const bookedByMe = currentUser && bookedBy.includes(currentUser);
  const hasVoted = Array.isArray(act.voters) && currentUser && act.voters.includes(currentUser);

  return (
    <Card highlight={act.hotelPriority} style={{ padding: 0, overflow: 'hidden' }}>
      {act.hotelPriority && (
        <div style={{ background: `linear-gradient(90deg, ${M.gold}, #e8c55a)`, padding: '5px 14px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#5a3e00', letterSpacing: '0.05em' }}>🏨 HOTEL HIGHLIGHT — Available at Marriott World Center</span>
        </div>
      )}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Vote column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 38 }}>
            <button
              onClick={() => !hasVoted && onUpvote(act.id || act.activityId)}
              title={hasVoted ? 'Already voted' : 'Upvote'}
              style={{ background: 'none', border: 'none', cursor: hasVoted ? 'default' : 'pointer', fontSize: 22, color: hasVoted ? M.red : M.gray3, lineHeight: 1, opacity: hasVoted ? 1 : 0.7, transition: 'color 0.15s, opacity 0.15s' }}
            >▲</button>
            <span style={{ fontWeight: 800, fontSize: 16, color: netVotes > 0 ? M.red : M.gray4, fontFamily: sans }}>{netVotes}</span>
            <button
              onClick={() => onDownvote(act.id || act.activityId)}
              title="Downvote"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: M.gray3, lineHeight: 1, opacity: 0.7 }}
            >▼</button>
          </div>
          {/* Main content */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{act.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: M.black }}>{act.title}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  <Tag label={act.category} color={CATEGORY_COLORS[act.category] || M.teal} />
                  {act.price === 0
                    ? <Tag label="Free" color={M.green} />
                    : <span style={{ fontSize: 12, color: M.gray5, alignSelf: 'center' }}>${act.price} {act.priceType}</span>
                  }
                </div>
              </div>
              {bookedByMe
                ? <span style={{ background: '#e8f5e9', color: M.green, borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓ You&apos;re booked</span>
                : <button onClick={() => onBook && onBook(act.id || act.activityId)} style={{ background: M.red, color: M.white, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: sans, fontSize: 12, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>Book Now</button>
              }
            </div>
            <p style={{ fontSize: 13, color: M.gray5, lineHeight: 1.5, marginBottom: 8 }}>{act.description}</p>
            {/* Booked-by list (other users) */}
            {bookedBy.length > 0 && (
              <div style={{ fontSize: 12, color: M.gray4, marginBottom: 6 }}>
                🎟 Booked by: <strong style={{ color: M.gray5 }}>{bookedBy.join(', ')}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: M.gray4 }}>
              <span>⏱ {act.duration}</span>
              {act.ageMin && <span>🔞 Ages {act.ageMin}+</span>}
              {act.deadline && <span>📅 Book by {act.deadline}</span>}
              <span>🔄 {act.cancellation}</span>
            </div>
            {/* Available dates */}
            {act.dates && (
              <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {act.dates.map(d => (
                  <span key={d} style={{ background: M.gray1, borderRadius: 6, padding: '2px 8px', fontSize: 11, color: M.gray5 }}>{d}</span>
                ))}
              </div>
            )}
            {/* Suggested by */}
            {act.suggestedBy && (
              <div style={{ fontSize: 12, color: M.gray4, marginTop: 8 }}>
                💡 Suggested by <strong style={{ color: M.gray5 }}>{act.suggestedBy}</strong>
              </div>
            )}
            {/* Voter avatars */}
            {(act.voters || []).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                {(act.voters || []).slice(0, 5).map(name => (
                  <Av key={name} name={name} size={22} />
                ))}
                {(act.voters || []).length > 5 && <span style={{ fontSize: 11, color: M.gray4 }}>+{(act.voters || []).length - 5}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div style={{ borderTop: `1px solid ${M.gray2}`, marginTop: 12, paddingTop: 10 }}>
          <button onClick={onToggleExpand} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: M.gray5, padding: 0 }}>
            💬 {(act.comments || []).length} comment{(act.comments || []).length !== 1 ? 's' : ''} {expanded ? '▲' : '▼'}
          </button>
          {expanded && (
            <div style={{ marginTop: 10 }}>
              {(act.comments || []).map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Av name={c.user} size={26} />
                  <div style={{ background: M.gray1, borderRadius: 10, padding: '6px 10px', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: M.black }}>{c.user} <span style={{ fontWeight: 400, color: M.gray4 }}>{c.time}</span></div>
                    <div style={{ fontSize: 13, color: M.gray5, marginTop: 2 }}>{c.text}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {(() => {
                  const actId = act.id || act.activityId;
                  return (
                    <>
                      <input
                        value={commentInputs[actId] || ''}
                        onChange={e => setCommentInputs(p => ({ ...p, [actId]: e.target.value }))}
                        placeholder="Add a comment..."
                        style={{ flex: 1, padding: '8px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 20, fontFamily: sans, fontSize: 13, outline: 'none' }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && commentInputs[actId]?.trim()) {
                            onCommentAdd(actId, commentInputs[actId]);
                            setCommentInputs(p => ({ ...p, [actId]: '' }));
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (commentInputs[actId]?.trim()) {
                            onCommentAdd(actId, commentInputs[actId]);
                            setCommentInputs(p => ({ ...p, [actId]: '' }));
                          }
                        }}
                        style={{ background: M.red, color: M.white, border: 'none', borderRadius: 20, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                      >
                        Post
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
