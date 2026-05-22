import { useState } from 'react';
import { M, sans, serif, TRIP, TYPE_COLORS } from '../../constants.js';
import { Card, SectionTitle, Tag, Av, PrimaryBtn } from '../shared.jsx';

const DISCOUNT_TARGET = TRIP.discountRooms;

export default function HomeTab({ activities, hotels, members, tripInfo, onUpvote, onDownvote, onCommentAdd }) {
  const [commentInputs, setCommentInputs] = useState({});
  const bookedRooms = hotels.reduce((acc, h) => acc + h.bookedBy.length, 0);
  const pct = Math.min((bookedRooms / DISCOUNT_TARGET) * 100, 100);
  const discountActive = bookedRooms >= DISCOUNT_TARGET;

  // Sort activities by net votes descending — reactively re-sorts on every vote
  const topActivities = [...activities]
    .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
    .slice(0, 5);

  const tripName = tripInfo?.name || TRIP.name;
  const tripDestination = tripInfo?.destination || TRIP.destination;
  const tripDates = tripInfo?.startDate && tripInfo?.endDate
    ? `${tripInfo.startDate} – ${tripInfo.endDate}`
    : `${TRIP.startDate} – ${TRIP.endDate}`;

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Hero Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${M.red} 0%, ${M.redDark} 60%, #2d0a0a 100%)`,
        padding: '36px 28px', marginBottom: 28, color: M.white,
        backgroundImage: `linear-gradient(135deg, rgba(168,38,42,0.97) 0%, rgba(45,10,10,0.97) 100%), url('https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=1200&q=60')`,
        backgroundSize: 'cover', backgroundBlendMode: 'multiply',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>Marriott Bonvoy</div>
        <h1 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, marginBottom: 6 }}>{tripName}</h1>
        <div style={{ opacity: 0.85, fontSize: 14 }}>📍 {tripDestination} · {tripDates}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Members', val: members.length || 0 },
            { label: 'Rooms Booked', val: bookedRooms },
            { label: 'Activities', val: activities.length || 0 },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
              <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* Group Room Booking Progress */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <SectionTitle>🏨 Room Booking Progress</SectionTitle>
              <div style={{ fontSize: 13, color: M.gray5, marginTop: 2 }}>
                {discountActive
                  ? <span style={{ color: M.green, fontWeight: 700 }}>🎉 {TRIP.discountPct}% Group Discount Unlocked!</span>
                  : <span>{DISCOUNT_TARGET - bookedRooms} more rooms needed for <strong style={{ color: M.red }}>{TRIP.discountPct}% off</strong></span>
                }
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: discountActive ? M.green : M.red }}>{bookedRooms}</div>
              <div style={{ fontSize: 11, color: M.gray4 }}>of {DISCOUNT_TARGET} rooms</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ background: M.gray2, borderRadius: 20, height: 12, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: discountActive ? `linear-gradient(90deg, ${M.green}, #4caf50)` : `linear-gradient(90deg, ${M.red}, ${M.gold})`, borderRadius: 20, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          {/* Hotel breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hotels.filter(h => h.bookedBy.length > 0).map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={h.image} alt={h.name} style={{ width: 40, height: 30, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: M.black }}>{h.name}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                    {h.bookedBy.map(name => {
                      const m = members.find(m => m.name === name);
                      return <Av key={name} name={name} size={22} color={m?.color} />;
                    })}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: M.red }}>{h.bookedBy.length} room{h.bookedBy.length !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Crew at a glance */}
        <Card style={{ marginBottom: 24 }}>
          <SectionTitle>👥 Your Crew</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Av name={m.name} size={36} color={m.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: M.black }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: M.gray4 }}>{m.hotel || 'Hotel not booked yet'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {m.role === 'organizer' && <Tag label="Organizer" color={M.red} />}
                  {m.confirmed
                    ? <span style={{ fontSize: 11, background: '#e8f5e9', color: M.green, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>✓ Confirmed</span>
                    : <span style={{ fontSize: 11, background: M.gray1, color: M.gray4, borderRadius: 20, padding: '2px 8px' }}>Pending</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity Brainstorm Board */}
        <SectionTitle style={{ marginBottom: 16 }}>🎯 Activity Brainstorm Board</SectionTitle>
        <p style={{ fontSize: 13, color: M.gray5, marginBottom: 16 }}>Upvote the activities you want to do — top picks go to the itinerary.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {topActivities.map(act => (
            <ActivityCard key={act.id} act={act} members={members} onUpvote={onUpvote} onDownvote={onDownvote} onCommentAdd={onCommentAdd} commentInputs={commentInputs} setCommentInputs={setCommentInputs} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ act, members, onUpvote, onDownvote, onCommentAdd, commentInputs, setCommentInputs }) {
  const [showComments, setShowComments] = useState(false);
  const netVotes = act.upvotes - act.downvotes;

  return (
    <Card highlight={act.hotelPriority} style={{ padding: 0, overflow: 'hidden' }}>
      {act.hotelPriority && (
        <div style={{ background: `linear-gradient(90deg, ${M.gold}, #e8c55a)`, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#5a3e00', letterSpacing: '0.05em' }}>🏨 HOTEL HIGHLIGHT — Marriott Exclusive</span>
        </div>
      )}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Vote column */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 40 }}>
            <button onClick={() => onUpvote(act.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: act.upvotes > 0 ? M.red : M.gray3 }}>▲</button>
            <span style={{ fontWeight: 700, fontSize: 16, color: netVotes > 0 ? M.red : M.gray4, fontFamily: sans }}>{netVotes}</span>
            <button onClick={() => onDownvote(act.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: M.gray3 }}>▼</button>
          </div>
          {/* Content */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}>{act.emoji}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: M.black }}>{act.title}</span>
              <Tag label={act.category} color={M.teal} />
              {act.price === 0
                ? <Tag label="Free" color={M.green} />
                : <span style={{ fontSize: 12, color: M.gray5 }}>${act.price} {act.priceType}</span>
              }
            </div>
            <p style={{ fontSize: 13, color: M.gray5, lineHeight: 1.5, marginBottom: 8 }}>{act.description}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: M.gray4 }}>
              <span>⏱ {act.duration}</span>
              {act.ageMin && <span>🔞 Ages {act.ageMin}+</span>}
              {act.deadline && <span>📅 Book by {act.deadline}</span>}
            </div>
            {/* Voter avatars */}
            {act.voters.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
                {act.voters.slice(0, 4).map(name => {
                  const m = members.find(m => m.name === name);
                  return <Av key={name} name={name} size={22} color={m?.color} />;
                })}
                {act.voters.length > 4 && <span style={{ fontSize: 11, color: M.gray4 }}>+{act.voters.length - 4} more</span>}
              </div>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div style={{ borderTop: `1px solid ${M.gray2}`, marginTop: 12, paddingTop: 10 }}>
          <button onClick={() => setShowComments(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: M.gray5, padding: 0 }}>
            💬 {act.comments.length} comment{act.comments.length !== 1 ? 's' : ''} {showComments ? '▲' : '▼'}
          </button>
          {showComments && (
            <div style={{ marginTop: 8 }}>
              {act.comments.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Av name={c.user} size={26} color={members.find(m => m.name === c.user)?.color} />
                  <div style={{ background: M.gray1, borderRadius: 10, padding: '6px 10px', flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: M.black }}>{c.user} <span style={{ fontWeight: 400, color: M.gray4 }}>{c.time}</span></div>
                    <div style={{ fontSize: 13, color: M.gray5, marginTop: 2 }}>{c.text}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  value={commentInputs[act.id] || ''}
                  onChange={e => setCommentInputs(p => ({ ...p, [act.id]: e.target.value }))}
                  placeholder="Add a comment..."
                  style={{ flex: 1, padding: '8px 12px', border: `1.5px solid ${M.gray3}`, borderRadius: 20, fontFamily: sans, fontSize: 13, outline: 'none' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && commentInputs[act.id]?.trim()) {
                      onCommentAdd(act.id, commentInputs[act.id]);
                      setCommentInputs(p => ({ ...p, [act.id]: '' }));
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (commentInputs[act.id]?.trim()) {
                      onCommentAdd(act.id, commentInputs[act.id]);
                      setCommentInputs(p => ({ ...p, [act.id]: '' }));
                    }
                  }}
                  style={{ background: M.red, color: M.white, border: 'none', borderRadius: 20, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
